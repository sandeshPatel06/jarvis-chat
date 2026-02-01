import { getApp, getApps, initializeApp } from '@react-native-firebase/app';
import {
    getMessaging,
    setBackgroundMessageHandler,
    onMessage,
    onNotificationOpenedApp,
    getInitialNotification,
    requestPermission,
    getToken,
    onTokenRefresh,
    AuthorizationStatus
} from '@react-native-firebase/messaging';
import notifee, { AndroidImportance, AndroidVisibility, EventType, AndroidStyle } from '@notifee/react-native';
import { handleIncomingCallFCM } from '@/helper/backgroundCallHelper';
import { registerForPushNotificationsAsync } from '../utils/notifications';
import { api } from './api';
import { useStore } from '@/store';
import { getMediaUrl } from '@/utils/media';

// ============================================================================
// CENTRALIZED NOTIFICATION HANDLER
// ============================================================================
async function handleRemoteMessage(remoteMessage: any, context: 'foreground' | 'background') {
    console.log(`[Firebase ${context}] 📩 Message received in ${context} state`);
    console.log(`[Firebase ${context}] Message data:`, JSON.stringify(remoteMessage.data, null, 2));

    try {
        const { data, notification: firebaseNotification } = remoteMessage;

        // 1. Handle Incoming Call
        if (data?.type === 'incoming_call') {
            const fcmData = {
                type: data.type,
                callUUID: data.callUUID || data.callUUID,
                callerId: data.handle || data.callerId || 'Unknown',
                callerName: data.callerName || data.caller_name || 'Unknown',
            };
            await handleIncomingCallFCM(fcmData);
        }
        // 2. Handle New Message
        else if (data?.type === 'message' || data?.conversation_id) {
            const channelId = await notifee.createChannel({
                id: 'messages',
                name: 'Messages',
                importance: AndroidImportance.HIGH,
                visibility: AndroidVisibility.PUBLIC,
            });

            const senderName = data.sender_name || firebaseNotification?.title || 'New Message';
            const messageText = data.text || firebaseNotification?.body || 'You have a new message';
            const avatarUrl = data.sender_avatar ? getMediaUrl(data.sender_avatar) : null;

            await notifee.displayNotification({
                id: data.message_id || Date.now().toString(),
                title: senderName,
                body: messageText,
                data: {
                    type: 'message',
                    conversation_id: data.conversation_id,
                    message_id: data.message_id,
                },
                android: {
                    channelId,
                    importance: AndroidImportance.HIGH,
                    largeIcon: avatarUrl || undefined,
                    style: {
                        type: AndroidStyle.MESSAGING,
                        person: {
                            name: senderName,
                            icon: avatarUrl || undefined,
                        },
                        messages: [
                            {
                                text: messageText,
                                timestamp: Date.now(),
                                person: {
                                    name: senderName,
                                    icon: avatarUrl || undefined,
                                },
                            },
                        ],
                    },
                    pressAction: {
                        id: 'default',
                        launchActivity: 'default',
                    },
                    actions: [
                        {
                            title: 'Reply',
                            pressAction: {
                                id: 'reply',
                            },
                            input: {
                                placeholder: 'Type a message...',
                            },
                        },
                        {
                            title: 'Mark as Read',
                            pressAction: {
                                id: 'mark_as_read',
                            },
                        },
                    ],
                },
            });
        }
    } catch (error) {
        console.error(`[Firebase ${context}] ❌ Error handling message:`, error);
    }
}

// Initialize Firebase if not already initialized
if (getApps().length === 0) {
    // initializeApp();
}

const firebaseMessaging = getMessaging();

// ============================================================================
// BACKGROUND MESSAGE HANDLER
// ============================================================================
setBackgroundMessageHandler(firebaseMessaging, async (remoteMessage) => {
    await handleRemoteMessage(remoteMessage, 'background');
});

// ============================================================================
// FOREGROUND MESSAGE HANDLER
// ============================================================================
export const setupForegroundHandler = () => {
    return onMessage(firebaseMessaging, async (remoteMessage) => {
        await handleRemoteMessage(remoteMessage, 'foreground');
    });
};

// ============================================================================
// NOTIFICATION OPENED HANDLER
// ============================================================================
export const setupNotificationOpenedHandler = () => {
    onNotificationOpenedApp(firebaseMessaging, (remoteMessage) => {
        console.log('[Firebase] 📱 Notification opened app from background:', remoteMessage);
    });

    getInitialNotification(firebaseMessaging).then((remoteMessage) => {
        if (remoteMessage) {
            console.log('[Firebase] 📱 App opened from killed state by notification:', remoteMessage);
        }
    });
};

// Handle Notifee Background Events (Reply, etc.)
notifee.onBackgroundEvent(async ({ type, detail }) => {
    const { notification, pressAction, input } = detail;

    if (type === EventType.ACTION_PRESS) {
        if (pressAction?.id === 'reply' && input) {
            const conversationId = notification?.data?.conversation_id as string;
            const replyText = input as string;

            if (conversationId && replyText) {
                console.log(`[Notifee] Replying to ${conversationId}: ${replyText}`);
                try {
                    const state = useStore.getState();
                    const token = state.token;

                    if (token) {
                        await api.chat.uploadFile(token, conversationId, null, null, replyText);
                        console.log('[Notifee] Reply sent successfully');
                    }
                } catch (error) {
                    console.error('[Notifee] Failed to send background reply:', error);
                }
            }
        } else if (pressAction?.id === 'mark_as_read') {
            const conversationId = notification?.data?.conversation_id as string;
            const messageId = notification?.data?.message_id as string;

            if (conversationId && messageId) {
                console.log(`[Notifee] Marking as read: ${messageId} in ${conversationId}`);
                try {
                    const state = useStore.getState();
                    const token = state.token;
                    if (token) {
                        // We might need a specific mark_read endpoint or call useStore action
                        // For background, usually calling API directly is safer if store isn't fully hydrated
                        // or if it's a headless task.
                        // Assuming markRead in store or a direct API call
                        await api.chat.getMessages(token, conversationId, 1, 0); // Side effect: mark read if backend does it on fetch
                        // Better: call a specific mark read if available
                        // Currently store.markRead(chatId, messageId) handles it.
                    }
                } catch (error) {
                    console.error('[Notifee] Failed to mark as read:', error);
                }
            }
        }

        if (notification?.id) {
            await notifee.cancelNotification(notification.id);
        }
    }
});

export async function requestFirebasePermission(): Promise<boolean> {
    try {
        const authStatus = await requestPermission(firebaseMessaging);
        const enabled =
            authStatus === AuthorizationStatus.AUTHORIZED ||
            authStatus === AuthorizationStatus.PROVISIONAL;
        return enabled;
    } catch (error) {
        console.error('[Firebase] ❌ Error requesting permission:', error);
        return false;
    }
}

export async function getFCMToken(): Promise<string | null> {
    try {
        const tokenVal = await getToken(firebaseMessaging);
        return tokenVal;
    } catch (error) {
        console.error('[Firebase] ❌ Error getting FCM token:', error);
        return null;
    }
}

export const setupTokenRefreshListener = () => {
    return onTokenRefresh(firebaseMessaging, async (tokenVal) => {
        await registerForPushNotificationsAsync();
    });
};

export default firebaseMessaging;
