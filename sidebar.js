/* 共通サイドバー・ユーザーバッジ — 全ページ共通。メニュー項目やロール表記の変更はこのファイルのみでOK */
(function () {
  var NAV_SECTIONS = [
    { label: null, items: [
      { href: 'index.html', icon: '🏠', label: 'ポータル' }
    ] },
    { label: '速報入力', items: [
      { href: 'daily.html', icon: '📋', label: '日次報告（事業所）' },
      { href: 'morning-report.html', icon: '📢', label: '週次報告（マネジャー）' }
    ] },
    { label: 'レポート', items: [
      { href: 'monthly.html', icon: '📈', label: '貢献速報（月次）' },
      { href: 'report.html', icon: '📊', label: '貢献実績表（年次）' },
      { href: 'invoice.html', icon: '🧾', label: '報酬明細（月次）' }
    ] },
    { label: 'プロジェクト', items: [
      { href: 'mirai-todo.html', icon: '✅', label: '未来創造企業ToDo' }
    ] },
    { label: '管理', items: [
      { href: 'import.html', icon: '📥', label: '請求データ取込' },
      { href: 'salary.html', icon: '💰', label: '給与データ取込' },
      { href: 'settings.html', icon: '⚙️', label: '設定' }
    ] }
  ];

  var ROLE_LABELS = {
    admin: 'admin｜システム管理者', supporter: 'supporter｜全編集', support: 'supporter｜全編集（旧）',
    editor: 'editor｜編集者', area_manager: 'editor｜編集者（旧AM）', unit_manager: 'editor｜編集者（旧UM）',
    user: 'user｜一般', manager: 'user｜一般（旧）'
  };
  window.ROLE_LABELS = ROLE_LABELS;

  function currentPage() {
    return location.pathname.split('/').pop() || 'index.html';
  }

  function renderSidebar() {
    var cur = currentPage();
    var itemsHtml = NAV_SECTIONS.map(function (section) {
      var itemsInSection = section.items.map(function (it) {
        return '<a href="' + it.href + '" class="sb-item' + (it.href === cur ? ' active' : '') + '">' +
          '<span class="sb-ic">' + it.icon + '</span>' + it.label + '</a>';
      }).join('');
      var labelHtml = section.label ? '<div class="sb-section-label">' + section.label + '</div>' : '';
      return labelHtml + itemsInSection;
    }).join('');
    var html =
      '<div class="sidebar-overlay" id="sidebar-overlay" onclick="closeSidebar()"></div>' +
      '<div class="sidebar" id="sidebar">' +
        '<div class="sb-logo"><img src="assets/belage_logo.png" alt="ベルアージュ" onerror="this.style.display=\'none\'"></div>' +
        '<div class="sb-scroll">' + itemsHtml + '</div>' +
        '<div class="sb-foot"><button onclick="_logout()" class="logout-btn">ログアウト</button></div>' +
      '</div>';
    document.body.insertAdjacentHTML('afterbegin', html);
  }

  window.toggleSidebar = function () {
    document.getElementById('sidebar').classList.toggle('open');
    document.getElementById('sidebar-overlay').classList.toggle('open');
  };
  window.closeSidebar = function () {
    document.getElementById('sidebar').classList.remove('open');
    document.getElementById('sidebar-overlay').classList.remove('open');
  };

  // ユーザーバッジ（ロール／メール／名前）を top-bar-user-info 相当の要素に描画する
  window.renderUserBadge = function (el, userData, email) {
    if (!el) return;
    var role = userData && userData.role;
    el.innerHTML =
      '<span style="font-size:10px;color:#fff;background:linear-gradient(135deg,#2FAF87,#0E9F6E);font-weight:600;padding:2px 9px;border-radius:10px;white-space:nowrap">' + (ROLE_LABELS[role] || role || '') + '</span>' +
      '<span style="font-size:11px;color:#888;white-space:nowrap">' + (email || '') + '</span>' +
      '<span style="font-size:12px;color:#333;font-weight:500;white-space:nowrap">' + ((userData && userData.displayName) || '') + '</span>';
  };

  renderSidebar();
})();
