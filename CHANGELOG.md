# CHANGELOG - ベルアージュ業務支援システム

バージョン管理方針：
- **メジャー** : 既存機能の破壊的変更・大規模リニューアル
- **マイナー** : 新機能追加
- **パッチ**   : バグ修正・UI微調整

---

## v1.13.1 (2026-08-07)

### 修正
- **貢献速報（日次）で事業所を切り替えると前の事業所の集計が残る不具合を修正**
  - 事象：レポ白木を開くと最下部にラフォーレ亀山の「今月の貢献人数・稼働日・入力履歴」が、ラフォーレ高陽/亀山を開くと最上部にレポ白木の同項目が残って表示されていた
  - 原因：事業所表示処理で、通常事業所とラフォーレ事業所の切替時に反対タイプの進捗ブロック（`input-progress-area`／`history-area` ↔ `lafore-progress-area`／`lafore-history-area`）を隠していなかった
  - 修正：各分岐で反対タイプのブロックを明示的に非表示にするよう追加

---

## v1.13.0 (2026-07-22)

### 修正
- **朝礼報告（週次）が「読み込み中」のまま表示されない不具合を修正**
  - 原因：perm.js の import 文が既存の複数行 import（`import ... from` が2行に分かれた記述）の途中に挿入され、構文エラーで全スクリプトが停止していた
  - 修正：import の順序を正常化
- **GitHub Pages のビルド安定化**：`.nojekyll` を追加し Jekyll 処理を無効化（新体系の反映が途中で止まっていた問題を解消）

---

## v1.12.0 (2026-07-20)

### 新機能：システムロールを4段階体系に刷新
- **perm.js（新規）**：共通権限モジュール。旧ロール（support/area_manager/unit_manager/manager）を新体系へ自動変換する互換レイヤーを内蔵
- **新ロール体系**
  - `user`（一般）：閲覧全般＋基本入力（速報入力・稼働日申請・自担当の朝礼報告）
  - `editor`（編集者）：user＋`permissions` 配列で機能別に権限付与（8フラグ：todo.edit / monthly.edit / workdays.approve / morning.write / master.edit / import.use / salary.view / notice.write）
  - `supporter`（サポーター）：全機能編集（ユーザー管理・賃金台帳含む）
  - `admin`：全権限
- **settings.html**：ロール4択＋editor選択時に権限チェックボックス表示、一覧に付与権限を表示
- **全ページのゲートを `can(userData, flag)` に統一**（daily / monthly / morning-report / mirai-todo / salary / import / settings / index）
- 役職を「役割」に改称、選択肢を刷新（役員 / エリアマネジャー / ユニットマネジャー / エキスパート / 事業支援課 / 管理者）
- 既存ユーザー22名を新ロールにデータ移行

### 修正：セキュリティ
- **賃金台帳**：Firestoreルールの read を `salary.view` 権限必須に変更（従来は全ログインユーザーが API 経由で閲覧可能だった）
- **users**：自分自身の更新で `role` / `permissions` / `disabled` の自己変更を禁止（自分でロールを昇格できる穴を封鎖）
- firestore.rules をリポジトリ管理化（`firebase.json` に登録）

---

## v1.11.0 (2026-07-19)

### 新機能：ユーザー管理に役職・上司を追加
- **settings.html**：`position`（社内役職）と `supervisorUid`（直属の上司）を追加。システム権限（ロール）と社内組織を分離管理
- 承認フローで使用する組織情報の基盤。ユーザー一覧に役職バッジ・上司名を表示

---

## v1.10.0 (2026-07-15)

### 新機能：未来創造企業 ToDo の機能拡充
- タスクの**編集機能**（期限・タグ・タイトル等を後から変更可能）
- **部門カテゴリ**欄（選択肢＝部署一覧＋事業支援部・役員）
- **担当者**欄（複数選択可・チェックボックス）＋**メンバー**欄（全有効ユーザーから複数選択）
- **タグ検索**：タグピルのクリックで絞り込み、再クリックで解除
- 期限表示を年まで表示（YYYY/M/D）、保存後に「保存しました」トースト表示

### 修正：日報の重複ドキュメント
- **速報入力の重複を根本防止**：ドキュメントIDを「事業所名_日付」に固定し `setDoc` で保存（連打・通信不安定時の多重作成を物理的に防止）。保存ボタンの連打防止（送信中 disabled）＋旧乱数IDドキュメントの自動掃除
  - 背景：ぐらっちぇ黒瀬 7/13 に同一報告が4重複し、速報で実績36人（実際9人）と表示される事故
- **reports の delete 権限**を manager も可能に修正（固定ID移行時の旧ドキュメント掃除で必要）
- 週次予定（planned）を実績報告時に引き継ぐよう修正

### 修正：セキュリティ・バグ
- **sendInvoicePdf**：Firebase Auth IDトークン認証を追加（従来は認証なしで誰でも Chatwork 投稿可能だった）
- **mirai-todo.html**：期限のタイムゾーンバグ（UTC解釈による1日ズレ）を修正
- ユーザー一覧の横スクロール対応・セルの折り返し防止・所属事業所表示

---

## v1.9.3 (2026-06-19)

### 修正
- **Firestore セキュリティルール** `workdays` コレクションの write 権限を `isSupport()` → `isManager()` に変更
  - 従来：admin・support のみ書き込み可
  - 修正後：manager・unit_manager・area_manager も書き込み可
  - 症状：manager ロールが稼働日設定で「保存する」を押しても "Missing or insufficient permissions" エラーになり保存できなかった

- **settings.html** manager ロールで稼働日設定の「保存する」ボタンが押せない問題を修正
  - 原因：area_manager・unit_manager・manager ロールはマスタ設定を閲覧のみにするため `.btn-primary` を全て `disabled` にしていたが、稼働日設定の保存ボタン（`wd-save-btn`）も巻き込まれていた
  - 修正：`wd-save-btn` を `disabled` 化の対象から除外

---

## v1.9.1 (2026-06-17)

### 修正
- **daily.html** ラフォーレ3事業所（高陽・亀山・白木）で週次予定が入力履歴に反映されない問題を修正
  - 原因①：`submitLafore` が `setDoc(data)` で上書き保存する際、既存ドキュメントの `planned` フィールドを消去していた
  - 原因②：履歴読み込み時、`services` フォーマットのドキュメントは `services.reservations` しか参照せず、`r.planned` を無視していた
  - 修正①：`submitLafore` 保存時に既存ドキュメント全件の最大 `planned` 値を引き継ぐよう変更
  - 修正②：`services.reservations` 合計が 0 の場合は `r.planned` をフォールバックとして使用
  - 症状が曜日依存に見えた理由：実績未入力日は `{planned:N}` ドキュメントのまま表示されたが、実績を入力した日は `setDoc` で `planned` が消えて非表示になっていた

---

## v1.9.0 (2026-06-17)

### 修正
- **morning-report.html** 朝礼報告（週次）のデフォルト表示週・集計範囲を修正
  - デフォルト週が翌週になっていた問題を修正
    - 原因：`getWeekBounds` が `(7 - dow) % 7` で次の日曜に進んでいた（日曜以外は常に翌週）
    - 修正：`baseDate.getDate() - dow` で今週の日曜（今日が日曜なら今日）に戻るよう変更
  - 報告週を選択しても集計テーブルが「前の週まで」しか表示されなかった問題を修正
    - 原因：`getPrevWeeks` のループが `i=5〜1`（報告週の1週前まで）で報告週自身を含んでいなかった
    - 修正：ループを `i=4〜0` に変更し、報告週（i=0）を含む直近5週（4週前〜報告週）を表示

---

## v1.8.0 (2026-06-13)

### 新機能
- **functions/index.js** 土曜日開所事業所の速報・アラートに対応
  - `postDailyReport`：前営業日から昨日までをループし、開所事業所がある日は順次Chatworkに投稿（月曜日に金曜＋土曜分を配信）
  - `checkMissingReports`：同様に土曜日を含む全日程の未入力をチェック。アラートメッセージを日付ごとにグループ化して送信
  - 速報タイトルに曜日を追加（例：`📊 速報（2026/06/13（土））`）

### 修正
- **invoice.html** ChatworkへのPDF送信メッセージに `[toall]` を追加
- **functions/index.js** `checkMissingReports` の未入力判定ロジックを修正
  - 従来：レポートドキュメントが存在するかどうかのみチェック
  - 修正後：`reported === true`（報告ボタン押下）または `kids > 0` で実績入力済みと判定
  - 週次予定のみ保存したドキュメント（`reported` なし・`kids = 0`）を未入力として正しくアラート対象に

---

## v1.7.0 (2026-06-11)

### 新機能
- **invoice.html** Chatwork PDF送信を事業所ごとに改ページ
  - 全体を一枚のキャンバスにレンダリングする方式から、各 `.invoice-page` を個別にレンダリングしてPDFの新ページとして追加する方式に変更

### 修正
- **functions/index.js** `sendInvoicePdf` の403エラーを修正
  - Firebase Functions v2 の `onRequest` に `invoker: "public"` を追加（未認証HTTPアクセスに必要）
- **invoice.html / functions/index.js** Chatwork送信時のファイル名文字化けを修正
  - 原因：busboy が `Content-Disposition` ヘッダーのファイル名を Latin-1 でデコードし文字化け
  - 対処：クライアント側でファイル名を独立したテキストフィールド（`fileName`）として送信し、Cloud Function 側で RFC5987（`filename*=UTF-8''...`）エンコードして Chatwork に転送

---

## v1.6.0 (2026-06-07)

### 新機能
- **daily.html** `offices.managerUid` によるマネジャー事業所アクセス制御
  - `loadMasterData()` で `offices` コレクションの `managerUid` → `officeId` マップを構築
  - `unit_manager` / `area_manager` が担当事業所に登録されていれば事業所セレクト画面をスキップ
  - 優先順位：`users.officeId`（Firestoreユーザー設定）を優先し、未設定の場合のみ `offices.managerUid` を参照
  - 自動選択時も「← 事業所一覧」ボタンを常時表示し、他事業所への切替を可能に
- **invoice.html** Chatworkへの報酬内容明細PDF送信機能を追加
  - 「📤 Chatworkに送信」ボタンを追加
  - html2canvas（scale 1.5）＋ jsPDF（A4）でクライアントサイドPDF生成
  - Cloud Function `sendInvoicePdf` 経由で Chatwork ルーム 336841705 にファイルアップロード
- **functions/index.js** `sendInvoicePdf` Cloud Function を追加（Function 5）
  - busboy でmultipart/form-dataをパース
  - Chatwork ファイルアップロード API（`POST /rooms/{id}/files`）に転送
- **functions/package.json** `busboy ^1.6.0` を依存関係に追加

### 改善
- **invoice.html** 取込事業所すべての表示を `order` フィールド順にソート（全事業所と同一基準）

---

## v1.5.0 (2026-06-07)

### 新機能
- **index.html** ポータルに貢献ダッシュボード追加
  - 部署→エリア→事業所の階層折りたたみ表示
  - 月ナビゲーション（前後月移動）
  - 各事業所にペースライン付きグラデーションバー（緑=実績・橙=遅れ・青=順調）
  - 部署・エリア単位の集計バー
  - ロール別初期開閉状態：admin/area_manager=全開、support=発達支援のみ開、その他=所属エリアのみ開

---

## v1.4.0 (2026-06-07)

### 新機能
- **morning-report.html** 週次報告を全面リニューアル
  - 週単位を木〜水から**日〜土**に変更
  - 報告週の直前5週を一覧表示（定員合計・予定合計・実績合計・平均・達成率）
  - 週ラベルを「M/D-M/D」の日付範囲表記に統一（月またぎの第N週問題を解消）
  - 各事業所カードにペースライン付き月次進捗バーを追加
  - 報告週が月をまたぐ場合は2ヶ月分のバーを並列表示
  - 週目標入力欄のプレースホルダーを「この週の目標を入力…」に変更

---

## v1.3.0 (2026-06-07)

### 新機能
- **daily.html** 入力フォームをカード2枚構成に分離
  - Card1：入力フォーム＋送信ボタン
  - Card2：進捗バー・週次予定・入力履歴
  - 未保存インジケーター「● 未保存」を追加（通常/ラフォーレ両対応）
- ペースライン付きグラデーションバーを全画面に適用
  - 緑=実績、橙=ペース未達ギャップ、青=ペース超過サープラス
  - ペース差分テキスト（+N名 順調 / N名遅れ）表示
  - 青色を `#1976D2` → `#2196F3`（より鮮やかなMaterial Blue 500）に変更

### 改善
- **functions/index.js** Chatwork速報の文字ズレ・グラフズレを修正
  - 全角/半角混在の列ズレ：`padEnd`/`padStart` を視覚幅対応の `rpW`/`lpW` に置き換え
  - `makeBar` を常に10文字固定に修正（100%時の11文字ズレを解消）
  - 事業所名を2文字略称に統一（テーブル・グラフ両方）
    はぐ/井口/八木/川内/ここ/にじ/はれ/まな/高屋/黒瀬/ぐら/高陽/亀山/白木
  - ラフォーレ系はサービス略称を末尾付加（例：高陽生・高陽就）

---

## v1.2.0 (2026-06-06) — 速報・朝礼・設定の大規模改修

### 新機能
- **morning-report.html** 朝礼報告（週次）画面を新規作成
  - マネジャー向け週次まとめレポート（週次集計・目標設定・保存・一覧）
  - 初版作成後に集計ロジック・UI改善を追加反映
- **import_r8_5.html** R8.5（令和8年5月）速報データ一括取込ツールを新規作成
  - 既存データのFirestore移行・再取込対応
- **index.html** 「朝礼報告（週次）」メニューカードを追加
  - 事業所管理者（manager）ロールは非表示

### 改善
- **daily.html** 速報入力画面を複数改善
  - 定員（CAPACITY）をハードコードからFirestore（offices + prices）の動的取得に変更
  - 日付選択に前後ナビゲーションボタン（‹ ›）を追加
  - 入力履歴テーブルに予定人数・問合数・見学数・契約数・コメント列を追加
  - 予定人数の表示ロジックを改善：`dailyPlanned` コレクションを優先参照
  - ラフォーレの実績・予定人数取得をservicesオブジェクト対応に修正
  - `area_manager` ロールも自動事業所選択に対応
  - `officeId`（Firestore ID）→ 事業所名の解決を `OFFICE_ID_TO_NAME` マップで実装
  - manager自動選択時は「戻る」ボタンを非表示
- **settings.html** 事業所設定に「担当マネジャー」列を追加
  - `unit_manager`/`area_manager` ユーザーをセレクトボックスで表示・設定
  - `managerUid` フィールドをFirestoreに保存
  - テーブル最小幅を960pxに拡大

---

## v1.1.1 (2026-06-01)

### 新機能
- **export-users.html** ユーザー一覧CSVエクスポート画面を新規作成

### 修正
- **report.html** 貢献人数/定員の集計計算を修正
  - `aPdef` を `aPpl[i]/tpm[i]` で正確に算出

---

## v1.1.0 (2026-05-23)

### 新機能
- **salary.html** 賃金台帳PDF取込ページを新規作成
  - TKC PX4 支給控除一覧表（正社員・パート）対応
  - 集計ページから部課コード・総支給・人数を自動解析
  - Firestore `salaries/{YYYYMM}_{deptCode}` に保存
  - デザインをimport.htmlと統一

### 改善
- **report.html** 給与データをsalariesコレクションから自動取得
  - 正社員・パート給与額の手動入力欄を廃止
  - `loadSalaryData()` 関数を追加
  - エリア集計もsalaries優先に対応
  - ナビに「給与取込」リンクを追加
- **settings.html** 事業所登録に「部課コード」入力欄を追加

### Firestoreルール
- `salaries` コレクションを追加（read: isAuth, write: isSupport）

---

## v1.0.0 (2026-05-23)

初回リリース。基本機能一式。

### 画面一覧
| ファイル | 画面名 | 主な機能 |
|---|---|---|
| login.html | ログイン | Firebase Authentication |
| index.html | ポータル | メニュー・お知らせ |
| daily.html | 速報入力 | 日次貢献人数入力 |
| monthly.html | 貢献速報（月次） | 月次カレンダー表示 |
| report.html | 貢献実績表 | 年度別・事業所・エリア集計 |
| import.html | CSV取込 | 国保連CSV取込・Firestore保存 |
| invoice.html | 報酬内容明細 | 提供月別・事業所別明細表示 |
| settings.html | 設定 | 各種マスタ・ユーザー管理 |

### Firestoreコレクション構成
| コレクション | 用途 |
|---|---|
| users | ユーザー情報・ロール |
| offices | 事業所マスタ |
| prices | 単価マスタ |
| areas | エリアマスタ |
| departments | 部署マスタ |
| serviceTypes | サービス種別マスタ |
| serviceCodes | サービスコードマスタ |
| workdays | 稼働日設定 |
| reports | 速報入力データ |
| actuals | CSV取込実績データ |
| notices | お知らせ |
