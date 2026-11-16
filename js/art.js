'use strict';
/* =========================================================
   CHIYA — vector art: crew, player, tiles, teahouse, decor
   Everything is drawn facing right with feet at (0,0).
   ========================================================= */
const TAU = Math.PI * 2;
const OUT = '#2b2233';

function P(c) { c.beginPath(); }
function fs(c, fill, lw = 1.9) { c.fillStyle = fill; c.fill(); c.lineWidth = lw; c.strokeStyle = OUT; c.stroke(); }
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
  bowl(c) { P(c); c.arc(0, -27.5, 7.4, Math.PI * 1.05, -0.05); fs(c, '#2d1e14'); },
  crown(c, o) { poly(c, [-7, -31, -7, -38, -3.5, -34, 0, -40, 3.5, -34, 7, -38, 7, -31], '#ffd24a'); circ(c, 0, -34.5, 1.8, o.hatC || '#e5484d'); circ(c, -5, -32.5, 1, o.hatC || '#e5484d', false); circ(c, 5, -32.5, 1, o.hatC || '#e5484d', false); },
  mask(c, o) { P(c); c.ellipse(1.5, -26.5, 7.5, 6.5, 0, 0, TAU); fs(c, o.hatC || '#9b6ef3'); ell(c, 3, -27.5, 1.6, 1, '#fff', false); ell(c, 6.5, -27.5, 1.6, 1, '#fff', false); line(c, -6, -33, -9, -38, '#ffd24a', 1.8); line(c, 6, -33, 9, -38, '#ffd24a', 1.8); },
  slouch(c) { ell(c, 0, -29.5, 11, 2.6, '#4b6b3a'); P(c); c.arc(0, -30, 6.5, Math.PI, 0); fs(c, '#4b6b3a'); poly(c, [-10, -30, -6, -34, -4, -30], '#4b6b3a'); rr(c, -6, -31.5, 12, 2, 1, '#2d3b22', false); },
  bun(c) { circ(c, -6.5, -31, 3.6, '#2d1e14'); P(c); c.arc(0, -27, 7.5, Math.PI * 1.08, -0.15); fs(c, '#2d1e14'); rr(c, -9, -32.6, 5, 1.6, .8, '#e5484d', false); },
  furhat(c) { circ(c, -6.5, -24, 3.5, '#c8a27a'); circ(c, 0, -30, 8.4, '#c8a27a'); for (let i = 0; i < 7; i++) circ(c, -7 + i * 2.4, -35.5 + Math.abs(i - 3) * .9, 1.8, '#e6cfae', false); rr(c, -8.5, -29.5, 17, 4, 2, '#a5814f'); },
  braids(c) { P(c); c.arc(0, -27, 7.5, Math.PI * 1.05, -0.05); fs(c, '#1f1610'); line(c, -6, -24, -7.5, -14, OUT, 4.4); line(c, -6, -24, -7.5, -14, '#1f1610', 2.6); circ(c, -7.6, -13.5, 1.6, '#1abc9c'); rr(c, -5, -33.2, 10, 2, 1, '#e84393', false); circ(c, 0, -33.2, 1.4, '#1abc9c', false); }
};

function human(c, o, t, mv, act) {
  const bob = mv ? Math.abs(Math.sin(t * 11)) * 2 : Math.sin(t * 2.2) * .5;
  const leg = mv ? Math.sin(t * 11) * 3 : 0;
  const arm = mv ? Math.sin(t * 11) * 2.5 : act ? Math.sin(t * 18) * 3 : 0;
  rr(c, -5 - leg * .4, -6.5, 4.4, 7, 2.2, o.pants || '#3b3f58');
  rr(c, 0.6 + leg * .4, -6.5, 4.4, 7, 2.2, o.pants || '#3b3f58');
  c.save(); c.translate(0, -bob);
  if (o.back) o.back(c, t);
  rr(c, -6.8, -17, 13.6, 12.5, 5.5, o.body);
  if (o.trim) rr(c, -6.8, -9.8, 13.6, 2.6, 1.2, o.trim, false);
  if (o.apron) rr(c, -1, -15, 6.5, 10, 2.5, '#ffffff');
  circ(c, 0, -24.5, 9, o.skin || '#e0a878');
  ell(c, -3.6, -28.4, 2.6, 1.5, 'rgba(255,255,255,.38)', false, -.5);
  ell(c, 2.4, -24.2, 1.3, 2, '#1d1a26', false);
  ell(c, 6.2, -24.2, 1.3, 2, '#1d1a26', false);
  circ(c, 2.7, -24.9, .45, '#ffffff', false); circ(c, 6.5, -24.9, .45, '#ffffff', false);
  if (!o.noBlush) ell(c, 5.2, -20.7, 1.7, 1, 'rgba(255,110,110,.45)', false);
  c.save(); c.translate(0, -24.5); c.scale(1.29, 1.29); c.translate(0, 26.5);
  (HATS[o.hat] || HATS.none)(c, o);
  c.restore();
  c.save(); c.translate(1.8, -14.5); c.rotate(arm * .08);
  rr(c, -1.8, 0, 3.6, 7.5, 1.8, o.arm || o.body);
  if (o.hand) { c.translate(0, 7); o.hand(c, t, act); }
  c.restore();
  if (o.front) o.front(c, t);
  c.restore();
}

const ITEMSART = {
  basket(c) { poly(c, [-15, -27, -4, -27, -5, -6, -13, -6], '#d79d4a'); line(c, -14, -20, -5, -20, '#8a5a22', 1.2); line(c, -13.5, -13, -5, -13, '#8a5a22', 1.2); line(c, -9.5, -27, -9.2, -6, '#8a5a22', 1.2); },
  poles(c, t, act) { line(c, 0, 0, 7, 10, '#555', 1.6); },
  smallBasket(c) { rr(c, -3, -1, 7, 5, 2, '#c8913e'); circ(c, 0, -1.5, 2, '#5aa24a', false); },
  root(c) { ell(c, 1, 1, 3.4, 2.2, '#f0a24b'); },
  gagri(c) { circ(c, 8, -12, 5, '#c8742b'); rr(c, 6.2, -18.5, 3.6, 3, 1, '#a65d1c'); ell(c, 6.5, -13.5, 1.5, 1, 'rgba(255,255,255,.4)', false); },
  camera(c) { rr(c, -2, -1, 7, 5, 1.5, '#2d3436'); circ(c, 2.5, 1.5, 1.6, '#74b9ff', false); },
  rope(c) { P(c); c.arc(-4, -11.5, 4.2, 0, TAU); c.strokeStyle = '#f1c40f'; c.lineWidth = 2.2; c.stroke(); },
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
  fireKid:      { body: '#e5484d', trim: '#f5c518', hat: 'bowl', skin: '#d29a6a', pants: '#3b3f58', hand(c, t) { rr(c, -1.5, -6, 3, 7, 1, '#e5484d'); line(c, 0, -6, 2, -9, '#5d4037', 1); circ(c, 2.5, -9.5, 1.4 + Math.sin(t * 20) * .5, '#ffd24a', false); } },
  iceFisher:    { body: '#2e86c1', trim: '#e0f3fc', hat: 'beanie', hatC: '#e0f3fc', pants: '#2d3436', skin: '#c98c5f', hand(c) { line(c, 0, 2, 8, -22, OUT, 3); line(c, 0, 2, 8, -22, '#8a5a3b', 1.6); P(c); c.moveTo(8, -22); c.quadraticCurveTo(14, -16, 12, -4); c.strokeStyle = 'rgba(255,255,255,.8)'; c.lineWidth = .8; c.stroke(); circ(c, 12, -4, 1.4, '#e5484d', false); } },
  woolSpinner:  { body: '#dfe3f1', trim: '#8e9bd6', hat: 'braids', skin: '#c98c5f', pants: '#6f7fd0', hand(c, t) { line(c, 0, 4, 0, -8, '#8a5a3b', 1.6); c.save(); c.translate(0, -2); c.rotate(t * 8); ell(c, 0, 0, 4, 1.6, '#ffffff'); c.restore(); circ(c, 0, -9, 2.6, '#ffffff'); } },
  ropeFixer:    { body: '#ff8a3d', trim: '#2d3436', hat: 'helmet', hatC: '#f5c518', pants: '#2d3436', front(c) { P(c); c.arc(-3, -11, 4.5, 0, TAU); c.strokeStyle = '#3fae6b'; c.lineWidth = 2.2; c.stroke(); P(c); c.arc(-3, -11, 2.4, 0, TAU); c.stroke(); } },
  littleMonk:   { body: '#a52a2a', trim: '#f5b51e', hat: 'shaved', skin: '#e0a878', pants: '#a52a2a', small: true, hand(c, t) { P(c); c.moveTo(0, 0); c.bezierCurveTo(-3, -4, -6, 0, 0, 4); c.bezierCurveTo(6, 0, 3, -4, 0, 0); c.fillStyle = '#ff6b8a'; c.fill(); } },
  teaMaster:    { body: '#f6ead3', trim: '#3fae6b', hat: 'none', skin: '#d29a6a', pants: '#3fae6b', front(c) { circ(c, 0, -32.5, 2.6, '#2d1e14', false); }, hand(c) { circ(c, 3, 1, 4.5, '#3fae6b'); rr(c, 0, -4, 6, 2.4, 1.2, '#2b7a4b'); line(c, 7, 0, 11, -3, '#3fae6b', 1.8); } },
  gurkha:       { body: '#4b6b3a', trim: '#2d3b22', hat: 'slouch', skin: '#b9784c', pants: '#3a4f2c', hand(c) { P(c); c.moveTo(0, 1); c.quadraticCurveTo(7, -2, 10, 4); c.quadraticCurveTo(6, 2, 0, 3); c.closePath(); fs(c, '#dfe6e9', 1.2); rr(c, -3, 0, 4, 3, 1, '#5d4037', false); } },
  kiteFlyer:    { body: '#00b894', trim: '#fdcb6e', hat: 'bowl', hand: ITEMSART.kite, skin: '#d29a6a', pants: '#e17055' }
};

/* ---------------- quest givers ---------------- */
const NPCART = {
  ang: { body: '#8d6e4f', trim: '#5d4037', hat: 'headband', back(c) { poly(c, [-17, -32, -4, -32, -5, -6, -15, -6], '#d79d4a'); line(c, -16, -24, -5, -24, '#8a5a22', 1.2); line(c, -15.5, -15, -5, -15, '#8a5a22', 1.2); rr(c, -16, -40, 12, 8, 2, '#4f8bd6'); }, skin: '#b9784c', pants: '#3b3f58' },
  maya: { body: '#ffd166', trim: '#e84393', hat: 'sunhat', skin: '#f3c6a5', pants: '#4f8bd6', back(c) { rr(c, -14, -24, 9, 16, 3, '#e84393'); }, hand: ITEMSART.camera },
  raju: { body: '#2e86c1', trim: '#e0a43c', hat: 'topi', skin: '#c98c5f', pants: '#5d4037', back(c) { rr(c, -18, -30, 13, 24, 3, '#a0522d'); rr(c, -19, -34, 15, 6, 2, '#e0a43c'); circ(c, -11.5, -18, 2, '#e5484d', false); } },
  didi: { body: '#ff8a3d', trim: '#c0392b', apron: true, hat: 'bun', skin: '#d29a6a', pants: '#7f3f2a',
    hand(c, t) { c.save(); c.rotate(-.3); circ(c, 4, 1, 5, '#d4d8de'); rr(c, 1, -5, 6, 2.5, 1.2, '#b0b6be'); P(c); c.moveTo(8, 0); c.lineTo(13, -4); c.strokeStyle = OUT; c.lineWidth = 3; c.stroke(); c.strokeStyle = '#d4d8de'; c.lineWidth = 1.6; c.stroke(); c.restore(); } },
  pemba: { body: '#e5484d', trim: '#f5c518', hat: 'furhat', skin: '#b9784c', pants: '#3b3f58',
    front(c) { P(c); c.moveTo(-1, -21); c.quadraticCurveTo(3, -11, 8, -20); c.quadraticCurveTo(8, -24, 4, -22); c.closePath(); fs(c, '#f2f2f2', 1.6); },
    hand(c) { line(c, 2, 8, 2, -26, OUT, 4.4); line(c, 2, 8, 2, -26, '#8a5a3b', 2.6); circ(c, 2, -27, 2.8, '#c8a27a'); } },
  dolma: { body: '#16a085', trim: '#e84393', hat: 'braids', skin: '#c98c5f', pants: '#5b3a6b',
    hand(c) { P(c); c.moveTo(1, 9); c.lineTo(1, -18); c.quadraticCurveTo(1, -25, 6, -24); c.quadraticCurveTo(9, -23, 8, -19); c.strokeStyle = OUT; c.lineWidth = 4; c.lineCap = 'round'; c.stroke(); c.strokeStyle = '#a77b4f'; c.lineWidth = 2.2; c.stroke(); } },
  norbu: { body: '#8e2a2a', trim: '#f39c12', hat: 'lamaHat', skin: '#d29a6a', pants: '#8e2a2a',
    front(c) { P(c); c.arc(1, -13, 5, .2, Math.PI - .2); c.strokeStyle = '#f5c518'; c.lineWidth = 1.8; c.setLineDash([1.6, 1.2]); c.stroke(); c.setLineDash([]); },
    hand(c, t) { line(c, 0, 0, 0, -8, '#8a5a3b', 1.6); c.save(); c.translate(0, -11); c.rotate(Math.sin(t * 6) * .2); rr(c, -4, -4, 8, 8, 2, '#f5b51e'); line(c, -4, -1, 4, -1, '#c0392b', 1.2); line(c, -4, 2, 4, 2, '#c0392b', 1.2); c.restore(); } }
};
function drawNpc(c, id, t) {
  if (id === 'yeti') {
    ANIMALS.yeti(c, t, false, false);
    P(c); c.ellipse(4, -18, 9, 3.5, -.1, 0, TAU); fs(c, '#e5484d', 1.6); rr(c, -6, -18, 4, 10, 2, '#e5484d');
    for (let i = 0; i < 6; i++) circ(c, -4 + i * 3, -14 + Math.sin(i) * 1, 1.3, i % 2 ? '#1abc9c' : '#f5c518', false);
    return;
  }
  human(c, NPCART[id], t, false, false);
}
const NPC_PORTRAIT = {};
function npcPortrait(id) {
  if (NPC_PORTRAIT[id]) return NPC_PORTRAIT[id];
  const s = 120, cv = document.createElement('canvas'); cv.width = cv.height = s;
  const c = cv.getContext('2d'); c.translate(s / 2, s * .9); c.scale(id === 'yeti' ? 2.4 : 2.9, id === 'yeti' ? 2.4 : 2.9); drawNpc(c, id, .5);
  return (NPC_PORTRAIT[id] = cv.toDataURL());
}

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

ANIMALS.mistYak = (c, t, mv, a) => { c.save(); c.globalAlpha = .85; yak(c, t, mv, a, { s: 1.05, fur: '#eef2fb', fringe: '#cfd6ec', leg: '#b8c1de', horn: '#9fb0dd', nose: '#8e9bd6' }); c.restore(); for (let k = 0; k < 3; k++) { c.globalAlpha = .35; circ(c, -14 + k * 12 + Math.sin(t * 2 + k) * 2, -4, 6, '#ffffff', false); c.globalAlpha = 1; } };
ANIMALS.naga = (c, t, mv) => {
  const w = Math.sin(t * (mv ? 10 : 3));
  P(c); c.moveTo(-16, -4); c.bezierCurveTo(-10, -10 + w * 3, -4, 2 - w * 3, 4, -6); c.lineCap = 'round'; c.strokeStyle = OUT; c.lineWidth = 9; c.stroke(); c.strokeStyle = '#2ea4dc'; c.lineWidth = 6.5; c.stroke();
  circ(c, 6, -12, 6.5, '#2ea4dc'); for (let k = 0; k < 5; k++) { const an = Math.PI * (1.05 + k * .2); ell(c, 6 + Math.cos(an) * 8, -12 + Math.sin(an) * 8, 3.4, 2, '#1abc9c', true, an); }
  circ(c, 8.5, -13, 1.3, '#fff3a6', false); circ(c, 8.7, -13, .6, '#111', false); line(c, 11.5, -10, 14, -9, '#e5484d', 1);
};
ANIMALS.skyLantern = (c, t) => {
  const fl = -16 + Math.sin(t * 2) * 3;
  c.save(); c.translate(0, fl); c.globalAlpha = .35; circ(c, 0, -6, 15, '#ffd27a', false); c.globalAlpha = 1;
  P(c); c.moveTo(-8, 4); c.quadraticCurveTo(-12, -10, -6, -18); c.lineTo(6, -18); c.quadraticCurveTo(12, -10, 8, 4); c.closePath(); fs(c, '#ff8a3d');
  rr(c, -6, 3, 12, 3, 1.5, '#9a6a45'); line(c, -3, -17, -4, 3, 'rgba(255,255,255,.4)', 1); line(c, 3, -17, 4, 3, 'rgba(255,255,255,.4)', 1);
  circ(c, -2.5, -8, 1.1, '#2b2233', false); circ(c, 2.5, -8, 1.1, '#2b2233', false); P(c); c.arc(0, -6, 1.6, .2, Math.PI - .2); c.strokeStyle = '#2b2233'; c.lineWidth = .8; c.stroke();
  circ(c, 0, 7 + Math.sin(t * 9), 1.8, '#ffe36e', false);
  c.restore();
};
ANIMALS.bear = (c, t, mv, act) => {
  const bob = mv ? Math.abs(Math.sin(t * 8)) * 1.6 : 0, leg = mv ? Math.sin(t * 8) * 2.5 : 0;
  [[-9, leg], [-4, -leg], [5, leg], [10, -leg]].forEach(([x, d]) => rr(c, x + d * .3, -8, 4.4, 8.5, 2, '#2b2b33'));
  c.save(); c.translate(0, -bob);
  ell(c, 0, -13, 14, 9, '#34343d');
  circ(c, 13, -17, 7, '#34343d'); circ(c, 9.5, -23, 2.6, '#34343d'); circ(c, 16, -23, 2.6, '#34343d');
  ell(c, 17.5, -15.5, 3.2, 2.4, '#c8a27a'); circ(c, 19.6, -16.4, 1, '#111', false); circ(c, 14.5, -19, 1.1, '#fff', false); circ(c, 14.6, -19, .5, '#111', false);
  poly(c, [6, -13, 12, -9, 9, -15], '#f2f2f2', false);
  c.restore();
};
/** Draw any crew member at origin (feet). mv = moving, act = gathering */
function drawCrewArt(c, id, t, mv, act) {
  if (HUMANS[id]) { if (HUMANS[id].small) { c.save(); c.scale(.8, .8); human(c, HUMANS[id], t, mv, act); c.restore(); } else human(c, HUMANS[id], t, mv, act); }
  else if (ANIMALS[id]) ANIMALS[id](c, t, mv, act);
}

/* ---------------- player ---------------- */
const PLAYER_HAT = { woolCap: ['beanie', '#9aa3c7'], gingerTopi: ['topi'], iceHood: ['beanie', '#4fb6e6'], sherpaHat: ['furhat'], emberCrown: ['crown', '#e5484d'], frostCrown: ['crown', '#4fb6e6'], cloudCrown: ['crown', '#ffffff'], spiritMask: ['mask', '#9b6ef3'] };
function drawPlayer(c, t, mv, swing, dokoCol, gear) {
  gear = gear || {};
  const ph = PLAYER_HAT[gear.hat] || ['beanie', '#273c75'];
  human(c, {
    body: '#ff8a3d', trim: '#c0392b', hat: ph[0], hatC: ph[1], pants: '#2d3436', skin: '#e3a87a',
    back(c) { rr(c, -15, -32, 10, 24, 3, dokoCol || '#c8913e'); line(c, -14, -24, -6, -24, 'rgba(0,0,0,.25)', 1); line(c, -14, -16, -6, -16, 'rgba(0,0,0,.25)', 1); },
    hand(c, tt) { c.save(); c.rotate(swing > 0 ? -2.2 + swing * 3 : -.4); circ(c, 2, -8, 8, 'rgba(255,255,255,.85)', false); drawIcon(c, gear.toolIcon || 'sickle', 2, -8, 13, gear.toolCol || '#5d6670', 2.6); c.restore(); }
  }, t, mv, false);
}

/* ---------------- blender ---------------- */
function drawBlender(c, t) {
  ell(c, 0, 4, 50, 12, 'rgba(0,0,0,.15)', false);
  rr(c, -40, -22, 80, 24, 5, '#b98455'); line(c, -36, -12, 36, -12, 'rgba(0,0,0,.15)', 2);
  rr(c, -16, -36, 32, 16, 4, '#5d6670');
  P(c); c.moveTo(-14, -36); c.lineTo(-18, -84); c.lineTo(18, -84); c.lineTo(14, -36); c.closePath(); fs(c, 'rgba(190,230,255,.75)', 2.2);
  c.save(); P(c); c.moveTo(-13, -38); c.lineTo(-16.5, -74); c.lineTo(16.5, -74); c.lineTo(13, -38); c.closePath(); c.clip();
  for (let k = 0; k < 3; k++) { c.fillStyle = ['#f05a3a', '#4fb6e6', '#ffffff'][k]; c.beginPath(); c.arc(Math.sin(t * 3 + k * 2) * 7, -48 - k * 7 + Math.cos(t * 4 + k) * 3, 7, 0, TAU); c.fill(); }
  c.restore();
  rr(c, -20, -90, 40, 7, 3, '#e5484d');
  c.font = '900 10px -apple-system,system-ui,sans-serif'; const tw = c.measureText('Blender').width + 30;
  P(c); c.roundRect(-tw / 2, -118, tw, 22, 11); fs(c, '#ffffff', 1.8);
  drawIcon(c, 'blender', -tw / 2 + 13, -107, 12, '#2ea4dc', 2.4);
  c.fillStyle = OUT; c.textAlign = 'left'; c.fillText('Blender', -tw / 2 + 23, -103);
}

/* ---------------- mandala shrine ---------------- */
function drawMandalaShrine(c, t) {
  ell(c, 0, 4, 70, 16, 'rgba(0,0,0,.15)', false);
  rr(c, -60, -18, 120, 20, 5, '#d8cfc2'); rr(c, -48, -30, 96, 14, 4, '#e6ded2');
  c.save(); c.translate(0, -70); c.rotate(t * .6);
  for (let k = 0; k < 12; k++) { c.rotate(TAU / 12); ell(c, 22, 0, 14, 6, k % 2 ? '#9b6ef3' : '#f0b429'); }
  circ(c, 0, 0, 14, '#ffffff'); circ(c, 0, 0, 8, '#1abc9c');
  c.restore();
  line(c, 0, -30, 0, -48, OUT, 5); line(c, 0, -30, 0, -48, '#9a6a45', 3);
  c.font = '900 10px -apple-system,system-ui,sans-serif'; const tw = c.measureText('Mandala Shrine').width + 30;
  P(c); c.roundRect(-tw / 2, -128, tw, 22, 11); fs(c, '#ffffff', 1.8);
  drawIcon(c, 'wheel', -tw / 2 + 13, -117, 12, '#9b6ef3', 2.4);
  c.fillStyle = OUT; c.textAlign = 'left'; c.fillText('Mandala Shrine', -tw / 2 + 23, -113);
}

/* ---------------- shops ---------------- */
function drawShop(c, sh, t) {
  ell(c, 0, 4, 66, 14, 'rgba(0,0,0,.15)', false);
  rr(c, -54, -46, 108, 46, 6, '#f2e3c6');
  rr(c, -46, -30, 26, 22, 3, '#ffe6a3'); line(c, -33, -30, -33, -8, '#9a6a45', 1.6);
  P(c); c.roundRect(-8, -38, 24, 38, [9, 9, 2, 2]); fs(c, '#9a6a45', 2);
  rr(c, 24, -30, 22, 18, 3, '#ffe6a3');
  P(c); c.moveTo(-64, -46); c.lineTo(64, -46); c.lineTo(52, -70); c.lineTo(-52, -70); c.closePath(); fs(c, sh.col, 2.4);
  for (let i = 0; i < 8; i++) { P(c); c.arc(-56 + i * 16, -46, 8, 0, Math.PI); fs(c, i % 2 ? sh.col : '#fff6e6', 2); }
  rr(c, -50, -70, 100, 5, 2.5, 'rgba(255,255,255,.35)', false);
  c.font = '900 10px -apple-system,system-ui,sans-serif'; const tw = c.measureText(sh.n).width + 30;
  P(c); c.roundRect(-tw / 2, -100 + Math.sin(t * 2) * 1.5, tw, 22, 11); fs(c, '#ffffff', 1.8);
  drawIcon(c, 'shop', -tw / 2 + 13, -89 + Math.sin(t * 2) * 1.5, 12, sh.col, 2.4);
  c.fillStyle = OUT; c.textAlign = 'left'; c.fillText(sh.n, -tw / 2 + 23, -85 + Math.sin(t * 2) * 1.5);
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
const FLOWER = {
  cloud: { p: '#ffffff', p2: '#e9ecfb', c: '#ffcf4d' },
  spice: { p: '#ff5d5d', p2: '#ff9a7a', c: '#ffd166' },
  ice:   { p: '#45aee6', p2: '#9edcff', c: '#ffffff' }
};
function drawFlower(c, col, lv) {
  const F = FLOWER[col], R = [0, 7, 8.5, 10, 11.5, 12.5][lv];
  if (lv >= 2) { ell(c, -9, 7, 6, 2.6, '#5aab4f', true, .5); ell(c, 9, 7, 6, 2.6, '#4c9a45', true, -.5); }
  if (lv >= 5) { c.save(); c.globalAlpha = .35; circ(c, 0, 0, R + 6, '#ffe36e', false); c.restore(); }
  const n = [0, 5, 6, 7, 8, 9][lv];
  for (let i = 0; i < n; i++) { const a = i / n * TAU - Math.PI / 2; ell(c, Math.cos(a) * R * .55, Math.sin(a) * R * .55, R * .58, R * .38, F.p, true, a); }
  if (lv >= 3) for (let i = 0; i < n; i++) { const a = (i + .5) / n * TAU - Math.PI / 2; ell(c, Math.cos(a) * R * .33, Math.sin(a) * R * .33, R * .38, R * .25, F.p2, true, a); }
  circ(c, 0, 0, R * (lv >= 4 ? .3 : .26), F.c);
  if (lv >= 4) circ(c, -R * .08, -R * .1, R * .1, 'rgba(255,255,255,.8)', false);
  if (lv >= 5) for (let i = 0; i < 4; i++) { const a = i / 4 * TAU + .4; circ(c, Math.cos(a) * (R + 3), Math.sin(a) * (R + 3), 1.3, '#fff3a6', false); }
}
const TILE_CACHE = {};
function flowerSprite(col, lv) {
  const k = col + lv;
  if (TILE_CACHE[k]) return TILE_CACHE[k];
  const s = 96, cv = document.createElement('canvas'); cv.width = cv.height = s;
  const c = cv.getContext('2d'); c.translate(s / 2, s / 2); c.scale(2.6, 2.6); drawFlower(c, col, lv);
  return (TILE_CACHE[k] = cv);
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
const ROOF = ['#8c9bb0', '#4aa564', '#3489c9', '#d9534f', '#e8b33a'];
function roofShape(c, w, y, h, col) {
  P(c); c.moveTo(-w / 2 - 14, y); c.lineTo(w / 2 + 14, y); c.lineTo(w / 2 - 8, y - h); c.lineTo(-w / 2 + 8, y - h); c.closePath(); fs(c, col, 2.4);
  rr(c, -w / 2 + 10, y - h - 1, w - 20, 5, 2.5, 'rgba(255,255,255,.35)', false);
  line(c, -w / 2 - 10, y - 3, w / 2 + 10, y - 3, 'rgba(0,0,0,.15)', 3);
}
function drawTeahouse(c, tier, t) {
  const W = [120, 140, 150, 160, 170][tier], H = 58, rc = ROOF[tier];
  ell(c, 0, 4, W * .7, 14, 'rgba(0,0,0,.16)', false);
  if (tier >= 3) {                                  // side wing
    rr(c, W / 2 - 6, -40, 56, 40, 4, '#efe2c8'); roofShape(c, 56, -40, 18, rc); c.save(); c.translate(W / 2 + 22, 0); rr(c, -8, -30, 16, 14, 3, '#ffe6a3'); c.restore();
  }
  rr(c, -W / 2 - 6, -12, W + 12, 14, 4, '#bdb4a8', true);
  for (let i = 0; i < 6; i++) line(c, -W / 2 + i * (W + 12) / 6, -11, -W / 2 + i * (W + 12) / 6, 0, 'rgba(0,0,0,.12)', 1.4);
  rr(c, -W / 2, -H, W, H - 10, 4, '#f6ead3', true);
  line(c, -W / 2 + 4, -H + 2, -W / 2 + 4, -12, '#9a6a45', 4); line(c, W / 2 - 4, -H + 2, W / 2 - 4, -12, '#9a6a45', 4);
  P(c); c.roundRect(-11, -42, 22, 30, [10, 10, 2, 2]); fs(c, '#9a6a45', 2); circ(c, 6, -26, 1.6, '#ffd24a', false);
  const win = x => { rr(c, x, -44, 20, 16, 3, '#ffe6a3', true); line(c, x + 10, -44, x + 10, -28, '#9a6a45', 1.8); line(c, x, -36, x + 20, -36, '#9a6a45', 1.8); };
  win(-W / 2 + 12); win(W / 2 - 32);
  let top = -H;
  if (tier >= 2) {                                  // second floor
    roofShape(c, W, top, 12, rc);
    rr(c, -W / 2 + 14, top - 44, W - 28, 34, 4, '#f6ead3', true);
    for (let i = 0; i < 3; i++) rr(c, -W / 2 + 26 + i * (W - 52) / 2 - 8, top - 38, 16, 14, 3, '#ffe6a3', true);
    top -= 44;
    roofShape(c, W - 28, top, 30, rc);
  } else roofShape(c, W, top, 34, rc);
  const peak = top - (tier >= 2 ? 30 : 34);
  rr(c, -26, top - 2, 52, 14, 5, '#3d2b22', true);
  c.fillStyle = '#ffd24a'; c.font = '900 9px -apple-system,system-ui,sans-serif'; c.textAlign = 'center'; c.fillText('CHIYA', 0, top + 8.5);
  rr(c, W / 2 - 34, peak - 4, 10, 18, 2, '#8a8f99', true);
  if (tier === 4) { line(c, 0, peak, 0, peak - 20, OUT, 5); line(c, 0, peak, 0, peak - 20, '#ffd24a', 3); circ(c, 0, peak - 22, 4.5, '#ffd24a'); }
  if (tier >= 1) {
    const cols = ['#3d8fe0', '#ffffff', '#e5484d', '#3fae6b', '#f5c518'];
    const x1 = -W / 2 - 12, x2 = W / 2 + 12, y0 = -H + 2;
    P(c); c.moveTo(x1, y0); c.quadraticCurveTo(0, y0 + 18, x2, y0); c.strokeStyle = 'rgba(43,34,51,.5)'; c.lineWidth = 1; c.stroke();
    for (let i = 1; i < 12; i++) { const u = i / 12, x = x1 + (x2 - x1) * u, y = y0 + 2 * u * (1 - u) * 18; const f = Math.sin(t * 3 + i) * 1.5; poly(c, [x - 4, y, x + 4, y, x + f, y + 8], cols[i % 5], false); }
  }
  return peak;
}
function drawStall(c, t, brewing) {
  ell(c, 0, 4, 46, 9, 'rgba(0,0,0,.15)', false);
  rr(c, -36, -26, 72, 26, 5, '#b98455', true);
  line(c, -32, -14, 32, -14, 'rgba(0,0,0,.15)', 2);
  line(c, -30, -26, -30, -62, OUT, 5); line(c, -30, -26, -30, -62, '#8a5a3b', 3);
  line(c, 30, -26, 30, -62, OUT, 5); line(c, 30, -26, 30, -62, '#8a5a3b', 3);
  P(c); c.moveTo(-42, -60); c.lineTo(42, -60); c.lineTo(36, -74); c.lineTo(-36, -74); c.closePath(); fs(c, '#ff8a3d', 2.2);
  for (let i = 0; i < 6; i++) { P(c); c.arc(-35 + i * 14, -60, 7, 0, Math.PI); fs(c, i % 2 ? '#ff8a3d' : '#fff3e0', 2); }
  circ(c, -10, -33, 9, '#5d6670'); rr(c, -15, -44, 10, 4, 2, '#3f464e'); P(c); c.moveTo(-2, -36); c.quadraticCurveTo(6, -38, 8, -44); c.strokeStyle = OUT; c.lineWidth = 3.4; c.stroke(); c.strokeStyle = '#5d6670'; c.lineWidth = 1.8; c.stroke();
  rr(c, 10, -36, 8, 9, 2, '#fff7e6'); rr(c, 21, -34, 7, 7, 2, '#fff7e6');
  rr(c, -22, -100 + Math.sin(t * 3) * 2, 44, 18, 9, brewing ? '#3fae6b' : '#ffffff', true);
  c.fillStyle = brewing ? '#ffffff' : '#2b2233'; c.font = '900 9px -apple-system,system-ui,sans-serif'; c.textAlign = 'center'; c.fillText(brewing ? 'BREWING' : 'SELL', 0, -88 + Math.sin(t * 3) * 2);
}

/* ---------------- decor ---------------- */
function drawCloud(c, s) {
  c.save(); c.globalAlpha = .9;
  P(c); c.arc(-20 * s, 0, 14 * s, Math.PI * .5, Math.PI * 1.5); c.arc(-4 * s, -12 * s, 16 * s, Math.PI, 0); c.arc(18 * s, -4 * s, 13 * s, Math.PI * 1.3, Math.PI * .5); c.closePath();
  c.fillStyle = '#ffffff'; c.fill(); c.strokeStyle = 'rgba(120,160,190,.55)'; c.lineWidth = 2; c.stroke();
  c.restore();
}
function drawIcicle(c, s) {
  ell(c, 0, 1, 14 * s, 4 * s, 'rgba(60,110,150,.18)', false);
  poly(c, [-10 * s, 0, -6 * s, -22 * s, -1 * s, 0], '#bfe6ff'); poly(c, [-3 * s, 0, 3 * s, -34 * s, 8 * s, 0], '#9fd8ff'); poly(c, [5 * s, 0, 10 * s, -18 * s, 13 * s, 0], '#d6f0ff');
  line(c, 2 * s, -26 * s, 3.5 * s, -6 * s, 'rgba(255,255,255,.8)', 1.4);
}
function drawSummitFlag(c, t) {
  ell(c, 0, 2, 26, 7, 'rgba(0,0,0,.12)', false);
  poly(c, [-22, 0, -10, -10, 8, -12, 22, 0], '#dfe8f0');
  line(c, 0, -6, 0, -78, OUT, 5); line(c, 0, -6, 0, -78, '#8a5a3b', 3);
  const w = Math.sin(t * 4) * 4;
  P(c); c.moveTo(2, -76); c.quadraticCurveTo(22, -76 + w, 40, -70); c.lineTo(38, -56); c.quadraticCurveTo(20, -60 + w, 2, -58); c.closePath(); fs(c, '#ff8a3d', 2);
  const cols = ['#3d8fe0', '#ffffff', '#e5484d', '#3fae6b', '#f5c518'];
  for (const dir of [-1, 1]) for (let i = 1; i < 7; i++) { const x = dir * i * 11, y = -70 + i * 9; const f = Math.sin(t * 4 + i) * 1.5; poly(c, [x - 3.5, y, x + 3.5, y, x + f, y + 8], cols[i % 5], false); }
}

function drawTreeRound(c, s, col) {
  rr(c, -3 * s, -14 * s, 6 * s, 15 * s, 2, '#8a5a3b');
  const g = col || '#58a64a', hi = col ? '#ffd27a' : '#7cc560';
  circ(c, -9 * s, -20 * s, 8.5 * s, g); circ(c, 9 * s, -20 * s, 8.5 * s, g); circ(c, 0, -29 * s, 11 * s, g);
  circ(c, -4 * s, -32 * s, 4.6 * s, hi, false); circ(c, -11 * s, -22 * s, 3.2 * s, hi, false); circ(c, 6 * s, -22 * s, 2.6 * s, hi, false);
}
function drawBush(c, s) { circ(c, -6 * s, -4 * s, 6 * s, '#58a64a'); circ(c, 6 * s, -4 * s, 6 * s, '#58a64a'); circ(c, 0, -8 * s, 7 * s, '#58a64a'); circ(c, -2 * s, -10 * s, 2.8 * s, '#7cc560', false); }
function drawDeadBush(c, s) { const b = '#8b6b55'; line(c, 0, 0, 0, -14 * s, OUT, 4); line(c, 0, 0, 0, -14 * s, b, 2); [[-7, -12], [6, -16], [-4, -20], [8, -8]].forEach(([x, y]) => { line(c, 0, y * .5 * s, x * s, y * s, OUT, 3.6); line(c, 0, y * .5 * s, x * s, y * s, b, 1.8); }); }

function drawPine(c, s, snow) {
  rr(c, -2.5 * s, -6 * s, 5 * s, 8 * s, 1.5, '#8a5a3b');
  const g = ['#3f8a4a', '#4b9a52', '#5aab5c'];
  for (let i = 0; i < 3; i++) { const y = -6 * s - i * 9 * s, w = (16 - i * 4) * s; poly(c, [-w, y, w, y, 0, y - 16 * s], g[i]); if (snow) poly(c, [-w * .45, y - 9 * s, w * .45, y - 9 * s, 0, y - 16 * s], '#f5f8fc', false); }
}
function drawRock(c, s, snow) {
  P(c); c.moveTo(-14 * s, 0); c.quadraticCurveTo(-15 * s, -11 * s, -4 * s, -14 * s); c.quadraticCurveTo(10 * s, -15 * s, 14 * s, -4 * s); c.lineTo(14 * s, 0); c.closePath(); fs(c, '#a3a7b4');
  P(c); c.moveTo(-9 * s, -8 * s); c.quadraticCurveTo(-6 * s, -12.5 * s, 2 * s, -12 * s); c.quadraticCurveTo(-3 * s, -9 * s, -9 * s, -8 * s); c.fillStyle = snow ? '#f5f8fc' : '#c9ccd6'; c.fill();
  line(c, -12 * s, -1.5 * s, 12 * s, -1.5 * s, 'rgba(0,0,0,.12)', 2.4 * s);
}
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
