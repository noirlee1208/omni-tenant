import * as dotenv from 'dotenv';
import * as https from 'https';

dotenv.config();

/**
 * Gửi thông báo cho Boss qua Terminal và Telegram (Nếu có cài đặt)
 */
export async function notifyBoss(message: string) {
    // 1. Luôn in ra Terminal / Log
    console.log(`\n📢 [THÔNG BÁO CHO BOSS]: ${message}`);
    
    // 2. Gửi qua Telegram nếu có cấu hình
    const token = process.env.TELEGRAM_BOT_TOKEN?.trim();
    const chatId = process.env.TELEGRAM_CHAT_ID?.trim();
    
    if (!token || !chatId) {
        return; // Bỏ qua nếu Boss không setup Telegram
    }

    const url = `https://api.telegram.org/bot${token}/sendMessage`;
    const payload = JSON.stringify({ 
        chat_id: chatId, 
        text: `🤖 [Agent Prime]\n${message}` 
    });

    const req = https.request(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(payload)
        }
    }, (res) => {
        if (res.statusCode !== 200) {
            console.error(`❌ [Telegram] Lỗi API từ Telegram (Status: ${res.statusCode})`);
        }
    });

    req.on('error', (e) => {
        console.error(`❌ [Telegram] Mất kết nối khi gửi tin báo cáo: ${e.message}`);
    });

    req.write(payload);
    req.end();
}
