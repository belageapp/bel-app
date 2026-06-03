/**
 * seed-holidays.js
 * config/holidays に 2026年の祝日を登録する（ADC不要、gcloud auth 使用）
 *
 * 実行:
 *   node functions/seed-holidays.js
 */

const { execSync } = require("child_process");
const https = require("https");

const PROJECT = "daily-report-b90e8";

const HOLIDAYS_2026 = [
  { date: "2026-01-01", name: "元日" },
  { date: "2026-01-12", name: "成人の日" },
  { date: "2026-02-11", name: "建国記念の日" },
  { date: "2026-02-23", name: "天皇誕生日" },
  { date: "2026-03-20", name: "春分の日" },
  { date: "2026-04-29", name: "昭和の日" },
  { date: "2026-05-03", name: "憲法記念日" },
  { date: "2026-05-04", name: "みどりの日" },
  { date: "2026-05-05", name: "こどもの日" },
  { date: "2026-05-06", name: "振替休日" },
  { date: "2026-07-20", name: "海の日" },
  { date: "2026-08-11", name: "山の日" },
  { date: "2026-09-21", name: "敬老の日" },
  { date: "2026-09-23", name: "秋分の日" },
  { date: "2026-10-12", name: "スポーツの日" },
  { date: "2026-11-03", name: "文化の日" },
  { date: "2026-11-23", name: "勤労感謝の日" },
];

function getToken() {
  return execSync("gcloud auth print-access-token --account=hasegawa.belage@gmail.com", {
    encoding: "utf8",
  }).trim();
}

function patch(path, body, token) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const req = https.request(
      {
        hostname: "firestore.googleapis.com",
        path,
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(data),
        },
      },
      (res) => {
        let buf = "";
        res.on("data", (c) => (buf += c));
        res.on("end", () => resolve(JSON.parse(buf)));
      }
    );
    req.on("error", reject);
    req.write(data);
    req.end();
  });
}

async function main() {
  const token = getToken();
  const dates = HOLIDAYS_2026.map((h) => h.date);

  const body = {
    fields: {
      year: { integerValue: "2026" },
      dates: {
        arrayValue: {
          values: dates.map((d) => ({ stringValue: d })),
        },
      },
      updatedAt: { stringValue: new Date().toISOString() },
    },
  };

  const path = `/v1/projects/${PROJECT}/databases/(default)/documents/config/holidays`;
  await patch(path, body, token);

  console.log("config/holidays を登録しました:");
  HOLIDAYS_2026.forEach((h) => console.log(`  ${h.date}  ${h.name}`));
  console.log(`\n合計: ${dates.length} 件`);
}

main().catch((e) => { console.error("エラー:", e.message); process.exit(1); });
