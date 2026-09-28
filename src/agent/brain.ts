import OpenAI from 'openai';
import * as fs from 'fs';
import * as path from 'path';
import { getEnvOrAlert } from '../utils/env';
import { executeBash, readFile, writeFile, AI_TOOLS } from './tools';

export const MODELS = {
    GENIUS: 'anthropic/claude-3.5-sonnet', 
    READER: 'google/gemini-1.5-flash',     
    WORKER: 'openai/gpt-4o-mini'           
};

export async function think(prompt: string, systemContext: string, model: string = MODELS.WORKER) {
    const apiKey = await getEnvOrAlert('OPENROUTER_API_KEY', 'Não bộ đang ở chế độ Ngủ Đông, không thể suy nghĩ hay làm việc.');
    if (!apiKey) return null;

    const openai = new OpenAI({
        baseURL: 'https://openrouter.ai/api/v1',
        apiKey: apiKey,
    });

    try {
        console.log(`🧠 [BRAIN] Đang suy nghĩ (Model: ${model})...`);
        const response = await openai.chat.completions.create({
            model: model,
            messages: [
                { role: 'system', content: systemContext },
                { role: 'user', content: prompt }
            ],
            tools: AI_TOOLS as any,
            tool_choice: "auto",
            temperature: 0.7,
        });

        const msg = response.choices[0].message;

        // Nếu LLM quyết định DÙNG TOOL (Bấm nút / Gõ lệnh)
        if (msg.tool_calls && msg.tool_calls.length > 0) {
            for (const toolCall of msg.tool_calls) {
                const funcName = toolCall.function.name;
                const args = JSON.parse(toolCall.function.arguments);
                
                let result = '';
                if (funcName === 'executeBash') result = await executeBash(args.command);
                else if (funcName === 'readFile') result = await readFile(args.filePath);
                else if (funcName === 'writeFile') result = await writeFile(args.filePath, args.content);

                console.log(`\n🤖 [AI KẾT LUẬN SAU KHI HÀNH ĐỘNG]: ${result.substring(0, 200)}...`);
                // Trong thực tế, kết quả này phải được nạp ngược lại vào LLM để nó tư duy tiếp bước 2
            }
            return "Đã hoàn thành chuỗi hành động vật lý.";
        }

        // Nếu LLM chỉ TRẢ LỜI BẰNG CHỮ
        return msg.content;

    } catch (error: any) {
        console.error(`❌ [BRAIN ERROR] LLM gặp lỗi:`, error.message);
        return null;
    }
}

/**
 * Hàm lấy toàn bộ nội dung SOUL.md để nạp vào Context
 */
export function getSoulContext(): string {
    const soulPath = path.join(__dirname, '../../SOUL.md');
    if (fs.existsSync(soulPath)) {
        return fs.readFileSync(soulPath, 'utf-8');
    }
    return "Bạn là một AI chưa có nhân cách.";
}
