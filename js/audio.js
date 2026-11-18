'use strict';
/* =========================================================
   CHIYA — sound. Everything is synthesised live with Web Audio:
   no sound files, works offline, tiny download.
   One palette for the whole game: bansuri, sarangi, harmonium,
   madal, jhyamta, singing bowls, temple bells. Every pitched
   effect is tuned to D so it always sits inside the music.
   ========================================================= */
const SND = (() => {
  const ROOT = 293.66;                         // D4
  const hz = s => ROOT * Math.pow(2, s / 12);
  const PENTA = [0, 2, 4, 7, 9];               // D major pentatonic for effects
  const pent = i => PENTA[((i % 5) + 5) % 5] + 12 * Math.floor(i / 5);
  const SCALE1 = [0, 2, 4, 5, 7, 9, 10];       // D Mixolydian (Khamaj), lowlands
  const SCALE2 = [0, 2, 3, 5, 7, 9, 10];       // D Dorian (Kafi), high Himalaya
  const R = (a, b) => a + Math.random() * (b - a);

  let ctx = null, G = null, ready = false, unlocked = false;
  const cfg = { mus: .55, sfx: .8 };
  try { Object.assign(cfg, JSON.parse(localStorage.getItem('chiya_audio') || '{}')); } catch (e) {}
  const vcurve = v => v * v;

  /* ---------- graph ---------- */
  function build(c) {
    ctx = c;
    const comp = c.createDynamicsCompressor();
    comp.threshold.value = -16; comp.knee.value = 10; comp.ratio.value = 4; comp.attack.value = .004; comp.release.value = .25;
    const out = c.createGain(); out.gain.value = .9; out.connect(comp); comp.connect(c.destination);
    const mus = c.createGain(), sfx = c.createGain(), duck = c.createGain(); mus.connect(duck); duck.connect(out); sfx.connect(out);
    const rev = c.createConvolver(); rev.buffer = impulse(c, 2.8, 2.6); const rr = c.createGain(); rr.gain.value = .8; rev.connect(rr); rr.connect(out);
    const mRev = c.createGain(), sRev = c.createGain(); mRev.connect(rev); sRev.connect(rev);
    const nb = c.createBuffer(1, c.sampleRate * 2, c.sampleRate), nd = nb.getChannelData(0); for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
    const pw = (h) => c.createPeriodicWave(new Float32Array(h.length), new Float32Array(h));
    G = { out, mus, duck, sfx, mRev, sRev, noise: nb,
      W: { flute: pw([0, 1, .16, .05, .025, .01]), reed: pw([0, 1, .75, .55, .45, .32, .26, .2, .14, .1, .08, .06]), horn: pw([0, 1, .9, .7, .55, .4, .3, .22, .16]) },
      KS: {} };
    G.fx = strip(sfx, sRev, 1, 0, .22);
    G.fxL = strip(sfx, sRev, 1, -.35, .22);
    G.fxR = strip(sfx, sRev, 1, .35, .22);
    G.fxW = strip(sfx, sRev, 1, 0, .6);        // wetter, for big moments
    applyVol();
  }
  function impulse(c, len, decay) {
    const sr = c.sampleRate, n = Math.floor(sr * len), b = c.createBuffer(2, n, sr);
    for (let ch = 0; ch < 2; ch++) { const d = b.getChannelData(ch); let lp = 0;
      for (let i = 0; i < n; i++) { const x = Math.random() * 2 - 1; lp += (x - lp) * (.35 - .25 * i / n); d[i] = lp * Math.pow(1 - i / n, decay) * (i < sr * .012 ? i / (sr * .012) : 1); } }
    return b;
  }
  function applyVol() {
    if (!G) return; const t = ctx.currentTime;
    G.mus.gain.setTargetAtTime(vcurve(cfg.mus) * .9, t, .05); G.mRev.gain.setTargetAtTime(vcurve(cfg.mus) * .9, t, .05);
    G.sfx.gain.setTargetAtTime(vcurve(cfg.sfx), t, .05); G.sRev.gain.setTargetAtTime(vcurve(cfg.sfx), t, .05);
  }
  function strip(bus, revIn, gain, pan, send) {
    const g = ctx.createGain(); g.gain.value = gain; let n = g;
    if (pan && ctx.createStereoPanner) { const p = ctx.createStereoPanner(); p.pan.value = pan; g.connect(p); n = p; }
    n.connect(bus); if (send) { const s = ctx.createGain(); s.gain.value = send; n.connect(s); s.connect(revIn); }
    return g;
  }

  /* ---------- building blocks ---------- */
  const osc = (type, f) => { const o = ctx.createOscillator(); if (typeof type === 'string') o.type = type; else o.setPeriodicWave(type); if (f) o.frequency.value = f; return o; };
  const gain = v => { const g = ctx.createGain(); g.gain.value = v == null ? 1 : v; return g; };
  const filt = (type, f, q, gn) => { const b = ctx.createBiquadFilter(); b.type = type; b.frequency.value = f; if (q != null) b.Q.value = q; if (gn != null) b.gain.value = gn; return b; };
  const chain = (...n) => { for (let i = 0; i < n.length - 1; i++) n[i].connect(n[i + 1]); return n[0]; };
  function noise(t, dur) { const s = ctx.createBufferSource(); s.buffer = G.noise; s.loop = true; s.start(t, Math.random() * 1.5); s.stop(t + dur + .05); return s; }
  /* linear ADSR that copes with very short notes; returns when the sound is silent */
  function adsr(p, t, dur, v, a, d, s, r) {
    a = Math.min(a, dur * .5); const dd = Math.min(d, Math.max(.001, dur - a)), hold = Math.max(a + dd, dur);
    p.setValueAtTime(0, t); p.linearRampToValueAtTime(v, t + a); p.linearRampToValueAtTime(v * s, t + a + dd);
    p.setValueAtTime(v * s, t + hold); p.linearRampToValueAtTime(0, t + hold + r);
    return t + hold + r;
  }
  function perc(p, t, v, dec, a = .003) { p.setValueAtTime(0, t); p.linearRampToValueAtTime(v, t + a); p.exponentialRampToValueAtTime(.0001, t + a + dec); return t + a + dec; }
  function vib(param, t, dur, f, rate, depth, delay) {
    if (dur < delay + .1) return;
    const l = osc('sine', rate), lg = gain(0); lg.gain.setValueAtTime(0, t + delay); lg.gain.linearRampToValueAtTime(f * depth, t + Math.min(dur, delay + .45));
    l.connect(lg); lg.connect(param); l.start(t); l.stop(t + dur + .3);
  }
  /* generic tone: pitch sweep + exponential decay */
  function tone(t, f, type, dec, v, dest, o = {}) {
    const s = osc(type), g = gain(0); s.frequency.setValueAtTime(f, t);
    if (o.f1) s.frequency.exponentialRampToValueAtTime(o.f1, t + (o.ft || dec * .6));
    const end = perc(g.gain, t, v, dec, o.a || .003); chain(s, g, dest); s.start(t); s.stop(end + .02);
  }
  /* filtered noise burst with optional filter sweep */
  function hiss(t, dur, type, f, q, v, dest, o = {}) {
    const n = noise(t, dur + .1), b = filt(type, f, q), g = gain(0);
    if (o.f1) b.frequency.exponentialRampToValueAtTime(o.f1, t + dur);
    if (o.swell) { g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(v, t + dur * o.swell); g.gain.linearRampToValueAtTime(0, t + dur); }
    else perc(g.gain, t, v, dur, o.a || .002);
    chain(n, b, g, dest);
  }
  /* Karplus-Strong plucked string, cached per note */
  function ks(f, len, br) {
    const sr = ctx.sampleRate, P = Math.max(2, Math.round(sr / f)), N = Math.floor(sr * len), buf = ctx.createBuffer(1, N, sr), d = buf.getChannelData(0), ring = new Float32Array(P);
    let lp = 0, m = 0; for (let i = 0; i < P; i++) { lp += (Math.random() * 2 - 1 - lp) * (.15 + br * .85); ring[i] = lp; m += lp; }
    m /= P; for (let i = 0; i < P; i++) ring[i] -= m;
    const fb = .994 + br * .004; let idx = 0;
    for (let i = 0; i < N; i++) { const a = ring[idx], nI = idx + 1 === P ? 0 : idx + 1; ring[idx] = (a + ring[nI]) * .5 * fb; d[i] = a; idx = nI; }
    const fade = Math.floor(sr * .02); for (let i = 0; i < fade; i++) d[N - 1 - i] *= i / fade;
    return { buf, rate: f / (sr / P) };
  }
  function pluck(t, s, v, dest, br = .55, len = 1.6) {
    const key = s + '|' + br + '|' + len, k = G.KS[key] || (G.KS[key] = ks(hz(s), len, br));
    const src = ctx.createBufferSource(); src.buffer = k.buf; src.playbackRate.value = k.rate; const g = gain(v);
    chain(src, g, dest); src.start(t);
  }

  /* ---------- instruments ---------- */
  const scaleUp = (n, sc) => { for (let k = 1; k < 4; k++) if (sc.includes((((n + k) % 12) + 12) % 12)) return n + k; return n + 2; };
  const I = {
    /* bansuri: breathy bamboo flute with slides, grace notes and late vibrato */
    flute(t, s, dur, v, ch, o) {
      const f = hz(s), w = osc(G.W.flute), fr = w.frequency;
      if (o.from != null) { fr.setValueAtTime(hz(o.from), t); fr.exponentialRampToValueAtTime(f, t + .07); }
      else if (o.grace != null) { fr.setValueAtTime(hz(o.grace), t); fr.setValueAtTime(hz(o.grace), t + .055); fr.exponentialRampToValueAtTime(f, t + .09); }
      else fr.setValueAtTime(f, t);
      vib(fr, t, dur, f, 5.2, .0075, .2);
      const g = gain(0), end = adsr(g.gain, t, dur, v, o.from != null ? .025 : .045, .25, .78, .14);
      chain(w, g, ch); w.start(t); w.stop(end + .02);
      const n = noise(t, dur + .2), bp = filt('bandpass', Math.min(9000, f * 2.2), 1.1), ng = gain(0);
      ng.gain.setValueAtTime(0, t); ng.gain.linearRampToValueAtTime(v * .2, t + .02); ng.gain.linearRampToValueAtTime(v * .05, t + .12);
      ng.gain.setValueAtTime(v * .05, t + Math.max(.12, dur)); ng.gain.linearRampToValueAtTime(0, t + Math.max(.12, dur) + .1);
      chain(n, bp, ng, ch);
    },
    /* sarangi: bowed fiddle, slides in from below, wide singing vibrato */
    sarangi(t, s, dur, v, ch, o) {
      const f = hz(s), lp = filt('lowpass', 2800, .6), pk = filt('peaking', 1150, 1.6, 7), g = gain(0);
      const end = adsr(g.gain, t, dur, v, .09, .3, .82, .16);
      for (const dt of [-4, 5]) { const w = osc('sawtooth'), fr = w.frequency; w.detune.value = dt;
        fr.setValueAtTime(o.from != null ? hz(o.from) : f * .944, t); fr.exponentialRampToValueAtTime(f, t + (o.from != null ? .08 : .11));
        vib(fr, t, dur, f, 5.7, .009, .16); chain(w, lp); w.start(t); w.stop(end + .02); }
      chain(lp, pk, g, ch);
    },
    /* harmonium chord stab */
    harm(t, ch3, dur, v, ch) {
      const lp = filt('lowpass', 1500, .7), g = gain(0), end = adsr(g.gain, t, dur, v, .035, .2, .7, .12);
      for (const s of ch3) for (const dt of [-6, 6]) { const w = osc(G.W.reed, hz(s)); w.detune.value = dt; w.connect(lp); w.start(t); w.stop(end + .02); }
      chain(lp, g, ch);
    },
    /* "aah" choir pad for the high mountains */
    choir(t, ch3, dur, v, ch) {
      const f1 = filt('bandpass', 720, 3.5), f2 = filt('bandpass', 1180, 4.5), g2 = gain(.6), mix = gain(1), lp = filt('lowpass', 2400, .5), g = gain(0);
      const end = adsr(g.gain, t, dur, v, .55, .5, .85, .9);
      for (const s of ch3) for (const dt of [-9, 0, 9]) { const w = osc('sawtooth', hz(s)); w.detune.value = dt; w.connect(f1); w.connect(f2); w.start(t); w.stop(end + .02); }
      f1.connect(mix); chain(f2, g2, mix); chain(mix, lp, g, ch);
    },
    /* tanpura / tungna / bass: plucked strings */
    tanpura(t, s, dur, v, ch) { pluck(t, s, v, ch, .75, 3); },
    tungna(t, s, dur, v, ch) { pluck(t, s, v, ch, .6, 1.4); },
    bass(t, s, dur, v, ch) { pluck(t, s, v, ch, .35, 1.6); },
    /* bowed low drone */
    drone(t, s, dur, v, ch) {
      const lp = filt('lowpass', 420, .8), g = gain(0), end = adsr(g.gain, t, dur, v, 1.4, .5, .9, 1.6);
      const l = osc('sine', .13), lg = gain(160); chain(l, lg, lp.frequency); l.start(t); l.stop(end);
      for (const [n, dt] of [[s, -5], [s, 5], [s + 7, 0], [s + 12, 3]]) { const w = osc('sawtooth', hz(n)); w.detune.value = dt; w.connect(lp); w.start(t); w.stop(end + .02); }
      chain(lp, g, ch);
    },
    /* dungchen: long Tibetan horn */
    horn(t, s, dur, v, ch) {
      const lp = filt('lowpass', 180, 1.2), g = gain(0), end = adsr(g.gain, t, dur, v, .7, .4, .85, .9);
      lp.frequency.setValueAtTime(160, t); lp.frequency.linearRampToValueAtTime(620, t + .9); lp.frequency.linearRampToValueAtTime(380, t + dur);
      for (const [n, dt, a] of [[s, 0, 1], [s, 7, .8], [s + 12, -4, .35]]) { const w = osc(G.W.horn, hz(n)); w.detune.value = dt; vib(w.frequency, t, dur, hz(n), 4.3, .004, .5); const wg = gain(a); chain(w, wg, lp); w.start(t); w.stop(end + .02); }
      chain(lp, g, ch);
    },
    /* singing bowl: inharmonic partials that beat against each other */
    bowl(t, s, dur, v, ch) {
      const f = hz(s);
      [[1, 1, 7], [2.76, .45, 4.5], [5.4, .22, 2.6], [8.9, .1, 1.5]].forEach(([r, a, d]) => {
        for (const off of [-.6, .6]) { const w = osc('sine', f * r + off), g = gain(0); perc(g.gain, t, v * a * .5, d, .01); chain(w, g, ch); w.start(t); w.stop(t + d + .1); } });
      hiss(t, .05, 'lowpass', 800, .7, v * .3, ch);
    },
    tingsha(t, s, dur, v, ch) {
      for (const [f, a] of [[2489, 1], [2511, 1], [6870, .25]]) { const w = osc('sine', f), g = gain(0); perc(g.gain, t, v * a * .4, 2.6, .002); chain(w, g, ch); w.start(t); w.stop(t + 2.7); }
    },
    /* madal: two-headed hand drum. B = bass head, T = treble slap, t = ghost */
    madalB(t, s, dur, v, ch) {
      const w = osc('sine'), g = gain(0); w.frequency.setValueAtTime(108, t); w.frequency.exponentialRampToValueAtTime(62, t + .24);
      perc(g.gain, t, v, .42); chain(w, g, ch); w.start(t); w.stop(t + .46);
      tone(t, 216, 'sine', .2, v * .3, ch, { f1: 128, ft: .18 });
      hiss(t, .03, 'bandpass', 950, 1, v * .3, ch);
    },
    madalT(t, s, dur, v, ch) {
      const p = s || 1, w = osc('triangle'), g = gain(0); w.frequency.setValueAtTime(480 * p, t); w.frequency.exponentialRampToValueAtTime(440 * p, t + .05);
      perc(g.gain, t, v * .8, .13); chain(w, g, ch); w.start(t); w.stop(t + .15);
      tone(t, 765 * p, 'sine', .06, v * .25, ch);
      hiss(t, .03, 'bandpass', 3300, 1.4, v * .45, ch);
    },
    /* damphu: big frame drum */
    damB(t, s, dur, v, ch) {
      const w = osc('sine'), g = gain(0); w.frequency.setValueAtTime(128, t); w.frequency.exponentialRampToValueAtTime(74, t + .3);
      perc(g.gain, t, v, .75); chain(w, g, ch); w.start(t); w.stop(t + .8);
      tone(t, 290, 'sine', .3, v * .25, ch, { f1: 170, ft: .25 });
      hiss(t, .09, 'lowpass', 500, .7, v * .35, ch);
    },
    damT(t, s, dur, v, ch) {
      const w = osc('triangle'), g = gain(0); w.frequency.setValueAtTime(310, t); w.frequency.exponentialRampToValueAtTime(270, t + .06);
      perc(g.gain, t, v * .6, .14); chain(w, g, ch); w.start(t); w.stop(t + .16);
      hiss(t, .045, 'bandpass', 1900, 1, v * .4, ch);
    },
    /* jhyamta: small brass cymbals. s = 1 open ring, 0 choked */
    ching(t, s, dur, v, ch) {
      const hp = filt('highpass', 2600, .7), g = gain(0); perc(g.gain, t, v * .22, s ? .7 : .14, .001);
      for (const f of [2210, 3320, 4790, 6150]) { const w = osc('square', f + R(-15, 15)); w.connect(hp); w.start(t); w.stop(t + (s ? .75 : .2)); }
      chain(hp, g, ch); hiss(t, s ? .3 : .08, 'highpass', 6000, .7, v * .18, ch);
    }
  };

  /* ---------- composition helpers ---------- */
  function line(ev, t0, str, inst, tr, v, sc, orn = .25, slide = .35) {
    let t = t0, prev = null;
    for (const tok of str.trim().split(/\s+/)) {
      if (tok === '|') continue; const [a, b] = tok.split(':'), d = +b;
      if (a === '-') { prev = null; t += d; continue; }
      const n = +a + tr, o = {};
      if (prev != null && prev !== n && Math.abs(n - prev) <= 3 && Math.random() < slide) o.from = prev;
      else if (d >= 2 && Math.random() < orn) o.grace = scaleUp(n, sc);
      ev.push({ t, i: inst, n, d, v: v * R(.92, 1.05), o }); prev = n; t += d;
    }
    return t;
  }
  const CH = { D: [-5, 0, 4], G: [-3, 2, 5], C: [-2, 2, 7], Am: [-5, -2, 2], Dm: [-5, 0, 3], F: [-2, 3, 7], Em: [-1, 2, 7] };
  const ROOTS = { D: -24, G: -19, C: -14, Am: -17, Dm: -24, F: -21, Em: -22 };

  /* ===== Track 1: "Chiya Bari" (the tea garden) — zones 1 to 3 =====
     6/8 jhyaure lilt, D Khamaj. Bansuri hook, sarangi answer, harmonium, madal, jhyamta. */
  const T1A = '7:1 9:1 12:2 9:1 7:1 | 9:3 7:2 4:1 | 7:1 9:1 7:1 4:1 2:1 4:1 | 2:4 0:1 2:1 | 7:1 9:1 12:2 14:1 12:1 | 9:3 7:2 9:1 | 7:1 4:1 2:1 4:1 2:1 -3:1 | 0:6';
  const T1B = '12:2 14:1 16:2 14:1 | 12:3 9:2 7:1 | 9:1 10:1 9:1 7:1 5:1 4:1 | 7:5 9:1 | 12:2 14:1 16:2 19:1 | 16:3 14:2 12:1 | 9:1 12:1 9:1 7:1 4:1 2:1 | 0:4 -:2';
  const T1AC = ['D', 'G', 'D', 'Am', 'D', 'G', 'D', 'D'], T1BC = ['D', 'G', 'C', 'D', 'D', 'D', 'G', 'D'];
  function T1() {
    const E = .22, B = 6, ev = [], at = b => b * B, sc = SCALE1;
    const P = (t, i, n, d, v) => ev.push({ t, i, n, d, v, o: {} });
    const bars = [];   // per-bar chord and groove level
    const sec = (b0, chords, groove) => chords.forEach((c, k) => bars[b0 + k] = { c, g: groove, fill: k === chords.length - 1 });
    sec(0, ['D', 'D', 'D', 'D'], 0); sec(4, T1AC, 2); sec(12, T1AC, 2); sec(20, T1BC, 2); sec(28, T1BC, 3);
    sec(36, ['D', 'G', 'D', 'D'], 1); sec(40, T1AC, 3); sec(48, T1BC, 3); sec(56, ['D', 'D'], 0);
    // melody
    line(ev, at(1), '-:3 7:1 9:2 | 12:4 9:2 | 7:3 4:3', 'flute', 12, .5, sc, .5, .5);
    line(ev, at(4), T1A, 'flute', 12, .55, sc);
    line(ev, at(12), T1A, 'flute', 12, .55, sc); line(ev, at(12), T1A, 'sarangi', 0, .2, sc, 0, .5);
    line(ev, at(20), T1B, 'sarangi', 0, .42, sc, .2, .5);
    line(ev, at(28), T1B, 'flute', 12, .5, sc); line(ev, at(28), T1B, 'sarangi', 0, .28, sc, .1, .5);
    line(ev, at(37), '7:1 9:1 12:2 9:1 7:1 | 9:6', 'flute', 12, .4, sc, .4);
    line(ev, at(40), T1A, 'flute', 12, .55, sc, .5); line(ev, at(40), T1A, 'sarangi', 0, .22, sc, 0, .5);
    line(ev, at(48), T1B, 'flute', 12, .5, sc, .4); line(ev, at(48), T1B, 'sarangi', 0, .3, sc, .1, .5);
    line(ev, at(56), '4:1 2:1 0:4 | -:6', 'flute', 12, .45, sc, .3);
    bars.forEach((br, b) => {
      const t = at(b), c = CH[br.c], r = ROOTS[br.c];
      // tanpura: Pa, Sa', Sa', Sa
      P(t, 'tanpura', -17, 6, .16); P(t + 1.5, 'tanpura', -12, 6, .12); P(t + 3, 'tanpura', -12, 6, .12); P(t + 4.5, 'tanpura', -24, 6, .16);
      if (b === 0 || b === 36 || b === 56) P(t, 'bowl', -12, 8, .5);
      if (b === 56) P(t + 3, 'tingsha', 0, 6, .5);
      if (br.g >= 1 || b >= 2 && b < 4) { P(t, 'harm', c, 2.6, b < 4 ? .07 : .1); P(t + 3, 'harm', c, 2.6, b < 4 ? .055 : .08); }
      if (br.g >= 2) { P(t, 'bass', r, 3, .5); P(t + 3, 'bass', r + 7, 3, .38); }
      // madal (jhyaure): B . T B T t, fills on phrase ends
      if (b >= 2 && b < 4) { P(t, 'madalB', 0, 1, .45); P(t + 3, 'madalB', 0, 1, .32); }
      else if (br.g >= 1) {
        const k = br.g === 1 ? .8 : 1;
        if (br.fill && br.g >= 2) {
          [[0, 'madalB', 1], [1, 'madalT', .6], [1.5, 'madalT', .45], [2, 'madalT', .65], [2.5, 'madalT', .5], [3, 'madalB', .85], [3.5, 'madalT', .5], [4, 'madalT', .7], [4.5, 'madalT', .55], [5, 'madalT', .8], [5.5, 'madalT', .65]]
            .forEach(([o, i, v]) => P(t + o, i, i === 'madalT' ? 1 + (o % 1 ? .06 : 0) : 0, 1, v * k));
        } else {
          [[0, 'madalB', 1], [1, 'madalT', .45], [2, 'madalT', .7], [3, 'madalB', .75], [4, 'madalT', .65], [5, 'madalT', .38]].forEach(([o, i, v]) => P(t + o, i, 1, 1, v * k * R(.9, 1.05)));
          if (br.g >= 3 || Math.random() < .3) P(t + 5.5, 'madalT', 1.06, 1, .3 * k);
        }
        P(t, 'ching', 1, 1, br.g >= 3 ? .5 : .38); P(t + 3, 'ching', 0, 1, .3);
        if (br.g >= 3) { P(t + 1.5, 'ching', 0, 1, .16); P(t + 4.5, 'ching', 0, 1, .16); }
      }
    });
    return { ev: ev.sort((a, b) => a.t - b.t), len: bars.length * B, E,
      strips: { flute: [.9, .12, .3], sarangi: [.85, -.25, .32], harm: [.8, .3, .25], bass: [.7, 0, .05], tanpura: [.6, -.1, .3], madalB: [.9, 0, .08], madalT: [.7, .05, .12], ching: [.55, .35, .25], bowl: [.6, 0, .5], tingsha: [.5, .2, .5] } };
  }

  /* ===== Track 2: "Himal" (the snow peaks) — zones 4 and 5 =====
     4/4, D Kafi. Low drone and dungchen horn, tungna ostinato, damphu, bowls, bansuri over a choir. */
  const T2A = '0:2 3:1 5:1 7:4 | 10:2 9:1 7:1 5:2 7:2 | 3:3 5:1 3:2 2:2 | 0:8 | 0:2 3:1 5:1 7:3 10:1 | 12:4 14:2 12:1 10:1 | 9:2 7:2 10:2 9:1 7:1 | 7:6 -:2';
  const T2A2 = '0:2 3:1 5:1 7:4 | 10:2 9:1 7:1 5:2 7:2 | 3:3 5:1 3:2 2:2 | 0:8 | 0:2 3:1 5:1 7:3 10:1 | 12:4 14:2 12:1 10:1 | 5:2 3:2 2:2 3:1 2:1 | 0:8';
  const T2B = '12:3 10:1 12:2 15:2 | 14:4 12:2 10:2 | 9:3 10:1 12:2 9:2 | 7:8 | 12:3 10:1 12:2 17:2 | 15:2 14:2 12:2 10:2 | 9:2 10:2 7:4 | 12:8';
  const T2AC = ['Dm', 'C', 'F', 'Dm', 'Dm', 'G', 'G', 'Am'], T2A2C = ['Dm', 'C', 'F', 'Dm', 'Dm', 'G', 'C', 'Dm'], T2BC = ['Dm', 'C', 'G', 'Am', 'Dm', 'C', 'G', 'Dm'];
  function T2() {
    const E = .36, B = 8, ev = [], at = b => b * B, sc = SCALE2;
    const P = (t, i, n, d, v) => ev.push({ t, i, n, d, v, o: {} });
    const bars = [];
    const sec = (b0, chords, g) => chords.forEach((c, k) => bars[b0 + k] = { c, g, k });
    sec(0, ['Dm', 'Dm', 'Dm', 'Dm'], 0); sec(4, T2AC, 1); sec(12, T2A2C, 2); sec(20, T2BC, 3);
    sec(28, ['Dm', 'C', 'Dm', 'Dm'], 0); sec(32, T2BC, 3); sec(40, T2A2C.slice(0, 4), 1);
    line(ev, at(4), T2A, 'flute', 0, .55, sc, .3, .4);
    line(ev, at(12), T2A2, 'flute', 12, .48, sc, .35, .4);
    line(ev, at(20), T2B, 'flute', 12, .5, sc, .3); line(ev, at(20), T2B, 'sarangi', 0, .3, sc, .1, .5);
    line(ev, at(29), '7:4 10:2 9:2 | 7:8 | -:4 3:2 2:2', 'sarangi', 0, .34, sc, .3, .5);
    line(ev, at(32), T2B, 'flute', 12, .52, sc, .35); line(ev, at(32), T2B, 'sarangi', 0, .3, sc, .1, .5);
    line(ev, at(40), '0:2 3:1 5:1 7:4 | 10:2 9:1 7:1 5:2 7:2 | 3:3 5:1 3:2 2:2 | 0:8', 'flute', 0, .45, sc, .3);
    bars.forEach((br, b) => {
      const t = at(b), c = CH[br.c];
      if (b % 4 === 0) P(t, 'drone', -24, 4 * B + 1.5, .22);
      if (b % 2 === 0) { P(t, 'tanpura', -17, 8, .12); P(t + 2, 'tanpura', -12, 8, .1); P(t + 4, 'tanpura', -12, 8, .1); P(t + 6, 'tanpura', -24, 8, .12); }
      if (b === 0 || b === 28 || b === 40 || (br.g === 3 && br.k === 0)) P(t, 'horn', -24, 10, .5);
      if (b % 4 === 0 && (br.g === 0 || b === 40)) P(t + (b ? 0 : 1), 'bowl', -12 + (b % 8 ? 7 : 0), 8, .55);
      if (br.g === 3 && br.k === 7) P(t + 4, 'tingsha', 0, 8, .5);
      // tungna ostinato
      if (b >= 1) { const a = [c[0] - 12, c[1] - 12, c[2] - 12, c[1] - 12, c[0], c[2] - 12, c[1] - 12, c[2] - 12];
        a.forEach((n, k) => P(t + k, 'tungna', n, 1, (k === 0 ? .42 : .3) * (b < 4 ? .8 : 1))); }
      if (br.g >= 1) P(t, 'choir', c, 8, br.g === 3 ? .13 : .08);
      if (br.g >= 1) { P(t, 'bass', ROOTS[br.c], 4, .45); P(t + 4, 'bass', ROOTS[br.c] + 7, 4, .32); }
      // damphu
      if (br.g >= 1) {
        P(t, 'damB', 0, 1, .9); P(t + 4, 'damB', 0, 1, br.g === 1 ? .55 : .75);
        if (br.g >= 2) { P(t + 3, 'damT', 0, 1, .5); P(t + 6, 'damT', 0, 1, .45); P(t + 7, 'damT', 0, 1, .32); }
        if (br.g >= 3) { P(t + 2, 'damT', 0, 1, .3); P(t + 5, 'damT', 0, 1, .28); }
        if (br.k === 7 && br.g >= 2) [5, 5.5, 6, 6.5, 7, 7.5].forEach((o, j) => P(t + o, 'damT', 0, 1, .3 + j * .08));
      } else if (b >= 2) { P(t, 'damB', 0, 1, .4); }
    });
    return { ev: ev.sort((a, b) => a.t - b.t), len: bars.length * B, E,
      strips: { flute: [.9, .1, .38], sarangi: [.8, -.25, .38], choir: [.8, 0, .45], tungna: [.55, -.3, .25], bass: [.65, 0, .06], tanpura: [.5, .15, .35], drone: [.7, 0, .3], horn: [.8, 0, .4], damB: [.9, 0, .12], damT: [.6, .1, .2], bowl: [.6, 0, .6], tingsha: [.5, -.2, .6] } };
  }
  const SONGS = [T1, T2];

  /* ---------- sequencer ---------- */
  const LOOK = .4, MUTE = new Set();
  let seq = null, timer = null, curTrack = -1;
  function startSong(k, at) {
    const song = SONGS[k](), tg = gain(0), rv = gain(0);
    tg.connect(G.mus); rv.connect(G.mRev);
    tg.gain.setValueAtTime(0, at); tg.gain.linearRampToValueAtTime(1, at + 3); rv.gain.setValueAtTime(0, at); rv.gain.linearRampToValueAtTime(1, at + 3);
    const ch = {}; for (const i in song.strips) { const [g, p, s] = song.strips[i]; ch[i] = strip(tg, rv, g, p, s); }
    return { k, song, t0: at + .05, i: 0, tg, rv, ch };
  }
  function fadeOut(s, at) {
    if (!s) return; s.dead = true;
    for (const g of [s.tg, s.rv]) { g.gain.cancelScheduledValues(at); g.gain.setValueAtTime(g.gain.value, at); g.gain.linearRampToValueAtTime(0, at + 2.5); }
    setTimeout(() => { try { s.tg.disconnect(); s.rv.disconnect(); } catch (e) {} }, 6000);
  }
  function pump(horizon) {
    if (!seq || !ctx) return;
    const until = horizon != null ? horizon : ctx.currentTime + LOOK, E = seq.song.E;
    if (horizon == null && seq.t0 + seq.song.ev[seq.i].t * E < ctx.currentTime - .5) {   // fell far behind (app was asleep): jump ahead
      const pos = (ctx.currentTime - seq.t0) / E; while (seq.i < seq.song.ev.length && seq.song.ev[seq.i].t < pos) seq.i++;
      if (seq.i >= seq.song.ev.length) { seq.t0 += seq.song.len * E; seq.song = SONGS[seq.k](); seq.i = 0; }
    }
    let guard = 0; const cap = horizon != null ? 1e6 : 400;
    while (guard++ < cap) {
      const e = seq.song.ev[seq.i], t = seq.t0 + e.t * E;
      if (t > until) break;
      if (t >= ctx.currentTime - .02 && !MUTE.has(e.i)) { try { I[e.i](t, e.n, e.d * E, e.v, seq.ch[e.i], e.o); } catch (er) {} }
      if (++seq.i >= seq.song.ev.length) { seq.t0 += seq.song.len * E; seq.song = SONGS[seq.k](); seq.i = 0; }   // loop, fresh ornaments
    }
  }
  function setTrack(k) {
    if (!ready || k === curTrack) return;
    curTrack = k; const at = ctx.currentTime + .05;
    if (seq) fadeOut(seq, at);
    seq = k < 0 ? null : startSong(k, at + (seq ? 1.2 : .1));
  }

  /* ---------- effects ---------- */
  let tokN = 0, tokT = -9;
  const last = {};
  const gate = (k, gap) => { const t = ctx.currentTime; if (last[k] && t - last[k] < gap) return false; last[k] = t; return true; };
  const bell = (t, s, v, dec, dest) => { const f = hz(s); tone(t, f, 'sine', dec, v, dest || G.fx); tone(t, f * 2.01, 'sine', dec * .45, v * .28, dest || G.fx); tone(t, f * 3.02, 'sine', dec * .2, v * .1, dest || G.fx); };
  const arp = (t, notes, gap, v, dec, dest) => notes.forEach((s, k) => bell(t + k * gap, s, v, dec, dest));
  const wood = (t, f, v, dest) => { tone(t, f, 'triangle', .05, v, dest || G.fx, { f1: f * .85, ft: .04 }); hiss(t, .012, 'bandpass', f * 3, 2, v * .5, dest || G.fx); };
  const whoosh = (t, dur, f0, f1, v, dest) => hiss(t, dur, 'bandpass', f0, 1.4, v, dest || G.fx, { f1, swell: .4 });
  const zap = (t, v, dest) => { tone(t, R(1700, 2300), 'sawtooth', .16, v * .35, dest || G.fx, { f1: 140, ft: .14 }); hiss(t, .12, 'bandpass', 3800, 2, v * .6, dest || G.fx); hiss(t + .02, .08, 'highpass', 6000, .7, v * .4, dest || G.fx); };
  const thunder = (t, v, dur = 1.6) => { hiss(t, dur, 'lowpass', 380, .8, v, G.fxW, { a: .02, f1: 120 }); tone(t, 55, 'sine', dur * .6, v * .7, G.fxW, { f1: 38 }); hiss(t + .25, dur * .7, 'lowpass', 260, .8, v * .6, G.fxW, { a: .1 }); };
  const crackle = (t, dur, v, dest) => { for (let k = 0; k < dur * 30; k++) hiss(t + Math.random() * dur, .008, 'highpass', R(2500, 6000), .8, v * R(.3, 1), dest || G.fx); };
  const fire = (t, v, dur = .5) => { hiss(t, dur, 'lowpass', 300, .9, v, G.fx, { f1: 1800, swell: .3 }); crackle(t + .05, dur, v * .6); };
  const bubble = (t, s, v, dest) => { const f = hz(s); tone(t, f * .55, 'sine', .09, v, dest || G.fx, { f1: f * 1.5, ft: .05 }); };
  const glass = (t, v, base = 24) => [0, 2, 4, 7].forEach((k, j) => tone(t + j * .035, hz(base + pent(k + Math.floor(R(0, 3)))), 'sine', .6, v * .3, G.fx));
  const thud = (t, v, f = 120) => { tone(t, f, 'sine', .22, v, G.fx, { f1: f * .4, ft: .15 }); hiss(t, .06, 'lowpass', 700, .7, v * .5, G.fx); };
  const growl = (t, dur, v, f = 75) => { const w = osc('sawtooth', f), am = osc('sine', 27), ag = gain(.5), lp = filt('lowpass', 650, 2), g = gain(0);
    w.frequency.linearRampToValueAtTime(f * .8, t + dur); adsr(g.gain, t, dur, v, .05, .2, .8, .2); chain(am, ag, g.gain); chain(w, lp, g, G.fxW); w.start(t); am.start(t); w.stop(t + dur + .3); am.stop(t + dur + .3); };
  const bark = (t, v) => [0, .18].forEach(o => { const w = osc('sawtooth'), bp = filt('bandpass', 1100, 2.5), g = gain(0); w.frequency.setValueAtTime(560, t + o); w.frequency.exponentialRampToValueAtTime(330, t + o + .1); perc(g.gain, t + o, v, .12, .01); chain(w, bp, g, G.fx); w.start(t + o); w.stop(t + o + .15); });

  function duck(t, dur, to = .3) { const g = G.duck.gain; g.cancelScheduledValues(t); g.setValueAtTime(g.value, t); g.linearRampToValueAtTime(to, t + .15); g.setValueAtTime(to, t + dur); g.linearRampToValueAtTime(1, t + dur + 1.2); }
  /* bell chord: all notes at once, long ring */
  const chord = (t, notes, v, dec, dest) => notes.forEach(s => bell(t, s, v, dec, dest || G.fxW));
  const roll = (t, dur, inst, v0, v1, n0 = 6, n1 = 22) => { let tt = 0; const n = Math.round((n0 + n1) / 2 * dur); for (let k = 0; k < n; k++) { const u = k / n; I[inst](t + tt, inst === 'madalT' ? 1 + u * .1 : 0, 1, v0 + (v1 - v0) * u, G.fxW); tt += 1 / (n0 + (n1 - n0) * u); if (tt > dur) break; } };
  const riser = (t, dur, v) => { hiss(t, dur, 'bandpass', 300, 1.2, v, G.fxW, { f1: 6000, swell: .95 }); const w = osc('sawtooth'), lp = filt('lowpass', 400, 4), g = gain(0); w.frequency.setValueAtTime(hz(-24), t); w.frequency.exponentialRampToValueAtTime(hz(0), t + dur); lp.frequency.exponentialRampToValueAtTime(3000, t + dur); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(v * .5, t + dur); g.gain.linearRampToValueAtTime(0, t + dur + .05); chain(w, lp, g, G.fxW); w.start(t); w.stop(t + dur + .1); };
  const sparkle = (t, dur, n, v, base = 31) => { for (let k = 0; k < n; k++) bell(t + Math.random() * dur, base + pent(Math.floor(R(0, 8))), v * R(.5, 1), .5, G.fxW); };
  const impact = (t, v) => { thud(t, v, 70); hiss(t, 1.4, 'highpass', 3000, .6, v * .35, G.fxW, { a: .002 }); I.ching(t, 1, 1, v * 1.2, G.fxW); I.damB(t, 0, 1, v * 1.2, G.fxW); };
  /* crew reveal: o = rarity order (0 common .. 4 mythic, 5 event), bl = blessed. Returns when the main hit lands. */
  function crewReveal(t, o, bl) {
    let end = t;
    if (o <= 1) { arp(t, o ? [12, 16, 19, 24] : [12, 16, 19], .075, .13, .8, G.fxW); end = t + .3; }
    else if (o === 2) {              // Epic: madal flourish into a bright bell run and ring
      duck(t, 1.6, .5);
      I.madalT(t, 1, 1, .5, G.fxW); I.madalT(t + .09, 1.05, 1, .55, G.fxW); I.madalB(t + .18, 0, 1, .7, G.fxW);
      arp(t + .2, [12, 16, 19, 24, 28], .07, .14, 1, G.fxW); chord(t + .55, [12, 19, 24], .07, 1.6); I.ching(t + .55, 1, 1, .8, G.fxW); I.bowl(t + .55, 0, 5, .3, G.fxW);
      end = t + .55;
    } else if (o === 3) {            // Legendary: accelerating madal roll, riser, big chord with bowl and cymbals
      duck(t, 2.8, .3);
      roll(t, .9, 'madalT', .25, .6, 8, 26); riser(t, .9, .1);
      const h = t + .95; impact(h, .55); chord(h, [7, 12, 16, 19, 24], .085, 2.4); I.bowl(h, -12, 7, .5, G.fxW);
      arp(h + .15, [24, 28, 31, 36], .08, .1, 1.2, G.fxW); sparkle(h + .2, 1.2, 10, .06); I.tingsha(h + .5, 0, 1, .45, G.fxW);
      end = h;
    } else if (o === 4) {            // Mythic: dungchen horn, damphu roll and long riser, huge hit, cascading gold
      duck(t, 4.2, .15);
      I.horn(t, -24, 1.6, .55, G.fxW); roll(t + .2, 1.3, 'damT', .2, .6, 6, 24); riser(t + .1, 1.4, .14);
      const h = t + 1.55; impact(h, .75); I.horn(h, -12, 2.2, .45, G.fxW);
      chord(h, [0, 7, 12, 16, 19, 24], .085, 3); I.bowl(h, -12, 8, .6, G.fxW); I.bowl(h + .02, 7, 7, .35, G.fxW);
      arp(h + .2, [24, 28, 31, 36, 40, 43], .075, .1, 1.4, G.fxW); arp(h + .75, [43, 40, 36, 31], .09, .07, 1.2, G.fxW);
      sparkle(h + .3, 2, 22, .06); I.tingsha(h + .6, 0, 1, .5, G.fxW); I.tingsha(h + 1.2, 0, 1, .4, G.fxW);
      end = h + .3;
    } else {                         // Event: festival, madal and jhyamta groove into a bright fanfare
      duck(t, 2.4, .3);
      [[0, 'madalB', .7], [.13, 'madalT', .5], [.26, 'madalT', .55], [.39, 'madalB', .6], [.52, 'madalT', .5], [.6, 'madalT', .6], [.68, 'madalT', .7]].forEach(([o2, i, v]) => I[i](t + o2, 1, 1, v, G.fxW));
      [0, .39].forEach(o2 => I.ching(t + o2, 0, 1, .5, G.fxW));
      const h = t + .8; impact(h, .5); chord(h, [12, 16, 19, 24], .08, 2); arp(h + .1, [24, 28, 31, 36, 31, 36], .07, .1, .8, G.fxW); sparkle(h + .2, 1, 10, .05);
      end = h;
    }
    if (bl) {                        // Blessed: golden shimmer, choir swell, double tingsha, falling bells
      const b0 = end + (o <= 1 ? .2 : .45);
      duck(b0, 2.6, o >= 3 ? .15 : .3);
      riser(b0, .5, .08); sparkle(b0, .6, 8, .05, 36);
      I.choir(b0 + .4, [0, 4, 7], 2.2, .22, G.fxW); I.choir(b0 + .4, [12, 16, 19], 2.2, .12, G.fxW);
      chord(b0 + .5, [19, 24, 28, 31], .07, 2.4); I.tingsha(b0 + .5, 0, 1, .55, G.fxW); I.tingsha(b0 + .75, 0, 1, .45, G.fxW);
      arp(b0 + .9, [43, 40, 36, 31, 28, 24], .085, .07, 1, G.fxW);
    }
  }
  const FX = {
    tap(t) { wood(t, 1500, .16); },
    deny(t) { wood(t, 330, .32); wood(t + .09, 260, .28); },
    open(t) { whoosh(t, .16, 500, 2400, .07); bell(t + .02, 12, .05, .25); },
    close(t) { whoosh(t, .16, 2200, 500, .12); wood(t + .02, 900, .06); },
    buy(t) { bell(t, 21, .14, .35); bell(t + .06, 26, .12, .5); hiss(t, .05, 'highpass', 7000, .7, .05, G.fx); },
    equip(t) { thud(t, .18, 180); bell(t + .03, 19, .09, .3); },
    use(t) { whoosh(t, .2, 800, 3000, .06); bell(t + .05, 16, .1, .4); bell(t + .12, 21, .08, .4); },
    note(t) { bell(t, 16, .08, .5); },
    lock(t) { wood(t, 300, .25); tone(t + .05, 110, 'sine', .15, .2, G.fx); },
    full(t) { thud(t, .3, 140); wood(t + .08, 420, .14); },
    talk(t) { [0, .07, .14].forEach((o, k) => wood(t + o, 900 + k * 140 + R(-40, 40), .1)); },
    questReady(t) { arp(t, [19, 24, 28, 31], .09, .16, .9, G.fxW); I.ching(t + .3, 1, 1, .6, G.fxW); I.tingsha(t + .36, 0, 1, .3, G.fxW); },
    quest(t) { arp(t, [12, 16, 19, 24], .085, .14, .7, G.fxW); I.tingsha(t + .35, 0, 1, .35, G.fxW); },
    badge(t) { arp(t, [7, 12, 16, 19, 24], .07, .13, .8, G.fxW); I.ching(t + .35, 1, 1, .7, G.fxW); },
    level(t) { arp(t, [12, 16, 19], .07, .12, .5); },
    crew(t, a) { crewReveal(t, a[0], a[1]); },
    reveal(t, r = 0) { const n = [[12, 16, 19], [12, 16, 19, 24], [12, 16, 19, 24, 28], [7, 12, 16, 19, 24, 28], [0, 7, 12, 16, 19, 24, 28, 31]][Math.min(4, r)] || [12, 16, 19];
      arp(t, n, .075, .13, .9, G.fxW); if (r >= 2) I.bowl(t, -12, 6, .45, G.fxW); if (r >= 3) I.tingsha(t + n.length * .075, 0, 1, .4, G.fxW); },
    blessed(t) { glass(t, .5, 31); I.tingsha(t + .1, 0, 1, .35, G.fxW); },
    roll(t) { for (let k = 0; k < 7; k++) wood(t + k * .06, 1200 + k * 90, .09); },
    blend(t) { for (let k = 0; k < 5; k++) bubble(t + k * .06 + R(0, .03), 12 + k * 2, .1); bell(t + .35, 19, .1, .5); },
    swing(t, col) { whoosh(t, .17, R(900, 1300), R(2600, 3400), .07);
      if (col === 'spice') crackle(t + .03, .1, .05); else if (col === 'ice') tone(t + .04, hz(36 + pent(Math.floor(R(0, 4)))), 'sine', .18, .02, G.fx); else if (col === 'cloud') hiss(t + .03, .05, 'bandpass', 4500, 3, .04, G.fx); },
    crit(t) { bell(t, 24 + pent(Math.floor(R(0, 4))), .045, .25); },
    super(t) { bell(t, 31, .07, .35); bell(t + .05, 36, .06, .4); tone(t, hz(43), 'sine', .3, .03, G.fx); },
    token(t) { const now = ctx.currentTime; tokN = now - tokT < 1.4 ? Math.min(9, tokN + 1) : 0; tokT = now; bubble(t, 19 + pent(tokN), .13); bell(t + .02, 19 + pent(tokN) + 12, .05, .2); },
    pop(t) { bubble(t, 12 + pent(Math.floor(R(0, 5))), .16); tone(t + .01, hz(31), 'sine', .25, .03, G.fx); },
    bolt(t) { zap(t, .34); thunder(t + .03, .16, .9); },
    chain(t) { zap(t, .22); },
    chainEnd(t) { zap(t, .3); thunder(t, .22, 1.1); bell(t + .05, 24, .06, .5); },
    flameOn(t) { fire(t, .1, .4); },
    boom(t) { thud(t, .4, 90); hiss(t, .5, 'lowpass', 900, .7, .25, G.fxW, { f1: 200 }); crackle(t + .05, .6, .14); },
    lantern(t) { whoosh(t, .3, 400, 1400, .06); bell(t + .1, 19, .1, .7, G.fxW); },
    blessing(t) { arp(t, [7, 12, 16, 19], .1, .12, 1.2, G.fxW); I.bowl(t, -5, 6, .4, G.fxW); },
    brew(t) { if (Math.random() < .55) bubble(t, R(-2, 4), .045); else bell(t, 28 + pent(Math.floor(R(0, 5))), .028, .18); },
    brewed(t) { bell(t, 19, .1, .6); bell(t + .12, 24, .1, .8); },
    nightOn(t) { I.bowl(t, -12, 8, .55, G.fxW); bell(t + .4, 7, .1, 2.2, G.fxW); bell(t + .4, 19, .05, 1.6, G.fxW); },
    nightOff(t) { bell(t, 12, .08, 1.6, G.fxW); bell(t + .25, 7, .07, 1.8, G.fxW); },
    lit(t) { fire(t, .1, .4); arp(t + .1, [12, 16, 19, 24, 28], .07, .12, .9, G.fxW); },
    bark(t) { bark(t, .2); },
    sprout(t) { thud(t, .3, 160); for (let k = 0; k < 6; k++) bubble(t + .02 + k * .03, 7 + k * 3, .09); arp(t + .2, [12, 16, 19, 24], .07, .1, .7, G.fxW); },
    sproutIn(t) { for (let k = 0; k < 4; k++) bubble(t + k * .05, k * 3, .08); },
    mat(t) { bell(t, 28, .07, .3); bell(t + .05, 33, .05, .3); },
    fly(t) { whoosh(t, 1.4, 300, 1600, .14); whoosh(t + .5, 1.2, 1600, 400, .1); },
    land(t) { thud(t, .25, 110); whoosh(t, .25, 1200, 300, .06); },
    saw(t) { tone(t, hz(36), 'triangle', .12, .04, G.fx, { f1: hz(31) }); hiss(t, .1, 'highpass', 5000, .7, .04, G.fx); },
    coins(t) { for (let k = 0; k < 5; k++) bell(t + k * .045, 28 + pent(Math.floor(R(0, 5))), .06, .25); },
    target(t, n = 1) { bell(t, 12 + pent(n + 1), .12, .35); wood(t, 1100, .1); },
    precision(t) { arp(t, [19, 24, 31], .05, .12, .5); },
    star(t) { tone(t, hz(31), 'sine', .3, .05, G.fx, { f1: hz(19), ft: .25 }); thud(t + .3, .12, 200); bell(t + .32, 24, .06, .3); },
    glacier(t) { glass(t, .9, 24); glass(t + .12, .7, 31); I.bowl(t, 0, 6, .5, G.fxW); whoosh(t, 1.2, 600, 5000, .1); },
    electrify(t) { thunder(t, .4, 2); zap(t + .05, .4); zap(t + .25, .3); },
    passive(t) { arp(t, [12, 19, 24], .06, .13, .7, G.fxW); I.ching(t, 1, 1, .5, G.fxW); },
    kiln(t) { fire(t, .1, .4); FX.coins(t + .1); }
  };
  /* ability sounds, all from the same palette */
  const AB = {
    lpole(t) { bell(t, 31, .08, .5); zap(t + .03, .14); },
    sbomb(t) { zap(t, .3); thud(t, .28, 100); thunder(t + .05, .14, .8); },
    haze(t) { hiss(t, 1.4, 'bandpass', 3000, 1.5, .06, G.fx, { swell: .3, f1: 1200 }); crackle(t, 1.2, .07); },
    stormCall(t) { thunder(t, .35, 1.8); for (let k = 0; k < 3; k++) zap(t + .1 + k * .12, .22); },
    sfork(t) { [0, .08, .16].forEach(o => zap(t + o, .2)); },
    reach(t) { whoosh(t, .3, 400, 3000, .09); bell(t + .1, 19, .07, .3); },
    drum(t) { I.madalB(t, 0, 1, .5, G.fx); I.madalT(t + .11, 1, 1, .4, G.fx); I.madalT(t + .22, 1.06, 1, .45, G.fx); I.madalB(t + .33, 0, 1, .45, G.fx); },
    inflate(t) { const w = osc('sine'), g = gain(0); w.frequency.setValueAtTime(220, t); w.frequency.exponentialRampToValueAtTime(520, t + .35); adsr(g.gain, t, .35, .1, .03, .1, .8, .08); chain(w, g, G.fx); w.start(t); w.stop(t + .5); whoosh(t, .35, 300, 900, .05); },
    inspire(t) { arp(t, [19, 24, 28], .05, .1, .5); },
    spiceBoost(t) { fire(t, .12, .45); bell(t + .05, 14, .07, .35); },
    iceBoost(t) { glass(t, .35); bubble(t + .1, 14, .08); },
    cloudBoost(t) { zap(t, .14); bell(t + .05, 21, .07, .35); },
    firecracker(t) { const n = (typeof combo !== 'undefined' && combo.n) || 1; thud(t, .25, 150); hiss(t, .05, 'highpass', 2500, .7, .25, G.fx); crackle(t + .05, .3, .15); bell(t + .02, 12 + pent(Math.min(10, n)), .08, .3); },
    link(t) { whoosh(t, .25, 2500, 600, .08); wood(t + .2, 700, .12); },
    littleLove(t) { bell(t, 16, .08, .5); bell(t + .1, 21, .08, .6); },
    teaMark(t) { hiss(t, .6, 'highpass', 3000, .7, .05, G.fx, { swell: .2 }); bell(t + .05, 12, .07, .6); },
    bullseye(t) { wood(t, 1300, .12); bell(t + .05, 24, .06, .3); },
    bubbles(t) { for (let k = 0; k < 6; k++) bubble(t + k * .07, 7 + pent(k), .07); },
    mist(t) { hiss(t, 1, 'lowpass', 900, .7, .07, G.fx, { swell: .4 }); bell(t, 26, .05, .6); },
    bearMorph(t) { growl(t, .7, .17, 70); thud(t, .25, 90); },
    spiceRush(t) { fire(t, .16, .7); bell(t + .1, 19, .08, .4); },
    haste(t) { whoosh(t, .3, 600, 4500, .1); bell(t + .1, 24, .06, .3); },
    focus(t) { I.bowl(t, 0, 4, .16, G.fx); },
    burst(t) { FX.boom(t); fire(t + .05, .14, .8); },
    honey(t) { FX.coins(t); },
    blessing(t) { arp(t, [12, 16, 19, 24], .09, .1, 1, G.fxW); },
    sniff(t) { bark(t, .18); hiss(t + .3, .3, 'lowpass', 1500, .7, .08, G.fx); },
    random(t) { hiss(t, .03, 'highpass', 3000, .7, .2, G.fx); hiss(t + .07, .03, 'highpass', 3000, .7, .15, G.fx); },
    prayerWheel(t) { I.bowl(t, -5, 5, .18, G.fxW); for (let k = 0; k < 4; k++) wood(t + .2 + k * .14, 500, .05); },
    petalStorm(t) { whoosh(t, .9, 500, 2500, .1); for (let k = 0; k < 6; k++) bell(t + .1 + k * .1, 19 + pent(k), .04, .3); },
    frostMark(t) { glass(t, .4, 26); },
    roar(t) { growl(t, .9, .22, 85); whoosh(t, .8, 200, 900, .1); },
    caravan(t) { for (let k = 0; k < 6; k++) { const b = R(-2, 2); tone(t + k * .09, hz(19 + b), 'square', .25, .02, G.fx); bell(t + k * .09, 12 + (k % 2) * 7, .032, .3); } },
    footprints(t) { for (let k = 0; k < 6; k++) { thud(t + k * .28, .2, 90); hiss(t + k * .28, .12, 'highpass', 3000, .7, .06, G.fx); } },
    dive(t) { whoosh(t, 1.1, 300, 2500, .12); fire(t + .2, .1, .8); },
    pounce(t) { for (let k = 0; k < 5; k++) thud(t + k * .38, .16, 130); },
    gust(t) { whoosh(t, 1.1, 300, 1800, .14); },
    voidBurst(t) { FX.boom(t); }
  };

  /* ---------- public ---------- */
  function unlock() {
    if (!ctx) {
      const C = window.AudioContext || window.webkitAudioContext; if (!C) return;
      try { if (navigator.audioSession) navigator.audioSession.type = 'ambient'; } catch (e) {}
      build(new C({ latencyHint: 'interactive' }));
      ready = true;
      timer = setInterval(() => { if (ctx.state === 'running') pump(); }, 90);
    }
    if (ctx.state !== 'running') ctx.resume().catch(() => {});
    if (!unlocked) { const b = ctx.createBuffer(1, 1, 22050), s = ctx.createBufferSource(); s.buffer = b; s.connect(ctx.destination); s.start(0); unlocked = true; }
  }
  ['pointerdown', 'touchend', 'keydown'].forEach(ev => addEventListener(ev, unlock, true));
  document.addEventListener('visibilitychange', () => { if (!ctx) return; if (document.hidden) ctx.suspend().catch(() => {}); else ctx.resume().catch(() => {}); });

  const GAPS = { swing: .09, crit: .07, super: .12, token: .03, pop: .03, brew: .22, tap: .03, note: .3, chain: .06, saw: .25, flameOn: .3, mat: .2, crackle: .1 };
  function fx(name, a) {
    if (!ready || ctx.state !== 'running' || !cfg.sfx) return;
    const f = FX[name]; if (!f) return;
    if (!gate(name, GAPS[name] || .05)) return;
    if (name !== 'note') last.big = ctx.currentTime;
    try { f(ctx.currentTime + .01, a); } catch (e) {}
  }
  function ab(id) {
    if (!ready || ctx.state !== 'running' || !cfg.sfx) return;
    const f = AB[id]; if (!f || !gate('ab_' + id, .08)) return;
    last.big = ctx.currentTime; try { f(ctx.currentTime + .01); } catch (e) {}
  }
  /* toasts get a soft chime unless a bigger sound just played */
  function toastSnd(icon) {
    if (!ready || ctx.state !== 'running') return;
    if (last.big && ctx.currentTime - last.big < .25) return;
    fx(icon === 'lock' ? 'lock' : icon === 'basket' ? 'full' : 'note');
  }
  function setVol(k, v) { cfg[k] = Math.max(0, Math.min(1, v)); try { localStorage.setItem('chiya_audio', JSON.stringify(cfg)); } catch (e) {} applyVol(); }

  /* offline render for previews / tests: returns a Promise<AudioBuffer> */
  function render(k, sec, sr = 44100, fromBar = 0) {
    const oc = new OfflineAudioContext(2, Math.floor(sr * sec), sr); build(oc); ready = true;
    seq = startSong(k, 0); seq.tg.gain.cancelScheduledValues(0); seq.tg.gain.value = 1; seq.rv.gain.cancelScheduledValues(0); seq.rv.gain.value = 1;
    if (fromBar) { const bpb = k ? 8 : 6, E = seq.song.E; while (seq.song.ev[seq.i].t < fromBar * bpb) seq.i++; seq.t0 = -fromBar * bpb * E; }
    pump(sec);
    return oc.startRendering();
  }
  function renderFx(list, gap = .9, sr = 44100) {
    const oc = new OfflineAudioContext(2, Math.floor(sr * (list.length * gap + 2)), sr); build(oc); ready = true;
    list.forEach(([kind, id, a], j) => { const t = .2 + j * gap; try { (kind === 'ab' ? AB : FX)[id](t, a); } catch (e) { console.log('fx err', id, e); } });
    return oc.startRendering();
  }

  return { fx, ab, toast: toastSnd, setTrack, setVol, get cfg() { return cfg; }, get on() { return ready; }, get track() { return curTrack; }, render, renderFx, FX, AB, _songs: SONGS, MUTE };
})();
