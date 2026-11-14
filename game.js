// ハクスラTD｜Loot Lane Defense v2
// モンスターサバイバル型：大マップ＋カメラ追従＋ヌルヌル移動＋複数ヒーロー＋TD（コア防衛＆タワー）＋ハクスラ装備
(function () {
  "use strict";

  // ======== 世界・基本 ========
  const WORLD_W = 2400, WORLD_H = 1800;
  const CORE = { x: WORLD_W / 2, y: WORLD_H / 2, r: 34, hp: 50, maxHp: 50 };
  const PADS = [];
  for (let i = 0; i < 8; i++) {
    const a = (Math.PI * 2 * i) / 8 - Math.PI / 2;
    PADS.push({ x: CORE.x + Math.cos(a) * 200, y: CORE.y + Math.sin(a) * 200, tower: null });
  }

  const HEROES = {
    knight:    { icon: "⚔️", name: "剣士レオン",   hp: 140, spd: 262, weapon: "slash",  dmg: 17, rate: 0.55, range: 112, body: "#3f6fd8", accent: "#ffd94d", sub: "#e34b4b",
                 qIcon: "🌀", qName: "旋風斬", eIcon: "💨", eName: "ダッシュ斬り", rIcon: "🌟", rName: "聖撃波",
                 desc: "近接バランス型。剣の薙ぎ払いで周囲を一掃。", stat: "HP★★★ 速さ★★ 攻★★★" },
    mage:      { icon: "🔮", name: "魔女ルナ",     hp: 88,  spd: 252, weapon: "bolt",   dmg: 12, rate: 0.38, range: 340, body: "#7a4fd0", accent: "#6be7ff", sub: "#3b2a6e",
                 qIcon: "❄️", qName: "氷結ノヴァ", eIcon: "✨", eName: "ブリンク", rIcon: "☄️", rName: "メテオシャワー",
                 desc: "追尾する魔弾を連射。脆いが殲滅力は随一。", stat: "HP★ 速さ★★ 攻★★★★" },
    archer:    { icon: "🏹", name: "射手シルフ",   hp: 98,  spd: 288, weapon: "arrow",  dmg: 11, rate: 0.30, range: 390, body: "#3fae6a", accent: "#ffe28a", sub: "#205c38",
                 qIcon: "🎯", qName: "拡散矢", eIcon: "💨", eName: "疾風ダッシュ", rIcon: "🌧️", rName: "アローレイン",
                 desc: "貫通する矢を高速連射。足も速い。", stat: "HP★★ 速さ★★★ 攻★★★" },
    ninja:     { icon: "🥷", name: "忍者ハヤテ",   hp: 92,  spd: 322, weapon: "dagger", dmg: 8,  rate: 0.24, range: 96,  body: "#2f3542", accent: "#ff5d7a", sub: "#57606f",
                 qIcon: "👥", qName: "分身斬", eIcon: "🌫️", eName: "煙幕", rIcon: "🌀", rName: "手裏剣嵐",
                 desc: "最速の脚と手数で切り刻む。紙装甲。", stat: "HP★ 速さ★★★★ 攻★★★" },
    berserker: { icon: "🪓", name: "戦士ゴウ",     hp: 180, spd: 238, weapon: "axe",    dmg: 26, rate: 0.80, range: 120, body: "#b3502e", accent: "#ffb020", sub: "#5e2a16",
                 qIcon: "🌋", qName: "震撃", eIcon: "🐂", eName: "突進", rIcon: "🌀", rName: "大旋風",
                 desc: "大斧の範囲攻撃。高HPで前線を維持。", stat: "HP★★★★ 速さ★ 攻★★★★" }
  };

  const ENEMIES = {
    slime: { hp: 18, spd: 62,  r: 16, xp: 1, gold: 2,  heroDmg: 6,  coreDmg: 1, heroPref: 560 },
    wolf:  { hp: 14, spd: 118, r: 14, xp: 1, gold: 2,  heroDmg: 8,  coreDmg: 1, heroPref: 640 },
    bat:   { hp: 10, spd: 134, r: 12, xp: 1, gold: 1,  heroDmg: 6,  coreDmg: 1, heroPref: 680 },
    shade: { hp: 26, spd: 96,  r: 15, xp: 2, gold: 3,  heroDmg: 10, coreDmg: 1, heroPref: 460 },
    golem: { hp: 95, spd: 40,  r: 24, xp: 3, gold: 6,  heroDmg: 18, coreDmg: 3, heroPref: 320 },
    boss:  { hp: 900, spd: 46, r: 40, xp: 20, gold: 80, heroDmg: 30, coreDmg: 8, heroPref: 0 }
  };

  const TOWERS = {
    arrow:  { icon: "🏹", name: "アロー",   cost: 60,  range: 210, dmg: 13, rate: 0.55, color: "#8fd0ff" },
    cannon: { icon: "💣", name: "キャノン", cost: 110, range: 195, dmg: 30, rate: 1.25, splash: 62, color: "#ffb37d" },
    frost:  { icon: "❄️", name: "フロスト", cost: 90,  range: 185, dmg: 6,  rate: 0.8,  slow: 0.45, color: "#a8ecff" },
    sniper: { icon: "🎯", name: "スナイパー", cost: 160, range: 330, dmg: 85, rate: 2.1, color: "#ffe28a" }
  };

  const RARITIES = [
    { key: "N", name: "ノーマル",     color: "#cfd6ff", w: 62, mul: 1.0 },
    { key: "R", name: "レア",         color: "#57b6ff", w: 26, mul: 1.7 },
    { key: "E", name: "エピック",     color: "#c77dff", w: 9,  mul: 2.6 },
    { key: "L", name: "レジェンダリー", color: "#ffb020", w: 3,  mul: 4.0 }
  ];
  const SLOTS = { weapon: "武器", armor: "防具", charm: "お守り" };

  // ======== ユーティリティ ========
  const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
  const dist2 = (ax, ay, bx, by) => { const dx = ax - bx, dy = ay - by; return dx * dx + dy * dy; };
  const rnd = (a, b) => a + Math.random() * (b - a);
  const irnd = (a, b) => Math.floor(rnd(a, b + 1));
  const $ = id => document.getElementById(id);
  let seed = 1234567;
  function srand() { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; }

  // ======== 状態 ========
  const S = {
    started: false, over: false, overlay: null, t: 0, phase: 1, phaseT: 0,
    gold: 160, kills: 0, spawnT: 0, shake: 0, hitStop: 0, bannerT: 0,
    hero: null, enemies: [], projs: [], gems: [], drops: [], parts: [], rings: [], nums: [], meteors: [],
    inventory: [], equipped: { weapon: null, armor: null, charm: null },
    towerMul: 1, selectedHero: "knight", buildPad: -1, cam: { x: CORE.x, y: CORE.y }
  };

  function newHero(id) {
    const d = HEROES[id];
    return {
      id, def: d, x: CORE.x, y: CORE.y + 90, vx: 0, vy: 0, face: 1, aim: -Math.PI / 2,
      hp: d.hp, level: 1, xp: 0, xpNext: 7, atkT: 0, swing: 0, walk: 0,
      cds: { q: 0, e: 0, r: 0 }, dead: false, respawnT: 0, iframes: 0, spinT: 0, speedBuffT: 0,
      dmgMul: 1, rateMul: 1, projBonus: 0, upgHp: 0, spdMul: 1, crit: 0.05, magnet: 95,
      vamp: 0, goldMul: 1, armorMul: 1
    };
  }

  // ======== キャンバス ========
  const cv = $("cv"), ctx = cv.getContext("2d");
  let VW = 0, VH = 0, DPR = 1;
  function resize() {
    VW = window.innerWidth; VH = window.innerHeight;
    DPR = Math.min(window.devicePixelRatio || 1, 2);
    cv.width = Math.floor(VW * DPR); cv.height = Math.floor(VH * DPR);
    cv.style.width = VW + "px"; cv.style.height = VH + "px";
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  }
  window.addEventListener("resize", resize); resize();

  // 地面テクスチャ（タイル）と装飾
  const tile = document.createElement("canvas"); tile.width = tile.height = 256;
  (function paintTile() {
    const g = tile.getContext("2d");
    g.fillStyle = "#141b33"; g.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 260; i++) {
      g.fillStyle = "rgba(255,255,255," + (0.02 + srand() * 0.05) + ")";
      g.fillRect(srand() * 256, srand() * 256, 2, 2);
    }
    for (let i = 0; i < 40; i++) {
      g.fillStyle = "rgba(0,0,0," + (0.05 + srand() * 0.08) + ")";
      g.beginPath(); g.arc(srand() * 256, srand() * 256, 6 + srand() * 16, 0, 7); g.fill();
    }
    g.strokeStyle = "rgba(90,110,200,0.10)"; g.lineWidth = 1;
    g.strokeRect(0.5, 0.5, 255, 255);
  })();
  const decors = [];
  for (let i = 0; i < 110; i++) decors.push({ x: srand() * WORLD_W, y: srand() * WORLD_H, k: irnd(0, 2), s: 0.7 + srand() * 0.9, ph: srand() * 6.28 });

  // ======== 入力 ========
  const keys = {};
  let moveTarget = null;
  const joy = { active: false, id: -1, bx: 0, by: 0, dx: 0, dy: 0 };
  window.addEventListener("keydown", e => {
    keys[e.key.toLowerCase()] = true;
    if (!S.started || S.over) return;
    const k = e.key.toLowerCase();
    if (k === "q") castAbility("q");
    if (k === "e") castAbility("e");
    if (k === "r") castAbility("r");
    if (["arrowup", "arrowdown", "arrowleft", "arrowright", " "].includes(k)) e.preventDefault();
  });
  window.addEventListener("keyup", e => { keys[e.key.toLowerCase()] = false; });

  function screenToWorld(sx, sy) { return { x: sx + S.cam.x - VW / 2, y: sy + S.cam.y - VH / 2 }; }
  cv.addEventListener("pointerdown", e => {
    if (!S.started || S.over || S.overlay) return;
    if (e.clientX < VW * 0.45 && e.clientY > VH * 0.3) {
      joy.active = true; joy.id = e.pointerId; joy.bx = e.clientX; joy.by = e.clientY; joy.dx = 0; joy.dy = 0;
      const jb = $("joyBase");
      jb.style.display = "block"; jb.style.left = (e.clientX - 58) + "px"; jb.style.top = (e.clientY - 58) + "px";
      $("joyNub").style.transform = "translate(-50%,-50%)";
    } else {
      const w = screenToWorld(e.clientX, e.clientY);
      for (let i = 0; i < PADS.length; i++) {
        if (dist2(w.x, w.y, PADS[i].x, PADS[i].y) < 48 * 48) { openBuild(i); return; }
      }
      moveTarget = w;
    }
  });
  cv.addEventListener("pointermove", e => {
    if (!joy.active || e.pointerId !== joy.id) return;
    let dx = e.clientX - joy.bx, dy = e.clientY - joy.by;
    const len = Math.hypot(dx, dy);
    if (len > 46) { dx = dx / len * 46; dy = dy / len * 46; }
    joy.dx = dx / 46; joy.dy = dy / 46;
    $("joyNub").style.transform = "translate(calc(-50% + " + dx + "px), calc(-50% + " + dy + "px))";
  });
  function joyEnd(e) {
    if (e.pointerId !== joy.id) return;
    joy.active = false; joy.dx = 0; joy.dy = 0;
    $("joyBase").style.display = "none";
  }
  cv.addEventListener("pointerup", joyEnd);
  cv.addEventListener("pointercancel", joyEnd);

  function toast(msg, ms) {
    const t = $("toast"); t.textContent = msg; t.style.display = "block";
    clearTimeout(toast._t); toast._t = setTimeout(() => { t.style.display = "none"; }, ms || 2200);
  }
  function banner(txt) {
    const b = $("banner"); b.textContent = txt; b.style.opacity = "1"; b.style.transition = "none";
    S.bannerT = 1.6;
  }

  // ======== 装備・派生ステータス ========
  function itemBonus() {
    const b = { atk: 0, rate: 0, hp: 0, spd: 0, crit: 0 };
    for (const slot of ["weapon", "armor", "charm"]) {
      const it = S.equipped[slot]; if (!it) continue;
      b.atk += it.stats.atk || 0; b.rate += it.stats.rate || 0;
      b.hp += it.stats.hp || 0; b.spd += it.stats.spd || 0; b.crit += it.stats.crit || 0;
    }
    return b;
  }
  const effMaxHp = () => { const h = S.hero; return h.def.hp + h.upgHp + itemBonus().hp; };
  const effDmg = () => { const h = S.hero; return h.def.dmg * h.dmgMul * (1 + itemBonus().atk / 100); };
  const effRate = () => { const h = S.hero; return h.def.rate * h.rateMul * (1 - Math.min(0.5, itemBonus().rate / 100)); };
  const effSpeed = () => { const h = S.hero; return h.def.spd * h.spdMul * (1 + itemBonus().spd / 100) * (h.speedBuffT > 0 ? 1.35 : 1); };
  const effCrit = () => S.hero.crit + itemBonus().crit / 100;

  function rollRarity() {
    let r = Math.random() * 100;
    for (const x of RARITIES) { if (r < x.w) return x; r -= x.w; }
    return RARITIES[0];
  }
  const AFFIX = {
    weapon: [["攻撃", "atk", 6, 16, "%"], ["連射", "rate", 4, 10, "%"], ["会心", "crit", 3, 9, "%"]],
    armor:  [["体力", "hp", 12, 34, ""], ["脚力", "spd", 3, 8, "%"], ["会心", "crit", 2, 6, "%"]],
    charm:  [["攻撃", "atk", 4, 11, "%"], ["体力", "hp", 8, 24, ""], ["連射", "rate", 3, 8, "%"], ["脚力", "spd", 3, 7, "%"]]
  };
  const BASE_NAME = { weapon: ["剣", "斧", "杖", "弓", "短剣"], armor: ["鎧", "ローブ", "革鎧", "盾"], charm: ["勾玉", "指輪", "お守り", "紋章"] };
  let itemSeq = 1;
  function genItem(scale) {
    const slotKeys = Object.keys(SLOTS);
    const slot = slotKeys[irnd(0, slotKeys.length - 1)];
    const rar = rollRarity();
    const stats = {};
    const pool = AFFIX[slot].slice();
    const n = rar.key === "N" ? 1 : rar.key === "R" ? 2 : 3;
    for (let i = 0; i < n && pool.length; i++) {
      const a = pool.splice(irnd(0, pool.length - 1), 1)[0];
      stats[a[1]] = Math.round(rnd(a[2], a[3]) * rar.mul * (1 + scale * 0.06));
    }
    return { id: "it" + (itemSeq++) + "_" + Date.now().toString(36), slot, rarity: rar.key, rname: rar.name, color: rar.color, name: BASE_NAME[slot][irnd(0, BASE_NAME[slot].length - 1)], stats, scrap: Math.round(12 * rar.mul) };
  }
  function statText(it) {
    const LBL = { atk: "攻撃+", rate: "攻撃速度+", hp: "最大HP+", spd: "移動+", crit: "会心+" };
    const UNIT = { atk: "%", rate: "%", hp: "", spd: "%", crit: "%" };
    return Object.keys(it.stats).map(k => LBL[k] + it.stats[k] + UNIT[k]).join(" / ");
  }
  function itemPower(it) { const s = it.stats; return (s.atk || 0) * 3 + (s.rate || 0) * 3 + (s.crit || 0) * 4 + (s.hp || 0) * 0.5 + (s.spd || 0) * 2; }

  // ======== エフェクト ========
  function spawnParts(x, y, n, color, spd, size, life, grav) {
    for (let i = 0; i < n; i++) {
      if (S.parts.length > 420) return;
      const a = rnd(0, Math.PI * 2), v = rnd(spd * 0.3, spd);
      S.parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: rnd(life * 0.5, life), max: life, size: rnd(size * 0.5, size), color, grav: grav || 0 });
    }
  }
  function spawnRing(x, y, maxR, color, width) { S.rings.push({ x, y, r: 8, maxR, life: 0.32, maxLife: 0.32, color, width: width || 4 }); }
  function dmgNum(x, y, txt, color, size) {
    if (S.nums.length > 90) S.nums.shift();
    S.nums.push({ x: x + rnd(-8, 8), y: y - 14, vy: -66, life: 0.75, txt: String(txt), color: color || "#fff", size: size || 14 });
  }
  function shakeIt(m) { S.shake = Math.min(16, S.shake + m); }

  // ======== 戦闘 ========
  function hurtEnemy(e, dmg, opts) {
    opts = opts || {};
    let crit = false;
    if (!opts.noCrit && Math.random() < effCrit()) { dmg *= 1.8; crit = true; }
    dmg = Math.round(dmg * rnd(0.92, 1.08));
    e.hp -= dmg; e.flash = 1;
    if (opts.kb) { e.kbx += Math.cos(opts.kbA) * opts.kb; e.kby += Math.sin(opts.kbA) * opts.kb; }
    dmgNum(e.x, e.y - e.r, dmg, crit ? "#ffd94d" : "#ffffff", crit ? 19 : 14);
    spawnParts(e.x, e.y, crit ? 5 : 2, crit ? "#ffd94d" : "#ffb3c1", 130, 3.5, 0.3);
    const h = S.hero;
    if (h.vamp > 0 && !h.dead) h.hp = Math.min(effMaxHp(), h.hp + dmg * h.vamp);
    if (e.hp <= 0) killEnemy(e);
  }
  function dropGem(x, y, v) {
    S.gems.push({ x: x + rnd(-10, 10), y: y + rnd(-10, 10), v, ph: rnd(0, 6.28) });
  }
  function killEnemy(e) {
    e.dead = true; S.kills++;
    const g = Math.max(1, Math.round(rnd(e.def.gold * 0.6, e.def.gold * 1.4) * S.hero.goldMul));
    S.gold += g;
    spawnParts(e.x, e.y, e.boss ? 46 : e.elite ? 22 : 9, e.boss ? "#ff5d5d" : "#9dff6b", e.boss ? 300 : 190, 4.5, 0.5, 300);
    if (e.boss) { shakeIt(13); S.hitStop = Math.max(S.hitStop, 0.09); spawnRing(e.x, e.y, 130, "#ff5d5d", 6); }
    // 経験値ジェム
    if (e.def.xp >= 20) { dropGem(e.x, e.y, 20); dropGem(e.x, e.y, 5); dropGem(e.x, e.y, 5); }
    else if (e.def.xp >= 3) dropGem(e.x, e.y, 5);
    else dropGem(e.x, e.y, 1);
    // 装備ドロップ
    const dropRate = e.boss ? 1 : e.elite ? 0.4 : 0.035;
    if (Math.random() < dropRate) {
      const n = e.boss ? 2 : 1;
      for (let i = 0; i < n; i++) S.drops.push({ x: e.x + rnd(-16, 16), y: e.y + rnd(-16, 16), item: genItem(S.phase), ph: rnd(0, 6.28) });
      if (e.boss || e.elite) toast("✨ 装備ドロップ！ 近づいて拾おう");
    }
  }
  function hurtHero(dmg) {
    const h = S.hero;
    if (h.dead || h.iframes > 0 || S.over) return;
    dmg = Math.round(dmg * h.armorMul);
    h.hp -= dmg; shakeIt(4);
    spawnParts(h.x, h.y, 8, "#ff5d7a", 170, 4, 0.35);
    dmgNum(h.x, h.y - 20, "-" + dmg, "#ff8fa3", 15);
    if (h.hp <= 0) {
      h.dead = true; h.respawnT = 5; h.hp = 0;
      spawnParts(h.x, h.y, 34, "#ff5d7a", 280, 5, 0.7, 200); shakeIt(10);
      toast("💀 ヒーロー倒れた！ 5秒後にコア横で復活");
    }
  }
  function hurtCore(dmg) {
    if (S.over) return;
    CORE.hp -= dmg; shakeIt(6);
    spawnParts(CORE.x, CORE.y - 20, 12, "#7de3ff", 220, 4.5, 0.45);
    dmgNum(CORE.x, CORE.y - 56, "-" + dmg, "#7de3ff", 17);
    if (CORE.hp <= 0) { CORE.hp = 0; gameOver(); }
  }

  function nearestEnemy(x, y, maxD) {
    let best = null, bd = maxD * maxD;
    for (const e of S.enemies) { if (e.dead) continue; const d = dist2(x, y, e.x, e.y); if (d < bd) { bd = d; best = e; } }
    return best;
  }
  function enemiesIn(x, y, r) {
    const out = [];
    for (const e of S.enemies) { if (!e.dead && dist2(x, y, e.x, e.y) < (r + e.r) * (r + e.r)) out.push(e); }
    return out;
  }

  // ======== ヒーローの通常攻撃 ========
  function heroAttack(dt) {
    const h = S.hero;
    h.atkT -= dt;
    if (h.spinT > 0) { // バーサーカーR中は常時周囲攻撃
      h.spinTick = (h.spinTick || 0) - dt;
      if (h.spinTick <= 0) {
        h.spinTick = 0.16;
        for (const e of enemiesIn(h.x, h.y, 128)) hurtEnemy(e, effDmg() * 0.55, { kb: 130, kbA: Math.atan2(e.y - h.y, e.x - h.x) });
        spawnRing(h.x, h.y, 128, "#ffb020", 3);
      }
    }
    if (h.atkT > 0) return;
    const w = h.def.weapon;
    if (w === "slash" || w === "axe" || w === "dagger") {
      const tgt = nearestEnemy(h.x, h.y, h.def.range + 26);
      if (!tgt) return;
      h.atkT = effRate(); h.swing = 1;
      h.aim = Math.atan2(tgt.y - h.y, tgt.x - h.x);
      const R = w === "axe" ? 124 : h.def.range + 14;
      const list = enemiesIn(h.x, h.y, R);
      for (const e of list) {
        if (w !== "axe") { const ang = Math.atan2(e.y - h.y, e.x - h.x); let da = Math.abs(ang - h.aim); if (da > Math.PI) da = Math.PI * 2 - da; if (da > 1.85) continue; }
        hurtEnemy(e, effDmg(), { kb: w === "axe" ? 170 : 90, kbA: Math.atan2(e.y - h.y, e.x - h.x) });
      }
      spawnParts(tgt.x, tgt.y, 4, "#ffffff", 150, 3, 0.25);
    } else {
      const tgt = nearestEnemy(h.x, h.y, h.def.range);
      if (!tgt) return;
      h.atkT = effRate(); h.swing = 1;
      h.aim = Math.atan2(tgt.y - h.y, tgt.x - h.x);
      const n = 1 + h.projBonus;
      for (let i = 0; i < n; i++) {
        const spread = (i - (n - 1) / 2) * 0.13;
        const a = h.aim + spread;
        if (w === "bolt") S.projs.push({ kind: "bolt", x: h.x, y: h.y - 6, vx: Math.cos(a) * 540, vy: Math.sin(a) * 540, dmg: effDmg(), target: (i === 0 ? tgt : nearestEnemy(h.x, h.y, h.def.range)), life: 1.4, r: 7 });
        else S.projs.push({ kind: "arrow", x: h.x, y: h.y - 6, vx: Math.cos(a) * 760, vy: Math.sin(a) * 760, dmg: effDmg(), pierce: 1, life: 0.85, r: 5 });
      }
    }
  }

  // ======== スキル ========
  function dash(dist, dmgMul, kb) {
    const h = S.hero;
    let a = Math.atan2(h.vy, h.vx);
    if (Math.hypot(h.vx, h.vy) < 20) a = h.aim;
    const nx = clamp(h.x + Math.cos(a) * dist, 30, WORLD_W - 30);
    const ny = clamp(h.y + Math.sin(a) * dist, 30, WORLD_H - 30);
    if (dmgMul > 0) {
      for (const e of S.enemies) {
        if (e.dead) continue;
        const d = Math.abs((e.x - h.x) * Math.sin(a) - (e.y - h.y) * Math.cos(a));
        const along = (e.x - h.x) * Math.cos(a) + (e.y - h.y) * Math.sin(a);
        if (d < 46 + e.r && along > -10 && along < dist + 20) hurtEnemy(e, effDmg() * dmgMul, { kb: kb || 150, kbA: a });
      }
    }
    spawnParts(h.x, h.y, 12, "#aeb7ea", 120, 4, 0.35);
    h.x = nx; h.y = ny; h.iframes = Math.max(h.iframes, 0.25);
    spawnParts(h.x, h.y, 12, "#aeb7ea", 120, 4, 0.35);
  }
  function castAbility(slot) {
    const h = S.hero;
    if (!S.started || S.over || S.overlay || !h || h.dead) return;
    if (h.cds[slot] > 0) return;
    const id = h.id, D = effDmg();
    if (slot === "q") {
      h.cds.q = 7;
      if (id === "knight") { for (const e of enemiesIn(h.x, h.y, 138)) hurtEnemy(e, D * 2.1, { kb: 240, kbA: Math.atan2(e.y - h.y, e.x - h.x) }); spawnRing(h.x, h.y, 138, "#ffd94d", 6); shakeIt(5); }
      else if (id === "mage") { for (const e of enemiesIn(h.x, h.y, 158)) { hurtEnemy(e, D * 1.1); e.freeze = Math.max(e.freeze, 2.2); } spawnRing(h.x, h.y, 158, "#6be7ff", 6); spawnParts(h.x, h.y, 22, "#aef3ff", 200, 4, 0.4); }
      else if (id === "archer") { for (let i = 0; i < 9; i++) { const a = h.aim + (i - 4) * 0.16; S.projs.push({ kind: "arrow", x: h.x, y: h.y - 6, vx: Math.cos(a) * 780, vy: Math.sin(a) * 780, dmg: D * 0.9, pierce: 1, life: 0.8, r: 5 }); } }
      else if (id === "ninja") { dash(250, 2.0, 180); }
      else if (id === "berserker") { for (const e of enemiesIn(h.x, h.y, 148)) { hurtEnemy(e, D * 1.5, { kb: 200, kbA: Math.atan2(e.y - h.y, e.x - h.x) }); e.slow = Math.max(e.slow, 2); e.slowMul = 0.5; } spawnRing(h.x, h.y, 148, "#ffb020", 6); shakeIt(8); }
    } else if (slot === "e") {
      h.cds.e = 5;
      if (id === "mage") dash(230, 0, 0);
      else if (id === "archer") { dash(190, 0, 0); h.speedBuffT = 2; }
      else if (id === "ninja") { h.iframes = Math.max(h.iframes, 1.2); h.speedBuffT = 1.2; spawnParts(h.x, h.y, 18, "#cfd6ff", 90, 6, 0.5); }
      else if (id === "berserker") dash(210, 1.2, 280);
      else dash(190, 1.4, 220);
    } else if (slot === "r") {
      h.cds.r = 30;
      if (id === "knight") { for (const e of enemiesIn(h.x, h.y, 250)) hurtEnemy(e, D * 4.2, { kb: 380, kbA: Math.atan2(e.y - h.y, e.x - h.x) }); spawnRing(h.x, h.y, 250, "#fff3b0", 9); shakeIt(12); S.hitStop = Math.max(S.hitStop, 0.07); }
      else if (id === "mage") { for (let i = 0; i < 10; i++) { const e = S.enemies[irnd(0, Math.max(0, S.enemies.length - 1))]; const tx = e && !e.dead ? e.x : h.x + rnd(-200, 200), ty = e && !e.dead ? e.y : h.y + rnd(-200, 200); S.meteors.push({ x: tx + rnd(-140, 40), y: ty - 320, tx, ty, t: 0, dur: 0.55 + i * 0.09, dmg: D * 2.4, r: 92 }); } shakeIt(6); }
      else if (id === "archer") { const list = S.enemies.filter(e => !e.dead).slice(0, 40); for (const e of list) S.meteors.push({ x: e.x + rnd(-30, 30), y: e.y - 300, tx: e.x, ty: e.y, t: 0, dur: rnd(0.4, 0.8), dmg: D * 1.7, r: 52, arrowRain: true }); }
      else if (id === "ninja") { for (let i = 0; i < 24; i++) { const a = (Math.PI * 2 * i) / 24; S.projs.push({ kind: "shuriken", x: h.x, y: h.y - 6, vx: Math.cos(a) * 620, vy: Math.sin(a) * 620, dmg: D * 1.3, pierce: 99, life: 0.55, r: 6 }); } spawnRing(h.x, h.y, 90, "#ff5d7a", 5); }
      else if (id === "berserker") { h.spinT = 3; toast("🌀 大旋風！ 3秒間周囲を薙ぎ払う"); }
    }
  }

  // ======== スポーン ========
  function spawnEnemy(type, elite) {
    const def = ENEMIES[type];
    const ang = rnd(0, Math.PI * 2);
    const R = Math.max(WORLD_W, WORLD_H) * 0.52;
    const x = clamp(CORE.x + Math.cos(ang) * R, 24, WORLD_W - 24);
    const y = clamp(CORE.y + Math.sin(ang) * R, 24, WORLD_H - 24);
    const hpMul = (1 + (S.phase - 1) * 0.38 + S.t / 700) * (elite ? 5 : 1);
    S.enemies.push({
      type, def, x, y, vx: 0, vy: 0, kbx: 0, kby: 0,
      hp: def.hp * hpMul, maxHp: def.hp * hpMul,
      r: def.r * (elite ? 1.4 : 1) * (type === "boss" ? 1 : 1),
      elite: !!elite, boss: type === "boss", flash: 0, slow: 0, slowMul: 1, freeze: 0,
      atkT: rnd(0, 0.4), wob: rnd(0, 6.28), dead: false
    });
  }
  function director(dt) {
    S.phaseT += dt;
    if (S.phaseT >= 45) {
      S.phaseT = 0; S.phase++;
      S.gold += 30 + S.phase * 2;
      banner("🌊 WAVE " + S.phase);
      if (S.phase % 4 === 0) { spawnEnemy("boss", false); banner("👹 ボス出現！ WAVE " + S.phase); toast("👹 ボスが接近中！"); }
      updateHUD();
    }
    const cap = Math.min(120, 18 + S.phase * 7);
    S.spawnT -= dt;
    if (S.spawnT <= 0 && S.enemies.length < cap) {
      S.spawnT = Math.max(0.3, 1.5 - S.phase * 0.08);
      const roll = Math.random();
      let type = "slime";
      if (S.phase >= 2 && roll < 0.22) type = "wolf";
      if (S.phase >= 3 && roll >= 0.22 && roll < 0.38) type = "bat";
      if (S.phase >= 4 && roll >= 0.38 && roll < 0.52) type = "shade";
      if (S.phase >= 5 && roll >= 0.52 && roll < 0.64) type = "golem";
      spawnEnemy(type, Math.random() < 0.045);
      if (S.phase >= 6 && Math.random() < 0.4) spawnEnemy("slime", false);
    }
  }

  // ======== 更新 ========
  function updateHero(dt) {
    const h = S.hero;
    if (h.dead) {
      h.respawnT -= dt;
      if (h.respawnT <= 0) {
        h.dead = false; h.hp = effMaxHp(); h.x = CORE.x; h.y = CORE.y + 100; h.vx = h.vy = 0; h.iframes = 2;
        spawnRing(h.x, h.y, 70, "#7de3ff", 5); toast("✨ ヒーロー復活！");
      }
      return;
    }
    // 入力ベクトル
    let ix = 0, iy = 0;
    if (joy.active && Math.hypot(joy.dx, joy.dy) > 0.12) { ix = joy.dx; iy = joy.dy; moveTarget = null; }
    else {
      if (keys["w"] || keys["arrowup"]) iy -= 1;
      if (keys["s"] || keys["arrowdown"]) iy += 1;
      if (keys["a"] || keys["arrowleft"]) ix -= 1;
      if (keys["d"] || keys["arrowright"]) ix += 1;
      if (ix === 0 && iy === 0 && moveTarget) {
        const dx = moveTarget.x - h.x, dy = moveTarget.y - h.y, d = Math.hypot(dx, dy);
        if (d > 12) { ix = dx / d; iy = dy / d; } else moveTarget = null;
      }
    }
    const il = Math.hypot(ix, iy);
    if (il > 1) { ix /= il; iy /= il; }
    // ヌルヌル移動：加速度＋慣性
    const ACC = 2600, FRIC = 7.5, SP = effSpeed();
    h.vx += ix * ACC * dt; h.vy += iy * ACC * dt;
    const damp = Math.exp(-FRIC * dt);
    if (ix === 0) h.vx *= damp;
    if (iy === 0) h.vy *= damp;
    const vl = Math.hypot(h.vx, h.vy);
    if (vl > SP) { h.vx = h.vx / vl * SP; h.vy = h.vy / vl * SP; }
    h.x = clamp(h.x + h.vx * dt, 24, WORLD_W - 24);
    h.y = clamp(h.y + h.vy * dt, 24, WORLD_H - 24);
    if (vl > 30) { h.walk += dt * (6 + vl * 0.045); h.face = h.vx < -8 ? -1 : h.vx > 8 ? 1 : h.face; h.aim = Math.atan2(h.vy, h.vx); }
    h.swing = Math.max(0, h.swing - dt * 6);
    h.iframes = Math.max(0, h.iframes - dt);
    h.speedBuffT = Math.max(0, h.speedBuffT - dt);
    h.spinT = Math.max(0, h.spinT - dt);
    for (const k of ["q", "e", "r"]) h.cds[k] = Math.max(0, h.cds[k] - dt);
    heroAttack(dt);
    // ジェム回収
    for (const g of S.gems) {
      if (g.got) continue;
      const d2 = dist2(h.x, h.y, g.x, g.y);
      if (d2 < h.magnet * h.magnet) { const d = Math.sqrt(d2) || 1; const sp = 460 * dt; g.x += (h.x - g.x) / d * sp; g.y += (h.y - g.y) / d * sp; }
      if (d2 < 30 * 30) { g.got = true; gainXp(g.v); spawnParts(g.x, g.y, 3, "#a8ff6b", 90, 3, 0.25); }
    }
    // 装備回収
    for (const dr of S.drops) {
      if (dr.got) continue;
      if (dist2(h.x, h.y, dr.x, dr.y) < 34 * 34) {
        dr.got = true;
        if (S.inventory.length >= 30) { S.gold += dr.item.scrap; toast("🎒 いっぱい… " + dr.item.name + " を換金 +" + dr.item.scrap + "G"); }
        else { S.inventory.push(dr.item); toast("🎒 " + dr.item.rname + "の" + dr.item.name + " を拾った！"); }
        spawnParts(dr.x, dr.y, 10, dr.item.color, 130, 3.5, 0.4);
      }
    }
  }

  function updateEnemies(dt) {
    const h = S.hero;
    for (const e of S.enemies) {
      if (e.dead) continue;
      e.flash = Math.max(0, e.flash - dt * 7);
      e.slow = Math.max(0, e.slow - dt);
      e.freeze = Math.max(0, e.freeze - dt);
      // 目標：コア or ヒーロー（近い方／好み）
      let tx = CORE.x, ty = CORE.y, tr = CORE.r + e.r - 4, isHero = false;
      const dh = Math.sqrt(dist2(e.x, e.y, h.x, h.y));
      if (!h.dead && (dh < e.def.heroPref || (e.def.heroPref > 0 && dh < Math.sqrt(dist2(e.x, e.y, CORE.x, CORE.y))))) { tx = h.x; ty = h.y; tr = e.r + 16; isHero = true; }
      const dx = tx - e.x, dy = ty - e.y, d = Math.hypot(dx, dy) || 1;
      const spd = e.def.spd * (e.freeze > 0 ? 0 : e.slow > 0 ? e.slowMul : 1);
      if (d > tr) {
        e.vx = dx / d * spd; e.vy = dy / d * spd;
        e.x += (e.vx + e.kbx) * dt; e.y += (e.vy + e.kby) * dt;
      } else {
        e.atkT -= dt;
        if (e.atkT <= 0) {
          e.atkT = 1.0;
          if (isHero) hurtHero(e.def.heroDmg); else hurtCore(e.def.coreDmg);
          spawnParts(tx, ty, 3, "#ffffff", 100, 3, 0.2);
        }
      }
      e.kbx *= Math.exp(-6 * dt); e.kby *= Math.exp(-6 * dt);
      e.wob += dt * 7;
    }
    // 分離（重なり防止＝群れのヌルヌル感）
    const list = S.enemies;
    for (let i = 0; i < list.length; i++) {
      const a = list[i]; if (a.dead) continue;
      for (let j = i + 1; j < list.length; j++) {
        const b = list[j]; if (b.dead) continue;
        const dx = b.x - a.x, dy = b.y - a.y, rr = a.r + b.r;
        const d2 = dx * dx + dy * dy;
        if (d2 > 0.01 && d2 < rr * rr) {
          const d = Math.sqrt(d2), push = (rr - d) * 0.5 * 0.6;
          const ux = dx / d, uy = dy / d;
          a.x -= ux * push; a.y -= uy * push; b.x += ux * push; b.y += uy * push;
        }
      }
    }
    S.enemies = S.enemies.filter(e => !e.dead);
  }

  function updateProjs(dt) {
    for (const p of S.projs) {
      if (p.kind === "bolt" && p.target && !p.target.dead) {
        const a = Math.atan2(p.target.y - p.y, p.target.x - p.x);
        const cur = Math.atan2(p.vy, p.vx);
        let da = a - cur; while (da > Math.PI) da -= Math.PI * 2; while (da < -Math.PI) da += Math.PI * 2;
        const na = cur + clamp(da, -9 * dt, 9 * dt), sp = Math.hypot(p.vx, p.vy);
        p.vx = Math.cos(na) * sp; p.vy = Math.sin(na) * sp;
      }
      p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt;
      if (Math.random() < 0.6) S.parts.push({ x: p.x, y: p.y, vx: rnd(-16, 16), vy: rnd(-16, 16), life: 0.22, max: 0.22, size: 2.6, color: p.kind === "bolt" ? "#6be7ff" : p.kind === "shuriken" ? "#ff8fa3" : "#ffe28a", grav: 0 });
      if (p.kind !== "shell") {
        for (const e of S.enemies) {
          if (e.dead || p.life <= 0) continue;
          if (dist2(p.x, p.y, e.x, e.y) < (p.r + e.r) * (p.r + e.r)) {
            if (p.slow) { e.slow = Math.max(e.slow, 1.1); e.slowMul = 1 - p.slow; }
            hurtEnemy(e, p.dmg, { kb: 60, kbA: Math.atan2(p.vy, p.vx) });
            if (p.kind === "arrow" || p.kind === "shuriken") { p.pierce--; if (p.pierce < 0) p.life = 0; }
            else p.life = 0;
          }
        }
      }
      if (p.x < -40 || p.x > WORLD_W + 40 || p.y < -40 || p.y > WORLD_H + 40) p.life = 0;
    }
    // 砲弾の着弾爆発
    for (const p of S.projs) {
      if (p.kind === "shell" && p.life <= 0 && !p.boom) {
        p.boom = true;
        for (const e of enemiesIn(p.tx, p.ty, p.splash)) hurtEnemy(e, p.dmg, {});
        spawnParts(p.tx, p.ty, 16, "#ffb37d", 220, 4.5, 0.4, 150); spawnRing(p.tx, p.ty, p.splash, "#ffb37d", 4);
      }
    }
    S.projs = S.projs.filter(p => p.life > 0);
    // メテオ／アローレイン
    for (const m of S.meteors) {
      m.t += dt;
      if (m.t >= m.dur && !m.done) {
        m.done = true;
        for (const e of enemiesIn(m.tx, m.ty, m.r)) hurtEnemy(e, m.dmg, { kb: 120, kbA: Math.atan2(e.y - m.ty, e.x - m.tx) });
        spawnParts(m.tx, m.ty, m.arrowRain ? 8 : 22, m.arrowRain ? "#ffe28a" : "#ff9d5c", 240, 4.5, 0.45, 150);
        spawnRing(m.tx, m.ty, m.r, m.arrowRain ? "#ffe28a" : "#ff9d5c", 4);
        if (!m.arrowRain) shakeIt(4);
      }
    }
    S.meteors = S.meteors.filter(m => !m.done);
  }

  function updateTowers(dt) {
    for (const pad of PADS) {
      const tw = pad.tower; if (!tw) continue;
      tw.cd -= dt;
      const def = TOWERS[tw.type];
      const tgt = nearestEnemy(pad.x, pad.y, def.range);
      tw.aim = tgt ? Math.atan2(tgt.y - pad.y, tgt.x - pad.x) : tw.aim || 0;
      if (!tgt || tw.cd > 0) continue;
      tw.cd = def.rate;
      if (tw.type === "cannon") S.projs.push({ kind: "shell", x: pad.x, y: pad.y - 14, vx: (tgt.x - pad.x) * 2.2, vy: (tgt.y - pad.y) * 2.2 - 130, dmg: tw.dmg * S.towerMul, life: 0.45, r: 8, splash: def.splash, tx: tgt.x, ty: tgt.y, tower: true });
      else {
        const a = tw.aim, sp = tw.type === "sniper" ? 980 : 640;
        S.projs.push({ kind: tw.type, x: pad.x, y: pad.y - 14, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, dmg: tw.dmg * S.towerMul, pierce: 0, life: tw.type === "sniper" ? 0.5 : 0.42, r: 5, tower: true, slow: def.slow });
      }
    }
  }

  function updateFx(dt) {
    for (const p of S.parts) { p.life -= dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += (p.grav || 0) * dt; }
    S.parts = S.parts.filter(p => p.life > 0);
    for (const r of S.rings) { r.life -= dt; r.r += (r.maxR - r.r) * Math.min(1, dt * 14); }
    S.rings = S.rings.filter(r => r.life > 0);
    for (const n of S.nums) { n.life -= dt; n.y += n.vy * dt; n.vy *= Math.exp(-2.4 * dt); }
    S.nums = S.nums.filter(n => n.life > 0);
    S.gems = S.gems.filter(g => !g.got);
    S.drops = S.drops.filter(d => !d.got);
    if (S.bannerT > 0) { S.bannerT -= dt; if (S.bannerT <= 0) { const b = $("banner"); b.style.transition = "opacity .5s"; b.style.opacity = "0"; } }
  }

  // ======== レベルアップ ========
  const UPGRADES = [
    { id: "dmg", icon: "⚔️", t: "攻撃力アップ", d: "全攻撃のダメージ +20%", can: () => true, ap: h => { h.dmgMul += 0.2; } },
    { id: "rate", icon: "⏩", t: "攻撃速度アップ", d: "通常攻撃の間隔 -13%", can: () => true, ap: h => { h.rateMul *= 0.87; } },
    { id: "proj", icon: "✨", t: "投射物 +1", d: "通常攻撃の弾が1発増える", can: h => h.def.weapon === "bolt" || h.def.weapon === "arrow", ap: h => { h.projBonus += 1; } },
    { id: "hp", icon: "❤️", t: "最大HPアップ", d: "最大HP +25、その場で25回復", can: () => true, ap: h => { h.upgHp += 25; h.hp = Math.min(effMaxHp(), h.hp + 25); } },
    { id: "spd", icon: "👟", t: "移動速度アップ", d: "移動速度 +10%", can: () => true, ap: h => { h.spdMul += 0.10; } },
    { id: "crit", icon: "💥", t: "会心アップ", d: "会心率 +10%（会心は1.8倍ダメージ）", can: () => true, ap: h => { h.crit += 0.10; } },
    { id: "magnet", icon: "🧲", t: "吸引アップ", d: "経験値ジェムの吸引範囲 +70%", can: () => true, ap: h => { h.magnet *= 1.7; } },
    { id: "vamp", icon: "🩸", t: "吸血", d: "与ダメージの3%を回復", can: () => true, ap: h => { h.vamp += 0.03; } },
    { id: "tower", icon: "🗼", t: "タワー強化", d: "全タワーのダメージ +25%", can: () => true, ap: () => { S.towerMul += 0.25; } },
    { id: "gold", icon: "🪙", t: "金運アップ", d: "獲得ゴールド +25%", can: () => true, ap: h => { h.goldMul += 0.25; } },
    { id: "armor", icon: "🛡️", t: "防御アップ", d: "被ダメージ -12%", can: () => true, ap: h => { h.armorMul *= 0.88; } },
    { id: "core", icon: "💎", t: "コア修復", d: "コアのHPを +4 回復", can: () => CORE.hp < CORE.maxHp, ap: () => { CORE.hp = Math.min(CORE.maxHp, CORE.hp + 4); } }
  ];
  function gainXp(v) {
    const h = S.hero; h.xp += v;
    if (h.xp >= h.xpNext && !S.over) {
      h.xp -= h.xpNext; h.level++; h.xpNext = 7 + h.level * 4;
      openLevelUp();
    }
    updateHUD();
  }
  function openLevelUp() {
    S.overlay = "lv";
    const h = S.hero;
    const pool = UPGRADES.filter(u => u.can(h));
    const picks = [];
    while (picks.length < 3 && pool.length) picks.push(pool.splice(irnd(0, pool.length - 1), 1)[0]);
    const wrap = $("lvCards"); wrap.innerHTML = "";
    picks.forEach((u, i) => {
      const b = document.createElement("button"); b.className = "card";
      const t = document.createElement("div"); t.className = "t"; t.textContent = u.icon + " " + u.t;
      const d = document.createElement("div"); d.className = "d"; d.textContent = u.d;
      b.appendChild(t); b.appendChild(d);
      b.addEventListener("click", () => { u.ap(h); S.overlay = null; $("lvOv").classList.remove("show"); updateHUD(); toast("⭐ " + u.t); });
      wrap.appendChild(b);
    });
    $("lvOv").classList.add("show");
  }

  // ======== タワー建設UI ========
  function openBuild(i) {
    S.buildPad = i; S.overlay = "build";
    const pad = PADS[i], tw = pad.tower;
    $("buildTitle").textContent = tw ? "🗼 " + TOWERS[tw.type].icon + TOWERS[tw.type].name + " Lv" + tw.lv : "🗼 タワーを建てる（残り " + S.gold + "G）";
    const wrap = $("buildCards"); wrap.innerHTML = "";
    const ops = $("towerOps"); ops.innerHTML = "";
    if (!tw) {
      for (const key of Object.keys(TOWERS)) {
        const def = TOWERS[key];
        const b = document.createElement("button"); b.className = "card";
        const t = document.createElement("div"); t.className = "t"; t.textContent = def.icon + " " + def.name;
        const d = document.createElement("div"); d.className = "d";
        d.textContent = "射程" + def.range + " / ダメージ" + def.dmg + (def.splash ? " / 範囲" + def.splash : "") + (def.slow ? " / 鈍足" + Math.round(def.slow * 100) + "%" : "");
        const p = document.createElement("div"); p.className = "price"; p.textContent = def.cost + " G";
        b.appendChild(t); b.appendChild(d); b.appendChild(p);
        if (S.gold < def.cost) b.disabled = true;
        b.addEventListener("click", () => buildTower(i, key));
        wrap.appendChild(b);
      }
    } else {
      const def = TOWERS[tw.type];
      if (tw.lv < 3) {
        const upCost = Math.round(def.cost * 0.9 * tw.lv);
        const b = document.createElement("button"); b.className = "btn";
        b.textContent = "⬆️ 強化する（" + upCost + "G）→ Lv" + (tw.lv + 1) + "（ダメージ×1.55）";
        if (S.gold < upCost) b.disabled = true;
        b.addEventListener("click", () => {
          S.gold -= upCost; tw.lv++; tw.dmg = Math.round(tw.dmg * 1.55);
          closeOverlay("buildOv"); updateHUD(); toast("🗼 " + def.name + " を Lv" + tw.lv + " に強化！");
        });
        ops.appendChild(b);
      }
      const sellVal = Math.round(tw.invested * 0.7);
      const s = document.createElement("button"); s.className = "btn sub";
      s.textContent = "💰 売却する（+" + sellVal + "G）";
      s.addEventListener("click", () => { S.gold += sellVal; pad.tower = null; closeOverlay("buildOv"); updateHUD(); });
      ops.appendChild(s);
    }
    $("buildOv").classList.add("show");
  }
  function buildTower(i, key) {
    const def = TOWERS[key];
    if (S.gold < def.cost) return;
    S.gold -= def.cost;
    PADS[i].tower = { type: key, lv: 1, dmg: def.dmg, cd: 0, invested: def.cost, aim: 0 };
    spawnRing(PADS[i].x, PADS[i].y, 60, "#ffd94d", 5);
    closeOverlay("buildOv"); updateHUD();
    toast(def.icon + " " + def.name + " を建設！");
  }
  function closeOverlay(id) { S.overlay = null; $(id).classList.remove("show"); }

  // ======== インベントリUI ========
  function openInv() {
    S.overlay = "inv";
    const b = itemBonus();
    $("eqSummary").textContent = "装備中ボーナス： 攻撃+" + b.atk + "% / 攻速+" + b.rate + "% / 最大HP+" + b.hp + " / 移動+" + b.spd + "% / 会心+" + b.crit + "%";
    const list = $("invList"); list.innerHTML = "";
    const rows = [];
    for (const slot of ["weapon", "armor", "charm"]) if (S.equipped[slot]) rows.push({ it: S.equipped[slot], eq: true });
    for (const it of S.inventory) rows.push({ it, eq: false });
    if (!rows.length) { list.textContent = "（まだ何も拾っていません。敵を倒すと低確率、エリート・ボスは高確率で落とします）"; }
    for (const row of rows) {
      const it = row.it;
      const div = document.createElement("div"); div.className = "ritem";
      const inf = document.createElement("div"); inf.className = "inf";
      const nm = document.createElement("div");
      const nmSpan = document.createElement("span"); nmSpan.style.color = it.color; nmSpan.style.fontWeight = "800";
      nmSpan.textContent = (row.eq ? "装備中 " : "") + "[" + SLOTS[it.slot] + "] " + it.rname + "の" + it.name;
      nm.appendChild(nmSpan);
      const st = document.createElement("div"); st.style.color = "#aeb7ea"; st.style.fontSize = "12px"; st.textContent = statText(it);
      inf.appendChild(nm); inf.appendChild(st); div.appendChild(inf);
      if (!row.eq) {
        const cur = S.equipped[it.slot];
        const btn = document.createElement("button");
        btn.textContent = cur ? (itemPower(it) >= itemPower(cur) ? "装備▲" : "装備") : "装備";
        btn.addEventListener("click", () => {
          const old = S.equipped[it.slot];
          S.equipped[it.slot] = it;
          S.inventory = S.inventory.filter(x => x !== it);
          if (old) S.inventory.push(old);
          const h = S.hero; if (h.hp > effMaxHp()) h.hp = effMaxHp();
          openInv(); updateHUD();
        });
        div.appendChild(btn);
        const sc = document.createElement("button"); sc.textContent = "売却 " + it.scrap + "G";
        sc.addEventListener("click", () => { S.gold += it.scrap; S.inventory = S.inventory.filter(x => x !== it); openInv(); updateHUD(); });
        div.appendChild(sc);
      }
      list.appendChild(div);
    }
    $("invOv").classList.add("show");
  }

  // ======== ランキング ========
  async function showRanking() {
    S.overlay = "rank";
    $("rankOv").classList.add("show");
    $("rankList").textContent = "読み込み中…";
    const res = await window.GameDB.fetchScores(20);
    const rows = res.rows;
    $("rankSrc").textContent = res.online ? "（オンライン）" : "（この端末）";
    const tbl = document.createElement("table"); tbl.className = "rk";
    const thead = document.createElement("tr");
    for (const h of ["順位", "名前", "スコア", "到達WAVE", "撃破", "ヒーロー"]) { const th = document.createElement("th"); th.textContent = h; thead.appendChild(th); }
    tbl.appendChild(thead);
    if (!rows.length) { const tr = document.createElement("tr"); const td = document.createElement("td"); td.colSpan = 6; td.textContent = "まだ記録がありません"; tr.appendChild(td); tbl.appendChild(tr); }
    rows.forEach((r, i) => {
      const tr = document.createElement("tr");
      const vals = [i + 1, r.name || "名無し", r.score, r.wave, r.kills, r.hero || ""];
      vals.forEach((v, j) => { const td = document.createElement("td"); td.textContent = v; if (j === 2) td.style.fontWeight = "800"; tr.appendChild(td); });
      tbl.appendChild(tr);
    });
    $("rankList").innerHTML = ""; $("rankList").appendChild(tbl);
  }

  // ======== HUD ========
  function fmtTime(sec) { const m = Math.floor(sec / 60), s = Math.floor(sec % 60); return m + ":" + (s < 10 ? "0" : "") + s; }
  function updateHUD() {
    const h = S.hero; if (!h) return;
    $("hudTime").textContent = fmtTime(S.t);
    $("hudWave").textContent = S.phase;
    $("hudLevel").textContent = h.level;
    $("hudGold").textContent = S.gold;
    $("hudKills").textContent = S.kills;
    $("xpFill").style.width = clamp(h.xp / h.xpNext * 100, 0, 100) + "%";
    $("coreFill").style.width = clamp(CORE.hp / CORE.maxHp * 100, 0, 100) + "%";
    $("coreHpTxt").textContent = Math.max(0, Math.ceil(CORE.hp)) + "/" + CORE.maxHp;
    $("heroHpFill").style.width = clamp(h.hp / effMaxHp() * 100, 0, 100) + "%";
    // スキルCD
    for (const slot of ["q", "e", "r"]) {
      const cd = $("cd" + slot.toUpperCase());
      const cdv = h.cds[slot];
      if (cdv > 0.05) { cd.style.display = "flex"; cd.textContent = Math.ceil(cdv); }
      else cd.style.display = "none";
    }
  }

  // ======== ゲーム開始／終了 ========
  function startGame(heroId) {
    S.selectedHero = heroId || S.selectedHero;
    S.hero = newHero(S.selectedHero);
    S.started = true; S.over = false; S.overlay = null;
    S.t = 0; S.phase = 1; S.phaseT = 0; S.gold = 200; S.kills = 0; S.spawnT = 0.5;
    S.enemies = []; S.projs = []; S.gems = []; S.drops = []; S.parts = []; S.rings = []; S.nums = []; S.meteors = [];
    S.inventory = []; S.equipped = { weapon: null, armor: null, charm: null }; S.towerMul = 1;
    CORE.hp = CORE.maxHp;
    for (const p of PADS) p.tower = null;
    S.cam.x = S.hero.x; S.cam.y = S.hero.y;
    moveTarget = null; joy.active = false; $("joyBase").style.display = "none";
    const d = S.hero.def;
    $("btnQ").childNodes[0].textContent = d.qIcon;
    $("btnE").childNodes[0].textContent = d.eIcon;
    $("btnR").childNodes[0].textContent = d.rIcon;
    $("startOv").classList.remove("show"); $("overOv").classList.remove("show");
    $("hud").style.display = "block"; $("sideBtns").style.display = "flex"; $("abilBtns").style.display = "flex";
    banner(d.icon + " " + d.name + " 出撃！");
    toast("コアを守れ！ 台座タップでタワー建設");
    updateHUD();
  }
  async function gameOver() {
    S.over = true;
    const h = S.hero;
    const score = S.kills * 15 + (S.phase - 1) * 500 + h.level * 100 + Math.floor(S.t) * 5;
    shakeIt(16); S.hitStop = 0.12;
    spawnParts(CORE.x, CORE.y, 60, "#7de3ff", 320, 6, 0.9, 120);
    const name = ($("nameInput").value || "").trim() || "名無し";
    $("overStats").textContent = "スコア " + score + " ／ 生存 " + fmtTime(S.t) + "（WAVE " + S.phase + "）／ 撃破 " + S.kills + " ／ Lv " + h.level + " ／ ヒーロー：" + h.def.icon + h.def.name;
    $("submitMsg").textContent = "記録を保存中…";
    $("overOv").classList.add("show"); S.overlay = "over";
    const res = await window.GameDB.submitScore({ name, score, wave: S.phase, kills: S.kills });
    const best = window.GameDB.localRanks()[0];
    $("submitMsg").textContent = res.online ? "🌐 オンラインランキングに登録しました" : "📱 この端末のランキングに登録しました";
    $("bestTxt").textContent = best ? ("スコア " + best.score + "（WAVE " + best.wave + "到達）") : "なし";
  }

// ======== 描画 ========
function drawHero(h) {
const bob = Math.sin(h.walk) * 2.2;
ctx.save();
ctx.translate(h.x, h.y + bob);
if (h.iframes > 0 && Math.sin(S.t * 42) > 0) ctx.globalAlpha = 0.45;
// 影
ctx.fillStyle = "rgba(0,0,0,0.35)"; ctx.beginPath(); ctx.ellipse(0, 14 - bob, 15, 5, 0, 0, 7); ctx.fill();
const d = h.def, R = h.id === "berserker"? 17: 15;
// 体
ctx.fillStyle = d.body; ctx.strokeStyle = "rgba(0,0,0,0.45)"; ctx.lineWidth = 2;
ctx.beginPath(); ctx.arc(0, 0, R, 0, 7); ctx.fill(); ctx.stroke();
ctx.fillStyle = d.sub; ctx.fillRect(-R + 3, 3, R * 2 - 6, 5); // ベルト帯
// 頭
ctx.fillStyle = "#ffd9b3"; ctx.beginPath(); ctx.arc(0, -R - 4, 8.5, 0, 7); ctx.fill(); ctx.stroke();
// ヒーロー別アクセサリ
if (h.id === "knight") {
ctx.fillStyle = "#c8d2e8"; ctx.beginPath(); ctx.arc(0, -R - 5, 8.8, Math.PI, 0); ctx.fill();
ctx.fillStyle = d.sub; ctx.beginPath(); ctx.moveTo(-2, -R - 13); ctx.lineTo(-11, -R - 19); ctx.lineTo(-1, -R - 17); ctx.fill();
} else if (h.id === "mage") {
ctx.fillStyle = d.body; ctx.beginPath(); ctx.moveTo(-10, -R - 8); ctx.lineTo(0, -R - 26); ctx.lineTo(10, -R - 8); ctx.closePath(); ctx.fill(); ctx.stroke();
ctx.fillStyle = d.accent; ctx.fillRect(-10, -R - 9, 20, 3.4);
} else if (h.id === "archer") {
ctx.fillStyle = d.sub; ctx.beginPath(); ctx.arc(0, -R - 5, 8.8, Math.PI * 0.9, Math.PI * 2.1); ctx.lineTo(0, -R - 5); ctx.fill();
} else if (h.id === "ninja") {
ctx.fillStyle = d.accent; ctx.fillRect(-9, -R - 8, 18, 4);
ctx.beginPath(); ctx.moveTo(-9, -R - 6); ctx.quadraticCurveTo(-16, -R - 2 + Math.sin(h.walk * 2) * 2, -19, -R + 3); ctx.lineTo(-10, -R - 3); ctx.fill();
} else if (h.id === "berserker") {
ctx.fillStyle = "#d8d8e0"; ctx.beginPath(); ctx.moveTo(-9, -R - 8); ctx.quadraticCurveTo(-14, -R - 16, -9, -R - 17); ctx.quadraticCurveTo(-6, -R - 11, -5, -R - 8); ctx.fill();
ctx.beginPath(); ctx.moveTo(9, -R - 8); ctx.quadraticCurveTo(14, -R - 16, 9, -R - 17); ctx.quadraticCurveTo(6, -R - 11, 5, -R - 8); ctx.fill();
}
// 武器
const aim = h.aim, sw = h.swing > 0? Math.sin(h.swing * Math.PI) * -1.0: 0;
const hx = Math.cos(aim) * (R - 2), hy = Math.sin(aim) * (R - 2) - 2;
ctx.save(); ctx.translate(hx, hy); ctx.rotate(aim + sw);
if (d.weapon === "slash") {
ctx.fillStyle = "#8a6d1f"; ctx.fillRect(0, -2, 5, 4);
ctx.fillStyle = "#e8eefc"; ctx.beginPath(); ctx.moveTo(5, -2.6); ctx.lineTo(26, -1); ctx.lineTo(28, 0); ctx.lineTo(26, 1); ctx.lineTo(5, 2.6); ctx.closePath(); ctx.fill();
} else if (d.weapon === "axe") {
ctx.fillStyle = "#7a4d22"; ctx.fillRect(0, -2, 24, 4);
ctx.fillStyle = "#cfd6e4"; ctx.beginPath(); ctx.arc(24, 0, 10, -1.1, 1.1); ctx.lineTo(24, 0); ctx.fill();
} else if (d.weapon === "bolt") {
ctx.fillStyle = "#5e4322"; ctx.fillRect(0, -1.6, 22, 3.2);
ctx.fillStyle = d.accent; ctx.shadowColor = d.accent; ctx.shadowBlur = 12;
ctx.beginPath(); ctx.arc(24, 0, 5, 0, 7); ctx.fill(); ctx.shadowBlur = 0;
} else if (d.weapon === "arrow") {
ctx.strokeStyle = "#a9742f"; ctx.lineWidth = 3;
ctx.beginPath(); ctx.arc(6, 0, 13, -1.25, 1.25); ctx.stroke();
ctx.strokeStyle = "#e8e8f0"; ctx.lineWidth = 1.2;
ctx.beginPath(); ctx.moveTo(6 + Math.cos(-1.25) * 13, Math.sin(-1.25) * 13); ctx.lineTo(6 + Math.cos(1.25) * 13, Math.sin(1.25) * 13); ctx.stroke();
} else if (d.weapon === "dagger") {
ctx.fillStyle = "#dfe6f5";
ctx.beginPath(); ctx.moveTo(0, -6); ctx.lineTo(15, -8); ctx.lineTo(15, -4.6); ctx.lineTo(0, -3.4); ctx.closePath(); ctx.fill();
ctx.beginPath(); ctx.moveTo(0, 6); ctx.lineTo(15, 8); ctx.lineTo(15, 4.6); ctx.lineTo(0, 3.4); ctx.closePath(); ctx.fill();
}
ctx.restore();
// 大旋風エフェクト
if (h.spinT > 0) {
ctx.strokeStyle = "rgba(255,176,32,0.75)"; ctx.lineWidth = 5;
const a0 = S.t * 22;
ctx.beginPath(); ctx.arc(0, 0, 46, a0, a0 + 3.6); ctx.stroke();
ctx.beginPath(); ctx.arc(0, 0, 46, a0 + Math.PI, a0 + Math.PI + 3.6); ctx.stroke();
}
ctx.restore();
// 名前とHP
ctx.fillStyle = "#fff"; ctx.font = "bold 11px sans-serif"; ctx.textAlign = "center";
ctx.fillText(d.icon + d.name, h.x, h.y - R - 30 + bob);
}

function drawEnemy(e) {
ctx.save(); ctx.translate(e.x, e.y);
const wob = Math.sin(e.wob), dirA = Math.atan2(e.vy, e.vx);
ctx.fillStyle = "rgba(0,0,0,0.3)"; ctx.beginPath(); ctx.ellipse(0, e.r * 0.85, e.r * 0.9, e.r * 0.3, 0, 0, 7); ctx.fill();
if (e.type === "slime") {
const sq = 1 + wob * 0.13;
ctx.scale(1 / Math.sqrt(sq), sq);
const g = ctx.createRadialGradient(-e.r * 0.3, -e.r * 0.4, 2, 0, 0, e.r * 1.2);
g.addColorStop(0, "#8ff5a8"); g.addColorStop(1, "#2ea85c");
ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, e.r, 0, 7); ctx.fill();
ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(-e.r * 0.35, -e.r * 0.2, e.r * 0.22, 0, 7); ctx.arc(e.r * 0.35, -e.r * 0.2, e.r * 0.22, 0, 7); ctx.fill();
ctx.fillStyle = "#123"; ctx.beginPath(); ctx.arc(-e.r * 0.35, -e.r * 0.15, e.r * 0.11, 0, 7); ctx.arc(e.r * 0.35, -e.r * 0.15, e.r * 0.11, 0, 7); ctx.fill();
} else if (e.type === "wolf") {
ctx.rotate(dirA);
ctx.strokeStyle = "#5d6a80"; ctx.lineWidth = 3;
const lp = Math.sin(e.wob * 1.6) * 4;
ctx.beginPath(); ctx.moveTo(-e.r * 0.6, e.r * 0.4); ctx.lineTo(-e.r * 0.6 + lp, e.r * 0.95); ctx.moveTo(e.r * 0.5, e.r * 0.4); ctx.lineTo(e.r * 0.5 - lp, e.r * 0.95); ctx.stroke();
ctx.strokeStyle = "#8d99ae"; ctx.lineWidth = 4;
ctx.beginPath(); ctx.moveTo(-e.r, 0); ctx.quadraticCurveTo(-e.r * 1.5, Math.sin(e.wob * 2) * 4, -e.r * 1.7, -3); ctx.stroke();
ctx.fillStyle = "#8d99ae"; ctx.beginPath(); ctx.ellipse(0, 0, e.r * 1.2, e.r * 0.78, 0, 0, 7); ctx.fill();
ctx.beginPath(); ctx.arc(e.r * 1.05, -2, e.r * 0.62, 0, 7); ctx.fill();
ctx.fillStyle = "#5d6a80";
ctx.beginPath(); ctx.moveTo(e.r * 0.8, -e.r * 0.55); ctx.lineTo(e.r * 0.95, -e.r * 1.05); ctx.lineTo(e.r * 1.15, -e.r * 0.5); ctx.fill();
ctx.beginPath(); ctx.moveTo(e.r * 1.25, -e.r * 0.55); ctx.lineTo(e.r * 1.45, -e.r * 1.0); ctx.lineTo(e.r * 1.55, -e.r * 0.45); ctx.fill();
ctx.fillStyle = "#ffd94d"; ctx.beginPath(); ctx.arc(e.r * 1.25, -3, 2.2, 0, 7); ctx.fill();
ctx.fillStyle = "#222"; ctx.beginPath(); ctx.arc(e.r * 1.62, -1, 2.4, 0, 7); ctx.fill();
} else if (e.type === "bat") {
const flap = Math.sin(S.t * 20 + e.wob) * 0.55;
ctx.fillStyle = "#4a3a6e";
ctx.save(); ctx.rotate(-0.5 - flap * 0.5); ctx.beginPath(); ctx.ellipse(-e.r * 1.05, 0, e.r * 1.05, e.r * 0.42, 0, 0, 7); ctx.fill(); ctx.restore();
ctx.save(); ctx.rotate(0.5 + flap * 0.5); ctx.beginPath(); ctx.ellipse(e.r * 1.05, 0, e.r * 1.05, e.r * 0.42, 0, 0, 7); ctx.fill(); ctx.restore();
ctx.fillStyle = "#6a549e"; ctx.beginPath(); ctx.arc(0, 0, e.r * 0.72, 0, 7); ctx.fill();
ctx.fillStyle = "#ff5d5d"; ctx.beginPath(); ctx.arc(-3.4, -1.6, 1.9, 0, 7); ctx.arc(3.4, -1.6, 1.9, 0, 7); ctx.fill();
ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.moveTo(-3, 3); ctx.lineTo(-1.2, 6); ctx.lineTo(0.4, 3); ctx.fill();
} else if (e.type === "shade") {
ctx.fillStyle = "rgba(150,110,255,0.92)";
ctx.beginPath(); ctx.arc(0, -e.r * 0.25, e.r * 0.85, Math.PI, 0);
const w = e.r * 0.85;
ctx.lineTo(w, e.r * 0.55);
for (let i = 0; i < 3; i++) ctx.quadraticCurveTo(w - (i + 0.5) * (w * 2 / 3), e.r * (0.55 + (i % 2? -0.3: 0.25)), w - (i + 1) * (w * 2 / 3), e.r * 0.55);
ctx.closePath(); ctx.fill();
ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(-e.r * 0.3, -e.r * 0.3, e.r * 0.16, 0, 7); ctx.arc(e.r * 0.3, -e.r * 0.3, e.r * 0.16, 0, 7); ctx.fill();
ctx.fillStyle = "#2a1650"; ctx.beginPath(); ctx.ellipse(0, e.r * 0.05, e.r * 0.14, e.r * 0.2, 0, 0, 7); ctx.fill();
} else { // golem / boss
const bobY = Math.abs(Math.sin(e.wob * 0.6)) * 2;
ctx.translate(0, -bobY);
if (e.boss) { ctx.strokeStyle = "rgba(255,60,60," + (0.5 + Math.sin(S.t * 5) * 0.25) + ")"; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(0, 0, e.r + 10, 0, 7); ctx.stroke();}
ctx.fillStyle = "#6e5136"; ctx.beginPath(); ctx.arc(-e.r * 0.95, 2, e.r * 0.42, 0, 7); ctx.arc(e.r * 0.95, 2, e.r * 0.42, 0, 7); ctx.fill();
const g = ctx.createLinearGradient(0, -e.r, 0, e.r);
g.addColorStop(0, "#9a7a52"); g.addColorStop(1, "#6e5136");
ctx.fillStyle = g;
const w2 = e.r * 1.7, h2 = e.r * 1.6;
ctx.beginPath(); ctx.roundRect(-w2 / 2, -h2 / 2, w2, h2, 8); ctx.fill();
ctx.strokeStyle = "rgba(0,0,0,0.35)"; ctx.lineWidth = 1.6;
ctx.beginPath(); ctx.moveTo(-w2 * 0.2, -h2 * 0.4); ctx.lineTo(-w2 * 0.05, 0); ctx.lineTo(-w2 * 0.28, h2 * 0.3); ctx.moveTo(w2 * 0.3, -h2 * 0.2); ctx.lineTo(w2 * 0.15, h2 * 0.25); ctx.stroke();
ctx.fillStyle = "#ffb020"; ctx.shadowColor = "#ffb020"; ctx.shadowBlur = 8;
ctx.beginPath(); ctx.arc(-e.r * 0.3, -h2 * 0.18, 3, 0, 7); ctx.arc(e.r * 0.3, -h2 * 0.18, 3, 0, 7); ctx.fill(); ctx.shadowBlur = 0;
ctx.fillStyle = "#3f7a3a"; ctx.beginPath(); ctx.ellipse(w2 * 0.28, -h2 * 0.42, 6, 3.4, 0.4, 0, 7); ctx.fill();
if (e.boss) {
ctx.fillStyle = "#ffd94d";
ctx.beginPath();
for (let i = 0; i < 3; i++) { const bx = -12 + i * 12; ctx.moveTo(bx - 4, -h2 / 2 - 2); ctx.lineTo(bx, -h2 / 2 - 13); ctx.lineTo(bx + 4, -h2 / 2 - 2);}
ctx.fill(); ctx.fillRect(-13, -h2 / 2 - 3, 26, 4);
}
}
// 状態・ヒット表現
if (e.elite) { ctx.strokeStyle = "#ffd94d"; ctx.lineWidth = 2.4; ctx.beginPath(); ctx.arc(0, 0, e.r + 4.5, 0, 7); ctx.stroke();}
if (e.freeze > 0) { ctx.fillStyle = "rgba(150,225,255,0.5)"; ctx.fillRect(-e.r - 2, -e.r - 2, e.r * 2 + 4, e.r * 2 + 4);}
else if (e.slow > 0) { ctx.strokeStyle = "rgba(120,210,255,0.8)"; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(0, 0, e.r + 2.5, 0, 7); ctx.stroke();}
if (e.flash > 0) { ctx.globalAlpha = e.flash * 0.8; ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(0, 0, e.r, 0, 7); ctx.fill(); ctx.globalAlpha = 1;}
ctx.restore();
// HPバー
if (e.hp < e.maxHp) {
const wbar = e.boss? 92: e.r * 2, pct = clamp(e.hp / e.maxHp, 0, 1);
ctx.fillStyle = "rgba(0,0,0,0.55)"; ctx.fillRect(e.x - wbar / 2, e.y - e.r - 13, wbar, 5);
ctx.fillStyle = e.boss? "#ff5d5d": pct > 0.4? "#57e389": "#ff9d5c";
ctx.fillRect(e.x - wbar / 2, e.y - e.r - 13, wbar * pct, 5);
}
}

function render(now) {
const camL = S.cam.x - VW / 2, camT = S.cam.y - VH / 2;
const shX = S.shake > 0.2? rnd(-S.shake, S.shake): 0, shY = S.shake > 0.2? rnd(-S.shake, S.shake): 0;
ctx.fillStyle = "#0b0f1e"; ctx.fillRect(0, 0, VW, VH);
ctx.save();
ctx.translate(-camL + shX, -camT + shY);
// 地面
ctx.fillStyle = ctx.createPattern(tile, "repeat");
ctx.fillRect(camL - 24, camT - 24, VW + 48, VH + 48);
// 装飾
for (const dc of decors) {
if (dc.x < camL - 40 || dc.x > camL + VW + 40 || dc.y < camT - 40 || dc.y > camT + VH + 40) continue;
if (dc.k === 0) { ctx.strokeStyle = "rgba(90,200,130,0.5)"; ctx.lineWidth = 2; ctx.beginPath(); for (let i = -1; i <= 1; i++) { ctx.moveTo(dc.x + i * 4, dc.y); ctx.quadraticCurveTo(dc.x + i * 5, dc.y - 8 * dc.s, dc.x + i * 7, dc.y - 12 * dc.s);} ctx.stroke();}
else if (dc.k === 1) { ctx.fillStyle = "rgba(120,130,160,0.5)"; ctx.beginPath(); ctx.ellipse(dc.x, dc.y, 9 * dc.s, 6 * dc.s, dc.ph, 0, 7); ctx.fill();}
else { ctx.fillStyle = "rgba(140,220,255,0.35)"; ctx.beginPath(); ctx.moveTo(dc.x, dc.y - 8 * dc.s); ctx.lineTo(dc.x + 4 * dc.s, dc.y); ctx.lineTo(dc.x, dc.y + 8 * dc.s); ctx.lineTo(dc.x - 4 * dc.s, dc.y); ctx.closePath(); ctx.fill();}
}
// 世界の境界
ctx.strokeStyle = "rgba(255,93,122,0.5)"; ctx.lineWidth = 4; ctx.strokeRect(2, 2, WORLD_W - 4, WORLD_H - 4);
// 台座・タワー
for (const pad of PADS) {
ctx.fillStyle = "rgba(20,26,54,0.9)"; ctx.strokeStyle = "#4a539a"; ctx.lineWidth = 2;
ctx.beginPath(); ctx.arc(pad.x, pad.y, 24, 0, 7); ctx.fill(); ctx.stroke();
const tw = pad.tower;
if (!tw) {
ctx.fillStyle = "rgba(200,210,255,0.75)"; ctx.font = "bold 20px sans-serif"; ctx.textAlign = "center"; ctx.fillText("＋", pad.x, pad.y + 7);
} else {
const def = TOWERS[tw.type];
ctx.fillStyle = "#232b57"; ctx.beginPath(); ctx.arc(pad.x, pad.y, 19, 0, 7); ctx.fill();
ctx.strokeStyle = def.color; ctx.beginPath(); ctx.arc(pad.x, pad.y, 19, 0, 7); ctx.stroke();
ctx.save(); ctx.translate(pad.x, pad.y); ctx.rotate(tw.aim || 0);
ctx.fillStyle = def.color; ctx.fillRect(6, -3.4, 18, 6.8);
ctx.restore();
ctx.font = "17px sans-serif"; ctx.textAlign = "center"; ctx.fillText(def.icon, pad.x, pad.y + 6);
ctx.fillStyle = "#ffd94d"; ctx.font = "bold 9px sans-serif";
ctx.fillText("Lv" + tw.lv, pad.x, pad.y + 33);
}
}
// コア
const pulse = 1 + Math.sin(now * 0.004) * 0.06;
const glow = ctx.createRadialGradient(CORE.x, CORE.y, 4, CORE.x, CORE.y, 90);
glow.addColorStop(0, "rgba(90,200,255,0.4)"); glow.addColorStop(1, "rgba(90,200,255,0)");
ctx.fillStyle = glow; ctx.beginPath(); ctx.arc(CORE.x, CORE.y, 90, 0, 7); ctx.fill();
ctx.fillStyle = "#1a2450"; ctx.strokeStyle = "#39c2ff"; ctx.lineWidth = 2.4;
ctx.beginPath(); ctx.arc(CORE.x, CORE.y, CORE.r + 8, 0, 7); ctx.fill(); ctx.stroke();
ctx.save(); ctx.translate(CORE.x, CORE.y); ctx.scale(pulse, pulse);
const cg = ctx.createLinearGradient(0, -30, 0, 30);
cg.addColorStop(0, "#bdf3ff"); cg.addColorStop(0.5, "#39c2ff"); cg.addColorStop(1, "#1a6fd0");
ctx.fillStyle = cg; ctx.strokeStyle = "#dff8ff"; ctx.lineWidth = 1.6;
ctx.beginPath(); ctx.moveTo(0, -30); ctx.lineTo(17, 0); ctx.lineTo(0, 30); ctx.lineTo(-17, 0); ctx.closePath(); ctx.fill(); ctx.stroke();
ctx.fillStyle = "rgba(255,255,255,0.85)"; ctx.beginPath(); ctx.moveTo(0, -30); ctx.lineTo(7, -6); ctx.lineTo(-7, -6); ctx.closePath(); ctx.fill();
ctx.restore();
for (let i = 0; i < 3; i++) {
const a = now * 0.0012 + i * 2.094;
const ox = CORE.x + Math.cos(a) * 52, oy = CORE.y + Math.sin(a) * 52;
ctx.fillStyle = "#7de3ff"; ctx.save(); ctx.translate(ox, oy); ctx.rotate(a * 2);
ctx.fillRect(-4, -4, 8, 8); ctx.restore();
}
// ジェム
for (const g of S.gems) {
const bobY = Math.sin(now * 0.006 + g.ph) * 2.4;
ctx.fillStyle = g.v >= 20? "#c77dff": g.v >= 5? "#57b6ff": "#51ff7a";
ctx.save(); ctx.translate(g.x, g.y + bobY); ctx.rotate(Math.PI / 4);
const s = g.v >= 20? 8: g.v >= 5? 6.4: 5;
ctx.fillRect(-s / 2, -s / 2, s, s); ctx.restore();
}
// ドロップ
for (const dr of S.drops) {
const bobY = Math.sin(now * 0.005 + dr.ph) * 3;
ctx.strokeStyle = dr.item.color; ctx.lineWidth = 2.4;
ctx.fillStyle = "rgba(14,18,40,0.9)";
ctx.beginPath(); ctx.roundRect(dr.x - 13, dr.y - 13 + bobY, 26, 26, 7); ctx.fill(); ctx.stroke();
ctx.font = "15px sans-serif"; ctx.textAlign = "center";
ctx.fillText(dr.item.slot === "weapon"? "⚔️": dr.item.slot === "armor"? "🛡️": "🔮", dr.x, dr.y + 5 + bobY);
}
// 敵・ヒーロー（y順で重なり自然に）
const drawables = [];
for (const e of S.enemies) drawables.push({ y: e.y, f: () => drawEnemy(e)});
if (S.hero &&!S.hero.dead) drawables.push({ y: S.hero.y, f: () => drawHero(S.hero)});
drawables.sort((a, b) => a.y - b.y);
for (const d of drawables) d.f();
// 投射物
for (const p of S.projs) {
if (p.kind === "bolt") { ctx.fillStyle = "#6be7ff"; ctx.shadowColor = "#6be7ff"; ctx.shadowBlur = 13; ctx.beginPath(); ctx.arc(p.x, p.y, 6, 0, 7); ctx.fill(); ctx.shadowBlur = 0;}
else if (p.kind === "shuriken") { ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(now * 0.03); ctx.fillStyle = "#dfe6f5"; for (let i = 0; i < 4; i++) { ctx.rotate(Math.PI / 2); ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(3, -3); ctx.lineTo(9, 0); ctx.lineTo(3, 3); ctx.closePath(); ctx.fill();} ctx.restore();}
else if (p.kind === "shell") { ctx.fillStyle = "#3a3f52"; ctx.beginPath(); ctx.arc(p.x, p.y, 7, 0, 7); ctx.fill(); ctx.fillStyle = "#ffb37d"; ctx.beginPath(); ctx.arc(p.x, p.y, 3, 0, 7); ctx.fill();}
else { ctx.strokeStyle = p.kind === "frost"? "#a8ecff": p.kind === "sniper"? "#ffe28a": "#ffe9a3"; ctx.lineWidth = p.kind === "sniper"? 3: 2.4; ctx.beginPath(); ctx.moveTo(p.x - p.vx * 0.018, p.y - p.vy * 0.018); ctx.lineTo(p.x, p.y); ctx.stroke();}
}
// メテオ
for (const m of S.meteors) {
const k = clamp(m.t / m.dur, 0, 1);
const x = m.x + (m.tx - m.x) * k, y = m.y + (m.ty - m.y) * k;
ctx.strokeStyle = m.arrowRain? "rgba(255,226,138,0.85)": "rgba(255,120,60,0.9)"; ctx.lineWidth = 2;
ctx.beginPath(); ctx.arc(m.tx, m.ty, m.r * (0.4 + 0.6 * k), 0, 7); ctx.stroke();
if (m.arrowRain) { ctx.fillStyle = "#ffe28a"; ctx.beginPath(); ctx.moveTo(x, y + 10); ctx.lineTo(x - 4, y - 4); ctx.lineTo(x + 4, y - 4); ctx.closePath(); ctx.fill();}
else { ctx.fillStyle = "#ff9d5c"; ctx.shadowColor = "#ff7a2f"; ctx.shadowBlur = 16; ctx.beginPath(); ctx.arc(x, y, 9, 0, 7); ctx.fill(); ctx.shadowBlur = 0;}
}
// リング・パーティクル・ダメージ数字
for (const r of S.rings) { ctx.globalAlpha = clamp(r.life / r.maxLife, 0, 1); ctx.strokeStyle = r.color; ctx.lineWidth = r.width; ctx.beginPath(); ctx.arc(r.x, r.y, r.r, 0, 7); ctx.stroke();}
ctx.globalAlpha = 1;
for (const p of S.parts) { ctx.globalAlpha = clamp(p.life / p.max, 0, 1); ctx.fillStyle = p.color; ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);}
ctx.globalAlpha = 1;
ctx.textAlign = "center";
for (const n of S.nums) { ctx.globalAlpha = clamp(n.life / 0.75, 0, 1); ctx.font = "bold " + n.size + "px sans-serif"; ctx.fillStyle = n.color; ctx.strokeStyle = "rgba(0,0,0,0.6)"; ctx.lineWidth = 3; ctx.strokeText(n.txt, n.x, n.y); ctx.fillText(n.txt, n.x, n.y);}
ctx.globalAlpha = 1;
ctx.restore();
// ミニマップ
if (S.started) {
const mw = 118, mh = 88, mx = 10, my = VH - mh - 12, sx = mw / WORLD_W, sy = mh / WORLD_H;
ctx.fillStyle = "rgba(8,12,28,0.78)"; ctx.strokeStyle = "#39406e"; ctx.lineWidth = 1;
ctx.beginPath(); ctx.roundRect(mx, my, mw, mh, 8); ctx.fill(); ctx.stroke();
ctx.fillStyle = "#39c2ff"; ctx.fillRect(mx + CORE.x * sx - 2.5, my + CORE.y * sy - 2.5, 5, 5);
ctx.fillStyle = "#ff5d5d";
for (const e of S.enemies) { ctx.fillRect(mx + e.x * sx - 1.2, my + e.y * sy - 1.2, e.boss? 4.4: 2.4, e.boss? 4.4: 2.4);}
if (S.hero &&!S.hero.dead) { ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(mx + S.hero.x * sx, my + S.hero.y * sy, 3, 0, 7); ctx.fill();}
}
// ビネット
const vg = ctx.createRadialGradient(VW / 2, VH / 2, Math.min(VW, VH) * 0.42, VW / 2, VH / 2, Math.max(VW, VH) * 0.78);
vg.addColorStop(0, "rgba(0,0,0,0)"); vg.addColorStop(1, "rgba(0,0,10,0.42)");
ctx.fillStyle = vg; ctx.fillRect(0, 0, VW, VH);
}

// ======== メインループ ========
let last = performance.now(), hudT = 0;
function frame(now) {
requestAnimationFrame(frame);
let dt = Math.min(0.05, (now - last) / 1000); last = now;
if (S.hitStop > 0) { S.hitStop -= dt; dt *= 0.1;}
S.shake *= Math.exp(-6.5 * Math.min(0.05, dt / Math.max(0.1, 1))); // 実時間で減衰
if (S.started &&!S.over &&!S.overlay) {
S.t += dt;
director(dt);
updateHero(dt);
updateEnemies(dt);
updateTowers(dt);
updateProjs(dt);
updateFx(dt);
// カメラ（滑らか追従）
const tgt = S.hero.dead? CORE: S.hero;
const k = Math.min(1, dt * 5.2);
S.cam.x += (tgt.x - S.cam.x) * k;
S.cam.y += (tgt.y - S.cam.y) * k;
S.cam.x = VW >= WORLD_W? WORLD_W / 2: clamp(S.cam.x, VW / 2, WORLD_W - VW / 2);
S.cam.y = VH >= WORLD_H? WORLD_H / 2: clamp(S.cam.y, VH / 2, WORLD_H - VH / 2);
hudT -= dt;
if (hudT <= 0) { hudT = 0.1; updateHUD();}
}
render(now);
}
requestAnimationFrame(frame);

// ======== 初期化・UI配線 ========
function selectHero(id) {
S.selectedHero = id;
for (const el of $("heroGrid").children) el.classList.toggle("sel", el.dataset.hero === id);
}
(function init() {
const grid = $("heroGrid");
for (const id of Object.keys(HEROES)) {
const d = HEROES[id];
const b = document.createElement("button"); b.className = "hcard"; b.dataset.hero = id;
const ic = document.createElement("div"); ic.className = "ic"; ic.textContent = d.icon;
const nm = document.createElement("div"); nm.className = "nm"; nm.textContent = d.name;
const ds = document.createElement("div"); ds.className = "ds"; ds.textContent = d.desc + "Q：" + d.qName + "／R：" + d.rName;
const st = document.createElement("div"); st.className = "st"; st.textContent = d.stat;
b.appendChild(ic); b.appendChild(nm); b.appendChild(ds); b.appendChild(st);
b.addEventListener("click", () => selectHero(id));
grid.appendChild(b);
}
selectHero("knight");
const savedName = localStorage.getItem("hakusura-td-name") || "";
$("nameInput").value = savedName;
$("nameInput").addEventListener("change", () => localStorage.setItem("hakusura-td-name", $("nameInput").value.trim()));
const best = window.GameDB.localRanks()[0];
$("bestTxt").textContent = best? ("スコア " + best.score + "（WAVE " + best.wave + "到達）"): "なし";
// スタート画面でも背景をゆっくり見せる
S.hero = newHero("knight"); S.cam.x = CORE.x; S.cam.y = CORE.y;

$("btnStart").addEventListener("click", () => { localStorage.setItem("hakusura-td-name", $("nameInput").value.trim()); startGame(S.selectedHero);});
$("btnRetry").addEventListener("click", () => startGame(S.selectedHero));
$("btnRankTop").addEventListener("click", showRanking);
$("btnRank2").addEventListener("click", showRanking);
$("btnRankClose").addEventListener("click", () => { $("rankOv").classList.remove("show"); if (S.overlay === "rank") S.overlay = null;});
$("btnInv").addEventListener("click", () => { if (S.started &&!S.over) openInv();});
$("btnInvClose").addEventListener("click", () => closeOverlay("invOv"));
$("btnBuildClose").addEventListener("click", () => closeOverlay("buildOv"));
$("btnSet").addEventListener("click", () => {
const c = window.GameDB.loadConfig();
$("sbUrl").value = c.url || ""; $("sbKey").value = c.key || ""; $("sbMsg").textContent = "";
S.overlay = "set"; $("setOv").classList.add("show");
});
$("btnSetClose").addEventListener("click", () => closeOverlay("setOv"));
$("btnSbSave").addEventListener("click", async () => {
window.GameDB.saveConfig({ url: $("sbUrl").value.trim(), key: $("sbKey").value.trim()});
window.GameDB.resetClient();
$("sbMsg").textContent = "接続テスト中…";
const r = await window.GameDB.testConnection();
$("sbMsg").textContent = r.ok? "✅ 接続OK！ ランキングがオンラインになります": "❌ " + r.reason;
});
for (const slot of ["q", "e", "r"]) {
$("btn" + slot.toUpperCase()).addEventListener("pointerdown", e => { e.preventDefault(); castAbility(slot);});
}
})();

// テスト用フック
window.__game = { S, HEROES, TOWERS, startGame, selectHero, castAbility, openBuild, buildTower, openLevelUp, genItem};
})();
