const { onSchedule } = require("firebase-functions/v2/scheduler");
const { onRequest } = require("firebase-functions/v2/https");
const { setGlobalOptions } = require("firebase-functions/v2");
const { initializeApp } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");

initializeApp();
setGlobalOptions({ maxInstances: 5, region: "asia-northeast1" });

// ── JST ──────────────────────────────────────────────────────
function jstNow() {
  return new Date(Date.now() + 9 * 60 * 60 * 1000);
}

function toDateStr(d) {
  return d.toISOString().split("T")[0];
}

// ── Firestore helpers ─────────────────────────────────────────
async function getHolidays(db) {
  try {
    const snap = await db.collection("config").doc("holidays").get();
    if (snap.exists) return new Set(snap.data().dates || []);
  } catch (_) {}
  return new Set();
}

function isWeekday(dateStr) {
  const dow = new Date(dateStr + "T00:00:00").getDay();
  return dow !== 0 && dow !== 6;
}

async function isTodayBusinessDay(db) {
  const holidays = await getHolidays(db);
  const today = toDateStr(jstNow());
  return isWeekday(today) && !holidays.has(today);
}

async function getPrevBusinessDay(db) {
  const holidays = await getHolidays(db);
  const d = new Date(toDateStr(jstNow()) + "T00:00:00");
  for (let i = 0; i < 14; i++) {
    d.setDate(d.getDate() - 1);
    const s = toDateStr(d);
    if (isWeekday(s) && !holidays.has(s)) return s;
  }
  return null;
}

// offices + prices + serviceTypes を結合して返す
async function getOffices(db) {
  const [offSnap, prSnap] = await Promise.all([
    db.collection("offices").get(),
    db.collection("prices").get(),
  ]);
  const prices = {};
  prSnap.forEach((d) => (prices[d.id] = d.data()));

  const list = [];
  offSnap.forEach((d) => {
    const data = d.data();
    const price = prices[data.priceId] || {};
    list.push({
      id: d.id,
      name: data.name,
      capacity: price.capacity || data.capacity || 10,
      serviceTypes: data.serviceTypes || null,
      order: data.order || 99,
      isActive: data.isActive !== false,
    });
  });
  return list.filter((o) => o.isActive).sort((a, b) => a.order - b.order);
}

// workdays から開所している事業所を返す
async function getOpenSet(db, dateStr, officeNames) {
  const year = parseInt(dateStr.slice(0, 4));
  const month = parseInt(dateStr.slice(5, 7));
  const fiscalYear = month >= 4 ? year : year - 1;

  const snaps = await Promise.all(
    officeNames.map((name) =>
      db.collection("workdays").doc(`${fiscalYear}_${name}`).get()
    )
  );

  const open = new Set();
  snaps.forEach((snap, i) => {
    if (snap.exists && snap.data().days?.[dateStr] === 1) {
      open.add(officeNames[i]);
    }
  });
  return open;
}

// reports コレクションから指定日の速報を集計
// 新フォーマット（servicesオブジェクト）と旧フォーマット（serviceType分割）に対応
async function getReports(db, dateStr) {
  const snap = await db.collection("reports").where("date", "==", dateStr).get();
  const reps = {};
  snap.forEach((d) => {
    const r = d.data();
    if (!reps[r.office]) reps[r.office] = { kids: 0, time: r.time, services: {} };

    if (r.services) {
      // 新フォーマット（servicesオブジェクトあり）
      Object.entries(r.services).forEach(([svcName, svcData]) => {
        reps[r.office].services[svcName] = svcData;
        reps[r.office].kids += svcData.actual || 0;
      });
    } else if (r.serviceType === "care") {
      // 旧ラフォーレフォーマット
      reps[r.office].services["生活介護"] = { actual: r.kids || 0, capacity: 10 };
      reps[r.office].kids += r.kids || 0;
    } else if (r.serviceType === "work") {
      reps[r.office].services["就労B型"] = { actual: r.kids || 0, capacity: 10 };
      reps[r.office].kids += r.kids || 0;
    } else {
      // 通常事業所フォーマット
      reps[r.office].kids += r.kids || 0;
    }
  });
  return reps;
}

// ── Chatwork ──────────────────────────────────────────────────
async function postChatwork(token, roomId, body) {
  const res = await fetch(
    `https://api.chatwork.com/v2/rooms/${roomId}/messages`,
    {
      method: "POST",
      headers: {
        "X-ChatWorkToken": token,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({ body }),
    }
  );
  if (!res.ok) {
    throw new Error(`Chatwork API ${res.status}: ${await res.text()}`);
  }
  return res.json();
}

// ── 書式ヘルパー ──────────────────────────────────────────────
function rateEmoji(rate) {
  if (rate >= 100) return "🏆";
  if (rate >= 90) return "✅";
  if (rate >= 80) return "⚠️";
  return "🔴";
}

// 常に10文字固定（100%でもズレない）
function makeBar(rate) {
  const filled = Math.min(Math.floor(rate / 10), 10);
  return "█".repeat(filled) + "░".repeat(10 - filled);
}

// 全角2・半角1でカウントする視覚幅ヘルパー
function charVW(c) {
  const cp = c.codePointAt(0);
  if (
    (cp >= 0x1100 && cp <= 0x115F) ||
    (cp >= 0x2E80 && cp <= 0x303E) ||
    (cp >= 0x3040 && cp <= 0x33FF) ||
    (cp >= 0x3400 && cp <= 0x4DBF) ||
    (cp >= 0x4E00 && cp <= 0x9FFF) ||
    (cp >= 0xAC00 && cp <= 0xD7AF) ||
    (cp >= 0xF900 && cp <= 0xFAFF) ||
    (cp >= 0xFE30 && cp <= 0xFE6F) ||
    (cp >= 0xFF01 && cp <= 0xFF60) ||
    (cp >= 0xFFE0 && cp <= 0xFFE6) ||
    cp >= 0x1F004
  ) return 2;
  return 1;
}
function visW(s) { let w = 0; for (const c of String(s)) w += charVW(c); return w; }
// 視覚幅を考慮した右/左パディング
function rpW(s, n) { return String(s) + " ".repeat(Math.max(0, n - visW(String(s)))); }
function lpW(s, n) { return " ".repeat(Math.max(0, n - visW(String(s)))) + String(s); }
// 視覚幅でトリム
function truncV(s, maxV) {
  s = String(s); let w = 0, res = "";
  for (const c of s) { const cw = charVW(c); if (w + cw > maxV) break; w += cw; res += c; }
  return res;
}

// ── Chatworkメッセージ本文生成（postDailyReport・triggerDailyReport共通） ──
// 列幅（視覚幅）: 事業所名=16, 定員=4, 実績=4, 達成率=7  セパレータ="  "
// LINE長 = 16+2+4+2+4+2+7 = 37
function buildChatworkMessage(dateStr, offices, reports, openSet) {
  const [y, m, d] = dateStr.split("-");
  const LINE = "─".repeat(37);

  let totalCap = 0;
  let totalActual = 0;
  const tableLines = [];
  const graphLines = [];

  tableLines.push(
    rpW("事業所", 16) + "  " + lpW("定員", 4) + "  " + lpW("実績", 4) + "  " + lpW("達成率", 7)
  );
  tableLines.push(LINE);

  offices.forEach((o) => {
    const isOpen = openSet.has(o.name);
    const rep = reports[o.name];

    if (!isOpen) {
      tableLines.push(rpW(truncV(o.name, 16), 16) + "  （閉所）");
      return;
    }

    const svcs = o.serviceTypes;
    if (svcs && svcs.length > 1) {
      // ラフォーレなどサービス種別が複数ある事業所：種別ごとに1行
      svcs.forEach((svc) => {
        const svcData = rep?.services?.[svc.id];
        const actual = svcData?.actual ?? null;
        const cap = svc.capacity || 10;
        const rate = actual !== null ? (actual / cap) * 100 : null;
        const em = rate !== null ? rateEmoji(rate) : "";
        // 事業所名8視覚+サービス名6視覚で最大16視覚に収める
        const displayName = `${truncV(o.name, 8)}(${truncV(svc.id, 6)})`;

        tableLines.push(
          rpW(displayName, 16) + "  " +
          lpW(cap, 4) + "  " +
          (actual !== null ? lpW(actual, 4) : lpW("—", 4)) + "  " +
          (rate !== null ? lpW(rate.toFixed(1) + "%", 7) : lpW("—", 7)) +
          "  " + em
        );

        if (actual !== null) {
          totalCap += cap;
          totalActual += actual;
          graphLines.push(
            rpW(truncV(displayName, 12), 12) + "  " +
            makeBar(rate) + "  " + rate.toFixed(1) + "%  " + rateEmoji(rate)
          );
        } else {
          graphLines.push(rpW(truncV(displayName, 12), 12) + "  （未入力）");
        }
      });
    } else {
      // 通常の単一サービス事業所
      const actual = rep ? rep.kids : null;
      const cap = o.capacity;
      const rate = actual !== null ? (actual / cap) * 100 : null;
      const em = rate !== null ? rateEmoji(rate) : "";

      tableLines.push(
        rpW(truncV(o.name, 16), 16) + "  " +
        lpW(cap, 4) + "  " +
        (actual !== null ? lpW(actual, 4) : lpW("—", 4)) + "  " +
        (rate !== null ? lpW(rate.toFixed(1) + "%", 7) : lpW("—", 7)) +
        "  " + em
      );

      if (actual !== null) {
        totalCap += cap;
        totalActual += actual;
        graphLines.push(
          rpW(truncV(o.name, 12), 12) + "  " +
          makeBar(rate) + "  " + rate.toFixed(1) + "%  " + rateEmoji(rate)
        );
      } else {
        graphLines.push(rpW(truncV(o.name, 12), 12) + "  （未入力）");
      }
    }
  });

  tableLines.push(LINE);
  const totalRate = totalCap > 0 ? (totalActual / totalCap) * 100 : 0;
  tableLines.push(
    rpW("合　計", 16) + "  " +
    lpW(totalCap, 4) + "  " +
    lpW(totalActual, 4) + "  " +
    lpW(totalRate.toFixed(1) + "%", 7) +
    "  " + (totalCap > 0 ? rateEmoji(totalRate) : "")
  );
  tableLines.push("　　　　　　　　　　※合計は開所事業所のみ");

  return (
    `📊 前営業日速報（${y}/${m}/${d}）\n` +
    `　　　　　　　　　　※達成率は対定員\n\n` +
    `[code]\n${tableLines.join("\n")}\n[/code]\n\n` +
    `[達成率グラフ（対定員）]\n` +
    `[code]\n${graphLines.join("\n")}\n[/code]\n\n` +
    `達成率基準（対定員）\n🏆100%以上 ✅90〜99% ⚠️80〜89% 🔴79%以下`
  );
}

// ── Function 1: postDailyReport（毎日 12:00 JST）─────────────
exports.postDailyReport = onSchedule(
  { schedule: "0 12 * * 1-5", timeZone: "Asia/Tokyo" },
  async () => {
    const db = getFirestore();

    if (!(await isTodayBusinessDay(db))) {
      console.log("本日は祝日のためスキップ");
      return;
    }

    const prevDay = await getPrevBusinessDay(db);
    if (!prevDay) { console.error("前営業日を取得できません"); return; }

    const offices = await getOffices(db);
    const names = offices.map((o) => o.name);
    const [reports, openSet] = await Promise.all([
      getReports(db, prevDay),
      getOpenSet(db, prevDay, names),
    ]);

    const token = process.env.CHATWORK_API_TOKEN;
    const roomId = process.env.CHATWORK_ROOM_ID;
    if (!token || !roomId) { console.error("Chatwork 環境変数が未設定"); return; }

    const message = buildChatworkMessage(prevDay, offices, reports, openSet);
    await postChatwork(token, roomId, message);
    console.log(`前営業日速報を投稿しました: ${prevDay}`);
  }
);

// ── Function 2: checkMissingReports（毎日 11:00 JST）─────────
exports.checkMissingReports = onSchedule(
  { schedule: "0 11 * * 1-5", timeZone: "Asia/Tokyo" },
  async () => {
    const db = getFirestore();

    if (!(await isTodayBusinessDay(db))) {
      console.log("本日は祝日のためスキップ");
      return;
    }

    const prevDay = await getPrevBusinessDay(db);
    if (!prevDay) return;

    const offices = await getOffices(db);
    const names = offices.map((o) => o.name);
    const [reports, openSet] = await Promise.all([
      getReports(db, prevDay),
      getOpenSet(db, prevDay, names),
    ]);

    const missing = offices
      .filter((o) => openSet.has(o.name) && !reports[o.name])
      .map((o) => o.name);

    if (!missing.length) {
      console.log("全事業所が入力済み – アラート不要");
      return;
    }

    const [y, m, d] = prevDay.split("-");
    const appUrl = process.env.BEL_APP_URL || "";

    const message =
      `[toall]\n⚠️ 速報値 未入力アラート（11:00時点）\n対象日: ${y}/${m}/${d}\n\n` +
      `以下の事業所が未入力です。\n12:00までに入力をお願いします。\n\n` +
      missing.map((n) => `・${n}`).join("\n") +
      (appUrl ? `\n\n入力はこちら → ${appUrl}` : "");

    const token = process.env.CHATWORK_API_TOKEN;
    const roomId = process.env.CHATWORK_ROOM_ID;
    if (!token || !roomId) { console.error("Chatwork 環境変数が未設定"); return; }

    await postChatwork(token, roomId, message);
    console.log(`未入力アラート送信: ${missing.join(", ")}`);
  }
);

// ── Function 3: testChatwork（HTTP – 手動テスト用）────────────
exports.testChatwork = onRequest(
  { region: "asia-northeast1" },
  async (req, res) => {
    const token = process.env.CHATWORK_API_TOKEN;
    const roomId = process.env.CHATWORK_ROOM_ID;
    if (!token || !roomId) {
      res.status(500).json({ error: "CHATWORK_API_TOKEN または CHATWORK_ROOM_ID が未設定" });
      return;
    }
    try {
      const result = await postChatwork(
        token,
        roomId,
        "🧪 テスト投稿（bel-app 速報機能）接続確認 OK"
      );
      res.json({ success: true, result });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  }
);

// ── Function 4: triggerDailyReport（HTTP – デバッグ用）────────
exports.triggerDailyReport = onRequest(
  { region: "asia-northeast1" },
  async (req, res) => {
    if (req.headers["x-trigger-secret"] !== process.env.TRIGGER_SECRET) {
      res.status(403).json({ error: "Unauthorized" });
      return;
    }
    const db = getFirestore();
    const prevDay = req.query.date || (await getPrevBusinessDay(db));
    if (!prevDay) { res.status(500).json({ error: "日付を取得できません" }); return; }

    const offices = await getOffices(db);
    const names = offices.map((o) => o.name);
    const [reports, openSet] = await Promise.all([
      getReports(db, prevDay),
      getOpenSet(db, prevDay, names),
    ]);

    const token = process.env.CHATWORK_API_TOKEN;
    const roomId = process.env.CHATWORK_ROOM_ID;
    if (!token || !roomId) { res.status(500).json({ error: "Chatwork 環境変数が未設定" }); return; }

    const message = buildChatworkMessage(prevDay, offices, reports, openSet);
    await postChatwork(token, roomId, message);
    res.json({ success: true, date: prevDay, officesCount: offices.length });
  }
);
