// app.js — Leonida Grid UI wiring: state, photo intake, panel editing,
// exports and the ?shot= capture modes used to make the screenshots.

import { DEMO_SCENES } from './scenes.js';
import { GRADES, LAYOUTS, drawPostcard, panelRects, coverMetrics } from './postcard.js';

const PREVIEW_W = 1200;
const PREVIEW_H = 900;

/** A fresh demo state: the four painted scenes fill the grid. */
function demoState() {
  return {
    panels: DEMO_SCENES.map((s) => ({ kind: 'scene', sceneId: s.id, ox: 0, oy: 0, zoom: 1 })),
    layout: 'hero-left',
    grade: 'gold',
    treatment: 'classic',
    title: 'LEONIDA GRID',
    subtitle: 'Greetings from the Leonida Keys',
    popOut: false,
    selected: 0,
  };
}

let state = demoState();
let uploadCursor = 0;

const stage = document.getElementById('stage');
const stageCtx = stage.getContext('2d');

function render() {
  drawPostcard(stageCtx, PREVIEW_W, PREVIEW_H, state, { preview: true });
  syncControls();
}

/** Load an image from a URL and wait for it to be usable. */
function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

/** Put a loaded image into the grid: replace panels one by one, then append. */
function placePhoto(img) {
  const panel = { kind: 'photo', img, ox: 0, oy: 0, zoom: 1 };
  if (uploadCursor < state.panels.length) {
    state.panels[uploadCursor] = panel;
    state.selected = uploadCursor;
  } else if (state.panels.length < 6) {
    state.panels.push(panel);
    state.selected = state.panels.length - 1;
  } else {
    state.panels[0] = panel;
    state.selected = 0;
    uploadCursor = 0;
  }
  uploadCursor++;
  render();
}

async function addPhotoFiles(files) {
  for (const file of files) {
    if (!file.type.startsWith('image/')) continue;
    if (state.panels.length >= 6 && uploadCursor >= 6) uploadCursor = 0;
    const url = URL.createObjectURL(file);
    try {
      placePhoto(await loadImage(url));
    } catch {
      /* a file that cannot be decoded is skipped */
    }
  }
}

async function addSamplePhoto(name) {
  try {
    placePhoto(await loadImage(`samples/${name}`));
  } catch {
    /* sample missing: nothing to place */
  }
}

// ---------------------------------------------------------------- controls

const layoutBar = document.getElementById('layout-bar');
const gradeBar = document.getElementById('grade-bar');
const treatmentBar = document.getElementById('treatment-bar');

for (const layout of LAYOUTS) {
  const b = document.createElement('button');
  b.type = 'button';
  b.textContent = layout.name;
  b.dataset.layout = layout.id;
  b.addEventListener('click', () => {
    state.layout = layout.id;
    render();
  });
  layoutBar.appendChild(b);
}
for (const grade of GRADES) {
  const b = document.createElement('button');
  b.type = 'button';
  b.textContent = grade.name;
  b.dataset.grade = grade.id;
  b.addEventListener('click', () => {
    state.grade = grade.id;
    render();
  });
  gradeBar.appendChild(b);
}
for (const [id, name] of [['classic', 'Classic'], ['neon', 'Neon'], ['newsprint', 'Newsprint']]) {
  const b = document.createElement('button');
  b.type = 'button';
  b.textContent = name;
  b.dataset.treatment = id;
  b.addEventListener('click', () => {
    state.treatment = id;
    render();
  });
  treatmentBar.appendChild(b);
}

function markActive(bar, attr, value) {
  for (const b of bar.querySelectorAll('button')) {
    b.classList.toggle('active', b.dataset[attr] === value);
  }
}

const zoomSlider = document.getElementById('zoom');
const popToggle = document.getElementById('popout');
const titleInput = document.getElementById('title-input');
const subtitleInput = document.getElementById('subtitle-input');

function syncControls() {
  markActive(layoutBar, 'layout', state.layout);
  markActive(gradeBar, 'grade', state.grade);
  markActive(treatmentBar, 'treatment', state.treatment);
  popToggle.checked = state.popOut;
  const panel = state.panels[state.selected];
  zoomSlider.value = panel ? String(panel.zoom || 1) : '1';
  if (document.activeElement !== titleInput) titleInput.value = state.title;
  if (document.activeElement !== subtitleInput) subtitleInput.value = state.subtitle;
}

zoomSlider.addEventListener('input', () => {
  const panel = state.panels[state.selected];
  if (!panel) return;
  panel.zoom = Number(zoomSlider.value);
  render();
});
popToggle.addEventListener('change', () => {
  state.popOut = popToggle.checked;
  render();
});
titleInput.addEventListener('input', () => {
  state.title = titleInput.value;
  render();
});
subtitleInput.addEventListener('input', () => {
  state.subtitle = subtitleInput.value;
  render();
});

document.getElementById('photo-input').addEventListener('change', (event) => {
  addPhotoFiles([...event.target.files]);
  event.target.value = '';
});
document.getElementById('sample-pier').addEventListener('click', () => addSamplePhoto('pier.jpg'));
document.getElementById('sample-boulevard').addEventListener('click', () => addSamplePhoto('boulevard.jpg'));
document.getElementById('reset-demo').addEventListener('click', () => {
  state = demoState();
  uploadCursor = 0;
  render();
});

// Drag and drop onto the stage.
const stageWrap = document.getElementById('stage-wrap');
stageWrap.addEventListener('dragover', (event) => {
  event.preventDefault();
  stageWrap.classList.add('dragging');
});
stageWrap.addEventListener('dragleave', () => stageWrap.classList.remove('dragging'));
stageWrap.addEventListener('drop', (event) => {
  event.preventDefault();
  stageWrap.classList.remove('dragging');
  addPhotoFiles([...event.dataTransfer.files]);
});

// Click to select a panel; drag inside it to reposition its photo.
let drag = null;
function stagePoint(event) {
  const box = stage.getBoundingClientRect();
  return {
    x: ((event.clientX - box.left) / box.width) * PREVIEW_W,
    y: ((event.clientY - box.top) / box.height) * PREVIEW_H,
  };
}
stage.addEventListener('pointerdown', (event) => {
  const p = stagePoint(event);
  const rects = panelRects(state, PREVIEW_W, PREVIEW_H);
  const idx = rects.findIndex((r) => p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h);
  if (idx < 0) return;
  state.selected = idx;
  drag = { idx, lastX: p.x, lastY: p.y, moved: false };
  stage.setPointerCapture(event.pointerId);
  render();
});
stage.addEventListener('pointermove', (event) => {
  if (!drag) return;
  const p = stagePoint(event);
  const panel = state.panels[drag.idx];
  const rect = panelRects(state, PREVIEW_W, PREVIEW_H)[drag.idx];
  if (panel && panel.kind === 'photo' && rect) {
    const { dw, dh } = coverMetrics(panel, panel.img.naturalWidth, panel.img.naturalHeight, rect.w, rect.h);
    const rangeX = Math.max(1, (dw - rect.w) / 2);
    const rangeY = Math.max(1, (dh - rect.h) / 2);
    panel.ox = Math.max(-1, Math.min(1, (panel.ox || 0) + (p.x - drag.lastX) / rangeX));
    panel.oy = Math.max(-1, Math.min(1, (panel.oy || 0) + (p.y - drag.lastY) / rangeY));
    drag.moved = true;
    render();
  }
  drag.lastX = p.x;
  drag.lastY = p.y;
});
stage.addEventListener('pointerup', () => {
  drag = null;
});

// ---------------------------------------------------------------- exports

async function exportPng(w, h) {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  drawPostcard(canvas.getContext('2d'), w, h, { ...state, selected: null });
  const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `leonida-grid-${w}x${h}.png`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
}
for (const b of document.querySelectorAll('[data-export]')) {
  b.addEventListener('click', () => {
    const [w, h] = b.dataset.export.split('x').map(Number);
    exportPng(w, h);
  });
}

// ---------------------------------------------------------------- boot + shots

/** Register the two display fonts and wait until they can draw. */
async function loadFonts() {
  const anton = new FontFace('Anton', "url('fonts/Anton-Regular.ttf')");
  const pacifico = new FontFace('Pacifico', "url('fonts/Pacifico-Regular.ttf')");
  document.fonts.add(anton);
  document.fonts.add(pacifico);
  await Promise.all([anton.load(), pacifico.load()]);
}

/** Panels for a capture: both sample photos plus painted scenes. */
async function shotPanels() {
  const pier = await loadImage('samples/pier.jpg');
  const boulevard = await loadImage('samples/boulevard.jpg');
  return [
    { kind: 'photo', img: pier, ox: 0, oy: 0, zoom: 1 },
    { kind: 'scene', sceneId: 'sunset-bay', ox: 0, oy: 0, zoom: 1 },
    { kind: 'photo', img: boulevard, ox: 0, oy: 0, zoom: 1 },
    { kind: 'scene', sceneId: 'neon-harbor', ox: 0, oy: 0, zoom: 1 },
    { kind: 'scene', sceneId: 'palm-strip', ox: 0, oy: 0, zoom: 1 },
    { kind: 'scene', sceneId: 'causeway-dusk', ox: 0, oy: 0, zoom: 1 },
  ];
}

async function boot() {
  await loadFonts();
  const params = new URLSearchParams(location.search);
  const shot = params.get('shot');
  if (shot === 'export') {
    // A bare full-viewport canvas holding one export render, for capture.
    const w = Number(params.get('w')) || 1080;
    const h = Number(params.get('h')) || 1080;
    state = {
      ...demoState(),
      panels: await shotPanels(),
      layout: params.get('layout') || 'hero-left',
      grade: params.get('grade') || 'gold',
      treatment: params.get('treatment') || 'classic',
      popOut: params.get('pop') === '1',
      selected: null,
    };
    document.body.classList.add('shot-export');
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    canvas.id = 'shot-canvas';
    document.body.appendChild(canvas);
    drawPostcard(canvas.getContext('2d'), w, h, state);
  } else if (shot === 'editor') {
    state = {
      ...demoState(),
      panels: await shotPanels(),
      layout: 'six-up',
      grade: 'platinum',
      treatment: 'classic',
      popOut: false,
      selected: 0,
    };
    render();
  } else {
    render();
  }
  window.__shotReady = true;
}

boot();
