/* ════════════════════════════════════════════════════════════
   РЫЦАРИ И ДОСПЕХИ · script.js
   Three.js: hero-сцена (Англия), модальный просмотр,
   миниатюры карточек, прелоадер с вылетом камеры из тумана
   ════════════════════════════════════════════════════════════ */

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

window.__knightBoot = true; // модуль загрузился — сторож в index.html не нужен

/* ── ДАННЫЕ РЫЦАРЕЙ ─────────────────────────────────────────── */

const KNIGHTS = {
  england: {
    file: 'models/england.glb',
    name: 'John Knight',
    country: 'Англия',
    era: 'XIV–XV вв.',
    tagline: 'Полный пластинчатый доспех, сюрко с геральдическим львом и полуторный меч — сталь Столетней войны.',
    tabs: {
      helmet: 'Армет — закрытый шлем с подвижным забралом и подбородником. Максимальная защита головы, но ограниченный обзор.',
      armor: 'Полный пластинчатый доспех. Поверх — сюрко с геральдическим львом. Под пластинами — кольчуга. Вес 20–25 кг, распределён по телу.',
      weapon: 'Полуторный меч (бастард). Против пластинчатого доспеха использовали удар рукоятью или кинжал-мизерикорд.',
      fact: 'Чёрный доспех Генриха VIII весил 42 кг — но это парадный, для турниров. Боевой был легче и практичнее.'
    }
  },
  germany: {
    file: 'models/germany.glb',
    name: 'Grim Knight',
    country: 'Германия',
    era: 'XV в.',
    tagline: 'Готический доспех с рёбрами жёсткости и двуручный цвайхендер — кузница ландскнехтов.',
    tabs: {
      helmet: 'Салад — немецкий шлем с вытянутым хвостом для защиты шеи. Часто без забрала.',
      armor: 'Готический доспех с рёбрами жёсткости — отклоняют удары, прочнее при меньшем весе. Тёмный цвет — следы кузнечной обработки.',
      weapon: 'Цвайхендер — двуручный меч до 1.8 м. Зазубрина у основания клинка отводила удары врага.',
      fact: 'Ландскнехты получали двойное жалованье (Doppelsöldner) за службу в первых рядах.'
    }
  },
  italy: {
    file: 'models/italy.glb',
    name: 'Penitent Knight',
    country: 'Италия',
    era: 'XV в.',
    tagline: 'Миланская школа: гладкие округлые пластины и барбют с Т-образным вырезом — искусство кондотьеров.',
    tabs: {
      helmet: 'Барбют с Т-образным вырезом для лица. Лучший обзор, чем армет, но хуже защита от стрел.',
      armor: 'Итальянский (миланский) доспех — округлые гладкие формы. Светлое потрёпанное сюрко — символ покаяния или духовного ордена.',
      weapon: 'Меч и кинжал. Итальянская школа фехтования Фиоре деи Либери (1410) — одна из первых задокументированных систем боя.',
      fact: 'Итальянские кондотьеры — профессиональные военачальники, сдававшие себя и армию в аренду. Битвы между ними часто заканчивались почти без жертв: это был бизнес.'
    }
  }
};

const TABS = [
  { id: 'helmet', label: 'Шлем' },
  { id: 'armor',  label: 'Доспех' },
  { id: 'weapon', label: 'Оружие' },
  { id: 'fact',   label: 'Факт' }
];

const STAGE_HEIGHT = 1.8; // все модели нормализуются к этой высоте

/* ── УТИЛИТЫ ────────────────────────────────────────────────── */

const $ = (s) => document.querySelector(s);
const delay = (ms) => new Promise(r => setTimeout(r, ms));
const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);

const tweens = [];
function tween(duration, onUpdate, onComplete) {
  tweens.push({ start: performance.now(), duration, onUpdate, onComplete });
}
function stepTweens(now) {
  for (let i = tweens.length - 1; i >= 0; i--) {
    const tw = tweens[i];
    const k = Math.min(1, (now - tw.start) / tw.duration);
    tw.onUpdate(easeOutCubic(k));
    if (k >= 1) { tweens.splice(i, 1); tw.onComplete && tw.onComplete(); }
  }
}

/* ── THREE: ОБЩИЕ СБОРКИ ────────────────────────────────────── */

function makeRenderer(canvas) {
  const r = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  r.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  r.outputColorSpace = THREE.SRGBColorSpace;
  r.toneMapping = THREE.ACESFilmicToneMapping;
  r.toneMappingExposure = 1.15;
  return r;
}

function dressScene(scene, renderer, fogDensity) {
  scene.fog = new THREE.FogExp2(0x020204, fogDensity);
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), .04).texture;
  pmrem.dispose();

  scene.add(new THREE.HemisphereLight(0x9aa7bf, 0x0c0a08, .55));

  const key = new THREE.DirectionalLight(0xfff1d0, 1.6);
  key.position.set(3, 5, 2.5);
  scene.add(key);

  const rimGold = new THREE.DirectionalLight(0xc9a961, 1.1);
  rimGold.position.set(-3, 2.2, -3.5);
  scene.add(rimGold);

  const rimBlood = new THREE.DirectionalLight(0x9b1b1b, 1.4);
  rimBlood.position.set(-4, 1.2, 2);
  scene.add(rimBlood);

  const fill = new THREE.DirectionalLight(0x6f7f9a, .35);
  fill.position.set(2, 1.5, 4);
  scene.add(fill);
}

function addPedestal(scene) {
  const disc = new THREE.Mesh(
    new THREE.CylinderGeometry(1.5, 1.7, .12, 48),
    new THREE.MeshStandardMaterial({ color: 0x0d0e12, metalness: .75, roughness: .45 })
  );
  disc.position.y = -.06;
  scene.add(disc);

  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(1.52, .012, 12, 96),
    new THREE.MeshStandardMaterial({
      color: 0xc9a961, metalness: 1, roughness: .25,
      emissive: 0xc9a961, emissiveIntensity: .25
    })
  );
  ring.rotation.x = Math.PI / 2;
  ring.position.y = .012;
  scene.add(ring);
}

/* Процедурная заглушка: низкополигональный рыцарь из примитивов.
   Показывается, если GLB не загрузился. */
function createPlaceholderKnight() {
  const g = new THREE.Group();
  const steel = new THREE.MeshStandardMaterial({ color: 0x9aa2ad, metalness: .9, roughness: .35 });
  const darkSteel = new THREE.MeshStandardMaterial({ color: 0x3a3e46, metalness: .85, roughness: .45 });
  const gold = new THREE.MeshStandardMaterial({ color: 0xc9a961, metalness: 1, roughness: .28 });
  const leather = new THREE.MeshStandardMaterial({ color: 0x4a3423, roughness: .9 });

  const M = (geo, mat, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1) => {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z);
    m.rotation.set(rx, ry, rz);
    m.scale.set(sx, sy, sz);
    g.add(m);
    return m;
  };

  // ноги
  M(new THREE.CylinderGeometry(.09, .11, .85, 10), darkSteel, -.17, .425, 0);
  M(new THREE.CylinderGeometry(.09, .11, .85, 10), darkSteel, .17, .425, 0);
  // торс и нагрудник
  M(new THREE.CylinderGeometry(.26, .31, .62, 14), steel, 0, 1.16, 0);
  M(new THREE.SphereGeometry(.30, 18, 14), steel, 0, 1.28, .02, Math.PI * .06, 0, 0, 1, 1.05, .8);
  // наплечники и руки
  M(new THREE.SphereGeometry(.13, 14, 10), steel, -.34, 1.42, 0, 0, 0, -.4);
  M(new THREE.SphereGeometry(.13, 14, 10), steel, .34, 1.42, 0, 0, 0, .4);
  M(new THREE.CylinderGeometry(.06, .075, .6, 10), darkSteel, -.38, 1.1, .02, 0, 0, .12);
  M(new THREE.CylinderGeometry(.06, .075, .6, 10), darkSteel, .38, 1.1, .02, 0, 0, -.12);
  // шлем: купол, смотровая щель, гребень
  M(new THREE.SphereGeometry(.155, 18, 14), steel, 0, 1.68, 0, 0, 0, 0, 1, 1.15, 1.05);
  M(new THREE.BoxGeometry(.2, .05, .06), gold, 0, 1.66, .13);
  M(new THREE.BoxGeometry(.03, .14, .3), gold, 0, 1.83, 0);
  // меч остриём в землю: клинок, гарда, рукоять, навершие
  M(new THREE.BoxGeometry(.045, 1.15, .012), steel, .44, .62, .1, .12, 0, -.08);
  M(new THREE.BoxGeometry(.3, .05, .05), gold, .47, 1.2, .1);
  M(new THREE.CylinderGeometry(.03, .03, .22, 8), leather, .47, 1.34, .1);
  M(new THREE.SphereGeometry(.045, 8, 8), gold, .47, 1.47, .1);

  return g;
}

/* ── ЗАГРУЗКА И НОРМАЛИЗАЦИЯ МОДЕЛЕЙ ────────────────────────── */

const gltfLoader = new GLTFLoader();
const draco = new DRACOLoader();
draco.setDecoderPath('https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/libs/draco/');
gltfLoader.setDRACOLoader(draco);

const modelCache = new Map(); // id -> нормализованная обёртка (Group)

/* Габариты с учётом скиннинга: Box3.setFromObject меряет скинированные
   меши по bind-позе, а реальная поза скелета может отличаться в разы */
function measureBox(root) {
  root.updateMatrixWorld(true);
  const box = new THREE.Box3();
  const tmp = new THREE.Box3();
  root.traverse(o => {
    if (o.isSkinnedMesh) {
      o.frustumCulled = false;
      if (typeof o.computeBoundingBox === 'function') {
        o.computeBoundingBox(); // three r157+: учитывает кости
        box.union(tmp.copy(o.boundingBox).applyMatrix4(o.matrixWorld));
      }
    } else if (o.isMesh && o.geometry) {
      if (!o.geometry.boundingBox) o.geometry.computeBoundingBox();
      box.union(tmp.copy(o.geometry.boundingBox).applyMatrix4(o.matrixWorld));
    }
  });
  if (box.isEmpty()) box.setFromObject(root); // страховка
  return box;
}

function loadGLTF(id) {
  return new Promise((resolve, reject) => {
    gltfLoader.load(KNIGHTS[id].file, gltf => resolve(gltf.scene), undefined, reject);
  });
}

/* Центрируем модель, ставим на пол и приводим к единой высоте */
function normalizeToStage(root) {
  const strip = [];
  root.traverse(o => { if (o.isLight || o.isCamera) strip.push(o); });
  strip.forEach(o => o.parent && o.parent.remove(o));

  const box = measureBox(root);
  const size = box.getSize(new THREE.Vector3());
  root.scale.setScalar(STAGE_HEIGHT / (size.y || 1));

  const scaled = measureBox(root);
  const center = scaled.getCenter(new THREE.Vector3());
  root.position.x -= center.x;
  root.position.z -= center.z;
  root.position.y -= scaled.min.y;

  const wrapper = new THREE.Group();
  wrapper.add(root);
  return wrapper;
}

async function getModel(id) {
  if (modelCache.has(id)) return modelCache.get(id);
  let scene;
  try {
    scene = await loadGLTF(id);
  } catch (e) {
    console.warn(`Модель «${id}» не загрузилась — показываю процедурную заглушку.`, e);
    scene = createPlaceholderKnight();
  }
  const wrapper = normalizeToStage(scene);
  modelCache.set(id, wrapper);
  return wrapper;
}

/* ── HERO-СЦЕНА (рыцарь Англии) ─────────────────────────────── */

const heroCanvas = $('#hero-canvas');
const hero = { visible: true };

try {
  hero.renderer = makeRenderer(heroCanvas);
} catch (e) {
  console.warn('WebGL недоступен.', e);
}

if (hero.renderer) {
  hero.scene = new THREE.Scene();
  hero.camera = new THREE.PerspectiveCamera(38, 1, .1, 60);
  hero.camera.position.set(.2, 2.3, 7.3);

  dressScene(hero.scene, hero.renderer, .22);
  addPedestal(hero.scene);

  hero.controls = new OrbitControls(hero.camera, heroCanvas);
  hero.controls.target.set(0, .95, 0);
  hero.controls.enableDamping = true;
  hero.controls.dampingFactor = .06;
  hero.controls.minDistance = 1.7;
  hero.controls.maxDistance = 7.5;
  hero.controls.maxPolarAngle = Math.PI * .55;
  hero.controls.enablePan = false;
  hero.controls.addEventListener('start', () => {
    hero.controls.autoRotate = false;
    $('#hero-hint').classList.add('seen');
  });
}

function resizeHero() {
  if (!hero.renderer) return;
  const w = heroCanvas.clientWidth || innerWidth;
  const h = heroCanvas.clientHeight || innerHeight;
  hero.renderer.setSize(w, h, false);
  hero.camera.aspect = w / h;
  hero.camera.updateProjectionMatrix();
}

/* Вылет камеры из тьмы к рыцарю + рассеивание тумана */
function heroFlyIn() {
  if (!hero.renderer) return;
  const cam = hero.camera;
  const from = cam.position.clone();
  const to = new THREE.Vector3(.35, 1.45, 3.6);
  const fogFrom = hero.scene.fog.density;
  const fogTo = .075;
  hero.controls.autoRotate = false;
  tween(2300, k => {
    cam.position.lerpVectors(from, to, k);
    hero.scene.fog.density = fogFrom + (fogTo - fogFrom) * k;
  }, () => {
    hero.controls.autoRotate = true;
    $('.hero-overlay').classList.add('visible');
    $('#hero-hint').classList.add('visible');
    $('.scroll-cue').classList.add('visible');
  });
}

new IntersectionObserver(
  entries => { hero.visible = entries[0].isIntersecting; },
  { threshold: .02 }
).observe($('#hero'));

/* ── МОДАЛЬНАЯ СЦЕНА ────────────────────────────────────────── */

const modal = { renderer: null, scene: null, camera: null, controls: null, model: null };
let modalOpen = false;
let modalClosing = false;
let currentKnight = null;

const overlayEl = $('#modal-overlay');
const modalEl = $('#modal');
const loaderEl = $('#modal-loader');

/* Блокировка прокрутки без сброса позиции страницы */
let scrollLockY = 0;
function lockScroll() {
  scrollLockY = window.scrollY;
  document.body.style.top = `-${scrollLockY}px`;
  document.body.classList.add('modal-open');
}
function unlockScroll() {
  document.body.classList.remove('modal-open');
  document.body.style.top = '';
  window.scrollTo(0, scrollLockY);
}

function ensureModalScene() {
  if (modal.renderer) return;
  modal.renderer = makeRenderer($('#modal-canvas'));
  modal.scene = new THREE.Scene();
  modal.camera = new THREE.PerspectiveCamera(38, 1, .1, 60);
  modal.camera.position.set(0, 2.4, 7.9);

  dressScene(modal.scene, modal.renderer, .16);
  addPedestal(modal.scene);

  modal.controls = new OrbitControls(modal.camera, $('#modal-canvas'));
  modal.controls.target.set(0, .95, 0);
  modal.controls.enableDamping = true;
  modal.controls.dampingFactor = .06;
  modal.controls.minDistance = 1.4;
  modal.controls.maxDistance = 8.5;
  modal.controls.maxPolarAngle = Math.PI * .55;
  modal.controls.enablePan = false;
  modal.controls.addEventListener('start', () => {
    modal.controls.autoRotate = false;
  });
}

function resizeModal() {
  if (!modal.renderer) return;
  const c = $('#modal-canvas');
  const w = c.clientWidth;
  const h = c.clientHeight;
  if (!w || !h) return;
  modal.renderer.setSize(w, h, false);
  modal.camera.aspect = w / h;
  modal.camera.updateProjectionMatrix();
}

/* Наезд камеры с дальнего плана (1.5 c) + рассеивание тумана */
function modalFlyIn() {
  const cam = modal.camera;
  const from = cam.position.clone();
  const to = new THREE.Vector3(.55, 1.5, 3.4);
  const fogFrom = modal.scene.fog.density;
  const fogTo = .06;
  loaderEl.classList.add('hidden');
  tween(1500, k => {
    cam.position.lerpVectors(from, to, k);
    modal.scene.fog.density = fogFrom + (fogTo - fogFrom) * k;
  }, () => { modal.controls.autoRotate = true; });
  delay(350).then(() => overlayEl.classList.remove('visible'));
}

async function openModal(id) {
  if (modalOpen || modalClosing) return;
  modalOpen = true;
  currentKnight = id;
  lockScroll();

  const k = KNIGHTS[id];
  $('#modal-name').textContent = k.name;
  $('#modal-era').textContent = `${k.country} · ${k.era}`;
  buildTabs(id);

  overlayEl.classList.add('visible');          // экран уходит в черноту (0.4 с)
  await delay(420);

  modalEl.classList.add('open');
  let sceneOk = true;
  try {
    ensureModalScene();
    resizeModal();
  } catch (e) {
    sceneOk = false;
    console.warn('Не удалось создать 3D-сцену модалки.', e);
    $('#modal-loader-text').textContent = 'WebGL недоступен — тексты рядом';
  }
  $('#modal-close').focus();

  if (modal.model && modal.scene) {
    modal.scene.remove(modal.model);
    modal.model = null;
  }
  if (!sceneOk) return;

  loaderEl.classList.remove('hidden');
  $('#modal-loader-text').textContent = 'Куем изображение…';

  const wrapper = await getModel(id);
  if (!modalOpen || currentKnight !== id) return;

  modal.model = wrapper.clone(true);
  modal.scene.add(modal.model);
  modalFlyIn();
}

async function closeModal() {
  if (!modalOpen || modalClosing) return;
  modalClosing = true;

  overlayEl.classList.add('visible');          // снова чернота (0.4 с)
  await delay(420);

  modalEl.classList.remove('open');
  modalOpen = false;
  unlockScroll();

  if (modal.model && modal.scene) {
    modal.scene.remove(modal.model);
    modal.model = null;
  }
  if (modal.controls) modal.controls.autoRotate = false;

  await delay(120);
  overlayEl.classList.remove('visible');
  modalClosing = false;
}

$('#modal-close').addEventListener('click', closeModal);
window.addEventListener('keydown', e => {
  if (e.key === 'Escape' && modalOpen) closeModal();
});

/* ── ТАБЫ БОКОВОЙ ПАНЕЛИ ────────────────────────────────────── */

const tabsEl = $('#tabs');
const tabTextEl = $('#tab-text');

function setTabText(id, tabId) {
  tabTextEl.classList.remove('slide');
  tabTextEl.innerHTML = `<p>${KNIGHTS[id].tabs[tabId]}</p>`;
  void tabTextEl.offsetWidth; // перезапуск CSS-анимации
  tabTextEl.classList.add('slide');
}

function buildTabs(id) {
  tabsEl.innerHTML = '';
  TABS.forEach((t, i) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'tab' + (i === 0 ? ' active' : '');
    b.textContent = t.label;
    b.dataset.tab = t.id;
    b.addEventListener('click', () => {
      tabsEl.querySelectorAll('.tab').forEach(x => x.classList.toggle('active', x === b));
      setTabText(id, t.id);
    });
    tabsEl.appendChild(b);
  });
  setTabText(id, TABS[0].id);
}

/* ── ГАЛЕРЕЯ ────────────────────────────────────────────────── */

const FALLBACK_SVG = `<svg viewBox="0 0 100 120" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
  <path d="M30 105 V62 a20 20 0 0 1 40 0 V105 H58 V88 H42 V105 Z"
        fill="none" stroke="#c9a961" stroke-width="2.5" stroke-linejoin="round"/>
  <rect x="34" y="58" width="32" height="5" fill="#c9a961" opacity=".7"/>
  <path d="M50 12 l3 8 8 3 -8 3 -3 8 -3 -8 -8 -3 8 -3 Z" fill="#9b1b1b"/>
</svg>`;

function buildCards() {
  const wrap = $('#cards');
  wrap.innerHTML = Object.entries(KNIGHTS).map(([id, k]) => `
    <article class="card" data-id="${id}" tabindex="0" role="button"
             aria-label="Открыть 3D-просмотр: ${k.name}, ${k.country}">
      <div class="card-thumb">
        <img alt="${k.name} — ${k.country}" draggable="false">
        <div class="thumb-fallback">${FALLBACK_SVG}</div>
      </div>
      <div class="card-info">
        <div class="card-country">${k.country} · ${k.era}</div>
        <h3>${k.name}</h3>
        <p>${k.tagline}</p>
        <span class="card-cta">Смотреть в 3D &rarr;</span>
      </div>
    </article>`).join('');

  wrap.querySelectorAll('.card').forEach(card => {
    const open = () => openModal(card.dataset.id);
    card.addEventListener('click', open);
    card.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); }
    });
  });
}

/* ── МИНИАТЮРЫ: рендер реальных моделей в карточки ──────────── */

let thumbRenderer = null, thumbScene, thumbCamera;

function ensureThumbStage() {
  if (thumbRenderer) return;
  thumbRenderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
  thumbRenderer.setSize(480, 600, false);
  thumbRenderer.outputColorSpace = THREE.SRGBColorSpace;
  thumbRenderer.toneMapping = THREE.ACESFilmicToneMapping;
  thumbRenderer.toneMappingExposure = 1.15;

  thumbScene = new THREE.Scene();
  dressScene(thumbScene, thumbRenderer, .02);
  addPedestal(thumbScene);

  thumbCamera = new THREE.PerspectiveCamera(35, 480 / 600, .1, 40);
  thumbCamera.position.set(.3, 1.35, 3.1);
  thumbCamera.lookAt(0, .95, 0);
}

async function makeThumbnails() {
  for (const id of Object.keys(KNIGHTS)) {
    const card = document.querySelector(`.card[data-id="${id}"]`);
    if (!card) continue;
    const img = card.querySelector('img');
    try {
      ensureThumbStage();
      const wrapper = await getModel(id);       // из кэша или файл
      const clone = wrapper.clone(true);
      thumbScene.add(clone);
      thumbRenderer.render(thumbScene, thumbCamera);
      img.src = thumbRenderer.domElement.toDataURL('image/jpeg', .85);
      thumbScene.remove(clone);
      img.classList.add('ready');
      card.querySelector('.thumb-fallback').remove();
    } catch (e) {
      console.warn(`Миниатюра «${id}» не удалась — остаётся SVG-заглушка.`, e);
    }
    await delay(60);
  }
  if (thumbRenderer) { thumbRenderer.dispose(); thumbRenderer = null; }
}

/* ── ГЛАВНЫЙ ЦИКЛ ───────────────────────────────────────────── */

function loop(now) {
  requestAnimationFrame(loop);
  stepTweens(now);

  if (hero.renderer && hero.visible) {
    hero.controls.update();
    hero.renderer.render(hero.scene, hero.camera);
  }
  if (modal.renderer && modalOpen) {
    modal.controls.update();
    modal.renderer.render(modal.scene, modal.camera);
  }
}

/* ── ЗАПУСК ─────────────────────────────────────────────────── */

function flash() {
  const f = $('#flash');
  f.classList.remove('on');
  void f.offsetWidth;
  f.classList.add('on');
}

async function boot() {
  buildCards();
  resizeHero();
  window.addEventListener('resize', () => { resizeHero(); resizeModal(); });
  requestAnimationFrame(loop);

  // модель hero + гарантированные 2.6 с прелоадера (таймаут — на случай «тяжёлого» файла)
  const heroModel = Promise.race([
    getModel('england'),
    delay(15000).then(() => {
      console.warn('Таймаут загрузки england.glb — временная заглушка.');
      return createPlaceholderKnight();
    })
  ]);
  const minPreload = delay(2600);
  const [wrapper] = await Promise.all([heroModel, minPreload]);

  if (hero.renderer) {
    hero.scene.add(wrapper);
    flash();
    $('#preloader').classList.add('done');
    heroFlyIn();
    setTimeout(() => $('#preloader').remove(), 1100);
  } else {
    flash();
    $('#preloader').classList.add('done');
    $('.hero-overlay').classList.add('visible');
    const h = $('#hero-hint');
    h.textContent = 'WebGL недоступен — 3D-режим отключён';
    h.classList.add('visible');
    setTimeout(() => $('#preloader').remove(), 1100);
  }

  // миниатюры карточек — после того как hero отыграл вылет
  setTimeout(() => { makeThumbnails().catch(console.warn); }, 900);
}

boot();
