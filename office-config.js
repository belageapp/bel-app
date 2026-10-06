// ===================================================
// office-config.js - 事業所の定員・単価・実質目標を「日付」で解決する共通モジュール
//
// offices ドキュメントの priceHistory（適用開始日つき履歴）を見て、
// その日に有効な設定を返す。履歴が無ければ従来どおり事業所の現在値を使う。
//
// priceHistory: [{ from: 'YYYY-MM-DD' | '', priceId: string, targetCapacity: number|null }]
//   - from が '' のエントリは「最初から」（基準値）。配列は from 昇順で保存する。
//   - 日付 d に有効な設定 = from <= d を満たす最後のエントリ。
//   - 該当なし（履歴が空）の場合は事業所の現在値（priceId / price / targetCapacity）。
//   - settings.html は保存時に、今日有効なエントリの値を事業所の現在値にも書き戻す。
//     （履歴に対応していない古いコードでも今日の定員が正しく読めるようにするため）
// ===================================================

/** 履歴を from 昇順に整えて返す（不正なエントリは除く） */
export function sortHistory(history) {
  return [...(history || [])]
    .filter(e => e && typeof e === 'object' && e.priceId !== undefined)
    .map(e => ({ from: e.from || '', priceId: e.priceId || '', targetCapacity: e.targetCapacity > 0 ? e.targetCapacity : null }))
    .sort((a, b) => a.from.localeCompare(b.from));
}

/** 履歴が「意味のある形」で存在するか（基準値＋1件以上の変更） */
export function hasHistory(office) {
  return sortHistory(office?.priceHistory).length >= 2;
}

/** 指定日に有効な履歴エントリ。履歴が無ければ null */
export function historyEntryOn(office, dateStr) {
  const h = sortHistory(office?.priceHistory);
  if (!h.length) return null;
  let cur = null;
  for (const e of h) {
    if (!e.from || e.from <= dateStr) cur = e; else break;
  }
  return cur;
}

/**
 * 指定日に有効な設定を返す。
 * @param {object} office   offices ドキュメントのデータ
 * @param {object} pricesById  { priceId: pricesドキュメントのデータ }
 * @param {string} dateStr  'YYYY-MM-DD'
 * @returns {{priceId:string, price:object|null, type:string, capacity:number, unitPrice:number, targetCapacity:number, fromHistory:boolean}}
 *   capacity        … 定員（prices.capacity）。未設定なら 0
 *   unitPrice       … 単価（prices.price）。未設定なら 0
 *   targetCapacity  … 実質目標。未設定なら定員と同じ
 */
export function resolveOfficeConfig(office, pricesById, dateStr) {
  const e = historyEntryOn(office, dateStr);
  const priceId = e ? e.priceId : (office?.priceId || '');
  const tgt     = e ? e.targetCapacity : office?.targetCapacity;
  const price   = (priceId && pricesById && pricesById[priceId]) || null;
  const capacity  = price?.capacity || office?.capacity || 0;
  const unitPrice = price?.price ?? (e ? 0 : (office?.price ?? 0));
  const targetCapacity = tgt > 0 ? tgt : capacity;
  return { priceId, price, type: price?.type || '', capacity, unitPrice, targetCapacity, fromHistory: !!e };
}

/** 今日の日付 'YYYY-MM-DD'（端末ローカル） */
export function todayStr() {
  const n = new Date();
  return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}-${String(n.getDate()).padStart(2, '0')}`;
}

/** 種別／定員の表示ラベル（例：「放デイ　定員10」） */
export function configLabel(cfg) {
  if (!cfg || !cfg.price) return '未設定';
  return `${cfg.type}　定員${cfg.capacity > 0 ? cfg.capacity : '－'}`;
}
