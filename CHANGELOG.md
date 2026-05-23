# CHANGELOG - ベルアージュ業務支援システム

バージョン管理方針：
- **メジャー** : 既存機能の破壊的変更・大規模リニューアル
- **マイナー** : 新機能追加
- **パッチ**   : バグ修正・UI微調整

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
