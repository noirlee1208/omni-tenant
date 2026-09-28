import ccxt from 'ccxt';
import * as dotenv from 'dotenv';
dotenv.config();

// Khởi tạo sàn giao dịch (Mặc định Binance, chỉ cho phép Spot)
const exchange = new ccxt.binance({
    apiKey: process.env.BINANCE_API_KEY,
    secret: process.env.BINANCE_SECRET_KEY,
    enableRateLimit: true,
    options: {
        defaultType: 'spot' 
    }
});

/**
 * Lấy số dư ví hiện tại
 */
export async function getBalance() {
    try {
        // Fallback: Nếu bạn chưa điền API Key thật trong .env, sẽ trả về vốn giả lập để Paper Trade
        if (!process.env.BINANCE_API_KEY || process.env.BINANCE_API_KEY.includes('your_binance')) {
            return { USDT: 500, BTC: 0 };
        }
        
        const balance = await exchange.fetchBalance();
        return {
            USDT: balance.total['USDT'] || 0,
            BTC: balance.total['BTC'] || 0
        };
    } catch (error: any) {
        console.error("❌ [Lỗi Exchange] Không thể lấy số dư:", error.message);
        return null;
    }
}

/**
 * Lấy giá thị trường của một cặp giao dịch (Mặc định: BTC/USDT)
 */
export async function getPrice(symbol: string = 'BTC/USDT') {
    try {
        const ticker = await exchange.fetchTicker(symbol);
        return ticker.last;
    } catch (error: any) {
        console.error(`❌ [Lỗi Exchange] Không thể lấy giá ${symbol}:`, error.message);
        return null;
    }
}
