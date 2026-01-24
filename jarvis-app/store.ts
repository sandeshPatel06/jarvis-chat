import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { api } from './services/api';

export interface Message {
    id: string;
    text: string;
    sender: 'me' | 'them';
    timestamp: Date;
    isRead?: boolean;
    isDelivered?: boolean;
    reactions?: string[]; // Simplified for now
}

// ... Chat interface remains same

// ... User interface remains same

// ... User interface remains same

export interface Chat {
    id: string;
    name: string;
    avatar: string | null;
    lastMessage: string;
    lastMessageTime: Date;
    unreadCount: number;
    messages: Message[];
    status?: string;
}

interface User {
    id: number;
    username: string;
    email: string;
    phone_number?: string;
    profile_picture?: string;
    bio?: string;
}

interface AppState {
    user: User | null;
    token: string | null;
    theme: 'system' | 'light' | 'dark';
    chats: Chat[];
    socket: WebSocket | null;
    setUser: (user: User | null, token: string | null) => void;
    updateUser: (user: User) => void;
    sendMessage: (chatId: string, text: string) => void;
    editMessage: (chatId: string, messageId: string, newText: string) => void; // New
    deleteMessage: (chatId: string, messageId: string) => void; // New
    reactToMessage: (chatId: string, messageId: string, reaction: string) => void; // New
    markRead: (chatId: string, messageId: string) => void;
    markDelivered: (chatId: string, messageId: string) => void;
    updateMessageRead: (messageId: string, chatId?: string) => void;
    updateMessageDelivered: (messageId: string, chatId?: string) => void;
    deleteChat: (chatId: string) => Promise<void>; // New
    deleteChats: (chatIds: string[]) => Promise<void>; // New
    logout: () => void;
    setChats: (chats: Chat[]) => void;
    addMessage: (message: any) => void;
    connectWebSocket: () => void;
    fetchChats: () => Promise<void>;
    fetchMessages: (chatId: string) => Promise<void>;
    typingUsers: Record<string, string | null>;
    setTyping: (chatId: string, username: string | null) => void;
    sendTyping: (chatId: string) => void;
    hasHydrated: boolean;
    setHydrated: (state: boolean) => void;
}

const mockChats: Chat[] = [];

export const useStore = create<AppState>()(
    persist(
        (set, get) => ({
            user: null,
            token: null,
            theme: 'system',
            chats: [],
            socket: null,
            typingUsers: {},
            setTyping: (chatId, username) => set((state) => ({
                typingUsers: { ...state.typingUsers, [chatId]: username }
            })),
            sendTyping: (chatId) => {
                const { socket } = get();
                if (socket && socket.readyState === WebSocket.OPEN) {
                    socket.send(JSON.stringify({
                        type: 'typing',
                        conversation_id: chatId
                    }));
                }
            },
            hasHydrated: false,
            setHydrated: (state) => set({ hasHydrated: state }),
            setUser: (user, token) => set({ user, token }),
            updateUser: (user) => set({ user }),
            setTheme: (theme: 'system' | 'light' | 'dark') => set({ theme }),
            logout: () => {
                const { socket } = get();
                if (socket) socket.close();
                set({ user: null, token: null, chats: [], socket: null });
            },
            sendMessage: (chatId, text) => {
                const { socket } = get();
                if (socket && socket.readyState === WebSocket.OPEN) {
                    socket.send(JSON.stringify({
                        message: text,
                        conversation_id: chatId
                    }));
                }
            },
            editMessage: (chatId, messageId, newText) => {
                const { socket } = get();
                // Optimistic update
                set((state) => ({
                    chats: state.chats.map((chat) => {
                        if (chat.id === chatId) {
                            const newMessages = chat.messages.map((msg) =>
                                msg.id === messageId ? { ...msg, text: newText } : msg
                            );
                            return { ...chat, messages: newMessages, lastMessage: newMessages[newMessages.length - 1].text };
                        }
                        return chat;
                    })
                }));

                if (socket && socket.readyState === WebSocket.OPEN) {
                    socket.send(JSON.stringify({
                        type: 'edit_message',
                        message_id: messageId,
                        conversation_id: chatId,
                        new_text: newText
                    }));
                }
            },
            deleteMessage: (chatId, messageId) => {
                const { socket } = get();
                // Optimistic update
                set((state) => ({
                    chats: state.chats.map((chat) => {
                        if (chat.id === chatId) {
                            const newMessages = chat.messages.filter((msg) => msg.id !== messageId);
                            const lastMsg = newMessages.length > 0 ? newMessages[newMessages.length - 1].text : '';
                            return { ...chat, messages: newMessages, lastMessage: lastMsg };
                        }
                        return chat;
                    })
                }));

                if (socket && socket.readyState === WebSocket.OPEN) {
                    socket.send(JSON.stringify({
                        type: 'delete_message',
                        message_id: messageId,
                        conversation_id: chatId
                    }));
                }
            },
            reactToMessage: (chatId, messageId, reaction) => {
                const { socket } = get();
                // We'll trust the server to echo this back for now, or could optimistic update if needed
                // For simplicity, let's just send it. If we want optimistic:
                /*
                set((state) => ({
                    chats: state.chats.map((chat) => {
                        if (chat.id === chatId) {
                             // ... logic to add reaction to message ...
                        }
                        return chat;
                    })
                }));
                */

                if (socket && socket.readyState === WebSocket.OPEN) {
                    socket.send(JSON.stringify({
                        type: 'react_message',
                        message_id: messageId,
                        conversation_id: chatId,
                        reaction: reaction
                    }));
                }
            },
            deleteChat: async (chatId) => {
                const { token } = get();
                if (!token) return;
                try {
                    await api.chat.deleteConversation(token, chatId);
                    set((state) => ({
                        chats: state.chats.filter((c) => c.id !== chatId)
                    }));
                } catch (e) {
                    console.error('Failed to delete chat', e);
                }
            },
            deleteChats: async (chatIds) => {
                const { deleteChat } = get();
                // Parallel delete
                await Promise.all(chatIds.map(id => deleteChat(id)));
            },
            markRead: (chatId, messageId) => {
                const { socket } = get();
                if (socket && socket.readyState === WebSocket.OPEN) {
                    socket.send(JSON.stringify({
                        type: 'mark_read',
                        message_id: messageId,
                        conversation_id: chatId
                    }));
                }
            },
            markDelivered: (chatId, messageId) => {
                const { socket } = get();
                if (socket && socket.readyState === WebSocket.OPEN) {
                    socket.send(JSON.stringify({
                        type: 'mark_delivered',
                        message_id: messageId,
                        conversation_id: chatId
                    }));
                }
            },
            updateMessageRead: (messageId, chatId) => set((state) => ({
                chats: state.chats.map((chat) => {
                    if (chatId && chat.id !== chatId) return chat;

                    const msgIndex = chat.messages.findIndex(m => m.id === messageId);
                    if (msgIndex === -1) return chat;

                    const newMessages = [...chat.messages];
                    newMessages[msgIndex] = { ...newMessages[msgIndex], isRead: true };
                    return { ...chat, messages: newMessages };
                })
            })),
            updateMessageDelivered: (messageId, chatId) => set((state) => ({
                chats: state.chats.map((chat) => {
                    if (chatId && chat.id !== chatId) return chat;

                    const msgIndex = chat.messages.findIndex(m => m.id === messageId);
                    if (msgIndex === -1) return chat;

                    const newMessages = [...chat.messages];
                    newMessages[msgIndex] = { ...newMessages[msgIndex], isDelivered: true };
                    return { ...chat, messages: newMessages };
                })
            })),
            setChats: (chats) => set({ chats }),
            addMessage: (message) => set((state) => ({
                chats: state.chats.map((chat) =>
                    chat.id === message.conversation?.toString()
                        ? {
                            ...chat,
                            messages: [...chat.messages, message],
                            lastMessage: message.text,
                            lastMessageTime: new Date(message.timestamp)
                        }
                        : chat
                )
            })),
            connectWebSocket: () => {
                const { token, socket } = get();
                if (socket || !token) return;

                const wsUrl = process.env.EXPO_PUBLIC_WS_URL;
                if (!wsUrl) {
                    console.error('Missing environment variable: EXPO_PUBLIC_WS_URL');
                    return;
                }

                console.log('[WS] Connecting to:', wsUrl);
                const ws = new WebSocket(`${wsUrl}?token=${token}`);

                ws.onopen = () => {
                    console.log('[WS] Connected');
                };

                ws.onmessage = (e) => {
                    console.log('[WS] Message received:', e.data);
                    try {
                        const data = JSON.parse(e.data);
                        if (data.type === 'user_typing') {
                            const { conversation_id, sender_username } = data;
                            get().setTyping(conversation_id, sender_username);

                            setTimeout(() => {
                                get().setTyping(conversation_id, null);
                            }, 3000);
                        } else if (data.type === 'message_read') {
                            const { message_id, conversation_id } = data;
                            get().updateMessageRead(message_id, conversation_id);
                        } else if (data.type === 'message_delivered') {
                            const { message_id, conversation_id } = data;
                            get().updateMessageDelivered(message_id, conversation_id);
                        } else if (data.type === 'message_edited') {
                            const { message_id, conversation_id, new_text } = data;
                            set((state) => ({
                                chats: state.chats.map((chat) => {
                                    if (chat.id === conversation_id) {
                                        const newMessages = chat.messages.map((msg) =>
                                            msg.id === message_id ? { ...msg, text: new_text } : msg
                                        );
                                        // Update last message if it was the last one
                                        const lastMsg = newMessages[newMessages.length - 1];
                                        return { ...chat, messages: newMessages, lastMessage: lastMsg ? lastMsg.text : '' };
                                    }
                                    return chat;
                                })
                            }));
                        } else if (data.type === 'message_deleted') {
                            const { message_id, conversation_id } = data;
                            set((state) => ({
                                chats: state.chats.map((chat) => {
                                    if (chat.id === conversation_id) {
                                        const newMessages = chat.messages.filter((msg) => msg.id !== message_id);
                                        const lastMsg = newMessages.length > 0 ? newMessages[newMessages.length - 1].text : '';
                                        return { ...chat, messages: newMessages, lastMessage: lastMsg };
                                    }
                                    return chat;
                                })
                            }));
                        } else if (data.message) {
                            const msg = data.message;
                            msg.timestamp = new Date(msg.timestamp);
                            msg.isRead = msg.is_read || false;
                            msg.isDelivered = msg.is_delivered || false;

                            const currentUser = get().user?.username;
                            const senderUsername = typeof msg.sender === 'object' ? msg.sender.username : msg.sender;
                            msg.sender = senderUsername === currentUser ? 'me' : 'them';

                            get().addMessage(msg);

                            if (msg.sender === 'them') {
                                get().markDelivered(msg.conversation_id, msg.id);
                                try {
                                    const Notifications = require('expo-notifications');
                                    Notifications.scheduleNotificationAsync({
                                        content: {
                                            title: 'New Message',
                                            body: msg.text,
                                            data: { chatId: msg.conversation_id },
                                        },
                                        trigger: null,
                                    });
                                } catch (error) {
                                }
                            }
                        }
                    } catch (err) {
                        console.error('[WS] Parse error:', err);
                    }
                };

                ws.onerror = (e) => {
                    console.error('[WS] Error:', e);
                };

                ws.onclose = (e) => {
                    console.log('[WS] Disconnected:', e.reason);
                    set({ socket: null });
                };

                set({ socket: ws });
            },
            fetchChats: async () => {
                const { token } = get();
                if (!token) return;
                try {
                    const conversations = await api.chat.getConversations(token);
                    const chats: Chat[] = conversations.map((c: any) => ({
                        id: c.id.toString(),
                        name: c.participants.filter((p: any) => p.username !== get().user?.username)[0]?.username || 'Unknown',
                        avatar: c.participants.filter((p: any) => p.username !== get().user?.username)[0]?.profile_picture || null,
                        lastMessage: c.last_message?.text || '',
                        lastMessageTime: c.last_message ? new Date(c.last_message.timestamp) : new Date(),
                        unreadCount: 0,
                        messages: []
                    }));
                    set({ chats });
                } catch (e) {
                    console.error(e);
                }
            },
            fetchMessages: async (chatId: string) => {
                const { token } = get();
                if (!token) return;
                try {
                    const msgs = await api.chat.getMessages(token, chatId);
                    const messages: Message[] = msgs.map((m: any) => ({
                        id: m.id.toString(),
                        text: m.text,
                        sender: m.sender.username === get().user?.username ? 'me' : 'them',
                        timestamp: new Date(m.timestamp),
                        isRead: m.is_read,
                        isDelivered: m.is_delivered
                    }));

                    set((state) => ({
                        chats: state.chats.map((c) =>
                            c.id === chatId ? { ...c, messages: messages } : c
                        )
                    }));
                } catch (e) {
                    console.error(e);
                }
            }
        }),
        {
            name: 'jarvis-storage',
            storage: createJSONStorage(() => AsyncStorage),
            partialize: (state) => ({ user: state.user, token: state.token }),
            onRehydrateStorage: () => (state) => {
                state?.setHydrated(true);
            }
        }
    )
);
