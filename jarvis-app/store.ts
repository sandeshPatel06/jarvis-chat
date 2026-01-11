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
    markRead: (chatId: string, messageId: string) => void;
    updateMessageRead: (messageId: string, chatId?: string) => void;
    logout: () => void;
    setChats: (chats: Chat[]) => void;
    addMessage: (message: any) => void;
    connectWebSocket: () => void;
    fetchChats: () => Promise<void>;
    fetchMessages: (chatId: string) => Promise<void>;
    typingUsers: Record<string, string | null>; // chatId -> username of typer (or null)
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
                // Send via WebSocket
                const { socket, user } = get();
                if (socket && socket.readyState === WebSocket.OPEN) {
                    socket.send(JSON.stringify({
                        message: text,
                        conversation_id: chatId
                    }));
                }
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
            updateMessageRead: (messageId, chatId) => set((state) => ({
                chats: state.chats.map((chat) => {
                    // If chatId is provided, only update that chat, otherwise scan all (less efficient but safe)
                    if (chatId && chat.id !== chatId) return chat;

                    const msgIndex = chat.messages.findIndex(m => m.id === messageId);
                    if (msgIndex === -1) return chat;

                    const newMessages = [...chat.messages];
                    newMessages[msgIndex] = { ...newMessages[msgIndex], isRead: true };
                    return { ...chat, messages: newMessages };
                })
            })),
            setChats: (chats) => set({ chats }),
            addMessage: (message) => set((state) => ({
                chats: state.chats.map((chat) =>
                    chat.id === message.conversation?.toString() // Use optional chaining for safety
                        ? {
                            ...chat,
                            messages: [...chat.messages, message],
                            lastMessage: message.text,
                            lastMessageTime: new Date(message.timestamp) // Ensure date object
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

                            // Auto-clear typing status after 3 seconds
                            setTimeout(() => {
                                get().setTyping(conversation_id, null);
                            }, 3000);
                        } else if (data.type === 'message_read') {
                            const { message_id, conversation_id } = data;
                            get().updateMessageRead(message_id, conversation_id);
                        } else if (data.message) {
                            const msg = data.message;
                            // Ensure timestamp is a Date object
                            msg.timestamp = new Date(msg.timestamp);
                            // Ensure isRead is mapped if backend sends it
                            msg.isRead = msg.is_read || false;

                            // Normalize sender to 'me' | 'them'
                            const currentUser = get().user?.username;
                            const senderUsername = typeof msg.sender === 'object' ? msg.sender.username : msg.sender;
                            msg.sender = senderUsername === currentUser ? 'me' : 'them';

                            get().addMessage(msg);

                            // Schedule Notification if 'them'
                            if (msg.sender === 'them') {
                                try {
                                    const Notifications = require('expo-notifications');
                                    Notifications.scheduleNotificationAsync({
                                        content: {
                                            title: 'New Message',
                                            body: msg.text,
                                            data: { chatId: msg.conversation_id },
                                        },
                                        trigger: null, // show immediately
                                    });
                                } catch (error) {
                                    // Ignore notification errors in Expo Go
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
                    // Transform backend models to frontend Chat models if necessary
                    // Assuming backend returns list of conversations with participants
                    // This mapping depends on exactly what your backend returns.
                    // For now, mapping broadly:
                    const chats: Chat[] = conversations.map((c: any) => ({
                        id: c.id.toString(),
                        name: c.participants.filter((p: any) => p.username !== get().user?.username)[0]?.username || 'Unknown',
                        avatar: c.participants.filter((p: any) => p.username !== get().user?.username)[0]?.profile_picture || null, // null will signal UI to use default
                        lastMessage: c.last_message?.text || '',
                        lastMessageTime: c.last_message ? new Date(c.last_message.timestamp) : new Date(),
                        unreadCount: 0, // Backend needs to provide this or compute it
                        messages: [] // Fetch on demand
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
                        isRead: m.is_read
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
