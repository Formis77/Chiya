'use strict';
/* =========================================================
   CHIYA — core game: world, player, crew AI, abilities, VFX
   ========================================================= */
const WORLD = { w: 1400, h: 3200 };
const HOUSE = { x: 735, y: 2995 };
const STALL = { x: 580, y: 3035 };
const BREW = { x: 580, y: 3080, r: 46 };
const PLAZA = { x: 665, y: 3045 };
const PEAK = { x: 700, y: 120 };
const mountHW = y => y < PEAK.y ? 0 : 80 + 640 * Math.pow(Math.min(1, (y - PEAK.y) / 2880), .6);
const VIEW_W = 360;

const rand = (a, b) => a + Math.random() * (b - a);
const pick = a => a[Math.floor(Math.random() * a.length)];
const dist = (a, b, x, y) => Math.hypot(a - x, b - y);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

let S = null;                 // persistent save
let D = { k: {}, syn: new Set(), hive: null, bp: {}, cnt: {} };   // derived values
const B = {};                 // active buffs  id -> {t, st}
const E = { crew: [], tokens: [], parts: [], decals: [], timers: [], proj: [], pops: [] };
const player = { x: BREW.x, y: BREW.y - 30, face: 1, mv: false, swing: 0, swingT: 0, auto: null, anim: 0 };
const cam = { x: 0, y: 0, shake: 0 };
const joy = { on: false, id: null, ox: 0, oy: 0, x: 0, y: 0, kx: 0, ky: 0 };
let now = 0, brewing = false, fullWarnT = 0, nearNpc = null, kilnT = 0;
const NPCS = () => Object.assign({}, GIVERS, REPEAT);

/* ---------------- save ---------------- */
const mk = (id, bl) => ({ id, lvl: 1, xp: 0, bl: !!bl });
function newSave() {
  return {
    v: 1, rp: 0, doko: 0, beds: 5, crew: [mk('porter'), mk('porter')],
    items: { momo: 5, permit: 1 },
    tool: 'sickle', tools: ['sickle'], dokoId: 'basket', dokos: ['basket'], boots: 'sandals', bootsOwned: ['sandals'],
    lodge: 0, recruits: 0, wheels: 0, spr: { n: 0, lv: 0, placed: [] }, hats: [], hat: null, charms: [], charm: null, pas: {}, q: { didi: 0, pemba: 0, dolma: 0, norbu: 0, yeti: 0 }, qb: {},
    stats: { gather: 0, earn: 0, field: {}, feed: 0 }, found: { porter: true },
    last: Date.now(), rate: 0, px: BREW.x, py: BREW.y - 30
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
    if (L > 200) for (const u of [.33, .66]) { const o = (r() - .5) * 70; pts.push([x0 + (x1 - x0) * u + nx * o, y0 + (y1 - y0) * u + ny * o]); }
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
  const inMount = (x, y, m = 0) => y > PEAK.y + 40 && Math.abs(x - PEAK.x) < mountHW(y) - m;
  const nearPath = (x, y, m) => { for (let i = 0; i < TRAIL.length; i += 2) { const t = TRAIL[i]; if (Math.abs(t.x - x) < m && Math.abs(t.y - y) < m && Math.hypot(t.x - x, t.y - y) < m) return true; } return false; };
  const nearPlaza = (x, y) => Math.hypot((x - PLAZA.x) / 290, (y - PLAZA.y) / 170) < 1;
  for (let i = 0; i < 3000 && DECOR.length < 320; i++) {
    const x = r() * WORLD.w, y = 80 + r() * (WORLD.h);
    if (inField(x, y, 34) || nearPath(x, y, 46) || nearPlaza(x, y) || Object.values(NPCS()).some(g => Math.hypot(x - g.x, y - g.y) < 60)) continue;
    const z = zoneAt(y), inside = inMount(x, y, 20), roll = r();
    if (!inside && y < 2300) { if (roll < .25) DECOR.push({ type: 'cloud', x, y, s: .8 + r() * .8 }); continue; }
    const type = !inside ? (roll < .55 ? 'tree' : roll < .8 ? 'pine' : 'bush')
      : z === 0 ? (roll < .5 ? 'tree' : roll < .8 ? 'bush' : 'rock')
      : z === 1 ? (roll < .65 ? 'pine' : roll < .8 ? 'tree' : 'rock')
      : z === 2 ? (roll < .5 ? 'pine' : roll < .8 ? 'rock' : 'autumn')
      : z === 3 ? (roll < .65 ? 'rock' : 'pine') : (roll < .6 ? 'rock' : 'dead');
    DECOR.push({ type, x, y, s: .8 + r() * .6, snow: z >= 3 && inside });
  }
  SCATTER = [];
  for (let i = 0; i < 4000 && SCATTER.length < 1000; i++) {
    const x = r() * WORLD.w, y = r() * WORLD.h;
    if (inField(x, y, 10) || nearPath(x, y, 26) || !(inMount(x, y) || y > 2300)) continue;
    const z = inMount(x, y) ? zoneAt(y) : 0, roll = r();
    SCATTER.push({ x, y, z, k: roll, t: z >= 4 ? 'spark' : z === 3 ? 'pebble' : z === 2 ? (roll < .5 ? 'pebble' : 'tuft') : (roll < .7 ? 'tuft' : 'flower') });
  }
  // mountain outline
  MOUNT = new Path2D();
  const L = [], R = [];
  for (let y = PEAK.y; y <= WORLD.h + 200; y += 20) { const w = mountHW(y) + Math.sin(y * .03) * 10 + Math.sin(y * .011) * 16; L.push([PEAK.x - w, y]); R.push([PEAK.x + w * (1 + Math.sin(y * .017) * .03), y]); }
  MOUNT.moveTo(PEAK.x, PEAK.y - 10); L.forEach(([x, y]) => MOUNT.lineTo(x, y)); R.reverse().forEach(([x, y]) => MOUNT.lineTo(x, y)); MOUNT.closePath();
  SHADE = new Path2D(); SHADE.moveTo(PEAK.x, PEAK.y - 10); R.slice().reverse().forEach(([x, y]) => SHADE.lineTo(x, y)); SHADE.lineTo(PEAK.x + 60, WORLD.h + 200); SHADE.lineTo(PEAK.x + 10, PEAK.y + 400); SHADE.closePath();
  BANDS = ZONES.slice(1).map((z, i) => {
    const y0 = z.y, edge = x => y0 + Math.sin(x * .021 + y0) * 12 + Math.sin(x * .053) * 6;
    const mk = off => { const p = new Path2D(); p.moveTo(0, -200); p.lineTo(0, edge(0) + off); for (let x = 0; x <= WORLD.w; x += 20) p.lineTo(x, edge(x) + off); p.lineTo(WORLD.w, -200); p.closePath(); return p; };
    const ln = new Path2D(); ln.moveTo(0, edge(0)); for (let x = 0; x <= WORLD.w; x += 20) ln.lineTo(x, edge(x));
    return { lipP: mk(0), mainP: mk(-8), line: ln, col: z.col, lip: z.lip, y0 };
  });
  DECOR.push({ type: 'chorten', x: 470, y: 2920 }, { type: 'chorten', x: 600, y: 1700 }, { type: 'chorten', x: 640, y: 1160 }, { type: 'chorten', x: 600, y: 620 }, { type: 'flagpole', x: PEAK.x, y: PEAK.y + 30 });
  FLAGS = [[440, 2240, 720, 2250], [480, 1790, 740, 1800], [640, 1320, 840, 1330], [620, 790, 740, 780], [560, 215, 860, 215]];
}
let DECOR = [], FLAGS = [], SCATTER = [], BANDS = [], MOUNT = null, SHADE = null, STONES = [], TRAIL = [], PATHPTS = [];
const ZONES = [
  { y: 3300, n: 'Foothills',    m: '2,800 m', col: '#86c763', lip: '#6aab50' },
  { y: 2160, n: 'Pine Forest',  m: '3,600 m', col: '#62a854', lip: '#4b8c43' },
  { y: 1600, n: 'High Pasture', m: '4,300 m', col: '#a9b86a', lip: '#8c9b54' },
  { y: 1090, n: 'Rock Band',    m: '5,200 m', col: '#bba88a', lip: '#9a876a' },
  { y: 660,  n: 'Snowline',     m: '6,500 m', col: '#e9f1f7', lip: '#c4d6e3' }
];
const zoneAt = y => { let z = 0; for (let i = 1; i < ZONES.length; i++) if (y < ZONES[i].y) z = i; return z; };
function segDist(x, y, a, b) { const dx = b[0] - a[0], dy = b[1] - a[1], l = dx * dx + dy * dy; const u = clamp(((x - a[0]) * dx + (y - a[1]) * dy) / l, 0, 1); return Math.hypot(x - a[0] - u * dx, y - a[1] - u * dy); }
const PATH = [[PLAZA.x - 60, PLAZA.y - 10], [470, 2930], [360, 2760], [1030, 2420], [370, 2080], [1000, 1740], [420, 1420], [900, 1120], [500, 840], [800, 580], [700, 420]];
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
  S.crew.forEach(m => { if (m.bl) { const [st, v] = CREW[m.id].bp; bp[st] = (bp[st] || 0) + v * bpm / 100; } });
  for (const g of equippedGear()) for (const k in g.st || {}) bp[k] = (bp[k] || 0) + g.st[k];
  D = { k, syn, hive, bp, cnt };
}
const bp = s => D.bp[s] || 0;
const tool = () => TOOLS.find(t => t.id === S.tool);
const doko = () => DOKOS.find(d => d.id === S.dokoId);
const equippedGear = () => [tool(), doko(), HEADGEAR.find(h => h.id === S.hat), CHARMS.find(h => h.id === S.charm)].filter(Boolean);
const lvlMult = m => (1 + .1 * (m.lvl - 1)) * (m.bl ? 1.25 : 1);
function capMax() {
  const m = 1 + bp('cap') + (D.syn.has('porterUnion') ? .25 : 0) + (D.syn.has('herd') ? .1 : 0) + (D.hive === 'cloud' ? .15 : 0) + .05 * (D.k.dzo || 0);
  if (doko().pas === 'nimbus') m *= 1 + Math.min(.6, (S.nimbus || 0) * .01);
  return Math.floor(doko().cap * m);
}
function moveSpeed() { return BOOTS.find(b => b.id === S.boots).spd * (1 + bp('speed')) * (1 + .2 * (B.haste ? B.haste.st : 0)); }
function gMult(col, isTool) {
  let m = 1 + bp('gather') + bp(col);
  if (B.blessing) m *= 1.25;
  if (D.syn.has('rainbow')) m *= 1.15;
  if (D.syn.has('fullHouse')) m *= 1.1;
  if (col === 'spice' && B.spiceRush) m *= 1 + .5 * (D.syn.has('kitchen') ? 1.5 : 1);
  if (B['shot_' + col]) m *= 1.5;
  if (B.wildfire && col === 'spice') m *= 3;
  if (col === 'ice' && doko().pas === 'deepfreeze' && S.doko > capMax() * .5) m *= 1.4;
  if (B.polar && col === 'ice') m *= 3;
  if (B.spirit) m *= 2;
  if (isTool && B.cloudburst) m *= 3;
  if (isTool) { m *= 1 + bp('tool'); if (D.hive === 'cloud') m *= 1.5; }
  return m;
}
function critChance() { return .03 + (B.polar ? .15 : 0) + bp('crit') + (B.focus ? .2 : 0) + (D.hive === 'spice' ? .05 : 0) + (tool().crit || 0); }
function critMul() { return B.focus ? (D.syn.has('frozenFocus') ? 4 : 3) : 2; }
function brewValue() { return 1 + bp('brew') + (D.syn.has('teaMasters') ? .15 : 0) + (D.syn.has('festival') ? .2 : 0) + (D.hive === 'ice' ? .3 : 0); }
function cdMul(def) {
  let m = 1;
  if (D.hive === 'spice') m *= 1 / .85;
  if (B.incense) m *= 2;
  m *= 1 / (1 - Math.min(.5, bp('cdr')));
  if (def.r === 'mythic' && D.syn.has('legends')) m *= 1 / .7;
  return m;
}
const FROST_MUL = [1, 1.25, 1.5, 2];
function zoneMult(x, y, col) {
  let z = 1, frost = 0;
  for (const d of E.decals) {
    if (d.kind === 'wheel' && dist(x, y, d.x, d.y) < d.r) z *= 2;
    else if (d.kind === 'frost' && col === 'ice' && dist(x, y, d.x, d.y) < 56) frost = Math.max(frost, d.lv || 1);
  }
  return z * FROST_MUL[frost];
}
function addBuff(id, dur, max = 1) {
  const b = B[id];
  if (b) { b.t = Math.max(b.t, dur); b.st = Math.min(max, b.st + 1); } else B[id] = { t: dur, st: 1 };
}

/* ---------------- gathering ---------------- */
function collect(t, base, srcCol, extra = 1, isTool = false) {
  if (!fieldOpen(t.f) || t.v < .04) return 0;
  const space = capMax() - S.doko;
  if (space <= 0) { fullWarn(); return 0; }
  const tv = t.v; t.v = Math.max(0, tv - .22);
  let amt = base * FIELDS[t.f].y * LVM[t.lv] * (.35 + .65 * tv) * extra;
  const match = srcCol === t.col ? 1.5 : srcCol === 'neutral' ? 1.15 : 1;
  amt *= match * gMult(t.col, isTool) * zoneMult(t.x, t.y, t.col) * (t.wet || 1);
  let crit = false;
  if (Math.random() < critChance()) { amt *= critMul(); crit = true; S.stats.crits++; }
  const add = Math.min(space, amt);
  S.doko += add; S.stats.gather += add;
  const st = S.stats; st.col[t.col] = (st.col[t.col] || 0) + add; st.lv[t.lv] = (st.lv[t.lv] || 0) + add;
  if (add > (st.best || 0)) st.best = add;
  const fid = FIELDS[t.f].id; S.stats.field[fid] = (S.stats.field[fid] || 0) + add;
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
      e.act = true; e.mv = false; e.t -= dt * (B.roar ? 1.5 : 1);
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
    burst(e.x, e.y - 20, 6, { type: 'star', col: '#fff6c8', spd: 60, life: .5, size: 2 });
  } else { FX[a](e, fi); S.stats.ab[a] = (S.stats.ab[a] || 0) + 1; abilityFired(CREW[e.m.id].c); }
}
function takeToken(tk) {
  const a = tk.ab; S.stats.ab[a] = (S.stats.ab[a] || 0) + 1;
  ring(tk.x, tk.y, 40, '#ffffff', .4, 3);
  burst(tk.x, tk.y, 14, { type: 'star', col: '#fff6c8', spd: 120, life: .6, size: 2.4 });
  pop(tk.x, tk.y - 22, ABIL[a].n, '#ffffff', true);
  const src = a === 'pounce' ? tk.e : { x: tk.x, y: tk.y, m: tk.e.m, face: 1 };
  FX[a](src, tk.fi, tk);
  abilityFired(CREW[tk.e.m.id].c);
}
const FX = {
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
    tilesNear(fi, x, y, r).forEach(t => sum += collect(t, base, 'spice', 3));
    E.decals.push({ kind: 'scorch', x, y, r, age: 0, dur: 2.5 });
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
    const r = Math.random();
    const it = r < .38 ? 'momo' : r < .62 ? 'selroti' : r < .74 ? 'dalbhat' : r < .84 ? 'butterTea' : r < .91 ? 'incense' : r < .96 ? 'mysticWheel' : r < .995 ? 'permit' : 'goldenMomo';
    S.items[it] = (S.items[it] || 0) + 1;
    toast(`The Tihar Dog dug up ${ITEMS[it].n}`, ITEMS[it].i);
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
    ts.forEach((t, k) => later(k * .045, () => E.proj.push({ kind: 'petal', x0: e.x, y0: e.y - 18, x1: t.x, y1: t.y, t: 0, dur: .55, arc: rand(-60, 60), hit() { const g = collect(t, base, 'spice', 2); burst(t.x, t.y, 4, { type: 'petal', col: '#ff6b81', spd: 70, life: .7, size: 3.2, g: 40 }); if (g) pop(t.x, t.y - 12, '+' + fmt(g), '#ff8fab'); } })));
    burst(e.x, e.y - 18, 26, { type: 'petal', col: '#ff4d6d', spd: 180, life: 1.2, size: 3.6, g: 30 });
  },
  frostMark(e, fi) {
    const t = TILES[fi].reduce((b, q) => dist(q.x, q.y, e.x, e.y) < dist(b.x, b.y, e.x, e.y) ? q : b, TILES[fi][0]);
    const max = D.syn.has('frozenFocus') ? 8 : 5;
    const marks = E.decals.filter(d => d.kind === 'frost');
    const on = marks.find(d => dist(d.x, d.y, t.x, t.y) < 56);
    if (on) { on.lv = Math.min(3, (on.lv || 1) + 1); on.age = 0; pop(on.x, on.y - 24, 'Frost Mark x' + FROST_MUL[on.lv], '#bfefff', true); }
    else { if (marks.length >= max) E.decals.splice(E.decals.indexOf(marks[0]), 1); E.decals.push({ kind: 'frost', x: t.x, y: t.y, age: 0, dur: 15, lv: 1 }); }
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
      let sum = 0; tilesNear(fi, x, y, 72).forEach(t => sum += collect(t, base, 'ice', 4));
      E.decals.push({ kind: 'foot', x, y, rot: ang + Math.PI / 2, side, age: 0, dur: 4 });
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
      burst(x, y, 2, { type: 'ember', col: '#ffb347', spd: 50, life: .7, size: 3, g: -30 });
      tilesNear(fi, x, y, 40).forEach(t => { if (!hit.has(t)) { hit.add(t); const g = collect(t, base, 'spice', 4); if (g) pop(t.x, t.y - 10, '+' + fmt(g), '#ffb347'); } });
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
        let sum = 0; tilesNear(fi, t.x, t.y, 62).forEach(tt => sum += collect(tt, base, 'cloud', 3));
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
      TILES[fi].forEach(t => { if (!hit.has(t) && Math.abs(t.y - y) < 46 && t.x < x) { hit.add(t); const g = collect(t, base, 'neutral', 2.5); sum += g; if (g) burst(t.x, t.y, 2, { type: 'leaf', col: '#ffffff', spd: 90, life: .6, size: 2.6 }); } });
    }, hit() { if (sum) pop(f.x + f.w / 2, y - 30, 'Kite Gust +' + fmt(sum), '#ffffff', true); } });
  }
};

/* ---------------- VFX helpers ---------------- */
function later(t, fn) { E.timers.push({ t, fn }); }
function shake(a) { cam.shake = Math.max(cam.shake, a); }
function ring(x, y, r, col, dur, w) { E.decals.push({ kind: 'ring', x, y, r, col, age: 0, dur, w }); }
function pop(x, y, txt, col, big) { if (E.pops.length > 60) E.pops.shift(); E.pops.push({ x: x + rand(-6, 6), y, txt, col, age: 0, big }); }
function burst(x, y, n, o) {
  for (let i = 0; i < n && E.parts.length < 700; i++) {
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
  player.x = clamp(player.x + ix * sp * dt, 20, WORLD.w - 20);
  player.y = clamp(player.y + iy * sp * dt, 40, WORLD.h - 20);
  player.mv = Math.abs(ix) + Math.abs(iy) > .05;
  if (player.mv) S.stats.walk += sp * Math.hypot(ix, iy) * dt;
  S.stats.time += dt;
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
    const reach = tl.r * (B.cloudburst ? 1.5 : 1);
    for (const t of TILES[pf]) if (dist(t.x, t.y, cx, cy) < reach) sum += collect(t, tl.amt * (tl.col === t.col ? 1 + (tl.cb || .6) : 1), 'neutral', 1, true);
    if (sum > 0 && Math.random() < .03) dropMat(pf);
    E.decals.push({ kind: 'swoosh', x: cx, y: cy, r: reach, face: player.face, age: 0, dur: .22 });
    if (sum) pop(player.x, player.y - 48, '+' + fmt(sum), '#ffffff');
  } else if (pf >= 0 && !fieldOpen(pf) && now - fullWarnT > 4) { fullWarnT = now; toast(`${FIELDS[pf].n} needs ${FIELDS[pf].gate} crew`, 'lock'); }
  // quest givers nearby
  let nn = null, nd = 75;
  const all = NPCS(); for (const id in all) { const g = all[id], d = dist(player.x, player.y, g.x, g.y); if (d < nd) { nd = d; nn = id; } }
  if (nn !== nearNpc) { nearNpc = nn; updateTalk(); }
  // Kiln bag: instant conversion while gathering
  if (doko().pas === 'kiln' && pf >= 0 && S.doko > 0) {
    kilnT += dt;
    if (kilnT >= 20) { kilnT = 0; const conv = S.doko * .06, val = conv * brewValue(); S.doko -= conv; S.rp += val; S.stats.earn += val; pop(player.x, player.y - 70, 'Kiln +' + fmt(val), '#ffb347', true); burst(player.x, player.y - 30, 20, { type: 'ember', col: '#ff8a3d', spd: 140, life: .8, size: 3, g: -60 }); }
  }
  // brewing
  brewing = false;
  if (dist(player.x, player.y, BREW.x, BREW.y) < BREW.r && S.doko > 0) {
    let crewBrew = 0; E.crew.forEach(e => { if (e.st === 'home') crewBrew += CREW[e.m.id].brew * lvlMult(e.m); });
    const rate = Math.max(25 + crewBrew, capMax() / 9) * (B.blessing ? 1.25 : 1);
    const conv = Math.min(S.doko, rate * dt);
    S.doko -= conv; if (S.doko < .01) S.doko = 0;
    const val = conv * brewValue(); S.rp += val; S.stats.earn += val; brewing = true;
    if (Math.random() < .5) E.parts.push({ type: 'coin', x: BREW.x + rand(-30, 30), y: BREW.y - rand(0, 20), vx: rand(-20, 20), vy: -rand(60, 120), g: 60, life: 1, max: 1, size: 3.4, col: '#ffd24a' });
    if (S.doko === 0) { toast('All brewed. Back to the fields', 'cup'); S.stats.brews++; S.nimbus = 0; }
  }
  if (Math.random() < dt * (brewing ? 12 : 3)) E.parts.push({ type: 'steam', x: brewing && Math.random() < .6 ? STALL.x - 2 : HOUSE.x + teaChimney(), y: brewing && Math.random() < .6 ? STALL.y - 48 : HOUSE.y + houseTop() - 6, vx: rand(-6, 6), vy: -rand(18, 30), g: 0, life: 2.4, max: 2.4, size: rand(5, 8), col: 'rgba(255,255,255,.55)' });
  // crew
  E.crew.forEach((e, i) => updCrew(e, i, dt));
  // blessed sparkles
  if (Math.random() < dt * 6) { const b = E.crew.filter(e => e.m.bl); if (b.length) { const e = pick(b); E.parts.push({ type: 'star', x: e.x + rand(-10, 10), y: e.y - rand(20, 40), vx: 0, vy: -16, g: 0, life: .9, max: .9, size: 1.8, col: '#ffe66d' }); } }
  // tokens
  for (let i = E.tokens.length - 1; i >= 0; i--) {
    const tk = E.tokens[i]; tk.age += dt;
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
function resize() {
  // iOS home-screen apps with a translucent status bar report a viewport that is
  // shorter than the screen by the status bar height; stretch everything over the gap.
  const portrait = innerHeight > innerWidth, sh = portrait ? Math.max(screen.width, screen.height) : Math.min(screen.width, screen.height);
  const gap = (navigator.standalone || matchMedia('(display-mode: standalone)').matches) ? Math.max(0, Math.min(80, sh - innerHeight)) : 0;
  document.documentElement.classList.toggle('gapfix', gap > 10);
  DPR = Math.min(2.5, window.devicePixelRatio || 1);
  const rc = cv.getBoundingClientRect(), w = rc.width || innerWidth, h = rc.height || innerHeight;
  cv.width = Math.round(w * DPR); cv.height = Math.round(h * DPR);
  scale = cv.width / VIEW_W; viewH = cv.height / scale;
}
const teaTier = () => S.beds >= 40 ? 4 : S.beds >= 30 ? 3 : S.beds >= 20 ? 2 : S.beds >= 10 ? 1 : 0;
const houseTop = () => (teaTier() >= 2 ? -132 : -92);
const teaChimney = () => [120, 140, 150, 160, 170][teaTier()] / 2 - 29;

const TOKEN_COL = { spice: '#f0583a', ice: '#2ea4dc', cloud: '#6f7fd0', neutral: '#b07f4c' };
const FIELD_BG = { tea: '#8a6a45', ginger: '#9b7449', glacier: '#c3e2f2', rhodo: '#7d5f40', meadow: '#8fbd5f', juniper: '#7a6a52', saffron: '#a68655', flags: '#b7c3a6', summit: '#dfeaf3' };

function render() {
  const c = ctx;
  const pw = clamp(1.6 - Math.hypot((player.x - PLAZA.x) / 260, (player.y - PLAZA.y) / 140), 0, 1);
  cam.tx = player.x + (PLAZA.x + 10 - player.x) * pw;
  cam.sx = cam.sx == null ? cam.tx : cam.sx + (cam.tx - cam.sx) * .12;
  cam.x = clamp(cam.sx - VIEW_W / 2, 0, WORLD.w - VIEW_W);
  cam.y = clamp(player.y - viewH * .56, -150, WORLD.h - viewH + 120);
  const sx = (Math.random() - .5) * cam.shake, sy = (Math.random() - .5) * cam.shake;
  c.setTransform(scale, 0, 0, scale, (-cam.x + sx) * scale, (-cam.y + sy) * scale);
  const vx0 = cam.x - 60, vy0 = cam.y - 60, vx1 = cam.x + VIEW_W + 60, vy1 = cam.y + viewH + 80;
  const vis = (x, y, m = 0) => x > vx0 - m && x < vx1 + m && y > vy0 - m && y < vy1 + m;

  // valley / cloud sea around the mountain
  if (!bgGrad) { bgGrad = c.createLinearGradient(0, 0, 0, WORLD.h); [[0, '#cfe6f3'], [.5, '#dcecef'], [.68, '#8fbf72'], [1, '#5e9e4e']].forEach(([o, col]) => bgGrad.addColorStop(o, col)); }
  c.fillStyle = bgGrad; c.fillRect(vx0, vy0, vx1 - vx0, vy1 - vy0);
  // mountain body with altitude zones
  c.save(); c.translate(0, 14); c.fillStyle = 'rgba(43,34,51,.12)'; c.fill(MOUNT); c.restore();
  c.save(); c.clip(MOUNT);
  c.fillStyle = ZONES[0].col; c.fillRect(vx0, vy0, vx1 - vx0, vy1 - vy0);
  for (const b of BANDS) { if (b.y0 < vy0 - 40) continue; c.fillStyle = b.lip; c.fill(b.lipP); c.fillStyle = b.col; c.fill(b.mainP); c.strokeStyle = 'rgba(43,34,51,.55)'; c.lineWidth = 2; c.stroke(b.line); }
  for (const d of SCATTER) {
    if (!vis(d.x, d.y, 10)) continue;
    if (d.t === 'tuft') { const g = d.z === 2 ? '#7f8c45' : d.z === 1 ? '#3f7f39' : '#5aa647'; line(c, d.x - 4, d.y, d.x - 6, d.y - 5, g, 1.6); line(c, d.x, d.y, d.x, d.y - 7, g, 1.6); line(c, d.x + 4, d.y, d.x + 6, d.y - 5, g, 1.6); }
    else if (d.t === 'flower') { circ(c, d.x, d.y, 2.2, d.k > .85 ? '#ffd166' : '#ffffff', false); circ(c, d.x + 6, d.y + 3, 1.6, d.k > .85 ? '#ffffff' : '#ffd166', false); }
    else if (d.t === 'pebble') ell(c, d.x, d.y, 4, 2.6, d.z === 3 ? '#9d8c70' : '#8f9a5c', false);
    else { line(c, d.x - 4, d.y, d.x, d.y - 3, '#b9d3e3', 1.6); line(c, d.x, d.y - 3, d.x + 4, d.y, '#b9d3e3', 1.6); }
  }
  c.restore();
  c.strokeStyle = OUT; c.lineWidth = 2.6; c.stroke(MOUNT);
  // zone markers
  for (let i = 1; i < ZONES.length; i++) {
    const z = ZONES[i], y = z.y + 26, x = PEAK.x - mountHW(y) + 30;
    if (!vis(x, y, 80)) continue;
    c.font = '800 11px -apple-system,system-ui,sans-serif'; const tw = Math.max(c.measureText(z.n).width, 50) + 16;
    P(c); c.roundRect(x, y - 16, tw, 30, 9); fs(c, 'rgba(255,255,255,.92)', 1.8);
    c.fillStyle = OUT; c.textAlign = 'left'; c.fillText(z.n, x + 8, y - 3);
    c.fillStyle = '#8c8296'; c.font = '700 10px -apple-system,system-ui,sans-serif'; c.fillText(z.m, x + 8, y + 9);
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

  // fields
  FIELDS.forEach((f, fi) => {
    if (!vis(f.x, f.yy, Math.max(f.w, f.h))) return;
    rr(c, f.x - 6, f.yy + 6, f.w + 12, f.h + 6, 22, 'rgba(0,0,0,.14)', false);
    P(c); c.roundRect(f.x, f.yy, f.w, f.h, 20); fs(c, FIELD_BG[f.id], 2.4);
    c.save(); P(c); c.roundRect(f.x, f.yy, f.w, f.h, 20); c.clip();
    for (let j = 0; j < f.h; j += TILE * 2) { c.fillStyle = 'rgba(0,0,0,.05)'; c.fillRect(f.x, f.yy + j, f.w, TILE); }
    P(c); c.roundRect(f.x + 5, f.yy + 5, f.w - 10, f.h - 10, 16); c.strokeStyle = 'rgba(255,255,255,.22)'; c.lineWidth = 3; c.stroke();
    for (const t of TILES[fi]) {
      if (!vis(t.x, t.y, 30)) continue;
      const s = TILE * 1.1 * (.3 + .7 * t.v), img = flowerSprite(t.col, t.lv);
      const sway = Math.sin(now * 1.6 + t.wob) * .05;
      c.save(); c.translate(t.x, t.y + 6); c.rotate(sway); c.globalAlpha = .55 + .45 * t.v;
      c.drawImage(img, -s / 2, -s / 2 - 6, s, s); c.restore();
      if (t.lv > 1 && t.v > .5 && scale > 1.6) { c.fillStyle = 'rgba(43,34,51,.55)'; c.font = '800 7px -apple-system,system-ui,sans-serif'; c.textAlign = 'center'; c.fillText(t.lv, t.x + 13, t.y + 17); }
    }
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
  for (const d of DECOR) if (vis(d.x, d.y, 60)) objs.push({ y: d.y, f: () => { c.save(); c.translate(d.x, d.y); ({ pine: () => drawPine(c, d.s, d.snow), rock: () => drawRock(c, d.s, d.snow), tree: () => drawTreeRound(c, d.s), autumn: () => drawTreeRound(c, d.s, '#f2a33a'), bush: () => drawBush(c, d.s), dead: () => drawDeadBush(c, d.s), chorten: () => drawChorten(c, now), flagpole: () => drawSummitFlag(c, now), cloud: () => drawCloud(c, d.s) })[d.type](); c.restore(); } });
  if (vis(HOUSE.x, HOUSE.y, 200)) objs.push({ y: HOUSE.y, f: () => { c.save(); c.translate(HOUSE.x, HOUSE.y); drawTeahouse(c, teaTier(), now); c.restore(); } });
  const allN = NPCS(); for (const id in allN) { const g = allN[id]; if (vis(g.x, g.y, 80)) objs.push({ y: g.y, f: () => drawGiver(c, id, g) }); }
  for (const sp of S.spr.placed) if (vis(sp.x, sp.y, 60)) objs.push({ y: sp.y, f: () => drawSprinkler(c, sp) });
  if (vis(STALL.x, STALL.y, 120)) objs.push({ y: STALL.y, f: () => { c.save(); c.translate(STALL.x, STALL.y); drawStall(c, now, brewing); c.restore(); } });
  for (const e of E.crew) if (vis(e.x, e.y, 40)) objs.push({ y: e.y, f: () => drawCrewEnt(c, e) });
  objs.push({ y: player.y, f: () => {
    c.save(); c.translate(player.x, player.y);
    ell(c, 0, 1, 12, 4.5, 'rgba(0,0,0,.22)', false);
    c.scale(player.face, 1);
    const dc = ['#c8913e', '#b5651d', '#8d6e63', '#6d4c41', '#2e86de', '#74b9ff', '#a29bfe'][DOKOS.findIndex(d => d.id === S.dokoId)];
    drawPlayer(c, player.anim, player.mv, player.swing, dc);
    c.restore();
    const fillF = Math.min(1, S.doko / capMax());
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
  // popups
  c.textAlign = 'center';
  for (const p of E.pops) {
    const u = p.age / (p.big ? 1.6 : 1), y = p.y - u * 34, a = 1 - Math.max(0, u - .6) / .4;
    c.globalAlpha = a; c.font = `800 ${p.big ? 15 : 11}px -apple-system,system-ui,sans-serif`;
    c.lineWidth = 3; c.strokeStyle = 'rgba(20,24,40,.85)'; c.strokeText(p.txt, p.x, y); c.fillStyle = p.col; c.fillText(p.txt, p.x, y);
  }
  c.globalAlpha = 1;

  // joystick (screen space)
  c.setTransform(DPR, 0, 0, DPR, 0, 0);
  if (joy.on) {
    circ(c, joy.ox, joy.oy, 52, 'rgba(255,255,255,.12)', false);
    P(c); c.arc(joy.ox, joy.oy, 52, 0, TAU); c.strokeStyle = 'rgba(255,255,255,.35)'; c.lineWidth = 2; c.stroke();
    circ(c, joy.ox + joy.kx, joy.oy + joy.ky, 22, 'rgba(255,255,255,.75)', false);
  }
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
  drawCrewArt(c, e.m.id, e.anim, e.mv, e.act);
  c.restore();
  if (e.m.bl) { c.save(); c.translate(e.x, e.y - hop - 44); P(c); c.ellipse(0, 0, 7, 2.4, 0, 0, TAU); c.strokeStyle = '#ffd24a'; c.lineWidth = 1.8; c.stroke(); c.restore(); }
  if (e.m.lvl > 1) { c.font = '800 8px -apple-system,system-ui,sans-serif'; c.textAlign = 'center'; c.lineWidth = 2.4; c.strokeStyle = 'rgba(20,24,40,.85)'; c.strokeText(e.m.lvl, e.x + 11, e.y + 3); c.fillStyle = '#fff'; c.fillText(e.m.lvl, e.x + 11, e.y + 3); }
}

function drawDecalGround(c, d) {
  const u = d.age / d.dur, a = 1 - u;
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
    c.save(); c.translate(d.x, d.y); c.globalAlpha = fade * .9; c.rotate(now * .3);
    circ(c, 0, 0, 56, `rgba(120,210,255,${.12 + lv * .08})`, false);
    for (let k = 0; k < lv; k++) { P(c); c.arc(0, 0, 56 - k * 7, 0, TAU); c.strokeStyle = 'rgba(210,245,255,.85)'; c.lineWidth = 2; c.stroke(); }
    for (let i = 0; i < 6; i++) { const an = i / 6 * TAU; line(c, 0, 0, Math.cos(an) * 40, Math.sin(an) * 40, 'rgba(210,245,255,.95)', 3); line(c, Math.cos(an) * 22, Math.sin(an) * 22, Math.cos(an + .45) * 32, Math.sin(an + .45) * 32, 'rgba(210,245,255,.9)', 2); line(c, Math.cos(an) * 22, Math.sin(an) * 22, Math.cos(an - .45) * 32, Math.sin(an - .45) * 32, 'rgba(210,245,255,.9)', 2); }
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
function drawProj(c, p) {
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
function dropMat(fi) {
  const k = FIELD_MAT[FIELDS[fi].id]; if (!k) return;
  S.items[k] = (S.items[k] || 0) + 1;
  pop(player.x, player.y - 62, '+1 ' + MATS[k].n, '#d6b4ff', true);
  burst(player.x, player.y - 30, 8, { type: 'star', col: '#d6b4ff', spd: 80, life: .7, size: 2 });
}
const pseudo = id => ({ x: player.x, y: player.y, m: { id, lvl: 10, bl: false }, face: player.face, anim: 0 });
function abilityFired(col) {
  for (const g of equippedGear()) {
    if (!g.pas) continue;
    const p = PASSIVES[g.pas];
    if (p.col === 'always') { if (g.pas === 'nimbus') S.nimbus = Math.min(60, (S.nimbus || 0) + 1); continue; }
    if (p.col !== 'any' && p.col !== col) continue;
    S.pas[g.pas] = Math.min(p.need, (S.pas[g.pas] || 0) + 1);
    if (S.pas[g.pas] >= p.need) {
      const fi = fieldAt(player.x, player.y);
      if (fi < 0 || !fieldOpen(fi)) continue;
      S.pas[g.pas] = 0; runPassive(g.pas, fi);
    }
  }
}
function runPassive(id, fi) {
  const p = PASSIVES[id];
  pop(player.x, player.y - 70, p.n + '!', '#ffd24a', true);
  ring(player.x, player.y, 120, '#ffd24a', .6, 6); ring(player.x, player.y, 70, '#ffffff', .45, 4); shake(5);
  burst(player.x, player.y - 20, 30, { type: 'star', col: '#ffe066', spd: 180, life: 1, size: 2.6 });
  switch (id) {
    case 'wildfire': addBuff('wildfire', 15); burst(player.x, player.y, 40, { type: 'ember', col: '#ff6a2b', spd: 220, life: 1, size: 3.2, g: -60 }); break;
    case 'polar': addBuff('polar', 15); burst(player.x, player.y, 40, { type: 'snow', col: '#d6f3ff', spd: 200, life: 1, size: 2.6 }); break;
    case 'cloudburst': addBuff('cloudburst', 15); break;
    case 'spirit': addBuff('spirit', 20); E.decals.push({ kind: 'rays', x: player.x, y: player.y, age: 0, dur: 2.2, follow: true }); break;
    case 'herd': addBuff('herd', 15); break;
    case 'spark': FX.burst(pseudo('chiliCook'), fi, { x: player.x, y: player.y }); break;
    case 'freeze': for (let k = 0; k < 3; k++) later(k * .15, () => FX.frostMark(pseudo('iceClimber'), fi)); break;
    case 'updraft': FX.gust(pseudo('kiteFlyer'), fi); break;
    case 'renewal': TILES[fi].forEach(t => t.v = 1); burst(player.x, player.y, 40, { type: 'leaf', col: '#7cc560', spd: 260, life: 1, size: 3.4 }); break;
    case 'strike': FX.dive(pseudo('danphe'), fi); break;
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
  buildWorld();
  player.x = S.px || BREW.x; player.y = S.py || BREW.y - 30;
  rebuildCrew(); refreshWet();
  E.crew.forEach(e => { e.x = player.x + rand(-50, 50); e.y = player.y + rand(-30, 30); });
  resize(); addEventListener('resize', resize);
  uiInit();
  if (fresh) showIntro(); else offlineEarnings();
  document.addEventListener('visibilitychange', () => { if (!S) return; if (document.hidden) save(); else { const gap = (Date.now() - S.last) / 1000; if (gap > 90) offlineEarnings(); } });
  requestAnimationFrame(frame);
}
