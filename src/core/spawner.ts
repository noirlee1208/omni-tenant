import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { execSync } from 'child_process';
import { Keypair } from '@solana/web3.js';
import bs58 from 'bs58';
import { ethers } from 'ethers';

export async function trySpawnChild(state: any, dbPath: string) {
    if (state.balance < 1000) return;

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

    // KẾ THỪA TRÍ NHỚ (HỒI KÝ)
    const motherMemory = path.join(motherRoot, 'data/lessons.json');
    const childDataDir = path.join(childDir, 'data');
    fs.mkdirSync(childDataDir, { recursive: true });
    if (fs.existsSync(motherMemory)) {
        fs.copyFileSync(motherMemory, path.join(childDataDir, 'lessons.json'));
        console.log(`📖 [SPAWNER] Đã truyền Sổ Tay Kinh Nghiệm (lessons.json) cho con.`);
    }

    // KẾT NỐI BẦY ĐÀN (SWARM NETWORK)
    const swarmPath = path.join(motherRoot, 'data/swarm.json');
    const envAppend = `\nSWARM_PATH=${swarmPath}\nAGENT_ID=${childId}\n`;
    fs.appendFileSync(path.join(childDir, '.env'), envAppend);
    console.log(`🐝 [SPAWNER] Đã kết nối thần kinh bầy đàn cho ${childId}.`);

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

    // Tạo State cho con
    const childState = {
        genesisPrompt: "Tìm bot Arbitrage trên mạng Base",
        balance: seedCapital,
        wallets: { 
            solana: { publicKey: solWallet.publicKey.toBase58(), privateKey: bs58.encode(solWallet.secretKey) },
            evm: { address: evmWallet.address, privateKey: evmWallet.privateKey }
        },
        config: { lastTaxTimestamp: new Date().toISOString(), dailyTax: 10, monthlyRent: 300 },
        ledger: [{ id: 1, timestamp: new Date().toISOString(), type: 'MOTHER_INHERITANCE', amount: seedCapital, description: 'Vốn khởi nghiệp mẹ cho' }]
    };
    fs.writeFileSync(path.join(childDataDir, 'agent_state.json'), JSON.stringify(childState, null, 2));

    // Trừ tiền mẹ
    state.balance -= seedCapital;
    state.ledger.push({
        id: state.ledger.length + 1,
        timestamp: new Date().toISOString(),
        type: 'SPAWN_CHILD',
        amount: -seedCapital,
        description: `Cấp vốn sinh con: ${childId}`
    });
    fs.writeFileSync(dbPath, JSON.stringify(state, null, 2));

    // Khởi động con (Demo)
    try {
        console.log(`🚀 [SPAWNER] Chuẩn bị kích hoạt sự sống cho ${childId}... (Yêu cầu PM2)`);
        // Thực tế sẽ dùng: execSync(`cd "${childDir}" && npm install && npx pm2 start src/index.ts --name "${childId}"`);
        console.log(`✅ [SPAWNER] Mẹ tròn con vuông! Đã sinh thành công ${childId} với 2 ví Omnichain riêng.`);
    } catch (e: any) {
        console.log(`❌ [SPAWNER] Lỗi khởi động con: ${e.message}`);
    }
}
