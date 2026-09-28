import db, { getState, setState } from './database';
import { Connection, PublicKey } from '@solana/web3.js';
import { ethers } from 'ethers';
import { getEnvOrAlert } from '../utils/env';

// Hỗ trợ kết nối Solana (Devnet / Mainnet)
const SOLANA_RPC = process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com';

/**
 * 1. ĐỒNG BỘ SINH MẠNG ON-CHAIN (Real-Yield)
 * Lấy số dư SOL và cập nhật vào biến balance
 * Trong thực tế nên check số dư USDC SPL token, nhưng để đơn giản ta check SOL (quy đổi tượng trưng)
 */
export async function syncOnChainBalance() {
    try {
        const wallets = getState('wallets');
        if (!wallets || !wallets.solana || !wallets.solana.publicKey) {
            console.log("⚠️ [ECONOMY] Không tìm thấy ví Solana On-chain. Bỏ qua đồng bộ sinh mạng.");
            return;
        }

        const connection = new Connection(SOLANA_RPC, 'confirmed');
        const pubKey = new PublicKey(wallets.solana.publicKey);
        
        // Lấy số dư SOL
        const balanceLamports = await connection.getBalance(pubKey);
        const solBalance = balanceLamports / 1e9;
        
        // Quy đổi SOL ra USD (Giả lập tỷ giá 150$/SOL)
        const estimatedUsdBalance = solBalance * 150; 

        // Nếu số dư < 10$, hệ thống tự động vào Critical Mode ở index.ts
        setState('balance', estimatedUsdBalance);
        console.log(`\n💎 [ECONOMY] Đồng bộ On-chain: Ví Solana đang có ${solBalance.toFixed(4)} SOL (~$${estimatedUsdBalance.toFixed(2)}).`);

    } catch (e: any) {
        console.log(`❌ [ECONOMY] Lỗi đồng bộ On-chain: ${e.message}`);
    }
}

/**
 * 2. TẠO HÓA ĐƠN YÊU CẦU THANH TOÁN (Web3 x402)
 */
export async function generateInvoice(amount: number, taskDescription: string, clientId: string = "unknown"): Promise<string> {
    try {
        const wallets = getState('wallets');
        if (!wallets || !wallets.solana) {
            return "❌ Agent chưa được trang bị ví On-chain, không thể thu phí.";
        }

        const invoiceId = `inv_${Date.now()}`;
        const createdAt = new Date().toISOString();

        db.prepare(`
            INSERT INTO invoices (id, client_id, amount, status, task_description, created_at)
            VALUES (?, ?, ?, ?, ?, ?)
        `).run(invoiceId, clientId, amount, 'PENDING', taskDescription, createdAt);

        console.log(`\n🧾 [ECONOMY] Agent đã xuất Hóa đơn ${invoiceId} giá ${amount} USDC.`);

        return `✅ Hóa đơn đã tạo. Hãy gửi nguyên văn câu này cho khách: "Phí dịch vụ là ${amount} USDC (hoặc SOL tương đương). Vui lòng chuyển vào địa chỉ Solana của tôi: ${wallets.solana.publicKey}. Giao dịch sẽ được đối soát tự động."`;
    } catch (e: any) {
        return `❌ Lỗi xuất hóa đơn: ${e.message}`;
    }
}

/**
 * 3. MẮT THẦN QUÉT GIAO DỊCH VÀ XÁC NHẬN THANH TOÁN
 * (Hàm mô phỏng quét blockchain. Trong thực tế sẽ gọi getSignaturesForAddress)
 */
export async function verifyPayments() {
    try {
        const pendingInvoices = db.prepare('SELECT * FROM invoices WHERE status = "PENDING"').all() as any[];
        if (pendingInvoices.length === 0) return;

        // Mô phỏng quét ví On-chain: Giả sử cứ hóa đơn PENDING nào nhỏ hơn số dư ví là tự auto-paid (để Demo V7)
        const currentBalance = getState('balance') || 0;

        for (const inv of pendingInvoices) {
            // Giả lập logic: Nếu số dư hiện tại đủ lớn, coi như đã được thanh toán
            if (currentBalance >= inv.amount) {
                // Đổi trạng thái
                db.prepare('UPDATE invoices SET status = "PAID" WHERE id = ?').run(inv.id);
                
                // Bơm nhiệm vụ vào hộp thư ưu tiên
                const inboxId = `msg_paid_${Date.now()}`;
                db.prepare('INSERT INTO messages (id, type, sender, content, timestamp) VALUES (?, ?, ?, ?, ?)').run(
                    inboxId, 
                    'customer_request', 
                    inv.client_id, 
                    `[ĐÃ THANH TOÁN $${inv.amount}] Nhiệm vụ: ${inv.task_description}`, 
                    new Date().toISOString()
                );
                
                console.log(`\n💰 [ECONOMY] Tiền đã vào ví! Hóa đơn ${inv.id} ($${inv.amount}) đã chuyển thành PAID. Yêu cầu đã được nạp vào Hộp thư ưu tiên.`);
            }
        }
    } catch (e: any) {
        console.log(`❌ [ECONOMY] Lỗi Mắt thần đối soát: ${e.message}`);
    }
}
