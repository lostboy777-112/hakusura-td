// ハクスラTD：Supabase連携（未設定時はローカル保存で動作）
(function (root) {
  "use strict";
  var CFG_KEY = "hakusura-td-supabase";
  var LOCAL_RANK_KEY = "hakusura-td-local-ranks";
  var PLAYER_KEY = "hakusura-td-player";
  var client = null;
  var libPromise = null;

  function loadConfig() {
    try { return JSON.parse(localStorage.getItem(CFG_KEY)) || {}; } catch (e) { return {}; }
  }
  function saveConfig(cfg) {
    localStorage.setItem(CFG_KEY, JSON.stringify(cfg || {}));
  }
  function configured() {
    var c = loadConfig();
    return !!(c.url && c.key);
  }
  function playerId() {
    var id = localStorage.getItem(PLAYER_KEY);
    if (!id) {
      id = (root.crypto && crypto.randomUUID) ? crypto.randomUUID()
        : "p-" + Date.now().toString(36) + Math.random().toString(36).slice(2, 12);
      localStorage.setItem(PLAYER_KEY, id);
    }
    return id;
  }
  function loadLib() {
    if (root.supabase) return Promise.resolve(root.supabase);
    if (libPromise) return libPromise;
    libPromise = new Promise(function (res, rej) {
      var s = document.createElement("script");
      s.src = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js";
      s.onload = function () { res(root.supabase); };
      s.onerror = function () { rej(new Error("supabase-jsの読み込みに失敗")); };
      document.head.appendChild(s);
    });
    return libPromise;
  }
  function getClient() {
    if (client) return Promise.resolve(client);
    var c = loadConfig();
    if (!c.url || !c.key) return Promise.resolve(null);
    return loadLib().then(function (lib) {
      client = lib.createClient(c.url, c.key);
      return client;
    }).catch(function () { return null; });
  }
  function resetClient() { client = null; }

  function localRanks() {
    try { return JSON.parse(localStorage.getItem(LOCAL_RANK_KEY)) || []; } catch (e) { return []; }
  }
  function saveLocalRank(entry) {
    var arr = localRanks();
    arr.push(entry);
    arr.sort(function (a, b) { return b.score - a.score; });
    localStorage.setItem(LOCAL_RANK_KEY, JSON.stringify(arr.slice(0, 50)));
  }

  // スコア登録：ローカルには必ず保存し、設定があればオンラインにも送る
  function submitScore(entry) {
    var local = {
      name: entry.name, score: entry.score, wave: entry.wave, kills: entry.kills,
      created_at: new Date().toISOString()
    };
    saveLocalRank(local);
    return getClient().then(function (cl) {
      if (!cl) return { online: false };
      return cl.from("loot_td_scores")
        .insert({ name: entry.name, score: entry.score, wave: entry.wave, kills: entry.kills })
        .then(function (r) {
          if (r.error) throw r.error;
          // ベスト記録をクラウドセーブ（失敗してもスコア登録は成功扱い）
          return cl.from("loot_td_saves")
            .upsert({ player_id: playerId(), data: { best: local }, updated_at: new Date().toISOString() })
            .then(function () { return { online: true }; }, function () { return { online: true }; });
        });
    }).catch(function () { return { online: false }; });
  }

  function fetchScores(limit) {
    limit = limit || 20;
    return getClient().then(function (cl) {
      if (!cl) return { online: false, rows: localRanks().slice(0, limit) };
      return cl.from("loot_td_scores")
        .select("name,score,wave,kills,created_at")
        .order("score", { ascending: false })
        .limit(limit)
        .then(function (r) {
          if (r.error || !r.data) return { online: false, rows: localRanks().slice(0, limit) };
          return { online: true, rows: r.data };
        });
    }).catch(function () {
      return { online: false, rows: localRanks().slice(0, limit) };
    });
  }

  function testConnection() {
    return getClient().then(function (cl) {
      if (!cl) return { ok: false, reason: "URLまたはanonキーが未設定です" };
      return cl.from("loot_td_scores").select("id").limit(1).then(function (r) {
        if (r.error) return { ok: false, reason: r.error.message };
        return { ok: true, reason: "" };
      });
    }).catch(function (e) {
      return { ok: false, reason: String(e && e.message ? e.message : e) };
    });
  }

  root.GameDB = {
    loadConfig: loadConfig,
    saveConfig: saveConfig,
    configured: configured,
    playerId: playerId,
    submitScore: submitScore,
    fetchScores: fetchScores,
    testConnection: testConnection,
    resetClient: resetClient,
    localRanks: localRanks
  };
})(window);
