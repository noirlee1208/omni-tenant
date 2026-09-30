export async function startTelegramDaemon(token: string, db: any) {
    if (!token || token === 'YOUR_TELEGRAM_BOT_TOKEN') {
        console.log('⚠️ [TELEGRAM] Bỏ qua khởi động: Chưa cấu hình TELEGRAM_BOT_TOKEN.');
        return;
    }
    
    // Dynamic import to bypass ESM issues with commonjs
    const pkg = await import('node-telegram-bot-api');
    const TelegramBot = pkg.default || pkg;
    
    const bot = new TelegramBot(token, { polling: true });
    
    bot.on('message', (msg: any) => {
        const chatId = msg.chat.id;
        const text = msg.text;
        
        console.log(`\n💬 [TELEGRAM] Nhận lệnh từ Boss: ${text}`);
        
        // Ghi thẳng vào wake_events để đánh thức Automaton
        try {
            db.prepare('INSERT INTO wake_events (source, reason, created_at) VALUES (?, ?, ?)').run(
                'telegram', 
                `Lệnh từ Telegram (Boss): ${text}`, 
                new Date().toISOString()
            );
            bot.sendMessage(chatId, '🤖 [OMNI-AUTOMATON] Đã nhận lệnh. Hệ thống sẽ xử lý ngay...');
        } catch(e) {
            console.log('Lỗi khi chèn wake_event:', e);
        }
    });

    console.log('🚀 [TELEGRAM] Daemon đã kết nối. Sẵn sàng nhận lệnh.');
}
