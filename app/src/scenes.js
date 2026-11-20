// scenes.js — the four Leonida demo scenes, painted in code on a 2D canvas.
// No image assets: every scene is gradients, silhouettes and light, drawn at
// whatever size the panel asks for. Each painter receives a context already
// translated to the panel's top-left corner and draws into (0, 0, w, h).

/** A vertical sky gradient from a list of [stop, colour] pairs. */
function sky(ctx, w, h, stops) {
  const g = ctx.createLinearGradient(0, 0, 0, h);
  for (const [at, colour] of stops) g.addColorStop(at, colour);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
}

/** A soft disc of light with a halo — sun, moon or a neon glow. */
function glowDisc(ctx, x, y, r, core, halo) {
  const g = ctx.createRadialGradient(x, y, r * 0.1, x, y, r * 2.6);
  g.addColorStop(0, halo);
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.fillRect(x - r * 2.6, y - r * 2.6, r * 5.2, r * 5.2);
  ctx.fillStyle = core;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
}

/** Horizontal shimmer streaks on water between y0 and y1, centred near cx. */
function shimmer(ctx, w, y0, y1, cx, colour, rows) {
  ctx.fillStyle = colour;
  for (let i = 0; i < rows; i++) {
    const t = i / rows;
    const y = y0 + (y1 - y0) * t;
    const len = w * (0.05 + 0.3 * t) * (0.6 + 0.4 * Math.sin(i * 12.9898));
    const x = cx + Math.sin(i * 78.233) * w * 0.05 - len / 2;
    ctx.globalAlpha = 0.12 + 0.3 * t;
    ctx.fillRect(x, y, len, Math.max(1.5, hPx(y1 - y0) * 0.012));
  }
  ctx.globalAlpha = 1;
}

function hPx(v) {
  return v;
}

/** A palm silhouette: curved trunk plus a crown of drooping fronds. */
function palm(ctx, x, y, s, colour) {
  ctx.strokeStyle = colour;
  ctx.fillStyle = colour;
  ctx.lineWidth = s * 0.09;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.quadraticCurveTo(x + s * 0.12, y - s * 0.55, x + s * 0.34, y - s * 0.98);
  ctx.stroke();
  const topX = x + s * 0.34;
  const topY = y - s * 0.98;
  ctx.lineWidth = s * 0.055;
  for (let i = 0; i < 7; i++) {
    const a = Math.PI * (0.08 + (i / 6) * 0.84);
    const reach = s * (0.5 + 0.14 * Math.sin(i * 2.7));
    ctx.beginPath();
    ctx.moveTo(topX, topY);
    ctx.quadraticCurveTo(
      topX + Math.cos(a) * reach * 0.6,
      topY - Math.sin(a) * reach * 0.55,
      topX + Math.cos(a) * reach,
      topY - Math.sin(a) * reach * 0.2 + s * 0.16,
    );
    ctx.stroke();
  }
  ctx.beginPath();
  ctx.arc(topX, topY + s * 0.03, s * 0.05, 0, Math.PI * 2);
  ctx.fill();
}

/** A low skyline silhouette with a few lit windows. */
function skyline(ctx, w, baseY, height, colour, windowColour) {
  ctx.fillStyle = colour;
  let x = -w * 0.02;
  let i = 0;
  while (x < w * 1.02) {
    const bw = w * (0.05 + 0.05 * Math.abs(Math.sin(i * 3.1)));
    const bh = height * (0.45 + 0.55 * Math.abs(Math.sin(i * 7.7)));
    ctx.fillRect(x, baseY - bh, bw, bh);
    if (windowColour) {
      ctx.fillStyle = windowColour;
      for (let wy = baseY - bh + bh * 0.15; wy < baseY - bh * 0.15; wy += bh * 0.18) {
        for (let wx = x + bw * 0.18; wx < x + bw * 0.8; wx += bw * 0.24) {
          if (Math.sin(wx * 12.3 + wy * 4.1) > 0.25) ctx.fillRect(wx, wy, bw * 0.1, bh * 0.07);
        }
      }
      ctx.fillStyle = colour;
    }
    x += bw + w * 0.012;
    i++;
  }
}

/** Scene 1 — sunset over Leonida Bay: sun on the water, skyline, headland. */
export function paintSunsetBay(ctx, w, h) {
  sky(ctx, w, h, [
    [0, '#2e1a47'],
    [0.34, '#8e2f63'],
    [0.58, '#e85d75'],
    [0.74, '#ffb347'],
    [1, '#ffd98a'],
  ]);
  const horizon = h * 0.66;
  glowDisc(ctx, w * 0.52, horizon - h * 0.02, h * 0.085, '#fff3c4', 'rgba(255,166,66,0.55)');
  // Bay water.
  const water = ctx.createLinearGradient(0, horizon, 0, h);
  water.addColorStop(0, '#f78d5c');
  water.addColorStop(0.25, '#c94f6d');
  water.addColorStop(1, '#3a2154');
  ctx.fillStyle = water;
  ctx.fillRect(0, horizon, w, h - horizon);
  shimmer(ctx, w, horizon + h * 0.02, h * 0.98, w * 0.52, '#ffe9a8', 16);
  // Skyline on the left shore, headland on the right.
  skyline(ctx, w * 0.46, horizon, h * 0.3, '#241536', null);
  ctx.fillStyle = '#241536';
  ctx.fillRect(0, horizon - 2, w * 0.46, 4);
  ctx.beginPath();
  ctx.moveTo(w * 0.78, horizon);
  ctx.quadraticCurveTo(w * 0.9, horizon - h * 0.16, w * 1.02, horizon - h * 0.05);
  ctx.lineTo(w * 1.02, horizon);
  ctx.closePath();
  ctx.fill();
  palm(ctx, w * 0.88, horizon + h * 0.01, h * 0.3, '#1c0f2e');
  // Birds.
  ctx.strokeStyle = 'rgba(28,15,46,0.8)';
  ctx.lineWidth = Math.max(1.5, h * 0.006);
  for (const [bx, by, bs] of [[0.24, 0.2, 0.03], [0.33, 0.15, 0.022], [0.68, 0.24, 0.026]]) {
    ctx.beginPath();
    ctx.moveTo(w * bx - w * bs, h * by);
    ctx.quadraticCurveTo(w * bx - w * bs * 0.4, h * by - h * bs * 0.5, w * bx, h * by);
    ctx.quadraticCurveTo(w * bx + w * bs * 0.4, h * by - h * bs * 0.5, w * bx + w * bs, h * by);
    ctx.stroke();
  }
}

/** Scene 2 — the palm strip: midday beach, palms, boardwalk and ocean band. */
export function paintPalmStrip(ctx, w, h) {
  sky(ctx, w, h, [
    [0, '#7fd4e8'],
    [0.45, '#bfeef2'],
    [0.62, '#fdf3c9'],
    [1, '#f7d774'],
  ]);
  glowDisc(ctx, w * 0.8, h * 0.16, h * 0.05, '#fffbe8', 'rgba(255,240,170,0.6)');
  // Ocean band.
  const sea = ctx.createLinearGradient(0, h * 0.52, 0, h * 0.72);
  sea.addColorStop(0, '#1d9e9a');
  sea.addColorStop(1, '#37c8b4');
  ctx.fillStyle = sea;
  ctx.fillRect(0, h * 0.52, w, h * 0.2);
  ctx.fillStyle = 'rgba(255,255,255,0.75)';
  for (let i = 0; i < 5; i++) {
    const y = h * (0.55 + i * 0.035);
    ctx.fillRect(w * (0.06 + 0.13 * Math.abs(Math.sin(i * 5.3))), y, w * (0.2 + 0.1 * Math.sin(i * 9.1)), h * 0.008);
  }
  // Sand and boardwalk.
  ctx.fillStyle = '#f2d492';
  ctx.fillRect(0, h * 0.72, w, h * 0.28);
  ctx.fillStyle = '#c98d5f';
  ctx.fillRect(0, h * 0.8, w, h * 0.055);
  ctx.fillStyle = 'rgba(120,72,32,0.5)';
  for (let x = w * 0.03; x < w; x += w * 0.07) ctx.fillRect(x, h * 0.8, w * 0.008, h * 0.055);
  // Umbrellas.
  for (const [ux, uc] of [[0.2, '#e8483f'], [0.58, '#ff8b3d'], [0.83, '#3d7bff']]) {
    ctx.strokeStyle = '#7a4a21';
    ctx.lineWidth = Math.max(2, h * 0.008);
    ctx.beginPath();
    ctx.moveTo(w * ux, h * 0.86);
    ctx.lineTo(w * ux, h * 0.74);
    ctx.stroke();
    ctx.fillStyle = uc;
    ctx.beginPath();
    ctx.moveTo(w * ux - w * 0.09, h * 0.75);
    ctx.quadraticCurveTo(w * ux, h * 0.66, w * ux + w * 0.09, h * 0.75);
    ctx.closePath();
    ctx.fill();
  }
  palm(ctx, w * 0.1, h * 0.86, h * 0.52, '#14532d');
  palm(ctx, w * 0.38, h * 0.88, h * 0.4, '#1a6b3c');
  palm(ctx, w * 0.94, h * 0.87, h * 0.58, '#14532d');
}

/** Scene 3 — neon harbour at night: signs, string lights, black water. */
export function paintNeonHarbor(ctx, w, h) {
  sky(ctx, w, h, [
    [0, '#070b24'],
    [0.55, '#101a3e'],
    [1, '#1d2a55'],
  ]);
  // Stars.
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  for (let i = 0; i < 40; i++) {
    const sx = Math.abs(Math.sin(i * 37.7)) * w;
    const sy = Math.abs(Math.cos(i * 21.3)) * h * 0.4;
    ctx.globalAlpha = 0.25 + 0.6 * Math.abs(Math.sin(i * 3.3));
    ctx.fillRect(sx, sy, Math.max(1.2, w * 0.002), Math.max(1.2, w * 0.002));
  }
  ctx.globalAlpha = 1;
  glowDisc(ctx, w * 0.84, h * 0.14, h * 0.045, '#f4f1de', 'rgba(200,210,255,0.25)');
  // Harbour-front buildings with neon signs.
  skyline(ctx, w, h * 0.58, h * 0.42, '#0a0f26', 'rgba(255,214,120,0.9)');
  const signs = [
    [0.1, 0.3, '#ff2e88'],
    [0.3, 0.22, '#22d3ee'],
    [0.52, 0.34, '#a3e635'],
    [0.72, 0.26, '#fb923c'],
  ];
  for (const [sx, sy, sc] of signs) {
    ctx.save();
    ctx.shadowColor = sc;
    ctx.shadowBlur = h * 0.03;
    ctx.fillStyle = sc;
    ctx.fillRect(w * sx, h * sy, w * 0.11, h * 0.028);
    ctx.fillRect(w * sx, h * (sy + 0.05), w * 0.07, h * 0.02);
    ctx.restore();
  }
  // String lights across the quay.
  ctx.strokeStyle = 'rgba(255,205,110,0.9)';
  ctx.lineWidth = Math.max(1.2, h * 0.004);
  ctx.beginPath();
  ctx.moveTo(0, h * 0.5);
  ctx.quadraticCurveTo(w * 0.5, h * 0.62, w, h * 0.48);
  ctx.stroke();
  for (let i = 0; i <= 14; i++) {
    const t = i / 14;
    const x = w * t;
    const y = h * 0.5 + (h * 0.62 - h * 0.5) * 2 * t * (1 - t) + (h * 0.48 - h * 0.5) * t * t;
    glowDisc(ctx, x, y + h * 0.012, h * 0.006, '#ffd98a', 'rgba(255,190,80,0.5)');
  }
  // Black water with neon reflections.
  ctx.fillStyle = '#05070f';
  ctx.fillRect(0, h * 0.58, w, h * 0.42);
  shimmer(ctx, w, h * 0.62, h * 0.97, w * 0.2, '#ff2e88', 7);
  shimmer(ctx, w, h * 0.62, h * 0.97, w * 0.55, '#22d3ee', 7);
  shimmer(ctx, w, h * 0.62, h * 0.97, w * 0.82, '#ffd98a', 7);
  // A moored boat silhouette.
  ctx.fillStyle = '#0d1330';
  ctx.beginPath();
  ctx.moveTo(w * 0.36, h * 0.6);
  ctx.lineTo(w * 0.6, h * 0.6);
  ctx.lineTo(w * 0.56, h * 0.65);
  ctx.lineTo(w * 0.4, h * 0.65);
  ctx.closePath();
  ctx.fill();
  ctx.fillRect(w * 0.46, h * 0.53, w * 0.05, h * 0.07);
}

/** Scene 4 — the causeway at dusk: a lit road running out over the water. */
export function paintCausewayDusk(ctx, w, h) {
  sky(ctx, w, h, [
    [0, '#1f1440'],
    [0.4, '#5b2a6e'],
    [0.62, '#c94f6d'],
    [0.78, '#ff9e5e'],
    [1, '#ffc46b'],
  ]);
  const horizon = h * 0.6;
  glowDisc(ctx, w * 0.5, horizon, h * 0.06, '#fff0b8', 'rgba(255,160,80,0.5)');
  skyline(ctx, w, horizon, h * 0.2, '#2a1746', 'rgba(255,205,110,0.85)');
  // Water on both sides.
  const water = ctx.createLinearGradient(0, horizon, 0, h);
  water.addColorStop(0, '#e2705e');
  water.addColorStop(0.3, '#7a3464');
  water.addColorStop(1, '#241536');
  ctx.fillStyle = water;
  ctx.fillRect(0, horizon, w, h - horizon);
  shimmer(ctx, w, horizon + h * 0.03, h * 0.96, w * 0.22, '#ffb37a', 9);
  shimmer(ctx, w, horizon + h * 0.03, h * 0.96, w * 0.8, '#ffb37a', 9);
  // The causeway deck in perspective.
  const vx = w * 0.5;
  ctx.fillStyle = '#191024';
  ctx.beginPath();
  ctx.moveTo(vx - w * 0.035, horizon);
  ctx.lineTo(vx + w * 0.035, horizon);
  ctx.lineTo(w * 1.02, h);
  ctx.lineTo(-w * 0.02, h);
  ctx.closePath();
  ctx.fill();
  // Centre dashes converging to the vanishing point.
  ctx.fillStyle = '#ffd98a';
  for (let i = 0; i < 7; i++) {
    const t = Math.pow(i / 7, 1.7);
    const y = horizon + (h - horizon) * t;
    const dashW = w * 0.006 + w * 0.05 * t;
    const dashH = h * 0.008 + h * 0.05 * t;
    ctx.fillRect(vx - dashW / 2, y, dashW, dashH);
  }
  // Guardrails and streetlights.
  ctx.strokeStyle = '#0d0819';
  ctx.lineWidth = Math.max(2, h * 0.01);
  for (const side of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(vx + side * w * 0.035, horizon);
    ctx.lineTo(vx + side * w * 0.52, h);
    ctx.stroke();
    for (let i = 1; i <= 4; i++) {
      const t = i / 4.4;
      const lx = vx + side * (w * 0.035 + (w * 0.52 - w * 0.035) * t);
      const ly = horizon + (h - horizon) * t;
      const lh = h * 0.16 * t + h * 0.02;
      ctx.strokeStyle = '#0d0819';
      ctx.lineWidth = Math.max(1.5, h * 0.008 * t + 1);
      ctx.beginPath();
      ctx.moveTo(lx, ly);
      ctx.lineTo(lx, ly - lh);
      ctx.stroke();
      glowDisc(ctx, lx, ly - lh, h * 0.012 + h * 0.01 * t, '#ffe9a8', 'rgba(255,190,90,0.55)');
    }
  }
}

/** The demo scenes, in the order the default grid shows them. */
export const DEMO_SCENES = [
  { id: 'sunset-bay', name: 'Sunset Bay', paint: paintSunsetBay },
  { id: 'palm-strip', name: 'Palm Strip', paint: paintPalmStrip },
  { id: 'neon-harbor', name: 'Neon Harbor', paint: paintNeonHarbor },
  { id: 'causeway-dusk', name: 'Causeway at Dusk', paint: paintCausewayDusk },
];

/** Look up a scene painter by id. */
export function sceneById(id) {
  return DEMO_SCENES.find((s) => s.id === id) ?? DEMO_SCENES[0];
}
