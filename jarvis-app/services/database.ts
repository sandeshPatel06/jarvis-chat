import * as SQLite from 'expo-sqlite';
import { Chat, Message } from '@/types';

let db: SQLite.SQLiteDatabase | null = null;

const openDatabase = async () => {
    if (db) return db;
    db = await SQLite.openDatabaseAsync('jarvis.db');
    return db;
};

export const initDatabase = async () => {
    try {
        const database = await openDatabase();
        await database.execAsync(`
            PRAGMA journal_mode = WAL;
            CREATE TABLE IF NOT EXISTS conversations (
                id TEXT PRIMARY KEY,
                name TEXT,
                avatar TEXT,
                last_message TEXT,
                last_message_time TEXT,
                unread_count INTEGER
            );
            CREATE TABLE IF NOT EXISTS messages (
                id TEXT PRIMARY KEY,
                conversation_id TEXT,
                text TEXT,
                sender TEXT,
                timestamp TEXT,
                is_read INTEGER,
                is_delivered INTEGER,
                reactions TEXT,
                reply_to_json TEXT,
                is_unsent INTEGER DEFAULT 0,
                file TEXT,
                file_type TEXT,
                file_name TEXT,
                FOREIGN KEY (conversation_id) REFERENCES conversations (id)
            );
        `);

        // Safely add columns to existing installations
        try { await database.execAsync('ALTER TABLE messages ADD COLUMN file TEXT;'); } catch (e) { }
        try { await database.execAsync('ALTER TABLE messages ADD COLUMN file_type TEXT;'); } catch (e) { }
        try { await database.execAsync('ALTER TABLE messages ADD COLUMN file_name TEXT;'); } catch (e) { }

        console.log('Database initialized');
    } catch (error) {
        console.error('Error initializing database:', error);
    }
};

export const saveConversation = async (chat: Chat) => {
    const database = await openDatabase();
    try {
        await database.runAsync(
            `INSERT OR REPLACE INTO conversations (id, name, avatar, last_message, last_message_time, unread_count) VALUES (?, ?, ?, ?, ?, ?)`,
            [chat.id, chat.name, chat.avatar || '', chat.lastMessage, chat.lastMessageTime.toISOString(), chat.unreadCount]
        );
    } catch (error) {
        console.error('Error saving conversation:', error);
    }
};

export const saveMessage = async (message: Message, conversationId: string, isUnsent: boolean = false) => {
    const database = await openDatabase();
    try {
        await database.runAsync(
            `INSERT OR REPLACE INTO messages (id, conversation_id, text, sender, timestamp, is_read, is_delivered, reactions, reply_to_json, is_unsent, file, file_type, file_name) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                message.id,
                conversationId,
                message.text,
                message.sender,
                message.timestamp.toISOString(),
                message.isRead ? 1 : 0,
                message.isDelivered ? 1 : 0,
                JSON.stringify(message.reactions || []),
                JSON.stringify(message.reply_to || null),
                isUnsent ? 1 : 0,
                message.file || '',
                message.file_type || '',
                message.file_name || '',
            ]
        );
    } catch (error) {
        console.error('Error saving message:', error);
    }
};

export const getConversations = async (): Promise<Chat[]> => {
    const database = await openDatabase();
    try {
        const rows = await database.getAllAsync('SELECT * FROM conversations ORDER BY last_message_time DESC');
        return rows.map((row: any) => ({
            id: row.id,
            name: row.name,
            avatar: row.avatar || null,
            lastMessage: row.last_message,
            lastMessageTime: new Date(row.last_message_time),
            unreadCount: row.unread_count,
            messages: []
        }));
    } catch (error) {
        console.error('Error getting conversations:', error);
        return [];
    }
};

export const getMessages = async (conversationId: string): Promise<Message[]> => {
    const database = await openDatabase();
    try {
        const rows = await database.getAllAsync(
            'SELECT * FROM messages WHERE conversation_id = ? ORDER BY timestamp ASC',
            [conversationId]
        );
        return rows.map((row: any) => ({
            id: row.id,
            text: row.text,
            sender: row.sender as 'me' | 'them',
            timestamp: new Date(row.timestamp),
            isRead: !!row.is_read,
            isDelivered: !!row.is_delivered,
            reactions: JSON.parse(row.reactions || '[]'),
            reply_to: JSON.parse(row.reply_to_json || 'null'),
            isUnsent: !!row.is_unsent,
            file: row.file || null,
            file_type: row.file_type || null,
            file_name: row.file_name || null
        }));
    } catch (error) {
        console.error('Error getting messages:', error);
        return [];
    }
};

export const getUnsentMessages = async () => {
    const database = await openDatabase();
    try {
        const rows = await database.getAllAsync('SELECT * FROM messages WHERE is_unsent = 1 ORDER BY timestamp ASC');
        return rows.map((row: any) => ({
            ...row,
            timestamp: new Date(row.timestamp),
            reactions: JSON.parse(row.reactions || '[]'),
            reply_to: JSON.parse(row.reply_to_json || 'null')
        }));
    } catch (error) {
        console.error('Error getting unsent messages:', error);
        return [];
    }
};

export const deleteUnsentMessage = async (id: string) => {
    const database = await openDatabase();
    try {
        await database.runAsync('DELETE FROM messages WHERE id = ?', [id]);
    } catch (error) {
        console.error('Error deleting unsent message', error);
    }
};

export const markMessageSent = async (id: string, newId: string, timestamp: Date) => {
    const database = await openDatabase();
    try {
        await database.runAsync(
            'UPDATE messages SET id = ?, is_unsent = 0, timestamp = ? WHERE id = ?',
            [newId, timestamp.toISOString(), id]
        );
    } catch (error) {
        console.error('Error marking message sent', error);
    }
}
