import {
  AmbientLight, CanvasTexture, CatmullRomCurve3, DirectionalLight, Group, MathUtils,
  Mesh, MeshBasicMaterial, MeshStandardMaterial, PerspectiveCamera, PlaneGeometry,
  Raycaster, RepeatWrapping, Scene, SRGBColorSpace, TubeGeometry, Vector2, Vector3, WebGLRenderer
} from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";

const initialYaw = -0.31;
const initialPitch = 0.31;
const fabricHeight = 0.944;
const fabricSize = 128;
const stainSize = 256;

function surface(size, reads = false) {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const context = canvas.getContext("2d", { willReadFrequently: reads });
  const texture = new CanvasTexture(canvas);
  return { context, texture };
}

function textile() {
  const { context, texture } = surface(fabricSize);
  const pixels = context.createImageData(fabricSize, fabricSize);
  for (let y = 0; y < fabricSize; y++) {
    for (let x = 0; x < fabricSize; x++) {
      const i = (y * fabricSize + x) * 4;
      const variation = ((x * 13 + y * 31 + (x * y) % 121) % 21) - 10;
      const yarn = x % 6 === 1 || y % 5 === 2 ? 32 : 0;
      pixels.data[i] = pixels.data[i + 1] = pixels.data[i + 2] = 182 + variation + yarn;
      pixels.data[i + 3] = 255;
    }
  }
  context.putImageData(pixels, 0, 0);
  texture.wrapS = texture.wrapT = RepeatWrapping;
  texture.repeat.set(4, 3);
  texture.needsUpdate = true;
  return texture;
}

function box(width, height, depth, radius, material, x, y, z) {
  const mesh = new Mesh(new RoundedBoxGeometry(width, height, depth, 4, radius), material);
  mesh.position.set(x, y, z);
  return mesh;
}

function seam(x, y, z, width, depth, material) {
  const a = width / 2;
  const b = depth / 2;
  const corners = [
    [-a + .06, b], [a - .06, b], [a, b - .06], [a, -b + .06],
    [a - .06, -b], [-a + .06, -b], [-a, -b + .06], [-a, b - .06]
  ];
  const curve = new CatmullRomCurve3(corners.map(([x, z]) => new Vector3(x, 0, z)), true, "centripetal");
  const mesh = new Mesh(new TubeGeometry(curve, 48, 0.008, 5, true), material);
  mesh.position.set(x, y, z);
  return mesh;
}

function drawStain(context, color, seed) {
  context.clearRect(0, 0, stainSize, stainSize);
  const rnd = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  for (let i = 0; i < 25; i++) {
    const x = 128 + (rnd() - .5) * 100;
    const y = 128 + (rnd() - .5) * 81;
    const radius = 19 + rnd() * 35;
    const wash = context.createRadialGradient(x, y, 0, x, y, radius);
    wash.addColorStop(0, `rgba(${color},.34)`);
    wash.addColorStop(.63, `rgba(${color},.21)`);
    wash.addColorStop(1, `rgba(${color},0)`);
    context.fillStyle = wash;
    context.fillRect(x - radius, y - radius, radius * 2, radius * 2);
  }
  for (let i = 0; i < 28; i++) {
    const angle = rnd() * Math.PI * 2;
    const spread = 51 + rnd() * 38;
    context.fillStyle = `rgba(${color},${.08 + rnd() * .21})`;
    context.beginPath();
    context.arc(128 + Math.cos(angle) * spread, 128 + Math.sin(angle) * spread * .82, 1 + rnd() * 4.2, 0, Math.PI * 2);
    context.fill();
  }
}

function mass(context) {
  const pixels = context.getImageData(0, 0, stainSize, stainSize).data;
  let total = 0;
  for (let i = 3; i < pixels.length; i += 16) total += pixels[i];
  return total;
}

function stain(x, z, color, seed) {
  const { context, texture } = surface(stainSize, true);
  texture.colorSpace = SRGBColorSpace;
  const mesh = new Mesh(new PlaneGeometry(.91, .84), new MeshBasicMaterial({
    map: texture, transparent: true, opacity: .85, depthWrite: false, toneMapped: false
  }));
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.set(x, fabricHeight, z);
  const item = { mesh, context, texture, color, seed, initial: 0, remaining: 0 };
  resetStain(item);
  return item;
}

function resetStain(item) {
  drawStain(item.context, item.color, item.seed);
  item.initial = item.remaining = mass(item.context);
  item.texture.needsUpdate = true;
  item.mesh.visible = true;
}

function eraseStroke(item, uv, previous) {
  const { context } = item;
  const steps = previous ? Math.max(1, Math.ceil(previous.distanceTo(uv) * 25)) : 1;
  context.save();
  context.globalCompositeOperation = "destination-out";
  for (let i = 1; i <= steps; i++) {
    const point = previous ? previous.clone().lerp(uv, i / steps) : uv;
    const x = point.x * stainSize;
    const y = (1 - point.y) * stainSize;
    const brush = context.createRadialGradient(x, y, 13, x, y, 36);
    brush.addColorStop(0, "black");
    brush.addColorStop(1, "transparent");
    context.fillStyle = brush;
    context.fillRect(x - 36, y - 36, 72, 72);
  }
  context.restore();
  item.texture.needsUpdate = true;
}

function buildSofa() {
  const group = new Group();
  const bumpMap = textile();
  const fabric = new MeshStandardMaterial({ color:"#94b2c9", roughness:.97, bumpMap, bumpScale:.027 });
  const seat = new MeshStandardMaterial({ color:"#a2c1d6", roughness:.96, bumpMap, bumpScale:.028 });
  const piping = new MeshStandardMaterial({ color:"#7f9eb7", roughness:1 });
  const oak = new MeshStandardMaterial({ color:"#ac825d", roughness:.82 });

  group.add(box(3.91, .46, 1.53, .12, fabric, 0, .454, -.08));
  group.add(box(3.82, 1.02, .29, .119, fabric, 0, .975, -.714));
  for (const side of [-1, 1]) {
    group.add(box(.32, 1, 1.56, .131, fabric, side * 1.794, .70, -.055));
    for (const z of [-.565, .55]) {
      const foot = box(.117, .27, .13, .024, oak, side * 1.65, .124, z);
      foot.rotation.z = side * .10;
      group.add(foot);
    }
  }
  for (const x of [-1.067, 0, 1.067]) {
    group.add(box(1.048, .272, 1.137, .132, seat, x, .799, .097));
    group.add(seam(x, .848, .097, 1.035, 1.129, piping));
    const back = box(1.046, .70, .252, .122, seat, x, 1.166, -.503);
    back.rotation.x = -.16;
    group.add(back);
  }
  const stains = [
    stain(-1.052, .187, "99,64,45", 29),
    stain(.012, .256, "104,62,91", 962),
    stain(1.055, .086, "102,77,40", 320)
  ];
  for (const item of stains) group.add(item.mesh);
  return { group, stains };
}

function contactShadow() {
  const { context, texture } = surface(128);
  const shadow = context.createRadialGradient(64, 64, 9, 64, 64, 62);
  shadow.addColorStop(0, "rgba(53,86,119,.31)");
  shadow.addColorStop(.55, "rgba(53,86,119,.17)");
  shadow.addColorStop(1, "rgba(53,86,119,0)");
  context.fillStyle = shadow;
  context.fillRect(0, 0, 128, 128);
  texture.needsUpdate = true;
  const mesh = new Mesh(new PlaneGeometry(5.3, 2.58), new MeshBasicMaterial({
    map:texture, transparent:true, opacity:.88, depthWrite:false, toneMapped:false
  }));
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.y = -.005;
  return mesh;
}

export function mount(root) {
  const canvas = root.querySelector(".sim-canvas");
  const holder = root.querySelector(".sim-scene");
  const panel = root.querySelector(".sim-panel");
  const progress = root.querySelector("#clean-progress");
  const value = root.querySelector("#clean-value");
  const status = root.querySelector("#sofa-status");
  const reset = root.querySelector("[data-reset]");
  const cleanButton = root.querySelector("[data-clean-spot]");
  const viewButtons = root.querySelectorAll("[data-turn], [data-tilt]");
  const reduced = matchMedia("(prefers-reduced-motion: reduce)");
  let renderer;
  try {
    const context = canvas.getContext("webgl2", { alpha:true, antialias:true, powerPreference:"low-power" });
    if (!context) return;
    renderer = new WebGLRenderer({ canvas, context, antialias:true, alpha:true });
  } catch {
    return;
  }

  const scene = new Scene();
  const camera = new PerspectiveCamera(31, 1, 0.1, 35);
  const ray = new Raycaster();
  const pointer = new Vector2();
  const { group, stains } = buildSofa();
  const touchTargets = stains.map(() => {
    const target = document.createElement("span");
    target.className = "sim-stain-target";
    target.setAttribute("aria-hidden", "true");
    target.hidden = true;
    holder.append(target);
    return target;
  });
  const projected = new Vector3();
  const stainCorners = [[-.32, -.28], [.32, -.28], [.32, .28], [-.32, .28]];
  const spotByMesh = new Map(stains.map(item => [item.mesh, item]));
  const changedStains = new Set();
  scene.add(group, contactShadow(), new AmbientLight("#dae9ff", 1.7));
  const key = new DirectionalLight("#fff3e4", 2.1);
  key.position.set(-3, 6, 5);
  const rim = new DirectionalLight("#d7e8ff", 1.3);
  rim.position.set(2.5, 2.3, -4);
  scene.add(key, rim);

  const initialMass = stains.reduce((sum, item) => sum + item.initial, 0);
  let percent = 0;
  let frame = 0;
  let yaw = initialYaw;
  let pitch = initialPitch;
  let tween;
  let gesture;
  let width = 0;
  let height = 0;
  let lost = false;
  let refreshTargets = true;

  function updateProgress() {
    for (const item of changedStains) {
      item.remaining = mass(item.context);
      if (item.remaining < item.initial * .02) {
        item.remaining = 0;
        item.mesh.visible = false;
        refreshTargets = true;
      }
    }
    changedStains.clear();
    const remaining = stains.reduce((sum, item) => sum + item.remaining, 0);
    const next = remaining === 0 ? 100 : Math.min(99, Math.round(100 * (1 - remaining / initialMass)));
    if (next === 100 && percent !== 100) status.textContent = "Все пятна убраны.";
    percent = next;
    progress.value = percent;
    value.value = `${percent}%`;
    cleanButton.disabled = percent === 100;
  }

  function findSurface() {
    ray.setFromCamera(pointer, camera);
    return ray.intersectObjects(group.children, false).find(hit => hit.object.visible);
  }

  function positionTouchTargets() {
    stains.forEach(({ mesh }, index) => {
      const target = touchTargets[index];
      projected.set(0, 0, 0).applyMatrix4(mesh.matrixWorld).project(camera);
      pointer.set(projected.x, projected.y);
      target.hidden = !mesh.visible || findSurface()?.object !== mesh;
      if (target.hidden) return;
      target.style.left = `${(pointer.x + 1) * width * .5}px`;
      target.style.top = `${(1 - pointer.y) * height * .5}px`;
      let xExtent = 0;
      let yExtent = 0;
      for (const [x, y] of stainCorners) {
        projected.set(x, y, 0).applyMatrix4(mesh.matrixWorld).project(camera);
        xExtent = Math.max(xExtent, Math.abs(projected.x - pointer.x) * width);
        yExtent = Math.max(yExtent, Math.abs(projected.y - pointer.y) * height);
      }
      target.style.width = `${Math.max(28, xExtent)}px`;
      target.style.height = `${Math.max(24, yExtent)}px`;
    });
  }

  function draw(now) {
    frame = 0;
    if (lost || !width || !height) return;
    if (changedStains.size) updateProgress();
    if (tween) {
      refreshTargets = true;
      const ratio = Math.min((now - tween.start) / 255, 1);
      const ease = 1 - (1 - ratio) ** 3;
      yaw = MathUtils.lerp(tween.fromYaw, tween.yaw, ease);
      pitch = MathUtils.lerp(tween.fromPitch, tween.pitch, ease);
      if (ratio === 1) tween = undefined;
    }
    group.rotation.y = yaw;
    const distance = Math.max(5.46, 8.4 / camera.aspect);
    camera.position.set(0, .71 + Math.sin(pitch) * distance, Math.cos(pitch) * distance);
    camera.lookAt(0, .71, 0);
    renderer.render(scene, camera);
    if (refreshTargets) {
      positionTouchTargets();
      refreshTargets = false;
    }
    if (tween) requestDraw();
  }

  function requestDraw() {
    if (!frame && !lost) frame = requestAnimationFrame(draw);
  }

  function resize() {
    width = holder.clientWidth;
    height = holder.clientHeight;
    if (!width || !height) return;
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.8));
    renderer.setSize(width, height, false);
    refreshTargets = true;
    requestDraw();
  }

  function moveView(targetYaw, targetPitch) {
    refreshTargets = true;
    if (reduced.matches) {
      tween = undefined;
      yaw = targetYaw;
      pitch = targetPitch;
    } else {
      tween = { fromYaw:yaw, fromPitch:pitch, yaw:targetYaw, pitch:targetPitch, start:performance.now() };
    }
    requestDraw();
  }

  function cleanAt(event) {
    const { bounds } = gesture;
    pointer.set(((event.clientX - bounds.left) / bounds.width) * 2 - 1,
      1 - ((event.clientY - bounds.top) / bounds.height) * 2);
    const hit = findSurface();
    const item = hit && spotByMesh.get(hit.object);
    if (!item) {
      gesture.last = undefined;
      return;
    }
    const last = gesture.last;
    eraseStroke(item, hit.uv, last?.item === item ? last.point : undefined);
    gesture.last = { item, point:hit.uv.clone() };
    changedStains.add(item);
    requestDraw();
  }

  for (const button of viewButtons) {
    button.addEventListener("click", () => {
      const targetYaw = (tween?.yaw ?? yaw) + Number(button.dataset.turn ?? 0) * .54;
      const targetPitch = (tween?.pitch ?? pitch) + Number(button.dataset.tilt ?? 0) * .16;
      moveView(targetYaw, MathUtils.clamp(targetPitch, .05, .79));
    });
  }
  reset.addEventListener("click", () => {
    for (const item of stains) resetStain(item);
    changedStains.clear();
    status.textContent = "Пятна и исходный ракурс восстановлены.";
    updateProgress();
    const closestInitialYaw = yaw + Math.atan2(Math.sin(initialYaw - yaw), Math.cos(initialYaw - yaw));
    moveView(closestInitialYaw, initialPitch);
  });
  cleanButton.addEventListener("click", () => {
    const next = stains.find(item => item.remaining > 0);
    if (!next) return;
    next.context.clearRect(0, 0, stainSize, stainSize);
    next.texture.needsUpdate = true;
    changedStains.add(next);
    updateProgress();
    if (percent < 100) status.textContent = `Пятно убрано. Чистота ${percent}%.`;
    requestDraw();
  });

  holder.addEventListener("pointerdown", event => {
    if (lost || gesture || event.button !== 0) return;
    // A touch that starts off the fabric spots belongs to the browser's page scroll.
    if (event.pointerType === "touch" && !event.target.classList.contains("sim-stain-target")) return;
    gesture = { id:event.pointerId, bounds:canvas.getBoundingClientRect() };
    holder.setPointerCapture(event.pointerId);
    cleanAt(event);
  });
  holder.addEventListener("pointermove", event => {
    if (gesture?.id === event.pointerId) cleanAt(event);
  });
  for (const name of ["pointerup", "pointercancel", "lostpointercapture"]) {
    holder.addEventListener(name, event => {
      if (gesture?.id !== event.pointerId) return;
      gesture = undefined;
    });
  }
  function showViewer(ready) {
    root.dataset.ready = String(ready);
    canvas.hidden = panel.hidden = !ready;
  }
  canvas.addEventListener("webglcontextlost", event => {
    event.preventDefault();
    lost = true;
    gesture = undefined;
    for (const target of touchTargets) target.hidden = true;
    showViewer(false);
  });
  canvas.addEventListener("webglcontextrestored", () => {
    lost = false;
    showViewer(true);
    resize();
  });
  showViewer(true);
  updateProgress();
  new ResizeObserver(resize).observe(holder);
  resize();
}
