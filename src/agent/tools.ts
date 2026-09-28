import { exec } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

/**
 * 1. Kỹ năng gõ Terminal (Thực thi lệnh Shell)
 */
export async function executeBash(command: string): Promise<string> {
    console.log(`\n⚙️ [ACTION] Agent đang gõ lệnh: ${command}`);
    return new Promise((resolve) => {
        // Luôn chạy lệnh ở thư mục gốc của Agent
        const rootDir = path.join(__dirname, '../../');
        exec(command, { cwd: rootDir, timeout: 60000 }, (error, stdout, stderr) => {
            if (error) {
                console.log(`❌ [ACTION FAILED] Lỗi: ${error.message}`);
                resolve(`Lỗi hệ thống khi chạy lệnh:\n${error.message}\nStderr:\n${stderr}`);
                return;
            }
            console.log(`✅ [ACTION SUCCESS] Lệnh chạy xong.`);
            resolve(stdout || stderr || "Đã thực thi thành công nhưng không có output trả về.");
        });
    });
}

/**
 * 2. Kỹ năng Đọc File (Giúp AI đọc README.md hoặc Code của tool khác)
 */
export async function readFile(filePath: string): Promise<string> {
    try {
        console.log(`\n📄 [ACTION] Agent đang đọc file: ${filePath}`);
        const absolutePath = path.resolve(__dirname, '../../', filePath);
        const content = fs.readFileSync(absolutePath, 'utf-8');
        return content.substring(0, 15000); // Cắt bớt nếu file quá dài để tránh nổ Não (Token)
    } catch (e: any) {
        return `Không thể đọc file. Lỗi: ${e.message}`;
    }
}

/**
 * 3. Kỹ năng Viết File (Giúp AI tự cấu hình file config.json của Bot khác)
 */
export async function writeFile(filePath: string, content: string): Promise<string> {
    try {
        console.log(`\n📝 [ACTION] Agent đang ghi file: ${filePath}`);
        const absolutePath = path.resolve(__dirname, '../../', filePath);
        fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
        fs.writeFileSync(absolutePath, content);
        return `✅ Đã lưu file thành công tại ${filePath}`;
    } catch (e: any) {
        return `Không thể ghi file. Lỗi: ${e.message}`;
    }
}

// Cấu trúc khai báo Tools cho OpenRouter hiểu
export const AI_TOOLS = [
    {
        type: "function",
        function: {
            name: "executeBash",
            description: "Chạy một lệnh Terminal (Bash) trên máy chủ Ubuntu/WSL. Dùng để git clone, npm install, hoặc khởi chạy script.",
            parameters: {
                type: "object",
                properties: { command: { type: "string", description: "Lệnh bash cần chạy" } },
                required: ["command"]
            }
        }
    },
    {
        type: "function",
        function: {
            name: "readFile",
            description: "Đọc nội dung của một file bất kỳ trên máy chủ để phân tích.",
            parameters: {
                type: "object",
                properties: { filePath: { type: "string", description: "Đường dẫn file (tương đối từ gốc)" } },
                required: ["filePath"]
            }
        }
    },
    {
        type: "function",
        function: {
            name: "writeFile",
            description: "Tạo mới hoặc ghi đè nội dung vào một file.",
            parameters: {
                type: "object",
                properties: { 
                    filePath: { type: "string", description: "Đường dẫn file cần tạo" },
                    content: { type: "string", description: "Nội dung cần ghi vào file" }
                },
                required: ["filePath", "content"]
            }
        }
    }
];
