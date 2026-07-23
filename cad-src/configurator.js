import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { syncFaces } from "replicad-threejs-helper";

const canvas = document.getElementById("bitCanvas");
const statusElement = document.getElementById("modelStatus");
const lengthRange = document.getElementById("lengthRange");
const lengthNumber = document.getElementById("lengthNumber");
const lengthOutput = document.getElementById("lengthOutput");
const lengthDimension = document.getElementById("lengthDimension");
const resetViewButton = document.getElementById("resetView");
const exportButton = document.getElementById("exportStep");
const downloadLink = document.getElementById("downloadStep");

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: true,
  alpha: true,
  powerPreference: "high-performance"
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.92;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;

const pmrem = new THREE.PMREMGenerator(renderer);
const room = new RoomEnvironment();
scene.environment = pmrem.fromScene(room, 0.04).texture;
scene.environmentIntensity = 0.52;
room.dispose();
pmrem.dispose();

scene.add(new THREE.HemisphereLight(0xeaf3ff, 0x7c8389, 1));
scene.add(new THREE.AmbientLight(0xffffff, 0.9));
const keyLight = new THREE.DirectionalLight(0xffffff, 1.4);
keyLight.position.set(-30, 55, 65);
keyLight.castShadow = true;
keyLight.shadow.mapSize.set(2048, 2048);
keyLight.shadow.camera.left = -100;
keyLight.shadow.camera.right = 100;
keyLight.shadow.camera.top = 100;
keyLight.shadow.camera.bottom = -100;
scene.add(keyLight);

const rimLight = new THREE.DirectionalLight(0xbfd9ff, 0.8);
rimLight.position.set(35, 10, -55);
scene.add(rimLight);

const topSoftbox = new THREE.RectAreaLight(0xffffff, 1.7, 90, 24);
topSoftbox.position.set(0, 38, 42);
topSoftbox.lookAt(0, 0, 0);
scene.add(topSoftbox);

const frontSoftbox = new THREE.RectAreaLight(0xd7e6ff, 1, 70, 30);
frontSoftbox.position.set(-20, -18, 48);
frontSoftbox.lookAt(0, 0, 0);
scene.add(frontSoftbox);

const modelGroup = new THREE.Group();
scene.add(modelGroup);

const steelMaterial = new THREE.MeshPhysicalMaterial({
  color: 0x7f8992,
  metalness: 0.22,
  roughness: 0.4,
  anisotropy: 0.35,
  anisotropyRotation: Math.PI / 2,
  clearcoat: 0.14,
  clearcoatRoughness: 0.18,
  envMapIntensity: 0.6
});

const ground = new THREE.Mesh(
  new THREE.PlaneGeometry(260, 160),
  new THREE.ShadowMaterial({ color: 0x1d2228, opacity: 0.1, depthWrite: false })
);
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
scene.add(ground);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = false;
controls.enablePan = false;
controls.autoRotate = false;
controls.rotateSpeed = 0.72;
controls.zoomSpeed = 0.8;
controls.addEventListener("change", () => {
  document.body.dataset.cameraPosition = camera.position.toArray().map(value => value.toFixed(3)).join(",");
  render();
});

let modelMesh;
let modelBounds;
let firstModel = true;
let requestedLength = 50;
let requestId = 0;
let debounceTimer;
let pendingDownload;

function render() {
  renderer.render(scene, camera);
}

function resize() {
  const width = Math.max(1, canvas.clientWidth);
  const height = Math.max(1, canvas.clientHeight);
  renderer.setSize(width, height, false);
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  render();
}

function setStatus(message, state = "loading") {
  statusElement.textContent = message;
  statusElement.dataset.state = state;
}

function setControlsEnabled(enabled) {
  lengthRange.disabled = !enabled;
  lengthNumber.disabled = !enabled;
  exportButton.disabled = !enabled;
}

function updateLengthUi(value) {
  requestedLength = Math.max(25, Math.min(150, Math.round(Number(value) || 25)));
  const progress = (requestedLength - 25) / 125 * 100;
  lengthRange.value = requestedLength;
  lengthRange.style.setProperty("--range-progress", `${progress}%`);
  lengthNumber.value = requestedLength;
  lengthOutput.textContent = `${requestedLength} mm`;
  lengthDimension.textContent = `${requestedLength} mm`;
}

function fitCamera(bounds, resetDirection = false) {
  const minimum = new THREE.Vector3(...bounds[0]);
  const maximum = new THREE.Vector3(...bounds[1]);
  const box = new THREE.Box3(minimum, maximum);
  const center = box.getCenter(new THREE.Vector3());
  const size = box.getSize(new THREE.Vector3());
  modelGroup.position.copy(center).multiplyScalar(-1);

  const distance = Math.max(size.x, size.y, size.z) / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2))) * 1.28;
  const direction = resetDirection
    ? new THREE.Vector3(0.35, 0.75, 1.25).normalize()
    : camera.position.clone().sub(controls.target).normalize();
  if (!Number.isFinite(direction.lengthSq()) || direction.lengthSq() < 0.5) direction.set(0.35, 0.75, 1.25).normalize();

  controls.target.set(0, 0, 0);
  camera.position.copy(direction.multiplyScalar(distance));
  camera.near = Math.max(0.05, distance / 100);
  camera.far = distance * 10;
  camera.updateProjectionMatrix();
  controls.minDistance = distance * 0.35;
  controls.maxDistance = distance * 4;
  controls.update();

  ground.position.y = -size.y / 2 - Math.max(0.7, size.y * 0.14);
  render();
}

function applyModel(message) {
  const geometry = new THREE.BufferGeometry();
  syncFaces(geometry, message.mesh);
  geometry.computeBoundingSphere();

  if (modelMesh) {
    modelGroup.remove(modelMesh);
    modelMesh.geometry.dispose();
  }
  modelMesh = new THREE.Mesh(geometry, steelMaterial);
  modelMesh.castShadow = true;
  modelMesh.receiveShadow = true;
  modelGroup.add(modelMesh);

  modelBounds = message.bounds;
  fitCamera(modelBounds, firstModel);
  firstModel = false;
  updateLengthUi(message.length);
  document.body.dataset.modelLength = message.measuredLength.toFixed(2);
  document.body.dataset.modelSource = "STEP-BRep";
  setControlsEnabled(true);
  setStatus(`PH2 · STEP/BRep · ${message.measuredLength.toFixed(0)} mm`, "ready");
}

function requestLength(value) {
  if (pendingDownload) {
    URL.revokeObjectURL(pendingDownload.url);
    pendingDownload = undefined;
    downloadLink.hidden = true;
    downloadLink.removeAttribute("href");
    exportButton.hidden = false;
    delete document.body.dataset.downloadReady;
  }
  updateLengthUi(value);
  clearTimeout(debounceTimer);
  setControlsEnabled(false);
  setStatus(`正在生成 ${requestedLength} mm…`);
  debounceTimer = setTimeout(() => {
    requestId += 1;
    worker.postMessage({ type: "setLength", length: requestedLength, requestId });
  }, 160);
}

function handleWorkerMessage(event) {
  const message = event.data;
  if (message.type === "status") {
    setStatus(message.message);
    return;
  }
  if (message.type === "model") {
    if (message.requestId < requestId) return;
    applyModel(message);
    return;
  }
  if (message.type === "export") {
    const blob = new Blob([message.buffer], { type: "application/step" });
    const url = URL.createObjectURL(blob);
    pendingDownload = { url, length: message.length };
    downloadLink.href = url;
    downloadLink.download = `NORMECO_PH2_L${message.length}.step`;
    downloadLink.hidden = false;
    exportButton.hidden = true;
    setControlsEnabled(true);
    document.body.dataset.exportLength = message.roundTripLength.toFixed(2);
    document.body.dataset.downloadReady = "true";
    setStatus(`STEP 已生成并回读校验 · ${message.roundTripLength.toFixed(0)} mm，请点击下载`, "ready");
    return;
  }
  if (message.type === "error") {
    console.error("PH2 CAD:", message.message);
    setControlsEnabled(false);
    setStatus(message.message, "error");
  }
}

const worker = new Worker(new URL("./cad.worker.js", import.meta.url), { type: "module" });
worker.addEventListener("message", handleWorkerMessage);
worker.addEventListener("error", event => {
  console.error(event.error || event.message);
  setStatus("CAD 模块加载失败，请刷新后重试", "error");
});

lengthRange.addEventListener("input", event => requestLength(event.target.value));
lengthNumber.addEventListener("change", event => requestLength(event.target.value));
lengthNumber.addEventListener("blur", event => updateLengthUi(event.target.value));
resetViewButton.addEventListener("click", () => modelBounds && fitCamera(modelBounds, true));
exportButton.addEventListener("click", () => {
  setControlsEnabled(false);
  setStatus("正在导出 STEP…");
  worker.postMessage({ type: "export" });
});

downloadLink.addEventListener("click", () => {
  if (!pendingDownload) return;
  const { url, length } = pendingDownload;
  document.body.dataset.downloadedLength = length.toFixed(2);
  delete document.body.dataset.downloadReady;
  pendingDownload = undefined;
  setStatus("STEP 下载已触发", "ready");
  window.setTimeout(() => {
    URL.revokeObjectURL(url);
    downloadLink.hidden = true;
    downloadLink.removeAttribute("href");
    exportButton.hidden = false;
  }, 1000);
});

new ResizeObserver(resize).observe(canvas.parentElement);
updateLengthUi(50);
setControlsEnabled(false);
resize();
worker.postMessage({
  type: "init",
  requestId: 0,
  configUrl: new URL("批头/批头.json", window.location.href).href
});
