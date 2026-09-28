import * as path from 'path';
import db from '../core/database';

export async function writeLesson(topic: string, lesson: string): Promise<string> {
    try {
        const timestamp = new Date().toISOString();
        db.prepare('INSERT INTO lessons (topic, lesson, timestamp) VALUES (?, ?, ?)').run(topic, lesson, timestamp);
        
        console.log(`\n🧠 [MEMORY] Đã lưu bài học mới về: ${topic}`);
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
