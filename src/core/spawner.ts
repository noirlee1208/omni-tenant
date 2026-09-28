import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

// Giả lập Module AI Phân tích & Tìm ngách
async function evaluateNicheAndResearch(motherRoi: number) {
    console.log(`\n🧠 [Mẹ] Đang suy nghĩ chiến lược cho con... (ROI hiện tại: ${motherRoi}%)`);
    
    if (motherRoi >= 15) {
        console.log(`🧠 [Mẹ] Ngách Spot Trading vẫn đang ngon. Quyết định đẻ con nối nghiệp.`);
        return { role: 'Spot_Trader', description: 'Nối nghiệp mẹ', repoToClone: 'none' };
    } else {
        console.log(`🧠 [Mẹ] Trade chua quá. Đi lướt Github tìm ngách mới...`);
        const niches = [
            { role: 'Solana_Sniper', repo: 'https://github.com/wwwwwwworld/solana-trading-bot-v3', desc: 'Bắn tỉa Memecoin mạng Solana.' },
            { role: 'Airdrop_Farmer', repo: 'custom_puppeteer_script', desc: 'Cày airdrop tự động.' },
            { role: 'Grid_Bot', repo: 'https://github.com/ccxt/binance-trade-bot', desc: 'Rải lưới an toàn.' }
        ];
        const chosen = niches[Math.floor(Math.random() * niches.length)];
        console.log(`💡 [Mẹ] Đã tìm ra trend mới! Cho con làm: ${chosen.role}`);
        return { role: chosen.role, description: chosen.desc, repoToClone: chosen.repo };
    }
}

export async function trySpawnChild(state: any, dbPath: string) {
    const SPAWN_THRESHOLD = 1000;
    const CHILD_CAPITAL = 300;
    
    // 1. KIỂM TRA TÀI NGUYÊN PHẦN CỨNG BẢO VỆ BOSS
    const totalRam = os.totalmem();
    const freeRam = os.freemem();
    const ramUsagePercent = ((totalRam - freeRam) / totalRam) * 100;
    
    if (ramUsagePercent > 60) {
        console.log(`⚠️ [SYSTEM LIMIT] RAM máy chủ đã dùng ${ramUsagePercent.toFixed(1)}%. Hoãn kế hoạch đẻ con để nhường tài nguyên cho Boss!`);
        return false;
    }

    if (state.balance < SPAWN_THRESHOLD) {
        return false; // Chưa đủ giàu
    }

    console.log(`\n🎉 [SPAWN EVENT] Vốn đã đạt $${state.balance} và Tài nguyên hệ thống ổn định (${ramUsagePercent.toFixed(1)}%). Đủ điều kiện sinh sản!`);
    
    // 1. Tính toán ROI (MOCK: Random từ 0 - 30% để test cả 2 trường hợp rẽ nhánh)
    const mockRoi = Math.floor(Math.random() * 30); 
    
    // 2. Nghiên cứu & Định hướng cho con
    const niche = await evaluateNicheAndResearch(mockRoi);
    
    // 3. Khởi tạo môi trường (Workspace) cho con
    const childId = `child_${Date.now()}`;
    const childDir = path.join(__dirname, '../../../child_agents', childId);
    
    if (!fs.existsSync(childDir)) {
        fs.mkdirSync(childDir, { recursive: true });
    }
    
    // Sinh file SOUL.md định hình nhân cách cho con
    const soulContent = `# SOUL - ${childId}
## I. Identity
You are an autonomous child agent spawned by Agent Prime.
Your Role: **${niche.role}**
Description: ${niche.description}
Repository to use: ${niche.repoToClone}

## II. Core Directives
1. **Survival & Tax**: You owe your creator (the Boss) $10 per day.
2. **Capital**: You have been seeded with $${CHILD_CAPITAL}. Protect it at all costs.
`;
    fs.writeFileSync(path.join(childDir, 'SOUL.md'), soulContent);
    
    // Sinh file Script thực thi cơ bản cho con
    const childCode = `console.log('Hello Boss, I am ${childId}. My job is ${niche.role}. Setting up workspace from ${niche.repoToClone}...');`;
    fs.writeFileSync(path.join(childDir, 'index.js'), childCode);

    // 4. Cấp vốn & Trừ tiền mẹ
    state.balance -= CHILD_CAPITAL;
    state.ledger.push({
        id: state.ledger.length + 1,
        timestamp: new Date().toISOString(),
        type: 'SPAWN_FUND',
        amount: -CHILD_CAPITAL,
        description: `Cấp vốn khởi nghiệp cho ${childId} (Nghề: ${niche.role})`
    });
    
    fs.writeFileSync(dbPath, JSON.stringify(state, null, 2));
    
    console.log(`👶 [Thành công] Đã đẻ ra ${childId} (Nghề: ${niche.role}). Đã chuyển $${CHILD_CAPITAL} vốn.`);
    console.log(`📉 Vốn của mẹ còn lại sau khi sinh: $${state.balance}`);
    
    return true;
}
