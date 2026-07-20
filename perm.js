// ===================================================
// perm.js - 権限モデル（新4ロール体系＋旧ロール互換）
// 各ページで import { can, resolveTier, TIER_LABELS, PERMISSION_FLAGS } from './perm.js';
// userData（usersドキュメントの中身）を渡して判定する純粋関数のみ。
// ===================================================

// ── 基本ロール（縦の階層） ──────────────────────────
// user      一般ユーザー：閲覧全般＋基本入力（速報・稼働日申請・自担当の朝礼報告）
// editor    編集者：user＋permissionsで付与された機能のみ編集可
// supporter サポーター：全機能編集（ユーザー管理・賃金台帳含む。admin付与は不可）
// admin     システム管理者：全権限
export const TIER_LABELS = {
  user:      'user｜一般（閲覧・基本入力）',
  editor:    'editor｜編集者（機能別に付与）',
  supporter: 'supporter｜サポーター（全編集）',
  admin:     'admin｜システム管理者',
};

// ── editor に個別付与できる権限フラグ ────────────────
export const PERMISSION_FLAGS = {
  'todo.edit':        '未来創造ToDoの追加・編集',
  'monthly.edit':     '月次実績の編集',
  'workdays.approve': '稼働日の承認・差戻し',
  'morning.write':    '朝礼報告の入力（全事業所）',
  'master.edit':      'マスタ設定の編集（事業所・単価・部署等）',
  'import.use':       '国保連CSV取込',
  'salary.view':      '賃金台帳の閲覧',
  'notice.write':     'お知らせ配信',
};

// ── 一般ユーザー（user）標準でできる基本入力 ─────────
const USER_BASE = [
  'daily.input',       // 速報入力
  'workdays.submit',   // 稼働日の申請
  'morning.write.own', // 自分が担当の事業所の朝礼報告
];

// ── admin 専用（supporterにも与えない） ──────────────
const ADMIN_ONLY = [
  'daily.reset',   // 実績リセット
  'users.admin',   // adminロールの付与
];

// ── 旧ロール → 新体系への変換（互換レイヤー） ────────
// データ移行が済んでいなくても動くように、旧ロール名を新体系に読み替える。
export function resolveTier(userData) {
  const role = userData?.role || '';
  const perms = Array.isArray(userData?.permissions) ? userData.permissions : [];
  switch (role) {
    case 'admin':     return { tier: 'admin',     permissions: [] };
    case 'supporter':
    case 'support':   return { tier: 'supporter', permissions: [] };
    case 'editor':    return { tier: 'editor',    permissions: perms };
    // 旧ロールの権限を新体系で再現
    case 'area_manager':
      return { tier: 'editor', permissions: perms.length ? perms : ['todo.edit', 'workdays.approve', 'morning.write'] };
    case 'unit_manager':
      return { tier: 'editor', permissions: perms.length ? perms : ['workdays.approve', 'morning.write'] };
    case 'manager':
    case 'user':      return { tier: 'user', permissions: [] };
    default:          return { tier: 'user', permissions: [] };
  }
}

// ── 権限判定 ─────────────────────────────────────────
export function can(userData, flag) {
  if (!userData) return false;
  const { tier, permissions } = resolveTier(userData);
  if (tier === 'admin') return true;
  if (ADMIN_ONLY.includes(flag)) return false;
  if (tier === 'supporter') return true;
  if (USER_BASE.includes(flag)) return true;
  if (tier === 'editor') return permissions.includes(flag);
  return false;
}

// ── 表示用：ロールバッジのラベル ─────────────────────
export function tierLabel(userData) {
  const { tier } = resolveTier(userData);
  return TIER_LABELS[tier] || tier;
}
