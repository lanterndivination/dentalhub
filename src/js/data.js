// Mock Data Engine for Dental EMR Hub

const generateData = () => {
    // 1. Generate Patients
    const patients = [
        { id: "P001", name: "山田 太郎", kana: "ヤマダ タロウ", phone: "090-1234-5678", dob: "1980-05-15", lastVisit: "2024-03-10", status: "recall", tags: ["インプラント検討中", "ハブ患者"], introducedBy: null },
        { id: "P002", name: "山田 花子", kana: "ヤマダ ハナコ", phone: "090-2345-6789", dob: "1982-08-22", lastVisit: "2024-03-20", status: "recall", tags: ["家族紹介あり"], introducedBy: "P001" },
        { id: "P003", name: "鈴木 一郎", kana: "スズキ イチロウ", phone: "080-3456-7890", dob: "1975-11-03", lastVisit: "2024-04-05", status: "new", tags: ["歯医者嫌い"], introducedBy: "P001" },
        { id: "P004", name: "佐藤 次郎", kana: "サトウ ジロウ", phone: "070-4567-8901", dob: "1990-02-14", lastVisit: "2023-10-12", status: "drop", tags: ["親知らず抜歯希望"], introducedBy: "P002" },
        { id: "P005", name: "佐藤 美咲", kana: "サトウ ミサキ", phone: "080-5678-9012", dob: "1992-06-30", lastVisit: "2024-04-01", status: "new", tags: ["自費診療移行", "ホワイトニング希望"], introducedBy: "P004" },
        { id: "P006", name: "田中 健太", kana: "タナカ ケンタ", phone: "090-6789-0123", dob: "1988-09-09", lastVisit: "2024-02-15", status: "recall", tags: ["家族紹介あり"], introducedBy: null },
        { id: "P007", name: "田中 結衣", kana: "タナカ ユイ", phone: "090-7890-1234", dob: "1991-12-05", lastVisit: "2024-02-18", status: "recall", tags: ["小児歯科"], introducedBy: "P006" },
        { id: "P008", name: "伊藤 翔太", kana: "イトウ ショウタ", phone: "080-8901-2345", dob: "1995-04-20", lastVisit: "2024-03-25", status: "recall", tags: ["スポーツマウスガード"], introducedBy: "P001" },
        { id: "P009", name: "渡辺 真由", kana: "ワタナベ マユ", phone: "070-9012-3456", dob: "1985-07-07", lastVisit: "2023-12-10", status: "drop", tags: [], introducedBy: "P003" },
        { id: "P010", name: "小林 誠", kana: "コバヤシ マコト", phone: "090-0123-4567", dob: "1970-01-25", lastVisit: "2024-04-06", status: "new", tags: ["義歯修理"], introducedBy: "P001" },
        { id: "P011", name: "中村 さくら", kana: "ナカムラ サクラ", phone: "080-1122-3344", dob: "2000-03-03", lastVisit: "2024-01-15", status: "recall", tags: ["矯正相談"], introducedBy: "P007" },
        { id: "P012", name: "三浦 大知", kana: "ミウラ ダイチ", phone: "090-2233-4455", dob: "1983-10-10", lastVisit: "2024-04-07", status: "new", tags: [], introducedBy: "P005" }
    ];

    // 2. Generate SOAP Records
    const soapRecords = [
        { id: "S1001", patientId: "P001", date: "2024-03-10", teeth: "下顎右側第一大臼歯 (46)", s: "右下の奥歯が冷たいものにしみる。", o: "46遠心に初期う蝕あり。冷水痛(+)", a: "C2", p: "CR充填。次回は全体スケーリング。" },
        { id: "S1002", patientId: "P001", date: "2023-09-05", teeth: "全体", s: "定期検診希望", o: "プラーク付着軽度、BOP 15%", a: "G (歯肉炎)", p: "SC（スケーリング）、TBI（ブラッシング指導）。次回6ヶ月後リコール。" },
        { id: "S1003", patientId: "P003", date: "2024-04-05", teeth: "上顎左側中切歯 (21)", s: "前歯が欠けた", o: "21近心切端破折、露髄なし", a: "破折 (不完全)", p: "CR充填にて形態修復。" },
        { id: "S1004", patientId: "P005", date: "2024-04-01", teeth: "-", s: "ホワイトニングについて相談したい", o: "A3〜A3.5程度のシェード", a: "変色歯", p: "オフィスホワイトニングの説明。次回施術予定。" }
    ];

    // 3. Generate Relations (Network Hub logic)
    // Types: 'family' (blue), 'friend' (green)
    const relations = [
        { id: "R1", source: "P001", target: "P002", type: "family", date: "2018-05-10" },
        { id: "R2", source: "P001", target: "P003", type: "friend", date: "2023-11-20" },
        { id: "R3", source: "P002", target: "P004", type: "friend", date: "2023-10-01" },
        { id: "R4", source: "P004", target: "P005", type: "family", date: "2024-03-15" },
        { id: "R5", source: "P006", target: "P007", type: "family", date: "2022-01-10" },
        { id: "R6", source: "P001", target: "P008", type: "friend", date: "2024-01-05" },
        { id: "R7", source: "P003", target: "P009", type: "friend", date: "2023-12-05" },
        { id: "R8", source: "P001", target: "P010", type: "friend", date: "2024-04-02" },
        { id: "R9", source: "P007", target: "P011", type: "friend", date: "2023-12-25" },
        { id: "R10", source: "P005", target: "P012", type: "friend", date: "2024-04-01" },
    ];

    return { patients, soapRecords, relations };
};

// --- Encryption (AES-256) ---
// 設定ファイルや環境変数からキーを読み込む運用を想定 (シミュレーション)
const ENV_SECRET_KEY = "super_secret_dental_key_2026";

const CryptoDB = {
    encrypt: (text) => {
        if (!text) return text;
        return CryptoJS.AES.encrypt(text, ENV_SECRET_KEY).toString();
    },
    decrypt: (cipherText) => {
        if (!cipherText) return cipherText;
        try {
            const bytes = CryptoJS.AES.decrypt(cipherText, ENV_SECRET_KEY);
            const decrypted = bytes.toString(CryptoJS.enc.Utf8);
            return decrypted || cipherText; // 復号化失敗時は元のテキストを返す
        } catch (e) {
            return cipherText;
        }
    }
};

// --- Audit Log (監査ログ) ---
const auditLogs = [];
const Audit = {
    log: (userId, action, table, recordId, changes) => {
        const timestamp = new Date().toISOString();
        const entry = { id: `AL${auditLogs.length + 1}`, timestamp, userId, action, table, recordId, changes };
        auditLogs.push(entry);
        console.log(`[AUDIT LOG] ${timestamp} | User:${userId} | Action:${action} | Table:${table} | ID:${recordId}`, changes);
    },
    getLogs: () => auditLogs
};

// --- Initialize and Migrate Data ---
const rawData = generateData();

// テスト環境用の初期ユーザー情報
rawData.users = [
    { id: 'admin', pass: 'password123', name: '院長', role: 'admin' },
    { id: 'doctor1', pass: 'password123', name: '佐藤 医師', role: 'doctor' },
    { id: 'staff1', pass: 'password123', name: '鈴木 受付', role: 'staff' }
];

// マイグレーションスクリプト：テストデータの個人情報を暗号化フォーマットに移行
console.log("Starting Data Migration: Encrypting Patient Records...");
rawData.patients.forEach(p => {
    // name, kana, phone, dob を暗号化して別フィールドに保存
    p._encrypted_name = CryptoDB.encrypt(p.name);
    p._encrypted_kana = CryptoDB.encrypt(p.kana);
    p._encrypted_phone = CryptoDB.encrypt(p.phone);
    p._encrypted_dob = CryptoDB.encrypt(p.dob);

    // アプリケーション層（app.js）がそのままのコードで動くように、
    // Getter/Setterを通じて透過的に暗号化・復号化を行う（ORMの機能と同等）
    delete p.name;
    delete p.kana;
    delete p.phone;
    delete p.dob;

    Object.defineProperty(p, 'name', { get: function () { return CryptoDB.decrypt(this._encrypted_name); }, set: function (v) { this._encrypted_name = CryptoDB.encrypt(v); }, enumerable: true });
    Object.defineProperty(p, 'kana', { get: function () { return CryptoDB.decrypt(this._encrypted_kana); }, set: function (v) { this._encrypted_kana = CryptoDB.encrypt(v); }, enumerable: true });
    Object.defineProperty(p, 'phone', { get: function () { return CryptoDB.decrypt(this._encrypted_phone); }, set: function (v) { this._encrypted_phone = CryptoDB.encrypt(v); }, enumerable: true });
    Object.defineProperty(p, 'dob', { get: function () { return CryptoDB.decrypt(this._encrypted_dob); }, set: function (v) { this._encrypted_dob = CryptoDB.encrypt(v); }, enumerable: true });
});
console.log("Migration Complete.");

// Expose globally
window.DentalData = rawData;
window.Audit = Audit;
window.CryptoDB = CryptoDB;
