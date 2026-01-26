import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { api } from './services/api';
import NetInfo from '@react-native-community/netinfo';
import * as database from './services/database';
import { User, Message, Chat, Call } from '@/types';
import { getMediaUrl, downloadMedia } from './utils/media';
import { webrtcService } from './services/webrtc';
import { MediaStream } from 'react-native-webrtc';
import * as SecureStore from 'expo-secure-store';
import * as KeepAwake from 'expo-keep-awake';
import * as Haptics from 'expo-haptics';
import * as Audio from 'expo-audio';
import * as ImagePicker from 'expo-image-picker';

// Custom storage wrapper for Zustand to use SecureStore for sensitive data
const secureStorage = {
    getItem: async (name: string): Promise<string | null> => {
        return await SecureStore.getItemAsync(name);
    },
    setItem: async (name: string, value: string): Promise<void> => {
        await SecureStore.setItemAsync(name, value);
    },
    removeItem: async (name: string): Promise<void> => {
        await SecureStore.deleteItemAsync(name);
    },
};

interface Toast {
    type: 'success' | 'error' | 'info';
    text1: string;
    text2?: string;
    id: number;
}

export interface AlertButton {
    text: string;
    onPress?: () => void;
    style?: 'default' | 'cancel' | 'destructive';
}

export interface AlertState {
    title: string;
    message: string;
    buttons?: AlertButton[];
}


interface CallState {
    isCalling: boolean;
    incomingCall: { chatId: string, offer: any, isVideo: boolean } | null;
    remoteStream: MediaStream | null;
    localStream: MediaStream | null;
    activeChatId: string | null;
    bufferedCandidates: any[];
}


interface AppState {
    user: User | null;
    token: string | null;
    theme: 'system' | 'light' | 'dark';
    setTheme: (theme: 'system' | 'light' | 'dark') => void; // Fix missing
    chats: Chat[];
    calls: Call[];
    socket: WebSocket | null;
    setUser: (user: User | null, token: string | null) => void;
    updateUser: (user: User) => void;
    sendMessage: (chatId: string, text: string, replyToId?: string) => void;
    sendFileMessage: (chatId: string, file: any, text?: string, replyToId?: string) => Promise<void>;
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
    fetchCalls: () => Promise<void>;
    fetchMessages: (chatId: string) => Promise<void>;
    loadMoreMessages: (chatId: string) => Promise<void>; // New
    typingUsers: Record<string, string | null>;
    setTyping: (chatId: string, username: string | null) => void;
    sendTyping: (chatId: string) => void;
    syncMessages: () => Promise<void>;
    hasHydrated: boolean;
    setHydrated: (state: boolean) => void;
    activeChatId: string | null;
    setActiveChat: (chatId: string | null) => void;
    animationsEnabled: boolean; // New
    setAnimationsEnabled: (enabled: boolean) => void; // New
    forwardMessage: (message: Message, chatIds: string[]) => Promise<void>; // New
    toast: Toast | null;
    showToast: (type: 'success' | 'error' | 'info', text1: string, text2?: string) => void;
    hideToast: () => void;
    updateSettings: (settings: Partial<User>) => Promise<void>;
    deleteAccount: () => Promise<void>;
    alert: AlertState | null;
    showAlert: (title: string, message: string, buttons?: AlertButton[]) => void;
    hideAlert: () => void;

    // Call Actions
    callState: CallState;
    startCall: (chatId: string, isVideo?: boolean) => Promise<void>;
    endCall: () => void;
    acceptCall: () => Promise<void>;
    handleSignalingMessage: (message: any) => Promise<void>;
}



let callSound: any = null;

const playRingtone = async (isIncoming: boolean) => {
    try {
        // Configure audio session for VoIP-like behavior
        await Audio.setAudioModeAsync({
            playsInSilentMode: true,
            interruptionMode: 'duckOthers',
            allowsRecording: false,
            shouldRouteThroughEarpiece: false,
        });

        // Stop any existing sound
        if (callSound) {
            callSound.pause();
            callSound = null;
        }

        const source = isIncoming
            ? 'https://assets.mixkit.co/active_storage/sfx/1359/1359-preview.mp3' // Classic phone ring
            : 'https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3'; // Dial tone

        const player = Audio.createAudioPlayer(source);
        player.loop = true;
        player.play();
        callSound = player;
    } catch (e) {
        console.log('Error playing ringtone', e);
    }
};

const stopRingtone = async () => {
    try {
        if (callSound) {
            callSound.pause();
            callSound = null;
        }
    } catch (e) {
        console.log('Error stopping ringtone', e);
    }
};




const mockChats: Chat[] = [];

export const useStore = create<AppState>()(
    persist(
        (set, get) => {
            // Init DB
            database.initDatabase();

            return {
                user: null,
                token: null,
                theme: 'system',
                chats: [],
                calls: [],
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
                setTheme: (theme: 'system' | 'light' | 'dark') => set({ theme }), // Fix missing
                logout: () => {
                    const { socket } = get();
                    if (socket) socket.close();
                    set({ user: null, token: null, chats: [], calls: [], socket: null, activeChatId: null });
                },
                activeChatId: null,
                alert: null,
                showAlert: (title, message, buttons) => set({ alert: { title, message, buttons } }),
                hideAlert: () => set({ alert: null }),

                callState: {
                    isCalling: false,
                    incomingCall: null,
                    remoteStream: null,
                    localStream: null,
                    activeChatId: null,
                    bufferedCandidates: [],
                },

                startCall: async (chatId, isVideo = true) => {
                    // Set calling state immediately for responsive UI
                    set((state) => ({
                        callState: { ...state.callState, isCalling: true, activeChatId: chatId }
                    }));

                    try {
                        // Request permissions
                        const audioStatus = await Audio.requestRecordingPermissionsAsync();
                        const cameraStatus = await ImagePicker.requestCameraPermissionsAsync();

                        if (audioStatus.status !== 'granted' || (isVideo && cameraStatus.status !== 'granted')) {
                            get().showAlert('Permission Required', 'Camera and Microphone permissions are needed for calls.');
                            get().endCall(); // Revert state
                            return;
                        }

                        // Activate KeepAwake for the duration of the call
                        KeepAwake.activateKeepAwakeAsync();
                        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

                        // Play dialing sound
                        playRingtone(false);

                        // Configure audio for voice call (recording allowed)
                        await Audio.setAudioModeAsync({
                            playsInSilentMode: true,
                            allowsRecording: true,
                            interruptionMode: 'doNotMix',
                            shouldRouteThroughEarpiece: false,
                            shouldPlayInBackground: true,
                        });

                        const stream = await webrtcService.startLocalStream(isVideo);
                        set((state) => ({
                            callState: { ...state.callState, localStream: stream }
                        }));

                        // Create peer connection AFTER we have the local stream
                        webrtcService.createPeerConnection();

                        webrtcService.onRemoteStream = (stream) => {
                            console.log('[Store] Remote stream received, updating state');
                            set((state) => ({
                                callState: { ...state.callState, remoteStream: stream }
                            }));
                        };

                        webrtcService.onIceCandidate = (candidate) => {
                            const socket = get().socket;
                            if (socket) {
                                socket.send(JSON.stringify({
                                    type: 'webrtc_ice_candidate',
                                    chat_id: chatId,
                                    candidate: candidate
                                }));
                            }
                        };

                        webrtcService.onIceRestart = (offer) => {
                            console.log('[Store] ICE restart, sending new offer to remote peer');
                            const socket = get().socket;
                            if (socket) {
                                socket.send(JSON.stringify({
                                    type: 'webrtc_offer',
                                    chat_id: chatId,
                                    offer: offer
                                }));
                            }
                        };

                        const offer = await webrtcService.createOffer();

                        const socket = get().socket;
                        if (socket) {
                            socket.send(JSON.stringify({
                                type: 'webrtc_offer',
                                chat_id: chatId,
                                offer: offer,
                                is_video: isVideo
                            }));
                        }

                    } catch (error) {
                        console.error('Start call error:', error);
                        get().endCall();
                        get().showAlert('Error', 'Failed to start call');
                    }
                },

                endCall: () => {
                    const { callState, token, user, chats, socket } = get();
                    stopRingtone(); // Stop sound
                    const { activeChatId, isCalling, incomingCall } = callState;

                    // Notify peer that call is ended/declined
                    const targetChatId = activeChatId || incomingCall?.chatId;
                    if (targetChatId && socket && socket.readyState === WebSocket.OPEN) {
                        console.log('[Store] Sending call_ended signal to peer:', targetChatId);
                        socket.send(JSON.stringify({
                            type: 'call_ended',
                            chat_id: targetChatId
                        }));
                    }

                    if (isCalling && activeChatId && token && user) {
                        const chat = chats.find(c => c.id === activeChatId);
                        if (chat) {
                            // Log the call
                            // status: ongoing is default, but here we assume it was completed if ended manually
                            // ideally we track start time in state but for now current time is fine
                            api.chat.logCall(token, {
                                receiver_username: chat.name, // Assuming chat name is username for 1-1
                                status: 'completed',
                                is_video: true
                            }).then(() => get().fetchCalls());
                        }
                    }

                    webrtcService.endCall();
                    KeepAwake.deactivateKeepAwake(); // Deactivate KeepAwake when call ends
                    set((state) => ({
                        callState: {
                            isCalling: false,
                            incomingCall: null,
                            remoteStream: null,
                            localStream: null,
                            activeChatId: null,
                            bufferedCandidates: []
                        }
                    }));
                },

                acceptCall: async () => {
                    const { incomingCall } = get().callState;
                    if (!incomingCall) return;

                    stopRingtone(); // Stop incoming call ring
                    try {
                        set((state) => ({
                            callState: { ...state.callState, isCalling: true, activeChatId: incomingCall.chatId, incomingCall: null }
                        }));

                        // Request permissions for answering too
                        const audioStatus = await Audio.requestRecordingPermissionsAsync();
                        const cameraStatus = await ImagePicker.requestCameraPermissionsAsync();

                        if (audioStatus.status !== 'granted' || cameraStatus.status !== 'granted') {
                            get().showAlert('Permission Required', 'Permissions needed to answer call.');
                            return;
                        }

                        // Activate KeepAwake for calls
                        KeepAwake.activateKeepAwakeAsync();
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

                        stopRingtone(); // Stop incoming ringtone

                        // Configure audio for voice call (recording allowed)
                        await Audio.setAudioModeAsync({
                            playsInSilentMode: true,
                            allowsRecording: true, // Crucial for WebRTC to pick up mic
                            interruptionMode: 'doNotMix',
                            shouldRouteThroughEarpiece: false,
                            shouldPlayInBackground: true,
                        });

                        const stream = await webrtcService.startLocalStream(true); // Default video for now
                        set((state) => ({
                            callState: { ...state.callState, localStream: stream }
                        }));

                        // Create peer connection AFTER we have the local stream
                        webrtcService.createPeerConnection();

                        webrtcService.onRemoteStream = (stream) => {
                            console.log('[Store] Remote stream received in acceptCall, updating state');
                            set((state) => ({
                                callState: { ...state.callState, remoteStream: stream }
                            }));
                        };

                        webrtcService.onIceCandidate = (candidate) => {
                            const socket = get().socket;
                            if (socket) {
                                socket.send(JSON.stringify({
                                    type: 'webrtc_ice_candidate',
                                    chat_id: incomingCall.chatId,
                                    candidate: candidate
                                }));
                            }
                        };

                        webrtcService.onIceRestart = (offer) => {
                            console.log('[Store] ICE restart in acceptCall, sending new offer to remote peer');
                            const socket = get().socket;
                            if (socket) {
                                socket.send(JSON.stringify({
                                    type: 'webrtc_offer',
                                    chat_id: incomingCall.chatId,
                                    offer: offer
                                }));
                            }
                        };

                        await webrtcService.setRemoteDescription(incomingCall.offer);

                        // Process buffered candidates
                        const { bufferedCandidates } = get().callState;
                        if (bufferedCandidates.length > 0) {
                            console.log(`[Store] Processing ${bufferedCandidates.length} buffered ICE candidates`);
                            for (const candidate of bufferedCandidates) {
                                await webrtcService.addIceCandidate(candidate);
                            }
                        }

                        const answer = await webrtcService.createAnswer();

                        const socket = get().socket;
                        if (socket) {
                            socket.send(JSON.stringify({
                                type: 'webrtc_answer',
                                chat_id: incomingCall.chatId,
                                answer: answer
                            }));
                        }
                    } catch (error) {
                        console.error('Accept call error', error);
                        get().endCall();
                    }
                },

                handleSignalingMessage: async (message: any) => {
                    const { type, payload } = message;

                    if (message.type === 'webrtc_offer') {
                        console.log('[Signaling] Offer received');
                        const state = get().callState;
                        const currentUser = get().user?.username;

                        // Polite peer logic to handle signaling glare
                        // If we are calling or receiving a call, and we get another offer
                        const isGlaring = state.isCalling || state.incomingCall;
                        const isRenegotiation = state.isCalling && state.activeChatId === message.chat_id;

                        if (isGlaring && !isRenegotiation) {
                            // "Polite" peer logic: The peer with the lexicographically smaller username yields.
                            // We need to know the remote username. For simple 1-1, it's often payload.sender?
                            // But usually we can infer it from the chat_id or the message itself if it has a sender field.
                            // Assuming we can get the remote username from the chats state.
                            const chat = get().chats.find(c => c.id === message.chat_id);
                            const remoteUsername = chat?.name;

                            if (currentUser && remoteUsername) {
                                const isPolite = currentUser < remoteUsername;
                                if (!isPolite) {
                                    console.log('[Signaling] Glare detected, we are impolite, ignoring incoming offer');
                                    return;
                                }
                                console.log('[Signaling] Glare detected, we are polite, rolling back and accepting new offer');
                                // Rollback: Cleanup current signaling state but keep isCalling true?
                                // Actually, it's better to just end the current attempt and start fresh with the incoming offer.
                                stopRingtone();
                                webrtcService.endCall();
                            }
                        }

                        if (isRenegotiation) {
                            console.log('[Signaling] Renegotiation offer received (likely ICE restart)');
                            await webrtcService.setRemoteDescription(message.offer);
                            const answer = await webrtcService.createAnswer();
                            const socket = get().socket;
                            if (socket) {
                                socket.send(JSON.stringify({
                                    type: 'webrtc_answer',
                                    chat_id: message.chat_id,
                                    answer: answer
                                }));
                            }
                            return;
                        }

                        get().showToast('info', 'Incoming Call', 'Receiving WebRTC Offer');
                        playRingtone(true); // Play incoming ringtone
                        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning); // Subtle buzz for incoming

                        set((state) => ({
                            callState: {
                                ...state.callState,
                                incomingCall: {
                                    chatId: message.chat_id,
                                    offer: message.offer,
                                    isVideo: !!message.is_video
                                }
                            }
                        }));
                    } else if (message.type === 'webrtc_answer') {
                        console.log('[Signaling] Answer received');
                        get().showToast('success', 'Call Connected', 'Remote answered');
                        stopRingtone(); // Stop dialing sound
                        await webrtcService.setRemoteDescription(message.answer);
                    } else if (message.type === 'webrtc_ice_candidate') {
                        console.log('[Signaling] ICE Candidate received');
                        const pc = webrtcService.peerConnection;
                        if (pc && pc.remoteDescription) {
                            await webrtcService.addIceCandidate(message.candidate);
                        } else {
                            console.log('[Signaling] Buffering ICE candidate (PC or RemoteDesc not ready)');
                            set((state) => ({
                                callState: {
                                    ...state.callState,
                                    bufferedCandidates: [...state.callState.bufferedCandidates, message.candidate]
                                }
                            }));
                        }
                    } else if (message.type === 'call_ended') {
                        console.log('[Signaling] Call ended by peer');
                        get().showToast('info', 'Call Ended', 'The other person ended the call');
                        const { callState } = get();
                        if (callState.activeChatId === message.chat_id || callState.incomingCall?.chatId === message.chat_id) {
                            webrtcService.endCall(); // Cleanup WebRTC
                            stopRingtone();
                            set((state) => ({
                                callState: {
                                    isCalling: false,
                                    incomingCall: null,
                                    remoteStream: null,
                                    localStream: null,
                                    activeChatId: null,
                                    bufferedCandidates: []
                                }
                            }));
                        }
                    }
                },

                setActiveChat: (chatId) => {
                    set((state) => ({
                        activeChatId: chatId,
                        // specific chat unread reset
                        chats: state.chats.map(c => c.id === chatId ? { ...c, unreadCount: 0 } : c)
                    }));
                },
                animationsEnabled: true,
                setAnimationsEnabled: (enabled) => set({ animationsEnabled: enabled }),
                sendMessage: async (chatId, text, replyToId) => {
                    const { socket, user } = get();
                    const netState = await NetInfo.fetch();

                    if (netState.isConnected && socket && socket.readyState === WebSocket.OPEN) {
                        socket.send(JSON.stringify({
                            message: text,
                            conversation_id: chatId,
                            reply_to_id: replyToId
                        }));
                    } else {
                        // Offline handling
                        const tempId = `temp_${Date.now()}`;
                        const newMessage: Message = {
                            id: tempId,
                            text,
                            sender: 'me',
                            timestamp: new Date(),
                            isRead: false,
                            isDelivered: false,
                            isUnsent: true,
                            reply_to: undefined // Complex to resolve reply_to offline without full object, acceptable limitation or fetch from localDB
                        };

                        // If reply_to_id is present, try to find it in current state to populate UI
                        if (replyToId) {
                            const chat = get().chats.find(c => c.id === chatId);
                            const parent = chat?.messages.find(m => m.id === replyToId);
                            if (parent) {
                                newMessage.reply_to = {
                                    id: parent.id,
                                    text: parent.text,
                                    sender: parent.sender === 'me' ? (user?.username || 'me') : 'them' // Approximate
                                };
                            }
                        }

                        get().addMessage({ ...newMessage, conversation_id: chatId });
                        await database.saveMessage(newMessage, chatId, true);
                    }
                    // Add haptic feedback for local message sending
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                },
                sendFileMessage: async (chatId, file, text = '', replyToId) => {
                    const { token, user } = get();
                    if (!token) return;

                    // Optimistic UI (optional/tricky with file blobs). 
                    // For now, let's rely on server response or show a "sending" indicator in UI component.
                    // But we can add a temp message if we want.

                    try {
                        const response = await api.chat.uploadFile(token, chatId, null, file, text, replyToId);

                        // Download media file locally if present
                        let localFileUri = null;
                        if (response.file) {
                            const fullMediaUrl = getMediaUrl(response.file);
                            if (fullMediaUrl) {
                                localFileUri = await downloadMedia(fullMediaUrl, response.id.toString());
                            }
                        }

                        // Add message optimistically - WebSocket will update/deduplicate
                        const msg = {
                            id: response.id || `temp_${Date.now()}`,
                            text: text || '',
                            sender: 'me',
                            timestamp: new Date(response.timestamp || Date.now()),
                            isRead: false,
                            isDelivered: false,
                            file: localFileUri || response.file, // Use local URI if available
                            remoteFile: response.file, // Keep remote path for reference
                            file_type: response.file_type,
                            file_name: response.file_name,
                            conversation_id: chatId,
                        };
                        get().addMessage(msg);
                    } catch (e) {
                        console.error('Send file failed', e);
                        // Ensure UI handles error (e.g. via toast or status)
                    }
                },
                syncMessages: async () => {
                    const { socket } = get();
                    const netState = await NetInfo.fetch();

                    if (!netState.isConnected || !socket || socket.readyState !== WebSocket.OPEN) return;

                    const unsentMessages = await database.getUnsentMessages();

                    for (const msg of unsentMessages) {
                        // Re-send
                        // Note: If msg has reply_to, we need the ID. 
                        // Stored message has full reply_to object in JSON usually.
                        const replyToId = msg.reply_to?.id;

                        socket.send(JSON.stringify({
                            message: msg.text,
                            conversation_id: msg.conversation_id, // We need to store conversation_id in DB message table! (Added in schema)
                            reply_to_id: replyToId
                        }));

                        // We delete the temporary/unsent message from DB. 
                        // The server will echo back the REAL message with a new ID.
                        // This might cause a UI blip (temp removed, new added). 
                        // Ideally we'd correlate them, but for now simple removal is robust.
                        await database.deleteUnsentMessage(msg.id);

                        // Update UI to remove the temp message to avoid duplicates when real one comes back
                        set(state => ({
                            chats: state.chats.map(chat => {
                                if (chat.id === msg.conversation_id) {
                                    return {
                                        ...chat,
                                        messages: chat.messages.filter(m => m.id !== msg.id)
                                    };
                                }
                                return chat;
                            })
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
                toast: null,
                showToast: (type, text1, text2) => set({ toast: { type, text1, text2, id: Date.now() } }),
                hideToast: () => set({ toast: null }),
                updateSettings: async (settings) => {
                    const { token, user } = get();
                    if (!token || !user) return;
                    try {
                        const updatedUser = await api.auth.updateProfile(token, settings);
                        set({ user: updatedUser });
                    } catch (e) {
                        console.error('Update settings failed', e);
                        get().showToast('error', 'Update Failed', 'Could not save your settings.');
                        throw e;
                    }
                },
                deleteAccount: async () => {
                    const { token, logout } = get();
                    if (!token) return;
                    try {
                        await api.auth.deleteAccount(token);
                        logout();
                    } catch (e) {
                        console.error('Delete account failed', e);
                        get().showToast('error', 'Action Failed', 'Could not delete your account.');
                        throw e;
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
                addMessage: (message) => set((state) => {
                    const chatId = (message.conversation_id || message.conversation)?.toString();
                    console.log('[addMessage] Attempting to add message:', { id: message.id, chatId, hasFile: !!message.file, file: message.file });
                    return {
                        chats: state.chats.map((chat) => {
                            if (chat.id === chatId) {
                                // Deduplicate
                                if (chat.messages.some(m => m.id === message.id)) {
                                    console.log('[addMessage] Duplicate detected, skipping:', message.id);
                                    return chat;
                                }
                                console.log('[addMessage] Adding new message to chat:', chatId);
                                return {
                                    ...chat,
                                    // Prepend new message (Newest -> Oldest)
                                    messages: [message, ...chat.messages],
                                    lastMessage: message.text,
                                    lastMessageTime: new Date(message.timestamp)
                                };
                            }
                            return chat;
                        })
                    };
                }),
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
                        get().syncMessages();
                    };

                    ws.onmessage = async (e) => {
                        console.log('[WS] 📥 Message received:', e.data); // Verbose log
                        try {
                            const data = JSON.parse(e.data);
                            if (data.type === 'user_typing') {
                                const { conversation_id, sender_username } = data;
                                get().setTyping(conversation_id, sender_username);

                                setTimeout(() => {
                                    get().setTyping(conversation_id, null);
                                }, 3000);
                            } else if (data.type === 'webrtc_offer' || data.type === 'webrtc_answer' || data.type === 'webrtc_ice_candidate' || data.type === 'call_ended') {
                                await get().handleSignalingMessage(data);
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
                                const { message_id, conversation_id, deleted_by } = data;
                                set((state) => ({
                                    chats: state.chats.map((chat) => {
                                        if (chat.id === conversation_id) {
                                            const newMessages = chat.messages.map((msg) => {
                                                if (msg.id === message_id) {
                                                    // Replace with deleted placeholder
                                                    return {
                                                        ...msg,
                                                        text: `Deleted by ${deleted_by || 'user'}`,
                                                        isDeleted: true,
                                                        file: undefined,
                                                        file_type: undefined,
                                                        file_name: undefined,
                                                    };
                                                }
                                                return msg;
                                            });
                                            const lastMsg = newMessages.length > 0 ? newMessages[newMessages.length - 1].text : '';
                                            return { ...chat, messages: newMessages, lastMessage: lastMsg };
                                        }
                                        return chat;
                                    })
                                }));
                            } else if (data.type === 'message_reaction') {
                                const { message_id, conversation_id, reactions } = data;
                                set((state) => ({
                                    chats: state.chats.map((chat) => {
                                        if (chat.id === conversation_id) {
                                            const newMessages = chat.messages.map((msg) =>
                                                msg.id === message_id ? { ...msg, reactions: reactions } : msg
                                            );
                                            return { ...chat, messages: newMessages };
                                        }
                                        return chat;
                                    })
                                }));

                                // Reaction Notification
                                if (get().activeChatId !== conversation_id.toString()) {
                                    try {
                                        const Notifications = require('expo-notifications');
                                        const chat = get().chats.find(c => c.id === conversation_id.toString());
                                        const senderName = chat?.name || 'Someone';

                                        Notifications.scheduleNotificationAsync({
                                            content: {
                                                title: `Jarvis - New Reaction from ${senderName}`,
                                                body: `${reactions[0]} to your message`,
                                                data: { chatId: conversation_id },
                                            },
                                            trigger: null,
                                        });
                                    } catch (error) {
                                    }
                                }
                            } else if (data.message) {
                                const msg = data.message;
                                msg.timestamp = new Date(msg.timestamp);
                                msg.isRead = msg.is_read || false;
                                msg.isDelivered = msg.is_delivered || false;
                                // Handle backend inconsistency: conversation vs conversation_id
                                msg.conversation_id = msg.conversation_id || msg.conversation;

                                // Download media file locally if present (non-blocking)
                                if (msg.file) {
                                    const fullMediaUrl = getMediaUrl(msg.file);
                                    msg.remoteFile = msg.file; // Keep remote path

                                    if (fullMediaUrl) {
                                        // Check if file already exists locally first
                                        const { getLocalMediaUri } = require('@/utils/media');
                                        const existingLocalUri = getLocalMediaUri(msg.id.toString());

                                        if (existingLocalUri) {
                                            // File already downloaded, use local URI immediately
                                            msg.file = existingLocalUri;
                                        } else {
                                            // Start download in background, don't await
                                            downloadMedia(fullMediaUrl, msg.id.toString()).then(localUri => {
                                                if (localUri && localUri !== msg.file) {
                                                    // Only update if we got a valid local URI
                                                    set((state) => ({
                                                        chats: state.chats.map((chat) => {
                                                            if (chat.id === msg.conversation_id) {
                                                                return {
                                                                    ...chat,
                                                                    messages: chat.messages.map((m) =>
                                                                        m.id === msg.id ? { ...m, file: localUri } : m
                                                                    ),
                                                                };
                                                            }
                                                            return chat;
                                                        })
                                                    }));
                                                }
                                            }).catch(err => console.error('[Media] Background download failed:', err));
                                        }
                                    }

                                    // Infer file type from extension if not provided by backend
                                    if (!msg.file_type && msg.file) {
                                        const ext = msg.file.split('.').pop()?.toLowerCase();
                                        if (ext === 'jpg' || ext === 'jpeg' || ext === 'png' || ext === 'gif' || ext === 'webp') {
                                            msg.file_type = `image/${ext === 'jpg' ? 'jpeg' : ext}`;
                                        } else if (ext === 'mp4' || ext === 'mov' || ext === 'avi' || ext === 'webm') {
                                            msg.file_type = `video/${ext}`;
                                        } else if (ext === 'pdf') {
                                            msg.file_type = 'application/pdf';
                                        }
                                    }

                                    // Infer file name from path if not provided
                                    if (!msg.file_name && msg.file) {
                                        msg.file_name = msg.file.split('/').pop() || 'Attachment';
                                    }
                                }

                                const currentUser = get().user?.username;
                                const senderUsername = typeof msg.sender === 'object' ? msg.sender.username : msg.sender;
                                msg.sender = senderUsername === currentUser ? 'me' : 'them';

                                get().addMessage(msg);

                                if (msg.sender === 'them') {
                                    get().markDelivered(msg.conversation_id, msg.id);

                                    // Check if user is in this chat
                                    if (get().activeChatId === msg.conversation_id?.toString()) {
                                        get().markRead(msg.conversation_id, msg.id);
                                    } else {
                                        // Increment unread count
                                        set((state) => ({
                                            chats: state.chats.map((c) =>
                                                c.id === msg.conversation_id?.toString()
                                                    ? { ...c, unreadCount: (c.unreadCount || 0) + 1 }
                                                    : c
                                            )
                                        }));

                                        try {
                                            const Notifications = require('expo-notifications');

                                            // Format body
                                            let body = msg.text;
                                            if (msg.reply_to) {
                                                body = `Replying to you: ${msg.text}`;
                                            }

                                            Notifications.scheduleNotificationAsync({
                                                content: {
                                                    title: `Jarvis - New Message from ${senderUsername}`,
                                                    body: body,
                                                    data: { chatId: msg.conversation_id },
                                                },
                                                trigger: null,
                                            });
                                        } catch (error) {
                                        }
                                    }
                                }

                                // Save to DB
                                database.saveMessage(msg, msg.conversation_id);
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
                fetchCalls: async () => {
                    const { token } = get();
                    if (!token) return;
                    try {
                        const calls = await api.chat.getCalls(token);
                        set({ calls: calls });
                    } catch (e) {
                        console.error('Fetch calls failed', e);
                    }
                },
                fetchChats: async () => {
                    const { token } = get();

                    // Load from DB first
                    const localChats = await database.getConversations();
                    if (localChats.length > 0) {
                        set({ chats: localChats });
                    }

                    if (!token) return;

                    const netState = await NetInfo.fetch();
                    if (!netState.isConnected) return;

                    try {
                        const conversations = await api.chat.getConversations(token);
                        const chats: Chat[] = conversations.map((c: any) => ({
                            id: c.id.toString(),
                            name: c.participants.filter((p: any) => p.username !== get().user?.username)[0]?.username || 'Unknown',
                            avatar: c.participants.filter((p: any) => p.username !== get().user?.username)[0]?.profile_picture || null,
                            lastMessage: c.last_message?.text || '',
                            lastMessageTime: c.last_message ? new Date(c.last_message.timestamp) : new Date(),
                            unreadCount: c.unread_count || 0,
                            messages: []
                        }));
                        set({ chats });

                        // Save to DB
                        for (const chat of chats) {
                            await database.saveConversation(chat);
                        }
                    } catch (e) {
                        console.error(e);
                    }
                },
                fetchMessages: async (chatId: string) => {
                    const { token } = get();

                    // Load from DB first (Limited to latest 20 for speed)
                    // We need to update database service to support limit/offset or just slice here
                    const localMessages = await database.getMessages(chatId);
                    // Assume localMessages are still sorted Oldest->Newest from DB, we need to reverse them
                    // Or better, update DB query. For now, let's just reverse locally if needed.
                    // Actually, let's fetch ALL from DB for now but only render slice? 
                    // No, for "lazy loading" we should probably trust the API for history if we want true pagination 
                    // but for offline support we need DB.
                    // Let's keep it simple: Load *everything* from local DB but sort Newest->Oldest

                    const unsent = (await database.getUnsentMessages()).filter((m: any) => m.conversation_id === chatId);

                    // Sort Newest -> Oldest
                    let allMessages = [...localMessages, ...unsent].sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

                    // Initial View: valid data
                    set((state) => ({
                        chats: state.chats.map((c) =>
                            c.id === chatId ? { ...c, messages: allMessages, hasMore: true } : c
                        )
                    }));

                    if (!token) return;
                    const netState = await NetInfo.fetch();
                    if (!netState.isConnected) return;

                    try {
                        const limit = 20;
                        // Fetch Page 0 (Latest 20)
                        const msgs = await api.chat.getMessages(token, chatId, limit, 0);

                        // Process messages and download media files
                        const messages: Message[] = await Promise.all(msgs.map(async (m: any) => {
                            let fileUri = m.file;
                            let remoteFile = m.file;

                            // Download media file if present
                            if (m.file) {
                                const fullMediaUrl = getMediaUrl(m.file);
                                if (fullMediaUrl) {
                                    const localUri = await downloadMedia(fullMediaUrl, m.id.toString());
                                    if (localUri) {
                                        fileUri = localUri;
                                    }
                                }
                            }

                            return {
                                id: m.id.toString(),
                                text: m.text,
                                sender: m.sender.username === get().user?.username ? 'me' : 'them',
                                timestamp: new Date(m.timestamp),
                                isRead: m.is_read,
                                isDelivered: m.is_delivered,
                                reactions: m.reactions,
                                reply_to: m.reply_to,
                                file: fileUri,
                                remoteFile: remoteFile,
                                file_type: m.file_type,
                                file_name: m.file_name,
                            };
                        }));

                        // Sort Newest -> Oldest (Backend should already do this, but ensure consistency)
                        // Backend is sending Newest first (qs.order_by('-timestamp'))
                        const hasMore = messages.length >= limit;

                        set((state) => ({
                            chats: state.chats.map((c) => {
                                if (c.id === chatId) {
                                    // Merge strategy: Overwrite with latest from server for the first page, keep unsent
                                    // But we lose the "rest" of the local messages if we just overwrite.
                                    // Ideally, we see if local messages connect with server messages.
                                    // For simplicity in this task: Overwrite with fresh Page 0 + Unsent. 
                                    // Users will "load more" to get history.

                                    const unsentMsgs = unsent.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
                                    return {
                                        ...c,
                                        messages: [...unsentMsgs, ...messages],
                                        hasMore: hasMore
                                    };
                                }
                                return c;
                            })
                        }));

                        // Save to DB (Async)
                        for (const msg of messages) {
                            await database.saveMessage(msg, chatId);
                        }
                    } catch (e) {
                        console.error(e);
                    }
                },
                loadMoreMessages: async (chatId: string) => {
                    const { token, chats } = get();
                    if (!token) return;

                    const chat = chats.find(c => c.id === chatId);
                    if (!chat || chat.hasMore === false) return; // Stop if no more

                    const currentCount = chat.messages.length;
                    const limit = 20;

                    try {
                        const msgs = await api.chat.getMessages(token, chatId, limit, currentCount);
                        if (msgs.length === 0) {
                            set((state) => ({
                                chats: state.chats.map((c) => c.id === chatId ? { ...c, hasMore: false } : c)
                            }));
                            return;
                        }

                        const messages: Message[] = await Promise.all(msgs.map(async (m: any) => {
                            let fileUri = m.file;
                            let remoteFile = m.file;

                            // Download media file if present
                            if (m.file) {
                                const fullMediaUrl = getMediaUrl(m.file);
                                if (fullMediaUrl) {
                                    const localUri = await downloadMedia(fullMediaUrl, m.id.toString());
                                    if (localUri) {
                                        fileUri = localUri;
                                    }
                                }
                            }

                            return {
                                id: m.id.toString(),
                                text: m.text,
                                sender: m.sender.username === get().user?.username ? 'me' : 'them',
                                timestamp: new Date(m.timestamp),
                                isRead: m.is_read,
                                isDelivered: m.is_delivered,
                                reactions: m.reactions,
                                reply_to: m.reply_to,
                                file: fileUri,
                                remoteFile: remoteFile,
                                file_type: m.file_type,
                                file_name: m.file_name,
                            };
                        }));

                        const hasMore = messages.length >= limit;

                        set((state) => ({
                            chats: state.chats.map((c) =>
                                c.id === chatId ? { ...c, messages: [...c.messages, ...messages], hasMore: hasMore } : c
                            )
                        }));

                        // Save to DB
                        for (const msg of messages) {
                            await database.saveMessage(msg, chatId);
                        }

                    } catch (e) {
                        console.error('Failed to load more messages', e);
                    }
                },
                forwardMessage: async (message: Message, chatIds: string[]) => {
                    const { socket } = get();
                    const netState = await NetInfo.fetch();

                    if (netState.isConnected && socket && socket.readyState === WebSocket.OPEN) {
                        // Forward to each chat via WebSocket
                        for (const chatId of chatIds) {
                            socket.send(JSON.stringify({
                                message: message.text,
                                conversation_id: chatId,
                                // If message has file, include it
                                ...(message.file && { file: message.file, file_type: message.file_type })
                            }));
                        }
                    } else {
                        // Offline: Save to local DB for each chat
                        for (const chatId of chatIds) {
                            const tempId = `temp_${Date.now()}_${chatId}`;
                            const newMessage: Message = {
                                id: tempId,
                                text: message.text,
                                sender: 'me',
                                timestamp: new Date(),
                                isRead: false,
                                isDelivered: false,
                                isUnsent: true,
                                file: message.file,
                                file_type: message.file_type,
                            };
                            get().addMessage({ ...newMessage, conversation_id: chatId });
                            await database.saveMessage(newMessage, chatId, true);
                        }
                    }
                }
            };
        },
        {
            name: 'jarvis-secure-storage',
            storage: createJSONStorage(() => secureStorage as any),
            partialize: (state) => ({ user: state.user, token: state.token }),
            onRehydrateStorage: () => (state) => {
                state?.setHydrated(true);
            }
        }
    )
);
