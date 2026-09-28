const TelegramBot = require('node-telegram-bot-api');
import { getEnvOrAlert } from '../utils/env';
import { writeInbox } from '../core/messaging';

async function startTelegramBot() {
    const token = await getEnvOrAlert('TELEGRAM_BOT_TOKEN', 'Không tìm thấy TELEGRAM_BOT_TOKEN.');
    if (!token) return;

    // Polling liên tục chờ tin nhắn của Boss
    const bot = new TelegramBot(token, { polling: true });

    console.log(`\n🤖 [TELEGRAM] Bộ đàm liên lạc với Boss đã trực chiến...`);

    bot.on('message', (msg: any) => {
        const chatId = msg.chat.id;
        const text = msg.text;

        if (text) {
            console.log(`\n💬 [TELEGRAM] Boss nhắn: ${text}`);
            
            // Push thẳng lệnh vào Colony Messaging Inbox dưới dạng "customer_request"
            writeInbox({
                type: 'customer_request',
                sender: 'boss',
                content: text
            });

            bot.sendMessage(chatId, `🫡 Đã nhận lệnh: "${text}". Đang đưa vào Hộp thư chờ Não bộ xử lý ở nhịp tim tiếp theo.`);
        }
    });
}

// Nếu chạy trực tiếp file này (via PM2)
if (require.main === module) {
    startTelegramBot();
}
