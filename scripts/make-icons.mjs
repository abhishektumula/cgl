// Draws the app icon and its alternates as SVG and rasterises them with rsvg-convert + ImageMagick.
// Run: node scripts/make-icons.mjs   (needs `rsvg-convert` and `magick` on PATH)
import { execFileSync } from 'node:child_process';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const OUT = new URL('../assets/', import.meta.url).pathname;
const ICONS = join(OUT, 'icons');
const TMP = join(tmpdir(), 'prep-planner-icons');
mkdirSync(ICONS, { recursive: true });
mkdirSync(TMP, { recursive: true });

/** name → look. `ink` is the motif colour, `motif` picks the drawing. */
const VARIANTS = {
  Default: { from: '#FBB9D0', to: '#DE6A9C', glow: '#FFE3EE', ink: '#FFFFFF', motif: 'ring' },
  Sage: { from: '#9CCDB9', to: '#3F7563', glow: '#DDF3EA', ink: '#FFFFFF', motif: 'ring' },
  Lavender: { from: '#C9BCF7', to: '#7F69CF', glow: '#EEE8FF', ink: '#FFFFFF', motif: 'ring' },
  Peach: { from: '#FFCBA8', to: '#EC8460', glow: '#FFEDE0', ink: '#FFFFFF', motif: 'ring' },
  Sky: { from: '#A9D8F7', to: '#4A8FCB', glow: '#E4F4FF', ink: '#FFFFFF', motif: 'ring' },
  Bloom: { from: '#F9C6E0', to: '#B58BE8', glow: '#FFF0F8', ink: '#FFFFFF', motif: 'bloom' },
  Heart: { from: '#FFA9BE', to: '#E0527F', glow: '#FFE0E8', ink: '#FFFFFF', motif: 'heart' },
  Midnight: { from: '#3A3F78', to: '#14162E', glow: '#6D74C9', ink: '#F7D98B', motif: 'moon' },
};

const sparkle = (cx, cy, r, fill, opacity = 1) => {
  const k = r * 0.2;
  return `<path transform="translate(${cx} ${cy})" fill="${fill}" fill-opacity="${opacity}" d="M0,${-r} C${k},${-k} ${k},${-k} ${r},0 C${k},${k} ${k},${k} 0,${r} C${-k},${k} ${-k},${k} ${-r},0 C${-k},${-k} ${-k},${-k} 0,${-r} Z"/>`;
};

const HEART = 'M0,150 C-40,118 -200,10 -200,-78 C-200,-150 -145,-190 -92,-190 C-52,-190 -18,-168 0,-136 C18,-168 52,-190 92,-190 C145,-190 200,-150 200,-78 C200,10 40,118 0,150 Z';

/** Motifs are drawn around (0,0) and fit a circle of radius ~300. */
function motif(kind, ink) {
  if (kind === 'heart') {
    return `
      <circle r="286" fill="none" stroke="${ink}" stroke-opacity="0.26" stroke-width="20" stroke-dasharray="4 44" stroke-linecap="round"/>
      <path d="${HEART}" fill="${ink}" transform="translate(0 22) scale(0.98)"/>
      ${sparkle(190, -208, 54, ink)}
      ${sparkle(-214, 176, 30, ink, 0.85)}`;
  }
  if (kind === 'bloom') {
    const petals = Array.from({ length: 8 }, (_, i) =>
      `<ellipse cx="0" cy="-170" rx="78" ry="128" fill="${ink}" fill-opacity="${i % 2 ? 0.62 : 0.92}" transform="rotate(${i * 45})"/>`
    ).join('');
    return `${petals}<circle r="74" fill="#FFD98A"/><circle r="74" fill="none" stroke="${ink}" stroke-width="12"/>`;
  }
  if (kind === 'moon') {
    return `
      <circle r="290" fill="none" stroke="${ink}" stroke-opacity="0.22" stroke-width="14"/>
      <path fill="none" stroke="${ink}" stroke-width="14" stroke-linecap="round" stroke-dasharray="${2 * Math.PI * 290 * 0.3} 4000" d="M0,-290 A290,290 0 1 1 -0.1,-290"/>
      <path fill="${ink}" d="M56,-176 A186,186 0 1 0 176,104 A150,150 0 1 1 56,-176 Z" transform="translate(-34 16)"/>
      ${sparkle(118, -64, 48, ink)}
      ${sparkle(176, 40, 24, ink, 0.8)}
      ${sparkle(40, -8, 18, ink, 0.7)}`;
  }
  // ring: a timer arc that is three-quarters done, with a spark in the middle
  const r = 232;
  const c = 2 * Math.PI * r;
  return `
    <circle r="${r}" fill="none" stroke="${ink}" stroke-opacity="0.3" stroke-width="62"/>
    <circle r="${r}" fill="none" stroke="${ink}" stroke-width="62" stroke-linecap="round" stroke-dasharray="${c * 0.74} ${c}" transform="rotate(-90)"/>
    ${sparkle(0, 0, 112, ink)}
    ${sparkle(232, -232, 46, ink, 0.9)}`;
}

function background(v, id = 'bg') {
  return `
    <defs>
      <linearGradient id="${id}" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="${v.from}"/><stop offset="1" stop-color="${v.to}"/>
      </linearGradient>
      <radialGradient id="${id}g" cx="0.24" cy="0.18" r="0.75">
        <stop offset="0" stop-color="${v.glow}" stop-opacity="0.75"/><stop offset="1" stop-color="${v.glow}" stop-opacity="0"/>
      </radialGradient>
    </defs>
    <rect width="1024" height="1024" fill="url(#${id})"/>
    <rect width="1024" height="1024" fill="url(#${id}g)"/>
    <circle cx="880" cy="930" r="330" fill="${v.to}" fill-opacity="0.35"/>`;
}

const shadowed = (inner, scale) => `
  <defs><filter id="sh" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="22"/></filter></defs>
  <g transform="translate(512 536) scale(${scale})" filter="url(#sh)" opacity="0.22"><g fill="#3A1030" stroke="#3A1030">${inner.replace(/fill="#F[^"]*"|fill="#FFFFFF"|stroke="#F[^"]*"|stroke="#FFFFFF"/g, (m) => m.startsWith('fill') ? 'fill="#3A1030"' : 'stroke="#3A1030"')}</g></g>
  <g transform="translate(512 512) scale(${scale})">${inner}</g>`;

const svg = (body) => `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">${body}</svg>`;

function render(name, body, size, { flatten } = {}) {
  const src = join(TMP, `${name.replace(/[\\/]/g, '_')}.svg`);
  const out = join(OUT, `${name}.png`);
  writeFileSync(src, svg(body));
  execFileSync('rsvg-convert', ['-w', String(size), '-h', String(size), src, '-o', out]);
  // iOS rejects icons with an alpha channel
  if (flatten) execFileSync('magick', [out, '-background', flatten, '-alpha', 'remove', '-alpha', 'off', out]);
  return out;
}

for (const [name, v] of Object.entries(VARIANTS)) {
  const m = motif(v.motif, v.ink);
  const full = background(v) + shadowed(m, 1.16);
  const fg = shadowed(m, 0.8); // keeps the motif inside Android's safe zone
  if (name === 'Default') {
    render('icon', full, 1024, { flatten: v.to });
    render('android-icon-background', background(v), 1024, { flatten: v.to });
    render('android-icon-foreground', fg, 1024);
    render('android-icon-monochrome', `<g transform="translate(512 512) scale(0.8)">${motif(v.motif, '#000000')}</g>`, 432);
    render('splash-icon', `<g transform="translate(512 512) scale(0.9)">${motif(v.motif, v.to)}</g>`, 1024);
    render('favicon', `<rect width="1024" height="1024" rx="230" fill="${v.to}"/><g transform="translate(512 512) scale(1.05)">${m}</g>`, 48);
    render('notification-icon', `<g transform="translate(512 512) scale(1.35)">${motif(v.motif, '#FFFFFF')}</g>`, 96);
  } else {
    render(`icons/${name}`, full, 1024, { flatten: v.to });
    render(`icons/${name}-background`, background(v), 1024, { flatten: v.to });
    render(`icons/${name}-foreground`, fg, 1024);
  }
  // small previews shown in Settings
  render(`icons/${name}-preview`, full, 192, { flatten: v.to });
}

rmSync(TMP, { recursive: true, force: true });
console.log('Icons written to', OUT);
