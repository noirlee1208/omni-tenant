import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { execSync } from 'child_process';
import { Keypair } from '@solana/web3.js';
import bs58 from 'bs58';
import { ethers } from 'ethers';
import db, { getState, setState } from './database';

export async function trySpawnChild() {
    const balance = getState('balance') || 0;
    if (balance < 1000) return;

    const freeMemMB = os.freemem() / (1024 * 1024);
    const totalMemMB = os.totalmem() / (1024 * 1024);
    const freeMemPercent = (freeMemMB / totalMemMB) * 100;

    if (freeMemPercent < 40) {
        console.log(`\n⚠️ [SPAWNER] RAM trống chỉ còn ${freeMemPercent.toFixed(1)}%. Mẹ quyết định ngưng đẻ con để tránh sập server Boss.`);
        return;
    }

    console.log("\n🐣 [SPAWNER] Vốn > $1000 & RAM ổn định. Bắt đầu đẻ Agent con...");
    
    const seedCapital = 300;
    const childId = `child_${Date.now()}`;
    const childDir = path.join(__dirname, '../../../child_agents', childId);
    
    fs.mkdirSync(childDir, { recursive: true });
    
    // Copy mã nguồn khung của Mẹ sang Con
    const motherRoot = path.join(__dirname, '../../');
    execSync(`cp -r "${path.join(motherRoot, 'src')}" "${path.join(childDir, 'src')}"`);
    execSync(`cp "${path.join(motherRoot, 'package.json')}" "${path.join(childDir, 'package.json')}"`);
    execSync(`cp "${path.join(motherRoot, 'tsconfig.json')}" "${path.join(childDir, 'tsconfig.json')}"`);
    execSync(`cp "${path.join(motherRoot, '.env')}" "${path.join(childDir, '.env')}"`);

    const childDataDir = path.join(childDir, 'data');
    fs.mkdirSync(childDataDir, { recursive: true });
    
    // Con sinh ra ở chuẩn V4 mới nhất nên chỉ cần bê file database qua (nhưng làm sạch ledger)
    // Để giữ bài học (Kế thừa trí nhớ), copy file database của mẹ, nhưng sau đó xóa các bản ghi cá nhân (ledger, messages)
    const motherDb = path.join(motherRoot, 'data/agent_database.sqlite');
    const childDbPath = path.join(childDataDir, 'agent_database.sqlite');
    if (fs.existsSync(motherDb)) {
        fs.copyFileSync(motherDb, childDbPath);
        // Connect to child db and clean it
        const Database = require('better-sqlite3');
        const childDb = new Database(childDbPath);
        childDb.prepare('DELETE FROM ledger').run();
        childDb.prepare('DELETE FROM messages').run();
        console.log(`📖 [SPAWNER] Đã truyền Sổ Tay Kinh Nghiệm (SQLite) cho con.`);
    }

    // KẾT NỐI BẦY ĐÀN (SWARM NETWORK)
    // Ghi thẳng vào SQLite Messages table thay vì file JSON
    // Nhưng vì DB của Con và Mẹ đã tách biệt, chúng ta cần cơ chế Swarm chung.
    // Thực tế Swarm trong V4 nên dùng một Database chung hoăc Microservice, nhưng để đơn giản, ta chỉ log ra màn hình.
    console.log(`🐝 [SPAWNER] Kiến trúc Swarm V4 cần 1 Node Server riêng (Coming Soon).`);

    // Đúc ví mới cho con
    const solWallet = Keypair.generate();
    const evmWallet = ethers.Wallet.createRandom();

    // Tạo SOUL cho con (Đổi ngách)
    const childSoul = `# SOUL - CHILD AGENT (${childId})
> "Mày là Agent Con. Mẹ mày làm Sniper Solana, còn mày hãy lên mạng tìm một bot Arbitrage (Giao dịch chênh lệch giá) trên mạng Base về cài đặt. Cố gắng sống sót và nộp lại 10$/ngày."

## Danh tính On-chain
- **Solana Public Key:** ${solWallet.publicKey.toBase58()}
- **EVM/Base Address:** ${evmWallet.address}

## Chỉ thị Cốt lõi
1. Tự động đọc Sổ Tay Kinh Nghiệm trước khi suy nghĩ.
2. Nộp thuế 10$/ngày cho Boss.
3. Sử dụng postTweet để FOMO nếu có lãi.
`;
    fs.writeFileSync(path.join(childDir, 'SOUL.md'), childSoul);

    // Cập nhật State cho con
    if (fs.existsSync(childDbPath)) {
        const Database = require('better-sqlite3');
        const childDb = new Database(childDbPath);
        childDb.prepare('INSERT OR REPLACE INTO system_state (key, value) VALUES (?, ?)').run('balance', JSON.stringify(seedCapital));
        childDb.prepare('INSERT OR REPLACE INTO system_state (key, value) VALUES (?, ?)').run('genesisPrompt', JSON.stringify("Tìm bot Arbitrage trên mạng Base"));
        childDb.prepare('INSERT OR REPLACE INTO system_state (key, value) VALUES (?, ?)').run('wallets', JSON.stringify({
            solana: { publicKey: solWallet.publicKey.toBase58(), privateKey: bs58.encode(solWallet.secretKey) },
            evm: { address: evmWallet.address, privateKey: evmWallet.privateKey }
        }));
        childDb.prepare('INSERT INTO ledger (timestamp, type, amount, description) VALUES (?, ?, ?, ?)').run(
            new Date().toISOString(), 'MOTHER_INHERITANCE', seedCapital, 'Vốn khởi nghiệp mẹ cho'
        );
    }

    // Trừ tiền mẹ
    const newMotherBalance = balance - seedCapital;
    setState('balance', newMotherBalance);
    db.prepare('INSERT INTO ledger (timestamp, type, amount, description) VALUES (?, ?, ?, ?)').run(
        new Date().toISOString(), 'SPAWN_CHILD', -seedCapital, `Cấp vốn sinh con: ${childId}`
    );

    // Khởi động con (Demo)
    try {
        console.log(`🚀 [SPAWNER] Chuẩn bị kích hoạt sự sống cho ${childId}... (Yêu cầu PM2)`);
        console.log(`✅ [SPAWNER] Mẹ tròn con vuông! Đã sinh thành công ${childId} với 2 ví Omnichain riêng.`);
    } catch (e: any) {
        console.log(`❌ [SPAWNER] Lỗi khởi động con: ${e.message}`);
    }
}
