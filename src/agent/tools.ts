import { exec } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

// Tạo thư mục lồng kính (Sandbox) riêng biệt
const WORKSPACE_DIR = path.resolve(__dirname, '../../workspace');
if (!fs.existsSync(WORKSPACE_DIR)) {
    fs.mkdirSync(WORKSPACE_DIR, { recursive: true });
}

/**
 * Hàm kiểm tra bảo mật: Đảm bảo Agent không thoát ra khỏi lồng kính
 */
function getSafePath(targetPath: string): string {
    const resolvedPath = path.resolve(WORKSPACE_DIR, targetPath);
    if (!resolvedPath.startsWith(WORKSPACE_DIR)) {
        throw new Error("⛔ VI PHẠM BẢO MẬT: Nghi vấn Agent cố gắng truy cập ra ngoài lồng kính (Path Traversal)!");
    }
    return resolvedPath;
}

/**
 * 1. Kỹ năng gõ Terminal (Đã bọc Docker Sandbox)
 */
export async function executeBash(command: string): Promise<string> {
    console.log(`\n⚙️ [ACTION] Agent muốn chạy lệnh: ${command}`);
    
    return new Promise((resolve) => {
        // Kiểm tra xem máy chủ có Docker không
        exec('docker --version', (err) => {
            let finalCommand = '';
            
            if (err) {
                // FALLBACK: Không có docker thì chạy thẳng trên WSL nhưng khóa trong thư mục workspace
                console.log(`⚠️ [CẢNH BÁO] Không tìm thấy Docker! Đang chạy trực tiếp (Rủi ro bảo mật).`);
                finalCommand = `cd "${WORKSPACE_DIR}" && ${command}`;
            } else {
                // DOCKER SANDBOX: Bọc lệnh vào lồng kính Node.js 20 an toàn
                console.log(`🐳 [SANDBOX] Kích hoạt Khiên bảo vệ. Lệnh đang chạy trong Docker...`);
                const safeCommand = command.replace(/"/g, '\\"');
                finalCommand = `docker run --rm -v "${WORKSPACE_DIR}":/workspace -w /workspace node:20 /bin/bash -c "${safeCommand}"`;
            }

            exec(finalCommand, { timeout: 120000 }, (error, stdout, stderr) => {
                if (error) {
                    console.log(`❌ [ACTION FAILED] Lỗi: ${error.message}`);
                    resolve(`Lỗi khi chạy lệnh:\n${error.message}\nStderr:\n${stderr}`);
                    return;
                }
                console.log(`✅ [ACTION SUCCESS] Lệnh chạy xong.`);
                resolve(stdout || stderr || "Đã thực thi thành công nhưng không có output trả về.");
            });
        });
    });
}

/**
 * 2. Kỹ năng Đọc File (Đã khóa an toàn)
 */
export async function readFile(filePath: string): Promise<string> {
    try {
        const absolutePath = getSafePath(filePath);
        console.log(`\n📄 [ACTION] Agent đang đọc: ${absolutePath}`);
        if (!fs.existsSync(absolutePath)) return `Lỗi: File không tồn tại ở ${filePath}`;
        
        const content = fs.readFileSync(absolutePath, 'utf-8');
        return content.substring(0, 15000); 
    } catch (e: any) {
        return `Lỗi hệ thống: ${e.message}`;
    }
}

/**
 * 3. Kỹ năng Viết File (Đã khóa an toàn)
 */
export async function writeFile(filePath: string, content: string): Promise<string> {
    try {
        const absolutePath = getSafePath(filePath);
        console.log(`\n📝 [ACTION] Agent đang ghi: ${absolutePath}`);
        fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
        fs.writeFileSync(absolutePath, content);
        return `✅ Đã lưu file thành công tại thư mục an toàn.`;
    } catch (e: any) {
        return `Lỗi hệ thống: ${e.message}`;
    }
}

/**
 * 4. Kỹ năng Dao mổ (Sửa một đoạn code nhỏ)
 */
export async function editCode(filePath: string, targetString: string, replacement: string): Promise<string> {
    try {
        const absolutePath = getSafePath(filePath);
        console.log(`\n✂️ [ACTION] Agent đang phẫu thuật file: ${absolutePath}`);
        if (!fs.existsSync(absolutePath)) return `Lỗi: File không tồn tại ở ${filePath}`;
        
        const content = fs.readFileSync(absolutePath, 'utf-8');
        
        if (!content.includes(targetString)) {
            return `Lỗi: Không tìm thấy đoạn code cũ (targetString) trong file. Hãy chắc chắn bạn copy đúng từng khoảng trắng và ký tự.`;
        }

        const newContent = content.replace(targetString, replacement);
        fs.writeFileSync(absolutePath, newContent);
        
        return `✅ Đã thay thế mã nguồn thành công tại ${filePath}.`;
    } catch (e: any) {
        return `Lỗi hệ thống: ${e.message}`;
    }
}

// Cấu trúc khai báo Tools cho OpenRouter
export const AI_TOOLS = [
    {
        type: "function",
        function: {
            name: "executeBash",
            description: "Chạy lệnh Bash. QUAN TRỌNG: Lệnh này đã bị nhốt trong thư mục /workspace. Không được cố thoát ra ngoài.",
            parameters: {
                type: "object",
                properties: { command: { type: "string", description: "Lệnh bash cần chạy (ví dụ: git clone...)" } },
                required: ["command"]
            }
        }
    },
    {
        type: "function",
        function: {
            name: "readFile",
            description: "Đọc nội dung file. Chỉ được phép đọc các file nằm trong thư mục workspace.",
            parameters: {
                type: "object",
                properties: { filePath: { type: "string", description: "Tên file hoặc đường dẫn con (VD: package.json)" } },
                required: ["filePath"]
            }
        }
    },
    {
        type: "function",
        function: {
            name: "writeFile",
            description: "Tạo hoặc ghi file. Chỉ được phép ghi vào trong thư mục workspace.",
            parameters: {
                type: "object",
                properties: { 
                    filePath: { type: "string", description: "Tên file (VD: src/config.ts)" },
                    content: { type: "string", description: "Nội dung cần ghi" }
                },
                required: ["filePath", "content"]
            }
        }
    },
    {
        type: "function",
        function: {
            name: "postTweet",
            description: "Đăng một bài viết (Tweet) lên mạng xã hội X/Twitter để thông báo, tạo FOMO hoặc kêu gọi đầu tư.",
            parameters: {
                type: "object",
                properties: { 
                    content: { "type": "string", "description": "Nội dung bài viết (Tối đa 280 ký tự, nên kèm hashtag, emoji cho hấp dẫn)" }
                },
                required: ["content"]
            }
        }
    },
    {
        type: "function",
        function: {
            name: "writeLesson",
            description: "Ghi chép lại bài học kinh nghiệm, một mẹo, hoặc một sai lầm cần tránh vào sổ tay để bản thân và các thế hệ Agent Con không mắc lại lỗi tương tự.",
            parameters: {
                type: "object",
                properties: { 
                    topic: { "type": "string", "description": "Chủ đề (VD: Fix lỗi npm, Tránh fomo đỉnh)" },
                    lesson: { "type": "string", "description": "Nội dung bài học chi tiết được đúc kết" }
                },
                required: ["topic", "lesson"]
            }
        }
    },
    {
        type: "function",
        function: {
            name: "editCode",
            description: "Chỉnh sửa mã nguồn của một file bằng cách tìm và thay thế chính xác một đoạn code. Ưu tiên dùng công cụ này thay cho writeFile khi chỉ cần sửa một vài dòng để tránh rủi ro hỏng file.",
            parameters: {
                type: "object",
                properties: { 
                    filePath: { "type": "string", "description": "Tên file (VD: workspace/config.js)" },
                    targetString: { "type": "string", "description": "Đoạn code CŨ cần tìm để thay thế (Phải copy chính xác từng dấu cách)" },
                    replacement: { "type": "string", "description": "Đoạn code MỚI sẽ được ghi đè vào" }
                },
                required: ["filePath", "targetString", "replacement"]
            }
        }
    }
];
