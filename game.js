// ハクスラTD｜Loot Lane Defense
(function () {
  "use strict";
  var W = 960, H = 600;
  var canvas = document.getElementById("game");
  var ctx = canvas.getContext("2d");
  var $ = function (id) { return document.getElementById(id); };
  var clamp = function (v, a, b) { return Math.max(a, Math.min(b, v)); };
  var dist = function (a, b) { var dx = a.x - b.x, dy = a.y - b.y; return Math.sqrt(dx * dx + dy * dy); };
  var rand = function (a, b) { return a + Math.random() * (b - a); };
  var yen0 = function (n) { return Math.round(n).toLocaleString("ja-JP"); };

  // ===== パス（レーン） =====
  var WAYPOINTS = [
    { x: 16, y: 100 }, { x: 760, y: 100 }, { x: 760, y: 300 },
    { x: 200, y: 300 }, { x: 200, y: 500 }, { x: 900, y: 500 }
  ];
  var SEGS = [], PATH_LEN = 0;
  for (var i = 0; i < WAYPOINTS.length - 1; i++) {
    var a = WAYPOINTS[i], b = WAYPOINTS[i + 1];
    var len = Math.abs(b.x - a.x) + Math.abs(b.y - a.y);
    SEGS.push({ a: a, b: b, len: len, start: PATH_LEN });
    PATH_LEN += len;
  }
  function posAt(t) {
    t = clamp(t, 0, PATH_LEN);
    for (var i = 0; i < SEGS.length; i++) {
      var s = SEGS[i];
      if (t <= s.start + s.len || i === SEGS.length - 1) {
        var k = s.len === 0 ? 0 : (t - s.start) / s.len;
        return { x: s.a.x + (s.b.x - s.a.x) * k, y: s.a.y + (s.b.y - s.a.y) * k };
      }
    }
    return WAYPOINTS[WAYPOINTS.length - 1];
  }
  var PORTAL = WAYPOINTS[0], CORE = WAYPOINTS[WAYPOINTS.length - 1];

  var PADS = [
    { x: 140, y: 190 }, { x: 300, y: 205 }, { x: 470, y: 180 }, { x: 620, y: 210 },
    { x: 865, y: 200 }, { x: 865, y: 405 }, { x: 700, y: 405 }, { x: 520, y: 395 },
    { x: 340, y: 410 }, { x: 95, y: 395 }
  ].map(function (p) { return { x: p.x, y: p.y, tower: null }; });

  // ===== 定義 =====
  var TOWERS = {
    arrow:  { name: "アロータワー", icon: "🏹", cost: 60,  range: 125, dmg: 12, rate: 2.4, proj: 460, color: "#ffd166", desc: "速射の単体攻撃" },
    cannon: { name: "キャノン",     icon: "💣", cost: 110, range: 115, dmg: 30, rate: 0.8, proj: 320, color: "#ef8354", splash: 58, desc: "範囲爆発" },
    frost:  { name: "フロスト",     icon: "❄️", cost: 90,  range: 110, dmg: 6,  rate: 1.7, proj: 380, color: "#7bdff2", slow: 0.45, slowDur: 1.6, desc: "当てた敵をスロー" },
    sniper: { name: "スナイパー",   icon: "🎯", cost: 160, range: 215, dmg: 75, rate: 0.55, proj: 720, color: "#f15bb5", desc: "長射程・高威力" }
  };
  var ENEMIES = {
    slime:  { name: "スライム", icon: "👾", hp: 1.0,  spd: 34, reward: 6,  xp: 1, core: 1, r: 13 },
    wolf:   { name: "ウルフ",   icon: "🐺", hp: 0.6,  spd: 63, reward: 7,  xp: 1, core: 1, r: 12 },
    golem:  { name: "ゴーレム", icon: "🗿", hp: 3.4,  spd: 22, reward: 14, xp: 2, core: 2, r: 16 },
    bat:    { name: "バット",   icon: "🦇", hp: 0.45, spd: 80, reward: 8,  xp: 1, core: 1, r: 11 },
    shaman: { name: "シャーマン", icon: "🧙", hp: 1.1, spd: 36, reward: 12, xp: 2, core: 1, r: 13, zap: true },
    boss:   { name: "ボス",     icon: "🧌", hp: 30,   spd: 20, reward: 300, xp: 25, core: 5, r: 25 }
  };
  var RARITIES = [
    { id: "common", name: "ノーマル", mult: 1.0, w: 55, scrap: 8 },
    { id: "rare", name: "レア", mult: 1.7, w: 30, scrap: 25 },
    { id: "epic", name: "エピック", mult: 2.8, w: 12, scrap: 70 },
    { id: "legendary", name: "レジェンダリー", mult: 4.5, w: 3, scrap: 200 }
  ];
  var SLOTS = [
    { id: "weapon", name: "武器", icon: "⚔️" },
    { id: "armor", name: "防具", icon: "🛡️" },
    { id: "charm", name: "お守り", icon: "🔮" }
  ];

  // ===== 状態 =====
  var G = null;
  function newGame() {
    return {
      state: "ready", // ready | playing | over
      paused: false,
      time: 0,
      wave: 0, waveActive: false, spawnQueue: [], spawnTimer: 0, prepTimer: 0,
      core: 20, gold: 160, kills: 0, score: 0, goldEarned: 0,
      enemies: [], towers: [], projs: [], drops: [], parts: [], floats: [], meteors: [],
      hero: null, inventory: [], equipment: { weapon: null, armor: null, charm: null },
      mods: null, submitted: false
    };
  }
  function newHero() {
    return {
      x: CORE.x - 60, y: CORE.y - 60, r: 15, hp: 1, lv: 1, xp: 0, xpNext: 8,
      atkCd: 0, dead: false, respawn: 0, target: null,
      cd: { q: 0, e: 0, r: 0 }
    };
  }
  function newMods() {
    return { atkMul: 1, spdMul: 1, hpMul: 1, critAdd: 0, msMul: 1, towerMul: 1, goldMul: 1, lsAdd: 0, rangeAdd: 0 };
  }

  function equipSums() {
    var s = { atk: 0, hp: 0, crit: 0, spd: 0, ls: 0, ms: 0 };
    SLOTS.forEach(function (slot) {
      var it = G.equipment[slot.id];
      if (!it) return;
      Object.keys(s).forEach(function (k) { s[k] += (it.stats[k] || 0); });
    });
    return s;
  }
  function calcStats() {
    var h = G.hero, eq = equipSums(), m = G.mods;
    return {
      atk: (10 + h.lv * 2 + eq.atk) * m.atkMul,
      maxHp: (120 + h.lv * 18 + eq.hp) * m.hpMul,
      atkSpeed: 1.6 * (1 + eq.spd / 100) * m.spdMul,
      crit: 5 + eq.crit + m.critAdd,
      lifesteal: eq.ls + m.lsAdd,
      moveSpeed: 178 * (1 + eq.ms / 100) * m.msMul,
      range: 100 + m.rangeAdd
    };
  }

  // ===== アイテム生成 =====
  var itemSeq = 1;
  function rollRarity() {
    var total = RARITIES.reduce(function (s, r) { return s + r.w; }, 0);
    var v = Math.random() * total;
    for (var i = 0; i < RARITIES.length; i++) { v -= RARITIES[i].w; if (v <= 0) return RARITIES[i]; }
    return RARITIES[0];
  }
  function makeItem(wave) {
    var slot = SLOTS[Math.floor(Math.random() * SLOTS.length)];
    var rar = rollRarity();
    var scale = (1 + wave * 0.35) * rar.mult;
    var stats = { atk: 0, hp: 0, crit: 0, spd: 0, ls: 0, ms: 0 };
    if (slot.id === "weapon") {
      stats.atk = Math.round(rand(3, 6) * scale);
      if (rar.mult >= 1.7) stats.crit = Math.round(rand(2, 5) * rar.mult);
      if (rar.mult >= 2.8) stats.spd = Math.round(rand(4, 9));
    } else if (slot.id === "armor") {
      stats.hp = Math.round(rand(18, 34) * scale);
      if (rar.mult >= 1.7) stats.ms = Math.round(rand(2, 6));
      if (rar.mult >= 2.8) stats.atk = Math.round(rand(2, 4) * scale * 0.5);
    } else {
      var pool = ["crit", "spd", "ls"];
      var k1 = pool[Math.floor(Math.random() * pool.length)];
      if (k1 === "crit") stats.crit = Math.round(rand(3, 6) * rar.mult);
      if (k1 === "spd") stats.spd = Math.round(rand(4, 8) * rar.mult);
      if (k1 === "ls") stats.ls = Math.round(rand(2, 4) * rar.mult);
      if (rar.mult >= 1.7) stats.atk = Math.round(rand(2, 4) * scale * 0.6);
    }
    var parts = [];
    if (stats.atk) parts.push("攻撃+" + stats.atk);
    if (stats.hp) parts.push("HP+" + stats.hp);
    if (stats.crit) parts.push("クリ率+" + stats.crit + "%");
    if (stats.spd) parts.push("攻速+" + stats.spd + "%");
    if (stats.ls) parts.push("吸血+" + stats.ls + "%");
    if (stats.ms) parts.push("移動+" + stats.ms + "%");
    var names = {
      weapon: ["ソード", "アクス", "ブレード", "ランス"],
      armor: ["メイル", "シールド", "ローブ", "プレート"],
      charm: ["アミュレット", "オーブ", "タリスマン", "リング"]
    };
    return {
      id: "it" + (itemSeq++) + "-" + Date.now().toString(36),
      slot: slot.id, slotName: slot.name, icon: slot.icon,
      rarity: rar.id, rarityName: rar.name, mult: rar.mult, scrap: rar.scrap,
      name: rar.name + "の" + names[slot.id][Math.floor(Math.random() * 4)],
      stats: stats, statText: parts.join(" / ")
    };
  }

  // ===== ウェーブ =====
  function buildWave(n) {
    var q = [];
    var count = 6 + n * 2;
    var i, kind;
    for (i = 0; i < count; i++) {
      kind = "slime";
      var r = Math.random();
      if (n >= 2 && r < 0.22) kind = "wolf";
      else if (n >= 3 && r < 0.36) kind = "golem";
      else if (n >= 4 && r < 0.48) kind = "bat";
      else if (n >= 6 && r < 0.56) kind = "shaman";
      q.push(kind);
    }
    if (n % 5 === 0) {
      var bosses = 1 + Math.floor(n / 10);
      for (i = 0; i < bosses; i++) q.push("boss");
    }
    q.sort(function () { return Math.random() - 0.5; });
    q.sort(function (x, y) { return (x === "boss" ? 1 : 0) - (y === "boss" ? 1 : 0); });
    return q;
  }
  function startWave() {
    if (!G || G.waveActive || G.state !== "playing") return;
    G.wave++;
    G.spawnQueue = buildWave(G.wave);
    G.spawnTimer = 0;
    G.waveActive = true;
    toast("🌊 Wave " + G.wave + " 開始" + (G.wave % 5 === 0 ? "（ボス出現！）" : ""));
    updateWaveBtn();
  }
  function spawnEnemy(kind) {
    var base = ENEMIES[kind];
    var hpMul = Math.pow(1.21, G.wave - 1) * (kind === "boss" ? Math.pow(1.12, G.wave - 1) : 1);
    var hp = 30 * base.hp * hpMul;
    var p = posAt(0);
    G.enemies.push({
      kind: kind, icon: base.icon, x: p.x, y: p.y, t: 0,
      hp: hp, maxHp: hp, spd: base.spd * rand(0.9, 1.1), r: base.r,
      reward: Math.round(base.reward * (1 + G.wave * 0.06)), xp: base.xp,
      core: base.core, slowUntil: 0, slowFactor: 1, atkCd: rand(0.3, 1), zap: !!base.zap,
      dead: false
    });
  }

  // ===== ダメージ =====
  function damage(e, dmg, crit) {
    if (e.dead) return;
    e.hp -= dmg;
    addFloat(e.x, e.y - e.r - 4, Math.round(dmg), crit ? "#f5c451" : "#ffffff", crit ? 17 : 13);
    if (e.hp <= 0) kill(e);
  }
  function kill(e) {
    e.dead = true;
    G.kills++;
    var gold = Math.round(e.reward * G.mods.goldMul);
    G.gold += gold; G.goldEarned += gold;
    G.score += 15;
    gainXp(e.xp);
    burst(e.x, e.y, e.kind === "boss" ? "#f5a524" : "#9db4e8", e.kind === "boss" ? 22 : 8);
    var chance = e.kind === "boss" ? 1 : 0.12;
    if (Math.random() < chance) {
      G.drops.push({ x: e.x, y: e.y, item: makeItem(G.wave), bob: rand(0, 6) });
      if (e.kind === "boss") G.drops.push({ x: e.x + 18, y: e.y + 8, item: makeItem(G.wave), bob: rand(0, 6) });
    }
  }
  function gainXp(v) {
    var h = G.hero;
    h.xp += v;
    while (h.xp >= h.xpNext) {
      h.xp -= h.xpNext; h.lv++;
      h.xpNext = Math.round(h.xpNext * 1.45) + 4;
      var st = calcStats();
      h.hp = Math.min(st.maxHp, h.hp + st.maxHp * 0.35);
      openLevelUp();
    }
  }

  // ===== アビリティ =====
  function castQ() {
    var h = G.hero; if (!h || h.dead || h.cd.q > 0 || G.state !== "playing" || G.paused) return;
    var st = calcStats();
    h.cd.q = 8;
    ringFx(h.x, h.y, 135, "#ffd166");
    G.enemies.forEach(function (e) {
      if (!e.dead && dist(h, e) <= 135 + e.r) damage(e, st.atk * 2.2, Math.random() * 100 < st.crit);
    });
  }
  function castE() {
    var h = G.hero; if (!h || h.dead || h.cd.e > 0 || G.state !== "playing" || G.paused) return;
    var st = calcStats();
    h.cd.e = 12;
    ringFx(h.x, h.y, 175, "#7bdff2");
    G.enemies.forEach(function (e) {
      if (!e.dead && dist(h, e) <= 175 + e.r) {
        e.slowFactor = 0.4; e.slowUntil = G.time + 3;
        damage(e, st.atk * 0.6, false);
      }
    });
  }
  function castR() {
    var h = G.hero; if (!h || h.dead || h.cd.r > 0 || G.state !== "playing" || G.paused) return;
    h.cd.r = 35;
    for (var i = 0; i < 8; i++) {
      G.meteors.push({ delay: i * 0.18, done: false });
    }
    toast("☄️ メテオ！");
  }
  function fireMeteor() {
    var alive = G.enemies.filter(function (e) { return !e.dead; });
    if (!alive.length) return;
    var t = alive[Math.floor(Math.random() * alive.length)];
    var st = calcStats();
    ringFx(t.x, t.y, 82, "#ef8354");
    burst(t.x, t.y, "#ef8354", 14);
    G.enemies.forEach(function (e) {
      if (!e.dead && dist(t, e) <= 82 + e.r) damage(e, st.atk * 2.5, Math.random() * 100 < st.crit);
    });
  }

  // ===== エフェクト =====
  function burst(x, y, color, n) {
    for (var i = 0; i < n; i++) {
      var an = rand(0, Math.PI * 2), sp = rand(30, 130);
      G.parts.push({ x: x, y: y, vx: Math.cos(an) * sp, vy: Math.sin(an) * sp, life: rand(0.25, 0.6), max: 0.6, color: color, r: rand(1.5, 3.5) });
    }
  }
  function ringFx(x, y, r, color) {
    G.parts.push({ ring: true, x: x, y: y, r0: 8, r1: r, life: 0.3, max: 0.3, color: color });
  }
  function addFloat(x, y, text, color, size) {
    G.floats.push({ x: x + rand(-6, 6), y: y, text: String(text), color: color, size: size, life: 0.8 });
    if (G.floats.length > 60) G.floats.splice(0, G.floats.length - 60);
  }

  // ===== 更新 =====
  var keys = {};
  var pointer = { down: false, x: 0, y: 0, sx: 0, sy: 0, st: 0, moved: false };
  function update(dt) {
    if (!G || G.state !== "playing" || G.paused) return;
    G.time += dt;
    var h = G.hero, st = calcStats();

    if (G.waveActive && G.spawnQueue.length) {
      G.spawnTimer -= dt;
      if (G.spawnTimer <= 0) {
        spawnEnemy(G.spawnQueue.shift());
        G.spawnTimer = Math.max(0.28, 0.9 - G.wave * 0.02);
      }
    }
    if (G.waveActive && !G.spawnQueue.length && !G.enemies.length) {
      G.waveActive = false;
      var bonus = 20 + G.wave * 4;
      G.gold += bonus; G.goldEarned += bonus;
      G.score += 1000;
      toast("✅ Wave " + G.wave + " クリア！ ボーナス +" + bonus + "G");
      updateWaveBtn();
    }

    if (!h.dead) {
      var mx = 0, my = 0;
      if (keys["arrowleft"] || keys["a"]) mx -= 1;
      if (keys["arrowright"] || keys["d"]) mx += 1;
      if (keys["arrowup"] || keys["w"]) my -= 1;
      if (keys["arrowdown"] || keys["s"]) my += 1;
      if (mx || my) {
        var l = Math.sqrt(mx * mx + my * my);
        h.x += mx / l * st.moveSpeed * dt;
        h.y += my / l * st.moveSpeed * dt;
        h.target = null;
      } else if (h.target) {
        var d = dist(h, h.target);
        if (d > 5) {
          h.x += (h.target.x - h.x) / d * st.moveSpeed * dt;
          h.y += (h.target.y - h.y) / d * st.moveSpeed * dt;
        } else h.target = null;
      }
      h.x = clamp(h.x, 20, W - 20); h.y = clamp(h.y, 20, H - 20);

      h.atkCd -= dt;
      if (h.atkCd <= 0) {
        var tgt = null, best = 1e9;
        G.enemies.forEach(function (e) {
          if (e.dead) return;
          var dd = dist(h, e);
          if (dd < best) { best = dd; tgt = e; }
        });
        if (tgt && best <= st.range + tgt.r) {
          h.atkCd = 1 / st.atkSpeed;
          var crit = Math.random() * 100 < st.crit;
          var dmg = st.atk * (crit ? 1.8 : 1) * rand(0.9, 1.1);
          damage(tgt, dmg, crit);
          if (st.lifesteal > 0) h.hp = Math.min(st.maxHp, h.hp + dmg * st.lifesteal / 100);
          G.parts.push({ slash: true, x: tgt.x, y: tgt.y, life: 0.12, max: 0.12, color: "#ffffff" });
        } else h.atkCd = 0.08;
      }
      for (var di = G.drops.length - 1; di >= 0; di--) {
        var dr = G.drops[di];
        if (dist(h, dr) < 30) {
          G.drops.splice(di, 1);
          if (G.inventory.length >= 30) {
            G.gold += dr.item.scrap;
            toast("🎒 いっぱいのため自動売却 +" + dr.item.scrap + "G");
          } else {
            G.inventory.push(dr.item);
            toast(dr.item.icon + " " + dr.item.name + " を拾った（" + dr.item.statText + "）");
          }
        }
      }
    } else {
      h.respawn -= dt;
      if (h.respawn <= 0) {
        h.dead = false;
        h.hp = calcStats().maxHp;
        h.x = CORE.x - 60; h.y = CORE.y - 60;
        toast("🦸 ヒーロー復活");
      }
    }
    ["q", "e", "r"].forEach(function (k) { if (h.cd[k] > 0) h.cd[k] -= dt; });

    G.meteors.forEach(function (m) {
      if (m.done) return;
      m.delay -= dt;
      if (m.delay <= 0) { m.done = true; fireMeteor(); }
    });
    G.meteors = G.meteors.filter(function (m) { return !m.done; });

    for (var i = G.enemies.length - 1; i >= 0; i--) {
      var e = G.enemies[i];
      if (e.dead) { G.enemies.splice(i, 1); continue; }
      var slow = G.time < e.slowUntil ? e.slowFactor : 1;
      var hd = h.dead ? 1e9 : dist(h, e);
      var aggro = e.zap ? 150 : 52;
      if (hd <= aggro) {
        e.atkCd -= dt;
        if (e.atkCd <= 0) {
          e.atkCd = 1;
          var ed = (4 + G.wave * 0.9) * (e.kind === "boss" ? 4 : 1);
          h.hp -= ed;
          addFloat(h.x, h.y - 24, Math.round(ed), "#e5484d", 13);
          if (h.hp <= 0 && !h.dead) {
            h.dead = true; h.respawn = 5;
            burst(h.x, h.y, "#e5484d", 18);
            toast("💀 ヒーローが倒れた… 5秒で復活");
          }
        }
      } else {
        e.t += e.spd * slow * dt;
        var p = posAt(e.t);
        e.x = p.x; e.y = p.y;
      }
      if (e.t >= PATH_LEN - 2) {
        G.enemies.splice(i, 1);
        G.core -= e.core;
        burst(CORE.x, CORE.y, "#e5484d", 16);
        addFloat(CORE.x, CORE.y - 30, "コア -" + e.core, "#e5484d", 17);
        if (G.core <= 0) { G.core = 0; gameOver(); }
      }
    }

    G.towers.forEach(function (tw) {
      tw.cd -= dt;
      var def = TOWERS[tw.type];
      var range = def.range * (1 + (tw.lv - 1) * 0.08);
      if (tw.cd <= 0) {
        var tgt = null, bestT = -1;
        G.enemies.forEach(function (e) {
          if (e.dead) return;
          if (dist(tw, e) <= range + e.r && e.t > bestT) { bestT = e.t; tgt = e; }
        });
        if (tgt) {
          tw.cd = 1 / def.rate;
          G.projs.push({
            x: tw.x, y: tw.y - 8, tgt: tgt, spd: def.proj,
            dmg: def.dmg * Math.pow(1.55, tw.lv - 1) * G.mods.towerMul,
            splash: def.splash || 0, slow: def.slow || 0, slowDur: def.slowDur || 0,
            color: def.color
          });
        } else tw.cd = 0.1;
      }
    });

    for (var pi = G.projs.length - 1; pi >= 0; pi--) {
      var pr = G.projs[pi];
      if (pr.tgt.dead) { G.projs.splice(pi, 1); continue; }
      var pd = dist(pr, pr.tgt);
      var step = pr.spd * dt;
      if (pd <= step + pr.tgt.r * 0.5) {
        if (pr.splash > 0) {
          ringFx(pr.tgt.x, pr.tgt.y, pr.splash, pr.color);
          G.enemies.forEach(function (e) {
            if (!e.dead && dist(pr.tgt, e) <= pr.splash + e.r) damage(e, pr.dmg, false);
          });
        } else {
          if (pr.slow > 0) { pr.tgt.slowFactor = 1 - pr.slow; pr.tgt.slowUntil = G.time + pr.slowDur; }
          damage(pr.tgt, pr.dmg, false);
        }
        G.projs.splice(pi, 1);
      } else {
        pr.x += (pr.tgt.x - pr.x) / pd * step;
        pr.y += (pr.tgt.y - pr.y) / pd * step;
      }
    }

    for (var fi = G.parts.length - 1; fi >= 0; fi--) {
      var pt = G.parts[fi];
      pt.life -= dt;
      if (pt.vx) { pt.x += pt.vx * dt; pt.y += pt.vy * dt; }
      if (pt.life <= 0) G.parts.splice(fi, 1);
    }
    for (var ffi = G.floats.length - 1; ffi >= 0; ffi--) {
      var fl = G.floats[ffi];
      fl.life -= dt; fl.y -= 34 * dt;
      if (fl.life <= 0) G.floats.splice(ffi, 1);
    }
  }

  // ===== 描画 =====
  function draw() {
    ctx.clearRect(0, 0, W, H);
    // 背景グリッド
    ctx.fillStyle = "#0e1420"; ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = "rgba(120,140,190,0.06)"; ctx.lineWidth = 1;
    for (var gx = 0; gx <= W; gx += 40) { ctx.beginPath(); ctx.moveTo(gx, 0); ctx.lineTo(gx, H); ctx.stroke(); }
    for (var gy = 0; gy <= H; gy += 40) { ctx.beginPath(); ctx.moveTo(0, gy); ctx.lineTo(W, gy); ctx.stroke(); }
    // パス
    ctx.lineCap = "round"; ctx.lineJoin = "round";
    ctx.strokeStyle = "#232f4d"; ctx.lineWidth = 46;
    ctx.beginPath();
    WAYPOINTS.forEach(function (p, i) { if (i === 0) ctx.moveTo(p.x, p.y); else ctx.lineTo(p.x, p.y); });
    ctx.stroke();
    ctx.strokeStyle = "#2e3d63"; ctx.lineWidth = 38;
    ctx.beginPath();
    WAYPOINTS.forEach(function (p, i) { if (i === 0) ctx.moveTo(p.x, p.y); else ctx.lineTo(p.x, p.y); });
    ctx.stroke();
    // ポータルとコア
    ctx.font = "30px serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText("🌀", PORTAL.x + 8, PORTAL.y);
    ctx.font = "38px serif";
    ctx.fillText("💎", CORE.x, CORE.y - 4);
    ctx.font = "bold 13px sans-serif"; ctx.fillStyle = "#e8edf7";
    ctx.fillText("コア " + (G ? G.core : 20), CORE.x - 6, CORE.y + 30);

    if (!G) return;
    // パッド／タワー
    PADS.forEach(function (pad) {
      if (pad.tower) {
        var tw = pad.tower, def = TOWERS[tw.type];
        ctx.fillStyle = "#1a2338"; ctx.strokeStyle = def.color; ctx.lineWidth = 2;
        roundRect(pad.x - 24, pad.y - 24, 48, 48, 10); ctx.fill(); ctx.stroke();
        ctx.font = "26px serif"; ctx.fillText(def.icon, pad.x, pad.y - 2);
        ctx.font = "bold 11px sans-serif"; ctx.fillStyle = "#f5c451";
        ctx.fillText("Lv" + tw.lv, pad.x, pad.y + 19);
      } else {
        ctx.fillStyle = "rgba(150,170,220,0.10)"; ctx.strokeStyle = "rgba(150,170,220,0.4)"; ctx.lineWidth = 1.5;
        roundRect(pad.x - 22, pad.y - 22, 44, 44, 10); ctx.fill(); ctx.stroke();
        ctx.font = "16px sans-serif"; ctx.fillStyle = "rgba(200,215,245,0.55)";
        ctx.fillText("＋", pad.x, pad.y + 1);
      }
    });
    // ドロップ
    G.drops.forEach(function (dr) {
      var bobY = Math.sin(G.time * 3 + dr.bob) * 3;
      ctx.strokeStyle = dr.item.rarity === "legendary" ? "#f5a524" : dr.item.rarity === "epic" ? "#b07fe8" : dr.item.rarity === "rare" ? "#4f9cf9" : "#8b96ad";
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(dr.x, dr.y + bobY, 13, 0, Math.PI * 2); ctx.stroke();
      ctx.font = "16px serif"; ctx.fillText(dr.item.icon, dr.x, dr.y + bobY + 1);
    });
    // 敵
    G.enemies.forEach(function (e) {
      ctx.font = (e.r * 2) + "px serif";
      if (G.time < e.slowUntil) { ctx.fillStyle = "rgba(123,223,242,0.25)"; ctx.beginPath(); ctx.arc(e.x, e.y, e.r + 4, 0, Math.PI * 2); ctx.fill(); }
      ctx.fillText(e.icon, e.x, e.y + 1);
      var pct = clamp(e.hp / e.maxHp, 0, 1);
      ctx.fillStyle = "#0a0e16"; ctx.fillRect(e.x - e.r, e.y - e.r - 10, e.r * 2, 5);
      ctx.fillStyle = pct > 0.4 ? "#4cc38a" : "#e5484d";
      ctx.fillRect(e.x - e.r, e.y - e.r - 10, e.r * 2 * pct, 5);
    });
    // ヒーロー
    var h = G.hero;
    if (h && !h.dead) {
      ctx.fillStyle = "rgba(79,156,249,0.18)";
      ctx.beginPath(); ctx.arc(h.x, h.y, calcStats().range, 0, Math.PI * 2); ctx.fill();
      ctx.font = "30px serif"; ctx.fillText("🦸", h.x, h.y);
      var st2 = calcStats(), hpct = clamp(h.hp / st2.maxHp, 0, 1);
      ctx.fillStyle = "#0a0e16"; ctx.fillRect(h.x - 18, h.y - 26, 36, 5);
      ctx.fillStyle = "#e5484d"; ctx.fillRect(h.x - 18, h.y - 26, 36 * hpct, 5);
    } else if (h && h.dead) {
      ctx.font = "bold 15px sans-serif"; ctx.fillStyle = "#e5484d";
      ctx.fillText("復活まで " + Math.ceil(h.respawn) + "秒", CORE.x - 40, CORE.y - 60);
    }
    // 弾
    G.projs.forEach(function (pr) {
      ctx.fillStyle = pr.color;
      ctx.beginPath(); ctx.arc(pr.x, pr.y, 4, 0, Math.PI * 2); ctx.fill();
    });
    // エフェクト
    G.parts.forEach(function (pt) {
      var a = clamp(pt.life / pt.max, 0, 1);
      if (pt.ring) {
        var rr = pt.r0 + (pt.r1 - pt.r0) * (1 - a);
        ctx.strokeStyle = pt.color; ctx.globalAlpha = a; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.arc(pt.x, pt.y, rr, 0, Math.PI * 2); ctx.stroke();
        ctx.globalAlpha = 1;
      } else if (pt.slash) {
        ctx.strokeStyle = pt.color; ctx.globalAlpha = a; ctx.lineWidth = 2.5;
        ctx.beginPath(); ctx.arc(pt.x, pt.y, 16, 0.4, 2.4); ctx.stroke();
        ctx.globalAlpha = 1;
      } else {
        ctx.fillStyle = pt.color; ctx.globalAlpha = a;
        ctx.beginPath(); ctx.arc(pt.x, pt.y, pt.r, 0, Math.PI * 2); ctx.fill();
        ctx.globalAlpha = 1;
      }
    });
    // ダメージ数値
    G.floats.forEach(function (fl) {
      ctx.font = "bold " + fl.size + "px sans-serif";
      ctx.fillStyle = fl.color; ctx.globalAlpha = clamp(fl.life / 0.8, 0, 1);
      ctx.fillText(fl.text, fl.x, fl.y);
      ctx.globalAlpha = 1;
    });
    ctx.textAlign = "left";
  }
  function roundRect(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  // ===== HUD =====
  function refreshHud() {
    if (!G) return;
    var st = calcStats();
    $("hWave").textContent = G.waveActive ? String(G.wave) : (G.wave === 0 ? "-" : G.wave + " ✓");
    $("hCore").textContent = G.core;
    $("hGold").textContent = yen0(G.gold);
    $("hKills").textContent = G.kills;
    $("hScore").textContent = yen0(G.score);
    $("hLv").textContent = G.hero.lv;
    $("hpFill").style.width = clamp(G.hero.hp / st.maxHp * 100, 0, 100) + "%";
    $("xpFill").style.width = clamp(G.hero.xp / G.hero.xpNext * 100, 0, 100) + "%";
    setCd("abQ", G.hero.cd.q, 8); setCd("abE", G.hero.cd.e, 12); setCd("abR", G.hero.cd.r, 35);
  }
  function setCd(id, remain, max) {
    var btn = $(id);
    var old = btn.querySelector(".cd");
    if (remain > 0) {
      if (!old) { var d = document.createElement("span"); d.className = "cd"; btn.appendChild(d); old = d; }
      old.textContent = Math.ceil(remain);
    } else if (old) old.remove();
  }
  function updateWaveBtn() {
    var b = $("waveBtn");
    if (!G || G.state !== "playing") { b.disabled = true; b.textContent = "▶ 次のWave"; return; }
    b.disabled = G.waveActive;
    b.textContent = G.waveActive ? "🌊 Wave " + G.wave + " 進行中" : (G.wave === 0 ? "▶ Wave 1 を開始" : "▶ 次のWave（" + (G.wave + 1) + "）");
  }

  // ===== オーバーレイ =====
  var openStack = [];
  function openOv(id) {
    $(id).classList.remove("hidden");
    if (G) G.paused = true;
    openStack.push(id);
  }
  function closeOv(id) {
    $(id).classList.add("hidden");
    openStack = openStack.filter(function (x) { return x !== id; });
    if (G && !openStack.length && G.state === "playing") G.paused = false;
  }
  function toast(msg) {
    var el = $("toast");
    el.textContent = msg;
    el.classList.add("show");
    clearTimeout(toast._t);
    toast._t = setTimeout(function () { el.classList.remove("show"); }, 2300);
  }

  // ===== レベルアップ =====
  var PICKS = [
    { name: "攻撃力アップ", desc: "攻撃力 +15%", apply: function () { G.mods.atkMul *= 1.15; } },
    { name: "攻撃速度アップ", desc: "攻撃速度 +12%", apply: function () { G.mods.spdMul *= 1.12; } },
    { name: "体力アップ", desc: "最大HP +25、HPを25回復", apply: function () { G.mods.hpMul *= 1.2; G.hero.hp += 25; } },
    { name: "クリティカル", desc: "クリティカル率 +6%", apply: function () { G.mods.critAdd += 6; } },
    { name: "疾風", desc: "移動速度 +8%", apply: function () { G.mods.msMul *= 1.08; } },
    { name: "タワー強化", desc: "全タワーのダメージ +15%", apply: function () { G.mods.towerMul *= 1.15; } },
    { name: "金運", desc: "ゴールド獲得量 +15%", apply: function () { G.mods.goldMul *= 1.15; } },
    { name: "吸血", desc: "ライフスティール +3%", apply: function () { G.mods.lsAdd += 3; } },
    { name: "射程延長", desc: "ヒーローの攻撃射程 +12", apply: function () { G.mods.rangeAdd += 12; } },
    { name: "コア修復", desc: "コアHP +3（即時）", apply: function () { G.core += 3; } }
  ];
  function openLevelUp() {
    var pool = PICKS.slice();
    var picks = [];
    for (var i = 0; i < 3; i++) picks.push(pool.splice(Math.floor(Math.random() * pool.length), 1)[0]);
    var wrap = $("pickCards");
    wrap.innerHTML = "";
    picks.forEach(function (p) {
      var b = document.createElement("button");
      b.className = "pick"; b.type = "button";
      var ttl = document.createElement("b");
      ttl.textContent = p.name;
      var dsc = document.createElement("span");
      dsc.textContent = p.desc;
      b.appendChild(ttl); b.appendChild(dsc);
      b.addEventListener("click", function () {
        p.apply();
        closeOv("levelScr");
        toast("⭐ " + p.name);
      });
      wrap.appendChild(b);
    });
    openOv("levelScr");
  }

  // ===== タワービルド =====
  var selectedPad = null;
  function openBuild(pad) {
    selectedPad = pad;
    var wrap = $("buildCards");
    wrap.innerHTML = "";
    if (pad.tower) {
      var tw = pad.tower, def = TOWERS[tw.type];
      $("buildTitle").textContent = def.icon + " " + def.name + " Lv" + tw.lv;
      if (tw.lv < 3) {
        var upCost = Math.round(def.cost * 0.9 * tw.lv);
        var ub = document.createElement("button");
        ub.className = "pick"; ub.type = "button";
        ub.innerHTML = "<b>⬆ 強化する（" + upCost + "G）</b><span>ダメージ +55%、射程 +8%</span>";
        ub.disabled = G.gold < upCost;
        ub.addEventListener("click", function () {
          G.gold -= upCost; tw.lv++; tw.invested += upCost;
          closeOv("buildScr"); refreshHud();
        });
        wrap.appendChild(ub);
      }
      var sb = document.createElement("button");
      sb.className = "pick"; sb.type = "button";
      var refund = Math.round(tw.invested * 0.7);
      sb.innerHTML = "<b>💰 売却する（+" + refund + "G）</b><span>タワーを撤去します</span>";
      sb.addEventListener("click", function () {
        G.gold += refund;
        G.towers = G.towers.filter(function (t) { return t !== tw; });
        pad.tower = null;
        closeOv("buildScr"); refreshHud();
      });
      wrap.appendChild(sb);
    } else {
      $("buildTitle").textContent = "タワーを建てる（所持 " + yen0(G.gold) + "G）";
      Object.keys(TOWERS).forEach(function (key) {
        var def = TOWERS[key];
        var b = document.createElement("button");
        b.className = "pick"; b.type = "button";
        b.innerHTML = "<b>" + def.icon + " " + def.name + "（" + def.cost + "G）</b><span>" + def.desc + "｜射程 " + def.range + "／威力 " + def.dmg + "</span>";
        b.disabled = G.gold < def.cost;
        b.addEventListener("click", function () {
          G.gold -= def.cost;
          var tw = { type: key, x: pad.x, y: pad.y, lv: 1, cd: 0, invested: def.cost };
          pad.tower = tw;
          G.towers.push(tw);
          closeOv("buildScr"); refreshHud();
        });
        wrap.appendChild(b);
      });
    }
    openOv("buildScr");
  }

  // ===== 装備画面 =====
  function itemRow(it, btnLabel, onBtn) {
    var row = document.createElement("div");
    row.className = "item-row";
    var grow = document.createElement("div");
    grow.className = "grow";
    var nm = document.createElement("div");
    nm.className = "nm rarity-" + it.rarity;
    nm.textContent = it.icon + " " + it.name;
    var st = document.createElement("div");
    st.className = "st";
    st.textContent = it.slotName + "｜" + it.statText;
    grow.appendChild(nm); grow.appendChild(st);
    row.appendChild(grow);
    if (btnLabel) {
      var b = document.createElement("button");
      b.type = "button"; b.textContent = btnLabel;
      b.addEventListener("click", function () { onBtn(); renderInventory(); refreshHud(); });
      row.appendChild(b);
    }
    return row;
  }
  function renderInventory() {
    var st = calcStats();
    $("heroStats").textContent = "Lv" + G.hero.lv + "｜攻撃 " + Math.round(st.atk) + "｜攻速 " + st.atkSpeed.toFixed(2) + "/s｜最大HP " + Math.round(st.maxHp)
      + "｜クリ率 " + st.crit + "%｜吸血 " + st.lifesteal + "%｜射程 " + st.range;
    var eq = $("equippedList"); eq.innerHTML = "";
    SLOTS.forEach(function (slot) {
      var it = G.equipment[slot.id];
      if (it) eq.appendChild(itemRow(it, "外す", function () { G.inventory.push(it); G.equipment[slot.id] = null; }));
      else {
        var d = document.createElement("div");
        d.className = "item-row";
        d.innerHTML = '<div class="grow"><div class="nm" style="color:var(--muted)">' + slot.icon + " " + slot.name + "：未装備</div></div>";
        eq.appendChild(d);
      }
    });
    var inv = $("invList"); inv.innerHTML = "";
    if (!G.inventory.length) inv.innerHTML = '<p style="color:var(--muted);font-size:13px">所持アイテムはありません。敵を倒すとドロップします。</p>';
    G.inventory.forEach(function (it) {
      var row = itemRow(it, "装備", function () {
        var cur = G.equipment[it.slot];
        G.inventory = G.inventory.filter(function (x) { return x !== it; });
        if (cur) G.inventory.push(cur);
        G.equipment[it.slot] = it;
      });
      var sell = document.createElement("button");
      sell.type = "button"; sell.textContent = "売却 +" + it.scrap + "G";
      sell.addEventListener("click", function () {
        G.inventory = G.inventory.filter(function (x) { return x !== it; });
        G.gold += it.scrap;
        renderInventory(); refreshHud();
      });
      row.appendChild(sell);
      inv.appendChild(row);
    });
  }

  // ===== ゲームオーバー =====
  function gameOver() {
    G.state = "over";
    G.score += (G.wave - 1) * 1000 + G.hero.lv * 100;
    $("overStats").textContent = "到達Wave " + G.wave + "｜撃破 " + G.kills + "｜スコア " + yen0(G.score);
    var best = 0;
    try { best = Number(localStorage.getItem("hakusura-td-best") || 0); } catch (e) {}
    if (G.score > best) { try { localStorage.setItem("hakusura-td-best", String(G.score)); } catch (e) {} }
    var savedName = "";
    try { savedName = localStorage.getItem("hakusura-td-name") || ""; } catch (e) {}
    $("playerName").value = savedName;
    $("submitNote").textContent = GameDB.configured() ? "Supabase連携中：オンラインランキングに登録されます。" : "未連携：この端末内のランキングに登録されます（設定からSupabase連携が可能）。";
    G.submitted = false;
    $("submitScoreBtn").disabled = false;
    openOv("overScr");
    updateWaveBtn();
  }

  // ===== ランキング =====
  function showRanking() {
    openOv("rankScr");
    $("rankSource").textContent = "読み込み中…";
    $("rankBody").innerHTML = "";
    GameDB.fetchScores(20).then(function (res) {
      $("rankSource").textContent = res.online ? "オンラインランキング（Supabase）" : "この端末内のランキング（未連携）";
      var tb = $("rankBody");
      tb.innerHTML = "";
      if (!res.rows.length) {
        tb.innerHTML = '<tr><td colspan="5" style="color:var(--muted)">まだ記録がありません</td></tr>';
        return;
      }
      res.rows.forEach(function (r, i) {
        var tr = document.createElement("tr");
        [String(i + 1), r.name, yen0(r.score), String(r.wave), String(r.kills)].forEach(function (v, j) {
          var td = document.createElement("td");
          if (j >= 2) td.className = "n";
          td.textContent = v;
          tr.appendChild(td);
        });
        tb.appendChild(tr);
      });
    });
  }

  // ===== 入力 =====
  function canvasPos(ev) {
    var rect = canvas.getBoundingClientRect();
    return { x: (ev.clientX - rect.left) * W / rect.width, y: (ev.clientY - rect.top) * H / rect.height };
  }
  canvas.addEventListener("pointerdown", function (ev) {
    var p = canvasPos(ev);
    pointer.down = true; pointer.moved = false;
    pointer.sx = p.x; pointer.sy = p.y; pointer.st = performance.now();
    pointer.x = p.x; pointer.y = p.y;
    if (G && G.state === "playing" && !G.paused) G.hero.target = { x: p.x, y: p.y };
  });
  canvas.addEventListener("pointermove", function (ev) {
    if (!pointer.down) return;
    var p = canvasPos(ev);
    pointer.x = p.x; pointer.y = p.y;
    if (Math.abs(p.x - pointer.sx) + Math.abs(p.y - pointer.sy) > 14) pointer.moved = true;
    if (G && G.state === "playing" && !G.paused) G.hero.target = { x: p.x, y: p.y };
  });
  canvas.addEventListener("pointerup", function (ev) {
    pointer.down = false;
    if (!G || G.state !== "playing" || G.paused) return;
    var p = canvasPos(ev);
    var quick = performance.now() - pointer.st < 350;
    if (quick && !pointer.moved) {
      for (var i = 0; i < PADS.length; i++) {
        if (Math.abs(p.x - PADS[i].x) <= 30 && Math.abs(p.y - PADS[i].y) <= 30) {
          openBuild(PADS[i]);
          return;
        }
      }
    }
  });
  window.addEventListener("keydown", function (ev) {
    keys[ev.key.toLowerCase()] = true;
    if (!G || G.state !== "playing") return;
    var k = ev.key.toLowerCase();
    if (k === "q") castQ();
    if (k === "e") castE();
    if (k === "r") castR();
    if (k === " ") { ev.preventDefault(); startWave(); }
  });
  window.addEventListener("keyup", function (ev) { keys[ev.key.toLowerCase()] = false; });

  // ===== UI配線 =====
  $("abQ").addEventListener("click", castQ);
  $("abE").addEventListener("click", castE);
  $("abR").addEventListener("click", castR);
  $("waveBtn").addEventListener("click", startWave);
  $("invBtn").addEventListener("click", function () { if (G) { renderInventory(); openOv("invScr"); } });
  $("invClose").addEventListener("click", function () { closeOv("invScr"); });
  $("buildClose").addEventListener("click", function () { closeOv("buildScr"); });
  $("rankBtn").addEventListener("click", showRanking);
  $("startRankBtn").addEventListener("click", showRanking);
  $("rankClose").addEventListener("click", function () { closeOv("rankScr"); });
  $("settingsBtn").addEventListener("click", function () { openOv("settingsScr"); });
  $("startSettingsBtn").addEventListener("click", function () { openOv("settingsScr"); });
  $("settingsClose").addEventListener("click", function () { closeOv("settingsScr"); });
  $("startBtn").addEventListener("click", function () {
    closeOv("startScr");
    startGame();
  });
  $("retryBtn").addEventListener("click", function () {
    closeOv("overScr");
    startGame();
  });
  $("submitScoreBtn").addEventListener("click", function () {
    if (!G || G.submitted) return;
    var name = $("playerName").value.trim() || "名無し";
    try { localStorage.setItem("hakusura-td-name", name); } catch (e) {}
    G.submitted = true;
    $("submitScoreBtn").disabled = true;
    GameDB.submitScore({ name: name, score: G.score, wave: G.wave, kills: G.kills }).then(function (res) {
      $("submitNote").textContent = res.online ? "✅ オンラインランキングに登録しました" : "この端末内のランキングに登録しました";
      toast("🏆 スコアを登録しました");
    });
  });
  $("sbSave").addEventListener("click", function () {
    var url = $("sbUrl").value.trim();
    var key = $("sbKey").value.trim();
    GameDB.saveConfig({ url: url, key: key });
    GameDB.resetClient();
    $("sbStatus").textContent = "接続テスト中…";
    GameDB.testConnection().then(function (res) {
      $("sbStatus").textContent = res.ok ? "✅ 接続できました" : "⚠️ 接続できませんでした：" + res.reason;
    });
  });
  $("sbClear").addEventListener("click", function () {
    GameDB.saveConfig({});
    GameDB.resetClient();
    $("sbUrl").value = ""; $("sbKey").value = "";
    $("sbStatus").textContent = "連携を解除しました";
  });

  function startGame() {
    G = newGame();
    G.hero = newHero();
    G.mods = newMods();
    G.hero.hp = calcStats().maxHp;
    G.state = "playing";
    PADS.forEach(function (p) { p.tower = null; });
    updateWaveBtn();
    refreshHud();
    toast("▶ Wave 1 の開始ボタンでスタート");
  }

  // ===== 初期化・ループ =====
  (function init() {
    var cfg = GameDB.loadConfig();
    $("sbUrl").value = cfg.url || "";
    $("sbKey").value = cfg.key || "";
    $("sbStatus").textContent = GameDB.configured() ? "連携設定あり（接続テストで確認できます）" : "未設定です";
    G = newGame();
    G.hero = newHero();
    G.mods = newMods();
    G.hero.hp = calcStats().maxHp;
    var last = performance.now();
    function frame(now) {
      var dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      update(dt);
      draw();
      refreshHud();
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  })();
})();
