import { initializeApp, applicationDefault } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

initializeApp({ credential: applicationDefault(), projectId: 'daily-report-b90e8' });
const db = getFirestore();

const office = 'ReadyGO黒瀬';
const dates = ['2026-06-09', '2026-06-10'];

for (const date of dates) {
  const snap = await db.collection('reports')
    .where('office', '==', office)
    .where('date', '==', date)
    .get();
  if (snap.empty) {
    console.log(`${date}: ドキュメントなし`);
  } else {
    for (const d of snap.docs) {
      console.log(`${date}: 削除 → ${d.id}`, JSON.stringify(d.data()));
      await d.ref.delete();
    }
  }
}
console.log('完了');
