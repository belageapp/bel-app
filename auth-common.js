// ===================================================
// auth-common.js - 全ページ共通の認証・ロール管理
// 各HTMLページでimportして使用する
// ===================================================

import { initializeApp, getApps } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js';
import { getAuth, onAuthStateChanged, signOut } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js';
import { getFirestore, doc, getDoc } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';

const firebaseConfig = {
  apiKey:"AIzaSyCl48Fay9AbMLRXJ7npya4PJIgDQPvltxs",
  authDomain:"daily-report-b90e8.firebaseapp.com",
  projectId:"daily-report-b90e8",
  storageBucket:"daily-report-b90e8.firebasestorage.app",
  messagingSenderId:"16569831525",
  appId:"1:16569831525:web:aa250f2061f762dfe1768c"
};

// 多重初期化を防ぐ
const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
const auth = getAuth(app);
const db   = getFirestore(app);

// ロールの権限定義
export const ROLE_PERMISSIONS = {
  admin: [
    'all'
  ],
  support: [
    'report.view', 'report.edit',
    'daily.view', 'daily.input',
    'monthly.view',
    'import.use',
    'settings.view', 'settings.edit',
    'workdays.view', 'workdays.edit', 'workdays.approve',
    'users.view', 'users.edit',
    'tasks.view',
  ],
  area_manager: [
    'report.view',
    'daily.view', 'daily.input',
    'monthly.view',
    'settings.view',
    'workdays.view', 'workdays.approve', 'workdays.reject',
    'tasks.view',
  ],
  unit_manager: [
    'report.view',
    'daily.view', 'daily.input',
    'monthly.view',
    'settings.view',
    'workdays.view', 'workdays.approve', 'workdays.reject',
    'tasks.view',
  ],
  manager: [
    'daily.input',
    'monthly.view',
    'report.view.own',   // 自事業所のみ
    'workdays.view', 'workdays.edit', 'workdays.submit',
    'tasks.view',
  ],
};

export const ROLE_LABELS = {
  admin:        'Administrator',
  support:      '事業支援課',
  area_manager: 'エリアマネジャー',
  unit_manager: 'ユニットマネジャー',
  manager:      '事業所管理者',
};

// ロールの階層レベル（数字が大きいほど上位）
export const ROLE_LEVELS = {
  manager:      1,
  unit_manager: 2,
  area_manager: 3,
  support:      4,
  admin:        5,
};

// ===================================================
// 現在のユーザー情報をキャッシュ
// ===================================================
let currentUser     = null;
let currentUserData = null;

export function getCurrentUser()     { return currentUser; }
export function getCurrentUserData() { return currentUserData; }

// ===================================================
// 権限チェック
// ===================================================
export function hasPermission(permission) {
  if (!currentUserData) return false;
  const role  = currentUserData.role;
  const perms = ROLE_PERMISSIONS[role] || [];
  return perms.includes('all') || perms.includes(permission);
}

export function isRole(role) {
  return currentUserData?.role === role;
}

export function isRoleOrAbove(minRole) {
  if (!currentUserData) return false;
  const myLevel  = ROLE_LEVELS[currentUserData.role] || 0;
  const minLevel = ROLE_LEVELS[minRole] || 0;
  return myLevel >= minLevel;
}

// ===================================================
// 認証チェック（各ページのtopで呼ぶ）
// requirePermission: このページに必要な権限（省略可）
// ===================================================
export async function requireAuth(requirePermission = null) {
  return new Promise((resolve, reject) => {
    onAuthStateChanged(auth, async user => {
      if (!user) {
        // 未ログイン → ログイン画面へ
        location.href = 'login.html';
        return;
      }

      currentUser = user;

      try {
        // Firestoreからユーザー情報取得
        const snap = await getDoc(doc(db, 'users', user.uid));
        if (!snap.exists()) {
          // Firestoreにユーザーデータがない（初回 or 未登録）
          showAuthError('アカウントが設定されていません。管理者に連絡してください。');
          return;
        }

        currentUserData = { uid: user.uid, email: user.email, ...snap.data() };

        // アカウント無効チェック
        if (currentUserData.disabled) {
          showAuthError('このアカウントは無効化されています。管理者に連絡してください。');
          return;
        }

        // 権限チェック
        if (requirePermission && !hasPermission(requirePermission)) {
          showAuthError('このページへのアクセス権限がありません。');
          return;
        }

        resolve(currentUserData);
      } catch(e) {
        console.error('Auth error:', e);
        showAuthError('認証情報の取得に失敗しました。');
      }
    });
  });
}

// ===================================================
// ログアウト
// ===================================================
export async function logout() {
  await signOut(auth);
  location.href = 'login.html';
}

// ===================================================
// エラー表示（権限なし等）
// ===================================================
function showAuthError(message) {
  document.body.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:center;min-height:100vh;background:#F4F6F8;font-family:-apple-system,sans-serif">
      <div style="background:#fff;border-radius:12px;border:1px solid #E8EAED;padding:40px;text-align:center;max-width:400px">
        <div style="font-size:32px;margin-bottom:16px">🔒</div>
        <div style="font-size:16px;font-weight:600;color:#333;margin-bottom:8px">アクセスできません</div>
        <div style="font-size:13px;color:#888;margin-bottom:24px">${message}</div>
        <button onclick="location.href='login.html'" style="padding:10px 24px;background:#F0FAF6;color:#1D9E75;border:1px solid #A8D5BE;border-radius:8px;font-size:14px;cursor:pointer;font-weight:600">
          ログイン画面に戻る
        </button>
      </div>
    </div>`;
}

// ===================================================
// トップバーにユーザー情報を追加するヘルパー
// ===================================================
export function renderUserBadge(containerId) {
  const el = document.getElementById(containerId);
  if (!el || !currentUserData) return;

  el.innerHTML = `
    <div style="display:flex;align-items:center;gap:8px;margin-left:auto">
      <div style="text-align:right">
        <div style="font-size:12px;font-weight:600;color:#333">${currentUserData.displayName || currentUserData.email}</div>
        <div style="font-size:10px;color:#999">${ROLE_LABELS[currentUserData.role] || currentUserData.role}</div>
      </div>
      <button onclick="window._authLogout()" style="padding:4px 10px;border-radius:6px;border:1px solid #E8EAED;background:#fff;color:#888;font-size:11px;cursor:pointer;font-family:inherit">
        ログアウト
      </button>
    </div>`;

  window._authLogout = logout;
}
