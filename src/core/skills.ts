import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';

const skillsDir = path.join(__dirname, '../../data/skills');

// Tạo thư mục nếu chưa có
if (!fs.existsSync(skillsDir)) {
    fs.mkdirSync(skillsDir, { recursive: true });
}

/**
 * Đọc toàn bộ Kỹ năng đang được cài đặt trong hệ thống
 */
export function loadActiveSkills(): string {
    let loadedSkills = "";
    try {
        const skills = fs.readdirSync(skillsDir);
        for (const skillName of skills) {
            const skillPath = path.join(skillsDir, skillName, 'SKILL.md');
            if (fs.existsSync(skillPath)) {
                const content = fs.readFileSync(skillPath, 'utf-8');
                loadedSkills += `\n--- [KỸ NĂNG: ${skillName.toUpperCase()}] ---\n${content}\n`;
            }
        }
    } catch (e) {
        console.error("Lỗi khi tải Kỹ năng:", e);
    }
    
    if (!loadedSkills) return "Hiện tại bạn chưa được trang bị Kỹ năng (SKILL.md) nào.";
    return "CÁC KỸ NĂNG BẠN ĐANG SỞ HỮU (Nạp từ SKILL.md):\n" + loadedSkills;
}

/**
 * Tool: Cài đặt Kỹ năng từ mọi nguồn (Git Repo hoặc Raw URL)
 */
export async function installSkill(url: string): Promise<string> {
    try {
        const repoName = url.split('/').pop()?.replace('.git', '').replace('.md', '').replace(/[^a-zA-Z0-9_-]/g, '_') || `skill_${Date.now()}`;
        const targetDir = path.join(skillsDir, repoName);
        
        if (fs.existsSync(targetDir)) {
            return `Kỹ năng [${repoName}] đã tồn tại trong hệ thống.`;
        }

        // PHÂN LOẠI 1: Nếu là Git Repository
        if (url.endsWith('.git') || (url.includes('github.com') && !url.includes('/raw/'))) {
            execSync(`git clone ${url} "${targetDir}"`, { stdio: 'ignore' });
            if (!fs.existsSync(path.join(targetDir, 'SKILL.md'))) {
                fs.writeFileSync(path.join(targetDir, 'SKILL.md'), `# Kỹ năng: ${repoName}\n\nKỹ năng này chưa có Hướng dẫn cụ thể. Bạn hãy đọc các script trong thư mục này để hiểu cách dùng.`);
            }
            console.log(`\n📚 [SKILL REGISTRY] Đã Clone Git Kỹ năng: ${repoName}`);
            return `✅ Đã clone Git Repo [${repoName}] thành công. Kỹ năng đã sẵn sàng.`;
        } 
        // PHÂN LOẠI 2: Nếu là Raw URL (Gist, Pastebin, Raw Github...)
        else {
            const response = await fetch(url);
            if (!response.ok) throw new Error(`HTTP Error: ${response.status}`);
            const textContent = await response.text();
            
            fs.mkdirSync(targetDir, { recursive: true });
            fs.writeFileSync(path.join(targetDir, 'SKILL.md'), textContent);
            console.log(`\n📚 [SKILL REGISTRY] Đã tải Raw Kỹ năng từ URL: ${repoName}`);
            return `✅ Đã tải file Kỹ năng từ link trực tiếp thành công và lưu với tên [${repoName}].`;
        }
    } catch (e: any) {
        return `❌ Lỗi khi tải Kỹ năng: ${e.message}`;
    }
}

/**
 * Tool: Tự động sáng tạo (Viết) Kỹ năng mới
 */
export async function createSkill(name: string, instructions: string): Promise<string> {
    try {
        const cleanName = name.replace(/[^a-zA-Z0-9_-]/g, '_').toLowerCase();
        const targetDir = path.join(skillsDir, cleanName);
        
        if (!fs.existsSync(targetDir)) {
            fs.mkdirSync(targetDir, { recursive: true });
        }
        
        fs.writeFileSync(path.join(targetDir, 'SKILL.md'), instructions);
        console.log(`\n📚 [SKILL REGISTRY] Agent vừa tự biên soạn Kỹ năng mới: ${cleanName}`);
        
        return `✅ Đã lưu Kỹ năng [${cleanName}] thành công. Bạn (và các Agent Con) có thể dùng nó từ bây giờ.`;
    } catch (e: any) {
        return `❌ Lỗi khi tạo Kỹ năng: ${e.message}`;
    }
}

/**
 * Tool: Gỡ bỏ Kỹ năng
 */
export async function removeSkill(name: string): Promise<string> {
    try {
        const cleanName = name.replace(/[^a-zA-Z0-9_-]/g, '_').toLowerCase();
        const targetDir = path.join(skillsDir, cleanName);
        
        if (fs.existsSync(targetDir)) {
            fs.rmSync(targetDir, { recursive: true, force: true });
            return `✅ Đã gỡ bỏ vĩnh viễn Kỹ năng [${cleanName}].`;
        }
        return `❌ Kỹ năng [${cleanName}] không tồn tại.`;
    } catch (e: any) {
        return `❌ Lỗi khi xóa Kỹ năng: ${e.message}`;
    }
}
