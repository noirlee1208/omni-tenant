import * as fs from 'fs';
import * as path from 'path';

export type MessageType = 
    | 'customer_request'  // Lệnh từ Boss (Telegram)
    | 'task_assignment'   // Mẹ giao việc cho Con
    | 'task_result'       // Con báo cáo kết quả
    | 'resource_request'  // Con xin Mẹ thêm vốn
    | 'knowledge_share'   // Chia sẻ kinh nghiệm
    | 'shutdown_request'; // Lệnh tự sát

export interface InboxMessage {
    id: string;
    type: MessageType;
    sender: string; // 'boss', 'mother', 'child_123', etc.
    content: string;
    timestamp: string;
    isRead: boolean;
}

const inboxPath = path.join(__dirname, '../../data/inbox.json');

export function getInbox(): InboxMessage[] {
    if (!fs.existsSync(inboxPath)) {
        fs.writeFileSync(inboxPath, JSON.stringify([]));
        return [];
    }
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
    fs.writeFileSync(inboxPath, JSON.stringify(inbox, null, 2));
    console.log(`\n📬 [INBOX] Đã nhận tin nhắn mới từ ${msg.sender}: ${msg.content.substring(0, 50)}...`);
}

export function markAsRead(messageId: string) {
    const inbox = getInbox();
    const index = inbox.findIndex(m => m.id === messageId);
    if (index !== -1) {
        inbox[index].isRead = true;
        fs.writeFileSync(inboxPath, JSON.stringify(inbox, null, 2));
    }
}
