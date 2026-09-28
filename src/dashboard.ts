import express from 'express';
import * as fs from 'fs';
import * as path from 'path';

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const PORT = 3000;
const dbPath = path.join(__dirname, '../data/agent_state.json');
const inboxPath = path.join(__dirname, '../data/inbox.json');

// Khởi tạo Inbox nếu chưa có
if (!fs.existsSync(inboxPath)) {
    fs.writeFileSync(inboxPath, JSON.stringify([]));
}

// Giao diện Web HTML cơ bản
app.get('/', (req, res) => {
    let state: any = { balance: 0, config: { monthlyRent: 300 }, genesisPrompt: '' };
    let logs: any[] = [];
    if (fs.existsSync(dbPath)) {
        state = JSON.parse(fs.readFileSync(dbPath, 'utf-8'));
        logs = state.ledger ? state.ledger.slice(-10).reverse() : [];
    }

    let inbox = JSON.parse(fs.readFileSync(inboxPath, 'utf-8'));

    const html = `
    <!DOCTYPE html>
    <html lang="vi">
    <head>
        <meta charset="UTF-8">
        <title>Sovereign Command Center</title>
        <style>
            body { font-family: monospace; background: #1e1e1e; color: #00ff00; padding: 20px; }
            .card { border: 1px solid #00ff00; padding: 15px; margin-bottom: 20px; background: #000; }
            input, button { background: #333; color: #00ff00; border: 1px solid #00ff00; padding: 5px; }
            button { cursor: pointer; font-weight: bold; }
            button:hover { background: #00ff00; color: #000; }
            .log-entry { margin: 5px 0; border-bottom: 1px dashed #333; padding-bottom: 5px; }
            .danger { color: #ff4444; }
        </style>
    </head>
    <body>
        <h2>👁️ TỔNG LÃNH SỰ QUÁN (Command Center)</h2>
        
        <div class="card">
            <h3>🤖 Agent Prime (Mother)</h3>
            <p><strong>Vốn sổ cái nội bộ:</strong> $${state.balance.toFixed(2)}</p>
            <p><strong>Mức Thuế (Tiền nhà):</strong> $${state.config.monthlyRent}/tháng</p>
            <p><strong>Lệnh Khởi Nguyên:</strong> <i>${state.genesisPrompt || 'N/A'}</i></p>
            ${state.wallets?.solana ? `<p style="color: yellow;"><strong>🔑 Ví Solana:</strong> ${state.wallets.solana.publicKey}</p>` : ''}
            ${state.wallets?.evm ? `<p style="color: cyan;"><strong>🔑 Ví EVM/Base:</strong> ${state.wallets.evm.address}</p>` : ''}
        </div>

        <div class="card">
            <h3>⚙️ ĐIỀU CHỈNH TIỀN NHÀ (TAX UPDATE)</h3>
            <form action="/update-rent" method="POST">
                <label>Nhập mức tiền nhà mới ($/tháng): </label>
                <input type="number" name="newRent" value="${state.config.monthlyRent}" required>
                <button type="submit">CẬP NHẬT</button>
            </form>
        </div>

        <div class="card">
            <h3>✉️ GỬI CHỈ THỊ (BROADCAST MESSAGE)</h3>
            <form action="/send-message" method="POST">
                <input type="text" name="message" placeholder="VD: Bắt đầu giao dịch cẩn thận hơn..." style="width: 70%;" required>
                <button type="submit">GỬI CHO TẤT CẢ AGENT</button>
            </form>
            <div style="margin-top: 10px; color: #888;">
                <b>Lịch sử chỉ thị:</b><br>
                ${inbox.map((msg: any) => `- [${msg.time}] Boss: ${msg.text}`).join('<br>') || 'Chưa có tin nhắn nào.'}
            </div>
        </div>

        <div class="card">
            <h3>📜 SỔ CÁI HOẠT ĐỘNG (10 Lệnh gần nhất)</h3>
            ${logs.map((log: any) => `
                <div class="log-entry">
                    [${new Date(log.timestamp).toLocaleTimeString()}] 
                    <span class="${log.amount < 0 ? 'danger' : ''}">${log.type}</span> : 
                    $${log.amount} - ${log.description}
                </div>
            `).join('')}
        </div>
    </body>
    </html>
    `;
    res.send(html);
});

// API Cập nhật Tiền nhà
app.post('/update-rent', (req, res) => {
    const newRent = parseFloat(req.body.newRent);
    if (fs.existsSync(dbPath)) {
        let state = JSON.parse(fs.readFileSync(dbPath, 'utf-8'));
        state.config.monthlyRent = newRent;
        state.config.dailyTax = parseFloat((newRent / 30).toFixed(2));
        fs.writeFileSync(dbPath, JSON.stringify(state, null, 2));
    }
    res.redirect('/');
});

// API Gửi tin nhắn
app.post('/send-message', (req, res) => {
    const msg = req.body.message;
    let inbox = JSON.parse(fs.readFileSync(inboxPath, 'utf-8'));
    inbox.push({ time: new Date().toISOString(), text: msg, readBy: [] });
    fs.writeFileSync(inboxPath, JSON.stringify(inbox, null, 2));
    res.redirect('/');
});

app.listen(PORT, () => {
    console.log(`\n🌐 TỔNG LÃNH SỰ QUÁN đang chạy tại: http://localhost:${PORT}`);
    console.log(`   (Mở trình duyệt trên Windows và truy cập link trên)`);
});
