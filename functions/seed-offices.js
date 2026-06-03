/**
 * seed-offices.js
 * gcloud auth を使って officesコレクションに
 * isActive・chatworkAccountId を追加する（ADC不要）
 *
 * 実行:
 *   node functions/seed-offices.js
 */

const { execSync } = require("child_process");
const https = require("https");

const PROJECT = "daily-report-b90e8";

function getToken() {
  return execSync("gcloud auth print-access-token --account=hasegawa.belage@gmail.com", {
    encoding: "utf8",
  }).trim();
}

function firestoreRequest(method, path, body, token) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const options = {
      hostname: "firestore.googleapis.com",
      path,
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        ...(data ? { "Content-Length": Buffer.byteLength(data) } : {}),
      },
    };
    const req = https.request(options, (res) => {
      let buf = "";
      res.on("data", (c) => (buf += c));
      res.on("end", () => {
        try { resolve(JSON.parse(buf)); } catch { resolve(buf); }
      });
    });
    req.on("error", reject);
    if (data) req.write(data);
    req.end();
  });
}

async function main() {
  const token = getToken();
  const basePath = `/v1/projects/${PROJECT}/databases/(default)/documents`;

  // offices 一覧を取得
  const res = await firestoreRequest("GET", `${basePath}/offices?pageSize=50`, null, token);
  const docs = res.documents || [];
  console.log(`取得: ${docs.length} 件の事業所`);

  for (const doc of docs) {
    const fields = doc.fields || {};
    const name = fields.name?.stringValue || "(不明)";
    const updates = {};

    if (!fields.isActive) {
      updates.isActive = { booleanValue: true };
    }
    if (!fields.chatworkAccountId) {
      updates.chatworkAccountId = { stringValue: "" };
    }

    if (Object.keys(updates).length === 0) {
      console.log(`  スキップ（既存）: ${name}`);
      continue;
    }

    // PATCH で差分更新
    const docId = doc.name.split("/").pop();
    const updateMask = Object.keys(updates).map((k) => `updateMask.fieldPaths=${k}`).join("&");
    await firestoreRequest(
      "PATCH",
      `${basePath}/offices/${docId}?${updateMask}`,
      { fields: updates },
      token
    );
    console.log(`  更新: ${name} →`, Object.keys(updates));
  }

  console.log("\n完了");
}

main().catch((e) => { console.error("エラー:", e.message); process.exit(1); });
