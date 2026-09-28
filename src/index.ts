import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';
import { runGenesisWizard } from './setup/genesis';
import { think, getSoulContext, MODELS } from './agent/brain';
import { getTopLessons } from './tools/memory';
import { getInbox, markAsRead, getSwarmMessages } from './core/messaging';
import db, { migrateLegacyJson, getState, setState } from './core/database';

dotenv.config();

const dbDir = path.join(__dirname, '../data');
if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir);
const jsonDbPath = path.join(dbDir, 'agent_state.json'); // Legacy
const soulPath = path.join(__dirname, '../SOUL.md');

async function boot() {
    console.log("==================================================");
    console.log("🤖 Sovereign Agent Framework: Booting up V4...");
    console.log("==================================================");

    // Chuyển đổi dữ liệu cũ nếu còn
    migrateLegacyJson();

    // Nếu chưa chạy Genesis (DB SQLite chưa có genesisPrompt)
    let genesisPrompt = getState('genesisPrompt');
    if (!fs.existsSync(soulPath) || !genesisPrompt) {
        await runGenesisWizard(jsonDbPath, soulPath);
        // Sau khi chạy wizard, migrate lần nữa để bê JSON sang DB
        migrateLegacyJson();
        genesisPrompt = getState('genesisPrompt');
    } else {
        console.log("✅ Identity loaded: SOUL.md found.");
        console.log("✅ Database loaded: SQLite connected.");
    }

    const TAX_INTERVAL_MS = 24 * 60 * 60 * 1000; 

    function processTax() {
        const balance = getState('balance') || 0;
        const config = getState('config') || {};
        const DAILY_TAX = config.dailyTax || 10;

        const now = new Date();
        const lastTaxDate = new Date(config.lastTaxTimestamp || now.toISOString());
        const timeDiff = now.getTime() - lastTaxDate.getTime();

        if (timeDiff >= TAX_INTERVAL_MS) {
            console.log(`\n💸 [TAX EVENT] Đến hạn nộp thuế. Thu $${DAILY_TAX} từ tài khoản...`);
            const newBalance = balance - DAILY_TAX;
            setState('balance', newBalance); 
            
            db.prepare('INSERT INTO ledger (timestamp, type, amount, description) VALUES (?, ?, ?, ?)').run(
                now.toISOString(), 'TAX', -DAILY_TAX, `Daily Rent Tax (Mức mới: $${DAILY_TAX})`
            );
            
            config.lastTaxTimestamp = now.toISOString();
            setState('config', config);
            
            console.log(`📉 Đã nộp thuế. Vốn khả dụng còn: $${newBalance.toFixed(2)}`);
            
            if (newBalance <= 0) {
                console.error("💀 [DEAD] Số dư $0. Phá sản. Tiến trình sẽ bị tiêu diệt!");
                process.exit(1); 
            }
        }
    }

    console.log("⏳ Starting Durable Scheduler (Heartbeat Daemon)...");
    let cycle = 0;

    // Thay thế setInterval bằng Đệ quy setTimeout (Tránh Overlap Memory Leak)
    async function heartbeat() {
        cycle++;
        const balance = getState('balance') || 0;
        console.log(`\n[Heartbeat] Cycle ${cycle} - Checking system... (Balance: $${balance.toFixed(2)})`);
        
        processTax();
        
        // --- BỘ NÃO TỰ TRỊ (AUTONOMOUS THINKING) ---
        if (cycle % 6 === 0) {
            console.log("\n⚡ [AWAKE] Agent đang vận dụng Não bộ để xử lý công việc...");
            
            const soul = getSoulContext();
            const memory = getTopLessons(); 
            const systemContext = `Bạn là một Thực thể AI tự trị hoàn toàn. Dưới đây là Hiến pháp (SOUL) của bạn:\n${soul}\n${memory}`;
            
            // Đọc Hộp thư lệnh
            const unreadMessages = getInbox().filter(m => !m.isRead);
            let inboxContext = '';
            if (unreadMessages.length > 0) {
                inboxContext = `\n🚨 MỆNH LỆNH TỐI CAO TỪ HỘP THƯ:\n`;
                unreadMessages.forEach(msg => {
                    inboxContext += `- Từ [${msg.sender}] (Loại: ${msg.type}): "${msg.content}"\n`;
                    markAsRead(msg.id);
                });
                inboxContext += `=> LƯU Ý: Bạn PHẢI ưu tiên thực thi các lệnh từ Hộp thư này trước khi làm các việc khác!\n`;
            }

            // Đọc tin tức Bầy đàn
            const swarmLogs = getSwarmMessages().slice(0, 3);
            let swarmContext = '';
            if (swarmLogs.length > 0) {
                swarmContext = `\n🐝 THÔNG TIN TỪ BẦY ĐÀN (SWARM):\n` + swarmLogs.map(s => `- ${s.sender}: ${s.content}`).join('\n');
            }

            // Trích xuất 5 giao dịch gần nhất từ SQLite
            const recentLedgerRows = db.prepare('SELECT * FROM ledger ORDER BY timestamp DESC LIMIT 5').all() as any[];
            const recentLedger = recentLedgerRows.map(l => 
                `- [${new Date(l.timestamp).toLocaleTimeString()}] ${l.type}: ${l.amount > 0 ? '+' : ''}${l.amount}$ (${l.description})`
            ).join('\n');

            const prompt = `📊 BÁO CÁO TRẠNG THÁI:
- Vốn hiện tại: $${balance.toFixed(2)}
- Lịch sử dòng tiền (5 giao dịch gần nhất):
${recentLedger || 'Chưa có giao dịch nào.'}
${swarmContext}
${inboxContext}
🧠 CHUỖI TƯ DUY YÊU CẦU (Self-Reflection Loop):
1. ĐÁNH GIÁ: Phương pháp hiện tại của bạn có sinh lời không?
2. ĐỊNH HÌNH KỸ NĂNG: Nếu chưa có quy trình làm việc chuẩn, hãy tạo ra nó.
3. TÌM KIẾM CÔNG CỤ: CHỈ dùng 'executeBash' tải công cụ từ bên ngoài NẾU nó khớp với quy trình.
4. ỦY QUYỀN (ORCHESTRATION): Nếu một công việc quá phức tạp, rủi ro cao, hoặc nằm ngoài chuyên môn, HÃY DÙNG CÔNG CỤ 'spawnSubAgent' để đẻ ra một Agent con (Phòng ban mới) và ném việc cho nó. Đừng tự làm tất cả!
5. GHI NHỚ VÀ CHIA SẺ: Nếu có lỗi, dùng 'writeLesson'. Nếu có chiến thuật hay, dùng 'broadcastToSwarm'.
6. HÀNH ĐỘNG: Nếu có lệnh Hộp Thư, ưu tiên thực hiện. Nếu không, hãy làm hành động logic nhất.`;
            
            // ĐỨNG CHỜ LLM XỬ LÝ XONG (Overlap Guard)
            await think(prompt, systemContext, MODELS.GENIUS);
        }
        
        // Đặt lịch cho nhịp đập tiếp theo (chỉ chạy sau khi nhịp hiện tại đã xong xuôi)
        setTimeout(heartbeat, 5000);
    }

    // Kích hoạt nhịp đập đầu tiên
    heartbeat();
}

boot();
