'use strict';
/* =========================================================
   CHIYA — vector art: crew, player, tiles, teahouse, decor
   Everything is drawn facing right with feet at (0,0).
   ========================================================= */
const TAU = Math.PI * 2;
const OUT = 'rgba(22,26,42,.75)';

function P(c) { c.beginPath(); }
function fs(c, fill, lw = 1.4) { c.fillStyle = fill; c.fill(); c.lineWidth = lw; c.strokeStyle = OUT; c.stroke(); }
function circ(c, x, y, r, f, stroke = true) { P(c); c.arc(x, y, r, 0, TAU); stroke ? fs(c, f) : (c.fillStyle = f, c.fill()); }
function ell(c, x, y, rx, ry, f, stroke = true, rot = 0) { P(c); c.ellipse(x, y, rx, ry, rot, 0, TAU); stroke ? fs(c, f) : (c.fillStyle = f, c.fill()); }
function rr(c, x, y, w, h, r, f, stroke = true) { P(c); c.roundRect(x, y, w, h, r); stroke ? fs(c, f) : (c.fillStyle = f, c.fill()); }
function poly(c, pts, f, stroke = true) { P(c); c.moveTo(pts[0], pts[1]); for (let i = 2; i < pts.length; i += 2) c.lineTo(pts[i], pts[i + 1]); c.closePath(); stroke ? fs(c, f) : (c.fillStyle = f, c.fill()); }
function line(c, x1, y1, x2, y2, col, w) { P(c); c.moveTo(x1, y1); c.lineTo(x2, y2); c.strokeStyle = col; c.lineWidth = w; c.lineCap = 'round'; c.stroke(); }

/* ---------------- humans ---------------- */
const HATS = {
  none() {},
  headband(c) { rr(c, -7, -30, 14, 3, 1.5, '#7a4b2a'); line(c, -6, -29, -11, -14, '#7a4b2a', 2); },
  cap(c, o) { P(c); c.arc(0, -27, 7.2, Math.PI, 0); fs(c, o.hatC || '#2f6fdb'); rr(c, 2, -28.5, 8, 2.6, 1.3, o.hatC || '#2f6fdb'); },
  straw(c) { ell(c, 0, -29, 12, 3.2, '#e8c66a'); P(c); c.arc(0, -29.5, 5.5, Math.PI, 0); fs(c, '#f2d488'); line(c, -5, -30.5, 5, -30.5, '#c0392b', 1.4); },
  topi(c) { poly(c, [-6, -30, 6, -30, 5, -35, -5, -35], '#d1453b'); line(c, -4, -32.5, 4, -32.5, '#ffd24a', 1.2); circ(c, -2, -33.6, .8, '#2e86de', false); circ(c, 2, -31.5, .8, '#2ecc71', false); },
  chef(c) { rr(c, -5, -35, 10, 6, 2, '#ffffff'); circ(c, -3.5, -36, 3.2, '#ffffff'); circ(c, 0, -37.5, 3.5, '#ffffff'); circ(c, 3.5, -36, 3.2, '#ffffff'); },
  helmet(c, o) { P(c); c.arc(0, -27, 7.8, Math.PI * 1.05, -0.05); fs(c, o.hatC || '#f39c12'); line(c, 6.5, -25, 5, -21, '#333', 1); },
  beanie(c, o) { P(c); c.arc(0, -27, 7.4, Math.PI, 0); fs(c, o.hatC || '#e74c3c'); rr(c, -7.6, -28.5, 15.2, 3, 1.5, '#f5f5f5'); circ(c, 0, -35.5, 2.4, '#f5f5f5'); rr(c, 1, -27, 6.5, 2.6, 1.3, '#273c75'); },
  shaved(c, o) { P(c); c.arc(0, -26, 7, Math.PI * 1.1, -0.1); c.fillStyle = 'rgba(255,255,255,.12)'; c.fill(); },
  lamaHat(c) { P(c); c.moveTo(-7, -29); c.quadraticCurveTo(-2, -42, 9, -38); c.quadraticCurveTo(3, -36, 7, -29); c.closePath(); fs(c, '#f5b51e'); },
  sunhat(c) { ell(c, 0, -30, 9.5, 2.6, '#f7f1e3'); P(c); c.arc(0, -30.5, 5.6, Math.PI, 0); fs(c, '#f7f1e3'); rr(c, 1, -27.5, 7, 2.6, 1.2, '#1e272e'); },
  bandana(c) { P(c); c.arc(0, -27, 7.3, Math.PI, 0); fs(c, '#8e44ad'); poly(c, [-7, -27, -12, -25, -10, -29], '#8e44ad'); },
  bowl(c) { P(c); c.arc(0, -27.5, 7.4, Math.PI * 1.05, -0.05); fs(c, '#2d1e14'); }
};

function human(c, o, t, mv, act) {
  const bob = mv ? Math.abs(Math.sin(t * 11)) * 2 : Math.sin(t * 2.2) * .5;
  const leg = mv ? Math.sin(t * 11) * 3 : 0;
  const arm = mv ? Math.sin(t * 11) * 2.5 : act ? Math.sin(t * 18) * 3 : 0;
  rr(c, -4.5 - leg * .4, -8, 4, 8.5, 2, o.pants || '#3b3f58');
  rr(c, 0.5 + leg * .4, -8, 4, 8.5, 2, o.pants || '#3b3f58');
  c.save(); c.translate(0, -bob);
  if (o.back) o.back(c, t);
  rr(c, -7, -21, 14, 15, 5.5, o.body);
  if (o.trim) rr(c, -7, -11, 14, 3, 1.2, o.trim, false);
  if (o.apron) rr(c, -1, -18, 7, 12, 2.5, '#ffffff');
  circ(c, 0, -26.5, 7, o.skin || '#e0a878');
  circ(c, 3.4, -27, 1.15, '#1d2233', false);
  if (!o.noBlush) circ(c, 4.4, -24.4, 1.3, 'rgba(255,110,110,.35)', false);
  (HATS[o.hat] || HATS.none)(c, o);
  c.save(); c.translate(1, -17); c.rotate(arm * .08);
  rr(c, -1.8, 0, 3.6, 8.5, 1.8, o.arm || o.body);
  if (o.hand) { c.translate(0, 8); o.hand(c, t, act); }
  c.restore();
  if (o.front) o.front(c, t);
  c.restore();
}

const ITEMSART = {
  basket(c) { poly(c, [-14, -30, -4, -30, -5, -8, -13, -8], '#c8913e'); line(c, -13, -24, -5, -24, '#8a5a22', 1); line(c, -13, -17, -5, -17, '#8a5a22', 1); line(c, -9, -30, -9, -8, '#8a5a22', 1); },
  poles(c, t, act) { line(c, 0, 0, 7, 10, '#555', 1.6); },
  smallBasket(c) { rr(c, -3, -1, 7, 5, 2, '#c8913e'); circ(c, 0, -1.5, 2, '#5aa24a', false); },
  root(c) { ell(c, 1, 1, 3.4, 2.2, '#f0a24b'); },
  gagri(c) { circ(c, 7, -22, 5.5, '#c8742b'); rr(c, 5, -29, 4, 3, 1, '#a65d1c'); },
  camera(c) { rr(c, -2, -1, 7, 5, 1.5, '#2d3436'); circ(c, 2.5, 1.5, 1.6, '#74b9ff', false); },
  rope(c) { P(c); c.arc(-5, -17, 4.5, 0, TAU); c.strokeStyle = '#f1c40f'; c.lineWidth = 2.2; c.stroke(); },
  chili(c, t) { c.save(); c.rotate(-.6); ell(c, 3, 0, 4.5, 1.8, '#e74c3c'); line(c, -1, 0, -2.5, -1.5, '#27ae60', 1.4); c.restore(); },
  iceaxe(c, t, act) { c.save(); c.rotate(act ? -0.6 + Math.sin(t * 18) * .4 : -0.3); line(c, 0, 2, 0, -12, '#6c5ce7', 1.8); line(c, -4, -12, 5, -11, '#b2bec3', 2.2); c.restore(); },
  handwheel(c, t) { line(c, 0, 0, 0, -6, '#8a5a22', 1.4); c.save(); c.translate(0, -8); rr(c, -3, -3, 6, 6, 1.5, '#f5b51e'); line(c, -3, -1 + Math.sin(t * 9) * 1.5, 3, -1 + Math.sin(t * 9) * 1.5, '#c0392b', 1); c.restore(); },
  torch(c, t) { line(c, 0, 2, 4, -9, '#6d4c41', 1.8); circ(c, 4.5, -11, 2.4 + Math.sin(t * 20) * .5, '#ff9f43', false); circ(c, 4.5, -11, 1.3, '#ffeaa7', false); },
  twoTools(c, t, act) { c.save(); c.rotate(act ? -0.8 + Math.sin(t * 20) * .5 : -0.4); line(c, 0, 2, 0, -10, '#2d3436', 1.6); line(c, 0, -10, 4, -8, '#dfe6e9', 2); c.restore(); },
  mala(c) { P(c); c.arc(1, 2, 3, 0, TAU); c.strokeStyle = '#d35400'; c.lineWidth = 1.6; c.setLineDash([1.5, 1.2]); c.stroke(); c.setLineDash([]); },
  kite(c, t) { const kx = 10 + Math.sin(t * 1.7) * 4, ky = -34 + Math.cos(t * 2.1) * 3; P(c); c.moveTo(0, 0); c.quadraticCurveTo(8, -10, kx, ky + 26); c.strokeStyle = 'rgba(255,255,255,.7)'; c.lineWidth = .8; c.stroke(); c.save(); c.translate(kx, ky); c.rotate(Math.sin(t * 2) * .2); poly(c, [0, -8, 6, 0, 0, 10, -6, 0], '#e84393'); line(c, 0, -8, 0, 10, '#fd79a8', .8); line(c, -6, 0, 6, 0, '#fd79a8', .8); line(c, 0, 10, -3, 16, '#fdcb6e', 1); c.restore(); }
};

const HUMANS = {
  porter:       { body: '#8d6e4f', trim: '#5d4037', hat: 'headband', back: ITEMSART.basket, skin: '#c98c5f' },
  trekker:      { body: '#e74c3c', hat: 'cap', hatC: '#2f6fdb', pants: '#2d3436', hand: ITEMSART.poles, back(c) { line(c, -6, -20, -10, 0, '#555', 1.6); } },
  teaPicker:    { body: '#27ae60', trim: '#1e8449', hat: 'straw', hand: ITEMSART.smallBasket, skin: '#d29a6a' },
  gingerFarmer: { body: '#f39c12', trim: '#ca6f1e', hat: 'topi', hand: ITEMSART.root, skin: '#c98c5f' },
  waterCarrier: { body: '#16a085', trim: '#0e6655', hat: 'none', front: ITEMSART.gagri, skin: '#b9784c' },
  tourist:      { body: '#fd79a8', trim: '#fdcb6e', hat: 'sunhat', pants: '#74b9ff', hand: ITEMSART.camera, skin: '#f3c6a5' },
  sherpa:       { body: '#f1c40f', trim: '#d35400', hat: 'beanie', hatC: '#c0392b', front: ITEMSART.rope, pants: '#2c3e50', skin: '#c98c5f' },
  chiliCook:    { body: '#d63031', apron: true, hat: 'chef', hand: ITEMSART.chili, skin: '#d9a273' },
  glacierGuide: { body: '#0984e3', trim: '#74b9ff', hat: 'helmet', hatC: '#fdcb6e', hand: ITEMSART.iceaxe, pants: '#2d3436' },
  monk:         { body: '#8e2a2a', trim: '#f39c12', hat: 'shaved', hand: ITEMSART.handwheel, skin: '#c98c5f', pants: '#8e2a2a' },
  honeyHunter:  { body: '#6d4c41', trim: '#3e2723', hat: 'bandana', hand: ITEMSART.torch, skin: '#b9784c' },
  iceClimber:   { body: '#00cec9', trim: '#e17055', hat: 'helmet', hatC: '#e17055', hand: ITEMSART.twoTools, pants: '#2d3436' },
  lama:         { body: '#a52a2a', trim: '#f5b51e', hat: 'lamaHat', hand: ITEMSART.mala, skin: '#d29a6a', pants: '#a52a2a' },
  kiteFlyer:    { body: '#00b894', trim: '#fdcb6e', hat: 'bowl', hand: ITEMSART.kite, skin: '#d29a6a', pants: '#e17055' }
};

/* ---------------- animals & spirits ---------------- */
function yak(c, t, mv, act, o) {
  const s = o.s, bob = mv ? Math.abs(Math.sin(t * 8)) * 1.5 : Math.sin(t * 1.8) * .4;
  const leg = mv ? Math.sin(t * 8) * 2.5 : 0;
  c.save(); c.scale(s, s);
  [[-9, leg], [-4, -leg], [5, leg], [10, -leg]].forEach(([x, d]) => rr(c, x + d * .3, -8, 3.6, 8.5, 1.6, o.leg));
  c.translate(0, -bob);
  ell(c, 0, -13, 15, 9, o.fur);
  if (o.patch) { ell(c, -4, -15, 5, 4, o.patch, false); ell(c, 6, -11, 3.5, 3, o.patch, false); }
  P(c); for (let i = -14; i <= 14; i += 4) { c.moveTo(i, -8); c.lineTo(i + 2, -3.5); c.lineTo(i + 4, -8); } c.fillStyle = o.fringe; c.fill();
  if (o.saddle) { rr(c, -6, -23, 12, 6, 2, '#c0392b'); line(c, -6, -20, 6, -20, '#f1c40f', 1); }
  ell(c, 14, -15, 6, 5.5, o.head || o.fur);
  P(c); c.moveTo(12, -19); c.quadraticCurveTo(8, -26, 12, -27); c.strokeStyle = o.horn; c.lineWidth = 2; c.lineCap = 'round'; c.stroke();
  P(c); c.moveTo(16, -19); c.quadraticCurveTo(21, -25, 18, -27); c.stroke();
  circ(c, 16.5, -16, 1.1, '#111', false);
  ell(c, 18.5, -12.5, 2.4, 1.8, o.nose || '#3d2b22', false);
  if (o.bell) { line(c, 12, -10, 12, -7, '#7f8c8d', 1); circ(c, 12, -5.5, 2, '#f1c40f'); }
  if (o.crown) { poly(c, [9, -21, 10, -26, 12, -23, 14, -27, 16, -23, 18, -26, 19, -21], '#ffd24a'); circ(c, 14, -24, 1, '#e74c3c', false); }
  c.restore();
}

const ANIMALS = {
  yakCalf: (c, t, mv, a) => yak(c, t, mv, a, { s: .72, fur: '#8d6e63', fringe: '#6d4c41', leg: '#5d4037', horn: '#f5f0e1', head: '#a1887f' }),
  dzo:     (c, t, mv, a) => yak(c, t, mv, a, { s: .95, fur: '#2d3436', patch: '#dfe6e9', fringe: '#1e2324', leg: '#1e2324', horn: '#dfe6e9', bell: true, nose: '#636e72' }),
  yakKing: (c, t, mv, a) => yak(c, t, mv, a, { s: 1.18, fur: '#f5f6fa', fringe: '#dcdde1', leg: '#b2bec3', horn: '#ffd24a', crown: true, saddle: true, nose: '#e17055' }),

  snowLion(c, t, mv) {
    const bob = mv ? Math.abs(Math.sin(t * 10)) * 1.6 : Math.sin(t * 2) * .4, leg = mv ? Math.sin(t * 10) * 2.6 : 0;
    [[-8, leg], [-3, -leg], [5, leg], [9, -leg]].forEach(([x, d]) => rr(c, x + d * .3, -7, 3.4, 7.5, 1.6, '#f5f6fa'));
    c.save(); c.translate(0, -bob);
    P(c); c.moveTo(-12, -14); c.quadraticCurveTo(-20, -18, -18, -26); c.strokeStyle = '#f5f6fa'; c.lineWidth = 2.4; c.stroke();
    circ(c, -18, -27, 3.4, '#1abc9c');
    ell(c, 0, -13, 13, 7.5, '#f5f6fa');
    for (let i = 0; i < 9; i++) { const a = i / 9 * TAU + Math.sin(t * 3) * .1; circ(c, 11 + Math.cos(a) * 6.5, -20 + Math.sin(a) * 6.5, 3.6, i % 2 ? '#1abc9c' : '#48dbfb'); }
    circ(c, 11, -20, 5.6, '#f5f6fa');
    circ(c, 13.5, -21, 1.1, '#111', false); ell(c, 15.5, -18, 1.8, 1.2, '#e17055', false);
    c.restore();
  },
  leopard(c, t, mv) {
    const bob = mv ? Math.abs(Math.sin(t * 12)) * 1.3 : Math.sin(t * 2) * .4, leg = mv ? Math.sin(t * 12) * 3 : 0;
    c.save(); c.globalAlpha = .92;
    [[-8, leg], [-3, -leg], [5, leg], [9, -leg]].forEach(([x, d]) => rr(c, x + d * .3, -6, 3.2, 6.5, 1.5, '#cfd8dc'));
    c.translate(0, -bob);
    P(c); c.moveTo(-11, -11); c.bezierCurveTo(-26, -8, -24, -26, -14, -24); c.strokeStyle = OUT; c.lineWidth = 6.4; c.lineCap = 'round'; c.stroke(); c.strokeStyle = '#cfd8dc'; c.lineWidth = 4.6; c.stroke();
    ell(c, 0, -11, 13, 6, '#dfe6e9');
    [[-6, -12], [-1, -9], [3, -13], [-9, -9], [7, -10]].forEach(([x, y]) => { P(c); c.arc(x, y, 1.6, 0, TAU); c.strokeStyle = '#636e72'; c.lineWidth = 1; c.stroke(); });
    circ(c, 12, -16, 5.4, '#dfe6e9');
    poly(c, [9, -20, 10, -24, 12.5, -21], '#dfe6e9'); poly(c, [13, -21, 15, -24.5, 16, -20], '#dfe6e9');
    circ(c, 14, -17, 1.2, '#48dbfb', false); ell(c, 16.6, -14.6, 1.4, 1, '#e17055', false);
    c.restore();
  },
  danphe(c, t, mv) {
    const hover = -12 + Math.sin(t * 3) * 2.5, flap = Math.sin(t * (mv ? 22 : 9));
    c.save(); c.translate(0, hover);
    poly(c, [-8, -6, -22, -2 + flap, -20, -10, -10, -10], '#d35400');
    ell(c, 0, -9, 9, 6, '#6c5ce7');
    P(c); c.moveTo(-2, -10); c.quadraticCurveTo(-10, -22 - flap * 8, -16, -14 - flap * 6); c.quadraticCurveTo(-8, -10, -2, -10); fs(c, '#00b894');
    ell(c, 6, -14, 4.5, 5.5, '#0984e3');
    circ(c, 9, -19, 4, '#00b894');
    P(c); c.moveTo(8, -23); c.quadraticCurveTo(10, -30, 14, -29); c.strokeStyle = '#00cec9'; c.lineWidth = 1.4; c.stroke(); circ(c, 14, -29, 1.4, '#ffd24a', false);
    poly(c, [12.5, -19.5, 16, -18.5, 12.5, -17.5], '#fdcb6e');
    circ(c, 10.5, -20, 1.6, '#48dbfb', false); circ(c, 10.6, -20, .7, '#111', false);
    c.restore();
  },
  yeti(c, t, mv, act) {
    const bob = mv ? Math.abs(Math.sin(t * 7)) * 2 : Math.sin(t * 1.6) * .6, leg = mv ? Math.sin(t * 7) * 3 : 0, arm = act ? Math.sin(t * 14) * .6 : mv ? Math.sin(t * 7) * .4 : 0;
    rr(c, -8 - leg * .3, -9, 7, 10, 3, '#eef2f7'); rr(c, 1 + leg * .3, -9, 7, 10, 3, '#eef2f7');
    c.save(); c.translate(0, -bob);
    c.save(); c.translate(-9, -26); c.rotate(.3 - arm); rr(c, -3, 0, 6, 17, 3, '#e3e9f2'); c.restore();
    P(c); c.ellipse(0, -22, 12, 15, 0, 0, TAU); fs(c, '#f5f8fc');
    for (let i = 0; i < 7; i++) { const a = Math.PI * .15 + i * .4; poly(c, [Math.cos(a) * 11, -22 + Math.sin(a) * 14, Math.cos(a + .2) * 14, -22 + Math.sin(a + .2) * 16, Math.cos(a + .4) * 11, -22 + Math.sin(a + .4) * 14], '#f5f8fc', false); }
    ell(c, 4, -29, 6.5, 5.5, '#74b9ff');
    circ(c, 3, -30.5, 1.3, '#111', false); circ(c, 7, -30.5, 1.3, '#111', false);
    P(c); c.arc(5, -27, 2, 0, Math.PI); c.strokeStyle = '#2d3436'; c.lineWidth = 1; c.stroke();
    c.save(); c.translate(8, -25); c.rotate(-.4 + arm); rr(c, -3, 0, 6, 17, 3, '#e3e9f2'); c.restore();
    c.restore();
  },
  tiharDog(c, t, mv, act) {
    const bob = mv ? Math.abs(Math.sin(t * 13)) * 1.5 : 0, leg = mv ? Math.sin(t * 13) * 2.6 : 0, wag = Math.sin(t * (mv ? 18 : 10)) * .5;
    [[-7, leg], [-3, -leg], [4, leg], [8, -leg]].forEach(([x, d]) => rr(c, x + d * .3, -6, 3, 6.5, 1.4, '#a0522d'));
    c.save(); c.translate(0, -bob);
    c.save(); c.translate(-10, -12); c.rotate(-.8 + wag); rr(c, -1.3, -8, 2.6, 8, 1.3, '#a0522d'); c.restore();
    ell(c, 0, -10, 11, 5.5, '#c0763b');
    circ(c, 10, -15, 5, '#c0763b');
    ell(c, 8, -19, 2, 4, '#7a4520', true, -.4);
    ell(c, 14, -13.5, 2.6, 2, '#c0763b'); circ(c, 16, -14, 1, '#111', false);
    circ(c, 11.5, -16.5, 1, '#111', false); circ(c, 10.5, -19, 1, '#e74c3c', false);
    for (let i = 0; i < 7; i++) circ(c, 4 + i * 1.3, -11.5 + Math.sin(i * .9) * 2.2, 1.6, i % 2 ? '#ffa502' : '#ff7f00', false);
    c.restore();
  },
  rhodoSpirit(c, t) {
    const fl = -14 + Math.sin(t * 2.4) * 2.2;
    c.save(); c.translate(0, fl);
    c.globalAlpha = .25; circ(c, 0, -6, 15, '#ff7aa2', false); c.globalAlpha = 1;
    ell(c, -7, 2, 5, 2.2, '#2ecc71', true, -.5); ell(c, 7, 2, 5, 2.2, '#2ecc71', true, .5);
    for (let i = 0; i < 5; i++) { const a = i / 5 * TAU + t * .6; ell(c, Math.cos(a) * 6.5, -6 + Math.sin(a) * 6.5, 6, 4.2, i % 2 ? '#ff4d6d' : '#ff6b81', true, a); }
    circ(c, 0, -6, 4.6, '#ffd6e0');
    circ(c, -1.5, -6.5, .9, '#111', false); circ(c, 1.8, -6.5, .9, '#111', false);
    P(c); c.arc(.2, -5, 1.4, .1, Math.PI - .1); c.strokeStyle = '#111'; c.lineWidth = .8; c.stroke();
    for (let i = 0; i < 3; i++) { const a = t * 2 + i * TAU / 3; ell(c, Math.cos(a) * 14, -6 + Math.sin(a) * 7, 2.2, 1.3, '#ff8fab', false, a); }
    c.restore();
  }
};

/** Draw any crew member at origin (feet). mv = moving, act = gathering */
function drawCrewArt(c, id, t, mv, act) {
  if (HUMANS[id]) human(c, HUMANS[id], t, mv, act);
  else if (ANIMALS[id]) ANIMALS[id](c, t, mv, act);
}

/* ---------------- player ---------------- */
function drawPlayer(c, t, mv, swing, dokoCol) {
  human(c, {
    body: '#ff8a3d', trim: '#c0392b', hat: 'beanie', hatC: '#273c75', pants: '#2d3436', skin: '#e3a87a',
    back(c) { rr(c, -15, -32, 10, 24, 3, dokoCol || '#c8913e'); line(c, -14, -24, -6, -24, 'rgba(0,0,0,.25)', 1); line(c, -14, -16, -6, -16, 'rgba(0,0,0,.25)', 1); },
    hand(c, tt) { c.save(); c.rotate(swing > 0 ? -2.2 + swing * 3 : -.4); line(c, 0, 0, 0, -12, '#6d4c41', 1.8); P(c); c.arc(3, -12, 4, Math.PI, Math.PI * 1.9); c.strokeStyle = '#dfe6e9'; c.lineWidth = 2; c.stroke(); c.restore(); }
  }, t, mv, false);
}

/* ---------------- field tiles (cached sprites) ---------------- */
const TILE_ART = {
  tea(c) { circ(c, 0, 2, 13, '#2e7d32'); circ(c, -6, -2, 8, '#43a047'); circ(c, 6, -1, 8, '#388e3c'); circ(c, 0, -6, 8, '#66bb6a'); ell(c, -3, -8, 3, 1.6, '#a5d6a7', false, -.5); ell(c, 5, -4, 3, 1.6, '#a5d6a7', false, .4); },
  ginger(c) { ell(c, -6, 6, 5, 3.5, '#f0a24b'); ell(c, 2, 8, 6, 3.5, '#e8913a'); ell(c, 8, 5, 4, 3, '#f0a24b'); line(c, -2, 4, -6, -12, '#2e7d32', 2.2); line(c, 2, 4, 4, -14, '#43a047', 2.2); line(c, 0, 4, 10, -9, '#2e7d32', 2.2); ell(c, -6, -12, 2, 5, '#66bb6a', false, -.3); ell(c, 4, -14, 2, 5.5, '#81c784', false, .2); },
  crystal(c) { poly(c, [-9, 8, -12, -4, -7, -12, -3, -2], '#81d4fa'); poly(c, [-3, 9, -4, -10, 1, -18, 5, -8, 4, 9], '#4fc3f7'); poly(c, [4, 9, 6, -4, 11, -9, 12, 2], '#29b6f6'); line(c, 0, -14, 1, 4, 'rgba(255,255,255,.8)', 1.4); },
  rhodo(c) { ell(c, -8, 5, 6, 3, '#2e7d32', true, .4); ell(c, 8, 5, 6, 3, '#388e3c', true, -.4); for (let i = 0; i < 5; i++) { const a = i / 5 * TAU - Math.PI / 2; ell(c, Math.cos(a) * 6, -3 + Math.sin(a) * 6, 6, 4.5, i % 2 ? '#e8304f' : '#ff4d6d', true, a); } circ(c, 0, -3, 3, '#ffd166'); },
  clover(c) { circ(c, 0, 3, 12, '#7cb342', false); for (const [x, y] of [[-6, -2], [5, -4], [0, 6], [8, 5], [-7, 7]]) { for (let i = 0; i < 5; i++) { const a = i / 5 * TAU; circ(c, x + Math.cos(a) * 2.6, y + Math.sin(a) * 2.6, 2, '#ffffff', false); } circ(c, x, y, 1.3, '#ffe082', false); } },
  juniper(c) { poly(c, [0, -16, 9, 0, 6, 0, 12, 10, -12, 10, -6, 0, -9, 0], '#1b5e20'); poly(c, [0, -10, 6, 2, -6, 2], '#2e7d32', false); for (const [x, y] of [[-4, 3], [3, -2], [5, 6], [-2, -7], [-6, 8]]) circ(c, x, y, 2, '#5c6bc0'); },
  saffron(c) { ell(c, -7, 6, 2, 7, '#558b2f', false, -.3); ell(c, 7, 6, 2, 7, '#558b2f', false, .3); for (let i = 0; i < 6; i++) { const a = i / 6 * TAU; ell(c, Math.cos(a) * 5, -3 + Math.sin(a) * 5, 5.5, 3.2, i % 2 ? '#9c6ade' : '#b388ff', true, a); } line(c, 0, -3, -2, -10, '#e53935', 1.6); line(c, 0, -3, 2, -10, '#e53935', 1.6); line(c, 0, -3, 0, -11, '#ff5722', 1.6); },
  edelweiss(c) { circ(c, 0, 4, 11, '#9ccc65', false); for (let i = 0; i < 8; i++) { const a = i / 8 * TAU; ell(c, Math.cos(a) * 6, -1 + Math.sin(a) * 6, 5, 2.4, '#fafafa', true, a); } circ(c, 0, -1, 3.4, '#fff59d'); },
  snow(c) { circ(c, 0, 2, 12, '#e3f2fd'); for (let i = 0; i < 6; i++) { const a = i / 6 * TAU; line(c, 0, 0, Math.cos(a) * 11, Math.sin(a) * 11, '#90caf9', 1.6); line(c, Math.cos(a) * 6, Math.sin(a) * 6, Math.cos(a + .5) * 9, Math.sin(a + .5) * 9, '#90caf9', 1.2); } circ(c, 0, 0, 2.4, '#ffffff'); }
};
const TILE_CACHE = {};
function tileSprite(art) {
  if (TILE_CACHE[art]) return TILE_CACHE[art];
  const s = 96, cv = document.createElement('canvas'); cv.width = cv.height = s;
  const c = cv.getContext('2d'); c.translate(s / 2, s / 2); c.scale(2.2, 2.2); TILE_ART[art](c);
  return (TILE_CACHE[art] = cv);
}

/* ---------------- portraits for UI ---------------- */
const PORTRAITS = {};
function portrait(id, blessed) {
  const key = id + (blessed ? '*' : '');
  if (PORTRAITS[key]) return PORTRAITS[key];
  const s = 120, cv = document.createElement('canvas'); cv.width = cv.height = s;
  const c = cv.getContext('2d');
  c.translate(s / 2, s * .86);
  const big = ['yakKing', 'yeti', 'dzo'].includes(id) ? 2.1 : 2.6;
  c.scale(big, big);
  if (blessed) { c.globalAlpha = .55; circ(c, 0, -16, 19, '#ffd24a', false); c.globalAlpha = 1; }
  drawCrewArt(c, id, .4, false, false);
  return (PORTRAITS[key] = cv.toDataURL());
}

/* ---------------- teahouse ---------------- */
function drawTeahouse(c, tier, t) {
  const W = [130, 170, 200, 250, 280][tier], H = [60, 72, 104, 110, 120][tier];
  const wall = ['#b08968', '#8d99ae', '#e9d8a6', '#f1e3c8', '#b5302f'][tier];
  const roof = ['#7f8fa6', '#2e7d32', '#1e6091', '#c0392b', '#e1b12c'][tier];
  c.save();
  ell(c, 0, 6, W * .62, 16, 'rgba(0,0,0,.18)', false);
  if (tier >= 3) { rr(c, W / 2 - 10, -H * .55, 70, H * .55, 4, wall); poly(c, [W / 2 - 16, -H * .55, W / 2 + 66, -H * .55, W / 2 + 54, -H * .55 - 26, W / 2 - 4, -H * .55 - 26], roof); for (let i = 0; i < 2; i++) rr(c, W / 2 + 6 + i * 26, -H * .4, 14, 14, 2, '#ffe39e'); }
  rr(c, -W / 2, -H, W, H, 6, wall);
  if (tier >= 1) for (let i = 0; i < W / 18; i++) rr(c, -W / 2 + 4 + i * 18, -10, 14, 8, 2, 'rgba(0,0,0,.08)', false);
  if (tier >= 2) { rr(c, -W / 2 - 6, -H * .55, W + 12, 6, 2, '#7f5539'); for (let i = 0; i < 9; i++) line(c, -W / 2 + i * W / 8, -H * .55, -W / 2 + i * W / 8, -H * .55 + 14, '#7f5539', 2); }
  const levels = tier === 4 ? 3 : 1;
  for (let L = 0; L < levels; L++) {
    const w = W + 24 - L * 60, y = -H - L * 34, rh = tier === 4 ? 30 : 38;
    poly(c, [-w / 2, y, w / 2, y, w / 2 - 22, y - rh, -w / 2 + 22, y - rh], roof);
    if (tier === 4) { poly(c, [-w / 2 - 6, y, -w / 2 + 6, y - 6, -w / 2 + 10, y], roof); poly(c, [w / 2 + 6, y, w / 2 - 6, y - 6, w / 2 - 10, y], roof); }
  }
  if (tier === 4) { line(c, 0, -H - 3 * 34 + 4, 0, -H - 3 * 34 - 22, '#ffd24a', 4); circ(c, 0, -H - 3 * 34 - 24, 5, '#ffd24a'); }
  if (tier === 0) { rr(c, W / 2 - 30, -H - 52, 10, 20, 2, '#636e72'); }
  else { rr(c, W / 2 - 38, -H - 50 - (tier === 4 ? 60 : 0), 12, 22, 2, '#6d4c41'); }
  rr(c, -12, -38, 24, 38, 4, '#6d4c41'); circ(c, 7, -19, 1.6, '#ffd24a', false);
  const win = (x, y) => { rr(c, x, y, 18, 16, 3, '#ffe39e'); line(c, x + 9, y, x + 9, y + 16, '#7f5539', 1.6); };
  win(-W / 2 + 12, -H + 16); win(W / 2 - 30, -H + 16);
  if (tier >= 2) { win(-W / 2 + 12, -H * .45 + 6); win(W / 2 - 30, -H * .45 + 6); }
  if (tier >= 1) {
    const cols = ['#1e88e5', '#fafafa', '#e53935', '#43a047', '#fdd835'];
    const x1 = -W / 2 - 10, x2 = W / 2 + 10, y0 = -H - 18;
    P(c); c.moveTo(x1, y0); c.quadraticCurveTo(0, y0 + 26, x2, y0); c.strokeStyle = 'rgba(60,40,30,.6)'; c.lineWidth = 1; c.stroke();
    for (let i = 1; i < 14; i++) { const u = i / 14, x = x1 + (x2 - x1) * u, y = y0 + 2 * u * (1 - u) * 26; const f = Math.sin(t * 3 + i) * 2; poly(c, [x - 4, y, x + 4, y, x + f, y + 9], cols[i % 5], false); }
  }
  rr(c, -36, -H + 2, 72, 14, 4, '#3d2b22');
  c.fillStyle = '#ffd24a'; c.font = '800 10px -apple-system,system-ui,sans-serif'; c.textAlign = 'center'; c.fillText('CHIYA', 0, -H + 12.5);
  c.restore();
}

/* ---------------- decor ---------------- */
function drawPine(c, s, snow) {
  rr(c, -2.5 * s, -6 * s, 5 * s, 8 * s, 1.5, '#6d4c41');
  const g = ['#1b5e20', '#2e7d32', '#388e3c'];
  for (let i = 0; i < 3; i++) { const y = -6 * s - i * 9 * s, w = (16 - i * 4) * s; poly(c, [-w, y, w, y, 0, y - 16 * s], g[i]); if (snow) poly(c, [-w * .45, y - 9 * s, w * .45, y - 9 * s, 0, y - 16 * s], '#f5f8fc', false); }
}
function drawRock(c, s, snow) { poly(c, [-14 * s, 0, -10 * s, -10 * s, 2 * s, -14 * s, 13 * s, -6 * s, 14 * s, 0], '#8e9aa8'); poly(c, [-6 * s, -9 * s, 2 * s, -12 * s, 8 * s, -8 * s, 0, -5 * s], snow ? '#f5f8fc' : '#a4b0be', false); }
function drawChorten(c, t) {
  ell(c, 0, 2, 24, 7, 'rgba(0,0,0,.15)', false);
  rr(c, -20, -12, 40, 12, 2, '#f5f6fa'); rr(c, -15, -22, 30, 10, 2, '#f5f6fa');
  P(c); c.arc(0, -22, 13, Math.PI, 0); fs(c, '#f5f6fa');
  rr(c, -6, -42, 12, 8, 2, '#f5f6fa'); circ(c, -2.4, -38, 1, '#2d3436', false); circ(c, 2.4, -38, 1, '#2d3436', false);
  poly(c, [-3, -42, 3, -42, 1, -60, -1, -60], '#ffd24a');
}
function drawFlagLine(c, x1, y1, x2, y2, t) {
  const cols = ['#1e88e5', '#fafafa', '#e53935', '#43a047', '#fdd835'];
  line(c, x1, y1, x1, y1 + 40, '#6d4c41', 2.4); line(c, x2, y2, x2, y2 + 40, '#6d4c41', 2.4);
  P(c); c.moveTo(x1, y1); c.quadraticCurveTo((x1 + x2) / 2, (y1 + y2) / 2 + 18, x2, y2); c.strokeStyle = 'rgba(60,40,30,.5)'; c.lineWidth = 1; c.stroke();
  const n = Math.max(6, Math.round(Math.hypot(x2 - x1, y2 - y1) / 11));
  for (let i = 1; i < n; i++) {
    const u = i / n, x = x1 + (x2 - x1) * u, y = y1 + (y2 - y1) * u + 4 * u * (1 - u) * 18;
    const f = Math.sin(t * 4 + i * .8) * 2.5;
    poly(c, [x - 4, y, x + 4, y, x + 4 + f * .3, y + 9, x - 4 + f, y + 9], cols[i % 5], false);
  }
}
