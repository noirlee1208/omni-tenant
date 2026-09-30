const Database = require('better-sqlite3');
const path = require('path');
const os = require('os');
const crypto = require('crypto');
const fs = require('fs');

const oldJsonPath = path.join(os.homedir(), 'agent-workspace/crypto-tenant-agent/data/agent_state.json');
const newDbPath = path.join(os.homedir(), '.automaton/state.db');

try {
    const dir = path.dirname(newDbPath);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
    }

    const newDb = new Database(newDbPath);
    newDb.exec(`
      CREATE TABLE IF NOT EXISTS semantic_memory (
        id TEXT PRIMARY KEY,
        category TEXT NOT NULL CHECK(category IN ('self','environment','financial','agent','domain','procedural_ref','creator')),
        key TEXT NOT NULL,
        content TEXT NOT NULL,
        confidence REAL NOT NULL DEFAULT 1.0,
        metadata TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now')),
        UNIQUE(category, key)
      );
    `);
    
    let oldState = {};
    if (fs.existsSync(oldJsonPath)) {
        oldState = JSON.parse(fs.readFileSync(oldJsonPath, 'utf8'));
    }
    
    // Nếu trong state cũ có cấu trúc bài học, hoặc các nguyên tắc cốt lõi, ta có thể inject vào.
    // Vì JSON có thể rỗng hoặc chứa dữ liệu khác, ta sẽ mock 1 bài học mặc định nếu không có.
    const lessons = oldState.lessons || [];
    
    const insertStmt = newDb.prepare(`
        INSERT INTO semantic_memory (id, category, key, content, confidence, created_at, updated_at) 
        VALUES (?, 'domain', ?, ?, 0.9, ?, ?)
        ON CONFLICT(category, key) DO UPDATE SET content=excluded.content, updated_at=excluded.updated_at
    `);
    
    newDb.transaction(() => {
        for (const l of lessons) {
            insertStmt.run(
                crypto.randomUUID(),
                l.topic || 'Kinh nghiệm cũ',
                l.lesson || JSON.stringify(l),
                new Date().toISOString(),
                new Date().toISOString()
            );
        }
    })();
    
    console.log(`✅ [DATA MIGRATION] Đã chuyển giao thành công ${lessons.length} Ký ức sang não bộ Omni-Automaton.`);
    newDb.close();
} catch (e) {
    console.error('Lỗi chuyển giao dữ liệu:', e.message);
}
