import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const sourcePath = resolve(projectRoot, "assets/product-catalog/catalog.json");
const customCasesPath = resolve(projectRoot, "assets/custom-cases.json");
const outputPath = resolve(projectRoot, "data/admin-catalog.json");

const categoryGroups = [
  {
    id: "impact",
    name: "工业冲击套筒",
    children: [
      ["impact-1-4", '1/4" 工业冲击套筒'],
      ["impact-3-8", '3/8" 工业冲击套筒'],
      ["impact-1-2", '1/2" 工业冲击套筒'],
      ["impact-5-8", '5/8" 工业冲击套筒'],
      ["impact-3-4", '3/4" 工业冲击套筒'],
      ["impact-1", '1" 工业冲击套筒'],
      ["impact-1-1-2", '1-1/2" 工业冲击套筒'],
      ["impact-2-1-2", '2-1/2" 工业冲击套筒']
    ]
  },
  {
    id: "bits",
    name: "起子套筒与起子头",
    children: [
      ["bits-sockets", "起子套筒"],
      ["bits-industrial", "工业级起子头"],
      ["bits-maintenance", "维修级起子头"]
    ]
  },
  {
    id: "accessories",
    name: "连接与附件",
    children: [
      ["accessories-adapters", "转换头"],
      ["accessories-extensions", "延长杆"],
      ["accessories-universal", "万向接头"],
      ["accessories-retainers", "锁销与 O 形环"]
    ]
  },
  {
    id: "sets",
    name: "套装组合工具",
    children: [["sets-combination", "套筒与装配工具套装"]]
  },
  {
    id: "custom",
    name: "定制产品",
    children: [
      ["custom-special", "异形与特殊结构"],
      ["custom-line", "产线专用定制"]
    ]
  },
  {
    id: "special",
    name: "特殊应用",
    children: [
      ["special-insulated", "绝缘套筒"],
      ["special-antivibration", "抗震动与油压脉冲"],
      ["special-protected", "旋护与保护结构"]
    ]
  }
];

const columnLabels = {
  model: "型号",
  size: "Size",
  D1: "D1",
  D2: "D2",
  L: "L",
  L2: "L2"
};

function text(value) {
  if (value && typeof value === "object") return value.zh || value.en || "";
  return value == null ? "" : String(value);
}

function unique(values) {
  return [...new Set(values.map((value) => text(value).trim()).filter(Boolean))];
}

function tagId(index) {
  return `tag-${String(index + 1).padStart(3, "0")}`;
}

const source = JSON.parse(await readFile(sourcePath, "utf8"));
const customCasesSource = JSON.parse(await readFile(customCasesPath, "utf8"));
const tagNames = unique(source.products.flatMap((product) => [
  product.drive,
  product.profile,
  product.length,
  ...(product.features || [])
]));
const tags = tagNames.map((name, index) => ({ id: tagId(index), name }));
const tagIdsByName = new Map(tags.map((tag) => [tag.name, tag.id]));

const categories = categoryGroups.flatMap((group, groupIndex) => [
  { id: group.id, name: group.name, parentId: null, order: groupIndex },
  ...group.children.map(([id, name], childIndex) => ({
    id,
    name,
    parentId: group.id,
    order: childIndex
  }))
]);

const products = source.products.map((product) => {
  const specColumns = product.specifications?.columns || [];
  const specRows = product.specifications?.models || [];
  const hasSpecifications = specColumns.length > 0 && specRows.length > 0;
  const columns = hasSpecifications
    ? specColumns.map((column) => columnLabels[column] || column)
    : ["型号", "方驱", "轮廓", "长度"];
  const rows = hasSpecifications
    ? specRows.map((row) => specColumns.map((column) => text(row[column])))
    : [[text(product.dimensions?.model) || "—", text(product.drive) || "—", text(product.profile) || "—", text(product.length) || "—"]];
  const featureNames = unique([
    product.drive,
    product.profile,
    product.length,
    ...(product.features || [])
  ]);
  const productName = text(product.name);
  const sourceCategory = product.sourceCategory || "NORMECO 产品目录";
  const model = rows[0]?.[0] && rows[0][0] !== "—" ? rows[0][0] : product.id;

  return {
    id: product.id,
    name: productName,
    model,
    status: "已发布",
    categoryId: product.primaryCategory,
    tagIds: featureNames.map((name) => tagIdsByName.get(name)).filter(Boolean),
    summary: [text(product.drive), text(product.profile), text(product.length)].filter(Boolean).join(" · ") || sourceCategory,
    image: product.image?.path || "assets/product-sockets.png",
    detailTitle: productName,
    detailIntro: `产品分类：${sourceCategory}。参数来自${product.parameterSource || "NORMECO 正式产品目录"}。`,
    featureTitle: "产品特点",
    features: unique(product.features),
    specNote: hasSpecifications
      ? `规格来源：${product.specifications.source || product.parameterSource || "NORMECO 正式产品目录"}；尺寸单位以原目录为准。`
      : `当前产品暂无独立尺寸表；信息来源：${product.parameterSource || "NORMECO 正式产品目录"}。`,
    columns,
    rows,
    sourceUrl: product.sourceUrl || "",
    sourceImageUrl: product.sourceImageUrl || "",
    sourceCategory,
    sourceCatalogPage: product.specifications?.catalogPage || null,
    parameterSource: product.parameterSource || ""
  };
});

const adminCatalog = {
  version: 1,
  source: "assets/product-catalog/catalog.json",
  updatedAt: new Date().toISOString(),
  tags,
  categories,
  products,
  selectedProductId: products[0]?.id || null,
  customCases: customCasesSource.customCases,
  selectedCustomCaseId: customCasesSource.customCases[0]?.id || null
};

await mkdir(dirname(outputPath), { recursive: true });
await writeFile(outputPath, `${JSON.stringify(adminCatalog, null, 2)}\n`, "utf8");
console.log(`Generated ${products.length} products, ${categories.length} categories and ${tags.length} tags.`);
