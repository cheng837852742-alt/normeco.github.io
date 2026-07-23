from __future__ import annotations

import argparse
import json
import re
from difflib import SequenceMatcher
from pathlib import Path


PAGE_SOURCES = (
    (1, 10, '1/4"'),
    (11, 44, '3/8"'),
    (45, 92, '1/2"'),
    (93, 94, '5/8"'),
    (95, 112, '3/4"'),
    (113, 128, '1"'),
    (129, 132, '1-1/2"'),
    (133, 136, '2-1/2"'),
    (137, 145, "附件&起子头套筒"),
)

ORDER_PATTERN = re.compile(r"^[A-Z]?\d[A-Z0-9-]{6,}$", re.IGNORECASE)
VALUE_PATTERN = re.compile(r"^[0-9./\"*°-]+$")
GENERIC_TERMS = (
    "工业",
    "冲击",
    "套筒",
    "impact",
    "socket",
    "sockets",
    "length",
)


def center(entry: dict) -> tuple[float, float]:
    points = entry["box"]
    return (
        sum(point[0] for point in points) / len(points),
        sum(point[1] for point in points) / len(points),
    )


def clean_value(value: str) -> str:
    return (
        value.strip()
        .replace("°", '"')
        .replace("*", '"')
        .replace("”", '"')
        .replace("“", '"')
    )


def page_source(page_number: int) -> str | None:
    for start, end, source in PAGE_SOURCES:
        if start <= page_number <= end:
            return source
    return None


def title_near_header(entries: list[dict], header_y: float) -> str:
    candidates = []
    for entry in entries:
        x, y = center(entry)
        text = entry["text"].strip()
        if x >= 420 or abs(y - header_y) > 5:
            continue
        if not re.search(r"[\u3400-\u9fff]", text):
            continue
        candidates.append((x, text))
    return "".join(text for _, text in sorted(candidates))


def parse_rows(entries: list[dict], start_y: float, end_y: float) -> list[dict]:
    positioned = [(*center(entry), entry) for entry in entries]
    order_entries = []
    for x, y, entry in positioned:
        text = clean_value(entry["text"])
        if start_y < y < end_y and 420 <= x <= 530 and ORDER_PATTERN.match(text):
            order_entries.append((x, y, entry, text))

    rows = []
    for _, row_y, order_entry, order_no in order_entries:
        values = []
        for x, y, entry in positioned:
            value = clean_value(entry["text"])
            if x <= 530 or abs(y - row_y) > 4:
                continue
            if not VALUE_PATTERN.match(value):
                continue
            values.append((x, value, float(entry["score"])))
        values.sort()
        if len(values) != 5:
            continue
        scores = [float(order_entry["score"]), *[score for _, _, score in values]]
        confidence = min(scores)
        if confidence < 0.78:
            continue
        rows.append(
            {
                "model": order_no,
                "size": values[0][1],
                "D2": values[1][1],
                "D1": values[2][1],
                "L2": values[3][1],
                "L": values[4][1],
                "confidence": round(confidence, 3),
            }
        )
    return rows


def extract_families(ocr_payload: dict) -> list[dict]:
    families: list[dict] = []
    for page in ocr_payload["pages"]:
        entries = page["entries"]
        headers = []
        for entry in entries:
            x, y = center(entry)
            normalized = re.sub(r"\s+", "", entry["text"]).lower()
            if 420 <= x <= 530 and "orderno" in normalized:
                headers.append((y, title_near_header(entries, y)))
        headers.sort()

        active_title = ""
        active_family = None
        for index, (header_y, title) in enumerate(headers):
            if title:
                active_title = title
                active_family = {
                    "title": title,
                    "page": page["page"],
                    "sourceCategory": page_source(page["page"]),
                    "models": [],
                }
                families.append(active_family)
            if not active_title or active_family is None:
                continue
            next_y = headers[index + 1][0] if index + 1 < len(headers) else 1065
            active_family["models"].extend(parse_rows(entries, header_y + 5, next_y - 4))
    return [family for family in families if family["models"]]


def normalized_name(value: str) -> str:
    value = value.lower()
    for term in GENERIC_TERMS:
        value = value.replace(term, "")
    return "".join(re.findall(r"[\u3400-\u9fff]+|[a-z0-9]+", value))


def match_score(title: str, product_name: str) -> float:
    left = normalized_name(title)
    right = normalized_name(product_name)
    if not left or not right:
        return 0
    score = SequenceMatcher(None, left, right).ratio()
    if left in right or right in left:
        score = max(score, min(len(left), len(right)) / max(len(left), len(right)) + 0.2)
    return min(score, 1.0)


def merge(catalog: dict, families: list[dict]) -> dict:
    for product in catalog["products"]:
        product.pop("specifications", None)

    candidates = []
    for family_index, family in enumerate(families):
        source = family["sourceCategory"]
        if not source:
            continue
        for product_index, product in enumerate(catalog["products"]):
            if not product["sourceCategory"].startswith(source):
                continue
            score = match_score(family["title"], product["name"]["zh"])
            if score >= 0.75:
                candidates.append((score, family_index, product_index))

    assigned_families = set()
    assigned_products = set()
    matches = []
    for score, family_index, product_index in sorted(candidates, reverse=True):
        if family_index in assigned_families or product_index in assigned_products:
            continue
        family = families[family_index]
        product = catalog["products"][product_index]
        product["specifications"] = {
            "catalogTitle": family["title"],
            "catalogPage": family["page"],
            "columns": ["model", "size", "D2", "D1", "L2", "L"],
            "models": family["models"],
            "matchConfidence": round(score, 3),
            "source": "NORMECO 2026 PDF 产品样册 OCR 校对",
        }
        assigned_families.add(family_index)
        assigned_products.add(product_index)
        matches.append(
            {
                "product": product["name"]["zh"],
                "catalogTitle": family["title"],
                "page": family["page"],
                "models": len(family["models"]),
                "score": round(score, 3),
            }
        )

    catalog["sourceNotice"] = (
        "产品名称、分类和图片来自 NORMECO 官网；型号尺寸来自 2026 PDF 产品样册。"
        "仅展示通过列数、数值和 OCR 置信度校验并完成产品名称匹配的参数。"
    )
    catalog["summary"]["specificationProductCount"] = len(matches)
    catalog["summary"]["specificationModelCount"] = sum(
        len(product.get("specifications", {}).get("models", []))
        for product in catalog["products"]
    )
    catalog["specificationMatches"] = matches
    return catalog


def main() -> None:
    parser = argparse.ArgumentParser(description="Merge OCR catalog specs into catalog.json.")
    parser.add_argument("--workspace", default=".")
    args = parser.parse_args()

    workspace = Path(args.workspace).resolve()
    catalog_path = workspace / "assets" / "product-catalog" / "catalog.json"
    ocr_path = workspace / "assets" / "product-catalog" / "ocr" / "catalog-ocr.json"

    catalog = json.loads(catalog_path.read_text(encoding="utf-8"))
    ocr_payload = json.loads(ocr_path.read_text(encoding="utf-8"))
    families = extract_families(ocr_payload)
    merged = merge(catalog, families)

    catalog_path.write_text(
        json.dumps(merged, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    print(f"Extracted families with validated models: {len(families)}")
    print(
        "Matched products: "
        f"{merged['summary']['specificationProductCount']}; "
        "models: "
        f"{merged['summary']['specificationModelCount']}"
    )
    for match in merged["specificationMatches"][:20]:
        print(
            f"P{match['page']:03d} {match['catalogTitle']} -> "
            f"{match['product']} ({match['score']}, {match['models']} models)"
        )


if __name__ == "__main__":
    main()
