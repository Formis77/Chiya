'use strict';
/* =========================================================
   CHIYA — core game: world, player, crew AI, abilities, VFX
   ========================================================= */
const WORLD = { w: 2200, h: 5600 };
const PLAZA = { x: 1100, y: 5420 };
const HOUSE = { x: PLAZA.x + 70, y: PLAZA.y - 50 };
const HLANT = { x: 0, y: 0 };
const STALL = { x: PLAZA.x - 85, y: PLAZA.y - 10 };
const BREW = { x: PLAZA.x - 85, y: PLAZA.y + 35, r: 46 };
const PEAK = { x: 1100, y: 380 };
/* glider pads: fly between zones (network opens at 10 crew) */
const GLIDERS = [
  { id: 'g1', n: 'Foothills pad',      x: 1400, y: 5330, z: 0 },
  { id: 'g2', n: 'Pine Forest pad',    x: 1460, y: 4330, z: 1 },
  { id: 'g3', n: 'High Pasture pad',   x: 520,  y: 3320, z: 2 },
  { id: 'g4', n: 'Snowline pad',       x: 1480, y: 2500, z: 3 },
  { id: 'g5', n: 'Summit Glacier pad', x: 1420, y: 1180, z: 4 }
];
const GLIDE_GATE = 10;
const MSHRINE = { x: 1780, y: 3250 };
const BLENDER = { x: 330, y: 4120 };
const TSTALL = { x: 870, y: 5470 };
let sproutT = 40, diyaT = 0, wasNight = false;
const isNight = () => tiharOn() && (S.nightClock || 0) % NIGHT_EVERY > NIGHT_EVERY - NIGHT_LEN;
let VIEW_W = 360;

const rand = (a, b) => a + Math.random() * (b - a);
const pick = a => a[Math.floor(Math.random() * a.length)];
const dist = (a, b, x, y) => Math.hypot(a - x, b - y);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

let S = null;                 // persistent save
let D = { k: {}, syn: new Set(), hive: null, bp: {}, cnt: {} };   // derived values
const B = {};                 // active buffs  id -> {t, st}
const E = { balloons: [], crew: [], tokens: [], parts: [], decals: [], timers: [], proj: [], pops: [] };
const player = { x: BREW.x, y: BREW.y - 30, face: 1, mv: false, swing: 0, swingT: 0, auto: null, anim: 0 };
const cam = { x: 0, y: 0, shake: 0 };
const joy = { on: false, id: null, ox: 0, oy: 0, x: 0, y: 0, kx: 0, ky: 0 };
let mistOn = false, now = 0, brewing = false, fullWarnT = 0, nearNpc = null, kilnT = 0;
const NPCS = () => Object.assign({}, GIVERS, REPEAT);

/* ---------------- save ---------------- */
const mk = (id, bl) => ({ id, lvl: 1, xp: 0, bl: !!bl });
function newSave() {
  return {
    v: 1, rp: 0, doko: 0, beds: 25, crew: [mk('porter'), mk('porter')],
    items: { momo: 5, permit: 1 },
    tool: 'sickle', tools: ['sickle'], dokoId: 'basket', dokos: ['basket'], boots: 'sandals', bootsOwned: ['sandals'],
    lodge: 0, recruits: 0, wheels: 0, spr: { n: 0, lv: 0, placed: [] }, hats: [], hat: null, charms: [], charm: null, pas: {}, q: { didi: 0, pemba: 0, dolma: 0, norbu: 0, yeti: 0 }, qb: {},
    stats: { gather: 0, earn: 0, field: {}, feed: 0 }, found: { porter: true },
    last: Date.now(), rate: 0, mapv: 2, px: PLAZA.x, py: PLAZA.y + 30
  };
}
function curSlot() { try { return +localStorage.getItem('chiya_slot') || 1; } catch (e) { return 1; } }
const slotKey = (n = curSlot()) => n === 1 ? 'chiya_save' : 'chiya_save_' + n;
function load() {
  try {
    const s = JSON.parse(localStorage.getItem(slotKey()));
    if (s && s.v === 1) {
      if (!s.q) { s.q = { didi: Math.min(s.quest || 0, 8), pemba: 0, dolma: 0, norbu: 0, yeti: 0 }; s.qb = {}; delete s.quest; delete s.qBase; }
      return s;
    }
  } catch (e) {}
  return null;
}
function save() {
  if (!S) return;
  S.last = Date.now(); S.px = Math.round(player.x); S.py = Math.round(player.y);
  try { localStorage.setItem(slotKey(), JSON.stringify(S)); } catch (e) {}
}

/* ---------------- world: tiles & decor ---------------- */
let TILES = [];               // per field: array of tiles
function seeded(seed) { let s = seed; return () => (s = (s * 16807) % 2147483647) / 2147483647; }
function buildWorld() {
  const r = seeded(7);
  TILES = FIELDS.map((f, fi) => {
    const cols = Math.floor(f.w / TILE), rows = Math.floor(f.h / TILE), arr = [];
    const ox = f.x + (f.w - cols * TILE) / 2 + TILE / 2, oy = f.yy + (f.h - rows * TILE) / 2 + TILE / 2;
    for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
      let q = r(), col = 'cloud'; for (const k in f.cw) { q -= f.cw[k]; if (q <= 0) { col = k; break; } }
      const span = f.lv[1] - f.lv[0], lv = f.lv[0] + Math.min(span, Math.floor(Math.pow(r(), 1.6) * (span + 1)));
      arr.push({ f: fi, x: ox + i * TILE, y: oy + j * TILE, v: 1, col, lv, wob: r() * TAU });
    }
    return arr;
  });
  // decor
  DECOR = [];
  const inField = (x, y, m) => FIELDS.some(f => x > f.x - m && x < f.x + f.w + m && y > f.yy - m && y < f.yy + f.h + m);
  // smooth, wandering trail: add bendy midpoints, then Chaikin-smooth and sample
  let pts = [PATH[0]];
  for (let i = 1; i < PATH.length; i++) {
    const [x0, y0] = PATH[i - 1], [x1, y1] = PATH[i], L = Math.hypot(x1 - x0, y1 - y0), nx = -(y1 - y0) / L, ny = (x1 - x0) / L;
    if (L > 200) for (const u of [.33, .66]) { const o = (r() - .5) * 40; pts.push([x0 + (x1 - x0) * u + nx * o, y0 + (y1 - y0) * u + ny * o]); }
    pts.push(PATH[i]);
  }
  for (let it = 0; it < 4; it++) { const n = [pts[0]]; for (let i = 0; i < pts.length - 1; i++) { const [a, b] = pts[i], [c2, d] = pts[i + 1]; n.push([a * .75 + c2 * .25, b * .75 + d * .25], [a * .25 + c2 * .75, b * .25 + d * .75]); } n.push(pts[pts.length - 1]); pts = n; }
  TRAIL = []; STONES = [];
  let acc = 0;
  for (let i = 1; i < pts.length; i++) {
    const [x0, y0] = pts[i - 1], [x1, y1] = pts[i], L = Math.hypot(x1 - x0, y1 - y0);
    for (let d = 0; d < L; d += 7) {
      acc += 7; const x = x0 + (x1 - x0) * d / L, y = y0 + (y1 - y0) * d / L;
      const rr = 12 + Math.sin(acc * .013) * 3 + Math.sin(acc * .041) * 2;
      const t = { x: x + (r() - .5) * 2, y: y + (r() - .5) * 2, r: rr, spot: r() < .12, sx: (r() - .5) * 10, sy: (r() - .5) * 8 };
      TRAIL.push(t);
      if (r() < .07) { const a = r() * TAU, rd = rr + 6 + r() * 8; STONES.push({ x: x + Math.cos(a) * rd, y: y + Math.sin(a) * rd * .8, r: 2 + r() * 3, c: r() < .5 ? '#b9b2a6' : '#a8a093' }); }
    }
  }
  PATHPTS = pts;
  const nearPath = (x, y, m) => { for (let i = 0; i < TRAIL.length; i += 2) { const t = TRAIL[i]; if (Math.abs(t.x - x) < m && Math.abs(t.y - y) < m && Math.hypot(t.x - x, t.y - y) < m) return true; } return false; };
  const nearPlaza = (x, y) => Math.hypot((x - PLAZA.x) / 290, (y - PLAZA.y) / 170) < 1;
  const blocked = (x, y, m) => inField(x, y, m) || nearPath(x, y, m + 12) || nearPlaza(x, y) || Object.values(NPCS()).some(g => Math.hypot(x - g.x, y - g.y) < 60) || GLIDERS.some(g => Math.hypot(x - g.x, y - g.y) < 70) || SHOPS.some(g => Math.hypot(x - g.x, y - g.y + 20) < 95) || Math.hypot(x - MSHRINE.x, y - MSHRINE.y + 20) < 100 || Math.hypot(x - BLENDER.x, y - BLENDER.y + 20) < 90 || Math.hypot(x - TSTALL.x, y - TSTALL.y + 20) < 90;
  // gates where the trail crosses each zone border
  GATES = [];
  for (let z = 1; z < ZONES.length; z++) { const top = ZONES[z - 1].top, p = TRAIL.find(t => t.y < top) || TRAIL[0]; GATES.push({ z, x: p.x, y: top }); }
  for (let i = 0; i < 6000 && DECOR.length < 760; i++) {
    const edge = r() < .45, x = edge ? (r() < .5 ? r() * 260 : WORLD.w - r() * 260) : r() * WORLD.w, y = 60 + r() * (WORLD.h - 80);
    if (blocked(x, y, 34) || GATES.some(g => Math.hypot(x - g.x, y - g.y) < 90)) continue;
    const z = zoneAt(y), roll = r();
    const type = z === 0 ? (roll < .5 ? 'tree' : roll < .8 ? 'bush' : 'rock')
      : z === 1 ? (roll < .7 ? 'pine' : roll < .85 ? 'tree' : 'rock')
      : z === 2 ? (roll < .45 ? 'pine' : roll < .8 ? 'rock' : 'autumn')
      : z === 3 ? (roll < .5 ? 'pine' : roll < .85 ? 'rock' : 'dead') : (roll < .55 ? 'icicle' : 'rock');
    DECOR.push({ type, x, y, s: .8 + r() * .6, snow: z >= 3 });
  }
  SCATTER = [];
  for (let i = 0; i < 9000 && SCATTER.length < 2600; i++) {
    const x = r() * WORLD.w, y = r() * WORLD.h;
    if (inField(x, y, 10) || nearPath(x, y, 26)) continue;
    const z = zoneAt(y), roll = r();
    SCATTER.push({ x, y, z, k: roll, t: z === 4 ? 'crack' : z === 3 ? 'spark' : z === 2 ? (roll < .5 ? 'pebble' : 'tuft') : (roll < .7 ? 'tuft' : 'flower') });
  }
  BANDS = ZONES.slice(1).map((z, i) => {
    const y0 = ZONES[i].top, edge = x => y0 + Math.sin(x * .021 + y0) * 12 + Math.sin(x * .053) * 6;
    const mk = off => { const p = new Path2D(); p.moveTo(-50, -200); p.lineTo(-50, edge(0) + off); for (let x = -50; x <= WORLD.w + 50; x += 20) p.lineTo(x, edge(x) + off); p.lineTo(WORLD.w + 50, -200); p.closePath(); return p; };
    const ln = new Path2D(); ln.moveTo(-50, edge(-50)); for (let x = -50; x <= WORLD.w + 50; x += 20) ln.lineTo(x, edge(x));
    return { lipP: mk(0), mainP: mk(-8), line: ln, col: z.col, lip: z.lip, y0 };
  });
  DECOR.push({ type: 'chorten', x: 1450, y: 5150 }, { type: 'chorten', x: 560, y: 3800 }, { type: 'chorten', x: 400, y: 2700 }, { type: 'chorten', x: 260, y: 1330 }, { type: 'flagpole', x: PEAK.x, y: PEAK.y + 60 });
  FLAGS = GATES.map(g => [g.x - 90, g.y - 70, g.x + 90, g.y - 70]).concat([[PEAK.x - 220, PEAK.y + 40, PEAK.x + 220, PEAK.y + 40]]);
}
let DECOR = [], FLAGS = [], SCATTER = [], BANDS = [], STONES = [], TRAIL = [], PATHPTS = [];
const zoneAt = y => { for (let i = 0; i < ZONES.length; i++) if (y >= ZONES[i].top) return i; return ZONES.length - 1; };
const zoneOpen = z => S.crew.length >= ZONES[z].gate;
let GATES = [];
function segDist(x, y, a, b) { const dx = b[0] - a[0], dy = b[1] - a[1], l = dx * dx + dy * dy; const u = clamp(((x - a[0]) * dx + (y - a[1]) * dy) / l, 0, 1); return Math.hypot(x - a[0] - u * dx, y - a[1] - u * dy); }
const PATH = [[PLAZA.x, PLAZA.y - 40], [1100, 4900], [1100, 4450], [700, 4300], [700, 3500], [1100, 3420], [1500, 3250], [1500, 2720], [1100, 2620], [700, 2450], [700, 1450], [1100, 1330], [1100, 1010]];
const BRANCH = [];

function fieldAt(x, y) { for (let i = 0; i < FIELDS.length; i++) { const f = FIELDS[i]; if (x > f.x && x < f.x + f.w && y > f.yy && y < f.yy + f.h) return i; } return -1; }
const fieldOpen = fi => S.crew.length >= FIELDS[fi].gate;

/* ---------------- derived stats ---------------- */
function recompute() {
  const k = {}; S.crew.forEach(m => k[m.id] = (k[m.id] || 0) + 1);
  const syn = new Set(SYN.filter(s => s.chk(k, S.crew, S.beds)).map(s => s.id));
  const cnt = { spice: 0, ice: 0, cloud: 0 };
  S.crew.forEach(m => { const c = CREW[m.id].c; if (cnt[c] != null) cnt[c]++; });
  let hive = null; const n = S.crew.length;
  for (const c in cnt) if (n >= 8 && cnt[c] >= n * .5) hive = c;
  const bpm = syn.has('blessedTrio') ? 1.5 : 1, bp = {};
  { const seen = new Set(); S.crew.forEach(m => { if (m.bl && !seen.has(m.id)) { seen.add(m.id); const [st, v] = CREW[m.id].bp; bp[st] = (bp[st] || 0) + v * bpm / 100; } }); }   /* each crew type's Blessed bonus counts once, like Bee Swarm */
  for (const k in S.perm || {}) bp[k] = (bp[k] || 0) + S.perm[k];
  for (const g of equippedGear()) for (const k in g.st || {}) bp[k] = (bp[k] || 0) + g.st[k];
  if (S.mandala) for (const [k, v] of S.mandala.lines) bp[k] = (bp[k] || 0) + v;
  if (S.mandala && S.mandala.pas.includes('kilnStar')) bp.conv = (bp.conv || 0) + .08;
  D = { k, syn, hive, bp, cnt };
}
const bp = s => D.bp[s] || 0;
const tool = () => TOOLS.find(t => t.id === S.tool);
const doko = () => DOKOS.find(d => d.id === S.dokoId);
const equippedGear = () => [tool(), doko(), HEADGEAR.find(h => h.id === S.hat)].filter(Boolean);
const mpas = id => !!(S.mandala && S.mandala.pas.includes(id));
const lvlMult = m => (1 + .1 * (m.lvl - 1)) * (m.bl ? 1.25 : 1);
const inIceField = () => { const fi = fieldAt(player.x, player.y); return fi >= 0 && FIELDS[fi].c === 'ice'; };
/* Ice Swell (like Bubble Bloat): up to x6 Ice-field capacity and brewing speed, growing with its remaining time (max 1 hour) */
const swellMul = () => B.swell ? 1 + 4 * Math.min(1, B.swell.t / 3600) : 1;
/* Lantern Blessing (like Balloon Blessing): stacks from the teahouse lantern, x4 capacity and x2.5 teahouse brewing at 100 */
const BLESS_MAX = 2e10;
const blessStacks = p => Math.max(1, Math.min(100, Math.floor(100 * Math.sqrt(p / BLESS_MAX))));
function capMax() {
  let m = 1 + bp('cap') + (D.syn.has('rainbow') ? .15 : 0) + (D.syn.has('porterUnion') ? .25 : 0) + (D.syn.has('herd') ? .1 : 0) + (D.hive === 'cloud' ? .15 : 0) + .05 * (D.k.dzo || 0);
  if (B.nimbusb) m *= 1 + B.nimbusb.st * .02;
  if (inIceField()) m *= (mpas('glacierStar') ? 1.25 : 1) * swellMul();
  if (B.lbless) m *= 1 + 3 * B.lbless.st / 100;
  return Math.floor(doko().cap * m);
}
function moveSpeed() { return BOOTS.find(b => b.id === S.boots).spd * (1 + bp('speed')) * (1 + .2 * (B.haste ? B.haste.st : 0)) * (B.bear ? 1.2 : 1); }
/* Bee Swarm style: most bonuses add into one "+% gathering" pool, a few big buffs multiply */
function gMult(col, isTool) {
  let add = bp('gather') + bp(col);
  if (B.blessing) add += .25;
  if (col === 'spice' && B.spiceRush) add += .5 * (D.syn.has('kitchen') ? 1.5 : 1);
  if (B['boost_' + col]) add += .1 * B['boost_' + col].st;
  if (B.wildfire && col === 'spice') add += 1;
  if (B.polar && col === 'ice') add += 1;
  if (B.spirit) add += 1;
  if (B.kukur) add += .5;
  if (B.heat && col === 'spice') add += Math.floor(B.heat.st) * .01;
  if (B.chill && col === 'ice') add += B.chill.st * .01;
  if (isTool) add += bp('tool') + (D.hive === 'cloud' ? .5 : 0);
  let m = 1 + add;
  if (B['shot_' + col]) m *= 1.25;
  if (B.gtea) m *= 1.15;
  if (B.love) m *= 1.5;
  if (B.popstar && col === 'ice') m *= 2 + Math.min(1, B.popstar.st * .01);
  if (B.inspire) m *= 1 + B.inspire.st;
  if (isTool && B.bear) m *= 2;
  if (isTool && B.cloudburst) m *= 2;
  return m;
}
function critChance() { return .03 + (B.polar ? .1 : 0) + bp('crit') + (B.focus ? .15 : 0) + (D.hive === 'spice' ? .05 : 0) + (tool().crit || 0); }
function critMul() { return B.focus ? (D.syn.has('frozenFocus') ? 3 : 2.5) : 2; }
/* Super Crit: a crit that doubles again and is brewed straight into rupees (never touches the doko) */
function superChance() { return Math.min(.7, (B.precision ? B.precision.st * .005 : 0) + (B.darkheat ? B.darkheat.st * .01 : 0)); }
function brewValue() { return 1 + bp('brew') + (D.syn.has('teaMasters') ? .15 : 0) + (D.syn.has('festival') ? .2 : 0) + (D.hive === 'ice' ? .3 : 0); }
function cdMul(def) {
  let m = 1;
  if (D.hive === 'spice') m *= 1 / .85;
  if (B.incense) m *= 2;
  m *= 1 / (1 - Math.min(.5, bp('cdr')));
  if (def.r === 'mythic' && D.syn.has('legends')) m *= 1 / .7;
  return m;
}
const FROST_MUL = [1, 1.25, 1.5, 2, 3];
let lastGoo = false, kilnFlame = false;
function zoneMult(x, y, col, src) {
  let z = 1, frost = 0, inGoo = false, inFlame = false;
  if (B.butterbomb) { inGoo = true; z *= mpas('butterStar') ? 3 : 2; if (src === 'cloud') z *= 1.8; }
  for (const d of E.decals) {
    if (d.kind === 'goo' && !inGoo && dist(x, y, d.x, d.y) < d.r) { inGoo = true; z *= mpas('butterStar') ? 3 : 2; if (src === 'cloud') z *= 1.8; }
    else if (d.kind === 'wheel' && dist(x, y, d.x, d.y) < d.r) z *= 2;
    else if (d.kind === 'flame' && !inFlame && dist(x, y, d.x, d.y) < d.r) { inFlame = true; z *= d.dark ? (mpas('blazingStar') ? 3 : 2.5) : (mpas('blazingStar') ? 2 : 1.5); }
  }
  lastGoo = inGoo;
  if (col === 'ice') frost = frostAt(x, y);
  return z * FROST_MUL[frost];
}
const fieldBonus = fi => { const id = FIELDS[fi].id; return 1 + ((S.fperm && S.fperm[id]) || 0) + ((S.badges && S.badges['f_' + id]) || 0) * BADGE_FIELD; };
function addTimed(id, dur, cap = 3600) { if (B[id]) B[id].t = Math.min(cap, B[id].t + dur); else B[id] = { t: dur, st: 1 }; }
function addBuff(id, dur, max = 1) {
  const b = B[id];
  if (b) { b.t = Math.max(b.t, dur); b.st = Math.min(max, b.st + 1); } else B[id] = { t: dur, st: 1 };
}

/* ---------------- gathering ---------------- */
function effLv(t) {
  if (!mistOn) return t.lv;
  for (const d of E.decals) if (d.kind === 'mist' && dist(t.x, t.y, d.x, d.y) < d.r) return Math.min(5, t.lv + 1);
  return t.lv;
}
function collect(t, base, srcCol, extra = 1, isTool = false) {
  if (!fieldOpen(t.f) || t.v < .04) return 0;
  const space = capMax() - S.doko;
  if (space <= 0 && !E.balloons.some(bl => !bl.home && bl.fi === t.f && bl.held < bl.cap && dist(t.x, t.y, bl.x, bl.y) < 120)) { fullWarn(); return 0; }
  const tv = t.v; t.v = Math.max(0, tv - .22);
  let amt = base * FIELDS[t.f].y * LVM[effLv(t)] * (.35 + .65 * tv) * extra;
  const match = srcCol === t.col ? 1.5 : srcCol === 'neutral' ? 1.15 : 1;
  amt *= match * gMult(t.col, isTool) * zoneMult(t.x, t.y, t.col, srcCol) * (t.wet || 1);
  let crit = false;
  const gooHit = lastGoo;
  let sup = false;
  if (Math.random() < critChance()) { amt *= critMul(); crit = true; S.stats.crits++;
    if (Math.random() < superChance()) { amt *= 2; sup = true; S.stats.supers = (S.stats.supers || 0) + 1; }
    if (t.col === 'spice' && Math.random() < .06 && E.decals.some(d => d.kind === 'flame' && dist(t.x, t.y, d.x, d.y) < d.r)) addFlame(t.f, t.x + rand(-30, 30), t.y + rand(-20, 20), base); }
  if (S.pilgrim && t.f === S.pilgrim.f && Date.now() < S.pilgrim.until) amt *= 2.5;
  if (E.litF && E.litF[t.f]) amt *= 1.5;
  amt *= fieldBonus(t.f);
  const inTea = E.decals.some(d => d.kind === 'teamark' && dist(t.x, t.y, d.x, d.y) < d.r);
  const conv = sup ? 1 : Math.min(.8, bp('conv') + (B.popstar && t.col === 'ice' ? .1 : 0) + (B.darkheat ? B.darkheat.st * .005 : 0) + (kilnFlame ? .15 : 0) + (B.masala ? .08 : 0) + (D.syn.has('fullHouse') ? .05 : 0) + (inTea ? (D.syn.has('teaCeremony') ? .5 : .35) : 0));
  if (conv > 0) { const inst = amt * conv, val = inst * brewValue(); S.rp += val; S.stats.earn += val; amt -= inst;
    if (sup) { S.stats.gather += inst; S.stats.col[t.col] = (S.stats.col[t.col] || 0) + inst; const fd = FIELDS[t.f].id; S.stats.field[fd] = (S.stats.field[fd] || 0) + inst; } }
  if (E.balloons.length) for (const bl of E.balloons) { if (bl.home || bl.fi !== t.f || dist(t.x, t.y, bl.x, bl.y) > 120) continue; const toB = Math.min(bl.cap - bl.held, amt * .75); if (toB > 0) { bl.held += toB; amt -= toB; } break; }
  const add = Math.max(0, Math.min(space, amt));
  S.doko += add; S.stats.gather += add;
  if (sup) { burst(t.x, t.y - 10, 8, { type: 'star', col: '#c06bff', spd: 120, life: .6, size: 2.6 }); }
  const st = S.stats; st.col[t.col] = (st.col[t.col] || 0) + add; st.lv[t.lv] = (st.lv[t.lv] || 0) + add;
  if (add > (st.best || 0)) st.best = add;
  const fid = FIELDS[t.f].id; S.stats.field[fid] = (S.stats.field[fid] || 0) + add;
  if (S.sprouts.length && add > 0) sproutHit(t, add);
  if (wasNight && add > 0) nightHit(t, add);
  if (gooHit && add > 0 && mpas('butterStar') && !B.butterbomb && ++S.butter >= 150) { S.butter = 0; butterBomb(t.f); }
  leafBurst(t, crit ? 5 : 2);
  if (crit) burst(t.x, t.y - 10, 5, { type: 'star', col: '#ffd24a', spd: 90, life: .5, size: 2.2 });
  return add;
}
function fullWarn() { if (now - fullWarnT > 4) { fullWarnT = now; toast('Doko full. Head home to brew', 'basket'); } }

/* ---------------- crew entities ---------------- */
function rebuildCrew() {
  const old = E.crew;
  E.crew = S.crew.map((m, i) => {
    const prev = old.find(e => e.m === m);
    if (prev) return prev;
    return { m, x: player.x + rand(-40, 40), y: player.y + rand(-30, 30), st: 'idle', t: 0, tile: null, cd: rand(4, (CREW[m.id].cd || 10) * 1.8), anim: rand(0, 9), face: 1, mv: false, act: false, jump: null };
  });
  recompute();
}
function moveTo(e, x, y, spd, dt) {
  const dx = x - e.x, dy = y - e.y, d = Math.hypot(dx, dy);
  if (d < 2) { e.mv = false; return true; }
  const s = Math.min(d, spd * dt);
  e.x += dx / d * s; e.y += dy / d * s; e.mv = true;
  if (Math.abs(dx) > 1) e.face = dx > 0 ? 1 : -1;
  return d < 4;
}
function crewSpeed(e) {
  const def = CREW[e.m.id];
  let s = def.spd * (1 + .2 * (B.haste ? B.haste.st : 0)) * (1 + bp('speed'));
  if (B.caravan && def.tags.includes('yak')) s *= 1.5;
  if (B.herd) s *= 1.5;
  return s;
}
function crewAmount(e, t) {
  const def = CREW[e.m.id];
  let a = def.amt * lvlMult(e.m);
  if (e.m.id === 'porter' && D.syn.has('porterUnion')) a *= 1.5;
  if (def.tags.includes('yak')) { if (D.syn.has('herd')) a *= 1.4; if (B.caravan) a *= 2; a *= 1 + bp('yak'); }
  if (e.m.id === 'teaPicker' && t && t.col === 'cloud') a *= 1.5;
  return a;
}
function updCrew(e, i, dt) {
  const def = CREW[e.m.id];
  e.anim += dt; e.act = false;
  if (e.jump) {
    const j = e.jump; j.t += dt / j.dur; const u = Math.min(1, j.t);
    e.x = j.x0 + (j.x1 - j.x0) * u; e.y = j.y0 + (j.y1 - j.y0) * u; e.hop = Math.sin(u * Math.PI) * 26; e.mv = true;
    if (j.x1 !== j.x0) e.face = j.x1 > j.x0 ? 1 : -1;
    if (u >= 1) { e.jump = null; e.hop = 0; if (j.done) j.done(); }
    return;
  }
  const pf = fieldAt(player.x, player.y);
  const atHome = dist(player.x, player.y, BREW.x, BREW.y) < BREW.r + 90;
  const working = pf >= 0 && fieldOpen(pf) && S.doko < capMax() - .5;
  if (def.ab) {
    const inField = pf >= 0 && fieldOpen(pf) && fieldAt(e.x, e.y) === pf && (e.st === 'go' || e.st === 'gather');
    if (inField || def.ab === 'haste') {
      e.cd -= dt * cdMul(def) * (1 + .04 * (e.m.lvl - 1));
      if (e.cd <= 0) { e.cd = def.cd * 1.8; useAbility(e, pf >= 0 && fieldOpen(pf) ? pf : -1); }
    }
  }
  if (atHome) {
    const n = E.crew.length, a = Math.PI * (.08 + .84 * (i + .5) / n), rr = 150 + (i % 3) * 22;
    moveTo(e, PLAZA.x + Math.cos(a) * rr * 1.2, PLAZA.y + 20 + Math.sin(a) * 50 + (i % 3) * 6, crewSpeed(e) * 1.4, dt);
    e.st = 'home'; e.tile = null;
    if (!e.mv) { e.face = e.x < STALL.x ? 1 : -1; if (brewing) e.act = true; }
    return;
  }
  if (working) {
    if (e.st === 'gather') {
      e.act = true; e.mv = false; e.t -= dt * (B.roar ? 1.5 : 1) * (D.k.tiharDog ? 1 + .1 * Math.min(3, D.k.tiharDog) : 1);
      if (e.t <= 0) {
        const got = collect(e.tile, crewAmount(e, e.tile), def.c);
        if (got > 0) { pop(e.x, e.y - 34, '+' + fmt(got), COL[def.c].c); if (Math.random() < .004) dropMat(e.tile.f); }
        e.st = 'idle';
      }
      return;
    }
    if (e.st !== 'go' || !e.tile || e.tile.f !== pf) {
      const arr = TILES[pf]; let best = null;
      for (let k = 0; k < 8; k++) {
        const t = pick(arr);
        if (dist(t.x, t.y, player.x, player.y) < 170 && t.v > .25 && (!best || t.v > best.v)) best = t;
      }
      e.tile = best || arr.reduce((b, t) => dist(t.x, t.y, player.x, player.y) < dist(b.x, b.y, player.x, player.y) ? t : b, arr[0]);
      e.st = 'go'; e.ox = rand(-8, 8); e.oy = rand(-6, 6);
    }
    if (moveTo(e, e.tile.x + e.ox, e.tile.y + e.oy, crewSpeed(e), dt)) { e.st = 'gather'; e.t = def.gt; }
    return;
  }
  e.st = 'idle'; e.tile = null;
  const a = (i / Math.max(1, E.crew.length)) * TAU + now * .15, r = 46 + (i % 4) * 14;
  const tx = player.x + Math.cos(a) * r, ty = player.y + Math.sin(a) * r * .6;
  if (dist(e.x, e.y, tx, ty) > 10) moveTo(e, tx, ty, crewSpeed(e) * (dist(e.x, e.y, player.x, player.y) > 220 ? 2.2 : 1), dt);
  else e.mv = false;
}

/* ---------------- abilities ---------------- */
function tilesNear(fi, x, y, r) { return TILES[fi].filter(t => dist(t.x, t.y, x, y) < r); }
function useAbility(e, fi) {
  const a = CREW[e.m.id].ab;
  if (ABIL[a].tok) {
    if (E.tokens.length > 30) return;
    if (fi < 0 && a !== 'haste') return;
    E.tokens.push({ x: e.x + rand(-18, 18), y: e.y + rand(-10, 10), ab: a, e, fi, life: 10, age: 0 });
    if (e.m.bl && fi >= 0 && Math.random() < .035) E.tokens.push({ x: e.x + rand(-30, 30), y: e.y + rand(-20, 20), ab: 'inspire', e, fi, life: 10, age: 0 });
    burst(e.x, e.y - 20, 6, { type: 'star', col: '#fff6c8', spd: 60, life: .5, size: 2 });
  } else { FX[a](e, fi); S.stats.ab[a] = (S.stats.ab[a] || 0) + 1; abilityFired(CREW[e.m.id].c); }
}
function takeToken(tk) {
  const a = tk.ab; S.stats.ab[a] = (S.stats.ab[a] || 0) + 1;
  ring(tk.x, tk.y, 40, '#ffffff', .4, 3);
  burst(tk.x, tk.y, 14, { type: 'star', col: '#fff6c8', spd: 120, life: .6, size: 2.4 });
  if (!abNameT[a] || now - abNameT[a] > 8) { abNameT[a] = now; pop(tk.x, tk.y - 22, ABIL[a].n, '#ffffff', true); }
  const src = a === 'pounce' ? tk.e : { x: tk.x, y: tk.y, m: tk.e.m, face: 1 };
  FX[a](src, tk.fi, tk);
  if (a === 'inspire') return;
  if (a === 'iceBoost' && mpas('glacierStar') && !B.popstar && Date.now() > (S.popCd || 0) && (S.blueN = (S.blueN || 0) + 1) >= 45) {
    S.blueN = 0; S.popCd = Date.now() + 45000 + 60000; B.popstar = { t: 45, st: 0 }; addTimed('swell', 120, 3600);
    ring(player.x, player.y, 140, '#bfefff', .7, 8); burst(player.x, player.y - 40, 50, { type: 'snow', col: '#e3f6ff', spd: 240, life: 1.2, size: 3 }); shake(8);
    toast('Glacier Star! x2 Ice and +10% Ice conversion for 45s. Pop bubbles to grow it', 'snow'); }
  if ((a === 'spiceBoost' || a === 'iceBoost' || a === 'cloudBoost') && mpas('guidingStar') && ++S.guideN >= 250) {
    S.guideN = 0; const open = FIELDS.map((f, i) => i).filter(fieldOpen); S.pilgrim = { f: pick(open), until: Date.now() + 6e5 };
    toast(`Wayfinder Star: ${FIELDS[S.pilgrim.f].n} gathers x2.5 for 10 min`, 'star'); }
  abilityFired(CREW[tk.e.m.id].c);
}
const FX = {
  inflate(e, fi) {
    if (fi < 0) return; const uid = e.m.uid || (e.m.uid = Math.random().toString(36).slice(2, 9));
    const mine = E.balloons.find(b2 => b2.owner === uid && !b2.home);
    if (mine) { if (mine.inf < 10) { mine.inf++; mine.cap += capMax() / 6; ring(mine.x, mine.y - 40, 40, '#bfe6ff', .4, 4); } return; }
    const f = FIELDS[fi], life = 20 + 2 * (e.m.lvl || 1);
    E.balloons.push({ owner: uid, fi, x: e.x, y: e.y, tx: e.x, ty: e.y, cap: capMax() / 6, held: 0, inf: 0, t: life, life, home: false, ph: rand(0, TAU) });
    burst(e.x, e.y - 40, 14, { type: 'star', col: '#bfe6ff', spd: 100, life: .6, size: 2.4 });
  },
  inspire() { if (!B.inspire) B.inspire = { t: 5, st: 1 }; else B.inspire.t = 5; ring(player.x, player.y, 80, '#7ee08a', .5, 5); },
  spiceBoost(e, fi, tk) { if (tk && fi >= 0) addFlame(fi, tk.x, tk.y, crewAmount(e)); addBuff('boost_spice', 15, 10); ring(player.x, player.y, 70, '#ff6b4a', .5, 5); burst(player.x, player.y - 10, 16, { type: 'ember', col: '#ff7b3a', spd: 140, life: .8, size: 2.6, g: -60 }); },
  iceBoost(e, fi, tk) { if (tk && fi >= 0) for (let k = 0; k < 2; k++) spawnBubble(fi, tk.x + rand(-60, 60), tk.y + rand(-40, 40), crewAmount(e)); addBuff('boost_ice', 15, 10); ring(player.x, player.y, 70, '#4fb6e6', .5, 5); burst(player.x, player.y - 10, 16, { type: 'snow', col: '#d6f3ff', spd: 140, life: .8, size: 2.4 }); },
  cloudBoost(e, fi, tk) { if (tk && fi >= 0) addGoo(tk.x, tk.y, 55, 15); addBuff('boost_cloud', 15, 10); ring(player.x, player.y, 70, '#ffffff', .5, 5); burst(player.x, player.y - 10, 16, { type: 'leaf', col: '#ffffff', spd: 140, life: .8, size: 2.6 }); },
  firecracker(e, fi, tk) {
    const maxC = D.syn.has('fireworks') ? 15 : 10;
    combo.n = now - combo.t < 12 ? Math.min(maxC, combo.n + 1) : 1; combo.t = now;
    const x = tk ? tk.x : e.x, y = tk ? tk.y : e.y, r = 60 + combo.n * 6; let sum = 0;
    tilesNear(fi, x, y, r).forEach(t => sum += collect(t, crewAmount(e), 'neutral', 2 + combo.n * .3));
    ring(x, y, r, '#ffd24a', .4, 6); burst(x, y, 24 + combo.n * 3, { type: 'spark', col: pick(['#ffd24a', '#ff6b4a', '#4fb6e6', '#ffffff']), spd: 260, life: .5, size: 2.4 });
    shake(3 + combo.n * .4); pop(x, y - 30, `Combo x${combo.n}  +${fmt(sum)}`, '#ffd24a', true);
    if (combo.n >= 5 && fi >= 0) addFlame(fi, x, y, crewAmount(e));
  },
  link(e, fi, tk) {
    const rest = E.tokens.splice(0);
    rest.forEach((t2, k) => { E.decals.push({ kind: 'rope', x: tk.x, y: tk.y, x1: t2.x, y1: t2.y, age: 0, dur: .5 }); later(.05 * k, () => takeToken(t2)); });
    pop(tk.x, tk.y - 40, `Pulled ${rest.length} bubbles`, '#ffffff', true);
  },
  littleLove() { addBuff('love', 12); burst(player.x, player.y - 20, 18, { type: 'heart', col: '#ff6b8a', spd: 80, life: 1.2, size: 4, g: -50 }); },
  teaMark(e, fi, tk) { E.decals.push({ kind: 'teamark', x: tk.x, y: tk.y, r: 64, age: 0, dur: 15 }); burst(tk.x, tk.y, 16, { type: 'steam', col: 'rgba(255,255,255,.7)', spd: 40, life: 1.2, size: 6 }); },
  bullseye(e, fi) {
    if (E.decals.some(d => d.kind === 'target')) return;   /* one set of targets at a time */
    const f = FIELDS[fi], ts = [];
    for (let k = 0; k < 3; k++) ts.push({ kind: 'target', x: rand(f.x + 40, f.x + f.w - 40), y: rand(f.yy + 40, f.yy + f.h - 40), r: 26, age: 0, dur: 7, set: now });
    ts.forEach(t2 => E.decals.push(t2)); bullHits = 0;
  },
  bubbles(e, fi) {
    const f = FIELDS[fi], n = D.syn.has('deepWater') ? 12 : 8;
    for (let k = 0; k < n; k++) later(k * .08, () => E.decals.push({ kind: 'bubble', x: rand(f.x + 30, f.x + f.w - 30), y: rand(f.yy + 30, f.yy + f.h - 30), r: 18, age: 0, dur: 12, fi, base: crewAmount(e), ph: rand(0, TAU) }));
  },
  mist(e, fi, tk) { E.decals.push({ kind: 'mist', x: tk.x, y: tk.y, r: 90, age: 0, dur: 20 }); addGoo(tk.x, tk.y, 60, 20); },
  bearMorph() { addBuff('bear', 15); burst(player.x, player.y - 20, 30, { type: 'smoke', col: 'rgba(60,60,70,.5)', spd: 120, life: .8, size: 9 }); pop(player.x, player.y - 60, 'Bear Morph!', '#ffffff', true); },
  spiceRush(e) {
    addBuff('spiceRush', 15 * (D.syn.has('kitchen') ? 1.5 : 1));
    ring(player.x, player.y, 90, '#ff6b4a', .6, 6);
    burst(player.x, player.y - 10, 30, { type: 'ember', col: '#ff7b3a', spd: 160, life: .9, size: 3, g: -60 });
  },
  haste(e) {
    addBuff('haste', 10, D.syn.has('trailTeam') ? 5 : 3);
    ring(player.x, player.y, 70, '#7ef9ff', .45, 4); ring(player.x, player.y, 40, '#ffffff', .35, 3);
    burst(player.x, player.y - 10, 18, { type: 'spark', col: '#a8f6ff', spd: 220, life: .45, size: 2 });
  },
  focus(e) {
    addBuff('focus', 12);
    E.decals.push({ kind: 'focus', x: player.x, y: player.y, age: 0, dur: 12, follow: true });
    ring(player.x, player.y, 60, '#4fa3ff', .5, 4);
  },
  burst(e, fi, tk) {
    const x = tk ? tk.x : e.x, y = tk ? tk.y : e.y, k = D.syn.has('kitchen');
    const r = 95 * (k ? 1.25 : 1), base = crewAmount(e) * (k ? 1.5 : 1);
    let sum = 0;
    tilesNear(fi, x, y, r).forEach(t => sum += collect(t, base, 'spice', 2.5));
    E.decals.push({ kind: 'scorch', x, y, r, age: 0, dur: 2.5 });
    for (let k = 0; k < (D.syn.has('fireworks') ? 3 : 2); k++) addFlame(fi, x + rand(-r * .6, r * .6), y + rand(-r * .6, r * .6), crewAmount(e));
    ring(x, y, r, '#ffb347', .5, 10); ring(x, y, r * .6, '#ff4d2e', .35, 8);
    burst(x, y, 50, { type: 'ember', col: '#ff6a2b', spd: 260, life: .9, size: 3.4, g: -40 });
    burst(x, y, 20, { type: 'smoke', col: 'rgba(60,40,40,.35)', spd: 70, life: 1.4, size: 10, g: -30 });
    shake(6); if (sum) pop(x, y - 30, '+' + fmt(sum), '#ffb347', true);
  },
  honey(e) {
    const amt = Math.max(30, capMax() * .2) * brewValue();
    S.rp += amt; S.stats.earn += amt;
    pop(player.x, player.y - 50, '+' + fmt(amt) + ' rupees', '#ffd24a', true);
    burst(player.x, player.y - 20, 24, { type: 'dot', col: '#f9b81b', spd: 110, life: 1, size: 3.2, g: 220 });
    if (Math.random() < .25) { S.items.momo = (S.items.momo || 0) + 1; toast('Found a Momo in the hive', 'momo'); }
  },
  blessing(e) {
    addBuff('blessing', 15);
    E.decals.push({ kind: 'rays', x: player.x, y: player.y, age: 0, dur: 2.2, follow: true });
    burst(player.x, player.y - 20, 30, { type: 'star', col: '#fff1a8', spd: 90, life: 1.4, size: 2.6, g: -40 });
  },
  sniff(e) {
    addBuff('kukur', 15);
    const got = [];
    for (let k = ri(1, 3); k > 0; k--) { const r = Math.random();
      const it = r < .3 ? 'momo' : r < .5 ? 'selroti' : r < .62 ? 'dalbhat' : r < .7 ? pick(['spiceShot', 'glacierShard', 'yakCheese']) : r < .8 ? 'butterTea' : r < .88 ? 'incense' : r < .95 ? 'mysticWheel' : r < .995 ? 'permit' : 'goldenMomo';
      S.items[it] = (S.items[it] || 0) + 1; got.push(ITEMS[it].n); }
    toast(`Kukur Puja! The dog dug up ${got.join(', ')}`, 'paw');
    burst(player.x, player.y - 6, 18, { type: 'petal', col: '#ffa502', spd: 140, life: 1.2, size: 4, g: 120 });
    burst(player.x, player.y, 10, { type: 'smoke', col: 'rgba(120,90,60,.4)', spd: 60, life: .8, size: 7 });
  },
  random(e, fi, tk) {
    const lf = D.syn.has('lostFound');
    const opts = lf ? ['burst', 'honey', 'haste', 'focus', 'blessing'] : ['selfie', 'selfie', 'burst', 'honey', 'haste', 'food'];
    const o = pick(opts);
    if (o === 'selfie') { pop(player.x, player.y - 50, 'Selfie! Nothing happens.', '#ffffff', true); E.decals.push({ kind: 'flash', x: player.x, y: player.y, age: 0, dur: .35 }); return; }
    if (o === 'food') { S.items.momo = (S.items.momo || 0) + 2; toast('The tourist shares 2 momos', 'momo'); return; }
    FX[o](e, fi, tk);
    if (lf && o !== 'burst') FX[o](e, fi, tk);
  },
  prayerWheel(e, fi) {
    const sac = D.syn.has('sacred');
    E.decals.push({ kind: 'wheel', x: e.x, y: e.y, r: 80 * (sac ? 1.5 : 1), age: 0, dur: 10 * (sac ? 2 : 1) });
    burst(e.x, e.y - 10, 20, { type: 'star', col: '#ffd24a', spd: 90, life: 1, size: 2.4, g: -30 });
  },
  petalStorm(e, fi) {
    const ts = TILES[fi].slice().sort(() => Math.random() - .5).slice(0, 30);
    const base = crewAmount(e);
    ts.forEach((t, k) => later(k * .045, () => E.proj.push({ kind: 'petal', x0: e.x, y0: e.y - 18, x1: t.x, y1: t.y, t: 0, dur: .55, arc: rand(-60, 60), hit() { const g = collect(t, base, 'spice', 2); if (Math.random() < .05) addFlame(fi, t.x, t.y, base); burst(t.x, t.y, 4, { type: 'petal', col: '#ff6b81', spd: 70, life: .7, size: 3.2, g: 40 }); if (g) pop(t.x, t.y - 12, '+' + fmt(g), '#ff8fab'); } })));
    burst(e.x, e.y - 18, 26, { type: 'petal', col: '#ff4d6d', spd: 180, life: 1.2, size: 3.6, g: 30 });
  },
  frostMark(e, fi) {
    const t = TILES[fi].reduce((b, q) => dist(q.x, q.y, e.x, e.y) < dist(b.x, b.y, e.x, e.y) ? q : b, TILES[fi][0]);
    const max = D.syn.has('frozenFocus') ? 8 : 5;
    const marks = E.decals.filter(d => d.kind === 'frost');
    const on = marks.find(d => dist(d.x, d.y, t.x, t.y) < 56);
    if (on) { on.lv = Math.min(3, (on.lv || 1) + 1); on.age = 0; pop(on.x, on.y - 24, 'Frost Mark x' + FROST_MUL[on.lv], '#bfefff', true); }
    else { if (marks.length >= max) E.decals.splice(E.decals.indexOf(marks[0]), 1); E.decals.push({ kind: 'frost', x: t.x, y: t.y, age: 0, dur: 15, lv: 1, fi2: fi }); spawnBubble(fi, t.x, t.y, crewAmount(e)); }
    burst(t.x, t.y, 16, { type: 'snow', col: '#d6f3ff', spd: 120, life: .9, size: 2.6 });
    ring(t.x, t.y, 56, '#9be7ff', .45, 3);
  },
  roar(e) {
    addBuff('roar', 10 * (D.syn.has('bigCats') ? 2 : 1));
    for (let k = 0; k < 3; k++) later(k * .15, () => ring(e.x, e.y - 14, 160, '#48dbfb', .7, 5));
    shake(9);
    pop(e.x, e.y - 50, 'ROAR!', '#48dbfb', true);
    if (D.syn.has('bigCats')) { const l = E.crew.find(c => c.m.id === 'leopard'); if (l) FX.pounce(l, fieldAt(player.x, player.y), null, 2); }
  },
  caravan(e) {
    addBuff('caravan', 12);
    E.crew.filter(c => CREW[c.m.id].tags.includes('yak')).forEach(c => burst(c.x, c.y, 14, { type: 'smoke', col: 'rgba(170,140,100,.45)', spd: 80, life: 1, size: 8 }));
    pop(e.x, e.y - 46, 'Caravan Rush!', '#ffe0a3', true);
  },
  footprints(e, fi) {
    const f = FIELDS[fi], ang = rand(0, TAU), base = crewAmount(e);
    for (let k = 0; k < 6; k++) later(k * .28, () => {
      const side = k % 2 ? 1 : -1;
      const x = clamp(e.x + Math.cos(ang) * k * 55 + Math.cos(ang + Math.PI / 2) * side * 16, f.x + 20, f.x + f.w - 20);
      const y = clamp(e.y + Math.sin(ang) * k * 55 + Math.sin(ang + Math.PI / 2) * side * 16, f.yy + 20, f.yy + f.h - 20);
      let sum = 0; tilesNear(fi, x, y, 72).forEach(t => sum += collect(t, base, 'ice', 3));
      E.decals.push({ kind: 'foot', x, y, rot: ang + Math.PI / 2, side, age: 0, dur: 4 }); spawnBubble(fi, x, y, base);
      burst(x, y, 22, { type: 'snow', col: '#ffffff', spd: 150, life: .9, size: 3, g: 60 });
      ring(x, y, 72, '#e3f6ff', .35, 4); shake(5);
      if (sum) pop(x, y - 20, '+' + fmt(sum), '#bfefff', true);
    });
  },
  dive(e, fi) {
    const f = FIELDS[fi], ang = rand(0, TAU), L = Math.hypot(f.w, f.h);
    const cx = e.x, cy = e.y;
    const x0 = cx - Math.cos(ang) * L / 2, y0 = cy - Math.sin(ang) * L / 2, x1 = cx + Math.cos(ang) * L / 2, y1 = cy + Math.sin(ang) * L / 2;
    const hit = new Set(), base = crewAmount(e);
    E.decals.push({ kind: 'trail', x: x0, y: y0, x1, y1, age: 0, dur: 2.4 });
    E.proj.push({ kind: 'bird', x0, y0, x1, y1, t: 0, dur: 1.1, arc: 0, step(x, y) {
      for (const d of E.decals) if (d.kind === 'flame' && !d.dark && dist(x, y, d.x, d.y) < d.r + 24) {
        d.dark = true; d.r = 52; d.age = Math.min(d.age, 1); d.dur += 6;
        ring(d.x, d.y, 60, '#8b3dff', .45, 5); }
      burst(x, y, 2, { type: 'ember', col: '#ffb347', spd: 50, life: .7, size: 3, g: -30 });
      tilesNear(fi, x, y, 40).forEach(t => { if (!hit.has(t)) { hit.add(t); const g = collect(t, base, 'spice', 3); if (g) pop(t.x, t.y - 10, '+' + fmt(g), '#ffb347'); } });
    } });
    shake(4);
  },
  pounce(e, fi, tk, n) {
    if (fi < 0) return;
    const count = n || (5 + (D.syn.has('bigCats') ? 3 : 0)), base = crewAmount(e);
    let k = 0;
    const next = () => {
      if (k++ >= count) return;
      const t = pick(TILES[fi]);
      e.jump = { x0: e.x, y0: e.y, x1: t.x, y1: t.y, t: 0, dur: .32, done() {
        addGoo(t.x, t.y, 48, 10);
        let sum = 0; tilesNear(fi, t.x, t.y, 62).forEach(tt => sum += collect(tt, base, 'cloud', 2.5));
        burst(t.x, t.y, 14, { type: 'smoke', col: 'rgba(170,180,210,.5)', spd: 110, life: .7, size: 7 });
        ring(t.x, t.y, 62, '#c8d6ff', .3, 3);
        if (sum) pop(t.x, t.y - 22, '+' + fmt(sum), '#e6ecff');
        later(.06, next);
      } };
    };
    next();
  },
  gust(e, fi) {
    const f = FIELDS[fi], y = clamp(e.y, f.yy + 30, f.yy + f.h - 30), hit = new Set(), base = crewAmount(e); let sum = 0;
    E.decals.push({ kind: 'band', x: f.x, y, w: f.w, age: 0, dur: 1.3 });
    E.proj.push({ kind: 'wind', x0: f.x, y0: y, x1: f.x + f.w, y1: y, t: 0, dur: 1, arc: 0, step(x) {
      if (Math.random() < .7) E.parts.push({ type: 'spark', x, y: y + rand(-40, 40), vx: 420, vy: 0, life: .35, max: .35, size: 2, col: 'rgba(255,255,255,.8)' });
      TILES[fi].forEach(t => { if (!hit.has(t) && Math.abs(t.y - y) < 46 && t.x < x) { hit.add(t); const g = collect(t, base, 'neutral', 2); sum += g; if (g) burst(t.x, t.y, 2, { type: 'leaf', col: '#ffffff', spd: 90, life: .6, size: 2.6 }); } });
    }, hit() { if (sum) pop(f.x + f.w / 2, y - 30, 'Kite Gust +' + fmt(sum), '#ffffff', true); } });
  }
};

/* ---------------- VFX helpers ---------------- */
function later(t, fn) { E.timers.push({ t, fn }); }
function shake(a) { cam.shake = Math.max(cam.shake, a); }
function ring(x, y, r, col, dur, w) { E.decals.push({ kind: 'ring', x, y, r, col, age: 0, dur, w }); }
function pop(x, y, txt, col, big) { if (E.pops.length > 24) { if (!big) return; E.pops.shift(); } E.pops.push({ x: x + rand(-6, 6), y, txt, col, age: 0, big }); }
function burst(x, y, n, o) {
  if (E.parts.length > 160) n = Math.ceil(n * .4);
  for (let i = 0; i < n && E.parts.length < 280; i++) {
    const a = rand(0, TAU), s = o.spd * rand(.35, 1);
    E.parts.push({ type: o.type, x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s * .7 - (o.up || 0), g: o.g || 0, life: o.life * rand(.7, 1.2), max: o.life * 1.2, size: o.size * rand(.7, 1.3), col: o.col, rot: rand(0, TAU), vr: rand(-6, 6) });
  }
}
const LEAF_COL = { cloud: '#ffffff', spice: '#ff6b5d', ice: '#5cc0f0' };
function leafBurst(t, n) { burst(t.x, t.y - 4, n, { type: 'leaf', col: LEAF_COL[t.col], spd: 70, life: .7, size: 3, g: 90, up: 40 }); }

/* ---------------- update ---------------- */
function update(dt) {
  now += dt;
  for (const k in B) { B[k].t -= dt; if (B[k].t <= 0) delete B[k]; }
  for (let i = E.timers.length - 1; i >= 0; i--) { const t = E.timers[i]; t.t -= dt; if (t.t <= 0) { E.timers.splice(i, 1); t.fn(); } }
  // player
  let ix = joy.x, iy = joy.y;
  if (player.auto) {
    const dx = player.auto.x - player.x, dy = player.auto.y - player.y, d = Math.hypot(dx, dy);
    if (d < 10 || Math.abs(ix) + Math.abs(iy) > .2) player.auto = null; else { ix = dx / d; iy = dy / d; }
  }
  const sp = moveSpeed();
  if (player.fly) {
    const f = player.fly; f.t += dt / f.dur; const u = Math.min(1, f.t), e2 = u < .5 ? 2 * u * u : 1 - Math.pow(-2 * u + 2, 2) / 2;
    player.x = f.x0 + (f.x1 - f.x0) * e2; player.y = f.y0 + (f.y1 - f.y0) * e2; player.h = Math.sin(u * Math.PI) * 260; ix = iy = 0;
    if (Math.random() < .6) E.parts.push({ type: 'snow', x: player.x + rand(-20, 20), y: player.y - player.h + rand(0, 20), vx: 0, vy: 30, g: 0, life: .7, max: .7, size: 2, col: 'rgba(255,255,255,.8)' });
    if (u >= 1) { player.fly = null; player.h = 0; E.crew.forEach(e => { e.x = player.x + rand(-60, 60); e.y = player.y + rand(-40, 40); e.st = 'idle'; e.tile = null; }); ring(player.x, player.y, 90, '#ffffff', .5, 5); burst(player.x, player.y, 24, { type: 'smoke', col: 'rgba(255,255,255,.6)', spd: 120, life: .8, size: 8 }); }
  } else {
    player.x = clamp(player.x + ix * sp * dt, 20, WORLD.w - 20);
    player.y = clamp(player.y + iy * sp * dt, 40, WORLD.h - 20);
    let zt = 0; while (zt + 1 < ZONES.length && zoneOpen(zt + 1)) zt++;
    const minY = ZONES[zt].top > 0 ? ZONES[zt].top + 14 : 40;
    if (player.y < minY) { player.y = minY; if (now - fullWarnT > 3) { fullWarnT = now; toast(`${ZONES[zt + 1].n} needs ${ZONES[zt + 1].gate} crew`, 'lock'); } }
  }
  player.mv = !player.fly && Math.abs(ix) + Math.abs(iy) > .05;
  if (player.mv) S.stats.walk += sp * Math.hypot(ix, iy) * dt;
  S.stats.time += dt;
  // sprouts
  sproutT -= dt; if (sproutT <= 0) { sproutT = rand(150, 300); spawnSprout(-1, SPROUT_WILD, true); }
  // Tihar: Diyo Night
  if (tiharOn()) {
    S.nightClock = (S.nightClock || 0) + dt;
    const nt = isNight();
    if (nt && !wasNight) startNight();
    if (!nt && wasNight) endNight();
    wasNight = nt;
    if (nt && E.stray) {
      const st = E.stray;
      if (!st.on) { st.wait -= dt; if (st.wait <= 0) { st.on = true; toast(`A stray dog wandered into ${FIELDS[st.fi].n}. Gather near it to win its trust`, 'paw'); } }
      else { st.hop -= dt; const f = FIELDS[st.fi]; if (st.hop <= 0) { st.hop = rand(4, 7); st.tx = rand(f.x + 50, f.x + f.w - 50); st.ty = rand(f.yy + 50, f.yy + f.h - 40); }
        const dx = st.tx - st.x, dy = st.ty - st.y, d2 = Math.hypot(dx, dy); st.mv = d2 > 4; if (st.mv) { st.x += dx / d2 * Math.min(d2, 150 * dt); st.y += dy / d2 * Math.min(d2, 150 * dt); st.face = dx > 0 ? 1 : -1; } st.anim += dt; }
    }
  }
  if (Math.abs(ix) > .1) player.face = ix > 0 ? 1 : -1;
  player.anim += dt; player.swing = Math.max(0, player.swing - dt * 4);
  if (player.mv && B.haste && Math.random() < .5) E.parts.push({ type: 'spark', x: player.x - ix * 14 + rand(-8, 8), y: player.y - rand(4, 26), vx: -ix * 160, vy: -iy * 160, life: .25, max: .25, size: 1.6, col: 'rgba(170,245,255,.9)' });
  // tool
  player.swingT -= dt;
  const pf = fieldAt(player.x, player.y);
  if (pf >= 0 && fieldOpen(pf) && S.doko < capMax() && player.swingT <= 0) {
    const tl = tool(); player.swingT = tl.sw; player.swing = 1;
    const cx = player.x + player.face * 10, cy = player.y - 4;
    let sum = 0;
    const reach = tl.r * (B.cloudburst ? 1.5 : 1) * (B.bear ? 1.3 : 1);
    for (const t of TILES[pf]) if (dist(t.x, t.y, cx, cy) < reach) sum += collect(t, tl.amt * (tl.col === t.col ? 1 + (tl.cb || .6) : 1), 'neutral', 1, true);
    if (sum > 0 && Math.random() < .03) dropMat(pf);
    E.decals.push({ kind: 'swoosh', x: cx, y: cy, r: reach, face: player.face, age: 0, dur: .22 });
    if (sum) pop(player.x, player.y - 48, '+' + fmt(sum), '#ffffff');
  } else if (pf >= 0 && !fieldOpen(pf) && now - fullWarnT > 4) { fullWarnT = now; toast(`${FIELDS[pf].n} needs ${FIELDS[pf].gate} crew`, 'lock'); }
  // quest givers nearby
  let nn = null, nd = 75;
  const all = NPCS(); for (const id in all) { const g = all[id], d = dist(player.x, player.y, g.x, g.y); if (d < nd) { nd = d; nn = id; } }
  for (const g of GLIDERS) { const d = dist(player.x, player.y, g.x, g.y); if (d < nd) { nd = d; nn = g.id; } }
  for (const sh of SHOPS) { const d = dist(player.x, player.y, sh.x, sh.y + 20); if (d < nd + 15) { nd = d; nn = 'shop:' + sh.id; } }
  { const d = dist(player.x, player.y, MSHRINE.x, MSHRINE.y + 20); if (d < nd + 15) { nd = d; nn = 'mandala'; } }
  { const d = dist(player.x, player.y, BLENDER.x, BLENDER.y + 20); if (d < nd + 15) { nd = d; nn = 'blender'; } }
  if (tiharOn()) { const d = dist(player.x, player.y, TSTALL.x, TSTALL.y + 20); if (d < nd + 15) { nd = d; nn = 'tihar'; } }
  if (player.fly) nn = null;
  if (nn !== nearNpc) { nearNpc = nn; updateTalk(); }
  // Guiding Star: a random open field gets +50% for 10 minutes
  if (S.pilgrim && Date.now() > S.pilgrim.until) S.pilgrim = null;
  // zone abilities
  mistOn = false;
  for (let i = E.decals.length - 1; i >= 0; i--) {
    const d = E.decals[i];
    if (d.kind === 'mist') { mistOn = true; d.r = Math.min(140, d.r + dt * 4); }
    else if (d.kind === 'starspot' && d.age + dt >= d.dur) {
      const sx2 = d.x, sy2 = d.y, inside = dist(player.x, player.y, sx2, sy2) < d.r + 8;
      E.proj.push({ kind: 'fallstar', x0: sx2 + 80, y0: sy2 - 260, x1: sx2, y1: sy2, t: 0, dur: .35, arc: 0, hit() {
        ring(sx2, sy2, 40, '#7ee08a', .35, 4); burst(sx2, sy2, 10, { type: 'star', col: '#ffe066', spd: 120, life: .6, size: 2.4 });
        if (dist(player.x, player.y, sx2, sy2) < 42) { if (!B.inspire) B.inspire = { t: 5, st: 1 }; else { B.inspire.st = Math.min(10, B.inspire.st + 1); B.inspire.t = 5; } pop(player.x, player.y - 64, `Inspire x${B.inspire.st + 1}`, '#3fae6b', true); } } });
    }
    else if (d.kind === 'flame') {
      d.tick += dt; if (d.tick > (mpas('blazingStar') ? .5 : 1)) { d.tick = 0; kilnFlame = doko().pas === 'kiln'; let got = 0; tilesNear(d.fi, d.x, d.y, d.r).forEach(t => got += collect(t, d.base, 'spice', d.dark ? 2 : 1)); kilnFlame = false; }
      if (Math.random() < dt * 4) E.parts.push({ type: 'ember', x: d.x + rand(-20, 20), y: d.y + rand(-8, 8), vx: 0, vy: -40, g: -20, life: .7, max: .7, size: 2.6, col: d.dark ? '#b06cff' : '#ff8a3d' });
    } else if (d.kind === 'target' && dist(player.x, player.y, d.x, d.y) < d.r) {
      E.decals.splice(i, 1); bullHits++; ring(d.x, d.y, 44, '#e5484d', .35, 4); pop(d.x, d.y - 24, `${bullHits}/3`, '#ffd24a', true);
      if (bullHits >= 3) { bullHits = 0; addBuff('precision', 25, 40); ring(player.x, player.y, 80, '#c06bff', .5, 5); }
    } else if (d.kind === 'bubble' && dist(player.x, player.y, d.x, d.y) < d.r + 10) {
      E.decals.splice(i, 1); let sum = 0; const fz = frostAt(d.x, d.y), vault = doko().pas === 'deepfreeze';
      tilesNear(d.fi, d.x, d.y, fz ? 78 : 52).forEach(t => sum += collect(t, d.base, 'ice', t.col === 'ice' ? 2.5 : 1.5));
      for (let k = 0; k < (fz && vault ? 2 : 1); k++) addBuff('chill', vault ? 60 : 30, vault ? 40 : 20);
      if (B.popstar && d.mine !== false) { B.popstar.st++; addTimed('swell', 4, 3600); }
      burst(d.x, d.y - 10, 14, { type: 'snow', col: '#bfe6ff', spd: 120, life: .6, size: 2.4 }); ring(d.x, d.y, 52, '#9be7ff', .35, 3);
      if (sum) pop(d.x, d.y - 26, '+' + fmt(sum), '#bfefff');
    }
  }
  // Heat: +0.25 per 0.1s standing in a flame (dark flames +0.5), up to 100
  { let inF = null; for (const d of E.decals) if (d.kind === 'flame' && dist(player.x, player.y, d.x, d.y) < d.r) { inF = d; if (d.dark) break; }
    if (inF) { heatT += dt; while (heatT >= .1) { heatT -= .1; const r = (inF.dark ? .5 : .25) * (mpas('blazingStar') ? 1.5 : 1); if (!B.heat) B.heat = { t: 99, st: 0, perm: true }; B.heat.st = Math.min(100, B.heat.st + r); } }
    else { heatT = 0; if (B.heat) { B.heat.st -= 2.5 * dt; if (B.heat.st <= 0) delete B.heat; } }
    if (B.heat) { B.heat.t = 99; B.heat.perm = true; }
    // Dark Heat = dark flames burning right now (max 50)
    const nd = Math.min(50, E.decals.reduce((a, d) => a + (d.kind === 'flame' && d.dark ? 1 : 0), 0));
    if (nd) B.darkheat = { t: 99, st: nd, perm: true }; else delete B.darkheat; }
  // side stars
  // Chakra Saw: brews a big share of the doko straight into rupees while it spins (works with a full bag too)
  if (pf >= 0 && fieldOpen(pf) && mpas('starSaw') && B.saw) { sawT -= dt; if (sawT <= 0) { sawT = .12;
    const sx = player.x + Math.cos(now * 3.2) * 72, sy = player.y + Math.sin(now * 3.2) * 50;
    if (S.doko < capMax()) tilesNear(pf, sx, sy, 38).forEach(t => collect(t, tool().amt * .5, 'neutral', 1));
    const cv2 = Math.min(S.doko, S.doko * .012 + capMax() * .002);
    if (cv2 > 0) { const val = cv2 * brewValue(); S.doko -= cv2; S.rp += val; S.stats.earn += val; sawAcc += val;
      burst(sx, sy - 6, 3, { type: 'star', col: '#ffd24a', spd: 90, life: .5, size: 2.4 }); E.parts.push({ type: 'dot', x: player.x, y: player.y - 30, vx: (sx - player.x) * 2.5, vy: (sy - player.y - 10) * 2.5, g: 0, life: .4, max: .4, size: 3, col: '#ffcf5a' }); }
    sawPopT += .12; if (sawPopT >= .6 && sawAcc > 0) { pop(sx, sy - 30, '+' + fmt(sawAcc), '#ff9f1a', true); sawAcc = 0; sawPopT = 0; } } }
  if (pf >= 0 && fieldOpen(pf) && S.doko < capMax()) {
    if (mpas('starShower')) { showerT -= dt; if (showerT <= 0 && !E.decals.some(d => d.kind === 'starspot')) { showerT = 45; const f = FIELDS[pf];
      for (let k = 0; k < 10; k++) E.decals.push({ kind: 'starspot', x: rand(f.x + 40, f.x + f.w - 40), y: rand(f.yy + 40, f.yy + f.h - 40), r: 34, age: 0, dur: 3 + k * .9, fi: pf }); } }
  }
  // Kiln bag: instant conversion while gathering
  if (doko().pas === 'kiln' && pf >= 0 && S.doko > 0) {
    kilnT += dt;
    if (kilnT >= 20) { kilnT = 0; const conv = S.doko * .06, val = conv * brewValue(); S.doko -= conv; S.rp += val; S.stats.earn += val; pop(player.x, player.y - 70, 'Kiln +' + fmt(val), '#ffb347', true); burst(player.x, player.y - 30, 20, { type: 'ember', col: '#ff8a3d', spd: 140, life: .8, size: 3, g: -60 }); }
  }
  // sky lantern balloons
  for (let i = E.balloons.length - 1; i >= 0; i--) {
    const bl = E.balloons[i];
    if (!bl.home) {
      bl.t -= dt; const f = FIELDS[bl.fi];
      if (dist(bl.x, bl.y, bl.tx, bl.ty) < 8) { bl.tx = rand(f.x + 60, f.x + f.w - 60); bl.ty = rand(f.yy + 60, f.yy + f.h - 40); }
      const dx = bl.tx - bl.x, dy = bl.ty - bl.y, L = Math.hypot(dx, dy) || 1; bl.x += dx / L * 26 * dt; bl.y += dy / L * 26 * dt;
      if (bl.t <= 0 || bl.held >= bl.cap) { bl.home = true; if (bl.held <= 0) E.balloons.splice(i, 1); }
    } else {
      const hx = HLANT.x, hy = HLANT.y, dx = hx - bl.x, dy = hy - bl.y, L = Math.hypot(dx, dy);
      if (L < 20) { S.hiveBal = (S.hiveBal || 0) + bl.held; S.hiveBalTot = (S.hiveBalTot || 0) + bl.held; E.balloons.splice(i, 1); pop(hx, hy - 60, '+' + fmt(bl.held), '#bfe6ff', true); continue; }
      bl.x += dx / L * Math.min(L, 320 * dt); bl.y += dy / L * Math.min(L, 320 * dt);
    }
  }
  // Glacier Star ending: bubbles over the field, more for every bubble popped
  if (B.popstar) lastPopSt = B.popstar.st;
  else if (popWas) { const pf2 = fieldAt(player.x, player.y); if (pf2 >= 0) { const n = Math.min(40, 6 + Math.floor(lastPopSt / 3)), f = FIELDS[pf2]; for (let k = 0; k < n; k++) later(k * .05, () => spawnBubble(pf2, rand(f.x + 30, f.x + f.w - 30), rand(f.yy + 30, f.yy + f.h - 30), 8 * (1 + S.crew.length * .05))); toast(`Glacier Star faded into ${n} bubbles`, 'snow'); } }
  popWas = !!B.popstar;
  // brewing
  brewing = false;
  if (dist(player.x, player.y, BREW.x, BREW.y) < BREW.r && (S.doko > 0 || (S.hiveBal || 0) > 0)) {
    let crewBrew = 0; E.crew.forEach(e => { if (e.st === 'home') crewBrew += CREW[e.m.id].brew * lvlMult(e.m); });
    const rate = Math.max(25 + crewBrew, capMax() / 9) * (B.blessing ? 1.25 : 1) * swellMul(), honey = B.lbless ? 1 + 1.5 * B.lbless.st / 100 : 1;
    if (S.doko > 0) {
      const conv = Math.min(S.doko, rate * dt);
      S.doko -= conv; if (S.doko < .01) S.doko = 0;
      const val = conv * brewValue() * honey; S.rp += val; S.stats.earn += val;
    } else {
      const conv = Math.min(S.hiveBal, Math.max(rate, S.hiveBal / 20) * dt);
      S.hiveBal -= conv; const val = conv * brewValue() * honey; S.rp += val; S.stats.earn += val;
      if (S.hiveBal < 1) { S.hiveBal = 0; const st = blessStacks(S.hiveBalTot); S.hiveBalTot = 0;
        if (!B.lbless || st > B.lbless.st) { B.lbless = { t: 3600, st }; toast(`The teahouse lantern granted you x${st} Lantern Blessing!`, 'diya'); }
        else { B.lbless.t = 3600; toast('The teahouse lantern refreshed your Lantern Blessing!', 'diya'); }
        burst(HLANT.x, HLANT.y - 40, 40, { type: 'star', col: '#ffd27a', spd: 200, life: 1.1, size: 3 }); }
    }
    brewing = true;
    if (Math.random() < .5) E.parts.push({ type: 'coin', x: BREW.x + rand(-30, 30), y: BREW.y - rand(0, 20), vx: rand(-20, 20), vy: -rand(60, 120), g: 60, life: 1, max: 1, size: 3.4, col: '#ffd24a' });
    if (S.doko === 0 && !S.hiveBal) {
      toast('All brewed. Back to the fields', 'cup'); S.stats.brews++;
    }
  }
  if (Math.random() < dt * (brewing ? 12 : 3)) E.parts.push({ type: 'steam', x: brewing && Math.random() < .6 ? STALL.x - 2 : HOUSE.x + teaChimney(), y: brewing && Math.random() < .6 ? STALL.y - 48 : HOUSE.y + houseTop() - 6, vx: rand(-6, 6), vy: -rand(18, 30), g: 0, life: 2.4, max: 2.4, size: rand(5, 8), col: 'rgba(255,255,255,.55)' });
  // crew
  E.crew.forEach((e, i) => updCrew(e, i, dt));
  // blessed sparkles
  if (Math.random() < dt * 6) { const b = E.crew.filter(e => e.m.bl); if (b.length) { const e = pick(b); E.parts.push({ type: 'star', x: e.x + rand(-10, 10), y: e.y - rand(20, 40), vx: 0, vy: -16, g: 0, life: .9, max: .9, size: 1.8, col: '#ffe66d' }); } }
  // tokens
  for (let i = E.tokens.length - 1; i >= 0; i--) {
    const tk = E.tokens[i]; if (!tk) continue; tk.age += dt;
    if (tk.age > tk.life) { E.tokens.splice(i, 1); continue; }
    const d = dist(tk.x, tk.y, player.x, player.y - 10);
    if (d < 30) { E.tokens.splice(i, 1); takeToken(tk); S.stats.tokens = (S.stats.tokens || 0) + 1; }
    else if (d < 70) { tk.x += (player.x - tk.x) * dt * 3; tk.y += (player.y - 10 - tk.y) * dt * 3; }
  }
  // tiles regen
  for (const arr of TILES) for (const t of arr) if (t.v < 1) t.v = Math.min(1, t.v + dt * .045 * (t.rg || 1));
  if (S.spr.placed.length && Math.random() < dt * 8) { const sp = pick(S.spr.placed), a = rand(0, TAU), d = rand(10, SPRINKLERS[S.spr.lv].r); E.parts.push({ type: 'snow', x: sp.x + Math.cos(a) * d * .3, y: sp.y - 18, vx: Math.cos(a) * d * 1.6, vy: Math.sin(a) * d * 1.1 - 40, g: 160, life: .6, max: .6, size: 1.8, col: 'rgba(120,200,255,.9)' }); }
  // projectiles
  for (let i = E.proj.length - 1; i >= 0; i--) {
    const p = E.proj[i]; p.t += dt / p.dur; const u = Math.min(1, p.t);
    const x = p.x0 + (p.x1 - p.x0) * u + Math.sin(u * Math.PI) * p.arc, y = p.y0 + (p.y1 - p.y0) * u - Math.sin(u * Math.PI) * Math.abs(p.arc) * .4;
    p.x = x; p.y = y;
    if (p.step) p.step(x, y);
    if (u >= 1) { E.proj.splice(i, 1); if (p.hit) p.hit(); }
  }
  // decals
  for (let i = E.decals.length - 1; i >= 0; i--) {
    const d = E.decals[i]; d.age += dt;
    if (d.follow) { d.x = player.x; d.y = player.y; }
    if (d.kind === 'wheel' && Math.random() < dt * 14) E.parts.push({ type: 'star', x: d.x + rand(-d.r, d.r) * .8, y: d.y + rand(-d.r, d.r) * .5, vx: 0, vy: -22, g: 0, life: .8, max: .8, size: 1.8, col: '#ffe066' });
    if (d.age > d.dur) E.decals.splice(i, 1);
  }
  // particles
  for (let i = E.parts.length - 1; i >= 0; i--) {
    const p = E.parts[i]; p.life -= dt;
    if (p.life <= 0) { E.parts.splice(i, 1); continue; }
    p.vy += (p.g || 0) * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= .985; p.rot += (p.vr || 0) * dt;
  }
  for (let i = E.pops.length - 1; i >= 0; i--) { const p = E.pops[i]; p.age += dt; if (p.age > (p.big ? 1.6 : 1)) E.pops.splice(i, 1); }
  cam.shake = Math.max(0, cam.shake - dt * 30);
}

/* ---------------- rendering ---------------- */
const cv = document.getElementById('cv'), ctx = cv.getContext('2d');
let DPR = 1, scale = 1, viewH = 800, bgGrad = null;
let lastCW = 0, lastCH = 0, qual = 1, slowT = 0, fastT = 0;
function resize() {
  // iOS home-screen apps with a translucent status bar report a viewport that is
  // shorter than the screen by the status bar height; stretch everything over the gap.
  const portrait = innerHeight > innerWidth, sh = portrait ? Math.max(screen.width, screen.height) : Math.min(screen.width, screen.height);
  const gap = (navigator.standalone || matchMedia('(display-mode: standalone)').matches) ? Math.max(0, Math.min(80, sh - innerHeight)) : 0;
  document.documentElement.classList.toggle('gapfix', portrait && gap > 10);
  DPR = Math.min(2, window.devicePixelRatio || 1) * qual;
  const rc = cv.getBoundingClientRect(), w = rc.width || innerWidth, h = rc.height || innerHeight;
  cv.width = Math.round(w * DPR); cv.height = Math.round(h * DPR);
  if (w > h) { viewH = 440; scale = cv.height / viewH; VIEW_W = cv.width / scale; } else { VIEW_W = 360; scale = cv.width / VIEW_W; viewH = cv.height / scale; }
}
const teaTier = () => { const n = S.crew.length; return n >= 40 ? 4 : n >= 30 ? 3 : n >= 20 ? 2 : n >= 10 ? 1 : 0; };
const houseTop = () => (teaTier() >= 2 ? -132 : -92);
const teaChimney = () => [120, 140, 150, 160, 170][teaTier()] / 2 - 29;

const TOKEN_COL = { spice: '#f0583a', ice: '#2ea4dc', cloud: '#6f7fd0', neutral: '#b07f4c' };
const FIELD_BG = { tea: '#8a6a45', ginger: '#9b7449', glacier: '#c3e2f2', rhodo: '#7d5f40', meadow: '#8fbd5f', juniper: '#7a6a52', saffron: '#a68655', flags: '#b7c3a6', summit: '#dfeaf3' };


/* ---------------- crew sprites: each animation is cached as a few frames ---------------- */
const crewSpr = new Map();
function drawCrewCached(c, id, t, mv, act) {
  const st = mv ? 0 : act ? 1 : 2, P2 = [TAU / 11, TAU / 18, TAU / 2.2][st], NF = st === 2 ? 4 : 6;
  const fr = Math.floor(((t % P2) + P2) % P2 / P2 * NF), res = Math.min(scale, 2.2), key = id + st + fr;
  let sp = crewSpr.get(key);
  if (!sp || sp.res !== res) {
    const W = 84, H = 96, cv2 = document.createElement('canvas'); cv2.width = Math.ceil(W * res); cv2.height = Math.ceil(H * res);
    const c2 = cv2.getContext('2d'); c2.setTransform(res, 0, 0, res, W / 2 * res, (H - 14) * res);
    drawCrewArt(c2, id, fr / NF * P2, mv, act);
    sp = { cv: cv2, res }; crewSpr.set(key, sp);
    if (crewSpr.size > 500) crewSpr.delete(crewSpr.keys().next().value);
  }
  c.drawImage(sp.cv, -42, -82, 84, 96);
}

/* ---------------- static ground, cached in chunks ---------------- */
const GCH = 400, gCache = new Map();
let gUse = 0;
function drawGroundStatic(c, vx0, vy0, vx1, vy1) {
  const vis = (x, y, m = 0) => x > vx0 - m && x < vx1 + m && y > vy0 - m && y < vy1 + m;
  // zones, lowest first; each band paints everything above its border
  c.fillStyle = ZONES[0].col; c.fillRect(vx0, vy0, vx1 - vx0, vy1 - vy0);
  for (const b of BANDS) { if (b.y0 < vy0 - 40) continue; c.fillStyle = b.lip; c.fill(b.lipP); c.fillStyle = b.col; c.fill(b.mainP); c.strokeStyle = 'rgba(43,34,51,.55)'; c.lineWidth = 2; c.stroke(b.line); }
  for (const d of SCATTER) {
    if (!vis(d.x, d.y, 10)) continue;
    if (d.t === 'tuft') { const g = d.z === 2 ? '#7f8c45' : d.z === 1 ? '#3f7f39' : '#5aa647'; line(c, d.x - 4, d.y, d.x - 6, d.y - 5, g, 1.6); line(c, d.x, d.y, d.x, d.y - 7, g, 1.6); line(c, d.x + 4, d.y, d.x + 6, d.y - 5, g, 1.6); }
    else if (d.t === 'flower') { circ(c, d.x, d.y, 2.2, d.k > .85 ? '#ffd166' : '#ffffff', false); circ(c, d.x + 6, d.y + 3, 1.6, d.k > .85 ? '#ffffff' : '#ffd166', false); }
    else if (d.t === 'pebble') ell(c, d.x, d.y, 4, 2.6, '#8f9a5c', false);
    else if (d.t === 'crack') { line(c, d.x - 8, d.y, d.x, d.y - 3, '#9cc8e4', 1.6); line(c, d.x, d.y - 3, d.x + 7, d.y + 2, '#9cc8e4', 1.6); }
    else { line(c, d.x - 4, d.y, d.x, d.y - 3, '#b9d3e3', 1.6); line(c, d.x, d.y - 3, d.x + 4, d.y, '#b9d3e3', 1.6); }
  }
  // plaza at the foot
  ell(c, PLAZA.x, PLAZA.y, 250, 100, '#e2cfa3'); ell(c, PLAZA.x, PLAZA.y, 232, 88, '#ecdcb5', false);
  for (let i = 0; i < 26; i++) { const a = i / 26 * TAU; ell(c, PLAZA.x + Math.cos(a) * 190, PLAZA.y + Math.sin(a) * 70, 11, 5.5, 'rgba(255,255,255,.35)', false); }
  // natural dirt trail
  for (const t of TRAIL) if (vis(t.x, t.y, 30)) circ(c, t.x, t.y + 2, t.r + 4, 'rgba(110,80,45,.22)', false);
  for (const t of TRAIL) if (vis(t.x, t.y, 30)) circ(c, t.x, t.y, t.r + 2, '#bf9862', false);
  for (const t of TRAIL) if (vis(t.x, t.y, 30)) circ(c, t.x, t.y, t.r, '#d0ab76', false);
  for (const t of TRAIL) if (t.spot && vis(t.x, t.y, 30)) ell(c, t.x + t.sx, t.y + t.sy, t.r * .45, t.r * .3, '#dcbb8a', false);
  for (const st of STONES) if (vis(st.x, st.y, 10)) { ell(c, st.x, st.y + 1.2, st.r, st.r * .7, 'rgba(90,64,38,.3)', false); ell(c, st.x, st.y, st.r, st.r * .7, st.c, false); }

  FIELDS.forEach((f, fi) => {
    if (!vis(f.x + f.w / 2, f.yy + f.h / 2, Math.max(f.w, f.h))) return;
    rr(c, f.x - 6, f.yy + 6, f.w + 12, f.h + 6, 22, 'rgba(0,0,0,.14)', false);
    P(c); c.roundRect(f.x, f.yy, f.w, f.h, 20); fs(c, FIELD_BG[f.id], 2.4);
    c.save(); P(c); c.roundRect(f.x, f.yy, f.w, f.h, 20); c.clip();
    for (let j = 0; j < f.h; j += TILE * 2) { c.fillStyle = 'rgba(0,0,0,.05)'; c.fillRect(f.x, f.yy + j, f.w, TILE); }
    P(c); c.roundRect(f.x + 5, f.yy + 5, f.w - 10, f.h - 10, 16); c.strokeStyle = 'rgba(255,255,255,.22)'; c.lineWidth = 3; c.stroke();
    c.restore();
    // sign
    const label = `${f.n}  Lv ${f.lv[0]}${f.lv[1] > f.lv[0] ? '-' + f.lv[1] : ''}`;
    c.font = '800 12px -apple-system,system-ui,sans-serif';
    const tw = c.measureText(label).width + 34;
    P(c); c.roundRect(f.x + 12, f.yy - 26, tw, 24, 8); fs(c, '#9a6a45', 2);
    rr(c, f.x + 15, f.yy - 23, tw - 6, 4, 2, 'rgba(255,255,255,.18)', false);
    const fc = f.c === 'mix' ? '#9b6ef3' : f.c === 'cloud' ? '#8e9bd6' : COL[f.c].c;
    circ(c, f.x + 25, f.yy - 14, 7, '#fff7e6', false);
    drawIcon(c, f.c === 'mix' ? 'sparkle' : COL[f.c].i, f.x + 25, f.yy - 14, 10, fc, 2.6);
    c.fillStyle = '#fff7e6'; c.textAlign = 'left'; c.fillText(label, f.x + 37, f.yy - 9.5);
  });
}
function groundRes() { return Math.min(scale, 2); }
function drawGroundCached(c, vx0, vy0, vx1, vy1) {
  const res = groundRes(); gUse++;
  let built = 0;
  for (let cy = Math.floor(vy0 / GCH); cy * GCH < vy1; cy++) for (let cx = Math.floor(vx0 / GCH); cx * GCH < vx1; cx++) {
    const key = cx + ',' + cy; let ch = gCache.get(key);
    if (!ch || ch.res !== res) {
      if (built >= 2 && ch) { c.drawImage(ch.cv, cx * GCH - 1, cy * GCH - 1, GCH + 2, GCH + 2); ch.use = gUse; continue; }
      built++;
      const cv2 = ch && ch.cv ? ch.cv : document.createElement('canvas'); const px = Math.ceil((GCH + 2) * res);
      cv2.width = px; cv2.height = px;
      const c2 = cv2.getContext('2d'); c2.setTransform(res, 0, 0, res, (-cx * GCH + 1) * res, (-cy * GCH + 1) * res);
      drawGroundStatic(c2, cx * GCH - 1, cy * GCH - 1, cx * GCH + GCH + 1, cy * GCH + GCH + 1);
      ch = { cv: cv2, res }; gCache.set(key, ch);
    }
    ch.use = gUse;
    c.drawImage(ch.cv, cx * GCH - 1, cy * GCH - 1, GCH + 2, GCH + 2);
  }
  if (gCache.size > 20) { const old = [...gCache.entries()].sort((a, b) => a[1].use - b[1].use).slice(0, gCache.size - 20); old.forEach(([k]) => gCache.delete(k)); }
}

function render() {
  const c = ctx;
  const pw = clamp(1.6 - Math.hypot((player.x - PLAZA.x) / 260, (player.y - PLAZA.y) / 140), 0, 1);
  cam.tx = player.x + (PLAZA.x + 10 - player.x) * pw;
  cam.sx = cam.sx == null ? cam.tx : cam.sx + (cam.tx - cam.sx) * .12;
  cam.x = clamp(cam.sx - VIEW_W / 2, 0, WORLD.w - VIEW_W);
  cam.y = clamp(player.y - (player.h || 0) * .6 - viewH * .56, -150, WORLD.h - viewH + 120);
  const sx = (Math.random() - .5) * cam.shake, sy = (Math.random() - .5) * cam.shake;
  c.setTransform(scale, 0, 0, scale, (-cam.x + sx) * scale, (-cam.y + sy) * scale);
  const vx0 = cam.x - 60, vy0 = cam.y - 60, vx1 = cam.x + VIEW_W + 60, vy1 = cam.y + viewH + 80;
  const vis = (x, y, m = 0) => x > vx0 - m && x < vx1 + m && y > vy0 - m && y < vy1 + m;

  drawGroundCached(c, vx0, vy0, vx1, vy1);
  // fields
  FIELDS.forEach((f, fi) => {
    if (!vis(f.x, f.yy, Math.max(f.w, f.h))) return;
    const hasFrost = E.decals.some(d => d.kind === 'frost' && (d.fi2 != null ? d.fi2 : (d.fi2 = fieldAt(d.x, d.y))) === fi);
    if (hasFrost || B.butterbomb) { c.save(); P(c); c.roundRect(f.x, f.yy, f.w, f.h, 20); c.clip(); drawFrostSheet(c, fi); }
    if (B.butterbomb && fi === fieldAt(player.x, player.y)) { c.fillStyle = 'rgba(255,232,160,.4)'; c.fillRect(f.x, f.yy, f.w, f.h); }
    if (hasFrost || B.butterbomb) c.restore();
    const showLv = FIELDS[fi].lv[1] > 1 && scale > 1.6;
    if (showLv) { c.fillStyle = 'rgba(43,34,51,.55)'; c.font = '800 7px -apple-system,system-ui,sans-serif'; c.textAlign = 'center'; }
    for (const t of TILES[fi]) {
      if (t.x < vx0 - 20 || t.x > vx1 + 20 || t.y < vy0 - 20 || t.y > vy1 + 20) continue;
      const s = TILE * 1.1 * (.3 + .7 * t.v), img = flowerSprite(t.col, t.lv), sw = Math.sin(now * 1.6 + t.wob) * 1.2;
      c.globalAlpha = .55 + .45 * t.v;
      c.drawImage(img, t.x - s / 2 + sw, t.y - s / 2, s, s);
      if (showLv && t.lv > 1 && t.v > .5) { c.globalAlpha = 1; c.fillText(t.lv, t.x + 13, t.y + 17); }
    }
    c.globalAlpha = 1;
    if (S.pilgrim && S.pilgrim.f === fi) { P(c); c.roundRect(f.x - 6, f.yy - 6, f.w + 12, f.h + 12, 24); c.strokeStyle = `rgba(255,210,74,${.6 + Math.sin(now * 3) * .3})`; c.lineWidth = 6; c.stroke(); }
  });

  // sprinkler zones
  for (const sp of S.spr.placed) {
    const r = SPRINKLERS[S.spr.lv].r; if (!vis(sp.x, sp.y, r)) continue;
    circ(c, sp.x, sp.y, r, 'rgba(90,180,240,.13)', false);
    P(c); c.arc(sp.x, sp.y, r, 0, TAU); c.setLineDash([6, 7]); c.lineDashOffset = now * 10; c.strokeStyle = 'rgba(80,170,235,.65)'; c.lineWidth = 2; c.stroke(); c.setLineDash([]);
  }
  // ground decals
  for (const d of E.decals) drawDecalGround(c, d);
  // sell spot
  const pul = 1 + Math.sin(now * 4) * .04;
  ell(c, BREW.x, BREW.y, BREW.r * pul, BREW.r * .5 * pul, brewing ? 'rgba(63,174,107,.35)' : 'rgba(255,138,61,.22)', false);
  P(c); c.ellipse(BREW.x, BREW.y, BREW.r * pul, BREW.r * .5 * pul, 0, 0, TAU); c.setLineDash([7, 6]); c.lineDashOffset = -now * 20; c.strokeStyle = brewing ? '#3fae6b' : '#ff8a3d'; c.lineWidth = 2.6; c.stroke(); c.setLineDash([]);
  // y-sorted world objects
  const objs = [];
  for (const d of DECOR) if (vis(d.x, d.y, 60)) objs.push({ y: d.y, f: () => { c.save(); c.translate(d.x, d.y); ({ pine: () => drawPine(c, d.s, d.snow), rock: () => drawRock(c, d.s, d.snow), tree: () => drawTreeRound(c, d.s), autumn: () => drawTreeRound(c, d.s, '#f2a33a'), bush: () => drawBush(c, d.s), dead: () => drawDeadBush(c, d.s), chorten: () => drawChorten(c, now), flagpole: () => drawSummitFlag(c, now), cloud: () => drawCloud(c, d.s), icicle: () => drawIcicle(c, d.s) })[d.type](); c.restore(); } });
  if (vis(HOUSE.x, HOUSE.y, 200)) objs.push({ y: HOUSE.y, f: () => { c.save(); c.translate(HOUSE.x, HOUSE.y); drawTeahouse(c, teaTier(), now); c.restore(); } });
  const allN = NPCS(); for (const id in allN) { const g = allN[id]; if (vis(g.x, g.y, 80)) objs.push({ y: g.y, f: () => drawGiver(c, id, g) }); }
  for (const sp of S.spr.placed) if (vis(sp.x, sp.y, 60)) objs.push({ y: sp.y, f: () => drawSprinkler(c, sp) });
  for (const g of GATES) if (vis(g.x, g.y, 140)) objs.push({ y: g.y, f: () => drawGate(c, g) });
  for (const g of GLIDERS) if (vis(g.x, g.y, 80)) objs.push({ y: g.y, f: () => drawGlider(c, g) });
  if (tiharOn() && vis(TSTALL.x, TSTALL.y, 120)) objs.push({ y: TSTALL.y, f: () => { c.save(); c.translate(TSTALL.x, TSTALL.y); drawTiharStall(c, now); c.restore(); } });
  for (const sp of S.sprouts) if (vis(sp.x, sp.y, 60)) objs.push({ y: sp.y, f: () => drawSprout(c, sp) });
  if (vis(BLENDER.x, BLENDER.y, 120)) objs.push({ y: BLENDER.y, f: () => { c.save(); c.translate(BLENDER.x, BLENDER.y); drawBlender(c, now); c.restore(); } });
  if (vis(MSHRINE.x, MSHRINE.y, 120)) objs.push({ y: MSHRINE.y, f: () => { c.save(); c.translate(MSHRINE.x, MSHRINE.y); drawMandalaShrine(c, now); c.restore(); } });
  for (const sh of SHOPS) if (vis(sh.x, sh.y, 120)) objs.push({ y: sh.y, f: () => { c.save(); c.translate(sh.x, sh.y); drawShop(c, sh, now); c.restore(); } });
  if (vis(STALL.x, STALL.y, 120)) objs.push({ y: STALL.y, f: () => { c.save(); c.translate(STALL.x, STALL.y); drawStall(c, now, brewing); c.restore(); } });
  for (const e of E.crew) if (vis(e.x, e.y, 40)) objs.push({ y: e.y, f: () => drawCrewEnt(c, e) });
  objs.push({ y: player.y, f: () => {
    c.save(); c.translate(player.x, player.y);
    ell(c, 0, 1, 12 * (1 - (player.h || 0) / 520), 4.5, 'rgba(0,0,0,.22)', false);
    c.translate(0, -(player.h || 0));
    if (player.h) { P(c); c.moveTo(-30, -44); c.quadraticCurveTo(0, -72, 30, -44); c.quadraticCurveTo(0, -58, -30, -44); fs(c, '#ff8a3d', 2); line(c, -24, -46, -4, -24, OUT, 1); line(c, 24, -46, 4, -24, OUT, 1); }
    c.scale(player.face, 1);
    const dc = ['#c8913e', '#b5651d', '#8d6e63', '#6d4c41', '#2e86de', '#74b9ff', '#a29bfe'][DOKOS.findIndex(d => d.id === S.dokoId)];
    const tl = tool(); if (B.bear) { c.scale(1.35, 1.35); ANIMALS.bear(c, player.anim, player.mv, false); } else drawPlayer(c, player.anim, player.mv, player.swing, dc, { hat: S.hat, toolIcon: tl.i, toolCol: tl.col ? TOKEN_COL[tl.col] : '#5d6670' });
    c.restore();
    const fillF = Math.min(1, S.doko / capMax());
    if (S.mandala) { const tc = MANDALA_TIERS.find(q => q.id === S.mandala.tier).col, a = now * 2.2, ox = player.x + Math.cos(a) * 20, oy = player.y - 22 - (player.h || 0) + Math.sin(a) * 7; c.save(); c.translate(ox, oy); c.rotate(now * 3); for (let k = 0; k < 6; k++) { c.rotate(TAU / 6); ell(c, 4, 0, 3.4, 1.8, tc, false); } circ(c, 0, 0, 2.6, '#ffffff'); c.restore(); }
    if (player.h) return;
    rr(c, player.x - 14, player.y + 7, 28, 4, 2, 'rgba(0,0,0,.35)', false);
    rr(c, player.x - 14, player.y + 7, 28 * fillF, 4, 2, fillF >= 1 ? '#ff5a6e' : '#ffd24a', false);
  } });
  objs.sort((a, b) => a.y - b.y).forEach(o => o.f());

  // flags
  for (const [x1, y1, x2, y2] of FLAGS) if (vis(x1, y1, 400)) drawFlagLine(c, x1, y1 - 40, x2, y2 - 40, now);

  // locked fields
  FIELDS.forEach((f, fi) => {
    if (fieldOpen(fi) || !vis(f.x, f.yy, Math.max(f.w, f.h))) return;
    rr(c, f.x, f.yy, f.w, f.h, 18, 'rgba(18,22,38,.55)', false);
    circ(c, f.x + f.w / 2, f.yy + f.h / 2 - 12, 18, '#ffffff');
    drawIcon(c, 'lock', f.x + f.w / 2, f.yy + f.h / 2 - 12, 20, OUT, 2.4);
    c.fillStyle = '#fff'; c.textAlign = 'center'; c.font = '800 14px -apple-system,system-ui,sans-serif';
    c.fillText(`Need ${f.gate} crew`, f.x + f.w / 2, f.yy + f.h / 2 + 24);
  });

  // tokens
  for (const tk of E.tokens) {
    const bob = Math.sin(now * 4 + tk.x) * 3, blink = tk.life - tk.age < 2 && Math.floor(now * 8) % 2;
    if (blink) continue;
    const pulse = 1 + Math.sin(now * 6) * .06;
    c.save(); c.translate(tk.x, tk.y - 14 + bob); c.scale(pulse, pulse);
    const tc = TOKEN_COL[CREW[tk.e.m.id].c];
    c.globalAlpha = .3; circ(c, 0, 0, 20, tc, false); c.globalAlpha = 1;
    circ(c, 0, 0, 14, '#ffffff');
    P(c); c.arc(0, 0, 17, -Math.PI / 2, -Math.PI / 2 + TAU * (1 - tk.age / tk.life)); c.strokeStyle = '#ffffff'; c.lineWidth = 2.5; c.stroke();
    drawIcon(c, ABIL[tk.ab].i, 0, 0, 16, tc, 2.6);
    c.restore();
  }
  // projectiles
  for (const p of E.proj) drawProj(c, p);
  // particles
  for (const p of E.parts) drawPart(c, p);
  // top decals (rays, flash, focus)
  for (const d of E.decals) drawDecalTop(c, d);
  for (const bl of E.balloons) if (vis(bl.x, bl.y, 120)) drawSkyBalloon(c, bl);
  if (B.popstar) { const gx = player.x, gy = player.y - 110 - (player.h || 0) + Math.sin(now * 2) * 4, gr = 18 + Math.min(14, B.popstar.st * .06); c.save(); c.globalAlpha = .35 + Math.sin(now * 6) * .1; circ(c, gx, gy, gr * 2, '#bfefff', false); c.restore(); drawStarShape(c, gx, gy, gr, now * 1.5, '#d6f3ff'); drawStarShape(c, gx, gy, gr * .5, -now * 2, '#4fb6e6'); }
  if ((S.hiveBal > 0 || E.balloons.some(b2 => b2.home)) && vis(HLANT.x, HLANT.y, 160)) drawHiveLantern(c);
  if (mpas('starSaw') && B.saw && fieldAt(player.x, player.y) >= 0) { const sx = player.x + Math.cos(now * 3.2) * 72, sy = player.y + Math.sin(now * 3.2) * 50; c.save(); c.globalAlpha = .28 + Math.sin(now * 10) * .08; circ(c, sx, sy, 42, '#ffb347', false); c.globalAlpha = .5; line(c, player.x, player.y - 30, sx, sy - 6, '#ffcf5a', 3); c.restore(); drawStarShape(c, sx, sy - 6, 20, now * 16, '#ffd24a'); drawStarShape(c, sx, sy - 6, 9, -now * 20, '#ff8a3d'); }
  // popups
  c.textAlign = 'center';
  for (const p of E.pops) {
    const u = p.age / (p.big ? 1.6 : 1), y = p.y - u * 34, a = 1 - Math.max(0, u - .6) / .4;
    c.globalAlpha = a; c.font = `800 ${p.big ? 15 : 11}px -apple-system,system-ui,sans-serif`;
    c.lineWidth = 3; c.strokeStyle = 'rgba(20,24,40,.85)'; c.strokeText(p.txt, p.x, y); c.fillStyle = p.col; c.fillText(p.txt, p.x, y);
  }
  c.globalAlpha = 1;

  // Diyo Night darkness and lamps
  if (tiharOn()) {
    const ph = (S.nightClock || 0) % NIGHT_EVERY - (NIGHT_EVERY - NIGHT_LEN), dk = ph > 0 ? Math.min(1, ph / 4, (NIGHT_LEN - ph) / 4) : 0;
    if (dk > 0) {
      c.setTransform(DPR, 0, 0, DPR, 0, 0);
      const W = c.canvas.width / DPR, H = c.canvas.height / DPR, px = (player.x - cam.x) * scale / DPR, py = (player.y - (player.h || 0) - 20 - cam.y) * scale / DPR;
      const g = c.createRadialGradient(px, py, 45, px, py, Math.max(W, H) * .62);
      g.addColorStop(0, 'rgba(14,16,48,0)'); g.addColorStop(.22, `rgba(14,16,48,${.55 * dk})`); g.addColorStop(1, `rgba(8,8,30,${.84 * dk})`);
      c.fillStyle = g; c.fillRect(0, 0, W, H);
      c.setTransform(scale, 0, 0, scale, (-cam.x + sx) * scale, (-cam.y + sy) * scale);
      for (const d of E.diyas || []) if (vis(d.x, d.y, 60)) drawDiya(c, d);
      if (E.stray && E.stray.on && vis(E.stray.x, E.stray.y, 60)) { const st = E.stray; c.save(); c.translate(st.x, st.y); ell(c, 0, 2, 16, 5, 'rgba(0,0,0,.25)', false); c.scale(st.face * 1.3, 1.3); drawCrewArt(c, 'tiharDog', st.anim, st.mv, false); c.restore();
        const u = st.trust / st.need; rr(c, st.x - 26, st.y - 52, 52, 8, 4, '#ffffff', true); rr(c, st.x - 24.5, st.y - 50.5, 49 * u, 5, 2.5, '#ff6b8a', false); drawIcon(c, 'heart', st.x - 34, st.y - 48, 11, '#ff6b8a', 2.4); }
    }
  }
  // joystick (screen space)
  c.setTransform(DPR, 0, 0, DPR, 0, 0);
  if (joy.on) {
    circ(c, joy.ox, joy.oy, 52, 'rgba(255,255,255,.12)', false);
    P(c); c.arc(joy.ox, joy.oy, 52, 0, TAU); c.strokeStyle = 'rgba(255,255,255,.35)'; c.lineWidth = 2; c.stroke();
    circ(c, joy.ox + joy.kx, joy.oy + joy.ky, 22, 'rgba(255,255,255,.75)', false);
  }
}

function glideTo(id) {
  const g = GLIDERS.find(q => q.id === id); if (!g || player.fly) return;
  player.auto = null; player.fly = { x0: player.x, y0: player.y, x1: g.x, y1: g.y + 40, t: 0, dur: 1.2 + Math.abs(player.y - g.y) / 2500 };
  burst(player.x, player.y, 20, { type: 'smoke', col: 'rgba(255,255,255,.6)', spd: 120, life: .8, size: 8 });
}
function drawGate(c, g) {
  const z = ZONES[g.z], open = zoneOpen(g.z);
  c.save(); c.translate(g.x, g.y);
  if (!open) { P(c); c.moveTo(-WORLD.w, 0); c.lineTo(WORLD.w, 0); c.setLineDash([10, 10]); c.strokeStyle = 'rgba(229,72,77,.45)'; c.lineWidth = 3; c.stroke(); c.setLineDash([]); }
  for (const sx of [-58, 58]) { rr(c, sx - 10, -64, 20, 66, 4, '#a3a7b4'); rr(c, sx - 13, -70, 26, 10, 3, '#8c909c'); }
  rr(c, -70, -82, 140, 14, 4, '#9a6a45');
  if (!open) { rr(c, -48, -30, 96, 10, 3, '#c0392b'); rr(c, -48, -14, 96, 10, 3, '#c0392b'); }
  const label = open ? `${z.n} · ${z.alt}` : `${z.n} · ${z.gate} crew`;
  c.font = '800 11px -apple-system,system-ui,sans-serif'; const tw = c.measureText(label).width + 30;
  P(c); c.roundRect(-tw / 2, -112, tw, 24, 9); fs(c, open ? '#ffffff' : '#fff1f1', 1.8);
  drawIcon(c, open ? 'mountain' : 'lock', -tw / 2 + 13, -100, 13, open ? '#3fae6b' : '#e5484d', 2.4);
  c.fillStyle = OUT; c.textAlign = 'left'; c.fillText(label, -tw / 2 + 23, -96);
  c.restore();
}
function drawGlider(c, g) {
  const on = S.crew.length >= GLIDE_GATE && zoneOpen(g.z);
  c.save(); c.translate(g.x, g.y);
  ell(c, 0, 2, 40, 15, 'rgba(0,0,0,.15)', false);
  ell(c, 0, 0, 38, 14, '#c9c2b6'); ell(c, 0, -2, 30, 10, on ? '#ffd27a' : '#ddd6ca', false);
  line(c, -16, -4, -10, -40, OUT, 4); line(c, -16, -4, -10, -40, '#8a5a3b', 2.2); line(c, 16, -4, 10, -40, OUT, 4); line(c, 16, -4, 10, -40, '#8a5a3b', 2.2);
  const flap = Math.sin(now * 2 + g.x) * 2;
  P(c); c.moveTo(-34, -40 + flap); c.quadraticCurveTo(0, -66, 34, -40 - flap); c.quadraticCurveTo(0, -54, -34, -40 + flap); fs(c, on ? '#ff8a3d' : '#b9b2a6', 2);
  for (let i = -2; i <= 2; i++) line(c, i * 12, -50 + Math.abs(i) * 3, i * 12, -45 + Math.abs(i) * 3, 'rgba(255,255,255,.6)', 2);
  c.font = '800 10px -apple-system,system-ui,sans-serif'; const tw = c.measureText('Glider').width + 14;
  P(c); c.roundRect(-tw / 2, 14, tw, 17, 8.5); fs(c, '#ffffff', 1.6); c.fillStyle = OUT; c.textAlign = 'center'; c.fillText('Glider', 0, 26);
  c.restore();
}
function drawSprinkler(c, sp) {
  const lv = S.spr.lv, col = ['#8fbf5a', '#d9864a', '#c9d2dc', '#f0c040', '#7fd3ff', '#b98af5'][lv];
  c.save(); c.translate(sp.x, sp.y);
  ell(c, 0, 1, 9, 3.5, 'rgba(0,0,0,.2)', false);
  line(c, 0, 0, 0, -16, OUT, 5); line(c, 0, 0, 0, -16, '#7a828c', 3);
  c.save(); c.translate(0, -18); c.rotate(now * 4);
  rr(c, -9, -2.5, 18, 5, 2.5, col); circ(c, 0, 0, 3.6, '#ffffff');
  c.restore();
  for (let k = 0; k < 2; k++) { const a = now * 4 + k * Math.PI; P(c); c.arc(0, -18, 14, a - .3, a + .3); c.strokeStyle = 'rgba(120,200,255,.7)'; c.lineWidth = 2; c.stroke(); }
  c.restore();
}
function drawGiver(c, id, g) {
  const near = nearNpc === id, st = giverState(id), bob = Math.sin(now * 2 + g.x) * 1.2, locked = st === 'locked';
  c.save(); c.translate(g.x, g.y);
  ell(c, 0, 2, 26, 9, 'rgba(0,0,0,.15)', false);
  P(c); c.ellipse(0, 2, 24, 8.5, 0, 0, TAU); c.fillStyle = g.col; c.globalAlpha = .28; c.fill(); c.globalAlpha = 1; c.strokeStyle = g.col; c.lineWidth = 2.4; c.stroke();
  if (near) { P(c); c.ellipse(0, 2, 30 + Math.sin(now * 5) * 2, 11, 0, 0, TAU); c.strokeStyle = '#ffffff'; c.lineWidth = 2; c.stroke(); }
  c.save(); if (locked) c.globalAlpha = .45; c.translate(0, -bob * .3); c.scale((player.x > g.x ? 1 : -1) * 1.35, 1.35); drawNpc(c, id, now); c.restore();
  const top = id === 'yeti' ? -62 : -58;
  const label = locked ? `${g.n} · ${g.gate} crew` : g.n;
  c.font = '800 10px -apple-system,system-ui,sans-serif'; const tw = c.measureText(label).width + 14;
  P(c); c.roundRect(-tw / 2, top - 6, tw, 17, 8.5); fs(c, locked ? '#e9e4ec' : '#ffffff', 1.8);
  c.fillStyle = locked ? '#8c8296' : OUT; c.textAlign = 'center'; c.fillText(label, 0, top + 6);
  const my = top - 24 + (locked ? 0 : Math.sin(now * 4) * 3);
  if (locked) { circ(c, 0, my, 11, '#ffffff'); drawIcon(c, 'lock', 0, my, 13, '#8c8296', 2.6); }
  else if (st === 'ready') { circ(c, 0, my, 11, '#3fae6b'); drawIcon(c, 'check', 0, my, 13, '#ffffff', 3); }
  else if (st === 'active') { circ(c, 0, my, 11, g.rep ? '#2ea4dc' : '#ffb020'); c.fillStyle = '#ffffff'; c.font = '900 14px -apple-system,system-ui,sans-serif'; c.fillText(g.rep ? '?' : '!', 0, my + 5); }
  c.restore();
}
function drawCrewEnt(c, e) {
  const def = CREW[e.m.id];
  c.save(); c.translate(e.x, e.y);
  const sh = e.hop ? .6 : 1;
  ell(c, 0, 1, 11 * sh, 4 * sh, 'rgba(0,0,0,.22)', false);
  P(c); c.ellipse(0, 1, 13, 5, 0, 0, TAU); c.strokeStyle = RAR[def.r].c; c.lineWidth = 1.6; c.globalAlpha = .9; c.stroke(); c.globalAlpha = 1;
  if (e.m.bl) { P(c); c.ellipse(0, 1, 16, 6.5, 0, 0, TAU); c.strokeStyle = 'rgba(255,214,74,' + (.5 + Math.sin(now * 4) * .3) + ')'; c.lineWidth = 2; c.stroke(); }
  const hop = (e.hop || 0) + (e.act ? Math.abs(Math.sin(e.anim * 9)) * 2 : 0);
  c.translate(0, -hop);
  c.scale(e.face, 1);
  drawCrewCached(c, e.m.id, e.anim, e.mv, e.act);
  c.restore();
  if (e.m.bl) { c.save(); c.translate(e.x, e.y - hop - 44); P(c); c.ellipse(0, 0, 7, 2.4, 0, 0, TAU); c.strokeStyle = '#ffd24a'; c.lineWidth = 1.8; c.stroke(); c.restore(); }
  if (e.m.lvl > 1) { c.font = '800 8px -apple-system,system-ui,sans-serif'; c.textAlign = 'center'; c.lineWidth = 2.4; c.strokeStyle = 'rgba(20,24,40,.85)'; c.strokeText(e.m.lvl, e.x + 11, e.y + 3); c.fillStyle = '#fff'; c.fillText(e.m.lvl, e.x + 11, e.y + 3); }
}

/* Frost marks that touch or sit close merge into one ice sheet: the whole sheet uses the highest mark level in it. */
let frostG = [], frostGT = -1;
function frostGroups() {
  if (frostGT === now) return frostG; frostGT = now;
  const ms = E.decals.filter(d => d.kind === 'frost'); ms.forEach(m => { if (m.fi2 == null) m.fi2 = fieldAt(m.x, m.y); }); const par = ms.map((_, i) => i), find = i => par[i] === i ? i : (par[i] = find(par[i])), links = [];
  for (let i = 0; i < ms.length; i++) for (let j = i + 1; j < ms.length; j++) if (dist(ms[i].x, ms[i].y, ms[j].x, ms[j].y) <= 160 && ms[i].fi2 === ms[j].fi2) { par[find(i)] = find(j); links.push([i, j]); }
  const gs = {}; ms.forEach((m, i) => { const r = find(i); (gs[r] = gs[r] || { ms: [], links: [], lv: 0 }).ms.push(m); gs[r].lv = Math.min(3, gs[r].lv + (m.lv || 1)); });
  links.forEach(([i, j]) => gs[find(i)].links.push([ms[i], ms[j]]));
  return (frostG = Object.values(gs));
}
function segDist(px, py, a, b) { const vx = b.x - a.x, vy = b.y - a.y, L = vx * vx + vy * vy || 1, t = Math.max(0, Math.min(1, ((px - a.x) * vx + (py - a.y) * vy) / L)); return Math.hypot(px - a.x - vx * t, py - a.y - vy * t); }
function frostAt(x, y) {
  let lv = 0;
  for (const g2 of frostGroups()) { if (g2.lv <= lv) continue;
    if (g2.ms.some(m => dist(x, y, m.x, m.y) < 56) || g2.links.some(([a, b]) => segDist(x, y, a, b) < 31)) lv = g2.lv; }
  return lv;
}
function drawFrostSheet(c, fi) {
  const ms = E.decals.filter(d => d.kind === 'frost' && d.fi2 === fi); if (!ms.length) return;
  const R2 = d => 56 * Math.min(1, d.age * 5, Math.max(0, d.dur - d.age) * 2);
  const shapes = [];
  ms.forEach(d => { const r = R2(d); if (r > 1) shapes.push(p => { p.moveTo(d.x + r, d.y); p.arc(d.x, d.y, r, 0, TAU); }); });
  for (let i = 0; i < ms.length; i++) for (let j = i + 1; j < ms.length; j++) {
    const a = ms[i], b = ms[j], L = dist(a.x, a.y, b.x, b.y), w = Math.min(R2(a), R2(b)) * .55; if (L > 160 || w < 2 || L < 1) continue;
    const nx = -(b.y - a.y) / L * w, ny = (b.x - a.x) / L * w;
    shapes.push(p => { p.moveTo(a.x + nx, a.y + ny); p.lineTo(b.x + nx, b.y + ny); p.lineTo(b.x - nx, b.y - ny); p.lineTo(a.x - nx, a.y - ny); p.closePath(); });
  }
  c.save(); c.lineJoin = 'round';
  for (const sh of shapes) { P(c); sh(c); c.strokeStyle = '#6cc3ea'; c.lineWidth = 6; c.stroke(); }
  const gl = Math.max(...ms.map(d => frostAt(d.x, d.y)), 1);
  for (const sh of shapes) { P(c); sh(c); c.fillStyle = ['#d6f2ff', '#d6f2ff', '#bde8fb', '#a3dcf7', '#8ad0f2'][gl]; c.fill(); }

  c.restore();
}
function drawDecalGround(c, d) {
  if (d.kind === 'starspot') { const u = Math.min(1, d.age / d.dur); c.save(); circ(c, d.x, d.y, d.r, 'rgba(126,224,138,.22)', false); P(c); c.arc(d.x, d.y, d.r, 0, TAU); c.strokeStyle = '#3fae6b'; c.lineWidth = 2.5; c.stroke(); P(c); c.arc(d.x, d.y, d.r * u, 0, TAU); c.strokeStyle = 'rgba(255,224,102,.9)'; c.lineWidth = 2; c.stroke(); c.restore(); return; }
  const u = d.age / d.dur, a = 1 - u;
  const fadeIO = Math.min(1, d.age * 3, (d.dur - d.age) * 1.5);
  if (d.kind === 'goo') { c.save(); c.globalAlpha = fadeIO * .75; circ(c, d.x, d.y, d.r, '#ffe7a3', false); circ(c, d.x, d.y, d.r * .78, '#fff1c4', false); for (let k = 0; k < 6; k++) { const an = k / 6 * TAU + now * .2; circ(c, d.x + Math.cos(an) * d.r * .55, d.y + Math.sin(an) * d.r * .55, 8, 'rgba(255,255,255,.6)', false); } c.restore(); return; }
  if (d.kind === 'teamark') { c.save(); c.globalAlpha = fadeIO; circ(c, d.x, d.y, d.r, 'rgba(63,174,107,.18)', false); P(c); c.arc(d.x, d.y, d.r, 0, TAU); c.strokeStyle = '#3fae6b'; c.lineWidth = 3; c.setLineDash([8, 6]); c.lineDashOffset = -now * 15; c.stroke(); c.setLineDash([]); drawIcon(c, 'cup', d.x, d.y, 30, 'rgba(63,174,107,.75)', 2.4); c.restore(); return; }
  if (d.kind === 'flame') { const dk = d.dark; c.save(); c.globalAlpha = fadeIO; circ(c, d.x, d.y, d.r, dk ? 'rgba(110,40,200,.28)' : 'rgba(255,106,43,.22)', false); for (let k = 0; k < (dk ? 5 : 4); k++) { const fx = d.x + Math.cos(k * 1.7) * 14, fy = d.y + Math.sin(k * 2.3) * 9, h = (dk ? 18 : 14) + Math.sin(now * 12 + k) * 4; P(c); c.moveTo(fx - 6, fy); c.quadraticCurveTo(fx - 5, fy - h * .6, fx, fy - h); c.quadraticCurveTo(fx + 5, fy - h * .6, fx + 6, fy); c.closePath(); c.fillStyle = dk ? (k % 2 ? '#5b1fb8' : '#b06cff') : (k % 2 ? '#ff6a2b' : '#ffb347'); c.fill(); } c.restore(); return; }
  if (d.kind === 'target') { c.save(); const pulse = 1 + Math.sin(now * 8) * .06; c.translate(d.x, d.y); c.scale(pulse, pulse); c.globalAlpha = Math.min(1, (d.dur - d.age) * 1.5); for (let k = 3; k >= 1; k--) circ(c, 0, 0, d.r * k / 3, k % 2 ? '#e5484d' : '#ffffff', true); c.restore(); return; }
  if (d.kind === 'rope') { c.globalAlpha = a; line(c, d.x, d.y, d.x1, d.y1, '#3fae6b', 3); c.globalAlpha = 1; return; }
  if (d.kind === 'wheel') {
    const fade = Math.min(1, d.age * 3, (d.dur - d.age) * 2);
    c.save(); c.translate(d.x, d.y); c.globalAlpha = fade;
    circ(c, 0, 0, d.r, 'rgba(255,210,74,.16)', false);
    c.rotate(now * 1.2);
    P(c); c.arc(0, 0, d.r, 0, TAU); c.strokeStyle = 'rgba(255,215,90,.9)'; c.lineWidth = 3; c.stroke();
    P(c); c.arc(0, 0, d.r * .72, 0, TAU); c.strokeStyle = 'rgba(255,215,90,.6)'; c.lineWidth = 2; c.stroke();
    for (let i = 0; i < 8; i++) { const an = i / 8 * TAU; line(c, Math.cos(an) * d.r * .2, Math.sin(an) * d.r * .2, Math.cos(an) * d.r * .72, Math.sin(an) * d.r * .72, 'rgba(255,215,90,.7)', 2); circ(c, Math.cos(an) * d.r * .86, Math.sin(an) * d.r * .86, 4, '#ffe066', false); }
    circ(c, 0, 0, d.r * .2, 'rgba(255,215,90,.8)', false);
    c.restore();
  } else if (d.kind === 'frost') {
    const fade = Math.min(1, d.age * 4, (d.dur - d.age));
    const lv = d.lv || 1;
    c.save(); c.translate(d.x, d.y); c.globalAlpha = fade * .55; c.rotate(now * .3); const k2 = .55 + lv * .12;
    for (let i = 0; i < 6; i++) { const an = i / 6 * TAU; line(c, 0, 0, Math.cos(an) * 40 * k2, Math.sin(an) * 40 * k2, '#ffffff', 3); line(c, Math.cos(an) * 22 * k2, Math.sin(an) * 22 * k2, Math.cos(an + .45) * 32 * k2, Math.sin(an + .45) * 32 * k2, '#ffffff', 2); line(c, Math.cos(an) * 22 * k2, Math.sin(an) * 22 * k2, Math.cos(an - .45) * 32 * k2, Math.sin(an - .45) * 32 * k2, '#ffffff', 2); }
    c.restore();
  } else if (d.kind === 'foot') {
    c.save(); c.translate(d.x, d.y); c.rotate(d.rot); c.globalAlpha = Math.min(1, (d.dur - d.age));
    ell(c, 0, 0, 16, 26, 'rgba(120,160,190,.45)', false);
    for (let i = -1; i <= 1; i++) ell(c, i * 9, -30, 5, 7, 'rgba(120,160,190,.45)', false);
    c.restore();
  } else if (d.kind === 'scorch') {
    c.globalAlpha = a * .5; circ(c, d.x, d.y, d.r * .8, 'rgba(60,25,10,.6)', false); c.globalAlpha = 1;
  } else if (d.kind === 'trail') {
    c.globalAlpha = a; line(c, d.x, d.y, d.x1, d.y1, 'rgba(255,120,40,.35)', 22); line(c, d.x, d.y, d.x1, d.y1, 'rgba(255,210,120,.6)', 6); c.globalAlpha = 1;
  } else if (d.kind === 'band') {
    c.globalAlpha = Math.sin(u * Math.PI) * .35; c.fillStyle = '#ffffff'; c.fillRect(d.x, d.y - 46, d.w, 92); c.globalAlpha = 1;
  } else if (d.kind === 'swoosh') {
    c.save(); c.translate(d.x, d.y); c.scale(d.face, .6); c.globalAlpha = a * .8;
    P(c); c.arc(0, 0, d.r, -1.2 + u * .8, .9 + u * .8); c.strokeStyle = '#ffffff'; c.lineWidth = 4 * a + 1; c.lineCap = 'round'; c.stroke();
    c.restore();
  } else if (d.kind === 'ring') {
    c.save(); c.translate(d.x, d.y);
    P(c); c.arc(0, 0, d.r * (.2 + .8 * Math.pow(u, .6)), 0, TAU); c.strokeStyle = d.col; c.globalAlpha = a; c.lineWidth = d.w * a + .5; c.stroke();
    c.restore();
  }
}
function drawDecalTop(c, d) {
  const u = d.age / d.dur;
  if (d.kind === 'bubble') { const fl = Math.sin(now * 2 + d.ph) * 4, fade = Math.min(1, d.age * 4, (d.dur - d.age) * 2); c.save(); c.globalAlpha = fade; circ(c, d.x, d.y - 14 + fl, d.r, 'rgba(160,220,255,.35)', false); P(c); c.arc(d.x, d.y - 14 + fl, d.r, 0, TAU); c.strokeStyle = 'rgba(255,255,255,.9)'; c.lineWidth = 2; c.stroke(); ell(c, d.x - 6, d.y - 20 + fl, 4, 2.4, 'rgba(255,255,255,.85)', false, -.6); c.restore(); return; }
  if (d.kind === 'mist') { const fade = Math.min(1, d.age * 2, (d.dur - d.age)); c.save(); c.globalAlpha = fade * .18; for (let k = 0; k < 9; k++) { const an = k / 9 * TAU + now * .15; circ(c, d.x + Math.cos(an) * d.r * .6, d.y + Math.sin(an) * d.r * .5, d.r * .45, '#ffffff', false); } c.restore(); return; }
  if (d.kind === 'rays') {
    c.save(); c.translate(d.x, d.y); c.globalAlpha = Math.sin(u * Math.PI) * .8;
    for (let i = -2; i <= 2; i++) { P(c); c.moveTo(i * 10 - 6, -260); c.lineTo(i * 10 + 6, -260); c.lineTo(i * 4 + 14, 0); c.lineTo(i * 4 - 14, 0); c.fillStyle = 'rgba(255,240,160,.22)'; c.fill(); }
    c.restore();
  } else if (d.kind === 'flash') {
    c.save(); c.globalAlpha = (1 - u) * .7; c.fillStyle = '#fff'; c.fillRect(cam.x - 50, cam.y - 50, VIEW_W + 100, viewH + 100); c.restore();
  } else if (d.kind === 'focus') {
    c.save(); c.translate(d.x, d.y - 16); c.rotate(now * 2); c.globalAlpha = .75 * Math.min(1, (d.dur - d.age));
    P(c); c.arc(0, 0, 26, 0, TAU); c.strokeStyle = '#4fa3ff'; c.lineWidth = 1.6; c.setLineDash([6, 6]); c.stroke(); c.setLineDash([]);
    for (let i = 0; i < 4; i++) { const an = i * Math.PI / 2; line(c, Math.cos(an) * 20, Math.sin(an) * 20, Math.cos(an) * 32, Math.sin(an) * 32, '#9fd0ff', 2); }
    c.restore();
  }
}
function drawStarShape(c, x, y, r, rot, col) { c.save(); c.translate(x, y); c.rotate(rot); P(c); for (let k = 0; k < 10; k++) { const rr2 = k % 2 ? r * .45 : r, a = k / 10 * TAU - Math.PI / 2; c.lineTo(Math.cos(a) * rr2, Math.sin(a) * rr2); } c.closePath(); fs(c, col, 1.8); c.restore(); }
function drawProj(c, p) {
  if (p.kind === 'fallstar') { c.save(); c.globalAlpha = .5; line(c, p.x + 30, p.y - 90, p.x, p.y, '#fff3b0', 4); c.restore(); drawStarShape(c, p.x, p.y, 9, now * 8, '#ffe066'); return; }
  if (p.kind === 'petal') { c.save(); c.translate(p.x, p.y); c.rotate(now * 10 + p.x); ell(c, 0, 0, 4.5, 2.4, '#ff6b81', false); c.restore(); }
  else if (p.kind === 'bird') {
    const ang = Math.atan2(p.y1 - p.y0, p.x1 - p.x0);
    c.save(); c.translate(p.x, p.y);
    c.globalAlpha = .5; circ(c, 0, 0, 26, 'rgba(255,140,40,.5)', false); c.globalAlpha = 1;
    c.rotate(ang); c.scale(1.6, 1.6); c.translate(-6, 14);
    ANIMALS.danphe(c, now, true); c.restore();
  } else if (p.kind === 'wind') {
    c.save(); c.globalAlpha = .9; c.translate(p.x, p.y); c.rotate(Math.sin(now * 6) * .3);
    poly(c, [0, -12, 9, 0, 0, 14, -9, 0], '#e84393'); c.restore();
  }
}
function drawPart(c, p) {
  const a = Math.min(1, p.life / p.max * 1.6);
  c.globalAlpha = a;
  switch (p.type) {
    case 'spark': line(c, p.x, p.y, p.x - p.vx * .05, p.y - p.vy * .05, p.col, p.size); break;
    case 'leaf': case 'petal': c.save(); c.translate(p.x, p.y); c.rotate(p.rot); ell(c, 0, 0, p.size, p.size * .55, p.col, false); c.restore(); break;
    case 'snow': circ(c, p.x, p.y, p.size, p.col, false); break;
    case 'ember': circ(c, p.x, p.y, p.size * a, p.col, false); circ(c, p.x, p.y, p.size * a * .45, '#fff3c4', false); break;
    case 'smoke': circ(c, p.x, p.y, p.size * (2 - a), p.col, false); break;
    case 'steam': c.globalAlpha = a * .6; circ(c, p.x, p.y, p.size * (1.8 - a * .8), p.col, false); break;
    case 'coin': circ(c, p.x, p.y, p.size, p.col); break;
    case 'star': c.save(); c.translate(p.x, p.y); c.rotate(p.rot); const s = p.size; poly(c, [0, -s * 2, s * .5, -s * .5, s * 2, 0, s * .5, s * .5, 0, s * 2, -s * .5, s * .5, -s * 2, 0, -s * .5, -s * .5], p.col, false); c.restore(); break;
    case 'heart': c.save(); c.translate(p.x, p.y); c.scale(p.size / 7, p.size / 7); P(c); c.moveTo(0, 4); c.bezierCurveTo(-9, -2, -4, -9, 0, -4); c.bezierCurveTo(4, -9, 9, -2, 0, 4); c.fillStyle = '#ff6b8a'; c.fill(); c.restore(); break;
    default: circ(c, p.x, p.y, p.size, p.col, false);
  }
  c.globalAlpha = 1;
}

/* ---------------- input ---------------- */
cv.addEventListener('pointerdown', ev => {
  if (joy.on) return;
  joy.on = true; joy.id = ev.pointerId; joy.ox = ev.clientX; joy.oy = ev.clientY; joy.kx = joy.ky = 0; joy.x = joy.y = 0;
  player.auto = null;
  cv.setPointerCapture(ev.pointerId);
});
cv.addEventListener('pointermove', ev => {
  if (!joy.on || ev.pointerId !== joy.id) return;
  let dx = ev.clientX - joy.ox, dy = ev.clientY - joy.oy; const d = Math.hypot(dx, dy), m = 52;
  if (d > m) { dx = dx / d * m; dy = dy / d * m; }
  joy.kx = dx; joy.ky = dy;
  const n = Math.min(1, d / m), l = Math.max(1, Math.hypot(dx, dy));
  joy.x = d > 4 ? dx / l * n : 0;
  joy.y = d > 4 ? dy / l * n : 0;
});
const joyEnd = ev => { if (ev.pointerId !== joy.id) return; joy.on = false; joy.x = joy.y = 0; };
cv.addEventListener('pointerup', joyEnd); cv.addEventListener('pointercancel', joyEnd);
const KEYS = {};
addEventListener('keydown', e => { KEYS[e.key.toLowerCase()] = true; keyJoy(); });
addEventListener('keyup', e => { KEYS[e.key.toLowerCase()] = false; keyJoy(); });
function keyJoy() {
  if (joy.on) return;
  let x = (KEYS.d || KEYS.arrowright ? 1 : 0) - (KEYS.a || KEYS.arrowleft ? 1 : 0), y = (KEYS.s || KEYS.arrowdown ? 1 : 0) - (KEYS.w || KEYS.arrowup ? 1 : 0);
  const d = Math.hypot(x, y) || 1; joy.x = x / d; joy.y = y / d;
}

/* ---------------- number format ---------------- */
function fmt(n) {
  n = Math.floor(n);
  if (n < 1000) return '' + n;
  const u = ['K', 'M', 'B', 'T', 'Qa', 'Qi']; let i = -1;
  while (n >= 1000 && i < u.length - 1) { n /= 1000; i++; }
  return (n < 10 ? n.toFixed(2) : n < 100 ? n.toFixed(1) : Math.floor(n)) + u[i];
}

/* ---------------- loop, offline, boot ---------------- */
let last = performance.now(), rateSamples = [], saveT = 0, sampleT = 0;
function frame(t) {
  { const ft = t - last; if (ft > 26 && ft < 200) { slowT += ft; fastT = 0; } else if (ft < 19) { fastT += ft; slowT = Math.max(0, slowT - ft * .5); }
    if (slowT > 2500 && qual > .65) { qual = Math.max(.65, qual - .12); slowT = 0; resize(); }
    else if (fastT > 8000 && qual < 1) { qual = Math.min(1, qual + .12); fastT = 0; resize(); } }
  if (cv.clientWidth !== lastCW || cv.clientHeight !== lastCH) { lastCW = cv.clientWidth; lastCH = cv.clientHeight; resize(); }
  const dt = Math.min(.05, (t - last) / 1000); last = t;
  if (S) {
    update(dt);
    render();
    saveT += dt; sampleT += dt;
    if (sampleT > 10) {
      sampleT = 0; rateSamples.push([Date.now(), S.stats.earn]); if (rateSamples.length > 31) rateSamples.shift();
      const a = rateSamples[0], b = rateSamples[rateSamples.length - 1];
      if (b[0] - a[0] > 60000) S.rate = (b[1] - a[1]) / ((b[0] - a[0]) / 1000);
    }
    if (saveT > 5) { saveT = 0; save(); }
    uiTick(dt);
  }
  requestAnimationFrame(frame);
}
function offlineEarnings() {
  const secs = Math.min(8 * 3600, (Date.now() - S.last) / 1000);
  if (secs < 90 || !S.rate) return;
  const eff = LODGE[S.lodge].eff * (D.hive === 'ice' ? 1.2 : 1) * (1 + bp('offline'));
  const amt = S.rate * secs * eff;
  if (amt < 1) return;
  S.rp += amt; S.stats.earn += amt; S.stats.offline += amt;
  const h = Math.floor(secs / 3600), m = Math.floor(secs % 3600 / 60);
  showModal(`<div class="big-ico">${ic('moon')}</div><h2>While you were away</h2>
    <p class="mut">Your crew kept brewing for ${h ? h + 'h ' : ''}${m}m at ${Math.round(eff * 100)}% efficiency.</p>
    <div class="reward">${ic('coin')} ${fmt(amt)}</div>
    <button class="btn primary" onclick="closeModal()">Collect</button>`);
}
function refreshWet() {
  const sp = SPRINKLERS[S.spr.lv];
  for (const arr of TILES) for (const t of arr) { t.wet = 1; t.rg = 1; }
  for (const p of S.spr.placed) for (const t of TILES[p.f] || []) if (dist(t.x, t.y, p.x, p.y) < sp.r) { t.wet = sp.wet; t.rg = sp.rg; }
}
function placeSprinkler() {
  const fi = fieldAt(player.x, player.y);
  if (fi < 0 || !fieldOpen(fi) || !S.spr.n) return;
  const P2 = S.spr.placed;
  const near = P2.findIndex(p => dist(p.x, p.y, player.x, player.y) < 40);
  if (near >= 0) P2.splice(near, 1);
  else if (P2.length >= S.spr.n) P2.shift();
  P2.push({ f: fi, x: Math.round(player.x), y: Math.round(player.y) });
  refreshWet(); save();
  ring(player.x, player.y, SPRINKLERS[S.spr.lv].r, '#6cc4ff', .7, 4);
  burst(player.x, player.y - 10, 24, { type: 'snow', col: '#bfe6ff', spd: 160, life: .8, size: 2.4, g: 120 });
  toast(`${SPRINKLERS[S.spr.lv].n} placed (${P2.length}/${S.spr.n})`, 'drop');
}
function addFlame(fi, x, y, base, dur, force) {
  if (fieldAt(x, y) !== fi || E.decals.filter(d => d.kind === 'flame').length >= (force ? 50 : 18)) return;
  E.decals.push({ kind: 'flame', x, y, r: 44, age: 0, dur: (dur || 6) * (mpas('blazingStar') ? 2 : 1), fi, base, tick: 0 });
}
/* Diyo Night: every open field gets 3 unlit diyas. Gathering near one lights it (needs a lot).
   Light all three for a field-wide bonus. Sometimes a stray dog shows up to befriend. */
function startNight() {
  const cap = capMax(); E.diyas = []; E.litF = {};
  { const open = FIELDS.map((f, i) => i).filter(fieldOpen); let tot = 0; open.forEach(i => tot += 5 - FIELDS[i].z); let q = Math.random() * tot, fi = open[0];
    for (const i of open) { q -= 5 - FIELDS[i].z; if (q <= 0) { fi = i; break; } }
    const f = FIELDS[fi]; E.diyas.push({ fi, x: f.x + f.w * rand(.3, .7), y: f.yy + f.h * rand(.35, .7), need: cap * (.6 + f.z * .45), prog: 0, lit: false, ph: rand(0, TAU), big: true }); }
  E.stray = Math.random() < STRAY_CHANCE ? (() => { const open = FIELDS.map((f, i) => i).filter(fieldOpen), fi = pick(open), f = FIELDS[fi]; return { fi, x: f.x + f.w / 2, y: f.yy + f.h / 2, tx: f.x + f.w / 2, ty: f.yy + f.h / 2, need: cap * (.8 + f.z * .15), trust: 0, wait: rand(10, 60), on: false, hop: 0, face: 1, anim: 0 }; })() : null;
  toast(`Diyo Night! A great lantern waits in ${FIELDS[E.diyas[0].fi].n}`, 'diya');
}
function endNight() {
  if (E.stray && E.stray.on) toast('The stray dog wandered off into the dark', 'paw');
  E.diyas = []; E.stray = null; delete B.litfield; E.litF = {};
}
function nightHit(t, add) {
  for (const d of E.diyas) {
    if (d.lit || d.fi !== t.f || Math.abs(t.x - d.x) > 160 || Math.abs(t.y - d.y) > 130) continue;
    d.prog += add;
    if (d.prog >= d.need) {
      d.lit = true; const z = FIELDS[d.fi].z, n = ri(1 + z * 2, 2 + z * 2);
      giveMari(n, d.x, d.y); burst(d.x, d.y - 14, 30, { type: 'star', col: '#ffcf5a', spd: 160, life: 1, size: 2.8 }); ring(d.x, d.y, 90, '#ffb347', .5, 6); shake(6);
      toast(`The great lantern is lit: +${n} Marigold${n > 1 ? 's' : ''}`, 'marigold'); save();
    }
  }
  const st = E.stray;
  if (st && st.on && t.f === st.fi && Math.abs(t.x - st.x) < 170 && Math.abs(t.y - st.y) < 140) {
    st.trust += add;
    if (st.trust >= st.need) {
      const z = FIELDS[st.fi].z; S.items.tilak = (S.items.tilak || 0) + 1; giveMari(1 + Math.floor(z / 2), st.x, st.y);
      burst(st.x, st.y - 20, 40, { type: 'heart', col: '#ff6b8a', spd: 120, life: 1.4, size: 4, g: -40 });
      toast(`The stray trusts you! Kukur Tilak ${S.items.tilak}/${TILAK_NEED}`, 'paw'); E.stray = null; save();
    }
  }
}
function giveMari(n, x, y) {
  S.items.marigold = (S.items.marigold || 0) + n; S.stats.marigolds = (S.stats.marigolds || 0) + n;
  pop(x, y - 56, '+' + n + ' Marigold', '#ffb347', true);
}
function spawnSprout(fi, odds, wild) {
  if (S.sprouts.length >= 3 || (wild && S.sprouts.some(s2 => s2.wild))) return false;
  if (fi < 0) { const open = FIELDS.map((f, i) => i).filter(i => fieldOpen(i)); fi = pick(open); }
  const f = FIELDS[fi], r = rollOdds(odds), def = SPROUT[r];
  const sp = { f: fi, x: f.x + rand(70, f.w - 70), y: f.yy + rand(70, f.h - 50), r, wild, max: Math.round(capMax() * def.hp * (1 + f.z * .5)) };
  if (fi === fieldAt(player.x, player.y) && !wild) { sp.x = clamp(player.x, f.x + 60, f.x + f.w - 60); sp.y = clamp(player.y - 40, f.yy + 60, f.yy + f.h - 40); }
  sp.hp = sp.max; S.sprouts.push(sp);
  burst(sp.x, sp.y - 10, 18, { type: 'leaf', col: def.c, spd: 120, life: .8, size: 3.4, g: 80 });
  if (wild) toast(`A ${def.n} appeared in ${f.n}`, 'sprout');
  return true;
}
function plantSprout(fi) {
  if (!spawnSprout(fi, SPROUT_SEED, false)) { S.items.lotusSeed++; toast('Too many sprouts at once (max 3)', 'sprout'); return; }
  toast(`Planted a ${SPROUT[S.sprouts[S.sprouts.length - 1].r].n}`, 'sprout');
}
function sproutHit(t, add) {
  for (let i = S.sprouts.length - 1; i >= 0; i--) {
    const sp = S.sprouts[i]; if (sp.f !== t.f || Math.abs(t.x - sp.x) > 170 || Math.abs(t.y - sp.y) > 130) continue;
    sp.hp -= add; sp.hit = now; if (sp.hp <= 0) popSprout(i);
  }
}
function sproutLoot(o) {
  const pool = [['chili', 3], ['berry', 3], ['apple', 3], ['momo', 3], ['selroti', 2], ['walnut', 1 + o * .6], ['dalbhat', .5 + o * .6], ['lotusSeed', .15 + o * .12],
    ['permit', o >= 1 ? .12 * o : 0], ['mysticWheel', o >= 2 ? .18 * o : 0], ['gem', o >= 3 ? .35 : 0], ['goldenMomo', o >= 4 ? .3 : 0], ['marigold', tiharOn() ? .4 : 0]];
  let tot = 0; for (const [, w] of pool) tot += w;
  let q = Math.random() * tot; for (const [k, w] of pool) { q -= w; if (q <= 0) return k; } return 'momo';
}
function popSprout(i) {
  const sp = S.sprouts.splice(i, 1)[0], def = SPROUT[sp.r], got = {};
  for (let k = 0; k < def.drops; k++) { const it = sproutLoot(def.o); const n = ['chili', 'berry', 'apple', 'momo'].includes(it) ? ri(2, 4) * (1 + def.o) : it === 'marigold' ? 1 : 1; got[it] = (got[it] || 0) + n; }
  for (const k in got) { S.items[k] = (S.items[k] || 0) + got[k]; if (k === 'marigold') S.stats.marigolds = (S.stats.marigolds || 0) + got[k]; }
  S.stats.sprouts = (S.stats.sprouts || 0) + 1;
  burst(sp.x, sp.y - 20, 40, { type: 'star', col: def.c, spd: 220, life: 1.1, size: 3 });
  burst(sp.x, sp.y - 10, 20, { type: 'leaf', col: '#6cc87a', spd: 160, life: 1, size: 3.5, g: 120 });
  ring(sp.x, sp.y, 110, def.c, .6, 5); cam.shake = Math.max(cam.shake, 5);
  pop(sp.x, sp.y - 70, def.n + '!', def.c, true);
  toast(Object.entries(got).map(([k, n]) => `${ITEMS[k].n} x${n}`).join(', '), 'sprout'); save();
}
function dropMat(fi) {
  const f = FIELDS[fi], r = Math.random();
  let k; if (f.z === 4 && r < .08) k = 'gem'; else if (f.z >= 2 && r < .2) k = 'walnut'; else { let q = Math.random(); k = 'apple'; for (const c2 in f.cw) { q -= f.cw[c2]; if (q <= 0) { k = { spice: 'chili', ice: 'berry', cloud: 'apple' }[c2]; break; } } }
  S.items[k] = (S.items[k] || 0) + 1;
  pop(player.x, player.y - 62, '+1 ' + ITEMS[k].n, '#d6b4ff', true);
  burst(player.x, player.y - 30, 8, { type: 'star', col: '#d6b4ff', spd: 80, life: .7, size: 2 });
}
const abNameT = {};
let lastPopSt = 0, popWas = false, sawAcc = 0, sawPopT = 0, heatT = 0, combo = { n: 0, t: -99 }, bullHits = 0, sawT = 0, showerT = 0;
function spawnBubble(fi, x, y, base) {
  if (fi < 0 || E.decals.filter(d => d.kind === 'bubble').length > 40) return;
  const f = FIELDS[fi];
  E.decals.push({ kind: 'bubble', x: clamp(x, f.x + 24, f.x + f.w - 24), y: clamp(y, f.yy + 24, f.yy + f.h - 24), r: 18, age: 0, dur: 12, fi, base, ph: rand(0, TAU) });
}
function addGoo(x, y, r, dur) {
  if (fieldAt(x, y) < 0 || E.decals.filter(d => d.kind === 'goo').length > 14) return;
  E.decals.push({ kind: 'goo', x, y, r, age: 0, dur: dur * (mpas('butterStar') ? 1.5 : 1) });
}
function butterBomb(fi) {
  addBuff('butterbomb', 20);
  const f = FIELDS[fi]; for (let k = 0; k < 7; k++) later(k * .1, () => burst(rand(f.x, f.x + f.w), rand(f.yy, f.yy + f.h), 10, { type: 'dot', col: '#fff1c4', spd: 120, life: .8, size: 4, g: 160 }));
  pop(player.x, player.y - 70, 'Butter Bomb!', '#fff1c4', true); shake(6);
}
const pseudo = id => ({ x: player.x, y: player.y, m: { id, lvl: 10, bl: false }, face: player.face, anim: 0 });
function abilityFired(col) {
  const pf = fieldAt(player.x, player.y);
  if (col === 'cloud' && doko().pas === 'nimbus') addBuff('nimbusb', 60, 30);
  for (const g of equippedGear()) {
    if (!g.pas) continue;
    const p = PASSIVES[g.pas];
    if (p.col === 'always') continue;
    if (p.col !== 'any' && p.col !== col) continue;
    if (p.cd && Date.now() < ((S.pasCd || {})[g.pas] || 0)) continue;
    S.pas[g.pas] = Math.min(p.need, (S.pas[g.pas] || 0) + 1);
    if (S.pas[g.pas] >= p.need) {
      const fi = fieldAt(player.x, player.y);
      if (fi < 0 || !fieldOpen(fi)) continue;
      S.pas[g.pas] = 0; if (p.cd) { S.pasCd = S.pasCd || {}; S.pasCd[g.pas] = Date.now() + p.cd * 1000; } runPassive(g.pas, fi);
    }
  }
}
function runPassive(id, fi) {
  const p = PASSIVES[id];
  pop(player.x, player.y - 70, p.n + '!', '#ffd24a', true);
  ring(player.x, player.y, 120, '#ffd24a', .6, 6); ring(player.x, player.y, 70, '#ffffff', .45, 4); shake(5);
  burst(player.x, player.y - 20, 30, { type: 'star', col: '#ffe066', spd: 180, life: 1, size: 2.6 });
  switch (id) {
    case 'wildfire': addBuff('wildfire', 15); burst(player.x, player.y, 40, { type: 'ember', col: '#ff6a2b', spd: 220, life: 1, size: 3.2, g: -60 });
      E.decals.filter(d => d.kind === 'flame' && d.fi === fi).forEach((d, k) => later(k * .05, () => { tilesNear(fi, d.x, d.y, 60).forEach(t => collect(t, d.base, 'spice', 3)); ring(d.x, d.y, 60, '#ff6a2b', .4, 6); burst(d.x, d.y, 16, { type: 'ember', col: '#ff8a3d', spd: 180, life: .8, size: 3, g: -60 }); })); break;
    case 'polar': addBuff('polar', 15); burst(player.x, player.y, 40, { type: 'snow', col: '#d6f3ff', spd: 200, life: 1, size: 2.6 }); for (let k = 0; k < 6; k++) spawnBubble(fi, player.x + rand(-110, 110), player.y + rand(-80, 80), 8 * (1 + S.crew.length * .05)); break;
    case 'cloudburst': addBuff('cloudburst', 15); addGoo(player.x, player.y, 80, 15); break;
    case 'spirit': addBuff('spirit', 20); E.decals.push({ kind: 'rays', x: player.x, y: player.y, age: 0, dur: 2.2, follow: true }); break;
    case 'herd': addBuff('herd', 15); break;
    case 'spark': FX.burst(pseudo('chiliCook'), fi, { x: player.x, y: player.y }); break;
    case 'freeze': for (let k = 0; k < 3; k++) later(k * .15, () => FX.frostMark(pseudo('iceClimber'), fi)); break;
    case 'updraft': FX.gust(pseudo('kiteFlyer'), fi); break;
    case 'renewal': TILES[fi].forEach(t => t.v = 1); burst(player.x, player.y, 40, { type: 'leaf', col: '#7cc560', spd: 260, life: 1, size: 3.4 }); break;
    case 'strike': { const f = FIELDS[fi], base = 10 * (1 + S.crew.length * .05) * (1 + bp('spice'));
      for (let k = 0; k < 16; k++) { const a = k / 16 * TAU, x = clamp(player.x + Math.cos(a) * 125, f.x + 25, f.x + f.w - 25), y = clamp(player.y + Math.sin(a) * 95, f.yy + 25, f.yy + f.h - 25);
        later(k * .03, () => { addFlame(fi, x, y, base, 18, true); burst(x, y, 6, { type: 'ember', col: '#ff8a3d', spd: 120, life: .7, size: 3, g: -60 }); }); }
      break; }
    case 'stomp': FX.footprints(pseudo('yeti'), fi); break;
    case 'dance': FX.gust(pseudo('kiteFlyer'), fi); later(.6, () => FX.gust(Object.assign(pseudo('kiteFlyer'), { y: player.y + 80 }), fi)); break;
    case 'summitBless': FX.blessing(); break;
  }
}
function statDefaults() {
  const d = { gather: 0, earn: 0, field: {}, feed: 0, col: {}, lv: {}, ab: {}, crits: 0, best: 0, walk: 0, time: 0, brews: 0, tokens: 0, offline: 0, spent: 0, quests: 0, jobs: 0, recruited: 0, rerolls: 0, blessed: 0, levels: 0 };
  for (const k in d) if (S.stats[k] == null) S.stats[k] = d[k];
  if (!S.start) S.start = Date.now();
}
function spend(n) { S.rp -= n; S.stats.spent += n; }
function boot() {
  S = load();
  const fresh = !S;
  if (!S) S = newSave();
  statDefaults();
  if (!S.spr) S.spr = { n: 0, lv: 0, placed: [] };
  if (!S.hats) { S.hats = []; S.hat = null; S.charms = []; S.charm = null; S.pas = {}; }
  if (S.charms && S.charms.length) { let refund = 0; for (const id of S.charms) { const ch = CHARMS.find(c2 => c2.id === id); if (ch) refund += ch.cost; } S.rp += refund; S.charms = []; S.charm = null; S.charmRefund = refund; }
  if (S.mandala === undefined) S.mandala = null;
  for (const k of ['comet', 'gstar', 'cswing', 'pops', 'heat', 'popcap', 'balloon']) if (!S[k]) S[k] = 0;
  for (const k in OLD_MAT) if (S.items[k]) { S.items[OLD_MAT[k]] = (S.items[OLD_MAT[k]] || 0) + S.items[k]; delete S.items[k]; }
  buildWorld();
  if (S.qv !== 2) { const old = S.q.didi || 0; S.q.didi = [0, 1, 3, 5, 7, 8, 11, 14, 16, 24, 32, 40][Math.min(11, old)]; S.qb.didi = 0; S.qv = 2; S.qfix = true; }
  if (!S.perm) S.perm = {};
  if (!S.fperm) S.fperm = {};
  if (S.mandala && S.mandala.pas.length) { const ps = [...new Set(S.mandala.pas.map(p => OLD_STAR[p] || p).filter(p => MANDALA_PAS[p]))]; const mains = ps.filter(p => MANDALA_PAS[p].main), sides = ps.filter(p => !MANDALA_PAS[p].main); S.mandala.pas = mains.length && sides.length ? [mains[0], sides[0]] : mains.length > 1 ? [mains[0], pick(['guidingStar', 'starSaw', 'starShower'])] : ps.slice(0, 1); }
  if (S.butter == null) S.butter = 0;
  if (S.guideN == null) S.guideN = 0;
  for (const k of ['hiveBal', 'hiveBalTot', 'blueN', 'popCd']) if (S[k] == null) S[k] = 0;
  if (S.balloon) { S.hiveBal += S.balloon; S.balloon = 0; }
  HLANT.x = BREW.x + 95; HLANT.y = BREW.y - 30;
  if (S.mv3 !== 1) { S.mv3 = 1; S.items.marigold = Math.ceil((S.items.marigold || 0) / 37); }
  if (S.bv !== 2) { S.bv = 2; S.beds = Math.max(25, S.beds || 0);
    S.perm = {}; for (let i = 0; i < Math.min(S.q.prof || 0, Q_PROF.length); i++) for (const k in Q_PROF[i].rw.perm) S.perm[k] = (S.perm[k] || 0) + Q_PROF[i].rw.perm[k];
    if (S.stats.leo) { const top = FIELDS.map(f => f.id).sort((a, b) => (S.stats.field[b] || 0) - (S.stats.field[a] || 0))[0]; S.fperm[top] = (S.fperm[top] || 0) + S.stats.leo * .01; } }
  if (!S.sprouts) S.sprouts = []; if (!S.badges) S.badges = {};
  if (S.mapv !== 2) { S.mapv = 2; S.px = PLAZA.x; S.py = PLAZA.y + 30; if (S.spr) S.spr.placed = []; }
  player.x = S.px || BREW.x; player.y = S.py || BREW.y - 30;
  rebuildCrew(); refreshWet();
  E.crew.forEach(e => { e.x = player.x + rand(-50, 50); e.y = player.y + rand(-30, 30); });
  resize(); addEventListener('resize', resize);
  uiInit();
  if (fresh) showIntro(); else offlineEarnings();
  document.addEventListener('visibilitychange', () => { if (!S) return; if (document.hidden) save(); else { const gap = (Date.now() - S.last) / 1000; if (gap > 90) offlineEarnings(); } });
  requestAnimationFrame(frame);
}
