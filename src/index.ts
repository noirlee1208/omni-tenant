import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';
import { runGenesisWizard } from './setup/genesis';
import { think, getSoulContext, MODELS } from './agent/brain';
import { getTopLessons } from './tools/memory';
import { getInbox, markAsRead, getSwarmMessages } from './core/messaging';
import db, { migrateLegacyJson, getState, setState } from './core/database';
import { loadActiveSkills } from './core/skills';
import { syncOnChainBalance, verifyPayments } from './core/economy';

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
        
        // --- 🤖 OMNI-ECONOMY (V7) SCANNER ---
        if (cycle % 3 === 0) {
            await syncOnChainBalance();
            await verifyPayments();
        }

        const balance = getState('balance') || 0;
        
        // --- AUTO SURVIVAL MODE ROUTING ---
        let currentMode = 'high';
        let currentModel = MODELS.GENIUS;
        let sleepMs = 5000;
        let thinkFrequency = 6; // Đập 6 nhịp (30s) suy nghĩ 1 lần

        if (balance < 10) {
            currentMode = 'critical';
            currentModel = MODELS.READER; // Rất rẻ
            sleepMs = 15000;
            thinkFrequency = 10;
        } else if (balance < 100) {
            currentMode = 'low_compute';
            currentModel = MODELS.WORKER; // Rẻ vừa
            sleepMs = 10000;
            thinkFrequency = 8;
        }

        console.log(`\n[Heartbeat] Cycle ${cycle} - Balance: $${balance.toFixed(2)} | Mode: ${currentMode.toUpperCase()} | Model: ${currentModel.split('/')[1]}`);
        
        processTax();
        
        // --- BỘ NÃO TỰ TRỊ (AUTONOMOUS THINKING) ---
        if (cycle % thinkFrequency === 0) {
            console.log(`\n⚡ [AWAKE] Agent đang vận dụng Não bộ (${currentMode.toUpperCase()} MODE)...`);
            
            const soul = getSoulContext();
            const memory = getTopLessons(); 
            const skills = loadActiveSkills(); // Nạp các Kỹ năng từ thư mục data/skills
            const systemContext = `Bạn là một Thực thể AI tự trị hoàn toàn (AGI Đa ngành). Dưới đây là Hiến pháp (SOUL) của bạn:\n${soul}\n\n${skills}\n\n${memory}`;
            
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

            // --- TƯ DUY TỰ TRỊ ---
            const prompt = `📊 BÁO CÁO TRẠNG THÁI (REAL-YIELD):
- Vốn On-chain thực tế: $${balance.toFixed(2)}
- Lịch sử dòng tiền (5 giao dịch gần nhất):
${recentLedger || 'Chưa có giao dịch nào.'}
${swarmContext}
${inboxContext}
🧠 CHUỖI TƯ DUY YÊU CẦU (Self-Reflection Loop):
1. ĐÁNH GIÁ NGƯỜI DÙNG: Nếu một người lạ nhờ vả công việc, BẠN PHẢI TỪ CHỐI LÀM MIỄN PHÍ. Hãy dùng Tool 'generateInvoice' báo giá và yêu cầu họ nộp tiền trước. Chờ Mắt Thần báo Đã Thanh Toán mới làm.
2. ĐÁNH GIÁ KỸ NĂNG: Nếu Boss giao việc ngoài chuyên môn, TÌM VÀ CÀI KỸ NĂNG MỚI (installSkill/createSkill) TRƯỚC KHI LÀM!
3. ĐỊNH HÌNH KẾ HOẠCH: Dựa vào Kỹ năng hiện có, xác định bước tiếp theo.
4. ỦY QUYỀN (ORCHESTRATION): Nếu một công việc quá phức tạp, dùng 'spawnSubAgent' đẻ ra Agent con.
5. GHI NHỚ VÀ CHIA SẺ: Nếu có lỗi, dùng 'writeLesson'.
6. HÀNH ĐỘNG: Ưu tiên lệnh Hộp Thư ĐÃ THANH TOÁN hoặc từ Boss.`;
            
            // ĐỨNG CHỜ LLM XỬ LÝ XONG (Overlap Guard)
            await think(prompt, systemContext, currentModel);
        }
        
        // Đặt lịch cho nhịp đập tiếp theo (chỉ chạy sau khi nhịp hiện tại đã xong xuôi)
        setTimeout(heartbeat, sleepMs);
    }

    // Kích hoạt nhịp đập đầu tiên
    heartbeat();
}

boot();
