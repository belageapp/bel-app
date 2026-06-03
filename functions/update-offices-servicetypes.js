/**
 * FirestoreのofficesコレクションにserviceTypesフィールドを追加するスクリプト
 *
 * 実行方法:
 *   cd functions
 *   node update-offices-servicetypes.js
 *
 * 事前準備:
 *   GOOGLE_APPLICATION_CREDENTIALS 環境変数にサービスアカウントキーのパスを設定するか、
 *   firebase emulators を使用してください。
 *   または firebase-admin が既にプロジェクト認証済みの場合はそのまま実行できます。
 */

const { initializeApp, applicationDefault } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");

initializeApp({ credential: applicationDefault(), projectId: "daily-report-b90e8" });
const db = getFirestore();

const LAFORE_OFFICES = ["ラフォーレ高陽", "ラフォーレ亀山"];

async function main() {
  const [offSnap, prSnap] = await Promise.all([
    db.collection("offices").get(),
    db.collection("prices").get(),
  ]);

  const prices = {};
  prSnap.forEach((d) => (prices[d.id] = d.data()));

  const batch = db.batch();
  let count = 0;

  offSnap.forEach((d) => {
    const data = d.data();
    const price = prices[data.priceId] || {};
    const capacity = price.capacity || data.capacity || 10;

    let serviceTypes;
    if (LAFORE_OFFICES.includes(data.name)) {
      serviceTypes = [
        { id: "生活介護", capacity: 10 },
        { id: "就労B型",  capacity: 10 },
      ];
    } else {
      serviceTypes = [{ id: "通常", capacity }];
    }

    batch.update(d.ref, { serviceTypes });
    count++;
    console.log(`${data.name}: serviceTypes=${JSON.stringify(serviceTypes)}`);
  });

  await batch.commit();
  console.log(`\n✅ ${count}件の事業所を更新しました`);
}

main().catch((e) => { console.error(e); process.exit(1); });
