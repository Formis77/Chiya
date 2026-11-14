'use strict';
/* =========================================================
   CHIYA — game data (crew, abilities, fields, gear, synergies, quests)
   ========================================================= */

const RAR = {
  common:    { n: 'Common',    c: '#b8c1cc', o: 0 },
  rare:      { n: 'Rare',      c: '#5bd68a', o: 1 },
  epic:      { n: 'Epic',      c: '#4fa3ff', o: 2 },
  legendary: { n: 'Legendary', c: '#b67cff', o: 3 },
  mythic:    { n: 'Mythic',    c: '#ffd24a', o: 4 },
  event:     { n: 'Event',     c: '#ff6fa8', o: 5 }
};

const COL = {
  spice:   { n: 'Spice',   c: '#ff6b4a', i: 'flame' },
  ice:     { n: 'Ice',     c: '#4fc3ff', i: 'snow' },
  cloud:   { n: 'Cloud',   c: '#eef2ff', i: 'cloud' },
  neutral: { n: 'Neutral', c: '#d8c3a0', i: 'dot' }
};

const FOOD = {
  momo:    { n: 'Momo',     i: 'momo', xp: 10 },
  selroti: { n: 'Sel Roti', i: 'ring', xp: 40 },
  dalbhat: { n: 'Dal Bhat', i: 'bowl', xp: 200 }
};

/* bp = blessed passive {stat, val%}
   stats: cap, gather, spice, ice, cloud, brew, speed, crit, offline, tool */
const CREW = {
  porter:       { n: 'Porter',              r: 'common',    c: 'neutral', spd: 70,  amt: 3,  gt: 3.2, brew: 4,  fav: 'momo',    bp: ['cap', 10],    tags: ['human'], d: 'The backbone of every expedition. Slow, steady, never complains.' },
  yakCalf:      { n: 'Yak Calf',            r: 'rare',      c: 'cloud',   spd: 75,  amt: 4,  gt: 3.0, brew: 3,  fav: 'selroti', bp: ['cloud', 8],   tags: ['yak'],   d: 'A fluffy baby yak. Counts toward the Herd.' },
  trekker:      { n: 'Trekker',             r: 'rare',      c: 'neutral', spd: 125, amt: 2,  gt: 2.4, brew: 3,  fav: 'dalbhat', bp: ['speed', 6],   tags: ['human'], d: 'Fast on the trail, small loads.' },
  teaPicker:    { n: 'Tea Picker',          r: 'rare',      c: 'cloud',   spd: 85,  amt: 3,  gt: 2.8, brew: 4,  fav: 'momo',    bp: ['cloud', 10],  tags: ['human'], pas: 'Gathers ×1.5 in Cloud fields.', d: 'Nimble fingers, wide straw hat.' },
  gingerFarmer: { n: 'Ginger Farmer',       r: 'rare',      c: 'spice',   spd: 85,  amt: 3,  gt: 3.0, brew: 3,  fav: 'dalbhat', bp: ['spice', 10],  tags: ['human'], ab: 'spiceRush', cd: 18, d: 'Grows the spiciest ginger in the valley.' },
  waterCarrier: { n: 'Water Carrier',       r: 'rare',      c: 'ice',     spd: 80,  amt: 3,  gt: 3.0, brew: 14, fav: 'selroti', bp: ['brew', 8],    tags: ['human'], pas: 'Brews very fast at the teahouse.', d: 'Carries glacier water in a copper gagri.' },
  tourist:      { n: 'Lost Tourist',        r: 'rare',      c: 'neutral', spd: 90,  amt: 2,  gt: 3.5, brew: 2,  fav: 'momo',    bp: ['crit', 3],    tags: ['human'], ab: 'random', cd: 22, d: 'Nobody knows how they got here. Sometimes useless, sometimes a jackpot.' },
  sherpa:       { n: 'Sherpa Guide',        r: 'epic',      c: 'neutral', spd: 110, amt: 5,  gt: 2.6, brew: 6,  fav: 'dalbhat', bp: ['speed', 10],  tags: ['human'], ab: 'haste', cd: 16, d: 'Knows every rock on the mountain.' },
  chiliCook:    { n: 'Chili Cook',          r: 'epic',      c: 'spice',   spd: 90,  amt: 5,  gt: 2.8, brew: 6,  fav: 'momo',    bp: ['spice', 15],  tags: ['human'], ab: 'burst', cd: 14, d: 'Their chili sauce has been banned in three villages.' },
  glacierGuide: { n: 'Glacier Guide',       r: 'epic',      c: 'ice',     spd: 95,  amt: 5,  gt: 2.6, brew: 6,  fav: 'selroti', bp: ['crit', 5],    tags: ['human'], ab: 'focus', cd: 15, d: 'Reads ice like a book.' },
  dzo:          { n: 'Dzo',                 r: 'epic',      c: 'cloud',   spd: 75,  amt: 9,  gt: 4.0, brew: 12, fav: 'selroti', bp: ['cap', 15],    tags: ['yak'],   pas: '+5% doko capacity.', d: 'Half yak, half cow, all muscle.' },
  monk:         { n: 'Monk',                r: 'epic',      c: 'neutral', spd: 80,  amt: 4,  gt: 3.0, brew: 8,  fav: 'dalbhat', bp: ['gather', 8],  tags: ['human'], ab: 'prayerWheel', cd: 20, d: 'Spins the wheel, and the mountain listens.' },
  honeyHunter:  { n: 'Honey Hunter',        r: 'epic',      c: 'spice',   spd: 95,  amt: 5,  gt: 3.0, brew: 5,  fav: 'momo',    bp: ['brew', 10],   tags: ['human'], ab: 'honey', cd: 26, d: 'Climbs cliffs for wild Himalayan honey.' },
  rhodoSpirit:  { n: 'Rhododendron Spirit', r: 'legendary', c: 'spice',   spd: 100, amt: 7,  gt: 2.4, brew: 8,  fav: 'selroti', bp: ['spice', 25],  tags: ['spirit'], ab: 'petalStorm', cd: 22, d: 'The national flower, awake and dancing.' },
  iceClimber:   { n: 'Ice Climber',         r: 'legendary', c: 'ice',     spd: 105, amt: 7,  gt: 2.3, brew: 8,  fav: 'dalbhat', bp: ['ice', 25],    tags: ['human'], ab: 'frostMark', cd: 10, d: 'Two axes, zero fear.' },
  snowLion:     { n: 'Snow Lion',           r: 'legendary', c: 'cloud',   spd: 110, amt: 8,  gt: 2.6, brew: 9,  fav: 'momo',    bp: ['cloud', 25],  tags: ['cat'],   ab: 'roar', cd: 26, d: 'A mythical lion with a turquoise mane.' },
  yakKing:      { n: 'Yak King',            r: 'legendary', c: 'cloud',   spd: 80,  amt: 12, gt: 3.4, brew: 14, fav: 'selroti', bp: ['cap', 25],    tags: ['yak'],   ab: 'caravan', cd: 24, d: 'Ruler of every herd above 4000 m.' },
  lama:         { n: 'Lama',                r: 'legendary', c: 'neutral', spd: 85,  amt: 6,  gt: 2.8, brew: 12, fav: 'dalbhat', bp: ['gather', 15], tags: ['human'], ab: 'blessing', cd: 35, pas: '+3% Blessed chance on recruits.', d: 'Wise, calm, and slightly mischievous.' },
  yeti:         { n: 'Yeti',                r: 'mythic',    c: 'ice',     spd: 100, amt: 14, gt: 2.6, brew: 15, fav: 'momo',    bp: ['ice', 40],    tags: ['beast'], ab: 'footprints', cd: 26, d: 'Real. Very real. And surprisingly gentle.' },
  danphe:       { n: 'Golden Danphe',       r: 'mythic',    c: 'spice',   spd: 140, amt: 12, gt: 2.2, brew: 12, fav: 'selroti', bp: ['spice', 40],  tags: ['bird'],  ab: 'dive', cd: 22, d: 'The rainbow pheasant of Nepal, wreathed in fire.' },
  leopard:      { n: 'Snow Leopard Spirit', r: 'mythic',    c: 'cloud',   spd: 150, amt: 12, gt: 2.2, brew: 12, fav: 'dalbhat', bp: ['cloud', 40],  tags: ['cat'],   ab: 'pounce', cd: 18, d: 'The ghost of the mountains.' },
  tiharDog:     { n: 'Tihar Dog',           r: 'event',     c: 'neutral', spd: 120, amt: 6,  gt: 2.6, brew: 8,  fav: 'momo',    bp: ['offline', 15],tags: ['dog'],   ab: 'sniff', cd: 40, d: 'Honored with marigolds on Kukur Tihar. Good boy.' },
  kiteFlyer:    { n: 'Kite Flyer',          r: 'event',     c: 'neutral', spd: 100, amt: 6,  gt: 2.8, brew: 8,  fav: 'selroti', bp: ['tool', 25],   tags: ['human'], ab: 'gust', cd: 22, d: 'Dashain kite season, all year round.' }
};
const CREW_IDS = Object.keys(CREW);

const ABIL = {
  spiceRush:   { n: 'Spice Rush',    i: 'chili', tok: true,  d: 'Token: +50% Spice gathering for 15s.' },
  random:      { n: 'Wild Card',     i: 'dice', tok: true,  d: 'Token: a random effect. Might be great. Might be a selfie.' },
  haste:       { n: 'Haste',         i: 'speed', tok: true,  d: 'Token: +20% move & crew speed for 10s. Stacks ×3.' },
  burst:       { n: 'Chili Burst',   i: 'burst', tok: true,  d: 'Token: fiery explosion collects every nearby tile ×3.' },
  focus:       { n: 'Focus',         i: 'focus', tok: true,  d: 'Token: +20% crit chance for 12s. Crits ×3.' },
  prayerWheel: { n: 'Prayer Wheel',  i: 'wheel', tok: false, d: 'Auto: a spinning golden wheel. Gathering inside ×2 for 10s.' },
  honey:       { n: 'Wild Honey',    i: 'honey', tok: true,  d: 'Token: instant rupees and a chance of food.' },
  petalStorm:  { n: 'Petal Storm',   i: 'flower', tok: false, d: 'Auto: petals sweep the field and collect 30 tiles ×2.' },
  frostMark:   { n: 'Frost Mark',    i: 'snow', tok: false, d: 'Auto: an icy mark. Tiles near marks ×2 per mark (max 5).' },
  roar:        { n: 'Roar',          i: 'roar', tok: false, d: 'Auto: shockwave. Crew gather 50% faster for 10s.' },
  caravan:     { n: 'Caravan Rush',  i: 'horns', tok: false, d: 'Auto: all yaks gather ×2 and move faster for 12s.' },
  blessing:    { n: 'Blessing',      i: 'sparkle', tok: true,  d: 'Token: +25% to everything for 15s.' },
  footprints:  { n: 'Yeti Steps',    i: 'foot', tok: false, d: 'Auto: six giant stomps across the field, each ×4.' },
  dive:        { n: 'Danphe Dive',   i: 'feather', tok: false, d: 'Auto: a fiery dive collects a whole line ×4.' },
  pounce:      { n: 'Shadow Pounce', i: 'claw', tok: false, d: 'Auto: 5 pounces, each collects an area ×3.' },
  sniff:       { n: 'Sniff',         i: 'paw', tok: true,  d: 'Token: digs up a random item.' },
  gust:        { n: 'Kite Gust',     i: 'wind', tok: false, d: 'Auto: wind sweeps a band of the field ×2.' }
};

/* Fields sit along the switchback trail up the mountain.
   w = color weights, lv = [min, max] flower level, y = field multiplier */
const TILE = 40;
const LVM = [0, 1, 3, 9, 27, 81];          // ingredients per flower level
const FIELDS = [
  { id: 'tea',     n: 'Tea Garden',          c: 'cloud', y: 1,   gate: 0,  lv: [1, 1], w: { cloud: .7, spice: .15, ice: .15 }, x: 760, yy: 2610, w_: 380, h: 250 },
  { id: 'ginger',  n: 'Ginger Terraces',     c: 'spice', y: 1,   gate: 0,  lv: [1, 1], w: { spice: .7, cloud: .2, ice: .1 },  x: 110, yy: 2390, w_: 380, h: 250 },
  { id: 'glacier', n: 'Glacier Spring',      c: 'ice',   y: 1,   gate: 0,  lv: [1, 1], w: { ice: .7, cloud: .2, spice: .1 },  x: 530, yy: 2340, w_: 260, h: 170 },
  { id: 'rhodo',   n: 'Rhododendron Forest', c: 'spice', y: 1.5, gate: 5,  lv: [1, 2], w: { spice: .6, cloud: .25, ice: .15 }, x: 170, yy: 1710, w_: 340, h: 250 },
  { id: 'meadow',  n: 'Yak Meadow',          c: 'cloud', y: 1.5, gate: 5,  lv: [1, 2], w: { cloud: .6, ice: .2, spice: .2 },  x: 750, yy: 1910, w_: 420, h: 250 },
  { id: 'juniper', n: 'Juniper Ridge',       c: 'ice',   y: 2,   gate: 10, lv: [2, 3], w: { ice: .6, cloud: .25, spice: .15 }, x: 820, yy: 1310, w_: 340, h: 290 },
  { id: 'saffron', n: 'Saffron Cliffs',      c: 'mix',   y: 3,   gate: 15, lv: [2, 3], w: { spice: .4, ice: .3, cloud: .3 },  x: 310, yy: 990, w_: 340, h: 250 },
  { id: 'flags',   n: 'Prayer Flag Pass',    c: 'cloud', y: 4,   gate: 22, lv: [3, 4], w: { cloud: .55, ice: .25, spice: .2 }, x: 740, yy: 800,  w_: 240, h: 170 },
  { id: 'summit',  n: 'Summit Snowfield',    c: 'mix',   y: 6,   gate: 30, lv: [3, 5], w: { spice: .34, ice: .33, cloud: .33 }, x: 520, yy: 230, w_: 360, h: 170 }
];
FIELDS.forEach(f => { f.cw = f.w; f.w = f.w_; delete f.w_; });

/* gear cost: rupees + items (crafting materials and treats). st = stat bonuses, pas = passive id */
const TOOLS = [
  { id: 'sickle',  n: 'Sickle',          i: 'sickle',  cost: 0,     r: 30,  amt: 2,   sw: .75, d: 'Humble but honest.' },
  { id: 'trowel',  n: 'Trowel',          i: 'trowel',  cost: 600,   r: 34,  amt: 2.5, sw: .7 },
  { id: 'rake',    n: 'Bamboo Rake',     i: 'rake',    cost: 2e3,   r: 42,  amt: 3,   sw: .7 },
  { id: 'hook',    n: 'Pruning Hook',    i: 'hook',    cost: 8e3,   r: 42,  amt: 4,   sw: .65, col: 'cloud', cb: .3, req: { teaLeaf: 5 } },
  { id: 'axe',     n: 'Ice Axe',         i: 'axe',     cost: 3e4,   r: 46,  amt: 6,   sw: .65, col: 'ice',   cb: .6, req: { ice: 8 } },
  { id: 'scoop',   n: 'Chili Scoop',     i: 'scoop',   cost: 3e4,   r: 46,  amt: 6,   sw: .65, col: 'spice', cb: .6, req: { ginger: 8 } },
  { id: 'shears',  n: 'Tea Shears',      i: 'shears',  cost: 3e4,   r: 46,  amt: 6,   sw: .65, col: 'cloud', cb: .6, req: { teaLeaf: 8 } },
  { id: 'broom',   n: 'Juniper Broom',   i: 'broom',   cost: 1.2e5, r: 56,  amt: 9,   sw: .6,  st: { gather: .1 }, req: { petal: 10, wool: 10, momo: 20 } },
  { id: 'staff',   n: 'Prayer Staff',    i: 'staff',   cost: 4e5,   r: 62,  amt: 12,  sw: .6,  st: { cdr: .05 }, req: { berry: 15, selroti: 10 } },
  { id: 'esickle', n: 'Ember Sickle',    i: 'sickle',  cost: 2e6,   r: 64,  amt: 20,  sw: .58, col: 'spice', cb: .8, req: { petal: 30, ginger: 30, dalbhat: 5 } },
  { id: 'gpick',   n: 'Glacier Pick',    i: 'pick',    cost: 2e6,   r: 64,  amt: 20,  sw: .58, col: 'ice',   cb: .8, req: { ice: 40, berry: 15, dalbhat: 5 } },
  { id: 'crake',   n: 'Cloud Rake',      i: 'rake',    cost: 2e6,   r: 64,  amt: 20,  sw: .58, col: 'cloud', cb: .8, req: { wool: 40, teaLeaf: 30, dalbhat: 5 } },
  { id: 'claw',    n: 'Yeti Claw',       i: 'claw',    cost: 8e6,   r: 72,  amt: 28,  sw: .55, req: { berry: 30, saffron: 10 } },
  { id: 'talon',   n: 'Danphe Talon',    i: 'talon',   cost: 4e7,   r: 78,  amt: 45,  sw: .52, col: 'spice', cb: 1, pas: 'strike', req: { saffron: 40, petal: 60, goldenMomo: 1 } },
  { id: 'scythe',  n: 'Frostbite Scythe',i: 'scythe',  cost: 4e7,   r: 78,  amt: 45,  sw: .52, col: 'ice',   cb: 1, pas: 'stomp',  req: { ice: 80, berry: 40, goldenMomo: 1 } },
  { id: 'fan',     n: 'Wind Fan',        i: 'fan',     cost: 4e7,   r: 78,  amt: 45,  sw: .52, col: 'cloud', cb: 1, pas: 'dance',  req: { wool: 80, bead: 20, goldenMomo: 1 } },
  { id: 'wheel',   n: 'Spirit Wheel',    i: 'wheel',   cost: 1.5e8, r: 92,  amt: 60,  sw: .5,  crit: .1, req: { bead: 30, saffron: 30, dalbhat: 30 } },
  { id: 'banner',  n: 'Summit Banner',   i: 'banner',  cost: 1e9,   r: 110, amt: 120, sw: .45, st: { gather: .2 }, pas: 'summitBless', req: { gem: 60, goldenMomo: 3, mysticWheel: 5 } }
];
const HEADGEAR = [
  { id: 'woolCap',    n: 'Wool Cap',      i: 'hat', cost: 1.5e4, st: { cloud: .1, cap: .05 }, req: { wool: 5, momo: 10 } },
  { id: 'gingerTopi', n: 'Ginger Topi',   i: 'hat', cost: 1.5e4, st: { spice: .1, cap: .05 }, req: { ginger: 5, momo: 10 } },
  { id: 'iceHood',    n: 'Ice Hood',      i: 'hat', cost: 1.5e4, st: { ice: .1, cap: .05 },   req: { ice: 5, momo: 10 } },
  { id: 'sherpaHat',  n: 'Sherpa Hat',    i: 'hat', cost: 6e5,   st: { gather: .12, speed: .05 }, req: { wool: 25, berry: 15, selroti: 20 } },
  { id: 'emberCrown', n: 'Ember Crown',   i: 'hat', col: 'spice', cost: 2.5e7, st: { spice: .4, crit: .05 }, pas: 'wildfire',   req: { petal: 50, saffron: 30, dalbhat: 30, goldenMomo: 1 } },
  { id: 'frostCrown', n: 'Frost Crown',   i: 'hat', col: 'ice',   cost: 2.5e7, st: { ice: .4, crit: .05 },   pas: 'polar',      req: { ice: 60, berry: 40, dalbhat: 30, goldenMomo: 1 } },
  { id: 'cloudCrown', n: 'Cloud Crown',   i: 'hat', col: 'cloud', cost: 2.5e7, st: { cloud: .4, cap: .1 },   pas: 'cloudburst', req: { wool: 60, bead: 30, dalbhat: 30, goldenMomo: 1 } },
  { id: 'spiritMask', n: 'Spirit Mask',   i: 'hat', cost: 1e9,   st: { gather: .3, crit: .05 }, pas: 'spirit', req: { gem: 100, goldenMomo: 3, mysticWheel: 10 } }
];
const CHARMS = [
  { id: 'beads',     n: 'Prayer Beads',      i: 'amulet', cost: 6e4,   st: { cdr: .1 },               req: { petal: 10, selroti: 15 } },
  { id: 'turquoise', n: 'Turquoise Pendant', i: 'amulet', cost: 2e5,   st: { cap: .15, brew: .1 },    req: { ice: 15, wool: 15, dalbhat: 5 } },
  { id: 'yakBell',   n: 'Yak Bell',          i: 'amulet', cost: 5e5,   st: { yak: .5 }, pas: 'herd',   req: { wool: 30, selroti: 30 } },
  { id: 'emberAm',   n: 'Ember Amulet',      i: 'amulet', col: 'spice', cost: 5e6, st: { spice: .25 }, pas: 'spark',   req: { petal: 30, saffron: 10, dalbhat: 10 } },
  { id: 'glacierHt', n: 'Glacier Heart',     i: 'amulet', col: 'ice',   cost: 5e6, st: { ice: .25 },   pas: 'freeze',  req: { ice: 40, berry: 20, dalbhat: 10 } },
  { id: 'cloudFth',  n: 'Cloud Feather',     i: 'amulet', col: 'cloud', cost: 5e6, st: { cloud: .25 }, pas: 'updraft', req: { wool: 40, bead: 10, dalbhat: 10 } },
  { id: 'mountainHt',n: 'Mountain Heart',    i: 'amulet', cost: 3e8,   st: { gather: .2 }, pas: 'renewal', req: { gem: 40, goldenMomo: 2 } }
];
/* passives charge up as abilities of a color fire (auto abilities and bubbles you collect) */
const PASSIVES = {
  wildfire:    { n: 'Wildfire',        col: 'spice', need: 30, d: 'Every 30 Spice abilities: Spice gathering x3 for 15s.' },
  polar:       { n: 'Polar Power',     col: 'ice',   need: 30, d: 'Every 30 Ice abilities: Ice gathering x3 and +15% crit for 15s.' },
  cloudburst:  { n: 'Cloud Burst',     col: 'cloud', need: 30, d: 'Every 30 Cloud abilities: tool reach x1.5 and tool gathering x3 for 15s.' },
  spirit:      { n: 'Mountain Spirit', col: 'any',   need: 50, d: 'Every 50 abilities: all gathering x2 for 20s.' },
  herd:        { n: 'Herd Call',       col: 'cloud', need: 20, d: 'Every 20 Cloud abilities: your crew move 50% faster for 15s.' },
  spark:       { n: 'Spark',           col: 'spice', need: 20, d: 'Every 20 Spice abilities: a Chili Burst explodes around you.' },
  freeze:      { n: 'Freeze',          col: 'ice',   need: 20, d: 'Every 20 Ice abilities: 3 Frost Marks appear around you.' },
  updraft:     { n: 'Updraft',         col: 'cloud', need: 20, d: 'Every 20 Cloud abilities: a Kite Gust sweeps your field.' },
  renewal:     { n: 'Renewal',         col: 'any',   need: 40, d: 'Every 40 abilities: every flower in your field regrows instantly.' },
  strike:      { n: 'Danphe Strike',   col: 'spice', need: 20, d: 'Every 20 Spice abilities: a fiery Danphe Dive through your field.' },
  stomp:       { n: 'Yeti Stomp',      col: 'ice',   need: 20, d: 'Every 20 Ice abilities: giant Yeti Steps around you.' },
  dance:       { n: 'Wind Dance',      col: 'cloud', need: 20, d: 'Every 20 Cloud abilities: two Kite Gusts sweep your field.' },
  summitBless: { n: 'Summit Blessing', col: 'any',   need: 30, d: 'Every 30 abilities: a free Blessing (+25% everything for 15s).' }
};
/* crafting materials drop while gathering in each field */
const MATS = {
  teaLeaf: { n: 'Tea Leaf',      i: 'leaf',   f: 'tea' },
  ginger:  { n: 'Ginger Root',   i: 'root',   f: 'ginger' },
  ice:     { n: 'Glacier Ice',   i: 'ice',    f: 'glacier' },
  petal:   { n: 'Rhodo Petal',   i: 'petal',  f: 'rhodo' },
  wool:    { n: 'Yak Wool',      i: 'wool',   f: 'meadow' },
  berry:   { n: 'Juniper Berry', i: 'berry',  f: 'juniper' },
  saffron: { n: 'Saffron',       i: 'thread', f: 'saffron' },
  bead:    { n: 'Prayer Bead',   i: 'bead',   f: 'flags' },
  gem:     { n: 'Summit Gem',    i: 'gem',    f: 'summit' }
};
const FIELD_MAT = {}; for (const k in MATS) FIELD_MAT[MATS[k].f] = k;

const DOKOS = [
  { id: 'basket', n: 'Bamboo Basket',   i: 'basket', cost: 0,     cap: 200 },
  { id: 'woven',  n: 'Woven Doko',      i: 'basket', cost: 1500,  cap: 900 },
  { id: 'frame',  n: 'Porter Frame',    i: 'backpack', cost: 2e4,   cap: 4000 },
  { id: 'saddle', n: 'Yak Saddlebag',   i: 'backpack', cost: 2.5e5, cap: 18000 },
  { id: 'exped',  n: 'Expedition Pack', i: 'backpack', cost: 3e6,   cap: 8e4 },
  { id: 'glacier',n: 'Glacier Pack',    i: 'backpack', cost: 4e7,   cap: 3.5e5 },
  { id: 'spirit', n: 'Spirit Satchel',  i: 'backpack', cost: 6e8,   cap: 1.5e6 }
];
const BOOTS = [
  { id: 'sandals', n: 'Sandals',      i: 'boot', cost: 0,   spd: 150 },
  { id: 'runners', n: 'Trail Runners',i: 'boot', cost: 3e3, spd: 175 },
  { id: 'crampon', n: 'Crampons',     i: 'boot', cost: 8e4, spd: 200 },
  { id: 'sherpa',  n: 'Sherpa Boots', i: 'boot', cost: 2e6, spd: 230 },
  { id: 'wind',    n: 'Wind Boots',   i: 'boot', cost: 6e7, spd: 260 }
];
const LODGE = [
  { n: 'No manager',      eff: .10, cost: 0 },
  { n: 'Mansoon\'s cousin',  eff: .15, cost: 1e4 },
  { n: 'Lodge Manager',   eff: .22, cost: 2e5 },
  { n: 'Head of Lodge',   eff: .30, cost: 5e6 },
  { n: 'Mountain Tycoon', eff: .40, cost: 1e8 }
];

/* sprinklers: water a circle of flowers (faster regrowth + gathering bonus) */
const SPRINKLERS = [
  { n: 'Bamboo Sprinkler',  r: 70,  wet: 1.2,  rg: 2 },
  { n: 'Copper Sprinkler',  r: 85,  wet: 1.3,  rg: 2.5 },
  { n: 'Silver Sprinkler',  r: 100, wet: 1.45, rg: 3 },
  { n: 'Golden Sprinkler',  r: 115, wet: 1.6,  rg: 3.5 },
  { n: 'Glacier Sprinkler', r: 130, wet: 1.8,  rg: 4 },
  { n: 'Spirit Sprinkler',  r: 150, wet: 2.0,  rg: 5 }
];
const SPR_MAX = 8;
const sprCountCost = n => Math.round(3000 * Math.pow(3, n));
const sprLevelCost = l => Math.round(20000 * Math.pow(6, l));

const BUFFS = {
  haste:      { n: 'Haste',        i: 'speed',   d: 'You and your crew move 20% faster per stack.' },
  spiceRush:  { n: 'Spice Rush',   i: 'chili',   d: '+50% gathering from Spice (red) flowers.' },
  focus:      { n: 'Focus',        i: 'focus',   d: '+20% crit chance, and crits give x3.' },
  roar:       { n: 'Roar',         i: 'roar',    d: 'Your crew gather 50% faster.' },
  caravan:    { n: 'Caravan Rush', i: 'horns',   d: 'Yaks gather x2 and move faster.' },
  blessing:   { n: 'Blessing',     i: 'sparkle', d: '+25% to all gathering and brewing.' },
  shot_spice: { n: 'Ginger Shot',  i: 'bottle',  d: '+50% Spice gathering.' },
  shot_ice:   { n: 'Glacier Shard',i: 'crystal', d: '+50% Ice gathering.' },
  shot_cloud: { n: 'Yak Cheese',   i: 'cheese',  d: '+50% Cloud gathering.' },
  incense:    { n: 'Incense',      i: 'incense', d: 'Ability cooldowns run twice as fast.' },
  wildfire:   { n: 'Wildfire',     i: 'flame',   d: 'Spice gathering x3.' },
  polar:      { n: 'Polar Power',  i: 'snow',    d: 'Ice gathering x3 and +15% crit chance.' },
  cloudburst: { n: 'Cloud Burst',  i: 'cloud',   d: 'Tool reach x1.5 and tool gathering x3.' },
  spirit:     { n: 'Mountain Spirit', i: 'mountain', d: 'All gathering x2.' },
  herd:       { n: 'Herd Call',    i: 'horns',   d: 'Your crew move 50% faster.' }
};

const ITEMS = {
  teaLeaf: { n: 'Tea Leaf', i: 'leaf', d: 'Material. Drops in the Tea Garden.', mat: true },
  ginger: { n: 'Ginger Root', i: 'root', d: 'Material. Drops in Ginger Terraces.', mat: true },
  ice: { n: 'Glacier Ice', i: 'ice', d: 'Material. Drops in Glacier Spring.', mat: true },
  petal: { n: 'Rhodo Petal', i: 'petal', d: 'Material. Drops in Rhododendron Forest.', mat: true },
  wool: { n: 'Yak Wool', i: 'wool', d: 'Material. Drops in Yak Meadow.', mat: true },
  berry: { n: 'Juniper Berry', i: 'berry', d: 'Material. Drops in Juniper Ridge.', mat: true },
  saffron: { n: 'Saffron', i: 'thread', d: 'Material. Drops in Saffron Cliffs.', mat: true },
  bead: { n: 'Prayer Bead', i: 'bead', d: 'Material. Drops in Prayer Flag Pass.', mat: true },
  gem: { n: 'Summit Gem', i: 'gem', d: 'Material. Drops in Summit Snowfield.', mat: true },
  momo:        { n: 'Momo',          i: 'momo', d: 'Crew food. +10 bond.', price: 40 },
  selroti:     { n: 'Sel Roti',      i: 'ring', d: 'Crew food. +40 bond.', price: 200 },
  dalbhat:     { n: 'Dal Bhat',      i: 'bowl', d: 'Crew food. +200 bond. Dal bhat power, 24 hour.', price: 1200 },
  butterTea:   { n: 'Butter Tea',    i: 'cup', d: 'Haste ×3 for 30s.', price: 600, use: true },
  spiceShot:   { n: 'Ginger Shot',   i: 'bottle', d: '+50% Spice gathering for 60s.', price: 2500, use: true },
  glacierShard:{ n: 'Glacier Shard', i: 'crystal', d: '+50% Ice gathering for 60s.', price: 2500, use: true },
  yakCheese:   { n: 'Yak Cheese',    i: 'cheese', d: '+50% Cloud gathering for 60s.', price: 2500, use: true },
  incense:     { n: 'Incense',       i: 'incense', d: 'All ability cooldowns −50% for 60s.', price: 8000, use: true },
  permit:      { n: 'Trekking Permit', i: 'ticket', d: 'Recruit a random crew member into an empty bed.' },
  mysticWheel: { n: 'Mystic Wheel',  i: 'wheel', d: 'Reroll a crew member. Never gives Commons.' },
  goldenMomo:  { n: 'Golden Momo',   i: 'star', d: 'Makes a crew member Blessed.', price: 2.5e5 }
};

const PERMIT_ODDS = { common: .46, rare: .38, epic: .13, legendary: .0285, mythic: .0015 };
const WHEEL_ODDS  = { rare: .48, epic: .38, legendary: .13, mythic: .01 };

/* ---------------- synergies ---------------- */
const YAKS = ['yakCalf', 'dzo', 'yakKing'];
const SYN = [
  { id: 'porterUnion', n: 'Porter Union',      i: 'basket', req: '5+ Porters',                              d: '+25% doko capacity. Porters gather ×1.5.', chk: k => (k.porter || 0) >= 5 },
  { id: 'herd',        n: 'The Herd',          i: 'horns', req: '3+ yaks (Yak Calf, Dzo, Yak King)',       d: 'Yaks gather +40%. +10% doko capacity.',    chk: k => YAKS.reduce((s, y) => s + (k[y] || 0), 0) >= 3 },
  { id: 'trailTeam',   n: 'Trail Team',        i: 'boot', req: 'Sherpa Guide + Trekker',                  d: 'Haste stacks up to ×5.',                  chk: k => k.sherpa && k.trekker },
  { id: 'kitchen',     n: 'Kitchen Crew',      i: 'pot', req: 'Chili Cook + Ginger Farmer + Honey Hunter', d: 'Spice Rush and Chili Burst ×1.5 stronger.', chk: k => k.chiliCook && k.gingerFarmer && k.honeyHunter },
  { id: 'teaMasters',  n: 'Tea Masters',       i: 'cup', req: 'Tea Picker + Water Carrier',              d: '+15% rupees from brewing.',               chk: k => k.teaPicker && k.waterCarrier },
  { id: 'sacred',      n: 'Sacred Ground',     i: 'wheel', req: 'Monk + Lama',                             d: 'Prayer Wheels last ×2 and are 50% bigger.', chk: k => k.monk && k.lama },
  { id: 'frozenFocus', n: 'Frozen Focus',      i: 'crystal', req: 'Ice Climber + Glacier Guide',             d: 'Crits ×4. Frost Marks stack to 8.',        chk: k => k.iceClimber && k.glacierGuide },
  { id: 'bigCats',     n: 'Big Cats',          i: 'paw', req: 'Snow Lion + Snow Leopard Spirit',         d: 'Roar lasts ×2. +3 pounces.',               chk: k => k.snowLion && k.leopard },
  { id: 'legends',     n: 'Mountain Legends',  i: 'mountain', req: 'Yeti + Golden Danphe + Snow Leopard Spirit', d: 'Mythic cooldowns −30%.',                chk: k => k.yeti && k.danphe && k.leopard },
  { id: 'festival',    n: 'Festival Season',   i: 'lantern', req: 'Tihar Dog + Kite Flyer',                  d: '+20% rupees from brewing.',               chk: k => k.tiharDog && k.kiteFlyer },
  { id: 'lostFound',   n: 'Lost & Found',      i: 'compass', req: 'Lost Tourist + Sherpa Guide',             d: 'The Tourist never fails and is ×2 stronger.', chk: k => k.tourist && k.sherpa },
  { id: 'rainbow',     n: 'Rainbow Lodge',     i: 'rainbow', req: 'A Legendary+ crew of each color: Spice, Ice and Cloud', d: '+15% to all gathering.', chk: (k, c) => ['spice', 'ice', 'cloud'].every(col => c.some(m => CREW[m.id].c === col && RAR[CREW[m.id].r].o >= 3 && RAR[CREW[m.id].r].o <= 4)) },
  { id: 'fullHouse',   n: 'Full House',        i: 'bed', req: 'Every bed filled (10+ beds)',             d: '+10% to all gathering.',                  chk: (k, c, beds) => beds >= 10 && c.length >= beds },
  { id: 'blessedTrio', n: 'Blessed Trio',      i: 'halo', req: '3+ Blessed crew',                         d: 'All Blessed passives ×1.5.',              chk: (k, c) => c.filter(m => m.bl).length >= 3 }
];

const HIVE = {
  spice: { n: 'Spice Teahouse', i: 'flame', d: 'Ability cooldowns −15%, +5% crit chance. Rewards active play.' },
  ice:   { n: 'Ice Teahouse',   i: 'snow', d: '+30% rupees from brewing, +20% offline earnings. Great for idle days.' },
  cloud: { n: 'Cloud Teahouse', i: 'cloud', d: 'Your tool gathers ×1.5, +15% doko capacity. For hands-on farming.' }
};

/* ---------------- quest givers (on the map) ---------------- */
const GIVERS = {
  didi:  { n: 'Mansoon',     role: 'Teahouse owner',       x: 790,  y: 3085, col: '#ff8a3d', gate: 0, hi: 'Namaste! The kettle never sleeps, and neither should you.' },
  pemba: { n: 'Old Pemba',   role: 'Retired Sherpa',        x: 1085, y: 2475, col: '#2ea4dc', gate: 0, hi: 'Forty summits, little one. Let me teach you about crews.' },
  dolma: { n: 'Dolma',       role: 'Yak herder',            x: 1065, y: 1700, col: '#3fae6b', gate: 5, hi: 'My yaks know every flower on this mountain.' },
  norbu: { n: 'Lama Norbu',  role: 'Keeper of the chorten', x: 965,  y: 1075, col: '#9b6ef3', gate: 10, hi: 'Harmony between your crew is the real summit.' },
  yeti:  { n: 'Grandpa Yeti',role: 'Guardian of the peak',  x: 860,  y: 545,  col: '#4fb6e6', gate: 30, hi: 'Hrrm. Few climb this high. Fewer bring tea.' }
};
/* repeatable odd-job givers: small item rewards, never progression-breaking */
const REPEAT = {
  ang:  { n: 'Ang',  role: 'Porter for hire', x: 470, y: 3080, col: '#c8913e', gate: 0,  rep: true, hi: 'Got a small job if you have a minute.',
          rw: () => pick([{ momo: ri(5, 10) }, { selroti: ri(2, 4) }, { momo: ri(3, 6), selroti: 1 }, { dalbhat: 1 }]) },
  maya: { n: 'Maya', role: 'Backpacker',      x: 250, y: 2120, col: '#e84393', gate: 5,  rep: true, hi: 'This view is unreal! Help me out?',
          rw: () => pick([{ butterTea: ri(1, 2) }, { spiceShot: 1 }, { glacierShard: 1 }, { yakCheese: 1 }, { butterTea: 1, momo: 4 }, { incense: 1 }]) },
  raju: { n: 'Raju', role: 'Travelling trader', x: 330, y: 1450, col: '#e0a43c', gate: 10, rep: true, hi: 'Fine goods from Kathmandu, for a fair favour.',
          rw: () => Math.random() < .08 ? { mysticWheel: 1 } : pick([{ dalbhat: ri(2, 4) }, { incense: 1, selroti: 3 }, { dalbhat: 2, butterTea: 1 }]) }
};
const ri = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
const REPEAT_CD = 4 * 60 * 1000;

const QUESTS = {
  didi: [
    { t: 'Gather 100 ingredients',               g: ['gather', 100],              rw: { items: { momo: 5 }, rp: 100 } },
    { t: 'Brew tea worth 500 rupees',            g: ['earn', 500],                rw: { items: { permit: 1 } } },
    { t: 'Have 4 crew',                          g: ['crew', 4],                  rw: { rp: 300, items: { butterTea: 2 } } },
    { t: 'Feed your crew 5 times',               g: ['feed', 5],                  rw: { items: { selroti: 3 } } },
    { t: 'Buy the Bamboo Rake',                  g: ['tool', 'rake'],             rw: { rp: 1000 } },
    { t: 'Gather 1,500 in Ginger Terraces',      g: ['field', 'ginger', 1500],    rw: { items: { spiceShot: 2, permit: 1 } } },
    { t: 'Have 5 crew',                          g: ['crew', 5],                  rw: { items: { mysticWheel: 1 } } },
    { t: 'Brew tea worth 15,000 rupees',         g: ['earn', 15000],              rw: { items: { dalbhat: 3 } } },
    { t: 'Brew tea worth 300,000 rupees',        g: ['earn', 3e5],                rw: { items: { goldenMomo: 1 } } },
    { t: 'Brew tea worth 20M rupees',            g: ['earn', 2e7],                rw: { items: { mysticWheel: 5, dalbhat: 25 } } },
    { t: 'Brew tea worth 1B rupees',             g: ['earn', 1e9],                rw: { items: { goldenMomo: 3 } } }
  ],
  pemba: [
    { t: 'Gather 8,000 in Rhododendron Forest',  g: ['field', 'rhodo', 8000],     rw: { items: { permit: 2 } } },
    { t: 'Get a crew member to level 5',         g: ['level', 5],                 rw: { rp: 5000, items: { selroti: 5 } } },
    { t: 'Have 10 crew',                         g: ['crew', 10],                 rw: { crew: 'tiharDog' } },
    { t: 'Get a crew member to level 10',        g: ['level', 10],                rw: { items: { dalbhat: 15 } } },
    { t: 'Have 15 crew',                         g: ['crew', 15],                 rw: { crew: 'kiteFlyer' } },
    { t: 'Have 25 crew',                         g: ['crew', 25],                 rw: { items: { permit: 3, goldenMomo: 1 } } },
    { t: 'Fill 50 beds',                         g: ['crew', 50],                 rw: { rp: 1e10 } }
  ],
  dolma: [
    { t: 'Gather 5,000 in Yak Meadow',           g: ['field', 'meadow', 5000],    rw: { items: { yakCheese: 3, momo: 10 } } },
    { t: 'Have 2 yaks in your crew',             g: ['yaks', 2],                  rw: { items: { selroti: 10 } } },
    { t: 'Gather 100,000 in Juniper Ridge',      g: ['field', 'juniper', 1e5],    rw: { items: { mysticWheel: 3 } } },
    { t: 'Gather 1M in Prayer Flag Pass',        g: ['field', 'flags', 1e6],      rw: { items: { goldenMomo: 1 } } }
  ],
  norbu: [
    { t: 'Activate 2 synergies',                 g: ['syn', 2],                   rw: { items: { incense: 2, mysticWheel: 1 } } },
    { t: 'Activate 4 synergies',                 g: ['syn', 4],                   rw: { items: { goldenMomo: 1, incense: 3 } } },
    { t: 'Have 3 Blessed crew',                  g: ['blessed', 3],               rw: { items: { mysticWheel: 10 } } },
    { t: 'Activate 8 synergies',                 g: ['syn', 8],                   rw: { items: { goldenMomo: 2 } } }
  ],
  yeti: [
    { t: 'Have 30 crew',                         g: ['crew', 30],                 rw: { items: { glacierShard: 5, incense: 5 } } },
    { t: 'Gather 2M in Summit Snowfield',        g: ['field', 'summit', 2e6],     rw: { items: { goldenMomo: 2 } } },
    { t: 'Have a Yeti in your crew',             g: ['has', 'yeti'],              rw: { items: { mysticWheel: 15 } } },
    { t: 'Activate 12 synergies',                g: ['syn', 12],                  rw: { items: { goldenMomo: 5 } } }
  ]
};
