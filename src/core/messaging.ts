import * as path from 'path';
import db from './database';

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

const agentId = process.env.AGENT_ID || 'Agent_Prime';

// --- XỬ LÝ HỘP THƯ LỆNH CỦA BOSS (INBOX) ---
export function getInbox(): InboxMessage[] {
    // Chỉ lấy tin nhắn gửi đích danh hoặc tin nhắn của hệ thống
    const stmt = db.prepare("SELECT * FROM messages WHERE type != 'knowledge_share' ORDER BY timestamp ASC");
    return stmt.all() as InboxMessage[];
}

export function writeInbox(msg: Omit<InboxMessage, 'id' | 'timestamp' | 'isRead'>) {
    const newId = `msg_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    const timestamp = new Date().toISOString();
    
    db.prepare("INSERT INTO messages (id, type, sender, content, timestamp, isRead) VALUES (?, ?, ?, ?, ?, 0)")
      .run(newId, msg.type, msg.sender, msg.content, timestamp);
      
    console.log(`\n📬 [INBOX] Đã nhận tin nhắn mới từ ${msg.sender}. (Lưu qua SQLite)`);
}

export function markAsRead(messageId: string) {
    db.prepare("UPDATE messages SET isRead = 1 WHERE id = ?").run(messageId);
}

// --- XỬ LÝ GIAO TIẾP BẦY ĐÀN (SWARM) ---
export function getSwarmMessages(): InboxMessage[] {
    // Chỉ lấy tin nhắn bầy đàn (knowledge_share) mới nhất
    const stmt = db.prepare("SELECT * FROM messages WHERE type = 'knowledge_share' ORDER BY timestamp DESC LIMIT 10");
    return stmt.all() as InboxMessage[];
}

export function broadcastToSwarm(content: string): string {
    const newId = `swarm_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    const timestamp = new Date().toISOString();
    
    db.prepare("INSERT INTO messages (id, type, sender, content, timestamp, isRead) VALUES (?, ?, ?, ?, ?, 0)")
      .run(newId, 'knowledge_share', agentId, content, timestamp);
      
    console.log(`\n🐝 [SWARM] ${agentId} vừa truyền âm nhập mật cho cả bầy đàn! (Lưu qua SQLite)`);
    return `✅ Đã chia sẻ thông tin cho bầy đàn thành công.`;
}
