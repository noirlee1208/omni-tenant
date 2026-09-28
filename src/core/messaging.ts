import * as fs from 'fs';
import * as path from 'path';

export type MessageType = 
    | 'customer_request'  
    | 'task_assignment'   
    | 'task_result'       
    | 'resource_request'  
    | 'knowledge_share'   
    | 'shutdown_request'; 

export interface InboxMessage {
    id: string;
    type: MessageType;
    sender: string; 
    content: string;
    timestamp: string;
    isRead: boolean;
}

const inboxPath = path.join(__dirname, '../../data/inbox.json');

// Đường dẫn Swarm Channel (Con sẽ dùng chung file của Mẹ thông qua biến môi trường)
const swarmPath = process.env.SWARM_PATH || path.join(__dirname, '../../data/swarm.json');
const agentId = process.env.AGENT_ID || 'Agent_Prime';

// --- XỬ LÝ HỘP THƯ LỆNH CỦA BOSS (INBOX) ---
export function getInbox(): InboxMessage[] {
    if (!fs.existsSync(inboxPath)) return [];
    return JSON.parse(fs.readFileSync(inboxPath, 'utf-8'));
}

export function writeInbox(msg: Omit<InboxMessage, 'id' | 'timestamp' | 'isRead'>) {
    const inbox = getInbox();
    const newMessage: InboxMessage = {
        ...msg,
        id: `msg_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
        timestamp: new Date().toISOString(),
        isRead: false
    };
    inbox.push(newMessage);
    fs.mkdirSync(path.dirname(inboxPath), { recursive: true });
    fs.writeFileSync(inboxPath, JSON.stringify(inbox, null, 2));
    console.log(`\n📬 [INBOX] Đã nhận tin nhắn mới từ ${msg.sender}.`);
}

export function markAsRead(messageId: string) {
    const inbox = getInbox();
    const index = inbox.findIndex(m => m.id === messageId);
    if (index !== -1) {
        inbox[index].isRead = true;
        fs.writeFileSync(inboxPath, JSON.stringify(inbox, null, 2));
    }
}

// --- XỬ LÝ GIAO TIẾP BẦY ĐÀN (SWARM) ---
export function getSwarmMessages(): InboxMessage[] {
    if (!fs.existsSync(swarmPath)) return [];
    return JSON.parse(fs.readFileSync(swarmPath, 'utf-8'));
}

export function broadcastToSwarm(content: string): string {
    const swarm = getSwarmMessages();
    const newMessage: InboxMessage = {
        id: `swarm_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
        type: 'knowledge_share',
        sender: agentId,
        content: content,
        timestamp: new Date().toISOString(),
        isRead: false
    };
    swarm.push(newMessage);
    
    // Giữ Swarm channel nhẹ gọn (chỉ lưu 50 tin nhắn gần nhất)
    if (swarm.length > 50) swarm.shift();
    
    fs.mkdirSync(path.dirname(swarmPath), { recursive: true });
    fs.writeFileSync(swarmPath, JSON.stringify(swarm, null, 2));
    console.log(`\n🐝 [SWARM] ${agentId} vừa truyền âm nhập mật cho cả bầy đàn!`);
    return `✅ Đã chia sẻ thông tin cho bầy đàn thành công.`;
}
