import * as path from 'path';
import db from '../core/database';
import { think, MODELS } from '../agent/brain';

export async function writeLesson(topic: string, lesson: string): Promise<string> {
    try {
        const timestamp = new Date().toISOString();
        db.prepare('INSERT INTO lessons (topic, lesson, timestamp) VALUES (?, ?, ?)').run(topic, lesson, timestamp);
        
        console.log(`\n🧠 [MEMORY] Đã lưu bài học mới về: ${topic}`);
        
        // Tự động kiểm tra và nén ký ức chạy ngầm (Không block luồng chính)
        compressMemory().catch(console.error);

        return `✅ Đã ghi nhớ bài học vào cơ sở dữ liệu hệ thống.`;
    } catch (e: any) {
        return `Lỗi ghi nhớ: ${e.message}`;
    }
}

export function getTopLessons(): string {
    const lessons = db.prepare('SELECT * FROM lessons ORDER BY timestamp DESC LIMIT 5').all() as any[];
    
    if (lessons.length === 0) return "Kinh nghiệm: Chưa có bài học nào được ghi nhận.";

    let memoryContext = "Sổ tay kinh nghiệm (Những bài học đắt giá bạn đã đúc kết):\n";
    lessons.forEach(l => {
        memoryContext += `- [${l.topic}]: ${l.lesson}\n`;
    });
    return memoryContext;
}

/**
 * Động cơ Nén Ký Ức (Progressive Memory Compression)
 */
export async function compressMemory() {
    const countRow = db.prepare('SELECT COUNT(*) as count FROM lessons').get() as any;
    if (countRow.count > 10) {
        console.log(`\n🗜️ [COMPRESSION ENGINE] Ký ức vượt ngưỡng 10 bài học. Bắt đầu tiến trình nén (Dùng model rẻ tiền)...`);
        
        const allLessons = db.prepare('SELECT * FROM lessons ORDER BY timestamp ASC').all() as any[];
        const rawContent = allLessons.map(l => `- [${l.topic}]: ${l.lesson}`).join('\n');
        
        const prompt = `Dưới đây là 10+ bài học lộn xộn. Hãy nén chúng lại thành ĐÚNG 3 Nguyên lý Cốt lõi (Core Principles) bao quát nhất.
Format trả về là JSON (không markdown, không giải thích thêm):
[
    {"topic": "Tên nguyên lý", "lesson": "Nội dung súc tích"}
]
Ký ức gốc:
${rawContent}`;

        // Dùng model rẻ nhất để nén
        const compressedRaw = await think(prompt, "Bạn là cỗ máy nén dữ liệu.", MODELS.READER);
        if (compressedRaw) {
            try {
                // Xử lý json (loại bỏ markdown nếu LLM lỡ tay thêm)
                const jsonStr = compressedRaw.replace(/```json/g, '').replace(/```/g, '').trim();
                const newLessons = JSON.parse(jsonStr);
                
                // Xóa cũ, nhập mới (Thực hiện trong Transaction)
                const transaction = db.transaction(() => {
                    db.prepare('DELETE FROM lessons').run();
                    const insert = db.prepare('INSERT INTO lessons (topic, lesson, timestamp) VALUES (?, ?, ?)');
                    for (const l of newLessons) {
                        insert.run(l.topic, l.lesson, new Date().toISOString());
                    }
                });
                transaction();
                console.log(`✅ [COMPRESSION ENGINE] Đã nén thành công thành ${newLessons.length} Nguyên lý cốt lõi. Giải phóng bộ nhớ.`);
            } catch (e: any) {
                console.error(`❌ [COMPRESSION ENGINE] Lỗi parse kết quả nén: ${e.message}`);
            }
        }
    }
}
