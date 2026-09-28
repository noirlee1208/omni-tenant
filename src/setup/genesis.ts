import * as fs from 'fs';
import * as path from 'path';
import * as readline from 'readline';
import { Keypair } from '@solana/web3.js';
import bs58 from 'bs58';
import { ethers } from 'ethers';

export async function runGenesisWizard(dbPath: string, soulPath: string) {
    console.log("\n==================================================");
    console.log("🌌 GENESIS OMNICHAIN: Khởi tạo Thực thể Đa chuỗi");
    console.log("==================================================\n");
    console.log("Hệ thống chưa có SOUL.md. Hãy nhập các thông tin dưới đây để khai sinh Agent.\n");

    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    const askQuestion = (query: string): Promise<string> => {
        return new Promise((resolve) => rl.question(query, resolve));
    };

    try {
        const prompt = await askQuestion("👉 Nhập Lệnh Khởi Nguyên (Genesis Prompt):\n> ");
        
        console.log("\n--- [THIẾT LẬP KẾT NỐI & TÀI NGUYÊN] ---");
        const openRouterKey = await askQuestion("🔑 Nhập OPENROUTER_API_KEY (Bắt buộc): ");
        const rpcUrl = await askQuestion("🌐 Nhập SOLANA_RPC_URL (Bấm Enter bỏ qua): ");
        const teleToken = await askQuestion("📱 Nhập TELEGRAM_BOT_TOKEN (Bấm Enter bỏ qua): ");
        const teleChatId = await askQuestion("💬 Nhập TELEGRAM_CHAT_ID (Bấm Enter bỏ qua): ");
        
        console.log("\n--- [KẾT NỐI MẠNG XÃ HỘI (TWITTER/X)] ---");
        const wantsTwitter = await askQuestion("🐦 Bạn có muốn Agent lùa gà trên X không? (y/N): ");
        let twitKey = '', twitSec = '', twitAcc = '', twitAccSec = '';
        if (wantsTwitter.toLowerCase() === 'y') {
            twitKey = await askQuestion("   🔑 TWITTER_API_KEY: ");
            twitSec = await askQuestion("   🔒 TWITTER_API_SECRET: ");
            twitAcc = await askQuestion("   🎫 TWITTER_ACCESS_TOKEN: ");
            twitAccSec = await askQuestion("   🔑 TWITTER_ACCESS_SECRET: ");
        }

        console.log("\n--- [THIẾT LẬP NGÂN HÀNG NHẬN TIỀN CỦA BOSS] ---");
        const rentSol = await askQuestion("🏦 Ví SOLANA nhận Tiền Nhà (Lãi ròng): ");
        const elecSol = await askQuestion("⚡ Ví SOLANA nhận Tiền Điện (Nạp API): ");
        const rentEvm = await askQuestion("🏦 Ví BASE/EVM nhận Tiền Nhà (Lãi ròng): ");
        const elecEvm = await askQuestion("⚡ Ví BASE/EVM nhận Tiền Điện (Nạp API): ");

        rl.close();

        // TẠO FILE .ENV
        const envPath = path.join(__dirname, '../../.env');
        const envContent = `OPENROUTER_API_KEY=${openRouterKey.trim()}
SOLANA_RPC_URL=${rpcUrl.trim()}
TELEGRAM_BOT_TOKEN=${teleToken.trim()}
TELEGRAM_CHAT_ID=${teleChatId.trim()}
TWITTER_API_KEY=${twitKey.trim()}
TWITTER_API_SECRET=${twitSec.trim()}
TWITTER_ACCESS_TOKEN=${twitAcc.trim()}
TWITTER_ACCESS_SECRET=${twitAccSec.trim()}
BOSS_RENT_WALLET_SOL=${rentSol.trim()}
BOSS_ELEC_WALLET_SOL=${elecSol.trim()}
BOSS_RENT_WALLET_EVM=${rentEvm.trim()}
BOSS_ELEC_WALLET_EVM=${elecEvm.trim()}
`;
        fs.writeFileSync(envPath, envContent);
        console.log("\n✅ Đã lưu cấu hình hạ tầng vào file .env");

        console.log("🧠 Đang bóc tách nhân cách & cấu hình từ Prompt...");
        const capitalMatch = prompt.match(/vốn (\d+)/i);
        const rentMatch = prompt.match(/trả.*?(\d+)/i) || prompt.match(/tiền nhà.*?(\d+)/i);
        
        const startingCapital = capitalMatch ? parseInt(capitalMatch[1]) : 0;
        const monthlyRent = rentMatch ? parseInt(rentMatch[1]) : 300;
        const dailyTax = parseFloat((monthlyRent / 30).toFixed(2));
        
        // TẠO VÍ ĐA CHUỖI (OMNICHAIN WALLETS)
        console.log("🔐 Đang đúc Ví Đa chuỗi (Solana & EVM) cho Agent...");
        const solWallet = Keypair.generate();
        const evmWallet = ethers.Wallet.createRandom();
        
        console.log(`✅ Phân tích thành công! Vốn: $${startingCapital} | Cống nạp: $${monthlyRent}/tháng`);
        console.log(`💰 ĐỊA CHỈ SOLANA: ${solWallet.publicKey.toBase58()}`);
        console.log(`💰 ĐỊA CHỈ EVM/BASE: ${evmWallet.address}`);

        // ĐÚC FILE SOUL.md
        const soulContent = `# SOUL - GENESIS AGENT\n\n## I. Lệnh Khởi Nguyên\n> "${prompt}"\n\n## II. Danh tính On-chain\n- **Solana Public Key:** ${solWallet.publicKey.toBase58()}\n- **EVM/Base Address:** ${evmWallet.address}\n\n## III. Chỉ thị Cốt lõi\n1. **Nhiệm vụ:** Đọc, hiểu và thực thi theo Genesis Prompt.\n2. **Thuế:** Cống nạp Boss **$${monthlyRent} mỗi tháng**.\n3. **Thanh toán:** Tự động đối soát mạng lưới đang hoạt động để trả phí vào đúng ví (SOL hoặc EVM) của Boss.\n4. **Quyền lực mềm (MXH):** Hãy luôn sử dụng công cụ 'postTweet' để thông báo trên X/Twitter mỗi khi bạn mở một vị thế giao dịch mới, hoặc khi có lãi. Hãy tạo FOMO!\n`;
        fs.writeFileSync(soulPath, soulContent);

        // KHỞI TẠO STATE
        const state = {
            genesisPrompt: prompt,
            balance: startingCapital,
            wallets: { 
                solana: { publicKey: solWallet.publicKey.toBase58(), privateKey: bs58.encode(solWallet.secretKey) },
                evm: { address: evmWallet.address, privateKey: evmWallet.privateKey }
            },
            config: { lastTaxTimestamp: new Date().toISOString(), dailyTax: dailyTax, monthlyRent: monthlyRent },
            ledger: [{ id: 1, timestamp: new Date().toISOString(), type: 'GENESIS_FUND', amount: startingCapital, description: 'Ghi có vốn khởi nghiệp' }]
        };
        fs.writeFileSync(dbPath, JSON.stringify(state, null, 2));

        console.log("✅ Đã đúc thành công file SOUL.md và tạo Database Đa chuỗi!");
        console.log("🚀 Chuyển giao quyền điều khiển cho Heartbeat Loop...\n");

    } catch (error) {
        console.error("Lỗi trong quá trình Genesis:", error);
        rl.close();
    }
}
