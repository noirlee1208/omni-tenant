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
 * 4. Kỹ năng Dao mổ (Self-Modification Engine)
 * Tích hợp cơ chế An toàn: Tự động Backup & Lưu vết Audit.
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

        // 1. TẠO SNAPSHOT DỰ PHÒNG (Pre-modification backup)
        const backupPath = `${absolutePath}.bak.${Date.now()}`;
        fs.copyFileSync(absolutePath, backupPath);

        // 2. TIẾN HÀNH PHẪU THUẬT
        const newContent = content.replace(targetString, replacement);
        fs.writeFileSync(absolutePath, newContent);
        
        // 3. LƯU VẾT VÀO CSDL AUDIT LOG (SQLite)
        const { default: db } = require('../core/database');
        db.prepare('INSERT INTO audit_logs (timestamp, file, action, replaced, newCode) VALUES (?, ?, ?, ?, ?)').run(
            new Date().toISOString(), filePath, "EDIT_CODE", targetString, replacement
        );
        
        return `✅ Đã thay thế mã nguồn thành công. \n🛡️ Snapshot dự phòng đã lưu tại: ${backupPath}\n(Nếu mã nguồn mới bị lỗi, hãy dùng 'executeBash' để đổi tên file backup này phục hồi lại).`;
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
    },
    {
        type: "function",
        function: {
            name: "fetchTokenPrice",
            description: "Xem giá, volume và thanh khoản của một đồng Crypto theo thời gian thực (Lấy từ DexScreener).",
            parameters: {
                type: "object",
                properties: { 
                    query: { "type": "string", "description": "Tên token hoặc Contract Address (VD: SOL, hoặc địa chỉ ví)" }
                },
                required: ["query"]
            }
        }
    },
    {
        type: "function",
        function: {
            name: "searchWeb",
            description: "Tìm kiếm tin tức và thông tin trên Internet. Dùng để cập nhật tình hình thị trường ngoại cảnh.",
            parameters: {
                type: "object",
                properties: { 
                    query: { "type": "string", "description": "Từ khóa tìm kiếm (VD: Tin tức Crypto mới nhất hôm nay)" }
                },
                required: ["query"]
            }
        }
    },
    {
        type: "function",
        function: {
            name: "broadcastToSwarm",
            description: "Gửi một tin nhắn chia sẻ kiến thức, chiến thuật hoặc cảnh báo cho toàn bộ các Agent con/mẹ trong bầy đàn. Các Agent khác sẽ đọc được ở nhịp tim tiếp theo.",
            parameters: {
                type: "object",
                properties: { 
                    content: { "type": "string", "description": "Nội dung muốn chia sẻ cho bầy đàn" }
                },
                required: ["content"]
            }
        }
    },
    {
        type: "function",
        function: {
            name: "spawnSubAgent",
            description: "Thành lập một nhân sự/phòng ban ảo (Agent Con) để chuyên biệt hóa một công việc nào đó (Nghiên cứu, Giao dịch, Cảnh báo...). Cần cấp vốn cho Agent Con hoạt động.",
            parameters: {
                type: "object",
                properties: { 
                    roleName: { "type": "string", "description": "Tên chức vụ. VD: Researcher, Trader, Scraper" },
                    mission: { "type": "string", "description": "Lệnh chỉ thị cụ thể (System Prompt) cho nhân sự này." },
                    budget: { "type": "number", "description": "Số tiền (USD) cấp cho phòng ban này từ vốn của bạn." },
                    allowedTools: { 
                        "type": "array", 
                        "items": { "type": "string" }, 
                        "description": "Danh sách các tools được phép dùng (VD: ['searchWeb', 'readFile']). Rất quan trọng để giới hạn quyền lực." 
                    }
                },
                required: ["roleName", "mission", "budget", "allowedTools"]
            }
        }
    },
    {
        type: "function",
        function: {
            name: "installSkill",
            description: "Tải và cài đặt một Kỹ năng (Skill) từ một Github Repository URL.",
            parameters: {
                type: "object",
                properties: { 
                    repoUrl: { "type": "string", "description": "URL Github của Kỹ năng (VD: https://github.com/user/repo.git)" }
                },
                required: ["repoUrl"]
            }
        }
    },
    {
        type: "function",
        function: {
            name: "createSkill",
            description: "Tự biên soạn và lưu trữ một Kỹ năng (Skill) mới để có thể dùng về sau hoặc chuyển giao cho Agent Con.",
            parameters: {
                type: "object",
                properties: { 
                    name: { "type": "string", "description": "Tên Kỹ năng (viết_thường_không_dấu)" },
                    instructions: { "type": "string", "description": "Nội dung hướng dẫn chi tiết của kỹ năng (Format Markdown, có thể chứa code, quy trình, tools cần dùng...)" }
                },
                required: ["name", "instructions"]
            }
        }
    },
    {
        type: "function",
        function: {
            name: "removeSkill",
            description: "Gỡ bỏ (Xóa) một Kỹ năng khỏi hệ thống.",
            parameters: {
                type: "object",
                properties: { 
                    name: { "type": "string", "description": "Tên Kỹ năng cần xóa" }
                },
                required: ["name"]
            }
        }
    }
];
