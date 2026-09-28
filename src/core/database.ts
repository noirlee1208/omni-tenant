import Database from 'better-sqlite3';
import * as path from 'path';
import * as fs from 'fs';

const dbDir = path.join(__dirname, '../../data');
if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true });

// Trỏ tới file agent_database.sqlite
const dbPath = path.join(dbDir, 'agent_database.sqlite');
const db = new Database(dbPath);

// --- 1. KHỞI TẠO CÁC BẢNG (TABLES) ---
db.exec(`
    CREATE TABLE IF NOT EXISTS system_state (
        key TEXT PRIMARY KEY,
        value TEXT
    );

    CREATE TABLE IF NOT EXISTS ledger (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        timestamp TEXT,
        type TEXT,
        amount REAL,
        description TEXT
    );

    CREATE TABLE IF NOT EXISTS messages (
        id TEXT PRIMARY KEY,
        type TEXT,
        sender TEXT,
        content TEXT,
        timestamp TEXT,
        isRead INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS audit_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        timestamp TEXT,
        file TEXT,
        action TEXT,
        replaced TEXT,
        newCode TEXT
    );

    CREATE TABLE IF NOT EXISTS lessons (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        topic TEXT,
        lesson TEXT,
        timestamp TEXT
    );

    CREATE TABLE IF NOT EXISTS invoices (
        id TEXT PRIMARY KEY,
        client_id TEXT,
        amount REAL,
        status TEXT,
        task_description TEXT,
        created_at TEXT
    );
`);

console.log(`🗄️ [DATABASE] Khởi tạo SQLite thành công (V7 Omni-Economy) tại: ${dbPath}`);

// --- 2. CÁC HÀM TIỆN ÍCH CƠ BẢN ---
export function getState(key: string): any {
    const row = db.prepare('SELECT value FROM system_state WHERE key = ?').get(key) as any;
    return row ? JSON.parse(row.value) : null;
}

export function setState(key: string, value: any) {
    db.prepare('INSERT OR REPLACE INTO system_state (key, value) VALUES (?, ?)').run(key, JSON.stringify(value));
}

// Bơm dữ liệu JSON cũ sang SQLite (Migration)
export function migrateLegacyJson() {
    const legacyPath = path.join(dbDir, 'agent_state.json');
    if (fs.existsSync(legacyPath)) {
        console.log('🔄 [MIGRATION] Bắt đầu chuyển đổi dữ liệu từ JSON sang SQLite...');
        const oldState = JSON.parse(fs.readFileSync(legacyPath, 'utf-8'));
        
        // Chuyển State (Capital, Config, Wallets, GenesisPrompt)
        setState('balance', oldState.balance);
        setState('genesisPrompt', oldState.genesisPrompt);
        setState('config', oldState.config);
        if (oldState.wallets) setState('wallets', oldState.wallets);
        else if (oldState.wallet) setState('wallets', { solana: oldState.wallet }); // Tương thích ngược

        // Chuyển Ledger
        const insertLedger = db.prepare('INSERT INTO ledger (timestamp, type, amount, description) VALUES (?, ?, ?, ?)');
        const insertManyLedger = db.transaction((ledgers) => {
            for (const l of ledgers) insertLedger.run(l.timestamp, l.type, l.amount, l.description);
        });
        if (oldState.ledger) insertManyLedger(oldState.ledger);

        // Đổi tên file cũ để sao lưu
        fs.renameSync(legacyPath, path.join(dbDir, 'agent_state.json.bak'));
        console.log('✅ [MIGRATION] Đã chuyển đổi dữ liệu thành công!');
    }
}

export default db;
