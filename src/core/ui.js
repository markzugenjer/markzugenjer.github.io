import * as THREE from 'three';

export const FONT = 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';
export const COLORS = {
  green: '#6f8a3c',
  greenDark: '#56702b',
  greenSoft: '#b9d77a',
  ink: '#1f2a17',
  muted: '#5d6650',
  paper: 'rgba(255,255,255,0.93)',
};

export function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

export function text(ctx, str, x, y, { size = 40, weight = 500, color = COLORS.ink, align = 'left', maxWidth } = {}) {
  ctx.font = `${weight} ${Math.round(size)}px ${FONT}`;
  ctx.fillStyle = color;
  ctx.textAlign = align;
  ctx.textBaseline = 'alphabetic';
  if (maxWidth) ctx.fillText(str, x, y, maxWidth);
  else ctx.fillText(str, x, y);
}

/** Rounded white card filling the whole canvas. */
export function card(ctx, W, H, { fill = COLORS.paper, stroke = null, r = 0.18 } = {}) {
  roundRect(ctx, 4, 4, W - 8, H - 8, Math.min(W, H) * r);
  ctx.fillStyle = fill;
  ctx.fill();
  if (stroke) {
    ctx.lineWidth = 6;
    ctx.strokeStyle = stroke;
    ctx.stroke();
  }
}

/**
 * A flat panel in the 3D world drawn with a 2D canvas.
 * `draw(ctx, W, H, ...args)` runs again whenever you call `panel.redraw(...args)`.
 * Size is in metres; `ppm` is canvas pixels per metre (sharpness).
 */
export function makePanel(w, h, draw, { ppm = 640 } = {}) {
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(w * ppm);
  canvas.height = Math.round(h * ppm);
  const ctx = canvas.getContext('2d');
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, fog: false, toneMapped: false });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
  const panel = {
    mesh,
    canvas,
    redraw(...args) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      draw(ctx, canvas.width, canvas.height, ...args);
      tex.needsUpdate = true;
    },
  };
  panel.redraw();
  return panel;
}

const TONES = {
  green: { bg: COLORS.green, hover: COLORS.greenDark, fg: '#ffffff', sub: 'rgba(255,255,255,0.85)', border: null },
  light: { bg: '#ffffff', hover: '#eef3e3', fg: COLORS.ink, sub: COLORS.muted, border: '#cfd8bd' },
  dark: { bg: '#26301c', hover: '#38452b', fg: '#ffffff', sub: 'rgba(255,255,255,0.78)', border: null },
};

/** A clickable button: point at it and pull the trigger (or click on desktop). */
export function makeButton(app, { label: initialLabel, sub = '', w = 1.0, h = 0.26, tone = 'green', onSelect }) {
  let label = initialLabel;
  const t = TONES[tone] || TONES.green;
  let hover = false;
  const panel = makePanel(w, h, (ctx, W, H) => {
    roundRect(ctx, 6, 6, W - 12, H - 12, H * 0.26);
    ctx.fillStyle = hover ? t.hover : t.bg;
    ctx.fill();
    if (t.border) { ctx.lineWidth = 5; ctx.strokeStyle = t.border; ctx.stroke(); }
    if (hover) { ctx.lineWidth = 10; ctx.strokeStyle = COLORS.greenSoft; ctx.stroke(); }
    const pad = H * 0.32;
    if (sub) {
      text(ctx, label, pad, H * 0.5, { size: H * 0.3, weight: 700, color: t.fg, maxWidth: W - pad * 2 });
      text(ctx, sub, pad, H * 0.8, { size: H * 0.17, color: t.sub, maxWidth: W - pad * 2 });
    } else {
      text(ctx, label, W / 2, H * 0.63, { size: H * 0.34, weight: 700, color: t.fg, align: 'center', maxWidth: W - pad * 2 });
    }
  });
  app.addTarget(panel.mesh, {
    onHover(v) { hover = v; panel.redraw(); },
    onSelect() { app.sfx.play('click'); onSelect?.(); },
    setLabel(next) { if (next !== label) { label = next; panel.redraw(); } },
  });
  return panel.mesh;
}
