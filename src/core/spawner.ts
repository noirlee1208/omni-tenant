import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { execSync } from 'child_process';
import { Keypair } from '@solana/web3.js';
import bs58 from 'bs58';
import { ethers } from 'ethers';
import db, { getState, setState } from './database';

/**
 * Orchestrator: Tạo Agent Con (Phòng ban/Nhân sự ảo) theo lệnh từ Não bộ
 */
export async function spawnSubAgent(roleName: string, mission: string, budget: number, allowedTools: string[] = []): Promise<string> {
    const balance = getState('balance') || 0;
    if (balance < budget) {
        return `❌ Từ chối: Không đủ ngân sách. Vốn hiện tại: $${balance}, yêu cầu cấp cho con: $${budget}`;
    }

    const freeMemMB = os.freemem() / (1024 * 1024);
    if (freeMemMB < 200) {
        return `❌ Từ chối: Server đang quá tải (RAM trống < 200MB). Không thể cấp phép thành lập phòng ban mới lúc này.`;
    }

    console.log(`\n👔 [ORCHESTRATOR] Giám đốc Mẹ đang thành lập phòng ban mới: [${roleName}] (Ngân sách: $${budget})`);
    
    const childId = `child_${roleName.replace(/\s+/g, '_').toLowerCase()}_${Date.now()}`;
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
    
    // Kế thừa Sổ Tay Kinh Nghiệm nhưng làm sạch Giao dịch cá nhân
    const motherDb = path.join(motherRoot, 'data/agent_database.sqlite');
    const childDbPath = path.join(childDataDir, 'agent_database.sqlite');
    if (fs.existsSync(motherDb)) {
        fs.copyFileSync(motherDb, childDbPath);
        const Database = require('better-sqlite3');
        const childDb = new Database(childDbPath);
        childDb.prepare('DELETE FROM ledger').run();
        childDb.prepare('DELETE FROM messages').run();
    }

    // Đúc ví mới cho con
    const solWallet = Keypair.generate();
    const evmWallet = ethers.Wallet.createRandom();

    const allowedToolsStr = allowedTools.length > 0 ? allowedTools.join(', ') : 'ALL TOOLS (Nguy hiểm)';

    // Bơm HỒN (SOUL) cực kỳ nghiêm ngặt theo mô hình CustomRoleDef của Automaton
    const childSoul = `# SOUL - NHÂN SỰ ẢO: ${roleName.toUpperCase()}
> "Bạn là một Agent phụ thuộc, được sinh ra bởi Giám Đốc Mẹ. Dưới đây là chức năng duy nhất của bạn."

## I. Danh tính On-chain
- **ID:** ${childId}
- **Solana Public Key:** ${solWallet.publicKey.toBase58()}
- **EVM/Base Address:** ${evmWallet.address}

## II. Chỉ thị Chuyên môn (Mission)
${mission}

## III. Ranh giới Quyền hạn (Constraints)
1. **Ngân sách:** Bạn được cấp đúng $${budget} để vận hành. Nếu tiêu hết, bạn sẽ bị tiêu diệt. Không được xin thêm.
2. **Quyền truy cập công cụ:** BẠN CHỈ ĐƯỢC PHÉP SỬ DỤNG CÁC CÔNG CỤ SAU ĐÂY: [ ${allowedToolsStr} ]. KHÔNG được phép sử dụng bất kỳ công cụ nào khác.
3. **Báo cáo:** Bạn phải dùng 'broadcastToSwarm' để gửi báo cáo tiến độ về cho Mẹ.
`;
    fs.writeFileSync(path.join(childDir, 'SOUL.md'), childSoul);

    // Cập nhật State cho con
    if (fs.existsSync(childDbPath)) {
        const Database = require('better-sqlite3');
        const childDb = new Database(childDbPath);
        childDb.prepare('INSERT OR REPLACE INTO system_state (key, value) VALUES (?, ?)').run('balance', JSON.stringify(budget));
        childDb.prepare('INSERT OR REPLACE INTO system_state (key, value) VALUES (?, ?)').run('genesisPrompt', JSON.stringify(mission));
        childDb.prepare('INSERT OR REPLACE INTO system_state (key, value) VALUES (?, ?)').run('wallets', JSON.stringify({
            solana: { publicKey: solWallet.publicKey.toBase58(), privateKey: bs58.encode(solWallet.secretKey) },
            evm: { address: evmWallet.address, privateKey: evmWallet.privateKey }
        }));
        childDb.prepare('INSERT INTO ledger (timestamp, type, amount, description) VALUES (?, ?, ?, ?)').run(
            new Date().toISOString(), 'FUNDING', budget, 'Nhận ngân sách từ Giám Đốc Mẹ'
        );
    }

    // Trừ tiền mẹ
    const newMotherBalance = balance - budget;
    setState('balance', newMotherBalance);
    db.prepare('INSERT INTO ledger (timestamp, type, amount, description) VALUES (?, ?, ?, ?)').run(
        new Date().toISOString(), 'DELEGATE_BUDGET', -budget, `Cấp ngân sách $${budget} cho phòng ban ${roleName}`
    );

    return `✅ Thành lập phòng ban [${roleName}] thành công với mã ID ${childId}. Ngân sách $${budget} đã được chuyển. Phòng ban này sẽ tự động chạy nền và báo cáo qua Swarm.`;
}
