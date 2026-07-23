import opencascade from "replicad-opencascadejs/src/replicad_single.js";
import opencascadeWasm from "replicad-opencascadejs/src/replicad_single.wasm?url";
import { importSTEP, makeBox, makeCylinder, setOC } from "replicad";

let config;
let sourceShape;
let headShape;
let currentShape;
let sourceBounds;
let modelStartX;
let shaftCenter;
let currentLength;
let bootPromise;
let queue = Promise.resolve();

function boundsOf(shape) {
  const box = shape.boundingBox;
  const bounds = box.bounds;
  box.delete();
  return bounds;
}

function validateConfig(value) {
  if (value.schemaVersion !== 1 || value.unit !== "mm" || value.axis !== "+X") {
    throw new Error("批头 JSON 目前仅支持 schemaVersion 1、mm 和 +X 轴");
  }

  const { startX, endX } = value.variableRegion || {};
  if (!(startX >= 0 && endX === value.baseLength && startX < endX)) {
    throw new Error("variableRegion 必须从 startX 延伸到批头总长 endX");
  }
  if (!(value.shaftRadius > 0)) throw new Error("JSON 缺少有效的 shaftRadius");
}

async function initialize(configUrl) {
  self.postMessage({ type: "status", message: "正在启动 OpenCascade…" });
  const OC = await opencascade({ locateFile: () => opencascadeWasm });
  setOC(OC);

  const configResponse = await fetch(configUrl);
  if (!configResponse.ok) throw new Error(`无法读取模型 JSON（${configResponse.status}）`);
  config = await configResponse.json();
  validateConfig(config);

  const stepUrl = new URL(config.stepFile, new URL(".", configUrl));
  self.postMessage({ type: "status", message: "正在读取 PH2 STEP…" });
  const stepResponse = await fetch(stepUrl);
  if (!stepResponse.ok) throw new Error(`无法读取 STEP（${stepResponse.status}）`);
  sourceShape = await importSTEP(await stepResponse.blob());
  sourceBounds = boundsOf(sourceShape);

  const [minimum, maximum] = sourceBounds;
  const measuredLength = maximum[0] - minimum[0];
  if (Math.abs(measuredLength - config.baseLength) > 0.05) {
    throw new Error(`STEP 实际长度 ${measuredLength.toFixed(2)} mm 与 JSON 不一致`);
  }

  modelStartX = minimum[0] + config.variableRegion.startX;
  shaftCenter = [(minimum[1] + maximum[1]) / 2, (minimum[2] + maximum[2]) / 2];
  const transverseSize = Math.max(maximum[1] - minimum[1], maximum[2] - minimum[2]);
  const margin = transverseSize + 2;
  const jointOverlap = 0.03;
  const cutter = makeBox(
    [minimum[0] - 1, minimum[1] - margin, minimum[2] - margin],
    [modelStartX + jointOverlap, maximum[1] + margin, maximum[2] + margin]
  );
  headShape = sourceShape.intersect(cutter);
  cutter.delete();
}

function buildShape(length) {
  const shaftLength = length - config.variableRegion.startX;
  if (shaftLength <= 0) throw new Error("总长度必须大于固定头部长度");

  const shaft = makeCylinder(
    config.shaftRadius,
    shaftLength,
    [modelStartX, shaftCenter[0], shaftCenter[1]],
    [1, 0, 0]
  );
  const nextShape = headShape.fuse(shaft);
  shaft.delete();
  return nextShape;
}

function generate(length, requestId) {
  self.postMessage({ type: "status", message: `正在重建 ${length} mm BRep…` });
  const nextShape = buildShape(length);
  if (currentShape) currentShape.delete();
  currentShape = nextShape;
  currentLength = length;

  const mesh = currentShape.mesh({ tolerance: 0.01, angularTolerance: 0.06 });
  const bounds = boundsOf(currentShape);
  const measuredLength = bounds[1][0] - bounds[0][0];
  if (Math.abs(measuredLength - length) > 0.05) {
    throw new Error(`重建长度校验失败：${measuredLength.toFixed(2)} mm`);
  }

  self.postMessage({
    type: "model",
    requestId,
    length,
    measuredLength,
    bounds,
    mesh,
    metadata: {
      sourceLength: config.baseLength,
      fixedHeadLength: config.variableRegion.startX,
      variableLength: length - config.variableRegion.startX
    }
  });
}

async function exportCurrent() {
  if (!currentShape) throw new Error("模型尚未就绪");
  self.postMessage({ type: "status", message: "正在导出并回读校验 STEP…" });
  const blob = currentShape.blobSTEP();
  const roundTripShape = await importSTEP(blob);
  const roundTripBounds = boundsOf(roundTripShape);
  const roundTripLength = roundTripBounds[1][0] - roundTripBounds[0][0];
  roundTripShape.delete();
  if (Math.abs(roundTripLength - currentLength) > 0.05) {
    throw new Error(`导出回读长度校验失败：${roundTripLength.toFixed(2)} mm`);
  }

  const buffer = await blob.arrayBuffer();
  self.postMessage({
    type: "export",
    buffer,
    length: currentLength,
    roundTripLength
  }, [buffer]);
}

async function handleMessage(data) {
  if (data.type === "init") {
    bootPromise ||= initialize(data.configUrl);
    await bootPromise;
    generate(config.baseLength, data.requestId || 0);
    return;
  }

  if (!bootPromise) throw new Error("CAD Worker 尚未初始化");
  await bootPromise;
  if (data.type === "setLength") generate(Number(data.length), data.requestId);
  if (data.type === "export") await exportCurrent();
}

self.addEventListener("message", event => {
  queue = queue
    .then(() => handleMessage(event.data))
    .catch(error => self.postMessage({ type: "error", message: error?.message || String(error) }));
});
