from __future__ import annotations

import argparse
import io
import json
import re
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path
from urllib.parse import parse_qs, urljoin, urlparse
from urllib.request import Request, urlopen

from lxml import html
from PIL import Image


BASE_URL = "https://normeco.com.cn"
CATALOG_URL = (
    f"{BASE_URL}/goods/category"
    "?id=4e5f41e8-7594-48e0-a12d-fb3870e20558"
)
USER_AGENT = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
    "AppleWebKit/537.36 NORMECO-Catalog-Importer/1.0"
)

DRIVE_CATEGORY_KEYS = {
    '1/4"': "impact-1-4",
    '3/8"': "impact-3-8",
    '1/2"': "impact-1-2",
    '5/8"': "impact-5-8",
    '3/4"': "impact-3-4",
    '1"': "impact-1",
    '1-1/2"': "impact-1-1-2",
    '2-1/2"': "impact-2-1-2",
}


def clean_text(value: str) -> str:
    return re.sub(r"\s+", " ", value or "").strip()


def fetch_bytes(url: str, attempts: int = 3) -> bytes:
    last_error: Exception | None = None
    for attempt in range(attempts):
        try:
            request = Request(url, headers={"User-Agent": USER_AGENT})
            with urlopen(request, timeout=35) as response:
                return response.read()
        except Exception as error:  # noqa: BLE001
            last_error = error
            if attempt + 1 < attempts:
                time.sleep(0.8 * (attempt + 1))
    raise RuntimeError(f"Failed to download {url}: {last_error}")


def fetch_document(url: str):
    return html.fromstring(fetch_bytes(url), base_url=url)


def split_bilingual_name(value: str) -> tuple[str, str]:
    value = clean_text(value)
    boundary = re.search(
        r"(?<=[\u3400-\u9fff）)])(?=(?:\d+[/-]?\d*|[A-Za-z][A-Za-z-]{2,}))",
        value,
    )
    if not boundary:
        return value, ""
    return value[: boundary.start()], value[boundary.start() :]


def first_matching_pair(value: str, rules: list[tuple[tuple[str, ...], tuple[str, str]]]):
    lowered = value.lower()
    for needles, pair in rules:
        if any(needle.lower() in lowered for needle in needles):
            return pair
    return ("特殊结构", "Special Profile")


def infer_profile(name: str) -> tuple[str, str]:
    rules = [
        (("大圆弧", "surface drive"), ("大圆弧", "Surface Drive")),
        (("内十二角", "triple square"), ("内十二角", "Triple Square")),
        (("十二角", "12-point", "12 point"), ("十二角", "12-Point")),
        (("八角", "8-point", "double square"), ("八角", "8-Point")),
        (("四方", "4-point", "female square"), ("四方", "4-Point")),
        (("外星型", "external torx"), ("外星型", "External Torx")),
        (("内星型", "internal torx"), ("内星型", "Internal Torx")),
        (("内六角", "male hex"), ("内六角", "Male Hex")),
        (("六角", "6-point", "6 point"), ("六角", "6-Point")),
        (("丝攻", "tap holding"), ("丝攻", "Tap Holding")),
        (("双头螺栓", "stud bolt"), ("双头螺栓", "Stud Bolt")),
        (("起子套筒", "bit socket"), ("起子套筒", "Bit Socket")),
        (("起子头", "bit"), ("起子头", "Bit")),
        (("转换头", "adapter"), ("转换", "Adapter")),
        (("延长杆", "extension"), ("连接", "Extension Bar")),
        (("万向接头", "universal joint"), ("连接", "Universal Joint")),
        (("o形环", "o-ring"), ("附件", "O-Ring")),
        (("锁销", "locking pin"), ("附件", "Locking Pin")),
        (("套装", "set"), ("组合", "Set")),
    ]
    return first_matching_pair(name, rules)


def infer_length(name: str) -> tuple[str, str]:
    rules = [
        (("特长", "extra length"), ("特长型", "Extra Long")),
        (("半加长", "semi deep"), ("半加长", "Semi Deep")),
        (("加长", "deep length", "-deep", "long "), ("加长型", "Deep")),
        (("接杆", "extended length"), ("接杆式", "Extended")),
        (("标准", "standard"), ("标准型", "Standard")),
        (("延长杆", "extension bar"), ("延长型", "Extension")),
        (("套装", "set"), ("套装", "Set")),
    ]
    lowered = name.lower()
    for needles, pair in rules:
        if any(needle.lower() in lowered for needle in needles):
            return pair
    return ("未标注", "Not Specified")


def infer_features(name: str, source_category: str) -> list[dict[str, str]]:
    lowered = name.lower()
    features: list[tuple[str, str]] = []

    if "不带磁" in name or "无磁" in name or "without magnet" in lowered:
        features.append(("无磁", "Without Magnet"))
    elif "伸缩磁" in name or "sliding magnet" in lowered:
        features.append(("伸缩磁", "Sliding Magnet"))
    elif "固定磁" in name or "fixed magnet" in lowered:
        features.append(("固定磁", "Fixed Magnet"))
    elif "带磁" in name or "magnet" in lowered:
        features.append(("带磁", "Magnetic"))

    feature_rules = [
        (("薄壁", "thin wall"), ("薄壁", "Thin Wall")),
        (("万向", "universal"), ("万向", "Universal")),
        (("旋护", "rotating cover"), ("旋护", "Rotating Cover")),
        (("护套", "cover"), ("保护护套", "Protective Cover")),
        (("抗震", "anti-vibration", "anti vibration"), ("抗震动", "Anti-vibration")),
        (("重工", "heavy duty"), ("重工型", "Heavy Duty")),
        (("快换", "quick-change", "quick change"), ("快换", "Quick-change")),
        (("维修", "maintenance"), ("维修级", "Maintenance")),
        (("绝缘", "isolated", "insulated"), ("绝缘", "Insulated")),
        (("开口",), ("开口结构", "Open Socket")),
        (("摇摆", "颤动", "wobble"), ("摇摆结构", "Wobble")),
    ]
    for needles, feature in feature_rules:
        if any(needle.lower() in lowered for needle in needles):
            features.append(feature)

    if "定制" in source_category or "custom" in source_category.lower():
        features.append(("定制", "Custom-made"))

    unique: list[dict[str, str]] = []
    seen: set[str] = set()
    for zh, en in features:
        if zh not in seen:
            unique.append({"zh": zh, "en": en})
            seen.add(zh)
    return unique or [{"zh": "基础结构", "en": "Standard"}]


def source_drive(source_category: str, metric: str, product_name: str) -> str:
    for drive in DRIVE_CATEGORY_KEYS:
        if source_category.startswith(drive):
            return drive
    embedded = re.search(r'(?<!\d)(\d(?:-\d+)?/\d+|\d+)"', product_name)
    if embedded:
        return f'{embedded.group(1)}"'
    if "起子" in source_category or "nut setters" in source_category.lower():
        return '1/4" Hex'
    if metric and re.search(r"\d", metric):
        return metric
    return "Multi"


def cross_categories(primary_key: str, product_name: str) -> list[str]:
    keys = [primary_key]
    lowered = product_name.lower()
    if primary_key == "bits-sockets":
        if "工业级" in product_name or "industrial" in lowered:
            keys.append("bits-industrial")
        if "维修级" in product_name or "maintenance" in lowered:
            keys.append("bits-maintenance")
    if "抗震" in product_name or "anti-vibration" in lowered or "anti vibration" in lowered:
        keys.append("special-antivibration")
    if "旋护" in product_name or "护套" in product_name or "rotating cover" in lowered:
        keys.append("special-protected")
    return list(dict.fromkeys(keys))


def primary_category_key(source_category: str, product_name: str) -> str:
    for drive, key in DRIVE_CATEGORY_KEYS.items():
        if source_category.startswith(drive):
            return key

    lowered_source = source_category.lower()
    lowered_name = product_name.lower()
    if "附件" in source_category or "nut setters" in lowered_source:
        if (
            "o形环" in lowered_name
            or "o-ring" in lowered_name
            or "锁销" in product_name
            or "固定销" in product_name
            or "locking pin" in lowered_name
        ):
            return "accessories-retainers"
        if "延长杆" in product_name or "extension bar" in lowered_name:
            return "accessories-extensions"
        if "万向接头" in product_name or "universal joint" in lowered_name:
            return "accessories-universal"
        if "转换头" in product_name or "adapter" in lowered_name or "extension" in lowered_name:
            return "accessories-adapters"
        return "bits-sockets"
    if "定制" in source_category or "custom" in lowered_source:
        if any(term in product_name for term in ("机器人", "自动化", "产线", "工位")):
            return "custom-line"
        return "custom-special"
    if "套装" in source_category or "set" in lowered_source:
        return "sets-combination"
    if "绝缘" in source_category or "isolated" in lowered_source:
        return "special-insulated"
    return "custom-special"


def parse_source_categories(document) -> list[dict]:
    categories: list[dict] = []
    seen: set[str] = set()
    for card in document.xpath('//div[contains(@class, "post-card")]'):
        hrefs = card.xpath('.//a[contains(@href, "/goods/index?cid=")]/@href')
        if not hrefs:
            continue
        absolute_url = urljoin(BASE_URL, hrefs[0])
        if absolute_url in seen:
            continue
        seen.add(absolute_url)
        title = clean_text(" ".join(card.xpath('.//div[contains(@class, "post-details")]//a//text()')))
        metric = clean_text(" ".join(card.xpath('.//div[contains(@class, "post-details")]//p//text()')))
        categories.append({"title": title, "metric": metric, "url": absolute_url})
    return categories


def parse_products(document, source_category: dict) -> list[dict]:
    records: list[dict] = []
    seen: set[str] = set()
    for card in document.xpath('//div[contains(@class, "post-card")]'):
        hrefs = card.xpath('.//a[contains(@href, "/goods/details?id=")]/@href')
        if not hrefs:
            continue
        detail_url = urljoin(BASE_URL, hrefs[0])
        if detail_url in seen:
            continue
        seen.add(detail_url)

        image_paths = card.xpath(".//img/@src")
        raw_name = clean_text(" ".join(card.xpath('.//div[contains(@class, "post-details")]//a//text()')))
        if not raw_name:
            continue

        product_id = parse_qs(urlparse(detail_url).query).get("id", [""])[0]
        name_zh, name_en = split_bilingual_name(raw_name)
        profile_zh, profile_en = infer_profile(raw_name)
        length_zh, length_en = infer_length(raw_name)
        primary_key = primary_category_key(source_category["title"], raw_name)
        features = infer_features(raw_name, source_category["title"])

        records.append(
            {
                "id": product_id,
                "categories": cross_categories(primary_key, raw_name),
                "primaryCategory": primary_key,
                "sourceCategory": source_category["title"],
                "sourceCategoryMetric": source_category["metric"],
                "sourceUrl": detail_url,
                "sourceImageUrl": urljoin(BASE_URL, image_paths[0]) if image_paths else "",
                "name": {"zh": name_zh, "en": name_en or raw_name},
                "drive": source_drive(
                    source_category["title"],
                    source_category["metric"],
                    raw_name,
                ),
                "profile": {"zh": profile_zh, "en": profile_en},
                "length": {"zh": length_zh, "en": length_en},
                "features": features,
                "dimensions": {
                    "model": None,
                    "D1": None,
                    "D2": None,
                    "L": None,
                    "L2": None,
                },
                "parameterSource": "NORMECO 官网分类、产品名称与产品图",
            }
        )
    return records


def download_image(record: dict, images_dir: Path) -> tuple[str, dict | None, str | None]:
    source_url = record["sourceImageUrl"]
    if not source_url:
        return record["id"], None, "missing source image URL"

    source_name = Path(urlparse(source_url).path).name
    extension = Path(source_name).suffix.lower() or ".jpg"
    destination = images_dir / f"{record['id']}{extension}"

    try:
        if not destination.exists() or destination.stat().st_size == 0:
            destination.write_bytes(fetch_bytes(source_url))
        with Image.open(destination) as image:
            image.verify()
        with Image.open(destination) as image:
            metadata = {
                "path": destination.as_posix(),
                "width": image.width,
                "height": image.height,
                "format": image.format,
            }
        return record["id"], metadata, None
    except Exception as error:  # noqa: BLE001
        destination.unlink(missing_ok=True)
        return record["id"], None, str(error)


def main() -> None:
    parser = argparse.ArgumentParser(description="Import NORMECO public catalog data.")
    parser.add_argument(
        "--workspace",
        default=".",
        help="Website workspace root. Defaults to current directory.",
    )
    parser.add_argument("--workers", type=int, default=6)
    args = parser.parse_args()

    workspace = Path(args.workspace).resolve()
    output_dir = workspace / "assets" / "product-catalog"
    images_dir = output_dir / "images"
    output_dir.mkdir(parents=True, exist_ok=True)
    images_dir.mkdir(parents=True, exist_ok=True)

    source_categories = parse_source_categories(fetch_document(CATALOG_URL))
    products: list[dict] = []
    category_counts: dict[str, int] = {}

    for category in source_categories:
        category_products = parse_products(fetch_document(category["url"]), category)
        products.extend(category_products)
        category_counts[category["title"]] = len(category_products)
        print(f"{category['title']}: {len(category_products)}")

    unique_products = {product["id"]: product for product in products}
    products = list(unique_products.values())

    image_errors: list[dict[str, str]] = []
    image_metadata: dict[str, dict] = {}
    with ThreadPoolExecutor(max_workers=max(1, args.workers)) as executor:
        futures = {
            executor.submit(download_image, product, images_dir): product
            for product in products
        }
        for future in as_completed(futures):
            product_id, metadata, error = future.result()
            if metadata:
                relative_path = Path(metadata["path"]).relative_to(workspace).as_posix()
                metadata["path"] = relative_path
                image_metadata[product_id] = metadata
            if error:
                image_errors.append({"id": product_id, "error": error})

    for product in products:
        product["image"] = image_metadata.get(product["id"])

    payload = {
        "sourceCatalog": CATALOG_URL,
        "sourceNotice": (
            "官网详情页未提供结构化型号尺寸表；当前尺寸值保留为空，"
            "结构参数来自官网分类与产品名称。"
        ),
        "summary": {
            "sourceCategoryCount": len(source_categories),
            "productCount": len(products),
            "downloadedImageCount": len(image_metadata),
            "imageErrorCount": len(image_errors),
            "productsBySourceCategory": category_counts,
        },
        "imageErrors": image_errors,
        "sourceCategories": source_categories,
        "products": products,
    }

    output_path = output_dir / "catalog.json"
    output_path.write_text(
        json.dumps(payload, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    print(json.dumps(payload["summary"], ensure_ascii=False, indent=2))
    print(f"Wrote {output_path}")


if __name__ == "__main__":
    main()
