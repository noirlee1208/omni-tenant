import * as dotenv from 'dotenv';
import { notifyBoss } from '../tools/notifier';

dotenv.config();

/**
 * Lấy biến môi trường an toàn. Nếu rỗng, sẽ tự động gào thét báo cho Boss.
 * @param varName Tên biến trong file .env (VD: OPENROUTER_API_KEY)
 * @param context Ngữ cảnh lỗi để Boss hiểu (VD: Không có API Key nên không thể trade)
 */
export async function getEnvOrAlert(varName: string, context: string = 'Vui lòng bổ sung vào file .env'): Promise<string | null> {
    const value = process.env[varName];
    
    if (!value || value.trim() === '') {
        const errorMsg = `🚨 LỖI HẠ TẦNG: Thiếu biến [${varName}].\n👉 Hậu quả: ${context}`;
        await notifyBoss(errorMsg);
        return null;
    }
    
    return value.trim();
}
