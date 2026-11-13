'use strict';
/* =========================================================
   CHIYA — HUD, panels, shop, crew management, codex, quests
   ========================================================= */
const $ = id => document.getElementById(id);
let panel = null, panelTab = null, uiT = 0, crewSel = null;

const VERSION = '7';
const NAV = [['home', 'home', 'Home'], ['map', 'map', 'Map'], ['crew', 'crew', 'Crew'], ['shop', 'shop', 'Shop'], ['items', 'bag', 'Items'], ['quests', 'flag', 'Quests'], ['codex', 'book', 'Codex']];
function uiInit() {
  $('bar').innerHTML = NAV.map(([a, i, n]) => `<button data-a="${a}">${ic(i)}<span>${n}</span></button>`).join('');
  $('rpi').innerHTML = ic('coin'); $('dki').innerHTML = ic('basket');
  $('gear').innerHTML = ic('gear'); $('gear').addEventListener('click', () => openPanel('settings'));
  $('statsb').innerHTML = ic('chart'); $('statsb').addEventListener('click', () => openPanel('stats'));
  setTimeout(() => checkUpdate(true), 2500);
  $('bar').addEventListener('click', ev => {
    const b = ev.target.closest('button'); if (!b) return;
    const a = b.dataset.a;
    if (a === 'home') { player.auto = { x: BREW.x, y: BREW.y }; closePanel(); toast('Walking home to brew', 'home'); }
    else openPanel(a);
  });
  $('quest').addEventListener('click', () => openPanel('quests'));
  $('talk').addEventListener('click', () => talk());
  uiTick(1);
}

function uiTick(dt) {
  uiT += dt; if (uiT < .12) return; uiT = 0;
  $('rp').textContent = fmt(S.rp);
  const cap = capMax(), f = S.doko / cap;
  $('dfill').style.width = Math.min(100, f * 100) + '%';
  $('dfill').className = f >= 1 ? 'full' : '';
  $('dtxt').textContent = `${fmt(S.doko)} / ${fmt(cap)}`;
  const fi = fieldAt(player.x, player.y);
  $('loc').innerHTML = ic(brewing ? 'cup' : fi >= 0 ? 'leaf' : 'pin') + (brewing ? 'Brewing at the teahouse' : fi >= 0 ? `${FIELDS[fi].n} <b>x${FIELDS[fi].y}</b>` : dist(player.x, player.y, BREW.x, BREW.y) < 160 ? 'Teahouse' : 'On the trail');
  const bf = [];
  const BI = { haste: 'speed', spiceRush: 'chili', focus: 'focus', roar: 'roar', caravan: 'horns', blessing: 'sparkle', shot_spice: 'bottle', shot_ice: 'crystal', shot_cloud: 'cheese', incense: 'incense' };
  for (const k in B) bf.push(`<span class="chip">${ic(BI[k] || 'dot')}${B[k].st > 1 ? '<i>x' + B[k].st + '</i>' : ''}<b>${Math.ceil(B[k].t)}s</b></span>`);
  $('buffs').innerHTML = bf.join('');
  $('quest').innerHTML = questTracker();
  if (nearNpc && Math.random() < .2) updateTalk();
  if (panel === 'shop' || panel === 'crew') refreshCosts();
}

/* ---------------- toast & modal ---------------- */
let toastT = null;
function toast(msg, icon) {
  const t = $('toast'); t.innerHTML = (icon ? ic(icon) : '') + '<span>' + msg + '</span>'; t.classList.add('on');
  clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('on'), 2400);
}
function showModal(html) { $('modal').innerHTML = `<div class="mcard">${html}</div>`; $('modal').classList.add('on'); }
function closeModal() { $('modal').classList.remove('on'); }
function showIntro() {
  showModal(`<div class="big-ico">${ic('cup')}</div><h2>Welcome to Chiya</h2>
  <p class="mut">Mansoon left you her little teahouse at the foot of the mountain. Make it legendary.</p>
  <div class="steps">
  <div>${ib('pin')}<span><b>Drag anywhere</b> to walk. Your tool gathers automatically in fields.</span></div>
  <div>${ib('crew', '#4cb782')}<span>Your <b>crew</b> follows you and gathers on their own.</span></div>
  <div>${ib('sparkle', '#9b6ef3')}<span>Walk over the <b>ability bubbles</b> they drop for boosts.</span></div>
  <div>${ib('basket', '#c8913e')}<span>Doko full? Tap <b>Home</b> and stand on the brew mat to earn rupees.</span></div>
  <div>${ib('flag', '#2ea4dc')}<span>Talk to the quest givers on the mountain, recruit crew, unlock higher fields.</span></div></div>
  <button class="btn primary" onclick="closeModal()">Let's brew</button>`);
}

/* ---------------- panels ---------------- */
function openPanel(name, tab) {
  if (panel === name && !tab) { closePanel(); return; }
  panel = name; panelTab = tab || panelTab;
  $('sheet').classList.add('on'); document.body.classList.add('panel');
  renderPanel();
}
function closePanel() { panel = null; crewSel = null; $('sheet').classList.remove('on'); document.body.classList.remove('panel'); document.querySelectorAll('#bar button').forEach(b => b.classList.remove('on')); }
function renderPanel() {
  const fn = { crew: pCrew, shop: pShop, items: pItems, quests: pQuests, codex: pCodex, map: pMap, settings: pSettings, stats: pStats }[panel];
  if (!fn) return;
  $('sheet').innerHTML = `<div class="grab" onclick="closePanel()"></div><button class="x" onclick="closePanel()" aria-label="Close">${ic('close')}</button>` + fn();
  document.querySelectorAll('#bar button').forEach(b => b.classList.toggle('on', b.dataset.a === panel));
}
const tabs = (list, cur, panelName) => `<div class="tabs">${list.map(([id, n]) => `<button class="${cur === id ? 'on' : ''}" onclick="panelTab='${id}';renderPanel()">${n}</button>`).join('')}</div>`;
const rarBadge = r => `<span class="rb" style="--rc:${RAR[r].c}">${RAR[r].n}</span>`;
const colBadge = c => `<span class="cb cb-${c}">${ic(COL[c].i)}${COL[c].n}</span>`;
function afford(cost) { return S.rp >= cost; }
function refreshCosts() {
  document.querySelectorAll('[data-cost]').forEach(b => { b.disabled = !afford(+b.dataset.cost) && !b.dataset.free; });
  const r = document.getElementById('sheetRp'); if (r) r.textContent = fmt(S.rp);
}

/* --- costs --- */
const permitCost = () => Math.round(150 * Math.pow(1.4, S.recruits));
const bedCost = () => Math.round(400 * Math.pow(1.45, S.beds - 5));
const wheelCost = () => Math.round(3000 * Math.pow(1.3, S.wheels));
const xpNeed = l => Math.round(30 * Math.pow(1.75, l - 1));
const money = n => `<span class="money">${ic('coin')}${fmt(n)}</span>`;
const icol = name => ICOL[name] || '#ff8a3d';

/* ---------------- CREW ---------------- */
function pCrew() {
  if (crewSel != null && S.crew[crewSel]) return pCrewDetail(crewSel);
  const free = S.beds - S.crew.length;
  const hasPermit = (S.items.permit || 0) > 0;
  let h = `<div class="ph"><h2>Crew</h2><span class="pill">${ic('bed')}${S.crew.length} / ${S.beds}</span></div>`;
  h += `<div class="row2">
    <button class="btn primary" ${free ? '' : 'disabled'} ${hasPermit ? 'data-free="1"' : `data-cost="${permitCost()}"`} onclick="doRecruit()">${ic('ticket')}<span>Recruit</span><small>${hasPermit ? `Use permit (${S.items.permit})` : money(permitCost())}</small></button>
    <button class="btn" ${S.beds >= 50 ? 'disabled' : `data-cost="${bedCost()}"`} onclick="buyBed()">${ic('bed')}<span>New bed</span><small>${S.beds >= 50 ? 'Max' : money(bedCost())}</small></button></div>`;
  h += hiveBox();
  const act = SYN.filter(s => D.syn.has(s.id));
  h += `<div class="synrow">${act.length ? act.map(s => `<span class="chip on">${ic(s.i)}${s.n}</span>`).join('') : `<span class="mut small">No synergies yet. The Codex lists every combo.</span>`}</div>`;
  h += `<div class="beds">`;
  for (let i = 0; i < S.beds; i++) {
    const m = S.crew[i];
    if (!m) { h += `<button class="bed empty" onclick="doRecruit()">${ic('plus')}</button>`; continue; }
    const d = CREW[m.id];
    h += `<button class="bed ${m.bl ? 'bl' : ''}" style="--rc:${RAR[d.r].c}" onclick="crewSel=${i};renderPanel()"><img src="${portrait(m.id, m.bl)}" alt="${d.n}"><span class="lv">${m.lvl}</span><span class="cdot cb-${d.c}"></span></button>`;
  }
  return h + `</div><p class="mut small">The teahouse grows at 10, 20, 30 and 40 beds. Fields unlock by crew count.</p>`;
}
function hiveBox() {
  const n = S.crew.length, c = D.cnt;
  const bar = ['spice', 'ice', 'cloud'].map(k => `<i class="cb-${k}" style="width:${n ? c[k] / n * 100 : 0}%"></i>`).join('');
  return `<div class="hive"><div class="hbar">${bar}</div>${D.hive ? `<div class="hrow">${ib(HIVE[D.hive].i, icol(HIVE[D.hive].i))}<div><b>${HIVE[D.hive].n}</b><div class="mut small">${HIVE[D.hive].d}</div></div></div>` : `<span class="mut small">No teahouse color yet. When half your crew (8+) share a color, you unlock Spice, Ice or Cloud bonuses.</span>`}</div>`;
}
function pCrewDetail(i) {
  const m = S.crew[i], d = CREW[m.id], need = xpNeed(m.lvl), ab = d.ab ? ABIL[d.ab] : null;
  let h = `<button class="back" onclick="crewSel=null;renderPanel()">${ic('back')}Crew</button>`;
  h += `<div class="cdet ${m.bl ? 'bl' : ''}" style="--rc:${RAR[d.r].c}"><img src="${portrait(m.id, m.bl)}" alt=""><div>
    <h2>${d.n}</h2><div class="badges">${rarBadge(d.r)}${colBadge(d.c)}${m.bl ? `<span class="rb gold">${ic('star')}Blessed</span>` : ''}</div><p class="mut small">${d.d}</p></div></div>`;
  h += `<div class="lvl"><div class="lrow"><b>Level ${m.lvl}</b>${m.lvl < 20 ? `<span class="mut small">${fmt(m.xp)} / ${fmt(need)} bond</span>` : '<span class="mut small">Max level</span>'}</div>${m.lvl < 20 ? `<div class="qbar"><i style="width:${m.xp / need * 100}%"></i></div>` : ''}</div>`;
  h += `<div class="stats">
    <div><span>Gather</span><b>${(d.amt * lvlMult(m)).toFixed(1)}</b></div><div><span>Speed</span><b>${d.spd}</b></div>
    <div><span>Every</span><b>${d.gt}s</b></div><div><span>Brew</span><b>${(d.brew * lvlMult(m)).toFixed(1)}/s</b></div></div>`;
  if (ab) h += `<div class="abil">${ib(ab.i, TOKEN_COL[d.c])}<div><b>${ab.n}</b> <span class="mut small">every ${d.cd}s</span><p class="small">${ab.d}</p></div></div>`;
  if (d.pas) h += `<div class="abil">${ib('leaf', '#4cb782')}<div><b>Passive</b><p class="small">${d.pas}</p></div></div>`;
  h += `<div class="abil ${m.bl ? 'gold' : ''}">${ib('star', '#f0b429')}<div><b>Blessed passive</b> <span class="mut small">${m.bl ? 'Active' : 'Locked'}</span><p class="small">+${d.bp[1]}% ${STATN[d.bp[0]]} for the whole teahouse</p></div></div>`;
  h += `<h3>Feed <span class="mut small">Favorite: ${FOOD[d.fav].n} (x3)</span></h3><div class="row3">`;
  for (const f in FOOD) h += `<button class="btn ${f === d.fav ? 'fav' : ''}" ${(S.items[f] || 0) && m.lvl < 20 ? '' : 'disabled'} onclick="feed(${i},'${f}')">${ic(FOOD[f].i)}<span>${S.items[f] || 0}</span><small>+${FOOD[f].xp * (f === d.fav ? 3 : 1)}</small></button>`;
  h += `</div><div class="row2">
    <button class="btn" ${(S.items.mysticWheel || 0) ? '' : 'disabled'} onclick="reroll(${i})">${ic('wheel')}<span>Mystic Wheel</span><small>Reroll (${S.items.mysticWheel || 0})${m.bl ? ', loses Blessed' : ''}</small></button>
    <button class="btn gold" ${(S.items.goldenMomo || 0) && !m.bl ? '' : 'disabled'} onclick="bless(${i})">${ic('star')}<span>Golden Momo</span><small>${m.bl ? 'Already Blessed' : `Make Blessed (${S.items.goldenMomo || 0})`}</small></button></div>`;
  return h;
}
const STATN = { cap: 'doko capacity', gather: 'all gathering', spice: 'Spice gathering', ice: 'Ice gathering', cloud: 'Cloud gathering', brew: 'brewing value', speed: 'move speed', crit: 'crit chance', offline: 'offline earnings', tool: 'tool gathering' };

function rollOdds(odds) { let r = Math.random(), acc = 0; for (const k in odds) { acc += odds[k]; if (r < acc) return k; } return Object.keys(odds)[1]; }
function rollCrew(odds) { const r = rollOdds(odds); return pick(CREW_IDS.filter(id => CREW[id].r === r)); }
const blessChance = () => Math.min(.15, .01 + .03 * (D.k.lama || 0));
function doRecruit() {
  if (S.crew.length >= S.beds) { toast('No free bed. Buy a new one first.', 'bed'); return; }
  if ((S.items.permit || 0) > 0) S.items.permit--;
  else { const c = permitCost(); if (S.rp < c) { toast('Not enough rupees', 'coin'); return; } spend(c); S.recruits++; }
  const id = rollCrew(PERMIT_ODDS), bl = Math.random() < blessChance();
  addCrew(id, bl);
}
function addCrew(id, bl) {
  const isNew = !S.found[id]; S.found[id] = true;
  S.crew.push(mk(id, bl)); S.stats.recruited++; if (bl) S.stats.blessed++; rebuildCrew();
  const e = E.crew[E.crew.length - 1]; e.x = player.x; e.y = player.y - 10;
  burst(player.x, player.y - 20, 30, { type: 'star', col: RAR[CREW[id].r].c, spd: 160, life: 1, size: 2.6 });
  reveal(id, bl, isNew); save(); if (panel) renderPanel();
}
function reveal(id, bl, isNew, title) {
  const d = CREW[id];
  showModal(`<div class="reveal" style="--rc:${RAR[d.r].c}"><div class="burst"></div><img src="${portrait(id, bl)}" alt=""></div>
    ${isNew ? '<div class="new">New</div>' : ''}<h2>${d.n}</h2><div class="badges center">${rarBadge(d.r)}${colBadge(d.c)}${bl ? `<span class="rb gold">${ic('star')}Blessed</span>` : ''}</div>
    <p class="mut small">${d.ab ? `<b>${ABIL[d.ab].n}.</b> ${ABIL[d.ab].d}` : d.pas || d.d}</p>
    <button class="btn primary" onclick="closeModal()"><span>${title || 'Welcome aboard'}</span></button>`);
}
function buyBed() {
  const c = bedCost(); if (S.rp < c || S.beds >= 50) return;
  spend(c); S.beds++; recompute(); toast(`Bed ${S.beds} added`, 'bed');
  if ([10, 20, 30, 40].includes(S.beds)) { toast('Your teahouse grew', 'home'); shake(6); burst(HOUSE.x, HOUSE.y - 60, 60, { type: 'star', col: '#ffd24a', spd: 220, life: 1.4, size: 3 }); }
  save(); renderPanel();
}
function feed(i, f) {
  const m = S.crew[i], d = CREW[m.id];
  if (!(S.items[f] > 0) || m.lvl >= 20) return;
  S.items[f]--; S.stats.feed++;
  m.xp += FOOD[f].xp * (f === d.fav ? 3 : 1);
  let up = false;
  while (m.lvl < 20 && m.xp >= xpNeed(m.lvl)) { m.xp -= xpNeed(m.lvl); m.lvl++; up = true; S.stats.levels++; }
  if (m.lvl >= 20) m.xp = 0;
  const e = E.crew.find(x => x.m === m);
  if (e) { burst(e.x, e.y - 20, up ? 20 : 6, { type: up ? 'star' : 'heart', col: '#ffd24a', spd: 70, life: 1, size: up ? 2.6 : 4, g: -40 }); if (up) pop(e.x, e.y - 50, 'LEVEL ' + m.lvl, '#ffd24a', true); }
  if (up) toast(`${d.n} reached level ${m.lvl}`, 'up');
  renderPanel();
}
function reroll(i) {
  if (!(S.items.mysticWheel > 0)) return;
  S.items.mysticWheel--;
  const m = S.crew[i], id = rollCrew(WHEEL_ODDS), bl = Math.random() < blessChance();
  const isNew = !S.found[id]; S.found[id] = true;
  m.id = id; m.bl = bl; S.stats.rerolls++; if (bl) S.stats.blessed++; rebuildCrew(); save();
  reveal(id, bl, isNew, 'Nice'); renderPanel();
}
function bless(i) {
  const m = S.crew[i]; if (!(S.items.goldenMomo > 0) || m.bl) return;
  S.items.goldenMomo--; m.bl = true; S.stats.blessed++; rebuildCrew(); save();
  const e = E.crew.find(x => x.m === m); if (e) { burst(e.x, e.y - 20, 50, { type: 'star', col: '#ffd24a', spd: 200, life: 1.4, size: 3 }); E.decals.push({ kind: 'ring', x: e.x, y: e.y, r: 90, col: '#ffd24a', age: 0, dur: .7, w: 6 }); }
  reveal(m.id, true, false, 'Blessed'); renderPanel();
}

/* ---------------- SHOP ---------------- */
function pShop() {
  const t = panelTab && ['tools', 'dokos', 'boots', 'supplies', 'lodge'].includes(panelTab) ? panelTab : 'tools';
  let h = `<div class="ph"><h2>Bazaar</h2><span class="pill">${ic('coin')}<span id="sheetRp">${fmt(S.rp)}</span></span></div>` + tabs([['tools', 'Tools'], ['dokos', 'Dokos'], ['boots', 'Boots'], ['supplies', 'Supplies'], ['lodge', 'Lodge']], t);
  const gear = (list, owned, cur, key, stat) => list.map(it => {
    const own = owned.includes(it.id), eq = cur === it.id;
    return `<div class="item ${eq ? 'eq' : ''}">${ib(it.i, icol(it.i))}<div class="it"><b>${it.n}</b><span class="mut small">${stat(it)}</span></div>
      ${eq ? '<span class="tag">Equipped</span>' : own ? `<button class="btn sm" onclick="equip('${key}','${it.id}')"><span>Equip</span></button>` : `<button class="btn sm primary" data-cost="${it.cost}" ${afford(it.cost) ? '' : 'disabled'} onclick="buyGear('${key}','${it.id}')">${money(it.cost)}</button>`}</div>`;
  }).join('');
  if (t === 'tools') h += gear(TOOLS, S.tools, S.tool, 'tool', it => `Reach ${it.r} · ${it.amt} per tile · every ${it.sw}s${it.col ? ` · +60% ${COL[it.col].n}` : ''}${it.crit ? ' · +10% crit' : ''}`);
  if (t === 'dokos') h += gear(DOKOS, S.dokos, S.dokoId, 'doko', it => `Holds ${fmt(it.cap)}`);
  if (t === 'boots') h += gear(BOOTS, S.bootsOwned, S.boots, 'boots', it => `Speed ${it.spd}`);
  if (t === 'supplies') {
    h += `<div class="item">${ib('ticket', icol('ticket'))}<div class="it"><b>Trekking Permit</b><span class="mut small">Recruit a crew member. Price rises.</span></div><button class="btn sm primary" data-cost="${permitCost()}" onclick="buyItem('permit',${permitCost()})">${money(permitCost())}</button></div>`;
    h += `<div class="item">${ib('wheel', icol('wheel'))}<div class="it"><b>Mystic Wheel</b><span class="mut small">Reroll a crew member. No Commons.</span></div><button class="btn sm primary" data-cost="${wheelCost()}" onclick="buyItem('mysticWheel',${wheelCost()})">${money(wheelCost())}</button></div>`;
    for (const k of ['momo', 'selroti', 'dalbhat', 'butterTea', 'spiceShot', 'glacierShard', 'yakCheese', 'incense', 'goldenMomo']) {
      const it = ITEMS[k];
      h += `<div class="item">${ib(it.i, icol(it.i))}<div class="it"><b>${it.n} <span class="mut">x${S.items[k] || 0}</span></b><span class="mut small">${it.d}</span></div><div class="buyrow"><button class="btn sm primary" data-cost="${it.price}" onclick="buyItem('${k}',${it.price})">${money(it.price)}</button>${it.price * 10 < 1e9 ? `<button class="btn sm" data-cost="${it.price * 10}" onclick="buyItem('${k}',${it.price * 10},10)"><span>x10</span></button>` : ''}</div></div>`;
    }
  }
  if (t === 'lodge') {
    h += `<p class="mut small">Your lodge manager keeps the teahouse running while the app is closed. Offline earnings are based on your recent income, up to 12 hours.</p>`;
    LODGE.forEach((l, i) => {
      h += `<div class="item ${S.lodge === i ? 'eq' : ''}">${ib('key', icol('key'))}<div class="it"><b>${l.n}</b><span class="mut small">${Math.round(l.eff * 100)}% offline efficiency</span></div>${S.lodge >= i ? '<span class="tag">' + (S.lodge === i ? 'Current' : 'Done') + '</span>' : S.lodge === i - 1 ? `<button class="btn sm primary" data-cost="${l.cost}" onclick="buyLodge(${i})">${money(l.cost)}</button>` : '<span class="tag dim">Locked</span>'}</div>`;
    });
    h += `<p class="mut small">Recent income: ${fmt(S.rate)} per second</p>`;
  }
  return h;
}
function buyGear(key, id) {
  const list = { tool: TOOLS, doko: DOKOS, boots: BOOTS }[key], it = list.find(x => x.id === id);
  if (S.rp < it.cost) return;
  spend(it.cost);
  ({ tool: S.tools, doko: S.dokos, boots: S.bootsOwned })[key].push(id);
  equip(key, id); toast(`${it.n} bought`, it.i); save();
}
function equip(key, id) { if (key === 'tool') S.tool = id; if (key === 'doko') S.dokoId = id; if (key === 'boots') S.boots = id; renderPanel(); }
function buyItem(k, cost, n = 1) {
  if (S.rp < cost) return; spend(cost); S.items[k] = (S.items[k] || 0) + n;
  if (k === 'permit') S.recruits++; if (k === 'mysticWheel') S.wheels++;
  toast(`+${n} ${ITEMS[k].n}`, ITEMS[k].i); renderPanel();
}
function buyLodge(i) { const l = LODGE[i]; if (S.rp < l.cost) return; spend(l.cost); S.lodge = i; toast(`Hired: ${l.n}`, 'key'); save(); renderPanel(); }

/* ---------------- ITEMS ---------------- */
function pItems() {
  let h = `<div class="ph"><h2>Items</h2></div>`;
  const keys = Object.keys(ITEMS).filter(k => S.items[k] > 0);
  if (!keys.length) return h + '<p class="mut">Empty. Buy supplies in the Bazaar.</p>';
  h += keys.map(k => {
    const it = ITEMS[k];
    const action = it.use ? `<button class="btn sm primary" onclick="useItem('${k}')"><span>Use</span></button>` : FOOD[k] ? `<button class="btn sm" onclick="openPanel('crew')"><span>Feed</span></button>` : k === 'permit' ? `<button class="btn sm" onclick="doRecruit()"><span>Recruit</span></button>` : `<button class="btn sm" onclick="openPanel('crew')"><span>Crew</span></button>`;
    return `<div class="item">${ib(it.i, icol(it.i))}<div class="it"><b>${it.n} <span class="mut">x${S.items[k]}</span></b><span class="mut small">${it.d}</span></div>${action}</div>`;
  }).join('');
  return h;
}
function useItem(k) {
  if (!(S.items[k] > 0)) return; S.items[k]--;
  if (k === 'butterTea') { addBuff('haste', 30, 3); B.haste.st = Math.max(B.haste.st, 3); }
  if (k === 'spiceShot') addBuff('shot_spice', 60);
  if (k === 'glacierShard') addBuff('shot_ice', 60);
  if (k === 'yakCheese') addBuff('shot_cloud', 60);
  if (k === 'incense') addBuff('incense', 60);
  ring(player.x, player.y, 80, '#ffd24a', .5, 5);
  burst(player.x, player.y - 20, 24, { type: 'star', col: '#fff1a8', spd: 120, life: .9, size: 2.4 });
  toast(`${ITEMS[k].n} active`, ITEMS[k].i); renderPanel();
}

/* ---------------- QUESTS (givers on the map) ---------------- */
const npcOf = id => GIVERS[id] || REPEAT[id];
const npcLocked = id => S.crew.length < npcOf(id).gate;
/* repeatable odd jobs */
function rqMake(id) {
  const cap = capMax(), open = FIELDS.filter((f, i) => fieldOpen(i));
  const kinds = ['gather', 'field', 'earn', 'feed'];
  if (E.crew.some(e => CREW[e.m.id].ab && ABIL[CREW[e.m.id].ab].tok)) kinds.push('tokens');
  const k = pick(kinds), f = pick(open), round = n => { const p = Math.pow(10, Math.max(0, Math.floor(Math.log10(n)) - 1)); return Math.max(1, Math.round(n / p) * p); };
  const q = { k, rw: npcOf(id).rw(), cd: 0 };
  if (k === 'gather') { q.a = round(cap * rand(2, 3.5)); q.t = `Gather ${fmt(q.a)} ingredients`; q.base = S.stats.gather; }
  if (k === 'field') { q.a = round(cap * rand(1.2, 2.2)); q.f = f.id; q.t = `Gather ${fmt(q.a)} in ${f.n}`; q.base = S.stats.field[f.id] || 0; }
  if (k === 'earn') { q.a = round(cap * brewValue() * rand(2, 3.5)); q.t = `Brew tea worth ${fmt(q.a)} rupees`; q.base = S.stats.earn; }
  if (k === 'feed') { q.a = ri(3, 8); q.t = `Feed your crew ${q.a} times`; q.base = S.stats.feed; }
  if (k === 'tokens') { q.a = ri(5, 12); q.t = `Grab ${q.a} ability bubbles`; q.base = S.stats.tokens || 0; }
  return q;
}
function rq(id) {
  S.rq = S.rq || {};
  if (!S.rq[id] || (S.rq[id].cd && Date.now() >= S.rq[id].cd)) S.rq[id] = rqMake(id);
  return S.rq[id];
}
function curQuest(gid) {
  if (REPEAT[gid]) { const q = rq(gid); return Date.now() < q.cd ? null : { t: q.t, rw: { items: q.rw }, rep: true }; }
  return QUESTS[gid][S.q[gid] || 0];
}
function qProg(gid) {
  if (REPEAT[gid]) {
    const q = rq(gid); if (Date.now() < q.cd) return null;
    const cur = q.k === 'gather' ? S.stats.gather : q.k === 'field' ? (S.stats.field[q.f] || 0) : q.k === 'earn' ? S.stats.earn : q.k === 'feed' ? S.stats.feed : (S.stats.tokens || 0);
    return { cur: cur - q.base, goal: q.a };
  }
  const q = curQuest(gid); if (!q) return null;
  const [type, a, b] = q.g, base = S.qb[gid] || 0;
  switch (type) {
    case 'gather': return { cur: S.stats.gather - base, goal: a };
    case 'earn': return { cur: S.stats.earn - base, goal: a };
    case 'feed': return { cur: S.stats.feed - base, goal: a };
    case 'field': return { cur: (S.stats.field[a] || 0) - base, goal: b };
    case 'crew': return { cur: S.crew.length, goal: a };
    case 'tool': return { cur: S.tools.includes(a) ? 1 : 0, goal: 1 };
    case 'level': return { cur: Math.max(...S.crew.map(m => m.lvl)), goal: a };
    case 'syn': return { cur: D.syn.size, goal: a };
    case 'blessed': return { cur: S.crew.filter(m => m.bl).length, goal: a };
    case 'yaks': return { cur: S.crew.filter(m => YAKS.includes(m.id)).length, goal: a };
    case 'has': return { cur: S.crew.some(m => m.id === a) ? 1 : 0, goal: 1 };
  }
}
function qBaseNow(gid) {
  const q = curQuest(gid); if (!q || q.rep) return 0;
  const [type, a] = q.g;
  return type === 'gather' ? S.stats.gather : type === 'earn' ? S.stats.earn : type === 'feed' ? S.stats.feed : type === 'field' ? (S.stats.field[a] || 0) : 0;
}
function giverState(gid) {
  if (npcLocked(gid)) return 'locked';
  if (REPEAT[gid] && Date.now() < rq(gid).cd) return 'cooldown';
  const p = qProg(gid); return !p ? 'done' : p.cur >= p.goal ? 'ready' : 'active';
}
const rwHtml = rw => [rw.rp ? money(rw.rp) : '', ...Object.entries(rw.items || {}).map(([k, n]) => `<span class="rwi">${ic(ITEMS[k].i)}${ITEMS[k].n} x${n}</span>`), rw.crew ? `<span class="rwi">${ic('crew')}${CREW[rw.crew].n}</span>` : ''].filter(Boolean).join('');
const rwText = rw => [rw.rp ? fmt(rw.rp) + ' rupees' : '', ...Object.entries(rw.items || {}).map(([k, n]) => `${ITEMS[k].n} x${n}`), rw.crew ? CREW[rw.crew].n : ''].filter(Boolean).join(', ');
const mmss = ms => { const s = Math.ceil(ms / 1000); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };
function trackedGiver() {
  const ids = Object.keys(GIVERS);
  return ids.find(g => giverState(g) === 'ready') || ids.find(g => giverState(g) === 'active');
}
function questTracker() {
  const gid = trackedGiver();
  if (!gid) return `<div class="qt">${ic('check')}<span>All quests done</span></div>`;
  const q = curQuest(gid), p = qProg(gid), ready = p.cur >= p.goal;
  return `<div class="qt"><img src="${npcPortrait(gid)}" alt=""><span><small>${GIVERS[gid].n}</small>${q.t}</span>${ready ? '<b class="ready">Claim</b>' : ''}</div><div class="qbar"><i style="width:${Math.min(100, p.cur / p.goal * 100)}%"></i></div>`;
}
function giverRow(gid) {
  const g = npcOf(gid), st = giverState(gid);
  let body;
  if (st === 'locked') body = `<div class="mut small">${ic('lock')} Unlocks at ${g.gate} crew</div>`;
  else if (st === 'cooldown') body = `<div class="mut small">New job in ${mmss(rq(gid).cd - Date.now())}</div>`;
  else if (st === 'done') body = '<div class="mut small">All done. Thank you!</div>';
  else { const q = curQuest(gid), p = qProg(gid); body = `<div class="small"><b>${q.t}</b></div><div class="qbar"><i style="width:${Math.min(100, p.cur / p.goal * 100)}%"></i></div><div class="mut small">${fmt(Math.min(p.cur, p.goal))} / ${fmt(p.goal)}${g.rep ? ' · Repeatable' : ` · Quest ${(S.q[gid] || 0) + 1} of ${QUESTS[gid].length}`}</div>`; }
  return `<div class="giver ${st === 'locked' ? 'dim' : ''}" style="--gc:${g.col}"><img src="${npcPortrait(gid)}" alt=""><div class="it"><div class="dn"><b>${g.n}</b><span class="mut small">${g.role}</span></div>${body}</div>
    ${st === 'locked' ? '' : `<button class="btn sm ${st === 'ready' ? 'primary' : ''}" onclick="goTo(${g.x},${g.y + 30})"><span>${st === 'ready' ? 'Claim' : 'Go'}</span></button>`}</div>`;
}
function pQuests() {
  let h = `<div class="ph"><h2>Quests</h2></div><p class="mut small">Quest givers live on the mountain. Walk up to them to talk and claim rewards.</p>`;
  h += `<h3>Story</h3>` + Object.keys(GIVERS).map(giverRow).join('');
  h += `<h3>Odd jobs</h3><p class="mut small">Small repeatable jobs for items. A new one is ready a few minutes after you finish.</p>` + Object.keys(REPEAT).map(giverRow).join('');
  return h;
}
function updateTalk() {
  const t = $('talk');
  if (!nearNpc) { t.classList.remove('on'); return; }
  const g = npcOf(nearNpc), st = giverState(nearNpc);
  t.innerHTML = `<img src="${npcPortrait(nearNpc)}" alt=""><span><small>${g.role}</small>Talk to ${g.n}</span>${st === 'ready' ? `<b class="dotg"></b>` : ''}`;
  t.classList.add('on');
}
function talk(gid) {
  gid = gid || nearNpc; if (!gid) return;
  const g = npcOf(gid), st = giverState(gid);
  let h = `<div class="npc-head" style="--gc:${g.col}"><img src="${npcPortrait(gid)}" alt=""></div><h2>${g.n}</h2><div class="mut small">${g.role}</div>`;
  if (st === 'locked') { h += `<p class="say">"Come back when your crew is bigger. I only deal with teahouses of ${g.gate} or more."</p><button class="btn primary" onclick="closeModal()"><span>Okay</span></button>`; showModal(h); return; }
  if (st === 'cooldown') { h += `<p class="say">"Thanks again! I'll have another job for you in ${mmss(rq(gid).cd - Date.now())}."</p><button class="btn primary" onclick="closeModal()"><span>See you</span></button>`; showModal(h); return; }
  const q = curQuest(gid), p = qProg(gid);
  if (!q) { h += `<p class="say">"You have done everything I asked. The mountain smiles on you."</p><button class="btn primary" onclick="closeModal()"><span>Thank you</span></button>`; showModal(h); return; }
  const done = p.cur >= p.goal, needBed = q.rw.crew && S.crew.length >= S.beds, first = !g.rep && (S.q[gid] || 0) === 0;
  const line = [first || g.rep ? g.hi : '', done ? 'You did it! Here is your reward.' : g.rep ? '' : 'Can you help me with something?'].filter(Boolean).join(' ');
  h += `<p class="say">"${line}"</p>
    <div class="quest"><div class="qn">${g.rep ? 'Odd job' : `Quest ${(S.q[gid] || 0) + 1} of ${QUESTS[gid].length}`}</div><h3>${q.t}</h3>
    <div class="qbar big"><i style="width:${Math.min(100, p.cur / p.goal * 100)}%"></i></div><div class="mut small">${fmt(Math.min(p.cur, p.goal))} / ${fmt(p.goal)}</div>
    <div class="rw">${ic('gift')}${rwHtml(q.rw)}</div></div>
    <button class="btn primary" ${done && !needBed ? '' : 'disabled'} onclick="claimQuest('${gid}')"><span>${needBed ? 'Needs a free bed' : done ? 'Claim reward' : 'On it'}</span></button>
    ${done ? '' : `<button class="btn" onclick="closeModal()"><span>Close</span></button>`}`;
  showModal(h);
}
function claimQuest(gid) {
  const q = curQuest(gid), p = qProg(gid); if (!q || p.cur < p.goal) return;
  if (q.rw.crew && S.crew.length >= S.beds) return;
  if (q.rw.rp) S.rp += q.rw.rp;
  for (const k in q.rw.items || {}) S.items[k] = (S.items[k] || 0) + q.rw.items[k];
  if (REPEAT[gid]) { S.rq[gid].cd = Date.now() + REPEAT_CD; S.stats.jobs++; }
  else { S.stats.quests++; S.q[gid] = (S.q[gid] || 0) + 1; S.qb[gid] = qBaseNow(gid); }
  const g = npcOf(gid); burst(g.x, g.y - 40, 40, { type: 'star', col: '#ffd24a', spd: 200, life: 1.2, size: 3 });
  closeModal(); updateTalk();
  if (q.rw.crew) { addCrew(q.rw.crew, false); return; }
  toast(rwText(q.rw), 'gift'); save();
}

/* ---------------- CODEX ---------------- */
function pCodex() {
  const t = panelTab && ['crewdex', 'syn', 'colors'].includes(panelTab) ? panelTab : 'crewdex';
  let h = `<div class="ph"><h2>Codex</h2></div>` + tabs([['crewdex', 'Crew'], ['syn', 'Synergies'], ['colors', 'Colors']], t);
  if (t === 'crewdex') {
    const found = CREW_IDS.filter(id => S.found[id]).length;
    h += `<p class="mut small">Found ${found} of ${CREW_IDS.length}. Recruit with permits, reroll with Mystic Wheels. Event crew come from quests.</p>`;
    ['common', 'rare', 'epic', 'legendary', 'mythic', 'event'].forEach(r => {
      h += `<h3><span class="rdot" style="--rc:${RAR[r].c}"></span>${RAR[r].n}${PERMIT_ODDS[r] ? ` <span class="mut small">${(PERMIT_ODDS[r] * 100).toFixed(1)}% per permit</span>` : ''}</h3>`;
      CREW_IDS.filter(id => CREW[id].r === r).forEach(id => {
        const d = CREW[id], f = S.found[id];
        h += `<div class="dex ${f ? '' : 'unfound'}" style="--rc:${RAR[r].c}"><img src="${portrait(id)}" alt=""><div><div class="dn"><b>${f ? d.n : '???'}</b>${colBadge(d.c)}</div>
          <div class="small">${d.ab ? `<b>${ABIL[d.ab].n}.</b> ${ABIL[d.ab].d}` : d.pas || 'No ability. Pure hard work.'}</div>
          <div class="mut small">Favorite: ${FOOD[d.fav].n} · Blessed: +${d.bp[1]}% ${STATN[d.bp[0]]}</div></div></div>`;
      });
    });
  }
  if (t === 'syn') {
    h += `<p class="mut small">Synergies switch on automatically when the right crew live in your teahouse. ${D.syn.size} of ${SYN.length} active.</p>`;
    h += SYN.map(s => `<div class="syn ${D.syn.has(s.id) ? 'on' : ''}">${ib(s.i, D.syn.has(s.id) ? '#4cb782' : '#9aa0ad')}<div><div class="dn"><b>${s.n}</b>${D.syn.has(s.id) ? `<span class="tag ok">${ic('check')}Active</span>` : ''}</div><div class="small"><span class="mut">Needs</span> ${s.req}</div><div class="small">${s.d}</div></div></div>`).join('');
  }
  if (t === 'colors') {
    h += `<p class="mut small">When at least half of your crew (8+ crew) share a color, your teahouse takes that color. Each one plays differently.</p>` + hiveBox();
    h += Object.entries(HIVE).map(([k, v]) => `<div class="syn ${D.hive === k ? 'on' : ''}">${ib(v.i, icol(v.i))}<div><b>${v.n}</b><div class="small">${v.d}</div></div></div>`).join('');
    h += `<p class="mut small">Crew gather x1.5 on tiles of their own color. Neutral crew get x1.15 everywhere.</p>`;
  }
  return h;
}

/* ---------------- MAP ---------------- */
function pMap() {
  let h = `<div class="ph"><h2>Mountain</h2></div><p class="mut small">Tap Go to walk there. Higher fields give more per tile.</p>`;
  h += `<div class="item">${ib('home', '#ff8a3d')}<div class="it"><b>Teahouse</b><span class="mut small">Brew your doko here</span></div><button class="btn sm" onclick="goTo(${BREW.x},${BREW.y})"><span>Go</span></button></div>`;
  FIELDS.forEach((f, i) => {
    const open = fieldOpen(i), ci = f.c === 'mix' ? 'sparkle' : COL[f.c].i;
    h += `<div class="item ${open ? '' : 'dim'}">${ib(open ? ci : 'lock', f.c === 'mix' ? '#9b6ef3' : icol(ci))}<div class="it"><b>${f.n} <span class="mut">Lv ${f.lv[0]}${f.lv[1] > f.lv[0] ? '-' + f.lv[1] : ''}</span></b><span class="mut small">${f.c === 'mix' ? 'Mixed colors' : COL[f.c].n} · ${open ? 'Open' : f.gate + ' crew needed'}</span></div>${open ? `<button class="btn sm" onclick="goTo(${f.x + f.w / 2},${f.yy + f.h / 2})"><span>Go</span></button>` : ''}</div>`;
  });
  return h;
}
function goTo(x, y) { player.auto = { x, y }; closePanel(); }

/* ---------------- SETTINGS & UPDATES ---------------- */
let upd = { state: 'idle', remote: null };
async function checkUpdate(silent) {
  upd.state = 'checking'; if (panel === 'settings') renderPanel();
  try {
    const r = await fetch('version.json?t=' + Date.now(), { cache: 'no-store' });
    const j = await r.json(); upd.remote = String(j.version);
    upd.state = upd.remote !== VERSION ? 'available' : 'latest';
    if (silent && upd.state === 'available') toast('Update available. Open Settings to install', 'refresh');
  } catch (e) { upd.state = 'offline'; }
  if (panel === 'settings') renderPanel();
}
async function forceUpdate() {
  upd.state = 'updating'; renderPanel(); save();
  try {
    const files = ['./', 'index.html', 'style.css', 'version.json', 'js/icons.js', 'js/data.js', 'js/art.js', 'js/game.js', 'js/ui.js', 'manifest.json'];
    await Promise.all(files.map(f => fetch(f, { cache: 'reload' }).catch(() => {})));
    if (window.caches) for (const k of await caches.keys()) await caches.delete(k);
    if (navigator.serviceWorker) for (const r of await navigator.serviceWorker.getRegistrations()) await r.unregister();
  } catch (e) {}
  location.replace(location.pathname + '?v=' + Date.now());
}
let resetArm = false;
function resetProgress() {
  if (!resetArm) { resetArm = true; renderPanel(); setTimeout(() => { resetArm = false; if (panel === 'settings') renderPanel(); }, 4000); return; }
  try { localStorage.removeItem('chiya_save'); } catch (e) {}
  S = null; location.reload();
}
function pSettings() {
  const st = { idle: 'Tap to check for a newer version.', checking: 'Checking…', latest: 'You have the latest version.', available: `Version ${upd.remote} is available.`, offline: 'No connection. Try again when you have signal.', updating: 'Updating…' }[upd.state];
  let h = `<div class="ph"><h2>Settings</h2></div>`;
  h += `<div class="item">${ib('refresh', upd.state === 'available' ? '#3fae6b' : '#2ea4dc')}<div class="it"><b>App version ${VERSION}</b><span class="mut small">${st}</span></div></div>`;
  h += `<div class="row2"><button class="btn" onclick="checkUpdate()">${ic('refresh')}<span>Check for update</span></button>
    <button class="btn primary" onclick="forceUpdate()">${ic('download')}<span>Update now</span><small>Reloads the latest version</small></button></div>`;
  h += `<p class="mut small">Your progress is saved on this phone and stays when you update.</p>`;
  h += `<h3>Game</h3><div class="item">${ib('cup', '#ff8a3d')}<div class="it"><b>How to play</b><span class="mut small">Show the intro again</span></div><button class="btn sm" onclick="closePanel();showIntro()"><span>Show</span></button></div>`;
  h += `<div class="item">${ib('trash', '#ef4d5f')}<div class="it"><b>Reset progress</b><span class="mut small">Deletes your teahouse and crew. Cannot be undone.</span></div><button class="btn sm ${resetArm ? 'danger' : ''}" onclick="resetProgress()"><span>${resetArm ? 'Tap again' : 'Reset'}</span></button></div>`;
  return h;
}

/* ---------------- STATS ---------------- */
function dur(sec) { sec = Math.floor(sec); const d = Math.floor(sec / 86400), h = Math.floor(sec % 86400 / 3600), m = Math.floor(sec % 3600 / 60); return d ? `${d}d ${h}h` : h ? `${h}h ${m}m` : `${m}m ${sec % 60}s`; }
function pStats() {
  const st = S.stats, tile = (icon, col, label, val) => `<div class="stile">${ib(icon, col)}<div><span>${label}</span><b>${val}</b></div></div>`;
  const bars = (rows, total) => rows.map(([label, v, col, icon]) => `<div class="srow">${icon ? ic(icon) : ''}<span class="sl">${label}</span><div class="sbar"><i style="width:${total ? Math.max(1.5, v / total * 100) : 0}%;background:${col}"></i></div><b>${fmt(v)}</b></div>`).join('');
  const days = Math.max(1, Math.ceil((Date.now() - S.start) / 864e5));
  let h = `<div class="ph"><h2>Stats</h2><span class="pill">${ic('clock')}Day ${days}</span></div><p class="mut small">All-time records for your teahouse.</p>`;
  h += `<h3>Overview</h3><div class="sgrid">
    ${tile('coin', '#ff8a3d', 'Rupees earned', fmt(st.earn))}
    ${tile('leaf', '#3fae6b', 'Ingredients gathered', fmt(st.gather))}
    ${tile('clock', '#2ea4dc', 'Time played', dur(st.time))}
    ${tile('pin', '#9b6ef3', 'Distance walked', (st.walk / 100).toFixed(1) + ' km')}
    ${tile('cup', '#b0784a', 'Doko brewed', fmt(st.brews))}
    ${tile('moon', '#6f7fd0', 'Earned offline', fmt(st.offline))}
    ${tile('shop', '#e5484d', 'Rupees spent', fmt(st.spent))}
    ${tile('star', '#f0b429', 'Biggest single gather', fmt(st.best))}</div>`;
  const ct = (st.col.spice || 0) + (st.col.ice || 0) + (st.col.cloud || 0);
  h += `<h3>Gathered by color</h3><div class="sbox">${bars([['Spice', st.col.spice || 0, '#f26b4a', 'flame'], ['Ice', st.col.ice || 0, '#4fb6e6', 'snow'], ['Cloud', st.col.cloud || 0, '#8e9bd6', 'cloud']], ct)}</div>`;
  const lt = [1, 2, 3, 4, 5].reduce((a, l) => a + (st.lv[l] || 0), 0);
  h += `<h3>Gathered by flower level</h3><div class="sbox">${bars([1, 2, 3, 4, 5].map(l => [`Level ${l}`, st.lv[l] || 0, ['#cfd6dd', '#8fd18f', '#5ab0e6', '#a77de8', '#f0b429'][l - 1]]), lt)}</div>`;
  const fmax = Math.max(1, ...FIELDS.map(f => st.field[f.id] || 0));
  h += `<h3>Gathered by field</h3><div class="sbox">${bars(FIELDS.map(f => [f.n, st.field[f.id] || 0, f.c === 'mix' ? '#9b6ef3' : f.c === 'cloud' ? '#8e9bd6' : COL[f.c].c]), fmax)}</div>`;
  h += `<h3>Crew</h3><div class="sgrid">
    ${tile('crew', '#4cb782', 'Crew recruited', fmt(st.recruited))}
    ${tile('star', '#f0b429', 'Blessed obtained', fmt(st.blessed))}
    ${tile('up', '#2ea4dc', 'Levels gained', fmt(st.levels))}
    ${tile('momo', '#e8a25b', 'Times fed', fmt(st.feed))}
    ${tile('wheel', '#9b6ef3', 'Mystic Wheel rerolls', fmt(st.rerolls))}
    ${tile('bed', '#c8913e', 'Beds', S.beds + ' / 50')}
    ${tile('book', '#ff8a3d', 'Crew types found', CREW_IDS.filter(id => S.found[id]).length + ' / ' + CREW_IDS.length)}
    ${tile('compass', '#3fae6b', 'Synergies active', D.syn.size + ' / ' + SYN.length)}</div>`;
  const abs = Object.entries(st.ab).sort((a, b) => b[1] - a[1]), amax = abs.length ? abs[0][1] : 1;
  h += `<h3>Abilities</h3><div class="sgrid">
    ${tile('sparkle', '#9b6ef3', 'Bubbles collected', fmt(st.tokens))}
    ${tile('focus', '#e5484d', 'Critical gathers', fmt(st.crits))}</div>`;
  h += abs.length ? `<div class="sbox">${bars(abs.map(([k, v]) => [ABIL[k].n, v, '#9b6ef3', ABIL[k].i]), amax)}</div>` : '<p class="mut small">No abilities used yet.</p>';
  h += `<h3>Quests</h3><div class="sgrid">
    ${tile('flag', '#2ea4dc', 'Story quests', fmt(st.quests))}
    ${tile('gift', '#c8913e', 'Odd jobs', fmt(st.jobs))}</div>`;
  return h;
}
