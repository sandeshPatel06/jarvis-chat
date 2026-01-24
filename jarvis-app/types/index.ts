export interface User {
    id: number;
    username: string;
    email: string;
    phone_number?: string;
    profile_picture?: string;
    bio?: string;
}

export interface Message {
    id: string;
    text: string;
    sender: 'me' | 'them';
    timestamp: Date;
    file?: string | null;
    file_type?: string | null;
    file_name?: string | null;
    isRead?: boolean;
    isDelivered?: boolean;
    reactions?: string[];
    reply_to?: {
        id: string;
        text: string;
        sender: string;
    };
    isUnsent?: boolean;
}

export interface Chat {
    id: string;
    name: string;
    avatar: string | null;
    lastMessage: string;
    lastMessageTime: Date;
    unreadCount: number;
    messages: Message[];
    status?: string;
    hasMore?: boolean; // New
}
