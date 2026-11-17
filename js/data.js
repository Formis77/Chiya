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
  cloud:   { n: 'Lightning', c: '#9b6ef3', i: 'bolt' },
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
  teaPicker:    { n: 'Tea Picker',          r: 'rare',      c: 'cloud',   spd: 85,  amt: 3,  gt: 2.8, brew: 4,  fav: 'momo',    bp: ['cloud', 10],  tags: ['human'], ab: 'reach', cd: 20, d: 'Nimble fingers, wide straw hat.' },
  gingerFarmer: { n: 'Ginger Farmer',       r: 'rare',      c: 'spice',   spd: 85,  amt: 3,  gt: 3.0, brew: 3,  fav: 'dalbhat', bp: ['spice', 10],  tags: ['human'], ab: 'spiceBoost', cd: 16, d: 'Grows the spiciest ginger in the valley.' },
  waterCarrier: { n: 'Water Carrier',       r: 'rare',      c: 'ice',     spd: 80,  amt: 3,  gt: 3.0, brew: 14, fav: 'selroti', bp: ['brew', 8],    tags: ['human'], pas: 'Brews very fast at the teahouse.', d: 'Carries glacier water in a copper gagri.' },
  tourist:      { n: 'Lost Tourist',        r: 'rare',      c: 'neutral', spd: 90,  amt: 2,  gt: 3.5, brew: 2,  fav: 'momo',    bp: ['crit', 3],    tags: ['human'], ab: 'random', cd: 22, d: 'Nobody knows how they got here. Sometimes useless, sometimes a jackpot.' },
  sherpa:       { n: 'Sherpa Guide',        r: 'epic',      c: 'neutral', spd: 110, amt: 5,  gt: 2.6, brew: 6,  fav: 'dalbhat', bp: ['speed', 10],  tags: ['human'], ab: 'haste', cd: 16, d: 'Knows every rock on the mountain.' },
  chiliCook:    { n: 'Chili Cook',          r: 'epic',      c: 'spice',   spd: 90,  amt: 5,  gt: 2.8, brew: 6,  fav: 'momo',    bp: ['spice', 15],  tags: ['human'], ab: 'burst', cd: 14, d: 'Their chili sauce has been banned in three villages.' },
  glacierGuide: { n: 'Glacier Guide',       r: 'epic',      c: 'ice',     spd: 95,  amt: 5,  gt: 2.6, brew: 6,  fav: 'selroti', bp: ['crit', 5],    tags: ['human'], ab: 'focus', cd: 15, d: 'Reads ice like a book.' },
  dzo:          { n: 'Dzo',                 r: 'epic',      c: 'cloud',   spd: 75,  amt: 9,  gt: 4.0, brew: 12, fav: 'selroti', bp: ['cap', 15],    tags: ['yak'],   pas: '+5% doko capacity.', d: 'Half yak, half cow, all muscle.' },
  monk:         { n: 'Monk',                r: 'epic',      c: 'neutral', spd: 80,  amt: 4,  gt: 3.0, brew: 8,  fav: 'dalbhat', bp: ['conv', 3],   tags: ['human'], ab: 'prayerWheel', cd: 20, d: 'Spins the wheel, and the mountain listens.' },
  honeyHunter:  { n: 'Honey Hunter',        r: 'epic',      c: 'spice',   spd: 95,  amt: 5,  gt: 3.0, brew: 5,  fav: 'momo',    bp: ['brew', 10],   tags: ['human'], ab: 'honey', cd: 26, d: 'Climbs cliffs for wild Himalayan honey.' },
  rhodoSpirit:  { n: 'Rhododendron Spirit', r: 'legendary', c: 'spice',   spd: 100, amt: 7,  gt: 2.4, brew: 8,  fav: 'selroti', bp: ['spice', 25],  tags: ['spirit'], ab: 'petalStorm', cd: 22, d: 'The national flower, awake and dancing.' },
  iceClimber:   { n: 'Ice Climber',         r: 'legendary', c: 'ice',     spd: 105, amt: 7,  gt: 2.3, brew: 8,  fav: 'dalbhat', bp: ['ice', 25],    tags: ['human'], ab: 'frostMark', cd: 10, d: 'Two axes, zero fear.' },
  snowLion:     { n: 'Thunder Lion',           r: 'legendary', c: 'cloud',   spd: 110, amt: 8,  gt: 2.6, brew: 9,  fav: 'momo',    bp: ['cloud', 25],  tags: ['cat'],   ab: 'stormCall', cd: 26, d: 'Its roar rolls like thunder through the valleys.' },
  yakKing:      { n: 'Yak King',            r: 'legendary', c: 'cloud',   spd: 80,  amt: 12, gt: 3.4, brew: 14, fav: 'selroti', bp: ['cap', 25],    tags: ['yak'],   ab: 'caravan', cd: 24, d: 'Ruler of every herd above 4000 m.' },
  lama:         { n: 'Lama',                r: 'legendary', c: 'neutral', spd: 85,  amt: 6,  gt: 2.8, brew: 12, fav: 'dalbhat', bp: ['cdr', 10],   tags: ['human'], ab: 'blessing', cd: 35, pas: 'Each Lama adds +0.2% Blessed chance on permits and Mystic Wheels.', d: 'Wise, calm, and slightly mischievous.' },
  yeti:         { n: 'Yeti',                r: 'mythic',    c: 'ice',     spd: 100, amt: 14, gt: 2.6, brew: 15, fav: 'momo',    bp: ['ice', 40],    tags: ['beast'], ab: 'footprints', cd: 26, d: 'Real. Very real. And surprisingly gentle.' },
  danphe:       { n: 'Golden Danphe',       r: 'mythic',    c: 'spice',   spd: 140, amt: 14, gt: 2.2, brew: 12, fav: 'selroti', bp: ['spice', 40],  tags: ['bird'],  ab: 'dive', cd: 22, d: 'The rainbow pheasant of Nepal, wreathed in fire.' },
  leopard:      { n: 'Storm Leopard', r: 'mythic',    c: 'cloud',   spd: 150, amt: 12, gt: 2.2, brew: 12, fav: 'dalbhat', bp: ['cloud', 40],  tags: ['cat'],   ab: 'sbomb', cd: 16, d: 'Crackles every time it lands.' },
  fireKid:      { n: 'Firecracker Kid',     r: 'rare',      c: 'neutral', spd: 100, amt: 2,  gt: 3.0, brew: 3,  fav: 'selroti', bp: ['crit', 3],    tags: ['human'], ab: 'firecracker', cd: 14, d: 'Saves every Tihar firecracker for the fields.' },
  iceFisher:    { n: 'Ice Fisher',          r: 'epic',      c: 'ice',     spd: 85,  amt: 5,  gt: 2.8, brew: 7,  fav: 'momo',    bp: ['ice', 15],    tags: ['human'], ab: 'iceBoost', cd: 15, d: 'Patient as a frozen lake.' },
  woolSpinner:  { n: 'Spark Spinner',        r: 'epic',      c: 'cloud',   spd: 85,  amt: 5,  gt: 2.8, brew: 7,  fav: 'selroti', bp: ['cloud', 15],  tags: ['human'], ab: 'cloudBoost', cd: 15, d: 'Spins static out of yak wool.' },
  ropeFixer:    { n: 'Rope Fixer',          r: 'legendary', c: 'neutral', spd: 110, amt: 6,  gt: 2.6, brew: 9,  fav: 'dalbhat', bp: ['cap', 15],   tags: ['human'], ab: 'link', cd: 30, d: 'Fixes the ropes so everyone else can climb.' },
  drumBoy:      { n: 'Drum Boy',            r: 'epic',      c: 'cloud',   spd: 95,  amt: 5,  gt: 2.6, brew: 7,  fav: 'momo',    bp: ['tool', 15],   tags: ['human'], ab: 'drum', cd: 18, d: 'Beats the dhol like a thunderstorm.' },
  littleMonk:   { n: 'Little Monk',         r: 'legendary', c: 'cloud',   spd: 95,  amt: 6,  gt: 2.6, brew: 10, fav: 'momo',    bp: ['cloud', 25],  tags: ['human'], ab: 'littleLove', cd: 28, d: 'Tiny, cheerful, and somehow everyone works harder around him.' },
  teaMaster:    { n: 'Storm Lama',          r: 'legendary', c: 'cloud',   spd: 90,  amt: 7,  gt: 2.6, brew: 16, fav: 'dalbhat', bp: ['brew', 20],   tags: ['human'], ab: 'sfork', cd: 24, d: 'Reads the sky and calls the bolt where it is needed.' },
  gurkha:       { n: 'Gurkha Marksman',     r: 'mythic',    c: 'spice',   spd: 130, amt: 14, gt: 2.2, brew: 12, fav: 'dalbhat', bp: ['crit', 8],    tags: ['human'], ab: 'bullseye', cd: 20, d: 'Never misses. Asks you not to either.' },
  naga:         { n: 'Lake Naga',           r: 'mythic',    c: 'ice',     spd: 110, amt: 13, gt: 2.4, brew: 14, fav: 'selroti', bp: ['ice', 40],    tags: ['spirit'], ab: 'bubbles', cd: 20, d: 'Serpent spirit of the turquoise lakes.' },
  skyLantern:   { n: 'Sky Lantern',         r: 'mythic',    c: 'ice',     spd: 120, amt: 11, gt: 2.4, brew: 14, fav: 'momo',    bp: ['cap', 40],    tags: ['spirit'], ab: 'inflate', cd: 26, d: 'Drifts above the teahouse on festival nights.' },
  mistYak:      { n: 'Thunder Yak',            r: 'mythic',    c: 'cloud',   spd: 95,  amt: 15, gt: 2.6, brew: 16, fav: 'selroti', bp: ['cloud', 40],  tags: ['yak'], ab: 'lpole', cd: 18, d: 'Its horns pull lightning out of the sky.' },
  bear:         { n: 'Himalayan Bear',      r: 'event',     c: 'neutral', spd: 105, amt: 8,  gt: 2.6, brew: 10, fav: 'momo',    bp: ['tool', 25],   tags: ['beast'], ab: 'bearMorph', cd: 30, d: 'Big, black, and very fond of honey.' },
  tiharDog:     { n: 'Tihar Dog',           r: 'event',     c: 'neutral', spd: 155, amt: 14, gt: 2.2, brew: 12, fav: 'momo',    bp: ['crit', 10],   tags: ['dog'],   ab: 'sniff', cd: 24, pas: 'Loyal: every crew member in your field gathers 10% faster while the Tihar Dog works with them.', d: 'Honored with marigolds on Kukur Tihar. A very good, very hard-working boy.' },
  kiteFlyer:    { n: 'Kite Flyer',          r: 'event',     c: 'neutral', spd: 100, amt: 6,  gt: 2.8, brew: 8,  fav: 'selroti', bp: ['tool', 25],   tags: ['human'], ab: 'gust', cd: 22, d: 'Dashain kite season, all year round.' }
};
const CREW_IDS = Object.keys(CREW);

const ABIL = {
  spiceRush:   { n: 'Spice Rush',    i: 'chili', tok: true,  d: 'Bubble. Collect it for Spice Rush: red Spice flowers give +50% for 15s (x1.5 stronger and longer with Kitchen Crew).' },
  random:      { n: 'Wild Card',     i: 'dice', tok: true,  d: 'Bubble. One random effect: Chili Burst, Wild Honey, Haste or 2 Momos, or just a selfie. With Lost & Found it never fails and fires twice.' },
  haste:       { n: 'Haste',         i: 'speed', tok: true,  d: 'Bubble. +20% move speed for you and your crew for 10s. Stacks up to x3 (x5 with Trail Team). Can appear anywhere, even off the fields.' },
  burst:       { n: 'Chili Burst',   i: 'burst', tok: true,  d: 'Bubble. Explodes where it lies: every flower within 95 range is gathered at x2.5. Leaves 2 flames. Anything gathered inside a flame counts x1.5, and standing in one builds Heat.' },
  focus:       { n: 'Focus',         i: 'focus', tok: true,  d: 'Bubble. For 12s: +15% crit chance, and crits give x2.5 instead of x2 (x3 with Frozen Focus).' },
  prayerWheel: { n: 'Prayer Wheel',  i: 'wheel', tok: true,  d: 'Bubble. Sets a golden wheel (radius 80) where it lies for 10s. Everything gathered inside counts double. Sacred Ground makes it 50% bigger and twice as long.' },
  honey:       { n: 'Wild Honey',    i: 'honey', tok: true,  d: 'Bubble. Instantly gives rupees worth 20% of your doko capacity (brewing bonuses apply), with a 25% chance of a free Momo.' },
  petalStorm:  { n: 'Petal Storm',   i: 'flower', tok: true,  d: 'Bubble. 30 petals fly from it to random flowers in the field and gather each one at x2. Now and then a petal sets a flame.' },
  frostMark:   { n: 'Frost Mark',    i: 'snow', tok: true,  d: 'Bubble. Leaves a frost mark (radius 56) on the nearest flower. Ice flowers inside give x1.25. A new mark on top of it upgrades it to x1.5, then x2 (max level 3). Lasts 15s and refreshes on upgrade. A bubble rises on every new mark.' },
  roar:        { n: 'Roar',          i: 'roar', tok: true,  d: 'Bubble. A shockwave from where it lies: your whole crew gathers 50% faster for 10s (20s with Big Cats).' },
  caravan:     { n: 'Caravan Rush',  i: 'horns', tok: true,  d: 'Bubble. Every yak in your crew (Yak Calf, Dzo, Yak King) gathers x2 and moves 50% faster for 12s. The Yak King also plants a prayer flag pole where he stands.' },
  blessing:    { n: 'Blessing',      i: 'sparkle', tok: true,  d: 'Bubble. +25% to all gathering and brewing for 15s.' },
  footprints:  { n: 'Yeti Steps',    i: 'foot', tok: true,  d: 'Bubble. Six giant footprints stomp in a line starting from it. Each stomp gathers every flower within 72 range at x3. Every stomp leaves a bubble behind.' },
  dive:        { n: 'Danphe Dive',   i: 'feather', tok: true,  d: 'Bubble. The Danphe dives in a straight line across the whole field, gathering every flower within 40 of its path at x3. Every flame it flies over turns into a Dark Flame: burns twice as hard, counts x2.5 inside, builds Heat twice as fast, and adds to Dark Heat while it burns.' },
  pounce:      { n: 'Shadow Pounce', i: 'claw', tok: true,  d: 'Bubble. The Snow Leopard pounces to 5 random flowers in the field (8 with Big Cats). Each landing gathers everything within 62 range at x2.5. If it lands near a prayer flag pole it refreshes it, otherwise the last landing plants a new pole.' },
  inflate:     { n: 'Sky Lantern',   i: 'diya', tok: true, d: 'Bubble. Releases a sky lantern that drifts over the field for 20s (+2s per level). It holds 1/6 of your capacity, and 75% of everything gathered under it goes inside instead of your doko. Each Sky Lantern can only have one lantern up; using it again inflates that one (+1/6 capacity, up to 10 times). When time runs out it floats to the teahouse lantern, which you brew after your doko. Brewing it empty gives Lantern Blessing: bigger lanterns, more stacks.' },
  inspire:     { n: 'Inspire',       i: 'sparkle', tok: true, d: 'Rare bubble from any Blessed crew. x2 to all gathering for 5s. Collecting another refreshes the time.' },
  sniff:       { n: 'Kukur Puja',    i: 'paw', tok: true,  d: 'Bubble. The whole crew is honored: +50% to all gathering for 15s. The dog also digs up 1 to 3 items: food, extracts, Incense, and rarely a Mystic Wheel, Permit or Golden Momo.' },
  spiceBoost:  { n: 'Spice Boost',   i: 'flame',  tok: true,  d: 'Bubble. Spice gathering +10% per stack for 15s, up to 10 stacks (x2). Collecting another refreshes the timer. Also leaves a flame where the bubble lay.' },
  iceBoost:    { n: 'Ice Boost',     i: 'snow',   tok: true,  d: 'Bubble. Ice gathering +10% per stack for 15s, up to 10 stacks (x2). Collecting another refreshes the timer. Also releases 2 bubbles.' },
  cloudBoost:  { n: 'Lightning Boost', i: 'bolt', tok: true,  d: 'Bubble. Lightning gathering +10% per stack for 15s, up to 10 stacks (x2). Collecting another refreshes the timer.' },
  lpole:       { n: 'Lightning Pole', i: 'bolt', tok: true,  d: 'Bubble. Plants a lightning pole where it lay for 25s (bigger when Blessed). Up to 15 poles at once. Lightning flowers inside gather x1.25; poles that touch connect: 2 connected x1.5, 3 or more x2. When your Vajra Staff fires a bolt while you stand inside a pole, the bolt runs through every connected pole and adds Storm Charge.' },
  sbomb:       { n: 'Static Bomb',   i: 'bolt',   tok: true,  d: 'Bubble. Explodes when you grab it: gathers everything within 85 at x2.5 and raises those flowers +1 level for 12s. Blessed Storm Leopards sometimes drop a Static Haze instead.' },
  haze:        { n: 'Static Haze',   i: 'cloud',  tok: true,  d: 'Bubble (Blessed Storm Leopard). A violet haze settles over the field for 90s: every 0.5s a random flower inside gets +1 level until the haze lifts.' },
  stormCall:   { n: 'Storm Call',    i: 'bolt',   tok: true,  d: 'Bubble. Every lightning pole on the field strikes once, gathering the flowers inside its radius.' },
  sfork:       { n: 'Spark Fork',    i: 'bolt',   tok: true,  d: 'Bubble. Your next 3 Vajra bolts each strike 3 times in the same spot.' },
  reach:       { n: 'Long Reach',    i: 'tool',   tok: true,  d: 'Bubble. Your next 15 tool swings reach 50% further.' },
  drum:        { n: 'Thunder Drum',  i: 'drum',   tok: true,  d: 'Bubble. +25% tool swing speed for 10s, stacks up to 3 times.' },
  firecracker: { n: 'Firecracker',   i: 'burst',  tok: true,  d: 'Bubble. Explodes on pickup, gathering every flower within 60 range at x2. Each firecracker within 12s of the last adds +1 combo (max 10): +6 range and +0.3x per combo. Combos of 5 or more leave a flame.' },
  link:        { n: 'Fixed Rope',    i: 'compass', tok: true, d: 'Bubble. Pulls in and collects every other bubble lying in the field at once.' },
  littleLove:  { n: 'Little Love',   i: 'heart',  tok: true,  d: 'Bubble. All gathering x1.5 for 12s.' },
  teaMark:     { n: 'Tea Mark',      i: 'cup',    tok: true,  d: 'Bubble. Leaves a tea mark (radius 64) for 15s. 35% of everything gathered inside is brewed into rupees instantly.' },
  bullseye:    { n: 'Bullseye',      i: 'focus',  tok: true,  d: 'Skill. Three targets appear in the field for 7s (only one set at a time). Step on all three for a Precision stack: +0.5% chance that a crit becomes a Super Crit, which doubles again and is brewed straight into rupees. Up to 40 stacks (20%), 25s.' },
  bubbles:     { n: 'Bubble Bloom',  i: 'drop',   tok: true,  d: 'Skill. Eight bubbles float up around the field for 12s. Walk into them to pop them: each pop gathers every flower within 52 range at x1.5 (Ice flowers x2.5). Bubbles popped inside a Frost Mark gather 50% further.' },
  mist:        { n: 'Mountain Mist', i: 'cloud',  tok: true,  d: 'Bubble. Mountain Mist rolls in and the Mist Yak plants two prayer flag poles in it.' },
  bearMorph:   { n: 'Bear Morph',    i: 'paw',    tok: true,  d: 'Bubble. You turn into a bear for 15s: your tool gathers x2, reaches 30% further, and you move 20% faster.' },
  gust:        { n: 'Kite Gust',     i: 'wind', tok: true,  d: 'Bubble. A wind band 92 tall sweeps across the whole field at the bubble\'s height, gathering every flower in it at x2.' }
};

/* Fields sit along the switchback trail up the mountain.
   w = color weights, lv = [min, max] flower level, y = field multiplier */
const TILE = 40;
const LVM = [0, 1, 1.5, 2.2, 3, 4];            // ingredients per flower level
/* five zones, each gated by crew count; z = zone index */
const FIELDS = [
  // zone 1 (foothills)
  { id: 'tea',     n: 'Tea Garden',          z: 0, c: 'cloud', y: 1,   lv: [1, 1], w: { cloud: .75, ice: .125, spice: .125 }, x: 250,  yy: 4950, w_: 460, h: 300 },
  { id: 'glacier', n: 'Glacier Spring',      z: 0, c: 'ice',   y: 1,   lv: [1, 1], w: { ice: .75, cloud: .25 },               x: 1490, yy: 4950, w_: 460, h: 300 },
  { id: 'ginger',  n: 'Ginger Terraces',     z: 0, c: 'spice', y: 1,   lv: [1, 1], w: { spice: .75, cloud: .25 },             x: 380,  yy: 4520, w_: 460, h: 320 },
  { id: 'bazaar',  n: 'Marigold Meadow',     z: 0, c: 'mix',   y: 1,   lv: [1, 1], w: { spice: .4, ice: .4, cloud: .2 },      x: 1360, yy: 4520, w_: 460, h: 320 },
  // zone 2 (pine forest)
  { id: 'meadow',  n: 'Yak Meadow',          z: 1, c: 'cloud', y: 1.5, lv: [1, 2], w: { cloud: 1 },                           x: 840,  yy: 3880, w_: 520, h: 340 },
  { id: 'rhodo',   n: 'Rhododendron Forest', z: 1, c: 'spice', y: 1.5, lv: [1, 2], w: { spice: .75, cloud: .25 },             x: 160,  yy: 3560, w_: 460, h: 320 },
  { id: 'lake',    n: 'Turquoise Lake',      z: 1, c: 'ice',   y: 1.5, lv: [1, 2], w: { ice: .75, cloud: .25 },               x: 1580, yy: 3560, w_: 460, h: 320 },
  // zone 3 (high pasture)
  { id: 'juniper', n: 'Juniper Ridge',       z: 2, c: 'cloud', y: 2,   lv: [2, 3], w: { cloud: .7, ice: .15, spice: .15 },    x: 780,  yy: 2780, w_: 640, h: 400 },
  // zone 4 (snowline)
  { id: 'flags',   n: 'Prayer Flag Pass',    z: 3, c: 'cloud', y: 3,   lv: [3, 4], w: { cloud: .7, ice: .15, spice: .15 },    x: 840,  yy: 2100, w_: 520, h: 330 },
  { id: 'saffron', n: 'Saffron Cliffs',      z: 3, c: 'mix',   y: 3,   lv: [3, 4], w: { spice: .4, ice: .4, cloud: .2 },      x: 840,  yy: 1560, w_: 520, h: 330 },
  { id: 'ember',   n: 'Ember Rocks',         z: 3, c: 'spice', y: 3,   lv: [3, 4], w: { spice: .75, cloud: .25 },             x: 140,  yy: 1800, w_: 460, h: 320 },
  { id: 'frost',   n: 'Frost Hollow',        z: 3, c: 'ice',   y: 3,   lv: [3, 4], w: { ice: .75, cloud: .25 },               x: 1600, yy: 1800, w_: 460, h: 320 },
  // zone 5 (glacier summit)
  { id: 'summit',  n: 'Summit Glacier',      z: 4, c: 'mix',   y: 5,   lv: [4, 5], w: { spice: .34, ice: .33, cloud: .33 },   x: 700,  yy: 520,  w_: 800, h: 460 }
];
const ZONES = [
  { n: 'Foothills',    alt: '2,800 m', top: 4400, gate: 0,  col: '#86c763', lip: '#6aab50' },
  { n: 'Pine Forest',  alt: '3,600 m', top: 3400, gate: 5,  col: '#5fa552', lip: '#4a8a41' },
  { n: 'High Pasture', alt: '4,400 m', top: 2600, gate: 10, col: '#a9b86a', lip: '#8c9b54' },
  { n: 'Snowline',     alt: '5,500 m', top: 1300, gate: 15, col: '#e6eef4', lip: '#c4d6e3' },
  { n: 'Summit Glacier', alt: '7,000 m', top: 0,  gate: 25, col: '#cfe6f6', lip: '#a9cde6' }
];
FIELDS.forEach(f => f.gate = ZONES[f.z].gate);
FIELDS.forEach(f => { f.cw = f.w; f.w = f.w_; delete f.w_; });

/* gear cost: rupees + items (crafting materials and treats). st = stat bonuses, pas = passive id */
const TOOLS = [
  { id: 'sickle',  n: 'Sickle',          i: 'sickle',  cost: 0,     r: 30,  amt: 2,   sw: .75, d: 'Humble but honest.' },
  { id: 'trowel',  n: 'Trowel',          i: 'trowel',  cost: 600,   r: 34,  amt: 2.5, sw: .7 },
  { id: 'rake',    n: 'Bamboo Rake',     i: 'rake',    cost: 2e3,   r: 42,  amt: 3,   sw: .7 },
  { id: 'hook',    n: 'Pruning Hook',    i: 'hook',    cost: 8e3,   r: 42,  amt: 4,   sw: .65, col: 'cloud', cb: .3, req: { apple: 5 } },
  { id: 'axe',     n: 'Ice Axe',         i: 'axe',     cost: 3e4,   r: 46,  amt: 6,   sw: .65, col: 'ice',   cb: .6, req: { berry: 8 } },
  { id: 'scoop',   n: 'Chili Scoop',     i: 'scoop',   cost: 3e4,   r: 46,  amt: 6,   sw: .65, col: 'spice', cb: .6, req: { chili: 8 } },
  { id: 'shears',  n: 'Tea Shears',      i: 'shears',  cost: 3e4,   r: 46,  amt: 6,   sw: .65, col: 'cloud', cb: .6, req: { apple: 8 } },
  { id: 'broom',   n: 'Juniper Broom',   i: 'broom',   cost: 1.2e5, r: 56,  amt: 9,   sw: .6,  st: { cap: .1 }, req: { chili: 10, apple: 10, momo: 20 } },
  { id: 'staff',   n: 'Prayer Staff',    i: 'staff',   cost: 4e5,   r: 62,  amt: 12,  sw: .6,  st: { cdr: .05 }, req: { berry: 15, selroti: 10 } },
  { id: 'esickle', n: 'Ember Sickle',    i: 'sickle',  cost: 2e6,   r: 64,  amt: 20,  sw: .58, col: 'spice', cb: .8, st: { conv: .03 }, req: { chili: 60, dalbhat: 5 } },
  { id: 'gpick',   n: 'Glacier Pick',    i: 'pick',    cost: 2e6,   r: 64,  amt: 20,  sw: .58, col: 'ice',   cb: .8, req: { berry: 55, dalbhat: 5 } },
  { id: 'crake',   n: 'Cloud Rake',      i: 'rake',    cost: 2e6,   r: 64,  amt: 20,  sw: .58, col: 'cloud', cb: .8, req: { apple: 70, dalbhat: 5 } },
  { id: 'claw',    n: 'Yeti Claw',       i: 'claw',    cost: 8e6,   r: 72,  amt: 28,  sw: .55, req: { berry: 30, walnut: 10 } },
  { id: 'talon',   n: 'Danphe Talon',    i: 'talon',   cost: 4e7,   r: 78,  amt: 45,  sw: .52, col: 'spice', cb: 1, st: { conv: .06 }, pas: 'strike', req: { walnut: 40, chili: 60, goldenMomo: 1 } },
  { id: 'scythe',  n: 'Frostbite Scythe',i: 'scythe',  cost: 4e7,   r: 78,  amt: 45,  sw: .52, col: 'ice',   cb: 1, pas: 'stomp',  req: { berry: 120, goldenMomo: 1 } },
  { id: 'fan',     n: 'Vajra Staff',     i: 'bolt',     cost: 4e7,   r: 78,  amt: 45,  sw: .52, col: 'cloud', cb: 1, pas: 'vajra',  req: { apple: 80, walnut: 20, goldenMomo: 1 } },
  { id: 'wheel',   n: 'Spirit Wheel',    i: 'wheel',   cost: 8e7, r: 92,  amt: 60,  sw: .5,  crit: .1, req: { walnut: 60, dalbhat: 30 } },
  { id: 'banner',  n: 'Summit Banner',   i: 'banner',  cost: 4e8,   r: 110, amt: 120, sw: .45, st: { gather: .2, conv: .05 }, pas: 'summitBless', req: { gem: 60, goldenMomo: 3, mysticWheel: 5 } }
];
const HEADGEAR = [
  { id: 'woolCap',    n: 'Wool Cap',      i: 'hat', cost: 1.5e4, st: { cloud: .1, cap: .05 }, req: { apple: 5, momo: 10 } },
  { id: 'gingerTopi', n: 'Ginger Topi',   i: 'hat', cost: 1.5e4, st: { spice: .1, cap: .05 }, req: { chili: 5, momo: 10 } },
  { id: 'iceHood',    n: 'Ice Hood',      i: 'hat', cost: 1.5e4, st: { ice: .1, cap: .05 },   req: { berry: 5, momo: 10 } },
  { id: 'sherpaHat',  n: 'Sherpa Hat',    i: 'hat', cost: 6e5,   st: { cap: .12, speed: .05 }, req: { apple: 25, berry: 15, selroti: 20 } },
  { id: 'emberCrown', n: 'Ember Crown',   i: 'hat', col: 'spice', cost: 2.5e7, st: { spice: .4, crit: .05, conv: .04 }, pas: 'wildfire',   req: { chili: 50, walnut: 30, dalbhat: 30, goldenMomo: 1 } },
  { id: 'frostCrown', n: 'Frost Crown',   i: 'hat', col: 'ice',   cost: 2.5e7, st: { ice: .4, crit: .05 },   pas: 'polar',      req: { berry: 100, dalbhat: 30, goldenMomo: 1 } },
  { id: 'cloudCrown', n: 'Storm Crown',   i: 'hat', col: 'cloud', cost: 2.5e7, st: { cloud: .4, cap: .1 },   pas: 'cloudburst', req: { apple: 60, walnut: 30, dalbhat: 30, goldenMomo: 1 } },
  { id: 'spiritMask', n: 'Spirit Mask',   i: 'hat', cost: 4e8,   st: { gather: .3, crit: .05, conv: .05 }, pas: 'spirit', req: { gem: 100, goldenMomo: 3, mysticWheel: 10 } }
];
const CHARMS = [
  { id: 'beads',     n: 'Prayer Beads',      i: 'amulet', cost: 6e4,   st: { cdr: .1 },               req: { chili: 10, selroti: 15 } },
  { id: 'turquoise', n: 'Turquoise Pendant', i: 'amulet', cost: 2e5,   st: { cap: .15, brew: .1 },    req: { berry: 15, apple: 15, dalbhat: 5 } },
  { id: 'yakBell',   n: 'Yak Bell',          i: 'amulet', cost: 5e5,   st: { yak: .5 }, pas: 'herd',   req: { apple: 30, selroti: 30 } },
  { id: 'emberAm',   n: 'Ember Amulet',      i: 'amulet', col: 'spice', cost: 5e6, st: { spice: .25 }, pas: 'spark',   req: { chili: 30, walnut: 10, dalbhat: 10 } },
  { id: 'glacierHt', n: 'Glacier Heart',     i: 'amulet', col: 'ice',   cost: 5e6, st: { ice: .25 },   pas: 'freeze',  req: { berry: 60, dalbhat: 10 } },
  { id: 'cloudFth',  n: 'Cloud Feather',     i: 'amulet', col: 'cloud', cost: 5e6, st: { cloud: .25 }, pas: 'updraft', req: { apple: 40, walnut: 10, dalbhat: 10 } },
  { id: 'mountainHt',n: 'Mountain Heart',    i: 'amulet', cost: 3e8,   st: { gather: .2 }, pas: 'renewal', req: { gem: 40, goldenMomo: 2 } }
];
/* passives charge up as abilities of a color fire (auto abilities and bubbles you collect) */
const PASSIVES = {
  wildfire:    { n: 'Inferno',         col: 'spice', need: 30, d: 'Every 30 Spice abilities: every flame in your field erupts (x3 around it) and +100% Spice gathering for 15s.' },
  polar:       { n: 'Polar Power',     col: 'ice',   need: 30, d: 'Every 30 Ice abilities: +100% Ice gathering and +10% crit for 15s, and 6 bubbles rise around you.' },
  cloudburst:  { n: 'Electrify',       col: 'cloud', need: 50, cd: 45, d: 'Every 50 Lightning abilities: your field is electrified for 15s and its flowers do not run down at all. 45s cooldown.' },
  vajra:       { n: 'Vajra',           col: 'always', need: 0, d: 'Every 3rd swing releases a lightning bolt that strikes near you at x2 tool power. If you stand inside a lightning pole, the bolt runs to it instead, through every connected pole, and adds Storm Charge: +0.002 with 1 pole, +0.006 with 2, +0.01 with 3, +0.016 with 4, +0.02 with 5 or more.' },
  spirit:      { n: 'Mountain Spirit', col: 'any',   need: 50, d: 'Every 50 abilities: +100% to all gathering for 20s.' },
  herd:        { n: 'Herd Call',       col: 'cloud', need: 20, d: 'Every 20 Cloud abilities: your crew move 50% faster for 15s.' },
  spark:       { n: 'Spark',           col: 'spice', need: 20, d: 'Every 20 Spice abilities: a Chili Burst explodes around you.' },
  freeze:      { n: 'Freeze',          col: 'ice',   need: 20, d: 'Every 20 Ice abilities: 3 Frost Marks appear around you.' },
  updraft:     { n: 'Updraft',         col: 'cloud', need: 20, d: 'Every 20 Cloud abilities: a Kite Gust sweeps your field.' },
  renewal:     { n: 'Renewal',         col: 'any',   need: 40, d: 'Every 40 abilities: every flower in your field regrows instantly.' },
  strike:      { n: 'Ring of Fire',    col: 'spice', need: 25, cd: 30, d: 'Every 25 Spice abilities: 16 flames burst up in a ring around you and burn for 18s. 30s cooldown.' },
  stomp:       { n: 'Yeti Stomp',      col: 'ice',   need: 20, d: 'Every 20 Ice abilities: giant Yeti Steps around you.' },
  dance:       { n: 'Wind Dance',      col: 'cloud', need: 20, d: 'Every 20 Cloud abilities: a strong wind runs along every prayer flag line at x4, and a Kite Gust sweeps your field.' },
  summitBless: { n: 'Summit Blessing', col: 'any',   need: 30, d: 'Every 30 abilities: a free Blessing (+25% everything for 15s).' },
  kiln:        { n: 'Kiln',            col: 'always', need: 0, d: '15% of everything your flames gather is brewed into rupees on the spot, and every 20s while you gather 6% of your doko is brewed too.' },
  deepfreeze:  { n: 'Deep Freeze',     col: 'always', need: 0, d: 'Chill stacks last 60s instead of 30 and you can hold 40 instead of 20. Popping a bubble inside a Frost Mark gives 2 stacks.' },
  nimbus:      { n: 'Nimbus',          col: 'always', need: 0, d: 'Storm Charge also adds capacity: +25% per full +1 (up to +75%).' }
};
/* crafting materials drop while gathering in each field */
/* fruits: drop while gathering (by flower color), from quests and sprouts */
const FRUITS = {
  chili:  { n: 'Chili',         i: 'chili', col: 'spice' },
  berry:  { n: 'Glacier Berry', i: 'berry', col: 'ice' },
  apple:  { n: 'Mustang Apple', i: 'apple', col: 'cloud' },
  walnut: { n: 'Walnut',        i: 'walnut' },
  gem:    { n: 'Summit Gem',    i: 'gem' }
};
const OLD_MAT = { teaLeaf: 'apple', wool: 'apple', ginger: 'chili', petal: 'chili', ice: 'berry', saffron: 'walnut', bead: 'walnut' };
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
/* blender recipes */
const BLENDS = [
  { out: 'spiceShot',   req: { chili: 25, momo: 5 } },
  { out: 'glacierShard',req: { berry: 25, momo: 5 } },
  { out: 'yakCheese',   req: { apple: 25, momo: 5 } },
  { out: 'butterTea',   req: { apple: 10, selroti: 2 } },
  { out: 'butterDrop',  req: { apple: 15, berry: 5 } },
  { out: 'incense',     req: { walnut: 4, selroti: 5 } },
  { out: 'masala',      req: { chili: 20, apple: 20, dalbhat: 3 } },
  { out: 'goldenTea',   req: { walnut: 12, chili: 10, berry: 10, apple: 10, dalbhat: 5 } },
  { out: 'mysticWheel', req: { walnut: 10, berry: 20, chili: 20 } },
  { out: 'goldenMomo',  req: { mysticWheel: 5, gem: 8, dalbhat: 20 } }
];

const DOKOS = [
  { id: 'basket', n: 'Bamboo Basket',   i: 'basket',   cost: 0,     cap: 200 },
  { id: 'woven',  n: 'Woven Doko',      i: 'basket',   cost: 1500,  cap: 1000 },
  { id: 'frame',  n: 'Porter Frame',    i: 'backpack', cost: 2e4,   cap: 6000 },
  { id: 'saddle', n: 'Yak Saddlebag',   i: 'backpack', cost: 2.5e5, cap: 30000 },
  { id: 'exped',  n: 'Expedition Pack', i: 'backpack', cost: 3e6,   cap: 1.5e5 },
  { id: 'glacier',n: 'Glacier Pack',    i: 'backpack', cost: 4e7,   cap: 6e5 },
  { id: 'spirit', n: 'Spirit Satchel',  i: 'backpack', cost: 2.5e8,   cap: 8e6 },
  { id: 'kiln',   n: 'Ember Kiln Pack', i: 'backpack', col: 'spice', cost: 1.2e9, cap: 3.2e7,   pas: 'kiln',       req: { chili: 150, walnut: 80, goldenMomo: 3 } },
  { id: 'vault',  n: 'Glacier Vault',   i: 'backpack', col: 'ice',   cost: 1.2e9, cap: 4e7, pas: 'deepfreeze', req: { berry: 230, goldenMomo: 3 } },
  { id: 'nimbus', n: 'Copper Urn',      i: 'backpack', col: 'cloud', cost: 1.2e9, cap: 4e7,   pas: 'nimbus',     req: { apple: 150, walnut: 80, goldenMomo: 3 } }
];
const BOOTS = [
  { id: 'sandals', n: 'Sandals',      i: 'boot', cost: 0,   spd: 120 },
  { id: 'runners', n: 'Trail Runners',i: 'boot', cost: 3e3, spd: 145 },
  { id: 'crampon', n: 'Crampons',     i: 'boot', cost: 8e4, spd: 170 },
  { id: 'sherpa',  n: 'Sherpa Boots', i: 'boot', cost: 2e6, spd: 195 },
  { id: 'wind',    n: 'Wind Boots',   i: 'boot', cost: 6e7, spd: 225 }
];
const LODGE = [
  { n: 'No manager',      eff: .10, cost: 0 },
  { n: 'Mansoon\'s cousin',  eff: .15, cost: 1e4 },
  { n: 'Lodge Manager',   eff: .22, cost: 2e5 },
  { n: 'Head of Lodge',   eff: .30, cost: 5e6 },
  { n: 'Mountain Tycoon', eff: .40, cost: 1e8 }
];

/* shops on the map: each zone sells gear for its stage of the game */
const SHOPS = [
  { id: 'bazaar',    n: 'Base Bazaar',      col: '#ff8a3d', x: 800,  y: 5300, z: 0, sells: { tool: ['sickle', 'trowel', 'rake', 'hook', 'axe', 'scoop', 'shears'], doko: ['basket', 'woven', 'frame'], boots: ['sandals', 'runners'], hat: ['woolCap', 'gingerTopi', 'iceHood'] }, extra: ['supplies', 'lodge'] },
  { id: 'outfitter', n: 'Forest Outfitter', col: '#3fae6b', x: 1250, y: 3600, z: 1, sells: { tool: ['broom', 'staff'], doko: ['saddle', 'exped'], boots: ['crampon'], hat: ['sherpaHat'] }, extra: ['sprinklers'] },
  { id: 'smithy',    n: 'Pasture Smithy',   col: '#b0784a', x: 1750, y: 2700, z: 2, sells: { tool: ['esickle', 'gpick', 'crake', 'claw'], doko: ['glacier'], boots: ['sherpa'] } },
  { id: 'snowshop',  n: 'Snowline Lodge',   col: '#2ea4dc', x: 420,  y: 1450, z: 3, sells: { tool: ['talon', 'scythe', 'fan', 'wheel'], doko: ['spirit'], boots: ['wind'], hat: ['emberCrown', 'frostCrown', 'cloudCrown'] } },
  { id: 'shrine',    n: 'Summit Shrine',    col: '#9b6ef3', x: 600,  y: 1150, z: 4, sells: { tool: ['banner'], doko: ['kiln', 'vault', 'nimbus'], hat: ['spiritMask'] } }
];
const SLOT_N = { tool: 'Tools', doko: 'Bags', boots: 'Boots', hat: 'Hats' };

/* Mandala generator (replaces charms). Tiers need Blessed crew; lines roll randomly; Celestial rolls a main passive */
const MANDALA_TIERS = [
  { id: 'copper',    n: 'Copper Mandala',    col: '#c97a3d', bl: 1,  cost: 25000, req: {},              lines: 2, mul: 1 },
  { id: 'silver',    n: 'Silver Mandala',    col: '#9aa7b8', bl: 3,  cost: 5e5,   req: {},           lines: 3, mul: 1.6 },
  { id: 'gold',      n: 'Golden Mandala',    col: '#f0b429', bl: 6,  cost: 1e7,   req: {},           lines: 4, mul: 2.4 },
  { id: 'turquoise', n: 'Turquoise Mandala', col: '#1abc9c', bl: 10, cost: 1e8, req: {}, lines: 5, mul: 3.5 },
  { id: 'celestial', n: 'Celestial Mandala', col: '#9b6ef3', bl: 15, cost: 1.5e9, req: {}, lines: 6, mul: 5, star: true }
];
const MANDALA_STATS = [
  ['spice', .05, .12], ['ice', .05, .12], ['cloud', .05, .12], ['cap', .05, .12],
  ['crit', .01, .03], ['brew', .05, .1], ['cdr', .02, .05], ['conv', .01, .03], ['speed', .02, .05], ['tool', .05, .12]
];
/* six star passives (Celestial only). Main stars power a color, side stars help everyone.
   A double always pairs one main with one side. */
const MANDALA_PAS = {
  blazingStar: { n: 'Blazing Star', col: 'spice', main: true, d: 'Flames last twice as long, burn twice as often, count x2 inside instead of x1.5 (Dark Flames x3), and Heat builds 50% faster.' },
  glacierStar: { n: 'Glacier Star', col: 'ice',   main: true, d: 'Permanently x1.25 capacity while you are in an Ice field. Every 45th Ice Boost bubble you collect (1 minute cooldown) summons the Glacier Star for 45s: x2 Ice gathering and +10% instant Ice conversion, plus 2 minutes of Ice Swell. Every bubble you pop while it shines adds +1% (up to x3) and 4s of Ice Swell. When it fades it leaves bubbles behind, more for every bubble popped.' },
  butterStar:  { n: 'Vajra Star',   col: 'cloud', main: true, d: 'Your Vajra Staff releases a lightning bolt every 2nd swing instead of every 3rd.' },
  guidingStar: { n: 'Wayfinder Star', col: 'any', main: false, d: 'Every 250 boost bubbles you collect (Spice, Ice or Cloud Boost), a random open field becomes your wayfinder field for 10 minutes: x2.5 gathering there.' },
  starSaw:     { n: 'Chakra Saw',   col: 'any',   main: false, d: 'Use 3 Marigolds to spin up a Chakra Saw for 30s (the third Marigold is given back). While it spins it brews ingredients straight out of your doko into rupees, about 60 times as fast as you have been gathering lately, so the stronger your build gathers, the more it brews. It never adds to your doko.' },
  starShower:  { n: 'Comet Rain',   col: 'any',   main: false, d: 'Every 45s while you gather, 10 green circles appear across the field and a comet lands on each one. Stand in a circle when its comet lands for Inspire: x2 gathering for 5s, and every further comet adds +1x (up to x11).' }
};
const OLD_STAR = { kilnStar: 'blazingStar', cometStar: 'blazingStar', blazingStar: 'blazingStar', glacierStar: 'glacierStar', frostStar: 'glacierStar', bubbleStar: 'glacierStar', cloudStar: 'butterStar', butterStar: 'butterStar', pilgrimStar: 'guidingStar' };

/* sprinklers: water a circle of flowers (faster regrowth + gathering bonus) */
/* Bee Swarm style: each tier gives a set number of sprinklers; the top one is a single, very strong one */
const SPRINKLERS = [
  { n: 'Bamboo Sprinkler',  cnt: 1, r: 75,  wet: 1.25, rg: 3,   cost: 3000 },
  { n: 'Copper Sprinklers', cnt: 2, r: 80,  wet: 1.3,  rg: 3.5, cost: 5e4 },
  { n: 'Silver Sprinklers', cnt: 3, r: 85,  wet: 1.4,  rg: 4,   cost: 6e5 },
  { n: 'Golden Sprinklers', cnt: 4, r: 95,  wet: 1.5,  rg: 5,   cost: 8e6 },
  { n: 'Spirit Saturator',  cnt: 1, r: 185, wet: 2,    rg: 30,  cost: 2.5e8 }
];
const SPR_MAX = 4;

const BUFFS = {
  haste:      { n: 'Haste',        i: 'speed',   d: 'You and your crew move 20% faster per stack.' },
  spiceRush:  { n: 'Spice Rush',   i: 'chili',   d: '+50% gathering from Spice (red) flowers.' },
  focus:      { n: 'Focus',        i: 'focus',   d: '+15% crit chance, and crits give x2.5.' },
  roar:       { n: 'Roar',         i: 'roar',    d: 'Your crew gather 50% faster.' },
  caravan:    { n: 'Caravan Rush', i: 'horns',   d: 'Yaks gather x2 and move faster.' },
  blessing:   { n: 'Blessing',     i: 'sparkle', d: '+25% to all gathering and brewing.' },
  shot_spice: { n: 'Chili Extract',i: 'bottle',  d: 'Spice gathering x1.25.' },
  shot_ice:   { n: 'Berry Extract',i: 'crystal', d: 'Ice gathering x1.25.' },
  shot_cloud: { n: 'Apple Extract',i: 'cheese',  d: 'Cloud gathering x1.25.' },
  gtea:       { n: 'Golden Tea',   i: 'cup',     d: 'All gathering x1.15.' },
  masala:     { n: 'Masala Tonic', i: 'bottle',  d: '+8% instant conversion.' },
  incense:    { n: 'Incense',      i: 'incense', d: 'Abilities recharge 50% faster.' },
  wildfire:   { n: 'Inferno',      i: 'flame',   d: '+100% Spice gathering.' },
  heat:       { n: 'Heat',         i: 'flame',   d: '+1% Spice gathering per stack, up to 100. Builds while you stand in flames (twice as fast in Dark Flames) and cools down when you step out.' },
  darkheat:   { n: 'Dark Heat',    i: 'flame',   d: '+1% Super Crit chance and +0.5% instant conversion per stack. Equal to the number of Dark Flames burning right now (max 50).' },
  precision:  { n: 'Precision',    i: 'focus',   d: '+0.5% chance per stack (up to 20%) that a crit becomes a Super Crit: it doubles again and is brewed straight into rupees.' },
  chill:      { n: 'Chill',        i: 'snow',    d: '+1% Ice gathering per stack.' },
  popstar:    { n: 'Glacier Star', i: 'snow',    d: 'x2 Ice gathering (+1% per bubble popped, up to x3) and +10% instant Ice conversion.' },
  swell:      { n: 'Ice Swell',    i: 'drop',    d: 'Up to x5 capacity in Ice fields and x5 brewing speed at the teahouse. Stronger the more time is left (full at 1 hour).' },
  lbless:     { n: 'Lantern Blessing', i: 'diya', d: 'From the teahouse lantern: +3% capacity and +1.5% teahouse brewing value per stack (x4 and x2.5 at 100).' },
  nimbusb:    { n: 'Nimbus',       i: 'cloud',   d: '+2% capacity per stack.' },
  inspire:    { n: 'Inspire',      i: 'sparkle', d: 'All gathering multiplied by (1 + stacks): x2 at one stack. Lasts 5s, refreshed by more comets or Inspire bubbles.' },
  saw:        { n: 'Chakra Saw',   i: 'star',    d: 'A spinning saw circles you and brews your doko into rupees.' },
  kukur:      { n: 'Kukur Puja',   i: 'paw',     d: '+50% to all gathering.' },
  litfield:   { n: 'Lit field',    i: 'diya',    d: 'You lit every diya in this field: +50% gathering here until the night ends.' },
  storm:      { n: 'Storm Charge', i: 'bolt',    d: 'Lightning gathering and tool swing speed, up to x4 each. Built by Vajra bolts running through lightning poles. Lasts 1 hour, refreshed every time it grows.' },
  drum:       { n: 'Thunder Drum', i: 'drum',    d: '+25% tool swing speed per stack.' },
  reach:      { n: 'Long Reach',   i: 'tool',    d: 'Tool reach +50% for the next swings.' },
  sfork:      { n: 'Spark Fork',   i: 'bolt',    d: 'Your next Vajra bolts strike 3 times.' },
  polar:      { n: 'Polar Power',  i: 'snow',    d: '+100% Ice gathering and +10% crit chance.' },
  cloudburst: { n: 'Thunderstorm', i: 'bolt',    d: 'Tool reach x1.5.' },
  electric:   { n: 'Electrified',  i: 'bolt',    d: 'Flowers in your field do not run down.' },
  spirit:     { n: 'Mountain Spirit', i: 'mountain', d: '+100% to all gathering.' },
  herd:       { n: 'Herd Call',    i: 'horns',   d: 'Your crew move 50% faster.' },
  comet:      { n: 'Comet',        i: 'star',    d: 'Every crit hits x5.' },
  boost_spice:{ n: 'Spice Boost',  i: 'flame',   d: 'Spice gathering +10% per stack.' },
  boost_ice:  { n: 'Ice Boost',    i: 'snow',    d: 'Ice gathering +10% per stack.' },
  boost_cloud:{ n: 'Cloud Boost',  i: 'cloud',   d: 'Cloud gathering +10% per stack.' },
  love:       { n: 'Little Love',  i: 'heart',   d: 'All gathering x1.5.' },
  bear:       { n: 'Bear Morph',   i: 'paw',     d: 'Tool x2, reach +30%, speed +20%.' }
};

const ITEMS = {
  chili: { n: 'Chili', i: 'chili', d: 'Fruit. Drops from red Spice flowers. Blend it or craft with it.', mat: true },
  berry: { n: 'Glacier Berry', i: 'berry', d: 'Fruit. Drops from blue Ice flowers.', mat: true },
  apple: { n: 'Mustang Apple', i: 'apple', d: 'Fruit. Drops from white Cloud flowers.', mat: true },
  walnut: { n: 'Walnut', i: 'walnut', d: 'Rare fruit. Drops in the High Pasture and above.', mat: true },
  gem: { n: 'Summit Gem', i: 'gem', d: 'Very rare. Drops on the Summit Glacier.', mat: true },
  momo:        { n: 'Momo',          i: 'momo', d: 'Crew food. +10 bond.', price: 40 },
  selroti:     { n: 'Sel Roti',      i: 'ring', d: 'Crew food. +40 bond.', price: 200 },
  dalbhat:     { n: 'Dal Bhat',      i: 'bowl', d: 'Crew food. +200 bond. Dal bhat power, 24 hour.', price: 1200 },
  butterTea:   { n: 'Butter Tea',    i: 'cup', d: 'Haste x3 for 3 minutes. Using more adds time.', price: 600, use: true },
  spiceShot:   { n: 'Chili Extract', i: 'bottle', d: 'Spice gathering x1.25 for 10 minutes. Using more adds time (up to 1 hour).', price: 2500, use: true },
  glacierShard:{ n: 'Berry Extract', i: 'crystal', d: 'Ice gathering x1.25 for 10 minutes. Using more adds time (up to 1 hour).', price: 2500, use: true },
  yakCheese:   { n: 'Apple Extract', i: 'cheese', d: 'Cloud gathering x1.25 for 10 minutes. Using more adds time (up to 1 hour).', price: 2500, use: true },
  incense:     { n: 'Incense',       i: 'incense', d: 'Abilities recharge 50% faster for 5 minutes. Using more adds time.', price: 8000, use: true },
  goldenTea:   { n: 'Golden Tea',    i: 'cup', d: 'All gathering x1.15 for 15 minutes. Blend only.', use: true },
  masala:      { n: 'Masala Tonic',  i: 'bottle', d: '+8% instant conversion for 10 minutes. Blend only.', use: true },
  lotusSeed:   { n: 'Lotus Seed',    i: 'sprout', d: 'Plant it to grow a sprout in the field you stand in. Planted sprouts are rarer than wild ones.', use: true },
  marigold:    { n: 'Marigold',      i: 'marigold', d: 'Tihar festival flower. Light the great lantern on Diyo Night for 1 to 10 (higher fields give more). With the Chakra Saw star, using 3 spins up the saw. Also spent at the Tihar Stall.', use: true },
  garland:     { n: 'Marigold Garland', i: 'garland', d: 'Welcomes the Tihar Dog into your crew. Needs a free bed.', use: true },
  tilak:       { n: 'Kukur Tilak',   i: 'paw', d: 'A red tilak from a stray dog you befriended on Diyo Night. The Tihar Stall needs 5 of them, plus marigolds, for a Marigold Garland.' },
  butterDrop:  { n: 'Butter Drop',   i: 'drop',    d: 'Drops a pool of yak butter (radius 110) where you stand for 40s. Gathering inside x2, and Cloud crew gather x1.8 more.', price: 15000, use: true },
  permit:      { n: 'Trekking Permit', i: 'ticket', d: 'Recruit a random crew member into an empty bed.' },
  mysticWheel: { n: 'Mystic Wheel',  i: 'wheel', d: 'Reroll a crew member. Never gives Commons.' },
  goldenMomo:  { n: 'Golden Momo',   i: 'star', d: 'Makes a crew member Blessed.', price: 2.5e5 }
};

const PERMIT_ODDS = { common: .87, rare: .10, epic: .025, legendary: .005, mythic: 0 };   /* Bee Swarm basic egg */
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
  { id: 'rainbow',     n: 'Rainbow Lodge',     i: 'rainbow', req: 'A Legendary+ crew of each color: Spice, Ice and Cloud', d: '+15% doko capacity.', chk: (k, c) => ['spice', 'ice', 'cloud'].every(col => c.some(m => CREW[m.id].c === col && RAR[CREW[m.id].r].o >= 3 && RAR[CREW[m.id].r].o <= 4)) },
  { id: 'fullHouse',   n: 'Full House',        i: 'bed', req: 'Every bed filled (10+ beds)',             d: '+5% instant conversion.',                  chk: (k, c, beds) => beds >= 10 && c.length >= beds },
  { id: 'fireworks',   n: 'Fireworks',         i: 'burst', req: 'Firecracker Kid + Chili Cook',            d: 'Firecracker combos go up to 15 and Chili Bursts leave twice as many flames.', chk: k => k.fireKid && k.chiliCook },
  { id: 'deepWater',   n: 'Deep Water',        i: 'drop',  req: 'Lake Naga + Ice Fisher',                  d: 'Bubble Bloom makes 12 bubbles instead of 8.', chk: k => k.naga && k.iceFisher },
  { id: 'teaCeremony', n: 'Tea Ceremony',      i: 'cup',   req: 'Tea Master + Tea Picker + Water Carrier', d: 'Tea Marks convert 50% instead of 35%.', chk: k => k.teaMaster && k.teaPicker && k.waterCarrier },
  { id: 'blessedTrio', n: 'Blessed Trio',      i: 'halo', req: '3+ Blessed crew',                         d: 'All Blessed passives ×1.5.',              chk: (k, c) => c.filter(m => m.bl).length >= 3 }
];

const HIVE = {
  spice: { n: 'Spice Teahouse', i: 'flame', d: 'Ability cooldowns −15%, +5% crit chance. Rewards active play.' },
  ice:   { n: 'Ice Teahouse',   i: 'snow', d: '+30% rupees from brewing, +20% offline earnings. Great for idle days.' },
  cloud: { n: 'Cloud Teahouse', i: 'cloud', d: 'Your tool gathers ×1.5, +15% doko capacity. For hands-on farming.' }
};

/* ---------------- quest givers (on the map) ---------------- */
const GIVERS = {
  didi:  { n: 'Mansoon',     role: 'Teahouse owner',       x: 1225, y: 5460, col: '#ff8a3d', gate: 0, hi: 'Namaste! The kettle never sleeps, and neither should you.' },
  pemba: { n: 'Old Pemba',   role: 'Retired Sherpa',        x: 920, y: 4760, col: '#2ea4dc', gate: 0, hi: 'Forty summits, little one. Let me teach you about crews.' },
  dolma: { n: 'Dolma',       role: 'Yak herder',            x: 500, y: 4260, col: '#3fae6b', gate: 5, hi: 'My yaks know every flower on this mountain.' },
  norbu: { n: 'Lama Norbu',  role: 'Keeper of the chorten', x: 560, y: 2960, col: '#9b6ef3', gate: 10, hi: 'Harmony between your crew is the real summit.' },
  prof:  { n: 'Professor Yak',role: 'Mountain scientist',   x: 1660, y: 3000, col: '#2ea4dc', gate: 10, hi: 'Ah, a field assistant! My research needs data, and the results make your teahouse permanently better.' },
  yeti:  { n: 'Grandpa Yeti',role: 'Guardian of the peak',  x: 1650, y: 830, col: '#4fb6e6', gate: 25, hi: 'Hrrm. Few climb this high. Fewer bring tea.' }
};
/* Old Snow Leopard Lady: endless quests, each one +1% gathering forever */
const REPEAT = {
  leopard: { n: 'Old Snow Leopard Lady', role: 'Endless quests', x: 1700, y: 4000, col: '#8e9bd6', gate: 5, rep: true,
             hi: 'Purr. Fetch for an old cat, and the field you worked in will remember it. Every favour adds +1% to that field forever.',
             rw: () => pick([{ chili: ri(3, 6) }, { berry: ri(3, 6) }, { apple: ri(3, 6) }, { momo: ri(4, 8) }, { chili: 2, berry: 2, apple: 2 }, { selroti: ri(1, 3) }, { walnut: 1 }]) }
};
const ri = (a, b) => a + Math.floor(Math.random() * (b - a + 1));

/* Mansoon's three questlines: early, mid and late. Each line waits for a crew size. */
const Q_EARLY = [
  { t: 'Gather 100 ingredients',               g: ['gather', 100],              rw: { items: { momo: 5 }, rp: 100 } },
  { t: 'Brew tea worth 500 rupees',            g: ['earn', 500],                rw: { items: { permit: 1 } } },
  { t: 'Gather 300 in Tea Garden',             g: ['field', 'tea', 300],        rw: { items: { apple: 3, momo: 3 } } },
  { t: 'Have 4 crew',                          g: ['crew', 4],                  rw: { rp: 300, items: { butterTea: 2 } } },
  { t: 'Gather 500 in Glacier Spring',         g: ['field', 'glacier', 500],    rw: { items: { berry: 4 } } },
  { t: 'Feed your crew 5 times',               g: ['feed', 5],                  rw: { items: { selroti: 3 } } },
  { t: 'Gather 800 in Ginger Terraces',        g: ['field', 'ginger', 800],     rw: { items: { chili: 5 } } },
  { t: 'Buy the Bamboo Rake',                  g: ['tool', 'rake'],             rw: { rp: 1000 } },
  { t: 'Gather 1,500 Spice ingredients',       g: ['col', 'spice', 1500],       rw: { items: { spiceShot: 1, momo: 5 } } },
  { t: 'Gather 1,500 Ice ingredients',         g: ['col', 'ice', 1500],         rw: { items: { glacierShard: 1, momo: 5 } } },
  { t: 'Gather 1,500 Cloud ingredients',       g: ['col', 'cloud', 1500],       rw: { items: { yakCheese: 1, momo: 5 } } },
  { t: 'Have 5 crew',                          g: ['crew', 5],                  rw: { items: { mysticWheel: 1 } } },
  { t: 'Gather 3,000 in Marigold Meadow',      g: ['field', 'bazaar', 3000],    rw: { items: { dalbhat: 2, momo: 10 } } },
  { t: 'Grab 15 ability bubbles',              g: ['tokens', 15],               rw: { items: { incense: 1, chili: 5, berry: 5 } } },
  { t: 'Brew tea worth 15,000 rupees',         g: ['earn', 15000],              rw: { items: { dalbhat: 3 } } },
  { t: 'Gather 12,000 ingredients',            g: ['gather', 12000],            rw: { items: { permit: 1, mysticWheel: 1 } } }
];
const Q_MID = [
  { t: 'Gather 8,000 in Yak Meadow',           g: ['field', 'meadow', 8000],    rw: { items: { apple: 10, momo: 10 } } },
  { t: 'Gather 8,000 in Rhododendron Forest',  g: ['field', 'rhodo', 8000],     rw: { items: { chili: 10, selroti: 3 } } },
  { t: 'Gather 8,000 in Turquoise Lake',       g: ['field', 'lake', 8000],      rw: { items: { berry: 10, selroti: 3 } } },
  { t: 'Blend 3 things at the Blender',        g: ['blend', 3],                 rw: { items: { walnut: 5, butterTea: 2 } } },
  { t: 'Gather 25,000 Cloud ingredients',      g: ['col', 'cloud', 25000],      rw: { items: { yakCheese: 2 } } },
  { t: 'Gather 25,000 Spice ingredients',      g: ['col', 'spice', 25000],      rw: { items: { spiceShot: 2 } } },
  { t: 'Gather 25,000 Ice ingredients',        g: ['col', 'ice', 25000],        rw: { items: { glacierShard: 2 } } },
  { t: 'Gather 40,000 in Juniper Ridge',       g: ['field', 'juniper', 4e4],    rw: { items: { dalbhat: 4 } } },
  { t: 'Grab 60 ability bubbles',              g: ['tokens', 60],               rw: { items: { incense: 2 } } },
  { t: 'Brew tea worth 300,000 rupees',        g: ['earn', 3e5],                rw: { items: { mysticWheel: 2, walnut: 5 } } },
  { t: 'Gather 100,000 in Juniper Ridge',      g: ['field', 'juniper', 1e5],    rw: { items: { dalbhat: 5, apple: 20 } } },
  { t: 'Get a crew member to level 8',         g: ['level', 8],                 rw: { items: { masala: 2 } } },
  { t: 'Gather 150,000 ingredients',           g: ['gather', 1.5e5],            rw: { items: { dalbhat: 4, walnut: 4 } } },
  { t: 'Have 15 crew',                         g: ['crew', 15],                 rw: { items: { goldenTea: 1, mysticWheel: 2 } } },
  { t: 'Gather 250,000 in Yak Meadow',         g: ['field', 'meadow', 2.5e5],   rw: { items: { walnut: 10, dalbhat: 5 } } },
  { t: 'Brew tea worth 5M rupees',             g: ['earn', 5e6],                rw: { items: { goldenMomo: 1, mysticWheel: 3 } } }
];
const Q_LATE = [
  { t: 'Gather 500,000 in Prayer Flag Pass',   g: ['field', 'flags', 5e5],      rw: { items: { apple: 30, dalbhat: 5 } } },
  { t: 'Gather 500,000 in Ember Rocks',        g: ['field', 'ember', 5e5],      rw: { items: { chili: 30, dalbhat: 5 } } },
  { t: 'Gather 500,000 in Frost Hollow',       g: ['field', 'frost', 5e5],      rw: { items: { berry: 30, dalbhat: 5 } } },
  { t: 'Gather 500,000 in Saffron Cliffs',     g: ['field', 'saffron', 5e5],    rw: { items: { walnut: 15, mysticWheel: 3 } } },
  { t: 'Gather 2M Spice ingredients',          g: ['col', 'spice', 2e6],        rw: { items: { spiceShot: 4 } } },
  { t: 'Gather 2M Ice ingredients',            g: ['col', 'ice', 2e6],          rw: { items: { glacierShard: 4 } } },
  { t: 'Gather 2M Cloud ingredients',          g: ['col', 'cloud', 2e6],        rw: { items: { yakCheese: 4 } } },
  { t: 'Blend 15 things at the Blender',       g: ['blend', 15],                rw: { items: { goldenTea: 2, gem: 3 } } },
  { t: 'Grab 300 ability bubbles',             g: ['tokens', 300],              rw: { items: { incense: 4, mysticWheel: 5 } } },
  { t: 'Brew tea worth 50M rupees',            g: ['earn', 5e7],                rw: { items: { goldenMomo: 1 } } },
  { t: 'Gather 3M in Summit Glacier',          g: ['field', 'summit', 3e6],     rw: { items: { gem: 5, mysticWheel: 2 } } },
  { t: 'Have 25 crew',                         g: ['crew', 25],                 rw: { items: { mysticWheel: 10 } } },
  { t: 'Gather 10M ingredients',               g: ['gather', 1e7],              rw: { items: { goldenTea: 3, masala: 3 } } },
  { t: 'Gather 5M in Summit Glacier',          g: ['field', 'summit', 5e6],     rw: { items: { goldenMomo: 2 } } },
  { t: 'Brew tea worth 1B rupees',             g: ['earn', 1e9],                rw: { items: { mysticWheel: 25, gem: 10 } } },
  { t: 'Gather 25M ingredients',               g: ['gather', 2.5e7],            rw: { crew: 'bear', items: { goldenMomo: 3 } } }
];
const QLINES = [{ n: 'Early questline', need: 0 }, { n: 'Mid questline', need: 10 }, { n: 'Late questline', need: 20 }];

/* Professor Yak: a short list of research quests that give permanent boosts */
const Q_PROF = [
  { t: 'Gather 5,000 in Turquoise Lake',       g: ['field', 'lake', 5000],      rw: { perm: { ice: .03 } } },
  { t: 'Blend 5 things at the Blender',        g: ['blend', 5],                 rw: { perm: { cap: .05 } } },
  { t: 'Grab 40 ability bubbles',              g: ['tokens', 40],               rw: { perm: { cdr: .05 } } },
  { t: 'Gather 60,000 Spice ingredients',      g: ['col', 'spice', 6e4],        rw: { perm: { crit: .02 } } },
  { t: 'Gather 60,000 Ice ingredients',        g: ['col', 'ice', 6e4],          rw: { perm: { brew: .05 } } },
  { t: 'Gather 60,000 Cloud ingredients',      g: ['col', 'cloud', 6e4],        rw: { perm: { tool: .1 } } },
  { t: 'Have 3 Blessed crew',                  g: ['blessed', 3],               rw: { perm: { conv: .03 } } },
  { t: 'Gather 1M in Frost Hollow',            g: ['field', 'frost', 1e6],      rw: { perm: { conv: .02 } } },
  { t: 'Grab 500 ability bubbles',             g: ['tokens', 500],              rw: { perm: { cap: .1 } } },
  { t: 'Gather 5M in Summit Glacier',          g: ['field', 'summit', 5e6],     rw: { perm: { cap: .15, speed: .05 } } }
];

const QUESTS_OLD_DIDI = [
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
];
const QUESTS = {
  didi: [...Q_EARLY.map(q => ({ ...q, line: 0 })), ...Q_MID.map(q => ({ ...q, line: 1 })), ...Q_LATE.map(q => ({ ...q, line: 2 }))],
  prof: Q_PROF,
  pemba: [
    { t: 'Gather 8,000 in Rhododendron Forest',  g: ['field', 'rhodo', 8000],     rw: { items: { selroti: 5, momo: 10 } } },
    { t: 'Get a crew member to level 5',         g: ['level', 5],                 rw: { rp: 5000, items: { selroti: 5 } } },
    { t: 'Have 10 crew',                         g: ['crew', 10],                 rw: { items: { mysticWheel: 2 } } },
    { t: 'Get a crew member to level 10',        g: ['level', 10],                rw: { items: { dalbhat: 15 } } },
    { t: 'Have 15 crew',                         g: ['crew', 15],                 rw: { crew: 'kiteFlyer' } },
    { t: 'Have 25 crew',                         g: ['crew', 25],                 rw: { items: { mysticWheel: 3, goldenMomo: 1 } } },
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

/* ---------------- sprouts ---------------- */
const SPROUT = {
  common:    { n: 'Sprout',           c: '#6cc87a', hp: 3,  drops: 4,  o: 0, s: 1 },
  rare:      { n: 'Rare Sprout',      c: '#5aa8ff', hp: 6,  drops: 6,  o: 1, s: 1.12 },
  epic:      { n: 'Epic Sprout',      c: '#b06cff', hp: 12, drops: 9,  o: 2, s: 1.25 },
  legendary: { n: 'Legendary Sprout', c: '#ffb020', hp: 25, drops: 13, o: 3, s: 1.42 },
  mythic:    { n: 'Mythic Sprout',    c: '#ff4fa3', hp: 50, drops: 20, o: 4, s: 1.6 }
};
/* Bee Swarm sprout pollen (rare 250k, epic 2.5M, legendary 10M; common and mythic estimated), x(1 + zone) in higher fields.
   Low-capacity players still get the old capacity-based amount if it is smaller. */
const SPROUT_HP = { common: 5e4, rare: 2.5e5, epic: 2.5e6, legendary: 1e7, mythic: 5e7 };
const LANTERN_HP = [3e5, 1.5e6, 6e6, 2e7, 6e7];
const SPROUT_WILD = { common: .55, rare: .27, epic: .12, legendary: .05, mythic: .01 };
const SPROUT_SEED = { common: .2, rare: .36, epic: .28, legendary: .13, mythic: .03 };

/* ---------------- badges ---------------- */
const BADGE_T = [{ n: 'Bronze', c: '#c8834a' }, { n: 'Silver', c: '#8f99ab' }, { n: 'Gold', c: '#f0b429' }, { n: 'Diamond', c: '#36b3f0' }, { n: 'Himalayan', c: '#9b6ef3' }];
const BADGE_RW = [{ momo: 5 }, { selroti: 3, walnut: 2 }, { dalbhat: 3, lotusSeed: 1 }, { mysticWheel: 2, lotusSeed: 2 }, { goldenMomo: 1 }];
const BADGE_FIELD = .04;   /* field badges: +4% gathering in that field per tier */
const BADGES = [
  ...FIELDS.map(f => { const b = [5e3, 5e4, 5e5, 5e6, 2e7][f.z]; return { id: 'f_' + f.id, n: f.n, i: 'leaf', t: [b, b * 10, b * 100, b * 1e3, b * 1e4], get: () => S.stats.field[f.id] || 0 }; }),
  { id: 'c_spice', n: 'Spice gatherer', i: 'flame', t: [1e5, 1e6, 1e7, 1e8, 1e9], get: () => S.stats.col.spice || 0 },
  { id: 'c_ice',   n: 'Ice gatherer',   i: 'snow',  t: [1e5, 1e6, 1e7, 1e8, 1e9], get: () => S.stats.col.ice || 0 },
  { id: 'c_cloud', n: 'Cloud gatherer', i: 'cloud', t: [1e5, 1e6, 1e7, 1e8, 1e9], get: () => S.stats.col.cloud || 0 },
  { id: 'rupees',  n: 'Tea money',      i: 'coin',  t: [1e4, 1e6, 1e8, 1e10, 1e12], get: () => S.stats.earn },
  { id: 'time',    n: 'Playtime',       i: 'clock', t: [1, 5, 20, 60, 200], unit: 'h', get: () => S.stats.time / 3600 },
  { id: 'tokens',  n: 'Bubble catcher', i: 'bubble', t: [25, 250, 2500, 1e4, 5e4], get: () => S.stats.tokens || 0 },
  { id: 'crew',    n: 'Big teahouse',   i: 'crew',  t: [5, 10, 20, 30, 50], get: () => S.crew.length },
  { id: 'quests',  n: 'Helping hand',   i: 'flag',  t: [5, 15, 30, 60, 120], get: () => (S.stats.quests || 0) + (S.stats.leo || 0) },
  { id: 'sprouts', n: 'Sprout popper',  i: 'sprout', t: [3, 15, 50, 150, 500], get: () => S.stats.sprouts || 0 },
  { id: 'blends',  n: 'Blender buddy',  i: 'blender', t: [5, 25, 100, 500, 2000], get: () => S.stats.blends || 0 },
  { id: 'tihar',   n: 'Tihar spirit',   i: 'marigold', t: [10, 50, 200, 600, 2000], get: () => S.stats.marigolds || 0 }
];

/* ---------------- Tihar festival ---------------- */
const tiharOn = () => true;   /* permanent festival */
const NIGHT_EVERY = 600, NIGHT_LEN = 150;
const STRAY_CHANCE = .4, TILAK_NEED = 5;
const TIHAR_SHOP = [
  { k: 'garland', p: 40, tilak: TILAK_NEED }, { k: 'lotusSeed', p: 3 }, { k: 'mysticWheel', p: 6 }, { k: 'goldenTea', p: 4 },
  { k: 'incense', p: 2 }, { k: 'dalbhat', p: 1 }, { k: 'goldenMomo', p: 25 }
];
