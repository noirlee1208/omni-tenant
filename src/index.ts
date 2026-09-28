import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';
import { trySpawnChild } from './core/spawner';
import { runGenesisWizard } from './setup/genesis';
import { think, getSoulContext, MODELS } from './agent/brain';

dotenv.config();

const dbDir = path.join(__dirname, '../data');
if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir);
const dbPath = path.join(dbDir, 'agent_state.json');
const soulPath = path.join(__dirname, '../SOUL.md');
const inboxPath = path.join(dbDir, 'inbox.json');

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

    function checkInbox() {
        if (!fs.existsSync(inboxPath)) return;
        let inbox = JSON.parse(fs.readFileSync(inboxPath, 'utf-8'));
        const unread = inbox.filter((msg: any) => !msg.readBy.includes('Agent_Prime'));
        
        if (unread.length > 0) {
            console.log(`\n📩 [TIN NHẮN TỪ BOSS]:`);
            unread.forEach((msg: any) => {
                console.log(`   👉 "${msg.text}"`);
                msg.readBy.push('Agent_Prime'); 
            });
            fs.writeFileSync(inboxPath, JSON.stringify(inbox, null, 2));
        }
    }

    console.log("⏳ Starting Heartbeat Daemon...");
    let cycle = 0;

    setInterval(async () => {
        cycle++;
        console.log(`\n[Heartbeat] Cycle ${cycle} - Checking system... (Balance: $${state.balance.toFixed(2)})`);
        
        checkInbox();
        processTax();
        await trySpawnChild(state, dbPath);
        
        // --- BỘ NÃO TỰ TRỊ (AUTONOMOUS THINKING) ---
        // Cứ 6 chu kỳ (30 giây) thức dậy suy nghĩ 1 lần để tiết kiệm API
        if (cycle % 6 === 0) {
            console.log("\n⚡ [AWAKE] Agent đang vận dụng Não bộ để xử lý công việc...");
            
            const soul = getSoulContext();
            const systemContext = `Bạn là một Agent tự trị hoàn toàn. Dưới đây là Hiến pháp (SOUL) của bạn:\n${soul}`;
            
            // Prompt nhắc nhở Agent công việc cần làm
            const prompt = `Tình trạng hiện tại: Bạn đang có $${state.balance} vốn nội bộ.
            Nếu bạn chưa tải công cụ/bot làm việc về, hãy dùng công cụ 'executeBash' để chạy lệnh 'git clone <link-repo>' vào thư mục './workspace'.
            Nếu đã clone rồi, hãy dùng 'readFile' để đọc README.md bên trong './workspace' và tìm hiểu cách khởi chạy bot.
            Hãy sử dụng công cụ để thực hiện MỘT hành động duy nhất lúc này.`;
            
            // Gọi model thiên tài (GENIUS) để xử lý các setup phức tạp ban đầu
            await think(prompt, systemContext, MODELS.GENIUS);
        }
        
    }, 5000);
}

boot();
