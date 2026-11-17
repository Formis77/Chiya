'use strict';
/* =========================================================
   CHIYA — HUD, panels, shop, crew management, codex, quests
   ========================================================= */
const $ = id => document.getElementById(id);
let lastBuffs = '', panel = null, panelTab = null, uiT = 0, crewSel = null;

const VERSION = '40';
const NAV = [['crew', 'crew', 'Crew'], ['items', 'bag', 'Items'], ['quests', 'flag', 'Quests'], ['map', 'map', 'Map'], ['stats', 'chart', 'Stats'], ['codex', 'book', 'Codex'], ['settings', 'gear', 'Settings']];
const HOTBAR_N = 7;
function uiInit() {
  $('bar').innerHTML = NAV.map(([a, i, n]) => `<button data-a="${a}">${ic(i)}<span>${n}</span></button>`).join('');
  $('rpi').innerHTML = ic('coin'); $('dki').innerHTML = ic('basket');
  $('menub').innerHTML = ic('menu');
  $('menub').addEventListener('click', () => { if (panel) { closePanel(); document.body.classList.remove('menu'); } else document.body.classList.toggle('menu'); });
  $('gearq').addEventListener('click', ev => { const b = ev.target.closest('[data-g]'); if (b) gearPop(b); });
  addEventListener('pointerdown', ev => { if (!ev.target.closest('#pop,[data-g],[data-b],[data-p]')) hidePop(); }, true);
  if (!S.hotbar || S.hotbar.length !== HOTBAR_N) S.hotbar = ['permit', 'butterTea', 'spiceShot', 'glacierShard', 'yakCheese', 'incense', 'lotusSeed'];
  $('hotbar').addEventListener('pointerdown', ev => { const sl = ev.target.closest('.hslot'); if (!sl) return; ev.preventDefault(); dragStart(ev, S.hotbar[+sl.dataset.i], +sl.dataset.i); });
  addEventListener('pointermove', dragMove); addEventListener('pointerup', dragEnd); addEventListener('pointercancel', dragEnd);
  setTimeout(() => checkUpdate(true), 2500);
  $('bar').addEventListener('click', ev => {
    const b = ev.target.closest('button'); if (!b) return;
    const a = b.dataset.a;
    if (a === 'home') { player.auto = { x: BREW.x, y: BREW.y }; closePanel(); toast('Walking home to brew', 'home'); }
    else openPanel(a === 'items' ? 'inv' : a);
  });
  $('quest').addEventListener('click', () => openPanel('quests'));
  $('talk').addEventListener('click', () => talk());
  $('place').addEventListener('click', () => placeSprinkler());
  $('buffs').addEventListener('pointerdown', ev => { const b = ev.target.closest('[data-b]'), p = ev.target.closest('[data-p]'); if (b) { ev.preventDefault(); buffTip(b.dataset.b, b); } else if (p) { ev.preventDefault(); pasTip(p.dataset.p, p); } });
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
  $('loc').innerHTML = ic(brewing ? 'cup' : fi >= 0 ? 'leaf' : 'pin') + (brewing ? 'Brewing at the teahouse' : fi >= 0 ? `${FIELDS[fi].n} <b>Lv ${FIELDS[fi].lv[0]}${FIELDS[fi].lv[1] > FIELDS[fi].lv[0] ? "-" + FIELDS[fi].lv[1] : ""}</b>` : dist(player.x, player.y, BREW.x, BREW.y) < 160 ? 'Teahouse' : 'On the trail');
  const bf = [];
  const BI = { lungta: 'flag', popstar: 'snow', swell: 'drop', lbless: 'diya', inspire: 'sparkle', saw: 'star', precision: 'focus', darkheat: 'flame', kukur: 'paw', litfield: 'diya', heat: 'flame', chill: 'snow', nimbusb: 'cloud', butterbomb: 'drop', gtea: 'cup', masala: 'bottle', shot_spice: 'bottle', shot_ice: 'crystal', shot_cloud: 'cheese', boost_spice: 'flame', boost_ice: 'snow', boost_cloud: 'cloud', love: 'heart', supercrit: 'focus', blaze: 'flame', popstar: 'drop', bear: 'paw', comet: 'star', wildfire: 'flame', polar: 'snow', cloudburst: 'cloud', spirit: 'mountain', herd: 'horns', haste: 'speed', spiceRush: 'chili', focus: 'focus', roar: 'roar', caravan: 'horns', blessing: 'sparkle', shot_spice: 'bottle', shot_ice: 'crystal', shot_cloud: 'cheese', incense: 'incense' };
  { const fl = frostAt(player.x, player.y); if (fl) bf.push(`<button class="chip frostc" data-b="frostmark">${ic('snow')}<b>x${FROST_MUL[fl]}</b></button>`); }
  if (S.sawN > 0 && now - (S.sawLast || -99) <= 20) bf.push(`<button class="chip schip side" data-b="sawcount">${ic('marigold')}<b>${S.sawN}/3</b></button>`); else if (S.sawN) S.sawN = 0;
  for (const k in B) bf.push(`<button class="chip ${k === 'darkheat' ? 'dark' : k === 'popstar' ? 'schip main' : k === 'lungta' ? 'schip main' : k === 'saw' || k === 'inspire' ? 'schip side' : ''}" data-b="${k}">${ic(BI[k] || 'dot')}${B[k].perm ? '<b>x' + Math.floor(B[k].st) + '</b>' : k === 'inspire' ? '<i>x' + (B[k].st + 1) + '</i><b>' + Math.ceil(B[k].t) + 's</b>' : k === 'popstar' ? '<i>x' + (2 + Math.min(1, B[k].st * .01)).toFixed(2) + '</i><b>' + Math.ceil(B[k].t) + 's</b>' : k === 'swell' ? '<i>x' + swellMul().toFixed(1) + '</i><b>' + Math.ceil(B[k].t / 60) + 'm</b>' : k === 'lbless' ? '<i>x' + B[k].st + '</i><b>' + Math.ceil(B[k].t / 60) + 'm</b>' : k === 'lungta' ? '<i>x' + B[k].st + '</i><b>' + Math.ceil(B[k].t) + 's</b>' : (B[k].st > 1 ? '<i>x' + Math.floor(B[k].st) + '</i>' : '') + '<b>' + Math.ceil(B[k].t) + 's</b>'}</button>`);
  for (const g of equippedGear()) if (g.pas && PASSIVES[g.pas].col !== 'always') { const p = PASSIVES[g.pas], n = S.pas[g.pas] || 0, cdl = p.cd ? Math.ceil((((S.pasCd || {})[g.pas] || 0) - Date.now()) / 1000) : 0;
    bf.push(cdl > 0 ? `<button class="chip pchip" data-p="${g.pas}">${ic('clock')}<b>${cdl}s</b></button>` : `<button class="chip pchip" data-p="${g.pas}"><span class="pring" style="--p:${n / p.need * 100}%"></span>${n}/${p.need}</button>`); }
  if (E.poles.length) bf.push(`<button class="chip" data-b="poles">${ic('flag')}<b>${E.poles.length}/6</b></button>`);
  if (E.sacred) bf.push(`<button class="chip schip main" data-b="sacred">${ic('star')}<i>Lv+${E.sacred.lv}</i><b>${Math.ceil(E.sacred.t)}s</b></button>`);
  /* star amulet counters: main star gold, side star mint */
  if (mpas('glacierStar')) { const cdl = Math.ceil(((S.popCd || 0) - Date.now()) / 1000); if (!B.popstar) bf.push(`<button class="chip schip main" data-b="glaciercount">${ic('snow')}<b>${cdl > 0 ? cdl + 's' : (S.blueN || 0) + '/45'}</b></button>`); }
  if (mpas('guidingStar')) bf.push(`<button class="chip schip side" data-b="guidecount">${ic('star')}<b>${S.pilgrim ? Math.ceil((S.pilgrim.until - Date.now()) / 60000) + 'm' : (S.guideN || 0) + '/250'}</b></button>`);
  const bh = bf.join(''); if (bh !== lastBuffs) { $('buffs').innerHTML = bh; lastBuffs = bh; }
  $('quest').innerHTML = questTracker();
  renderHotbar();
  { const eq = equippedSlots(), sig = eq.map(([k, it]) => it.id).join(); if ($('gearq').dataset.sig !== sig) { $('gearq').innerHTML = eq.map(([k, it]) => `<button data-g="${k}" style="color:${gearCol(it)}">${ic(it.i)}</button>`).join(''); $('gearq').dataset.sig = sig; } }
  const pf = fieldAt(player.x, player.y), canPlace = S.spr.n > 0 && pf >= 0 && fieldOpen(pf) && !panel;
  $('place').classList.toggle('on', canPlace);
  if (canPlace) $('place').innerHTML = `${ic('drop')}<span><small>${SPRINKLERS[S.spr.lv].n}</small>Place ${S.spr.placed.length}/${S.spr.n}</span>`;
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
  $('sheet').classList.add('on'); document.body.classList.add('panel', 'menu');
  renderPanel();
}
function closePanel() { panel = null; crewSel = null; $('sheet').classList.remove('on'); document.body.classList.remove('panel', 'menu'); document.querySelectorAll('#bar button').forEach(b => b.classList.remove('on')); }
function renderPanel() {
  const fn = { inv: pItems, tihar: pTihar, badges: pBadges, blender: pBlender, crew: pCrew, shop: pShop, gear: pGear, mandala: pMandala, items: pItems, quests: pQuests, codex: pCodex, map: pMap, settings: pSettings, stats: pStats }[panel];
  if (!fn) return;
  $('sheet').classList.toggle('fit', panel === 'shop');
  $('sheet').innerHTML = `<div class="grab" onclick="closePanel()"></div><button class="x" onclick="closePanel()" aria-label="Close">${ic('close')}</button>` + fn();
  document.querySelectorAll('#bar button').forEach(b => b.classList.toggle('on', b.dataset.a === panel || (b.dataset.a === 'items' && panel === 'inv')));
}
const tabs = (list, cur, panelName) => `<div class="tabs">${list.map(([id, n]) => `<button class="${cur === id ? 'on' : ''}" onclick="panelTab='${id}';renderPanel()">${n}</button>`).join('')}</div>`;
const rarBadge = r => `<span class="rb" style="--rc:${RAR[r].c}">${RAR[r].n}</span>`;
const colBadge = c => `<span class="cb cb-${c}">${ic(COL[c].i)}${COL[c].n}</span>`;
function afford(cost) { return S.rp >= cost; }
function refreshCosts() {
  document.querySelectorAll('[data-cost]').forEach(b => { if (b.closest('.gear')) return; b.disabled = !afford(+b.dataset.cost) && !b.dataset.free; });
  const r = document.getElementById('sheetRp'); if (r) r.textContent = fmt(S.rp);
}

/* --- info buttons: descriptions live behind a small i --- */
function infoOf(kind, id) {
  if (kind === 'ab') return [ABIL[id].n, ABIL[id].d];
  if (kind === 'pas') return [PASSIVES[id].n, PASSIVES[id].d];
  if (kind === 'mp') return [MANDALA_PAS[id].n, MANDALA_PAS[id].d];
  if (kind === 'syn') { const q = SYN.find(x => x.id === id); return [q.n, q.d + ' Needs: ' + q.req]; }
  if (kind === 'hive') return [HIVE[id].n, HIVE[id].d];
  if (kind === 'it') return [ITEMS[id].n, ITEMS[id].d];
  if (kind === 'cp') return [CREW[id].n, CREW[id].pas];
  if (kind === 'cd') return [CREW[id].n, CREW[id].d];
  return ['', ''];
}
const info = (kind, id) => `<button class="ibtn" onpointerdown="event.stopPropagation()" onclick="event.stopPropagation();showInfo('${kind}','${id}')" aria-label="Info">i</button>`;
function showInfo(kind, id) {
  const [n, d] = infoOf(kind, id), t = $('tip');
  t.innerHTML = `${ib('info', '#2ea4dc')}<div><b>${n}</b><span>${d}</span></div>`;
  t.classList.add('on'); clearTimeout(tipT); tipT = setTimeout(() => t.classList.remove('on'), 6000);
}

/* --- costs --- */
const permitCost = () => Math.min(1e7, Math.round(1000 * Math.pow(1.42, S.recruits)));
const bedCost = () => Math.round(1e6 * Math.pow(1.32, Math.max(0, S.beds - 25)));
const wheelCost = (n = 0) => Math.min(2.5e6, Math.round(3000 * Math.pow(1.3, S.wheels + n)));
const wheelBulk = n => { let t = 0; for (let i = 0; i < n; i++) t += wheelCost(i); return t; };
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
  return `<div class="hive"><div class="hbar">${bar}</div>${D.hive ? `<div class="hrow">${ib(HIVE[D.hive].i, icol(HIVE[D.hive].i))}<div><b>${HIVE[D.hive].n}</b> ${info('hive', D.hive)}</div></div>` : `<span class="mut small">No teahouse color yet. When half your crew (8+) share a color, you unlock Spice, Ice or Cloud bonuses.</span>`}</div>`;
}
function pCrewDetail(i) {
  const m = S.crew[i], d = CREW[m.id], need = xpNeed(m.lvl), ab = d.ab ? ABIL[d.ab] : null;
  let h = `<button class="back" onclick="crewSel=null;renderPanel()">${ic('back')}Crew</button>`;
  h += `<div class="cdet ${m.bl ? 'bl' : ''}" style="--rc:${RAR[d.r].c}"><img src="${portrait(m.id, m.bl)}" alt=""><div>
    <h2>${d.n}</h2><div class="badges">${rarBadge(d.r)}${colBadge(d.c)}${m.bl ? `<span class="rb gold">${ic('star')}Blessed</span>` : ''}</div></div></div>`;
  h += `<div class="lvl"><div class="lrow"><b>Level ${m.lvl}</b>${m.lvl < 20 ? `<span class="mut small">${fmt(m.xp)} / ${fmt(need)} bond</span>` : '<span class="mut small">Max level</span>'}</div>${m.lvl < 20 ? `<div class="qbar"><i style="width:${m.xp / need * 100}%"></i></div>` : ''}</div>`;
  h += `<div class="stats">
    <div><span>Gather</span><b>${(d.amt * lvlMult(m)).toFixed(1)}</b></div><div><span>Speed</span><b>${d.spd}</b></div>
    <div><span>Every</span><b>${d.gt}s</b></div><div><span>Brew</span><b>${(d.brew * lvlMult(m)).toFixed(1)}/s</b></div></div>`;
  if (ab) h += `<div class="abil">${ib(ab.i, TOKEN_COL[d.c])}<div><b>${ab.n}</b> ${info('ab', d.ab)} <span class="mut small">every ${d.cd}s</span></div></div>`;
  if (d.pas) h += `<div class="abil">${ib('leaf', '#4cb782')}<div><b>Passive</b> ${info('cp', m.id)}</div></div>`;
  h += `<div class="abil ${m.bl ? 'gold' : ''}">${ib('star', '#f0b429')}<div><b>Blessed passive</b> <span class="mut small">${m.bl ? 'Active' : 'Locked'}</span><p class="small">+${d.bp[1]}% ${STATN[d.bp[0]]} for the whole teahouse (counts once per crew type)</p></div></div>`;
  h += `<h3>Feed <span class="mut small">Favorite: ${FOOD[d.fav].n} (x3)</span></h3><div class="row3">`;
  for (const f in FOOD) h += `<button class="btn ${f === d.fav ? 'fav' : ''}" ${(S.items[f] || 0) && m.lvl < 20 ? '' : 'disabled'} onclick="feed(${i},'${f}')">${ic(FOOD[f].i)}<span>${S.items[f] || 0}</span><small>+${FOOD[f].xp * (f === d.fav ? 3 : 1)}</small></button>`;
  h += `</div><div class="row2">
    <button class="btn" ${(S.items.mysticWheel || 0) ? '' : 'disabled'} onclick="reroll(${i})">${ic('wheel')}<span>Mystic Wheel</span><small>Reroll (${S.items.mysticWheel || 0})${m.bl ? ', loses Blessed' : ''}</small></button>
    <button class="btn gold" ${(S.items.goldenMomo || 0) && !m.bl ? '' : 'disabled'} onclick="bless(${i})">${ic('star')}<span>Golden Momo</span><small>${m.bl ? 'Already Blessed' : `Make Blessed (${S.items.goldenMomo || 0})`}</small></button></div>
    <h3>Auto-roll <span class="mut small">uses Mystic Wheels until it hits</span></h3><div class="row3">
    <button class="btn" ${(S.items.mysticWheel || 0) ? '' : 'disabled'} onclick="reroll(${i},'leg')"><span>Legendary+</span></button>
    <button class="btn" ${(S.items.mysticWheel || 0) ? '' : 'disabled'} onclick="reroll(${i},'myth')"><span>Mythic</span></button>
    <button class="btn" ${(S.items.mysticWheel || 0) ? '' : 'disabled'} onclick="reroll(${i},'blessed')"><span>Blessed</span></button></div>`;
  return h;
}
const STATN = { cdr: 'ability recharge', conv: 'instant conversion', cap: 'doko capacity', gather: 'all gathering', spice: 'Spice gathering', ice: 'Ice gathering', cloud: 'Cloud gathering', brew: 'brewing value', speed: 'move speed', crit: 'crit chance', offline: 'offline earnings', tool: 'tool gathering' };

function rollOdds(odds) { let r = Math.random(), acc = 0; for (const k in odds) { acc += odds[k]; if (r < acc) return k; } return Object.keys(odds)[1]; }
function rollCrew(odds) { const r = rollOdds(odds); return pick(CREW_IDS.filter(id => CREW[id].r === r)); }
const blessChance = (wheel) => (wheel ? 1 / 250 : 1 / 287) + .002 * (D.k.lama || 0);
function doRecruit(permitOnly) {
  if (S.crew.length >= S.beds) { toast('No free bed. Buy a new one first.', 'bed'); return; }
  if (permitOnly && !(S.items.permit > 0)) { toast('No permits. Buy them at the Bazaar.', 'ticket'); return; }
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
    <p class="mut small">${d.ab ? `<b>${ABIL[d.ab].n}</b> ${info('ab', d.ab)}` : d.pas ? `Passive ${info('cp', id)}` : ''}</p>
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
function rollOnce(i) {
  S.items.mysticWheel--;
  const m = S.crew[i], id = rollCrew(WHEEL_ODDS), bl = Math.random() < blessChance(true);
  const isNew = !S.found[id]; S.found[id] = true;
  m.id = id; m.bl = bl; S.stats.rerolls++; if (bl) S.stats.blessed++;
  return { id, bl, isNew };
}
function reroll(i, until) {
  if (!(S.items.mysticWheel > 0)) return;
  const stop = { leg: r => RAR[CREW[r.id].r].o >= 3, myth: r => CREW[r.id].r === 'mythic', blessed: r => r.bl }[until];
  let res, n = 0, anyNew = false;
  do { res = rollOnce(i); n++; anyNew = anyNew || res.isNew; } while (stop && !stop(res) && S.items.mysticWheel > 0 && n < 1000);
  rebuildCrew(); save(); renderPanel();
  const d = CREW[res.id], hit = !stop || stop(res);
  showModal(`<div class="reveal" style="--rc:${RAR[d.r].c}"><div class="burst"></div><img src="${portrait(res.id, res.bl)}" alt=""></div>
    ${anyNew ? '<div class="new">New</div>' : ''}<h2>${d.n}</h2><div class="badges center">${rarBadge(d.r)}${colBadge(d.c)}${res.bl ? `<span class="rb gold">${ic('star')}Blessed</span>` : ''}</div>
    <p class="mut small">${n > 1 ? `${n} Mystic Wheels used${hit ? '' : ', stopped (out of wheels or 1000 rolls)'}. ` : ''}${S.items.mysticWheel || 0} left.</p>
    <div class="row2"><button class="btn primary" ${S.items.mysticWheel ? '' : 'disabled'} onclick="reroll(${i}${until ? `,'${until}'` : ''})"><span>Roll again</span></button><button class="btn" onclick="closeModal()"><span>Keep</span></button></div>`);
}
function bless(i) {
  const m = S.crew[i]; if (!(S.items.goldenMomo > 0) || m.bl) return;
  S.items.goldenMomo--; m.bl = true; S.stats.blessed++; rebuildCrew(); save();
  const e = E.crew.find(x => x.m === m); if (e) { burst(e.x, e.y - 20, 50, { type: 'star', col: '#ffd24a', spd: 200, life: 1.4, size: 3 }); E.decals.push({ kind: 'ring', x: e.x, y: e.y, r: 90, col: '#ffd24a', age: 0, dur: .7, w: 6 }); }
  reveal(m.id, true, false, 'Blessed'); renderPanel();
}

/* ---------------- SHOP ---------------- */
const GEARLIST = { tool: TOOLS, doko: DOKOS, boots: BOOTS, hat: HEADGEAR };
const ownedOf = k => ({ tool: S.tools, doko: S.dokos, boots: S.bootsOwned, hat: S.hats, charm: S.charms })[k];
const equippedOf = k => ({ tool: S.tool, doko: S.dokoId, boots: S.boots, hat: S.hat, charm: S.charm })[k];
const gearCol = it => it.col ? TOKEN_COL[it.col] : icol(it.i);
function gearStats(k, it) {
  const st = Object.entries(it.st || {}).map(([s2, v]) => `+${Math.round(v * 100)}% ${STATN2[s2]}`);
  if (k === 'tool') return [`Reach ${it.r}`, `${it.amt} per tile`, `Every ${it.sw}s`, it.col ? `+${Math.round((it.cb || .6) * 100)}% ${COL[it.col].n}` : '', it.crit ? '+10% crit' : '', ...st].filter(Boolean);
  if (k === 'doko') return [`Holds ${fmt(it.cap)}`, ...st];
  if (k === 'boots') return [`Speed ${it.spd}`];
  return st;
}
let curShop = null;
function openShop(id) { curShop = SHOPS.find(s2 => s2.id === id); panelTab = null; openPanel('shop', 'x'); }
function pShop() {
  const sh = curShop; if (!sh) return pGear();
  const cats = Object.keys(sh.sells).concat(sh.extra || []);
  const t = cats.includes(panelTab) ? panelTab : cats[0];
  let h = `<div class="ph"><h2>${sh.n}</h2><span class="pill">${ic('coin')}<span id="sheetRp">${fmt(S.rp)}</span></span></div>`;
  h += tabs(cats.map(c2 => [c2, SLOT_N[c2] || { supplies: 'Supplies', lodge: 'Lodge', sprinklers: 'Sprinklers' }[c2]]), t);
  if (sh.sells[t]) {
    const list = sh.sells[t].map(id => GEARLIST[t].find(g => g.id === id));
    h += `<div class="car" id="car">` + list.map(it => {
      const own = ownedOf(t).includes(it.id), eq = equippedOf(t) === it.id, ok = canAfford(it), gc = gearCol(it);
      const req = !own && it.req ? `<div class="req">${Object.entries(it.req).map(([k, n]) => `<span class="${(S.items[k] || 0) >= n ? 'ok' : 'no'}">${ic(ITEMS[k].i)}${Math.min(S.items[k] || 0, n)}/${n} ${ITEMS[k].n}</span>`).join('')}</div>` : '';
      const pas = it.pas ? `<div class="pas">${ic('sparkle')}<span><b>${PASSIVES[it.pas].n}</b> ${info('pas', it.pas)}</span></div>` : '';
      const btn = eq ? `<span class="tag big">Equipped</span>` : own ? `<button class="btn" onclick="equip('${t}','${it.id}')"><span>Equip</span></button>` : `<button class="btn primary" data-cost="${it.cost}" ${ok ? '' : 'disabled'} onclick="buyGear('${t}','${it.id}')">${it.cost ? money(it.cost) : '<span>Free</span>'}</button>`;
      return `<div class="gcard ${eq ? 'eq' : ''}"><div class="gart" style="--c:${gc}">${ic(it.i)}${it.col ? `<span class="gcol cb-${it.col}"></span>` : ''}</div>
        <h3>${it.n}</h3><div class="mut small">${SLOT_N[t].replace(/s$/, '')}${it.col ? ' · ' + COL[it.col].n : ''}</div>
        <div class="gst">${gearStats(t, it).map(x => `<span>${x}</span>`).join('')}</div>${pas}${req}<div class="gbuy">${btn}</div></div>`;
    }).join('') + `</div><div class="dots">${list.map((_, i) => `<i data-i="${i}"></i>`).join('')}</div>`;
    setTimeout(carouselInit, 0);
  } else h += shopExtra(t);
  return h;
}
function carouselInit() {
  const car = $('car'); if (!car) return;
  const dots = [...document.querySelectorAll('.dots i')];
  const upd = () => { const i = Math.round(car.scrollLeft / (car.firstElementChild.offsetWidth + 12)); dots.forEach((d, j) => d.classList.toggle('on', j === i)); };
  car.onscroll = upd; upd();
  if (car.dataset.pos) car.scrollLeft = +car.dataset.pos;
}
function shopExtra(t) {
  let h = '';
  if (t === 'sprinklers') {
    const sp = S.spr, cur = SPRINKLERS[sp.lv], nx = SPRINKLERS[sp.lv + 1];
    h += `<p class="mut small">Sprinklers water a circle of flowers: they regrow faster and give more when gathered. Stand in a field and tap <b>Place</b> to set one down. Placing more than you own moves the oldest one.</p>`;
    h += `<div class="item eq">${ib('drop', '#2ea4dc')}<div class="it"><b>${cur.n}</b><span class="mut small">Radius ${cur.r} · x${cur.wet} gathering · x${cur.rg} regrowth</span></div><span class="tag">${sp.placed.length}/${sp.n} placed</span></div>`;
    h += `<div class="item">${ib('plus', '#3fae6b')}<div class="it"><b>Extra sprinkler</b><span class="mut small">${sp.n >= SPR_MAX ? 'Maximum reached' : `Own ${sp.n} of ${SPR_MAX}. Price triples each time.`}</span></div>${sp.n >= SPR_MAX ? '<span class="tag dim">Max</span>' : `<button class="btn sm primary" data-cost="${sprCountCost(sp.n)}" onclick="buySprinkler()">${money(sprCountCost(sp.n))}</button>`}</div>`;
    h += `<div class="item">${ib('up', '#9b6ef3')}<div class="it"><b>${nx ? 'Upgrade to ' + nx.n : 'Fully upgraded'}</b><span class="mut small">${nx ? `Radius ${nx.r} · x${nx.wet} gathering · x${nx.rg} regrowth` : 'The best sprinklers on the mountain.'}</span></div>${nx ? `<button class="btn sm primary" data-cost="${sprLevelCost(sp.lv)}" onclick="upgradeSprinkler()">${money(sprLevelCost(sp.lv))}</button>` : ''}</div>`;
    if (sp.placed.length) h += `<button class="btn" onclick="S.spr.placed=[];refreshWet();save();renderPanel()"><span>Pick up all sprinklers</span></button>`;
  }
  if (t === 'supplies') {
    h += `<div class="item">${ib('ticket', icol('ticket'))}<div class="it"><b>Trekking Permit</b><span class="mut small">Recruit a crew member. Price rises.</span></div><button class="btn sm primary" data-cost="${permitCost()}" onclick="buyItem('permit',${permitCost()})">${money(permitCost())}</button></div>`;
    h += `<div class="item">${ib('wheel', icol('wheel'))}<div class="it"><b>Mystic Wheel</b><span class="mut small">Reroll a crew member. No Commons. Price stops rising at 2.5M.</span></div><div class="buyrow"><button class="btn sm primary" data-cost="${wheelCost()}" onclick="buyItem('mysticWheel',${wheelCost()})">${money(wheelCost())}</button><button class="btn sm" data-cost="${wheelBulk(10)}" onclick="buyItem('mysticWheel',${wheelBulk(10)},10)"><span>x10</span></button><button class="btn sm" data-cost="${wheelBulk(100)}" onclick="buyItem('mysticWheel',${wheelBulk(100)},100)"><span>x100</span></button></div></div>`;
    for (const k of ['momo', 'selroti', 'dalbhat', 'butterTea', 'spiceShot', 'glacierShard', 'yakCheese', 'incense', 'butterDrop', 'goldenMomo']) {
      const it = ITEMS[k];
      h += `<div class="item">${ib(it.i, icol(it.i))}<div class="it"><b>${it.n} <span class="mut">x${S.items[k] || 0}</span> ${info('it', k)}</b></div><div class="buyrow"><button class="btn sm primary" data-cost="${it.price}" onclick="buyItem('${k}',${it.price})">${money(it.price)}</button>${it.price * 10 < 1e9 ? `<button class="btn sm" data-cost="${it.price * 10}" onclick="buyItem('${k}',${it.price * 10},10)"><span>x10</span></button>` : ''}</div></div>`;
    }
  }
  if (t === 'lodge') {
    h += `<p class="mut small">Your lodge manager keeps the teahouse running while the app is closed. Offline earnings are based on your recent income, up to 8 hours.</p>`;
    LODGE.forEach((l, i) => {
      h += `<div class="item ${S.lodge === i ? 'eq' : ''}">${ib('key', icol('key'))}<div class="it"><b>${l.n}</b><span class="mut small">${Math.round(l.eff * 100)}% offline efficiency</span></div>${S.lodge >= i ? '<span class="tag">' + (S.lodge === i ? 'Current' : 'Done') + '</span>' : S.lodge === i - 1 ? `<button class="btn sm primary" data-cost="${l.cost}" onclick="buyLodge(${i})">${money(l.cost)}</button>` : '<span class="tag dim">Locked</span>'}</div>`;
    });
    h += `<p class="mut small">Recent income: ${fmt(S.rate)} per second</p>`;
  }
  return h;
}
/* gear panel: what you wear, what you own, where the shops are */
function pGear() {
  let h = `<div class="ph"><h2>Gear</h2></div>`;
  for (const k of ['tool', 'doko', 'boots', 'hat']) {
    const own = ownedOf(k), cur = equippedOf(k);
    h += `<h3>${SLOT_N[k]}</h3><div class="gown">` + (own.length ? own.map(id => { const it = GEARLIST[k].find(g => g.id === id); if (!it) return ''; return `<button class="gchip ${cur === id ? 'on' : ''}" onclick="equip('${k}', ${cur === id && (k === 'hat' || k === 'charm') ? 'null' : `'${id}'`})">${ib(it.i, gearCol(it))}<span>${it.n}</span></button>`; }).join('') : `<span class="mut small">None yet. Find one at a shop.</span>`) + `</div>`;
  }
  h += `<h3>Mandala</h3>` + (S.mandala ? mandalaCard(S.mandala) : `<p class="mut small">None yet. Generate one at the Mandala Shrine in the High Pasture.</p>`);
  h += `<h3>Shops</h3><p class="mut small">Shops are on the map. Walk up to one to browse its gear.</p>` + SHOPS.map(sh => { const open = zoneOpen(sh.z); return `<div class="item ${open ? '' : 'dim'}">${ib(open ? 'shop' : 'lock', open ? sh.col : '#9aa0ad')}<div class="it"><b>${sh.n}</b><span class="mut small">${ZONES[sh.z].n} · ${Object.keys(sh.sells).map(k => SLOT_N[k]).concat((sh.extra || []).map(e => ({ supplies: 'Supplies', lodge: 'Lodge', sprinklers: 'Sprinklers' })[e])).join(', ')}</span></div>${open ? `<button class="btn sm" onclick="goTo(${sh.x},${sh.y + 40})"><span>Go</span></button>` : ''}</div>`; }).join('');
  return h;
}
const STATN2 = { conv: 'instant conversion', cap: 'capacity', gather: 'all gathering', spice: 'Spice', ice: 'Ice', cloud: 'Cloud', brew: 'brewing', speed: 'speed', crit: 'crit', offline: 'offline', tool: 'tool', cdr: 'faster abilities', yak: 'yak gathering' };
const canAfford = it => S.rp >= it.cost && Object.entries(it.req || {}).every(([k, n]) => (S.items[k] || 0) >= n);
function buyGear(key, id) {
  const list = { tool: TOOLS, doko: DOKOS, boots: BOOTS, hat: HEADGEAR, charm: CHARMS }[key], it = list.find(x => x.id === id);
  if (!canAfford(it)) return;
  spend(it.cost);
  for (const k in it.req || {}) S.items[k] -= it.req[k];
  ({ tool: S.tools, doko: S.dokos, boots: S.bootsOwned, hat: S.hats, charm: S.charms })[key].push(id);
  equip(key, id); toast(`${it.n} crafted`, it.i); save();
}
function equip(key, id) { const car = $('car'), pos = car ? car.scrollLeft : 0; setTimeout(() => { const c2 = $('car'); if (c2) c2.scrollLeft = pos; }, 0); if (key === 'tool') S.tool = id; if (key === 'doko') S.dokoId = id; if (key === 'boots') S.boots = id; if (key === 'hat') S.hat = id; if (key === 'charm') S.charm = id; recompute(); renderPanel(); }
function buyItem(k, cost, n = 1) {
  if (S.rp < cost) return; spend(cost); S.items[k] = (S.items[k] || 0) + n;
  if (k === 'permit') S.recruits++; if (k === 'mysticWheel') S.wheels += n;
  toast(`+${n} ${ITEMS[k].n}`, ITEMS[k].i); renderPanel();
}
function buyLodge(i) { const l = LODGE[i]; if (S.rp < l.cost) return; spend(l.cost); S.lodge = i; toast(`Hired: ${l.n}`, 'key'); save(); renderPanel(); }

/* ---------------- ITEMS ---------------- */
let invSel = null;
function itemAction(k) {
  const it = ITEMS[k];
  return it.use ? `<button class="btn sm primary" onclick="useItem('${k}')"><span>Use</span></button>` : FOOD[k] ? `<button class="btn sm" onclick="openPanel('crew')"><span>Feed crew</span></button>` : k === 'permit' ? `<button class="btn sm primary" onclick="doRecruit(true)"><span>Recruit</span></button>` : k === 'mysticWheel' || k === 'goldenMomo' ? `<button class="btn sm" onclick="openPanel('crew')"><span>Pick crew</span></button>` : '<span class="tag dim">Crafting</span>';
}
function pItems() {
  let h = `<div class="ph"><h2>Inventory</h2></div>`;
  const keys = Object.keys(ITEMS).filter(k => S.items[k] > 0);
  if (!keys.length) return h + '<p class="mut">Empty. Buy supplies in the Bazaar.</p>';
  if (!invSel || !(S.items[invSel] > 0)) invSel = keys[0];
  const it = ITEMS[invSel];
  h += `<div class="invsel">${ib(it.i, icol(it.i))}<div class="it"><b>${it.n} <span class="mut">x${fmt(S.items[invSel])}</span></b><span class="mut small">${it.d}</span></div>${itemAction(invSel)}</div>`;
  h += `<p class="mut small">Hold an item and drag it onto a hotbar slot. Drag a slot off the hotbar to clear it.</p>`;
  h += `<div class="invgrid">${keys.map(k => `<button class="icell ${k === invSel ? 'on' : ''} ${S.hotbar.includes(k) ? 'hb' : ''}" data-k="${k}" onpointerdown="dragStart(event,'${k}',-1)">${ib(ITEMS[k].i, icol(ITEMS[k].i))}<b>${fmt(S.items[k])}</b></button>`).join('')}</div>`;
  return h;
}
/* ---------------- HOTBAR ---------------- */
let hbSig = '';
function renderHotbar() {
  if (!S.hotbar) S.hotbar = ['permit', 'butterTea', 'spiceShot', 'glacierShard', 'yakCheese', 'incense', 'lotusSeed'];
  if (dragS && dragS.on) return;
  const sig = S.hotbar.map(k => k ? k + ':' + (S.items[k] || 0) : '-').join('|');
  if (sig === hbSig) return; hbSig = sig;
  $('hotbar').innerHTML = S.hotbar.map((k, i) => { if (!k) return `<button class="hslot empty" data-i="${i}"><small>${i + 1}</small></button>`;
    const n = S.items[k] || 0; return `<button class="hslot ${n ? '' : 'zero'}" data-i="${i}" style="--c:${icol(ITEMS[k].i)}">${ic(ITEMS[k].i)}<b>${fmt(n)}</b><small>${i + 1}</small></button>`; }).join('');
}
function hotUse(i) {
  const k = S.hotbar[i]; if (!k) { openPanel('inv'); return; }
  if (!(S.items[k] > 0)) { toast(`No ${ITEMS[k].n} left`, ITEMS[k].i); return; }
  const it = ITEMS[k];
  if (it.use) useItem(k); else if (k === 'permit') doRecruit(true); else if (FOOD[k] || k === 'mysticWheel' || k === 'goldenMomo') openPanel('crew'); else toast(`${it.n} is used for crafting and blending`, it.i);
}
let dragS = null;
function dragStart(ev, k, from) {
  dragS = { k, from, x0: ev.clientX, y0: ev.clientY, on: false, id: ev.pointerId, armed: from >= 0 };
  if (from < 0) { const d = dragS; setTimeout(() => { if (dragS === d) { d.armed = true; const el = document.querySelector(`.icell[data-k="${k}"]`); if (el) el.classList.add('lift'); } }, 220); }
}
document.addEventListener('touchmove', e => { if (dragS && dragS.armed) e.preventDefault(); }, { passive: false });
function dragMove(ev) {
  if (!dragS || ev.pointerId !== dragS.id) return;
  if (!dragS.armed && Math.hypot(ev.clientX - dragS.x0, ev.clientY - dragS.y0) > 9) { dragS = null; return; }
  if (!dragS.on && dragS.armed && Math.hypot(ev.clientX - dragS.x0, ev.clientY - dragS.y0) > 9 && dragS.k) {
    dragS.on = true; const d = $('drag'); d.innerHTML = ib(ITEMS[dragS.k].i, icol(ITEMS[dragS.k].i)); d.classList.add('on'); document.body.classList.add('dragging');
  }
  if (dragS.on) { const d = $('drag'); d.style.transform = `translate(${ev.clientX - 26}px,${ev.clientY - 26}px)`; dragS.lx = ev.clientX; dragS.ly = ev.clientY;
    document.querySelectorAll('.hslot').forEach(s2 => s2.classList.remove('over')); const sl = slotAt(ev.clientX, ev.clientY); dragS.over = sl ? +sl.dataset.i : -1; if (sl) sl.classList.add('over'); }
}
function dragEnd(ev) {
  if (!dragS || ev.pointerId !== dragS.id) return;
  const ds = dragS; dragS = null; $('drag').classList.remove('on'); document.body.classList.remove('dragging');
  if (!ds.on) { if (ds.from >= 0) hotUse(ds.from); else if (ds.k) { invSel = ds.k; renderPanel(); } hbSig = ''; return; }
  if (ev.type === 'pointercancel') { hbSig = ''; renderHotbar(); return; }
  const sl = slotAt(ev.clientX, ev.clientY) || (ds.over >= 0 ? document.querySelector(`.hslot[data-i="${ds.over}"]`) : null);
  if (sl) { const to = +sl.dataset.i;
    if (to !== ds.from && S.hotbar[to] !== ds.k) {
      if (ds.from >= 0) { const t = S.hotbar[to]; S.hotbar[to] = ds.k; S.hotbar[ds.from] = t; }
      else { const prev = S.hotbar.indexOf(ds.k); if (prev >= 0) S.hotbar[prev] = S.hotbar[to]; S.hotbar[to] = ds.k; } } }
  else if (ds.from >= 0) { const hb = $('hotbar').getBoundingClientRect(); if (ev.clientY < hb.top - 40) S.hotbar[ds.from] = null; }
  hbSig = ''; renderHotbar(); save(); if (panel === 'inv') renderPanel();
}
function useItem(k) {
  if (!(S.items[k] > 0)) return; S.items[k]--;
  if (k === 'butterTea') { addTimed('haste', 180, 1800); B.haste.st = Math.max(B.haste.st, 3); }
  if (k === 'spiceShot') addTimed('shot_spice', 600);
  if (k === 'glacierShard') addTimed('shot_ice', 600);
  if (k === 'yakCheese') addTimed('shot_cloud', 600);
  if (k === 'incense') addTimed('incense', 300);
  if (k === 'goldenTea') addTimed('gtea', 900);
  if (k === 'masala') addTimed('masala', 600);
  if (k === 'marigold') {
    if (!mpas('starSaw')) { S.items[k]++; toast('Marigolds spin up the Chakra Saw star. Spend them at the Tihar Stall otherwise.', 'marigold'); return; }
    if (now - (S.sawLast || -99) > 20) S.sawN = 0; S.sawLast = now; S.sawN = (S.sawN || 0) + 1;
    if (S.sawN >= 3) { S.sawN = 0; S.items[k]++; B.saw = { t: 30, st: 1 }; toast('Chakra Saw spinning for 30s (1 Marigold saved)', 'star'); }

    save(); renderPanel(); return; }
  if (k === 'garland') { if (S.crew.length >= S.beds) { S.items[k]++; toast('You need a free bed first', 'bed'); return; } addCrew('tiharDog', false); save(); renderPanel(); return; }
  if (k === 'lotusSeed') { if (fieldAt(player.x, player.y) < 0 || !window.plantSprout) { S.items[k]++; toast('Stand in a field to plant it', 'leaf'); return; } plantSprout(fieldAt(player.x, player.y)); }
  if (k === 'butterDrop') { if (fieldAt(player.x, player.y) < 0) { S.items[k]++; toast('Stand in a field to drop butter', 'drop'); return; } E.decals.push({ kind: 'goo', x: player.x, y: player.y, r: 110, age: 0, dur: mpas('butterStar') ? 80 : 40 }); }
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
  const kinds = ['field', 'field', 'field', 'col'], lv = S.stats.leo || 0, hard = 1 + Math.min(3, lv * .03);
  if (E.crew.some(e => CREW[e.m.id].ab && ABIL[CREW[e.m.id].ab].tok)) kinds.push('tokens');
  const k = pick(kinds), f = pick(open), round = n => { const p = Math.pow(10, Math.max(0, Math.floor(Math.log10(n)) - 1)); return Math.max(1, Math.round(n / p) * p); };
  const q = { k, rw: npcOf(id).rw(), cd: 0 };
  if (k === 'gather') { q.a = round(cap * hard * rand(2.5, 4)); q.t = `Gather ${fmt(q.a)} ingredients`; q.base = S.stats.gather; }
  if (k === 'col') { q.c = pick(['spice', 'ice', 'cloud']); q.a = round(cap * hard * rand(1.5, 2.5)); q.t = `Gather ${fmt(q.a)} ${COL[q.c].n} ingredients`; q.base = S.stats.col[q.c] || 0; }
  if (k === 'field') { q.a = round(cap * hard * rand(1.5, 2.5)); q.f = f.id; q.t = `Gather ${fmt(q.a)} in ${f.n}`; q.base = S.stats.field[f.id] || 0; }
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
  if (REPEAT[gid]) { const q = rq(gid); return Date.now() < q.cd ? null : { t: q.t, rw: { items: q.rw, perm: q.k === 'col' ? { [q.c]: .005 } : null, fperm: q.k === 'field' ? { [q.f]: .01 } : null }, rep: true }; }
  return QUESTS[gid][S.q[gid] || 0];
}
function qProg(gid) {
  if (REPEAT[gid]) {
    const q = rq(gid); if (Date.now() < q.cd) return null;
    const cur = q.k === 'gather' ? S.stats.gather : q.k === 'col' ? (S.stats.col[q.c] || 0) : q.k === 'field' ? (S.stats.field[q.f] || 0) : q.k === 'earn' ? S.stats.earn : q.k === 'feed' ? S.stats.feed : (S.stats.tokens || 0);
    return { cur: cur - q.base, goal: q.a };
  }
  const q = curQuest(gid); if (!q) return null;
  const [type, a, b] = q.g, base = S.qb[gid] || 0;
  switch (type) {
    case 'gather': return { cur: S.stats.gather - base, goal: a };
    case 'earn': return { cur: S.stats.earn - base, goal: a };
    case 'feed': return { cur: S.stats.feed - base, goal: a };
    case 'col': return { cur: (S.stats.col[a] || 0) - base, goal: b };
    case 'tokens': return { cur: (S.stats.tokens || 0) - base, goal: a };
    case 'blend': return { cur: (S.stats.blends || 0) - base, goal: a };
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
  return type === 'gather' ? S.stats.gather : type === 'earn' ? S.stats.earn : type === 'feed' ? S.stats.feed : type === 'field' ? (S.stats.field[a] || 0) : type === 'col' ? (S.stats.col[a] || 0) : type === 'tokens' ? (S.stats.tokens || 0) : type === 'blend' ? (S.stats.blends || 0) : 0;
}
function giverState(gid) {
  if (npcLocked(gid)) return 'locked';
  if (REPEAT[gid] && Date.now() < rq(gid).cd) return 'cooldown';
  if (S.qfix) { S.qfix = false; S.qb.didi = qBaseNow('didi'); }
  const cq = curQuest(gid); if (cq && cq.line != null && S.crew.length < QLINES[cq.line].need) return 'wait';
  const p = qProg(gid); return !p ? 'done' : p.cur >= p.goal ? 'ready' : 'active';
}
const permTxt = (p, fp) => [...Object.entries(p || {}).map(([k, v]) => `+${+(v * 100).toFixed(1)}% ${STATN[k]} forever`), ...Object.entries(fp || {}).map(([k, v]) => `+${+(v * 100).toFixed(1)}% in ${FIELDS.find(f => f.id === k).n} forever`)];
const rwHtml = rw => [rw.rp ? money(rw.rp) : '', ...permTxt(rw.perm, rw.fperm).map(t => `<span class="rwi perm">${ic('star')}${t}</span>`), ...Object.entries(rw.items || {}).map(([k, n]) => `<span class="rwi">${ic(ITEMS[k].i)}${ITEMS[k].n} x${n}</span>`), rw.crew ? `<span class="rwi">${ic('crew')}${CREW[rw.crew].n}</span>` : ''].filter(Boolean).join('');
const rwText = rw => [rw.rp ? fmt(rw.rp) + ' rupees' : '', ...permTxt(rw.perm, rw.fperm), ...Object.entries(rw.items || {}).map(([k, n]) => `${ITEMS[k].n} x${n}`), rw.crew ? CREW[rw.crew].n : ''].filter(Boolean).join(', ');
const mmss = ms => { const s = Math.ceil(ms / 1000); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };
function qLabel(gid) {
  const i = S.q[gid] || 0, q = QUESTS[gid][i];
  if (q && q.line != null) { const st = QUESTS[gid].findIndex(x => x.line === q.line); return `${QLINES[q.line].n} · ${i - st + 1} of ${QUESTS[gid].filter(x => x.line === q.line).length}`; }
  return `Quest ${i + 1} of ${QUESTS[gid].length}`;
}
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
  else if (st === 'wait') body = `<div class="mut small">${ic('lock')} ${QLINES[curQuest(gid).line].n} opens at ${QLINES[curQuest(gid).line].need} crew</div>`;
  else { const q = curQuest(gid), p = qProg(gid); body = `<div class="small"><b>${q.t}</b></div><div class="qbar"><i style="width:${Math.min(100, p.cur / p.goal * 100)}%"></i></div><div class="mut small">${fmt(Math.min(p.cur, p.goal))} / ${fmt(p.goal)}${g.rep ? ` · ${S.stats.leo || 0} done` : ` · ${qLabel(gid)}`}</div>`; }
  return `<div class="giver ${st === 'locked' ? 'dim' : ''}" style="--gc:${g.col}"><img src="${npcPortrait(gid)}" alt=""><div class="it"><div class="dn"><b>${g.n}</b><span class="mut small">${g.role}</span></div>${body}</div>
    ${st === 'locked' || st === 'wait' ? '' : `<button class="btn sm ${st === 'ready' ? 'primary' : ''}" onclick="goTo(${g.x},${g.y + 30})"><span>${st === 'ready' ? 'Claim' : 'Go'}</span></button>`}</div>`;
}
function pQuests() {
  let h = `<div class="ph"><h2>Quests</h2></div><p class="mut small">Quest givers live on the mountain. Walk up to them to talk and claim rewards.</p>`;
  h += `<h3>Story</h3>` + Object.keys(GIVERS).map(giverRow).join('');
  h += `<h3>Endless</h3><p class="mut small">The Old Snow Leopard Lady never runs out of favours. Each one gives a little fruit and a permanent boost: +1% gathering in that quest's field, or +0.5% to that color.</p>` + Object.keys(REPEAT).map(giverRow).join('');
  return h;
}
const gliderOf = id => GLIDERS.find(g => g.id === id);
function updateTalk() {
  const t = $('talk');
  if (!nearNpc) { t.classList.remove('on'); return; }
  if (nearNpc === 'tihar') { t.innerHTML = `<span class="gl" style="background:#fff1dc;color:#ff9f1a">${ic('marigold')}</span><span><small>Festival</small>Tihar Stall</span>`; t.classList.add('on'); return; }
  if (nearNpc === 'blender') { t.innerHTML = `<span class="gl">${ic('blender')}</span><span><small>Machine</small>Blender</span>`; t.classList.add('on'); return; }
  if (nearNpc === 'mandala') { t.innerHTML = `<span class="gl" style="background:#f3edff;color:#9b6ef3">${ic('wheel')}</span><span><small>Generator</small>Mandala Shrine</span>`; t.classList.add('on'); return; }
  if (nearNpc.startsWith('shop:')) { const sh = SHOPS.find(q => 'shop:' + q.id === nearNpc); t.innerHTML = `<span class="gl" style="background:${sh.col}22;color:${sh.col}">${ic('shop')}</span><span><small>Shop</small>${sh.n}</span>`; t.classList.add('on'); return; }
  if (gliderOf(nearNpc)) { t.innerHTML = `<span class="gl">${ic('wind')}</span><span><small>Glider pad</small>Fly somewhere</span>`; t.classList.add('on'); return; }
  const g = npcOf(nearNpc), st = giverState(nearNpc);
  t.innerHTML = `<img src="${npcPortrait(nearNpc)}" alt=""><span><small>${g.role}</small>Talk to ${g.n}</span>${st === 'ready' ? `<b class="dotg"></b>` : ''}`;
  t.classList.add('on');
}
function gliderMenu(id) {
  const here = gliderOf(id), ok = S.crew.length >= GLIDE_GATE;
  let h = `<div class="big-ico">${ic('wind')}</div><h2>Glider pad</h2><p class="mut small">${ok ? 'Pick a pad to fly to. You can only land in zones you have unlocked.' : `The glider network opens at ${GLIDE_GATE} crew. You have ${S.crew.length}.`}</p>`;
  if (ok) h += GLIDERS.filter(g => g.id !== id).map(g => { const open = zoneOpen(g.z); return `<div class="item ${open ? '' : 'dim'}">${ib(open ? 'wind' : 'lock', open ? '#2ea4dc' : '#9aa0ad')}<div class="it"><b>${ZONES[g.z].n}</b><span class="mut small">${open ? ZONES[g.z].alt : ZONES[g.z].gate + ' crew needed'}</span></div>${open ? `<button class="btn sm primary" onclick="closeModal();glideTo('${g.id}')"><span>Fly</span></button>` : ''}</div>`; }).join('');
  h += `<button class="btn" onclick="closeModal()"><span>Close</span></button>`;
  showModal(h);
}
function talk(gid) {
  gid = gid || nearNpc; if (!gid) return;
  if (gid === 'tihar') { openPanel('tihar', 'x'); return; }
  if (gid === 'blender') { openPanel('blender', 'x'); return; }
  if (gid === 'mandala') { panelTab = null; openPanel('mandala', 'x'); return; }
  if (gid.startsWith('shop:')) { openShop(gid.slice(5)); return; }
  if (gliderOf(gid)) { gliderMenu(gid); return; }
  const g = npcOf(gid), st = giverState(gid);
  let h = `<div class="npc-head" style="--gc:${g.col}"><img src="${npcPortrait(gid)}" alt=""></div><h2>${g.n}</h2><div class="mut small">${g.role}</div>`;
  if (st === 'locked') { h += `<p class="say">"Come back when your crew is bigger. I only deal with teahouses of ${g.gate} or more."</p><button class="btn primary" onclick="closeModal()"><span>Okay</span></button>`; showModal(h); return; }
  if (st === 'wait') { const ln = QLINES[curQuest(gid).line]; h += `<p class="say">"You finished everything I had for now! The ${ln.n.toLowerCase()} starts once your teahouse has ${ln.need} crew. You have ${S.crew.length}."</p><button class="btn primary" onclick="closeModal()"><span>Okay</span></button>`; showModal(h); return; }
  if (st === 'cooldown') { h += `<p class="say">"Thanks again! I'll have another job for you in ${mmss(rq(gid).cd - Date.now())}."</p><button class="btn primary" onclick="closeModal()"><span>See you</span></button>`; showModal(h); return; }
  const q = curQuest(gid), p = qProg(gid);
  if (!q) { h += `<p class="say">"You have done everything I asked. The mountain smiles on you."</p><button class="btn primary" onclick="closeModal()"><span>Thank you</span></button>`; showModal(h); return; }
  const done = p.cur >= p.goal, needBed = q.rw.crew && S.crew.length >= S.beds, first = !g.rep && (S.q[gid] || 0) === 0;
  const line = [first || g.rep ? g.hi : '', done ? 'You did it! Here is your reward.' : g.rep ? '' : 'Can you help me with something?'].filter(Boolean).join(' ');
  h += `<p class="say">"${line}"</p>
    <div class="quest"><div class="qn">${g.rep ? `Favour ${(S.stats.leo || 0) + 1}` : qLabel(gid)}</div><h3>${q.t}</h3>
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
  for (const k in q.rw.perm || {}) S.perm[k] = (S.perm[k] || 0) + q.rw.perm[k];
  for (const k in q.rw.fperm || {}) S.fperm[k] = (S.fperm[k] || 0) + q.rw.fperm[k];
  if (q.rw.perm) rebuildCrew();
  if (REPEAT[gid]) { S.rq[gid].cd = Date.now() + 1; S.stats.leo = (S.stats.leo || 0) + 1; }
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
          <div class="small">${d.ab ? `<b>${ABIL[d.ab].n}</b> ${info('ab', d.ab)}` : d.pas ? `Passive ${info('cp', id)}` : 'No ability. Pure hard work.'}</div>
          <div class="mut small">Favorite: ${FOOD[d.fav].n} · Blessed: +${d.bp[1]}% ${STATN[d.bp[0]]}</div></div></div>`;
      });
    });
  }
  if (t === 'syn') {
    h += `<p class="mut small">Synergies switch on automatically when the right crew live in your teahouse. ${D.syn.size} of ${SYN.length} active.</p>`;
    h += SYN.map(s => `<div class="syn ${D.syn.has(s.id) ? 'on' : ''}">${ib(s.i, D.syn.has(s.id) ? '#4cb782' : '#9aa0ad')}<div><div class="dn"><b>${s.n}</b>${D.syn.has(s.id) ? `<span class="tag ok">${ic('check')}Active</span>` : ''}</div><div class="small"><span class="mut">Needs</span> ${s.req} ${info('syn', s.id)}</div></div></div>`).join('');
  }
  if (t === 'colors') {
    h += `<p class="mut small">When at least half of your crew (8+ crew) share a color, your teahouse takes that color. Each one plays differently.</p>` + hiveBox();
    h += Object.entries(HIVE).map(([k, v]) => `<div class="syn ${D.hive === k ? 'on' : ''}">${ib(v.i, icol(v.i))}<div><b>${v.n}</b> ${info('hive', k)}</div></div>`).join('');
    h += `<p class="mut small">Crew gather x1.5 on tiles of their own color. Neutral crew get x1.15 everywhere.</p>`;
  }
  return h;
}

/* ---------------- MAP ---------------- */
function pMap() {
  let h = `<div class="ph"><h2>World map</h2></div><p class="mut small">Tap anywhere on the map to walk there. Gliders fly you between unlocked zones (10+ crew).</p>`;
  h += `<div class="wmap"><canvas id="wmap"></canvas></div>`;
  h += `<div class="legend"><span>${ic('home')}Teahouse</span><span class="lg-npc"><i></i>Quest giver</span><span>${ic('wind')}Glider</span><span>${ic('lock')}Locked gate</span><span class="lg-you"><i></i>You</span></div>`;
  h += `<h3>Zones</h3>` + ZONES.map((z, i) => `<div class="item ${zoneOpen(i) ? '' : 'dim'}">${ib(zoneOpen(i) ? 'mountain' : 'lock', zoneOpen(i) ? '#3fae6b' : '#9aa0ad')}<div class="it"><b>${z.n} <span class="mut">${z.alt}</span></b><span class="mut small">${FIELDS.filter(f => f.z === i).map(f => f.n).join(', ')}${zoneOpen(i) ? '' : ' · ' + z.gate + ' crew needed'}</span></div></div>`).join('');
  setTimeout(drawWorldMap, 0);
  return h;
}
function drawWorldMap() {
  const cv = $('wmap'); if (!cv) return;
  const W = cv.parentElement.clientWidth, sc = W / WORLD.w, H = WORLD.h * sc, dpr = Math.min(2.5, devicePixelRatio || 1);
  cv.width = W * dpr; cv.height = H * dpr; cv.style.width = W + 'px'; cv.style.height = H + 'px';
  const c = cv.getContext('2d'); c.scale(dpr * sc, dpr * sc);
  const ZC = ['#e3efd9', '#d8e9cf', '#e6e8d6', '#eceff3', '#f7f8fb'];
  ZONES.forEach((z, i) => { const y0 = i === ZONES.length - 1 ? 0 : ZONES[i].top, y1 = i === 0 ? WORLD.h : ZONES[i - 1].top; c.fillStyle = ZC[i] || ZC[4]; c.fillRect(0, y0, WORLD.w, y1 - y0); });
  c.lineCap = 'round'; c.lineJoin = 'round'; P(c); PATHPTS.forEach(([x, y], i) => i ? c.lineTo(x, y) : c.moveTo(x, y)); c.strokeStyle = '#d9cbb4'; c.lineWidth = 26; c.stroke();
  for (const f of FIELDS) {
    const open = fieldOpen(FIELDS.indexOf(f)), col = f.c === 'mix' ? '#9b6ef3' : f.c === 'cloud' ? '#8e9bd6' : COL[f.c].c;
    P(c); c.roundRect(f.x, f.yy, f.w, f.h, 40); c.fillStyle = open ? '#ffffff' : '#e4e4e8'; c.fill(); c.strokeStyle = open ? '#cfd3da' : '#d6d6dc'; c.lineWidth = 6; c.stroke();
    if (open) { P(c); c.arc(f.x + 52, f.yy + 52, 22, 0, TAU); c.fillStyle = col; c.fill(); }
    c.fillStyle = open ? '#3b3443' : '#9a9aa4'; c.font = '700 58px -apple-system,system-ui,sans-serif'; c.textAlign = 'center'; c.fillText(f.n, f.x + f.w / 2, f.yy + f.h / 2 + 10);
    c.font = '600 46px -apple-system,system-ui,sans-serif'; c.fillStyle = '#9a96a3'; c.fillText(open ? `Lv ${f.lv[0]}${f.lv[1] > f.lv[0] ? '-' + f.lv[1] : ''}` : `${f.gate} crew`, f.x + f.w / 2, f.yy + f.h / 2 + 70);
  }
  ZONES.forEach((z, i) => { if (!i) return; const y = ZONES[i - 1].top; c.setLineDash([30, 26]); P(c); c.moveTo(0, y); c.lineTo(WORLD.w, y); c.strokeStyle = zoneOpen(i) ? 'rgba(59,52,67,.18)' : 'rgba(59,52,67,.4)'; c.lineWidth = 6; c.stroke(); c.setLineDash([]); });
  const dot = (x, y, r, fill, icon) => { P(c); c.arc(x, y, r, 0, TAU); c.fillStyle = fill; c.fill(); if (icon) drawIcon(c, icon, x, y, r * 1.15, '#fff', 3); };
  dot(HOUSE.x, HOUSE.y, 58, '#3b3443', 'home');
  for (const g of GLIDERS) dot(g.x, g.y, 40, '#8a8794', 'wind');
  for (const g of GATES) if (!zoneOpen(g.z)) dot(g.x, g.y, 40, '#b7b4bd', 'lock');
  const all = NPCS(); for (const id in all) dot(all[id].x, all[id].y, 26, npcLocked(id) ? '#c9c7cf' : '#8a8794');
  P(c); c.arc(player.x, player.y, 52, 0, TAU); c.fillStyle = '#ff8a3d'; c.fill(); c.strokeStyle = '#ffffff'; c.lineWidth = 14; c.stroke();
  cv.onclick = ev => { const r = cv.getBoundingClientRect(); goTo((ev.clientX - r.left) / sc, (ev.clientY - r.top) / sc); };
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
  try { localStorage.removeItem(slotKey()); } catch (e) {}
  S = null; location.reload();
}
function pSettings() {
  const st = { idle: 'Tap to check for a newer version.', checking: 'Checking…', latest: 'You have the latest version.', available: `Version ${upd.remote} is available.`, offline: 'No connection. Try again when you have signal.', updating: 'Updating…' }[upd.state];
  let h = `<div class="ph"><h2>Settings</h2></div>`;
  h += `<div class="item">${ib('refresh', upd.state === 'available' ? '#3fae6b' : '#2ea4dc')}<div class="it"><b>App version ${VERSION}</b><span class="mut small">${st}</span></div></div>`;
  h += `<div class="row2"><button class="btn" onclick="checkUpdate()">${ic('refresh')}<span>Check for update</span></button>
    <button class="btn primary" onclick="forceUpdate()">${ic('download')}<span>Update now</span><small>Reloads the latest version</small></button></div>`;
  h += `<p class="mut small">Your progress is saved on this phone and stays when you update.</p>`;
  h += `<h3>Profiles</h3><p class="mut small">Three separate saves. Switching keeps your other progress safe.</p>`;
  for (let n = 1; n <= 3; n++) {
    const cur = n === curSlot();
    let d = cur ? S : null; if (!cur) try { d = JSON.parse(localStorage.getItem(slotKey(n))); } catch (e) {}
    h += `<div class="item ${cur ? 'eq' : ''}">${ib('crew', cur ? '#ff8a3d' : '#9aa0ad')}<div class="it"><b>Profile ${n}</b><span class="mut small">${d ? `${d.crew.length} crew · ${fmt(d.stats.earn)} rupees earned` : 'Empty. Start fresh.'}</span></div>${cur ? '<span class="tag">Playing</span>' : `<button class="btn sm" onclick="switchProfile(${n})"><span>${d ? 'Play' : 'Start'}</span></button>`}</div>`;
  }
  h += `<h3>Test builds</h3><p class="mut small">Temporary maxed profiles for testing each color: 50 crew at level 20, best gear, best mandala. Rebuilt fresh every time you tap.</p><div class="row3">${[['spice', 7], ['ice', 8], ['cloud', 9]].map(([c2, n]) => `<button class="btn" onclick="testProfile('${c2}',${n})">${ic(COL[c2].i)}<span>${COL[c2].n}</span></button>`).join('')}</div>`;
  if (curSlot() >= 7) h += `<div class="item eq">${ib('star', '#9b6ef3')}<div class="it"><b>Playing a test build</b></div><button class="btn sm" onclick="switchProfile(1)"><span>Back to Profile 1</span></button></div>`;
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
  { const rdy = BADGES.filter(b => badgeReady(b)).length, got = Object.values(S.badges).reduce((a, b) => a + b, 0);
    h += `<div class="item gear">${ib('badge', '#f0b429')}<div class="it"><b>Badges</b><span class="mut small">${got} of ${BADGES.length * 5} tiers earned. Field badges boost their own field.</span></div><button class="btn sm ${rdy ? 'primary' : ''}" onclick="openPanel('badges','x')"><span>${rdy ? rdy + ' ready' : 'Open'}</span></button></div>`; }
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
    ${tile('gift', '#c8913e', 'Leopard favours', fmt(st.leo || 0))}</div>`;
  return h;
}

function buySprinkler() { const c = sprCountCost(S.spr.n); if (S.rp < c || S.spr.n >= SPR_MAX) return; spend(c); S.spr.n++; toast(`Sprinkler ${S.spr.n} bought. Stand in a field and tap Place`, 'drop'); save(); renderPanel(); }
function upgradeSprinkler() { const c = sprLevelCost(S.spr.lv); if (S.rp < c || !SPRINKLERS[S.spr.lv + 1]) return; spend(c); S.spr.lv++; refreshWet(); toast(`Upgraded to ${SPRINKLERS[S.spr.lv].n}`, 'drop'); save(); renderPanel(); }
let tipT = null, popT = null;
const slotAt = (x, y) => [...document.querySelectorAll('.hslot')].find(s2 => { const r = s2.getBoundingClientRect(); return x >= r.left - 4 && x <= r.right + 4 && y >= r.top - 14 && y <= r.bottom + 10; });
/* small popover anchored to a chip or gear button */
function showPop(el, html, above) {
  const p = $('pop'), r = el.getBoundingClientRect();
  p.innerHTML = html; p.className = 'on ' + (above ? 'up' : 'down');
  const w = p.offsetWidth, x = Math.max(8, Math.min(innerWidth - w - 8, r.left + r.width / 2 - w / 2));
  p.style.left = x + 'px'; p.style.setProperty('--ax', (r.left + r.width / 2 - x) + 'px');
  if (above) { p.style.top = ''; p.style.bottom = (innerHeight - r.top + 8) + 'px'; } else { p.style.bottom = ''; p.style.top = (r.bottom + 8) + 'px'; }
  clearTimeout(popT); popT = setTimeout(hidePop, 4500);
}
function hidePop() { $('pop').className = ''; }
function buffTip(k, el) {
  el = el || document.querySelector(`[data-b="${k}"]`); if (!el) return;
  if (k === 'poles') { showPop(el, `<b>Prayer flags</b><span>${E.poles.length} poles up. ${E.sacred ? 'You can tie a new shape when the current sacred ground fades.' : E.poles.length >= 3 ? 'Walk to the glowing first pole to tie the flags into sacred ground.' : 'Cloud abilities plant poles. With 3 or more, walk to the glowing first pole to tie them into sacred ground.'}</span>`); return; }
  if (k === 'sacred') { showPop(el, `<b>Sacred ground</b><span>Flowers inside count +${E.sacred.lv} level and Cloud flowers gather x1.5.</span>`); return; }
  if (k === 'glaciercount') { const cdl = Math.ceil(((S.popCd || 0) - Date.now()) / 1000); showPop(el, `<b>Glacier Star</b><span>${cdl > 0 ? `Cooling down for ${cdl}s.` : `${S.blueN || 0}/45 Ice Boost bubbles collected.`}</span>`); return; }
  if (k === 'guidecount') { showPop(el, `<b>Wayfinder Star</b><span>${S.pilgrim ? `${FIELDS[S.pilgrim.f].n} gathers x2.5 for ${Math.ceil((S.pilgrim.until - Date.now()) / 60000)} more minutes.` : `${S.guideN || 0}/250 boost bubbles collected.`}</span>`); return; }
  if (k === 'sawcount') { showPop(el, `<b>Chakra Saw</b><span>${S.sawN}/3 Marigolds used. Use ${3 - S.sawN} more within ${Math.max(0, Math.ceil(20 - (now - S.sawLast)))}s.</span>`); return; }
  if (k === 'frostmark') { const fl = frostAt(player.x, player.y); showPop(el, `<b>Frost Mark level ${fl}</b><span>Ice flowers here are gathered at x${FROST_MUL[fl]}.</span>`); return; }
  const b = BUFFS[k]; if (!b || !B[k]) return;
  showPop(el, `<b>${b.n}${B[k].st > 1 ? ' x' + Math.floor(B[k].st) : ''}</b><span>${b.d}</span>${B[k].perm ? '' : `<small>${Math.ceil(B[k].t)}s left</small>`}`);
}
function pasTip(id, el) {
  el = el || document.querySelector(`[data-p="${id}"]`); if (!el) return;
  const p = PASSIVES[id];
  showPop(el, `<b>${p.n}</b><span>${p.d}</span><small>${S.pas[id] || 0} / ${p.need} charged · counts ${p.col !== 'any' ? COL[p.col].n + ' abilities' : 'every ability'}</small>`);
}
function equippedSlots() { return [['tool', tool()], ['doko', doko()], ['hat', HEADGEAR.find(h => h.id === S.hat)], ['boots', BOOTS.find(b2 => b2.id === S.boots)]].filter(([, it]) => it); }
function gearPop(el) {
  const k = el.dataset.g, it = equippedSlots().find(([k2]) => k2 === k)[1];
  const st = gearStats(k, it), kind = { tool: 'Tool', doko: 'Bag', hat: 'Hat', boots: 'Boots' }[k];
  showPop(el, `<b>${it.n}</b><small>${kind}</small><div class="pst">${st.map(x => `<i>${x}</i>`).join('')}</div>${it.pas ? `<span><b>${PASSIVES[it.pas].n}:</b> ${PASSIVES[it.pas].d}</span>` : ''}`, true);
}

function switchProfile(n) { save(); S = null; try { localStorage.setItem('chiya_slot', String(n)); } catch (e) {} location.reload(); }

/* ---------------- MANDALA ---------------- */
const blessedCount = () => S.crew.filter(m => m.bl).length;
const pct = v => (v * 100).toFixed(v < .1 ? 1 : 0) + '%';
function mandalaCard(m, label) {
  const tr = MANDALA_TIERS.find(q => q.id === m.tier);
  return `<div class="mcardm" style="--tc:${tr.col}"><div class="mart">${ic('wheel')}</div><div class="it"><div class="dn"><b>${tr.n}</b>${label ? `<span class="tag">${label}</span>` : ''}</div>
    <div class="mlines">${m.lines.map(([k, v]) => `<span>+${pct(v)} ${STATN2[k]}</span>`).join('')}</div>
    ${m.pas.map(p => `<div class="pas">${ic('star')}<span><b>${MANDALA_PAS[p].n}</b> ${info('mp', p)}</span></div>`).join('')}</div></div>`;
}
function pMandala() {
  const bl = blessedCount();
  let h = `<div class="ph"><h2>Mandala Shrine</h2><span class="pill">${ic('star')}${bl} Blessed</span></div>`;
  h += `<p class="mut small">Generate a mandala with random bonuses. Each tier costs rupees and needs more Blessed crew. You choose whether to keep the new one.</p>`;
  if (S.charmRefund) { h += `<div class="item eq">${ib('coin', '#ff8a3d')}<div class="it"><b>Charms were retired</b><span class="mut small">You got ${fmt(S.charmRefund)} rupees back for the charms you owned.</span></div></div>`; S.charmRefund = 0; }
  h += S.mandala ? mandalaCard(S.mandala, 'Current') : '<p class="mut small">You have no mandala yet.</p>';
  h += `<h3>Generate</h3>` + MANDALA_TIERS.map((tr, i) => {
    const okBl = bl >= tr.bl, ok = okBl && S.rp >= tr.cost, ok2 = okBl && S.rp >= tr.cost * 10;
    return `<div class="item gear"><span class="ib" style="--c:${tr.col}">${ic('wheel')}</span><div class="it"><b>${tr.n}</b><span class="mut small">${tr.lines} bonus lines${tr.star ? ' + a star passive' : ''} · needs ${tr.bl} Blessed</span>
      <div class="req"><span class="${okBl ? 'ok' : 'no'}">${ic('star')}${Math.min(bl, tr.bl)}/${tr.bl} Blessed</span></div></div>
      <div class="buyrow col"><button class="btn sm primary" ${ok ? '' : 'disabled'} onclick="genMandala(${i})">${money(tr.cost)}</button>${tr.star ? `<button class="btn sm gold" ${ok2 ? '' : 'disabled'} onclick="genMandala(${i},true)"><span>Double</span>${money(tr.cost * 10)}</button>` : ''}</div></div>`;
  }).join('');
  h += `<p class="mut small">Celestial rolls one of six stars. Double costs 10x and always gives one main star plus one side star.</p><h3>Star passives</h3>` + Object.entries(MANDALA_PAS).map(([id, p]) => `<div class="syn">${ib('star', p.col === 'any' ? '#9b6ef3' : TOKEN_COL[p.col])}<div><b>${p.n}</b> <span class="mut small">${p.main ? 'Main · ' + COL[p.col].n : 'Side'}</span> ${info('mp', id)}</div></div>`).join('');
  return h;
}
function rollMandala(i, dbl) {
  const tr = MANDALA_TIERS[i], pool = MANDALA_STATS.slice().sort(() => Math.random() - .5).slice(0, tr.lines);
  const lines = pool.map(([k, a, b]) => [k, Math.round((a + Math.random() * (b - a)) * tr.mul * 1000) / 1000]);
  const ids = Object.keys(MANDALA_PAS), mains = ids.filter(p => MANDALA_PAS[p].main), sides = ids.filter(p => !MANDALA_PAS[p].main);
  const pas = !tr.star ? [] : dbl ? [pick(mains), pick(sides)] : [pick(ids)];
  return { tier: tr.id, lines, pas };
}
let pendingMandala = null;
function genMandala(i, dbl) {
  const tr = MANDALA_TIERS[i], cost = tr.cost * (dbl ? 10 : 1);
  if (blessedCount() < tr.bl || S.rp < cost) return;
  spend(cost);
  pendingMandala = rollMandala(i, dbl); S.stats.mandalas = (S.stats.mandalas || 0) + 1; save();
  showModal(`<div class="reveal" style="--rc:${tr.col}"><div class="burst"></div><div class="mbig" style="--tc:${tr.col}">${ic('wheel')}</div></div><h2>${tr.n}</h2>${pendingMandala.pas.length > 1 ? '<div class="new">Double passive</div>' : ''}
    ${mandalaCard(pendingMandala, 'New')}${S.mandala ? mandalaCard(S.mandala, 'Current') : ''}
    <div class="row2"><button class="btn primary" onclick="keepMandala(true)"><span>Keep new</span></button><button class="btn" onclick="keepMandala(false)"><span>${S.mandala ? 'Keep current' : 'Discard'}</span></button></div>`);
}
function keepMandala(yes) { if (yes && pendingMandala) { S.mandala = pendingMandala; S.butter = 0; recompute(); toast('Mandala equipped', 'wheel'); } pendingMandala = null; closeModal(); save(); if (panel) renderPanel(); }

/* ---------------- BLENDER ---------------- */
const canBlend = (b, n = 1) => Object.entries(b.req).every(([k, q]) => (S.items[k] || 0) >= q * n);
function pBlender() {
  let h = `<div class="ph"><h2>Blender</h2></div><p class="mut small">Blend fruit and treats into boosts. Fruit drops while you gather: Chili from red flowers, Glacier Berries from blue, Mustang Apples from white, and Walnuts higher up.</p>`;
  h += `<div class="fruits">${Object.keys(FRUITS).map(k => `<span>${ib(ITEMS[k].i, icol(ITEMS[k].i))}<b>${S.items[k] || 0}</b></span>`).join('')}</div>`;
  h += BLENDS.map((b, i) => { const it = ITEMS[b.out]; return `<div class="item gear">${ib(it.i, icol(it.i))}<div class="it"><b>${it.n} <span class="mut">x${S.items[b.out] || 0}</span> ${info('it', b.out)}</b>
    <div class="req">${Object.entries(b.req).map(([k, q]) => `<span class="${(S.items[k] || 0) >= q ? 'ok' : 'no'}">${ic(ITEMS[k].i)}${Math.min(S.items[k] || 0, q)}/${q} ${ITEMS[k].n}</span>`).join('')}</div></div>
    <div class="buyrow col"><button class="btn sm primary" ${canBlend(b) ? '' : 'disabled'} onclick="blend(${i},1)"><span>Blend</span></button><button class="btn sm" ${canBlend(b, 5) ? '' : 'disabled'} onclick="blend(${i},5)"><span>x5</span></button></div></div>`; }).join('');
  return h;
}
function blend(i, n) {
  const b = BLENDS[i]; if (!canBlend(b, n)) return;
  for (const k in b.req) S.items[k] -= b.req[k] * n;
  S.items[b.out] = (S.items[b.out] || 0) + n; S.stats.blends = (S.stats.blends || 0) + n;
  burst(BLENDER.x, BLENDER.y - 80, 24, { type: 'star', col: '#bfe6ff', spd: 120, life: .8, size: 2.4 });
  toast(`+${n} ${ITEMS[b.out].n}`, ITEMS[b.out].i); save(); renderPanel();
}

/* ---------------- BADGES ---------------- */
const badgeTier = b => S.badges[b.id] || 0;
const badgeReady = b => badgeTier(b) < 5 && b.get() >= b.t[badgeTier(b)];
const bfmt = (b, v) => b.unit ? (v < 10 ? v.toFixed(1) : Math.floor(v)) + b.unit : fmt(v);
function pBadges() {
  const tot = Object.values(S.badges).reduce((a, b) => a + b, 0);
  let h = `<div class="ph"><h2>Badges</h2><span class="pill">${ic('badge')}${tot} tiers</span></div><p class="mut small">Every badge has five tiers: Bronze, Silver, Gold, Diamond and Himalayan. Each tier gives items. Field badges also add +4% gathering in their field per tier.</p>`;
  const row = b => { const tr = badgeTier(b), v = b.get(), done = tr >= 5, goal = done ? b.t[4] : b.t[tr], col = tr ? BADGE_T[tr - 1].c : '#c9c3cf';
    return `<div class="item gear badge ${tr ? 'tier' : ''}" style="--bc:${col}">${ib(b.i, tr ? '#ffffff' : col)}<div class="it"><b>${b.n} <span class="mut small">${tr ? BADGE_T[tr - 1].n : 'Not started'}</span></b>
      <div class="bdots">${BADGE_T.map((t, i) => `<i style="background:${i < tr ? t.c : '#ece7f0'}"></i>`).join('')}</div>
      ${done ? '<span class="mut small">Complete</span>' : `<div class="qbar"><i style="width:${Math.min(100, v / goal * 100)}%;background:${BADGE_T[tr].c}"></i></div><span class="mut small">${bfmt(b, Math.min(v, goal))} / ${bfmt(b, goal)} for ${BADGE_T[tr].n}: ${rwText({ items: BADGE_RW[tr] })}</span>`}</div>
      ${badgeReady(b) ? `<button class="btn sm primary" onclick="claimBadge('${b.id}')"><span>Claim</span></button>` : ''}</div>`; };
  const sorted = [...BADGES].sort((a, b) => badgeReady(b) - badgeReady(a));
  h += sorted.map(row).join('');
  return h;
}
function claimBadge(id) {
  const b = BADGES.find(x => x.id === id); if (!b || !badgeReady(b)) return;
  const tr = badgeTier(b); S.badges[id] = tr + 1;
  for (const k in BADGE_RW[tr]) S.items[k] = (S.items[k] || 0) + BADGE_RW[tr][k];
  rebuildCrew(); toast(`${BADGE_T[tr].n} ${b.n} badge`, 'badge'); save(); renderPanel();
}

/* ---------------- TIHAR ---------------- */
function pTihar() {
  const clk = (S.nightClock || 0) % NIGHT_EVERY, night = isNight(), left = night ? NIGHT_EVERY - clk : NIGHT_EVERY - NIGHT_LEN - clk;
  let h = `<div class="ph"><h2>Tihar Stall</h2><span class="pill">${ic('marigold')}${fmt(S.items.marigold || 0)}</span></div>
    <p class="mut small">Every 10 minutes the mountain goes dark for a Diyo Night, and one great lantern appears in a random field (lower fields more often). Gather right next to it to light it: higher fields take far more but give more Marigolds, from 1 in the Tea Garden up to 10 on the Summit. Some nights a stray dog wanders in: gather near it until it trusts you for a Kukur Tilak. Five tilaks and 40 Marigolds buy the Marigold Garland for the Tihar Dog.</p>
    <div class="item gear">${ib('paw', '#e5484d')}<div class="it"><b>Kukur Tilak ${S.items.tilak || 0}/${TILAK_NEED}</b><span class="mut small">${E.stray && E.stray.on ? `A stray is in ${FIELDS[E.stray.fi].n} right now` : 'Strays show up on about 2 nights in 5'}</span></div></div>
    <div class="item gear">${ib('diya', '#ff9f1a')}<div class="it"><b>${night ? 'Diyo Night is on' : 'Next Diyo Night'}</b><span class="mut small">${night ? `Ends in ${mmss(left * 1000)}` : `Starts in ${mmss(left * 1000)}`}</span></div></div><h3>Festival goods</h3>`;
  h += TIHAR_SHOP.map((g, i) => { const it = ITEMS[g.k], ok = (S.items.marigold || 0) >= g.p && (S.items.tilak || 0) >= (g.tilak || 0);
    return `<div class="item gear">${ib(it.i, icol(it.i))}<div class="it"><b>${it.n} <span class="mut">x${S.items[g.k] || 0}</span> ${info('it', g.k)}</b></div>
      <button class="btn sm ${ok ? 'primary' : ''}" ${ok ? '' : 'disabled'} onclick="buyTihar(${i})">${ic('marigold')}<span>${fmt(g.p)}${g.tilak ? ' + ' + g.tilak + ' tilak' : ''}</span></button></div>`; }).join('');
  return h;
}
function buyTihar(i) {
  const g = TIHAR_SHOP[i]; if ((S.items.marigold || 0) < g.p || (S.items.tilak || 0) < (g.tilak || 0)) return;
  S.items.marigold -= g.p; if (g.tilak) S.items.tilak -= g.tilak; S.items[g.k] = (S.items[g.k] || 0) + 1;
  if (g.k === 'mysticWheel') S.wheels++;
  toast(`+1 ${ITEMS[g.k].n}`, ITEMS[g.k].i); save(); renderPanel();
}

/* ---------------- TEST BUILDS (best composition per color) ---------------- */
const TEST_BUILDS = {
  spice: { crew: { danphe: 10, gurkha: 9, rhodoSpirit: 8, chiliCook: 6, gingerFarmer: 3, fireKid: 2, littleMonk: 4, lama: 2, sherpa: 2, ropeFixer: 2, bear: 1, monk: 1 },
           tool: 'talon', doko: 'kiln', hat: 'emberCrown', stars: ['blazingStar', 'starSaw'], lines: [['spice', .6], ['crit', .15], ['conv', .15], ['tool', .6], ['cap', .6], ['cdr', .25]], field: 'ember' },
  ice:   { crew: { naga: 7, yeti: 7, skyLantern: 10, iceClimber: 5, iceFisher: 5, glacierGuide: 3, littleMonk: 4, lama: 2, sherpa: 2, ropeFixer: 2, bear: 1, monk: 2 },
           tool: 'scythe', doko: 'vault', hat: 'frostCrown', stars: ['glacierStar', 'starShower'], lines: [['ice', .6], ['crit', .15], ['conv', .15], ['tool', .6], ['cap', .6], ['cdr', .25]], field: 'frost' },
  cloud: { crew: { leopard: 9, mistYak: 9, snowLion: 4, littleMonk: 6, woolSpinner: 5, yakKing: 3, teaMaster: 2, lama: 2, sherpa: 2, ropeFixer: 2, bear: 1, teaPicker: 5 },
           tool: 'fan', doko: 'nimbus', hat: 'cloudCrown', stars: ['butterStar', 'starShower'], lines: [['cloud', .6], ['crit', .15], ['conv', .15], ['tool', .6], ['cap', .6], ['cdr', .25]], field: 'flags' }
};
function buildTestSave(col) {
  const b = TEST_BUILDS[col], s2 = newSave();
  s2.beds = 50; s2.crew = [];
  for (const id in b.crew) for (let k = 0; k < b.crew[id]; k++) { const m = mk(id, CREW[id].r !== 'event'); m.lvl = 20; s2.crew.push(m); }
  s2.rp = 1e12; s2.tools = TOOLS.map(t => t.id); s2.tool = b.tool; s2.dokos = DOKOS.map(d => d.id); s2.dokoId = b.doko; s2.bootsOwned = BOOTS.map(x => x.id); s2.boots = 'wind';
  s2.hats = HEADGEAR.map(x => x.id); s2.hat = b.hat; s2.lodge = LODGE.length - 1;
  s2.mandala = { tier: 'celestial', lines: b.lines, pas: b.stars };
  s2.spr = { n: SPR_MAX, lv: SPRINKLERS.length - 1, placed: [] };
  s2.items = {}; for (const k in ITEMS) s2.items[k] = 500; s2.hotbar = ['marigold', 'butterTea', 'spiceShot', 'glacierShard', 'yakCheese', 'incense', 'lotusSeed'];
  s2.found = {}; for (const id of CREW_IDS) s2.found[id] = true;
  s2.q = { didi: 48, pemba: 99, dolma: 99, norbu: 99, yeti: 99, prof: 0 }; s2.qv = 2; s2.bv = 2; s2.hiveBal = 0; s2.hiveBalTot = 0; s2.blueN = 0; s2.popCd = 0; s2.perm = {}; s2.fperm = {}; s2.badges = {}; s2.sprouts = [];
  const f = FIELDS.find(x => x.id === b.field); s2.px = f.x + f.w / 2; s2.py = f.yy + f.h / 2; s2.mapv = 2;
  return s2;
}
function testProfile(col, n) {
  save(); try { localStorage.setItem(slotKey(n), JSON.stringify(buildTestSave(col))); localStorage.setItem('chiya_slot', String(n)); } catch (e) {}
  S = null; location.reload();
}
