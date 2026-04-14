# 歯科システム セキュリティ実装完了報告 (Walkthrough)

ご依頼いただいた4つのセキュリティ機能（RBAC導入、データ暗号化、監査ログ、脆弱性修正）の実装が完了しました。それぞれどのような目的で、どのようにコードを修正したのかを解説します。

---

## 1. ロールベースアクセス制御（RBAC）の導入

**目的:** 「管理者（院長）」「歯科医師」「受付スタッフ」の権限を区分し、受付スタッフが治療詳細（カルテ画面）へアクセスできないように制限すること。

**変更点:**
ヘッダーに権限切り替え用のUIを追加し、現在選択されているロール（`currentUser.role`）が `staff` の場合、特定の画面への遷移をブロックしてトースト通知で警告する「ミドルウェア（ガード）」を実装しました。

**【修正前（BEFORE）】** `app.js`
制限が一切なく、誰でもすべての画面に遷移可能でした。
```javascript
navLinks.forEach(link => {
    link.addEventListener('click', () => {
        // 全てのクラスをリセットして単純に遷移を実行
        navLinks.forEach(l => l.classList.remove('active'));
        views.forEach(v => v.classList.remove('active'));
        link.classList.add('active');
        const targetId = link.getAttribute('data-target');
        document.getElementById(targetId).classList.add('active');
```

**【修正後（AFTER）】** `app.js`
遷移先の `data-target` をチェックし、権限不足なら `return` して処理を中断するガードロジックを追加しました。
```javascript
navLinks.forEach(link => {
    link.addEventListener('click', () => {
        const targetId = link.getAttribute('data-target');

        // --- RBAC Middleware Guard ---
        // 受付スタッフがカルテ画面へアクセスしようとしたらブロック
        if (targetId === 'soap-view' && currentUser.role === 'staff') {
            showToast('アクセス拒否: カルテ管理は管理者または医師のみアクセス可能です。', 'danger');
            return; // 遷移処理を中断
        }

        navLinks.forEach(l => l.classList.remove('active'));
// ...以下省略
```

---

## 2. 患者データの暗号化（データベース層）

**目的:** アプリケーション層で重要情報（名前、電話番号など）を暗号化（AES-256）して保持し、メモリダンプやDB流出に備えること。

**変更点:**
`CryptoJS` ライブラリを導入し、`data.js` 内でモックのシークレットキーを使ってデータを暗号化・復号化するモジュールを作成しました。さらに、JS上でプロパティにアクセスした際（`p.name` 等）は自動で複合化を行う `Getter/Setter` を用意し、UI側のコードを壊さずに実装しました。

**【修正前（BEFORE）】** `data.js`
全ての情報が平文（そのまま読めるテキスト）でメモリ・モックデータベース上に保持されていました。
```javascript
const patients = [
    { id: "P001", name: "山田 太郎", kana: "ヤマダ タロウ", phone: "090-1234-5678", dob: "1980-05-15" /* 他省略 */ }
];
window.DentalData = { patients, soapRecords, relations };
```

**【修正後（AFTER）】** `data.js`
初期データを読み込んだ直後、暗号化フィールド `_encrypted_XXX` へデータを退避し、平文フィールドを削除します。
```javascript
const ENV_SECRET_KEY = "super_secret_dental_key_2026"; 
const CryptoDB = { encrypt: (text) => {/* AES暗号化 */}, decrypt: (cipher) => {/* AES復号化 */} };

const rawData = generateData();

rawData.patients.forEach(p => {
    // 平文のデータを暗号化してアンダースコア付きフィールドに保存
    p._encrypted_name = CryptoDB.encrypt(p.name);
    // 元の平文データを消去
    delete p.name;
    
    // UI層が p.name にアクセスしたときだけ、動的に復号化して返す
    Object.defineProperty(p, 'name', { 
        get: function() { return CryptoDB.decrypt(this._encrypted_name); } 
    });
});
```

---

## 3. 操作ログ（オーディットログ）の実装

**目的:** 「いつ・誰が・何をしたか」を追跡可能にすること。

**変更点:**
ログ用配列と、それを記録する `window.Audit.log()` という共通関数を作成。データが作成・更新された際に自動的に呼び出される「フック」を入れ込みました。

**【修正前（BEFORE）】** `app.js`
新規患者やカルテの登録が行われても、配列にPushされるだけで追跡不可能な状態でした。
```javascript
// カルテ保存処理
soapRecords.push(newRecord);
soapForm.reset();
```

**【修正後（AFTER）】** `app.js`
配列へデータが追加された後、Auditログ生成関数を呼び出して「誰が（`currentUser.id`）、何を」実行したかを記録します。（コンソールにて確認可能）
```javascript
// カルテ保存処理
soapRecords.push(newRecord);

// 監査ログに記録（CREATEアクション）
if (window.Audit) {
    window.Audit.log(currentUser.id, "CREATE", "soapRecords", newRecordId, { new_data: newRecord });
}

soapForm.reset();
```

---

## 4. セキュリティ脆弱性スキャンと修正（XSS対策）

**目的:** OWASP Top 10のXSS（クロスサイトスクリプティング）等に該当するリスクを排除すること。

**変更点:**
ユーザー入力をそのままDOM上に構築する `innerHTML` 処理を見つけ出し、無害化（サニタイズ・エスケープ）するヘルパー関数 `escapeHTML` を噛ませてからレンダリングするように変更しました。

**【修正前（BEFORE）】** `app.js`
ユーザーからの入力である `p.name` などを直接テンプレート文字列で埋め込んでおり、入力値に `<script>` などのタグが含まれるとJavaScriptが意図せず実行される脆弱性がありました。
```javascript
card.innerHTML = `
    <div class="patient-header">
        <div class="patient-name-wrapper">
            <h3>${p.name}</h3>
            <span>${p.kana}</span>
        </div>
// ...
`;
```

**【修正後（AFTER）】** `app.js`
`escapeHTML` 関数を作成し、HTMLの特殊な記号（`<` や `>` など）を安全な文字列表現（`&lt;`, `&gt;`）に変換した上で埋め込むように修正しました。
```javascript
const escapeHTML = (str) => {
    if (!str) return "";
    return str.toString().replace(/[&<>'"]/g, tag => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
    }[tag] || tag));
};

// ...
card.innerHTML = `
    <div class="patient-header">
        <div class="patient-name-wrapper">
            <h3>${escapeHTML(p.name)}</h3>
            <span>${escapeHTML(p.kana)}</span>
        </div>
// ...
`;
```

---

## 5. ログイン画面と本格的な認証・アクセス制御

**目的:** アプリケーション起動時にパスワードとIDを必須とし、不正な画面へのアクセスを根本から遮断すること。

**変更点:**
従来のヘッダーにあるセレクタ（モック）をログアウトボタン機能に置き換え、全画面を覆うログインフォーム (`#login-screen`) を `index.html` に組み込みました。また `app.js` 側にて検証を行い、成功時のみメイン画面の `display: none` を解除してレンダーするフローへとアーキテクチャを堅牢化しました。

---

## 6. 患者タグ・ステータス更新機能の柔軟化

**目的:** 「インプラント検討中」などの重要な患者属性（タグ情報）やステータスを、受付での初回登録時だけでなく、カルテを記載する瞬間にもダイナミックに更新できるようにすること。

**変更点:**
カルテ作成フォーム（`#soap-form`）の内部にステータス（プルダウン）とタグ（テキスト）をそれぞれ入力・変更できる項目を配置しました。保存時には記録されたカルテ自身の属性として履歴（バッジ）に残ると同時に、患者固有のオブジェクト情報にも同期され、その瞬間から全ての顧客管理（CRM）カードに最新情報として即時反映される仕組みを構築しました。

---

## 7. ユーザー登録・編集機能（システム管理）

**目的:** システムの管理権限を持つ院長（`admin`）のみが自律的に、従業員のログイン可能アカウントを一元管理できるポータルを提供すること。

**変更点:**
対象権限のユーザーのみが表示・アクセスできる新しい「システム管理」ビュー (`#admin-view`) を実装。この中から、新しいスタッフのアカウントID、名前、パスワード、権限（ロール）を選び新規追加できるほか、もし既存のアカウントIDを入力した場合には対象ユーザーのパスワードや権限（ロール）を安全に「上書き・更新」できるロジックを実装しました。

---

これですべてのセキュリティ・管理設定が組み込まれました。`test-userpass.md` を活用し、実際のシステム運用のごとく動作や使用感をお試しください。

## [2026-04-15 01:58] タスク: カルテ機能と紹介ネットワークの連携強化
- **使用ブランチ**: `task/update-karte-fields`
- **思考プロセス**: 患者カルテ自体により詳細なデモグラフィック・次回予約情報を登録することでCRMの価値を高めるため。また紹介グラフの利便性向上のため、ノードクリックで直接SOAPへ連携・遷移するアーキテクチャを追加した。
- **実行コマンド**: `git commit -m "feat: カルテ機能と紹介ネットワークの連携強化 - ユーザー承認済み内容を反映"`
- **差分要約**: 
  - `index.html`: 新患登録フォームに生年月日、性別、紹介元、次回来院予定の要素を追加。
  - `app.js`: フォームから属性を取得し `patients` 及び `relations` へ保存。グラフ受信用にグローバル関数 `jumpToPatientChart` を宣言。
  - `graph.js`: ノードとラベルへのクリックリスナー追加と遷移関数の呼び出し。
- **次回の課題**: 既存患者の細かな情報（生年月日や紹介元など）を後から編集できる機能の追加を検討。
---

## [2026-04-15 02:15] タスク: ログインできないバグの修正
- **使用ブランチ**: `task/fix-login`
- **思考プロセス**: 前回のタスクで js と css の実体が `src/` 配下へ移動されたにもかかわらず、`index.html` 側の `<script>` 等のパス指定が古いままだったため404エラーとなりログイン処理が動かなかった。パスを修正することでロジックを復旧した。
- **実行コマンド**: `git commit -m "feat: ログインできないバグの修正 - ユーザー承認済み内容を反映"`
- **差分要約**: 
  - `index.html`: `js/` および `css/` へのパス指定を `src/js/` および `src/css/` へ修正。
- **次回の課題**: 今後ディレクトリ構造を変更する際は、関連ファイルのパスの一元検索・置換を徹底する。
---

## [2026-04-15 02:35] タスク: カルテ機能の変更点欠落の再実装
- **使用ブランチ**: `task/fix-karte-fields-error`
- **思考プロセス**: 前回の操作ミスにより失われた「新患カルテ詳細情報」および「グラフ連動ジャンプ」の本来あるべきソースコードを復旧・再結合した。
- **実行コマンド**: `git commit -m "feat: カルテ追加項目と連携ジャンプの再実装 - ユーザー承認済み内容を反映"`
- **差分要約**: 
  - `index.html`, `src/js/app.js`, `src/js/graph.js` に対し、欠落していた `np-dob`等のUIから `jumpToPatientChart` までのロジックを正確に再適用した。
- **次回の課題**: ブランチ切り替え前の作業状況確認と、差分の視覚的確認を徹底する。
---

## [2026-04-15 02:51] タスク: 新規患者登録画面の表示領域の修正
- **使用ブランチ**: `task/fix-modal-overflow`
- **思考プロセス**: フォーム項目の増加によってモーダルの表示領域が縦長になり、PCの画面解像度によっては「登録する」等の下部ボタン類が見えなくなって操作不能に陥っていたため。
- **実行コマンド**: `git commit -am "feat: 新規患者登録画面の表示領域の修正 - ユーザー承認済み内容を反映"`
- **差分要約**: 
  - `src/css/style.css`: `.modal-content` に対して `max-height: 90vh` および `overflow-y: auto` を付与し、はみ出た場合は内部でスクロールできるように制限。
- **次回の課題**: 要素を追加してフォームが長大化する際は、縦方向のレスポンシブ性やオーバーフローについて自発的に検知してスクロール対応を講じる。
---
