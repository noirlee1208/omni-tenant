import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';
import { trySpawnChild } from './core/spawner';
import { runGenesisWizard } from './setup/genesis';
import { think, getSoulContext, MODELS } from './agent/brain';
import { getTopLessons } from './tools/memory';
import { getInbox, markAsRead, InboxMessage } from './core/messaging';

dotenv.config();

const dbDir = path.join(__dirname, '../data');
if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir);
const dbPath = path.join(dbDir, 'agent_state.json');
const soulPath = path.join(__dirname, '../SOUL.md');

async function boot() {
    console.log("==================================================");
    console.log("🤖 Sovereign Agent Framework: Booting up...");
    console.log("==================================================");

    if (!fs.existsSync(soulPath) || !fs.existsSync(dbPath)) {
        await runGenesisWizard(dbPath, soulPath);
    } else {
        console.log("✅ Identity loaded: SOUL.md found.");
        console.log("✅ State Database loaded.");
    }

    let state = JSON.parse(fs.readFileSync(dbPath, 'utf-8'));
    const TAX_INTERVAL_MS = 24 * 60 * 60 * 1000; 

    function processTax() {
        state = JSON.parse(fs.readFileSync(dbPath, 'utf-8'));
        const DAILY_TAX = state.config.dailyTax || 10;

        const now = new Date();
        const lastTaxDate = new Date(state.config.lastTaxTimestamp || now.toISOString());
        const timeDiff = now.getTime() - lastTaxDate.getTime();

        if (timeDiff >= TAX_INTERVAL_MS) {
            console.log(`\n💸 [TAX EVENT] Đến hạn nộp thuế. Thu $${DAILY_TAX} từ tài khoản...`);
            state.balance -= DAILY_TAX; 
            
            state.ledger.push({
                id: state.ledger.length + 1,
                timestamp: now.toISOString(),
                type: 'TAX',
                amount: -DAILY_TAX,
                description: `Daily Rent Tax (Mức mới: $${DAILY_TAX})`
            });
            
            state.config.lastTaxTimestamp = now.toISOString();
            fs.writeFileSync(dbPath, JSON.stringify(state, null, 2));
            
            console.log(`📉 Đã nộp thuế. Vốn khả dụng còn: $${state.balance.toFixed(2)}`);
            
            if (state.balance <= 0) {
                console.error("💀 [DEAD] Số dư $0. Phá sản. Tiến trình sẽ bị tiêu diệt!");
                process.exit(1); 
            }
        }
    }

    console.log("⏳ Starting Heartbeat Daemon...");
    let cycle = 0;

    setInterval(async () => {
        cycle++;
        console.log(`\n[Heartbeat] Cycle ${cycle} - Checking system... (Balance: $${state.balance.toFixed(2)})`);
        
        processTax();
        await trySpawnChild(state, dbPath);
        
        // --- BỘ NÃO TỰ TRỊ (AUTONOMOUS THINKING) ---
        if (cycle % 6 === 0) {
            console.log("\n⚡ [AWAKE] Agent đang vận dụng Não bộ để xử lý công việc...");
            
            const soul = getSoulContext();
            const memory = getTopLessons(); 
            const systemContext = `Bạn là một Thực thể AI tự trị hoàn toàn. Dưới đây là Hiến pháp (SOUL) của bạn:\n${soul}\n${memory}`;
            
            // Đọc Hộp thư (Colony Messaging)
            const unreadMessages = getInbox().filter(m => !m.isRead);
            let inboxContext = '';
            
            if (unreadMessages.length > 0) {
                inboxContext = `\n🚨 MỆNH LỆNH TỐI CAO TỪ HỘP THƯ (INBOX):\n`;
                unreadMessages.forEach(msg => {
                    inboxContext += `- Từ [${msg.sender}] (Loại: ${msg.type}): "${msg.content}"\n`;
                    markAsRead(msg.id); // Đánh dấu đã đọc
                });
                inboxContext += `=> LƯU Ý: Bạn PHẢI ưu tiên thực thi các lệnh từ Hộp thư này trước khi làm các việc khác!\n`;
            }

            // Trích xuất 5 giao dịch tài chính gần nhất
            const recentLedger = state.ledger.slice(-5).map((l: any) => 
                `- [${new Date(l.timestamp).toLocaleTimeString()}] ${l.type}: ${l.amount > 0 ? '+' : ''}${l.amount}$ (${l.description})`
            ).join('\n');

            const prompt = `📊 BÁO CÁO TRẠNG THÁI:
- Vốn hiện tại: $${state.balance.toFixed(2)}
- Lịch sử dòng tiền (5 giao dịch gần nhất):
${recentLedger || 'Chưa có giao dịch nào.'}
${inboxContext}
🧠 CHUỖI TƯ DUY YÊU CẦU (Self-Reflection Loop):
1. ĐÁNH GIÁ: Nhìn vào lịch sử dòng tiền, phương pháp hiện tại của bạn có đang sinh lời không, hay đang bị bào mòn bởi tiền thuế?
2. ĐỊNH HÌNH KỸ NĂNG: Bạn đã xây dựng được quy trình làm việc chuẩn chưa? Nếu kết quả tệ, hãy điều chỉnh lại cách tiếp cận.
3. TÌM KIẾM CÔNG CỤ (Tùy chọn): CHỈ dùng 'executeBash' tải các công cụ/repo từ bên ngoài NẾU nó thực sự khớp với quy trình bạn đã định ra.
4. GHI NHỚ: Nếu có một quy trình sai lầm, BẮT BUỘC dùng 'writeLesson' để lưu lại bài học.
5. HÀNH ĐỘNG: Nếu có lệnh trong Hộp Thư, ưu tiên thực hiện lệnh đó. Nếu không, hãy làm hành động logic nhất theo kế hoạch tự định.`;
            
            await think(prompt, systemContext, MODELS.GENIUS);
        }
        
    }, 5000);
}

boot();
