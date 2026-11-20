// postcard.js — grades, grid layouts and the postcard renderer.
// One drawing routine renders the preview and every export size, so what
// you see is exactly what downloads: paper, perforation, photo grid,
// postage stamp, postmark, caption bar and grade frame.

import { sceneById } from './scenes.js';

/** The five postcard grades: frame tint, stamp accent and flavour line. */
export const GRADES = [
  { id: 'bronze', name: 'Bronze', tint: '#b0793f', deep: '#7c4f22', icon: 'star', caption: 'Third-class postage, first-class memories.' },
  { id: 'silver', name: 'Silver', tint: '#9aa7b1', deep: '#5d6b76', icon: 'palm', caption: 'Silver service on the Leonida line.' },
  { id: 'gold', name: 'Gold', tint: '#d9a41c', deep: '#8a5f06', icon: 'sun', caption: 'Golden hour, every hour.' },
  { id: 'platinum', name: 'Platinum', tint: '#8fd0bd', deep: '#35705e', icon: 'gem', caption: 'Platinum desk — handle with white gloves.' },
  { id: 'legend', name: 'Leonida Legend', tint: '#c64fd6', deep: '#5e2a86', icon: 'crown', caption: 'The postmark everyone wants.' },
];

/** Look up a grade by id. */
export function gradeById(id) {
  return GRADES.find((g) => g.id === id) ?? GRADES[2];
}

/** Even grid cells, row-major; the last row stretches to fill its width. */
function gridCells(cols, n) {
  if (n <= 1) return [{ x: 0, y: 0, w: 1, h: 1 }];
  const rows = Math.ceil(n / cols);
  const rects = [];
  for (let r = 0; r < rows; r++) {
    const inRow = Math.min(cols, n - r * cols);
    for (let c = 0; c < inRow; c++) {
      rects.push({ x: c / inRow, y: r / rows, w: 1 / inRow, h: 1 / rows });
    }
  }
  return rects;
}

/** The six layouts. rects(n) gives panel rectangles as fractions of the picture area; slot 0 is the hero. */
export const LAYOUTS = [
  {
    id: 'hero-left',
    name: 'Hero Left',
    rects(n) {
      if (n <= 1) return [{ x: 0, y: 0, w: 1, h: 1 }];
      const out = [{ x: 0, y: 0, w: 0.62, h: 1 }];
      const rest = n - 1;
      for (let i = 0; i < rest; i++) out.push({ x: 0.62, y: i / rest, w: 0.38, h: 1 / rest });
      return out;
    },
  },
  {
    id: 'hero-top',
    name: 'Hero Top',
    rects(n) {
      if (n <= 1) return [{ x: 0, y: 0, w: 1, h: 1 }];
      const out = [{ x: 0, y: 0, w: 1, h: 0.6 }];
      const rest = n - 1;
      for (let i = 0; i < rest; i++) out.push({ x: i / rest, y: 0.6, w: 1 / rest, h: 0.4 });
      return out;
    },
  },
  {
    id: 'twin-strip',
    name: 'Twin Strip',
    rects(n) {
      if (n <= 1) return [{ x: 0, y: 0, w: 1, h: 1 }];
      const leftCount = Math.ceil(n / 2);
      const rightCount = n - leftCount;
      const out = [];
      for (let i = 0; i < leftCount; i++) out.push({ x: 0, y: i / leftCount, w: 0.5, h: 1 / leftCount });
      for (let i = 0; i < rightCount; i++) out.push({ x: 0.5, y: i / rightCount, w: 0.5, h: 1 / rightCount });
      return out;
    },
  },
  {
    id: 'quad',
    name: 'Quad',
    rects(n) {
      return gridCells(n <= 4 ? 2 : 3, n);
    },
  },
  {
    id: 'six-up',
    name: 'Six-Up',
    rects(n) {
      return gridCells(3, n);
    },
  },
  {
    id: 'classic-cover',
    name: 'Classic Cover',
    rects(n) {
      const out = [{ x: 0, y: 0, w: 1, h: 1 }];
      const rest = Math.min(n - 1, 5);
      for (let i = 0; i < rest; i++) {
        out.push({ x: 0.97 - (rest - i) * 0.185, y: 0.72, w: 0.165, h: 0.25, inset: true });
      }
      return out;
    },
  },
];

/** Look up a layout by id. */
export function layoutById(id) {
  return LAYOUTS.find((l) => l.id === id) ?? LAYOUTS[0];
}

/**
 * The postcard's fixed geometry for a canvas of W x H: the paper rect, the
 * perforation strip, the picture area and the caption bar. The UI uses the
 * same numbers for hit-testing, so clicks always land on the drawn panels.
 */
export function postcardGeometry(W, H) {
  const band = Math.min(W, H) * 0.02;
  const paper = { x: band, y: band, w: W - band * 2, h: H - band * 2 };
  const perfW = W * 0.035;
  const innerX = paper.x + perfW + W * 0.018;
  const innerW = paper.x + paper.w - W * 0.03 - innerX;
  const captionH = H * 0.185;
  const picture = { x: innerX, y: paper.y + H * 0.028, w: innerW, h: paper.h - H * 0.056 - captionH };
  const caption = { x: innerX, y: picture.y + picture.h + H * 0.018, w: innerW, h: captionH - H * 0.018 };
  return { band, paper, perfW, picture, caption };
}

/** Panel rectangles in canvas pixels for a state, via its layout. */
export function panelRects(state, W, H) {
  const geo = postcardGeometry(W, H);
  const layout = layoutById(state.layout);
  return layout.rects(state.panels.length).map((r) => ({
    x: geo.picture.x + r.x * geo.picture.w,
    y: geo.picture.y + r.y * geo.picture.h,
    w: r.w * geo.picture.w,
    h: r.h * geo.picture.h,
    inset: !!r.inset,
  }));
}

/** Cover-fit draw metrics for an image of (iw, ih) inside a (w, h) panel. */
export function coverMetrics(panel, iw, ih, w, h) {
  const scale = Math.max(w / iw, h / ih) * (panel.zoom || 1);
  return { dw: iw * scale, dh: ih * scale };
}

/** Draw one panel's content into rect (x, y, w, h), honouring pan and zoom. */
function drawPanelContent(ctx, panel, x, y, w, h) {
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  ctx.translate(x, y);
  if (panel.kind === 'scene') {
    sceneById(panel.sceneId).paint(ctx, w, h);
  } else if (panel.img) {
    const { dw, dh } = coverMetrics(panel, panel.img.naturalWidth, panel.img.naturalHeight, w, h);
    const maxOx = Math.max(0, (dw - w) / 2);
    const maxOy = Math.max(0, (dh - h) / 2);
    const dx = (w - dw) / 2 + (panel.ox || 0) * maxOx;
    const dy = (h - dh) / 2 + (panel.oy || 0) * maxOy;
    ctx.drawImage(panel.img, dx, dy, dw, dh);
  } else {
    ctx.fillStyle = '#ddd3b8';
    ctx.fillRect(0, 0, w, h);
  }
  ctx.restore();
}

/** The small grade emblem drawn inside the stamp: star, palm, sun, gem or crown. */
function drawGradeIcon(ctx, icon, cx, cy, r, colour) {
  ctx.fillStyle = colour;
  ctx.strokeStyle = colour;
  if (icon === 'star') {
    ctx.beginPath();
    for (let i = 0; i < 10; i++) {
      const a = -Math.PI / 2 + (i * Math.PI) / 5;
      const rad = i % 2 === 0 ? r : r * 0.45;
      const px = cx + Math.cos(a) * rad;
      const py = cy + Math.sin(a) * rad;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
  } else if (icon === 'sun') {
    ctx.beginPath();
    ctx.arc(cx, cy, r * 0.55, 0, Math.PI * 2);
    ctx.fill();
    ctx.lineWidth = r * 0.16;
    ctx.lineCap = 'round';
    for (let i = 0; i < 8; i++) {
      const a = (i * Math.PI) / 4;
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(a) * r * 0.72, cy + Math.sin(a) * r * 0.72);
      ctx.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
      ctx.stroke();
    }
  } else if (icon === 'palm') {
    ctx.lineWidth = r * 0.18;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(cx - r * 0.2, cy + r);
    ctx.quadraticCurveTo(cx - r * 0.05, cy, cx + r * 0.25, cy - r * 0.55);
    ctx.stroke();
    ctx.lineWidth = r * 0.12;
    for (let i = 0; i < 5; i++) {
      const a = Math.PI * (0.1 + (i / 4) * 0.8);
      ctx.beginPath();
      ctx.moveTo(cx + r * 0.25, cy - r * 0.55);
      ctx.quadraticCurveTo(
        cx + r * 0.25 + Math.cos(a) * r * 0.5,
        cy - r * 0.55 - Math.sin(a) * r * 0.45,
        cx + r * 0.25 + Math.cos(a) * r * 0.8,
        cy - r * 0.55 - Math.sin(a) * r * 0.15 + r * 0.2,
      );
      ctx.stroke();
    }
  } else if (icon === 'gem') {
    ctx.beginPath();
    ctx.moveTo(cx - r, cy - r * 0.3);
    ctx.lineTo(cx - r * 0.45, cy - r * 0.85);
    ctx.lineTo(cx + r * 0.45, cy - r * 0.85);
    ctx.lineTo(cx + r, cy - r * 0.3);
    ctx.lineTo(cx, cy + r);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.65)';
    ctx.lineWidth = r * 0.08;
    ctx.beginPath();
    ctx.moveTo(cx - r, cy - r * 0.3);
    ctx.lineTo(cx + r, cy - r * 0.3);
    ctx.moveTo(cx - r * 0.45, cy - r * 0.85);
    ctx.lineTo(cx, cy + r);
    ctx.moveTo(cx + r * 0.45, cy - r * 0.85);
    ctx.lineTo(cx, cy + r);
    ctx.stroke();
  } else {
    // crown
    ctx.beginPath();
    ctx.moveTo(cx - r, cy + r * 0.7);
    ctx.lineTo(cx - r, cy - r * 0.4);
    ctx.lineTo(cx - r * 0.5, cy + r * 0.05);
    ctx.lineTo(cx, cy - r * 0.75);
    ctx.lineTo(cx + r * 0.5, cy + r * 0.05);
    ctx.lineTo(cx + r, cy - r * 0.4);
    ctx.lineTo(cx + r, cy + r * 0.7);
    ctx.closePath();
    ctx.fill();
    ctx.fillRect(cx - r, cy + r * 0.82, r * 2, r * 0.18);
  }
}

/** The corner postage stamp: perforated edge, grade emblem, grade name. */
function drawStamp(ctx, geo, grade, unit) {
  const sw = geo.picture.w * 0.155;
  const sh = sw * 1.16;
  const cx = geo.picture.x + geo.picture.w - sw * 0.52;
  const cy = geo.picture.y + sh * 0.52;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(-0.055);
  // Perforated edge: white body, then paper-coloured notches punched round it.
  ctx.fillStyle = '#fffdf4';
  ctx.fillRect(-sw / 2, -sh / 2, sw, sh);
  ctx.fillStyle = '#f3e9cd';
  const notch = unit * 0.55;
  for (let x = -sw / 2; x <= sw / 2; x += notch * 1.55) {
    ctx.beginPath();
    ctx.arc(x, -sh / 2, notch / 2, 0, Math.PI * 2);
    ctx.arc(x, sh / 2, notch / 2, 0, Math.PI * 2);
    ctx.fill();
  }
  for (let y = -sh / 2; y <= sh / 2; y += notch * 1.55) {
    ctx.beginPath();
    ctx.arc(-sw / 2, y, notch / 2, 0, Math.PI * 2);
    ctx.arc(sw / 2, y, notch / 2, 0, Math.PI * 2);
    ctx.fill();
  }
  // Inner tinted field and emblem.
  ctx.fillStyle = grade.tint;
  ctx.fillRect(-sw * 0.4, -sh * 0.4, sw * 0.8, sh * 0.62);
  drawGradeIcon(ctx, grade.icon, 0, -sh * 0.09, sw * 0.2, '#fffdf4');
  ctx.fillStyle = grade.deep;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `700 ${sw * 0.115}px system-ui, sans-serif`;
  ctx.fillText('LEONIDA', 0, sh * 0.31);
  ctx.font = `700 ${sw * 0.1}px system-ui, sans-serif`;
  const label = grade.id === 'legend' ? 'LEGEND' : grade.name.toUpperCase();
  ctx.fillText(label, 0, sh * 0.425);
  ctx.restore();
  return { cx, cy, sw, sh };
}

/** Text along an arc, centred at angle -90 degrees. */
function arcText(ctx, text, cx, cy, r, size, colour) {
  ctx.save();
  ctx.fillStyle = colour;
  ctx.font = `700 ${size}px system-ui, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const total = text.length * size * 0.62;
  let a = -Math.PI / 2 - total / r / 2;
  for (const ch of text) {
    const step = (size * 0.62) / r;
    ctx.save();
    ctx.translate(cx + Math.cos(a + step / 2) * r, cy + Math.sin(a + step / 2) * r);
    ctx.rotate(a + step / 2 + Math.PI / 2);
    ctx.fillText(ch, 0, 0);
    ctx.restore();
    a += step;
  }
  ctx.restore();
}

/** The circular postmark and its wavy cancellation lines over the stamp. */
function drawPostmark(ctx, stamp, unit) {
  const r = stamp.sw * 0.52;
  const cx = stamp.cx - stamp.sw * 0.42;
  const cy = stamp.cy - stamp.sh * 0.3;
  const ink = 'rgba(38,34,54,0.78)';
  // Wavy cancellation lines running right, across the stamp's top corner.
  ctx.strokeStyle = ink;
  ctx.lineWidth = unit * 0.32;
  ctx.lineCap = 'round';
  for (let k = 0; k < 3; k++) {
    const yBase = cy - r * 0.45 + k * r * 0.42;
    ctx.beginPath();
    for (let x = 0; x <= stamp.sw * 1.5; x += 4) {
      const y = yBase + Math.sin(x / (unit * 2.6)) * unit * 0.55;
      if (x === 0) ctx.moveTo(cx + x, y);
      else ctx.lineTo(cx + x, y);
    }
    ctx.stroke();
  }
  // The round postmark itself.
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.strokeStyle = ink;
  ctx.lineWidth = unit * 0.4;
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(cx, cy, r * 0.78, 0, Math.PI * 2);
  ctx.lineWidth = unit * 0.18;
  ctx.stroke();
  arcText(ctx, 'LEONIDA POST', cx, cy, r * 0.88, r * 0.21, ink);
  ctx.fillStyle = ink;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `${r * 0.3}px Anton, sans-serif`;
  ctx.fillText('MAY 26', cx, cy - r * 0.05);
  ctx.fillText('2026', cx, cy + r * 0.28);
}

/** Fit a title into a width by shrinking the font, Anton-style. */
function fitFont(ctx, text, weight, family, startSize, maxWidth) {
  let size = startSize;
  ctx.font = `${weight} ${size}px ${family}`;
  while (size > 10 && ctx.measureText(text).width > maxWidth) {
    size *= 0.94;
    ctx.font = `${weight} ${size}px ${family}`;
  }
  return size;
}

/** Shrink a one-line font (built by fontAt(size)) until text fits maxWidth. */
function fitLine(ctx, text, fontAt, startSize, maxWidth) {
  let size = startSize;
  ctx.font = fontAt(size);
  while (size > 8 && ctx.measureText(text).width > maxWidth) {
    size *= 0.93;
    ctx.font = fontAt(size);
  }
  return size;
}

/** Width left for the subtitle once the right-aligned flavour line is placed. */
function subtitleRoom(ctx, caption, grade, flavourSize, unit) {
  ctx.font = `italic ${flavourSize}px Georgia, serif`;
  return caption.w - ctx.measureText(grade.caption).width - unit * 3;
}

/** The caption bar: cover title, subtitle and the grade's flavour line. */
function drawCaption(ctx, geo, state, grade, unit) {
  const { caption } = geo;
  const title = (state.title || 'LEONIDA GRID').toUpperCase();
  const subtitle = state.subtitle || '';
  ctx.save();
  if (state.treatment === 'neon') {
    ctx.fillStyle = '#0d1030';
    ctx.fillRect(caption.x - unit, caption.y - unit * 0.6, caption.w + unit * 2, caption.h + unit * 1.2);
    ctx.save();
    ctx.shadowColor = '#ff2e88';
    ctx.shadowBlur = unit * 2.2;
    ctx.fillStyle = '#ffd7ef';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    fitFont(ctx, title, '', 'Pacifico, cursive', caption.h * 0.52, caption.w * 0.98);
    ctx.fillText(title, caption.x, caption.y + caption.h * 0.52);
    ctx.restore();
    ctx.fillStyle = '#7deefc';
    ctx.textAlign = 'left';
    fitLine(ctx, subtitle, (s) => `600 ${s}px system-ui, sans-serif`, caption.h * 0.16, subtitleRoom(ctx, caption, grade, caption.h * 0.14, unit));
    ctx.fillText(subtitle, caption.x, caption.y + caption.h * 0.82);
    ctx.fillStyle = '#ffd7ef';
    ctx.textAlign = 'right';
    ctx.font = `italic ${caption.h * 0.14}px Georgia, serif`;
    ctx.fillText(grade.caption, caption.x + caption.w, caption.y + caption.h * 0.82);
  } else if (state.treatment === 'newsprint') {
    ctx.strokeStyle = '#221d16';
    ctx.lineWidth = unit * 0.35;
    ctx.beginPath();
    ctx.moveTo(caption.x, caption.y - unit * 0.4);
    ctx.lineTo(caption.x + caption.w, caption.y - unit * 0.4);
    ctx.stroke();
    ctx.lineWidth = unit * 0.14;
    ctx.beginPath();
    ctx.moveTo(caption.x, caption.y + unit * 0.15);
    ctx.lineTo(caption.x + caption.w, caption.y + unit * 0.15);
    ctx.stroke();
    ctx.fillStyle = '#221d16';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    const size = fitFont(ctx, title, '', 'Anton, sans-serif', caption.h * 0.56, caption.w * 0.98);
    try {
      ctx.letterSpacing = `${size * 0.04}px`;
    } catch {
      /* letterSpacing is a progressive enhancement */
    }
    ctx.fillText(title, caption.x, caption.y + caption.h * 0.6);
    try {
      ctx.letterSpacing = '0px';
    } catch {
      /* ignore */
    }
    fitLine(ctx, subtitle, (s) => `italic ${s}px Georgia, serif`, caption.h * 0.17, subtitleRoom(ctx, caption, grade, caption.h * 0.14, unit));
    ctx.fillText(subtitle, caption.x, caption.y + caption.h * 0.9);
    ctx.textAlign = 'right';
    ctx.font = `italic ${caption.h * 0.14}px Georgia, serif`;
    ctx.fillText(grade.caption, caption.x + caption.w, caption.y + caption.h * 0.9);
  } else {
    // Classic: big condensed type, ink outline, cream ground.
    ctx.fillStyle = '#221d16';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    const size = fitFont(ctx, title, '', 'Anton, sans-serif', caption.h * 0.62, caption.w * 0.98);
    try {
      ctx.letterSpacing = `${size * 0.05}px`;
    } catch {
      /* letterSpacing is a progressive enhancement */
    }
    ctx.lineWidth = size * 0.02;
    ctx.strokeStyle = '#221d16';
    ctx.fillText(title, caption.x, caption.y + caption.h * 0.58);
    try {
      ctx.letterSpacing = '0px';
    } catch {
      /* ignore */
    }
    ctx.fillStyle = '#5a4a2f';
    fitLine(ctx, subtitle.toUpperCase(), (s) => `600 ${s}px system-ui, sans-serif`, caption.h * 0.155, subtitleRoom(ctx, caption, grade, caption.h * 0.145, unit));
    ctx.fillText(subtitle.toUpperCase(), caption.x, caption.y + caption.h * 0.88);
    ctx.fillStyle = grade.deep;
    ctx.textAlign = 'right';
    ctx.font = `italic ${caption.h * 0.145}px Georgia, serif`;
    ctx.fillText(grade.caption, caption.x + caption.w, caption.y + caption.h * 0.88);
  }
  ctx.restore();
}

/**
 * Render the whole postcard onto ctx at W x H.
 * opts.preview draws the selection outline (never part of an export).
 */
export function drawPostcard(ctx, W, H, state, opts = {}) {
  const grade = gradeById(state.grade);
  const geo = postcardGeometry(W, H);
  const unit = Math.min(W, H) / 100;
  const gutter = Math.max(3, W * 0.006);

  // Grade-tinted outer frame, then the paper.
  ctx.fillStyle = grade.tint;
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = '#f3e9cd';
  ctx.fillRect(geo.paper.x, geo.paper.y, geo.paper.w, geo.paper.h);
  // A whisper of paper shading along the bottom edge.
  ctx.fillStyle = 'rgba(120,90,30,0.10)';
  ctx.fillRect(geo.paper.x, geo.paper.y + geo.paper.h - unit * 0.7, geo.paper.w, unit * 0.7);

  // Perforated left edge: dashed tear line with punched holes.
  const perfX = geo.paper.x + geo.perfW / 2;
  ctx.strokeStyle = 'rgba(90,74,47,0.55)';
  ctx.lineWidth = unit * 0.16;
  ctx.setLineDash([unit * 0.8, unit * 0.7]);
  ctx.beginPath();
  ctx.moveTo(perfX, geo.paper.y + unit);
  ctx.lineTo(perfX, geo.paper.y + geo.paper.h - unit);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle = grade.tint;
  for (let y = geo.paper.y + unit * 1.4; y < geo.paper.y + geo.paper.h - unit; y += unit * 2.1) {
    ctx.beginPath();
    ctx.arc(perfX, y, unit * 0.52, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.save();
  ctx.translate(perfX, geo.paper.y + geo.paper.h / 2);
  ctx.rotate(-Math.PI / 2);
  ctx.fillStyle = 'rgba(90,74,47,0.65)';
  ctx.font = `700 ${unit * 1.05}px system-ui, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('LEONIDA GRID POSTCARD CO.', 0, 0);
  ctx.restore();

  // Picture area: cream gutters first, then each panel with its ink border.
  const pic = geo.picture;
  ctx.fillStyle = '#efe3c2';
  ctx.fillRect(pic.x, pic.y, pic.w, pic.h);
  const rects = panelRects(state, W, H);
  state.panels.forEach((panel, i) => {
    const r = rects[i];
    if (!r) return;
    const inset = r.inset ? 0 : gutter;
    drawPanelContent(ctx, panel, r.x + inset, r.y + inset, r.w - inset * 2, r.h - inset * 2);
  });
  // Ink borders round every panel; insets get a cream keyline instead.
  ctx.strokeStyle = '#221d16';
  rects.forEach((r, i) => {
    if (i >= state.panels.length) return;
    if (r.inset) {
      ctx.lineWidth = unit * 0.5;
      ctx.strokeStyle = '#fffdf4';
      ctx.strokeRect(r.x, r.y, r.w, r.h);
      ctx.lineWidth = unit * 0.16;
      ctx.strokeStyle = '#221d16';
      ctx.strokeRect(r.x, r.y, r.w, r.h);
    } else {
      ctx.lineWidth = unit * 0.28;
      ctx.strokeStyle = '#221d16';
      ctx.strokeRect(r.x + gutter, r.y + gutter, r.w - gutter * 2, r.h - gutter * 2);
    }
  });
  // Picture frame.
  ctx.lineWidth = unit * 0.55;
  ctx.strokeStyle = grade.deep;
  ctx.strokeRect(pic.x, pic.y, pic.w, pic.h);
  ctx.lineWidth = unit * 0.2;
  ctx.strokeStyle = '#221d16';
  ctx.strokeRect(pic.x - unit * 0.45, pic.y - unit * 0.45, pic.w + unit * 0.9, pic.h + unit * 0.9);

  // Pop-out hero: the hero image breaks its frame with a drop shadow.
  if (state.popOut && state.panels.length > 0 && rects[0]) {
    const r = rects[0];
    const hero = state.panels[0];
    const cx = r.x + r.w / 2;
    const cy = r.y + r.h / 2;
    const pw = r.w * 1.13;
    const ph = r.h * 1.13;
    ctx.save();
    ctx.shadowColor = 'rgba(20,12,4,0.5)';
    ctx.shadowBlur = unit * 3.2;
    ctx.shadowOffsetY = unit * 1.6;
    ctx.fillStyle = '#fffdf4';
    ctx.fillRect(cx - pw / 2 - unit * 0.8, cy - ph / 2 - unit * 0.8, pw + unit * 1.6, ph + unit * 1.6);
    ctx.restore();
    drawPanelContent(ctx, hero, cx - pw / 2, cy - ph / 2, pw, ph);
    ctx.lineWidth = unit * 0.22;
    ctx.strokeStyle = '#221d16';
    ctx.strokeRect(cx - pw / 2, cy - ph / 2, pw, ph);
  }

  // Stamp and postmark sit above the picture's top-right corner.
  const stamp = drawStamp(ctx, geo, grade, unit);
  drawPostmark(ctx, stamp, unit);

  drawCaption(ctx, geo, state, grade, unit);

  // Preview-only selection outline.
  if (opts.preview && state.selected != null && rects[state.selected]) {
    const r = rects[state.selected];
    ctx.save();
    ctx.strokeStyle = '#ff2e88';
    ctx.lineWidth = unit * 0.45;
    ctx.setLineDash([unit * 1.4, unit * 0.9]);
    ctx.strokeRect(r.x + 2, r.y + 2, r.w - 4, r.h - 4);
    ctx.restore();
  }
}
