import OpenAI from 'openai';
import * as fs from 'fs';
import * as path from 'path';
import { getEnvOrAlert } from '../utils/env';
import { executeBash, readFile, writeFile, editCode, AI_TOOLS } from './tools';
import { postTweet } from '../tools/social';
import { writeLesson } from '../tools/memory';
import { searchWeb, fetchTokenPrice } from '../tools/perception';
import { broadcastToSwarm } from '../core/messaging';
import { spawnSubAgent } from '../core/spawner';
import { installSkill, createSkill, removeSkill } from '../core/skills';
import { generateInvoice } from '../core/economy';

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

        if (msg.tool_calls && msg.tool_calls.length > 0) {
            for (const toolCall of msg.tool_calls) {
                const funcName = (toolCall as any).function.name;
                const args = JSON.parse((toolCall as any).function.arguments);
                
                let result = '';
                if (funcName === 'executeBash') result = await executeBash(args.command);
                else if (funcName === 'readFile') result = await readFile(args.filePath);
                else if (funcName === 'writeFile') result = await writeFile(args.filePath, args.content);
                else if (funcName === 'editCode') result = await editCode(args.filePath, args.targetString, args.replacement);
                else if (funcName === 'postTweet') result = await postTweet(args.content);
                else if (funcName === 'writeLesson') result = await writeLesson(args.topic, args.lesson);
                else if (funcName === 'searchWeb') result = await searchWeb(args.query);
                else if (funcName === 'fetchTokenPrice') result = await fetchTokenPrice(args.query);
                else if (funcName === 'broadcastToSwarm') result = await broadcastToSwarm(args.content);
                else if (funcName === 'spawnSubAgent') result = await spawnSubAgent(args.roleName, args.mission, args.budget, args.allowedTools);
                else if (funcName === 'installSkill') result = await installSkill(args.repoUrl);
                else if (funcName === 'createSkill') result = await createSkill(args.name, args.instructions);
                else if (funcName === 'removeSkill') result = await removeSkill(args.name);
                else if (funcName === 'generateInvoice') result = await generateInvoice(args.amount, args.task_description, args.client_id);

                console.log(`\n🤖 [AI KẾT LUẬN SAU KHI HÀNH ĐỘNG]: ${result.substring(0, 200)}...`);
            }
            return "Đã hoàn thành chuỗi hành động vật lý.";
        }

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
