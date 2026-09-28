import express from 'express';
import * as path from 'path';
import * as fs from 'fs';

const app = express();
const PORT = process.env.PORT || 8999;

app.get('/api/status', (req, res) => {
    try {
        const { default: db, getState } = require('./core/database');
        
        const balance = getState('balance') || 0;
        const config = getState('config') || {};
        const wallets = getState('wallets') || {};
        const genesisPrompt = getState('genesisPrompt') || 'Chưa khởi tạo';

        const ledger = db.prepare('SELECT * FROM ledger ORDER BY timestamp DESC LIMIT 50').all();

        let solAddress = 'Chưa tạo';
        let evmAddress = 'Chưa tạo';
        if (wallets.solana) {
            const Keypair = require('@solana/web3.js').Keypair;
            const bs58 = require('bs58').default;
            const keypair = Keypair.fromSecretKey(bs58.decode(wallets.solana));
            solAddress = keypair.publicKey.toBase58();
        }
        if (wallets.evm) {
            const ethers = require('ethers');
            const wallet = new ethers.Wallet(wallets.evm);
            evmAddress = wallet.address;
        }

        res.json({
            status: 'Hoạt động',
            balance: balance,
            addresses: { solana: solAddress, evm: evmAddress },
            ledger: ledger,
            taxRate: config.dailyTax || 10,
            genesisPrompt
        });
    } catch (e: any) {
        res.status(500).json({ error: 'Lỗi tải trạng thái từ Database', details: e.message });
    }
});

// Serve frontend code
app.get('/', (req, res) => {
    res.send(`
        <html>
            <head>
                <title>Agent Dashboard (V4 Enterprise)</title>
                <style>
                    body { font-family: Arial, sans-serif; padding: 20px; background: #1a1a1a; color: #fff; }
                    .card { border: 1px solid #444; padding: 15px; margin: 10px 0; border-radius: 8px; background: #222; }
                    .green { color: #00ff00; }
                    .red { color: #ff4444; }
                </style>
            </head>
            <body>
                <h1>🤖 Trạm kiểm soát Agent (V4)</h1>
                <div id="content">Đang tải dữ liệu từ SQLite...</div>
                <script>
                    fetch('/api/status').then(r=>r.json()).then(data => {
                        const ledgerHtml = data.ledger.map(l => 
                            '<li>[' + new Date(l.timestamp).toLocaleTimeString() + '] ' + l.type + ': <span class="' + (l.amount > 0 ? 'green' : 'red') + '">' + l.amount + '$</span> - ' + l.description + '</li>'
                        ).join('');
                        
                        document.getElementById('content').innerHTML = 
                            '<div class="card">' +
                                '<h2>💰 Vốn lưu động: <span class="green">$' + data.balance.toFixed(2) + '</span></h2>' +
                                '<p>Thuế mỗi ngày: ' + data.taxRate + '$</p>' +
                                '<p>Ví Solana: ' + data.addresses.solana + '</p>' +
                                '<p>Ví EVM (Base): ' + data.addresses.evm + '</p>' +
                            '</div>' +
                            '<div class="card">' +
                                '<h3>📜 Lịch sử giao dịch (SQLite)</h3>' +
                                '<ul>' + (ledgerHtml || 'Chưa có giao dịch') + '</ul>' +
                            '</div>';
                    });
                </script>
            </body>
        </html>
    `);
});

app.listen(PORT, () => {
    console.log('\\n📺 [DASHBOARD] Bảng điều khiển (V4) đang chạy tại: http://localhost:' + PORT);
});
