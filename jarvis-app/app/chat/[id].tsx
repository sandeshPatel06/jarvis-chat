import { Text, View } from '@/components/Themed';
import { useAppTheme } from '@/hooks/useAppTheme';
import { Message, useStore } from '@/store';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
    FlatList,
    Image,
    Keyboard,
    KeyboardAvoidingView,
    Platform,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    Modal,
    Alert,
    Pressable,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ScreenWrapper } from '@/components/ScreenWrapper';


export default function ChatDetailScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { colors } = useAppTheme();

    const chats = useStore((state) => state.chats);
    const sendMessage = useStore((state) => state.sendMessage);
    const fetchMessages = useStore((state) => state.fetchMessages);
    const connectWebSocket = useStore((state) => state.connectWebSocket);
    const typingUsers = useStore((state) => state.typingUsers);
    const sendTyping = useStore((state) => state.sendTyping);

    const markRead = useStore((state) => state.markRead);
    const editMessage = useStore((state) => state.editMessage);
    const deleteMessage = useStore((state) => state.deleteMessage);
    const reactToMessage = useStore((state) => state.reactToMessage);
    const deleteChat = useStore((state) => state.deleteChat);

    const [text, setText] = useState('');
    const [keyboardVisible, setKeyboardVisible] = useState(false);

    // Message Context Menu State
    const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
    const [modalVisible, setModalVisible] = useState(false);
    const [editingMessageId, setEditingMessageId] = useState<string | null>(null);

    // Chat Options
    const [chatOptionsVisible, setChatOptionsVisible] = useState(false);

    const flatListRef = useRef<FlatList>(null);
    const lastTypingSent = useRef<number>(0);

    /* -------------------- lifecycle -------------------- */

    useEffect(() => {
        if (id) {
            fetchMessages(id);
            connectWebSocket();
        }
    }, [id]);

    useEffect(() => {
        const show = Keyboard.addListener('keyboardDidShow', () =>
            setKeyboardVisible(true)
        );
        const hide = Keyboard.addListener('keyboardDidHide', () =>
            setKeyboardVisible(false)
        );
        return () => {
            show.remove();
            hide.remove();
        };
    }, []);

    useEffect(() => {
        const chat = chats.find((c) => c.id === id);
        if (chat?.messages) {
            chat.messages.forEach((msg) => {
                if (msg.sender === 'them' && !msg.isRead) {
                    markRead(chat.id, msg.id);
                }
            });
        }
    }, [chats, id]);

    const chat = chats.find((c) => c.id === id);

    if (!chat) {
        return (
            <View style={styles.container}>
                <Text>Chat not found</Text>
            </View>
        );
    }

    /* -------------------- handlers -------------------- */

    const handleTextChange = (value: string) => {
        setText(value);

        const now = Date.now();
        if (value.length > 0 && now - lastTypingSent.current > 2000) {
            sendTyping(chat.id);
            lastTypingSent.current = now;
        }
    };

    const handleSend = () => {
        if (text.trim()) {
            if (editingMessageId) {
                editMessage(chat.id, editingMessageId, text.trim());
                setEditingMessageId(null);
            } else {
                sendMessage(chat.id, text.trim());
            }
            setText('');
        }
    };

    const handleLongPressMessage = (message: Message) => {
        setSelectedMessage(message);
        setModalVisible(true);
    };

    const handleReact = (reaction: string) => {
        if (selectedMessage) {
            reactToMessage(chat.id, selectedMessage.id, reaction);
            setModalVisible(false);
            setSelectedMessage(null);
        }
    };

    const handleEditOption = () => {
        if (selectedMessage) {
            const now = new Date();
            const msgTime = new Date(selectedMessage.timestamp);
            const diffMins = (now.getTime() - msgTime.getTime()) / 60000;

            if (diffMins <= 30) {
                setEditingMessageId(selectedMessage.id);
                setText(selectedMessage.text);
                setModalVisible(false);
                setSelectedMessage(null);
            } else {
                Alert.alert("Time Limit Exceeded", "You can only edit messages sent within the last 30 minutes.");
            }
        }
    };

    const handleDeleteOption = () => {
        if (selectedMessage) {
            const now = new Date();
            const msgTime = new Date(selectedMessage.timestamp);
            const diffMins = (now.getTime() - msgTime.getTime()) / 60000;

            if (diffMins <= 60) {
                Alert.alert(
                    "Delete Message",
                    "Are you sure you want to delete this message?",
                    [
                        { text: "Cancel", style: "cancel" },
                        {
                            text: "Delete",
                            style: "destructive",
                            onPress: () => {
                                deleteMessage(chat.id, selectedMessage.id);
                                setModalVisible(false);
                                setSelectedMessage(null);
                            }
                        }
                    ]
                );
            } else {
                Alert.alert("Time Limit Exceeded", "You can only delete messages sent within the last 1 hour.");
            }
        }
    };

    const handleDeleteChat = () => {
        Alert.alert(
            "Delete Chat",
            "Are you sure you want to delete this conversation? This cannot be undone.",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Delete",
                    style: "destructive",
                    onPress: async () => {
                        await deleteChat(chat.id);
                        router.back();
                    }
                }
            ]
        );
    };

    const renderMessage = ({ item }: { item: Message }) => {
        const isMe = item.sender === 'me';
        // Assuming item.reactions is an array of { emoji: string, count: number, user_reacted: boolean }
        // or just a list of emojis. For now, let's assume strict array of strings for simplicity or mapped object.
        // Based on backend plan, it will likely return a list of reactions. 
        // Let's visualize a simple reaction badge if any exist.
        // NOTE: We need to update the Message interface in store.ts to support reactions first? 
        // The user verified the Store has `reactToMessage` but we didn't add `reactions` property to Message interface.
        // I will add it safely here.

        const reactions = item.reactions || [];

        return (
            <View
                style={[
                    styles.messageContainer,
                    isMe
                        ? styles.myMessageContainer
                        : styles.theirMessageContainer,
                ]}
            >
                <TouchableOpacity
                    onLongPress={() => handleLongPressMessage(item)}
                    delayLongPress={300}
                    activeOpacity={0.8}
                >
                    {!isMe ? (
                        <View>
                            <LinearGradient
                                colors={[colors.secondary, colors.primary]}
                                style={styles.messageBubbleThem}
                            >
                                <Text style={[styles.messageText, { color: 'white' }]}>
                                    {item.text}
                                </Text>
                                <Text style={[styles.timestamp, { color: 'white' }]}>
                                    {item.timestamp.toLocaleTimeString([], {
                                        hour: '2-digit',
                                        minute: '2-digit',
                                    })}
                                </Text>
                            </LinearGradient>
                            {reactions.length > 0 && (
                                <View style={styles.reactionBadge}>
                                    <Text style={{ fontSize: 10 }}>{reactions[0]}</Text>
                                    {/* Simplification: Just showing first emoji for now until strict type is set */}
                                </View>
                            )}
                        </View>
                    ) : (
                        <View>
                            <View
                                style={[
                                    styles.messageBubbleMe,
                                    { backgroundColor: colors.messageBubbleThem },
                                ]}
                            >
                                <Text
                                    style={[
                                        styles.messageText,
                                        { color: colors.text },
                                    ]}
                                >
                                    {item.text}
                                </Text>
                                <View style={styles.readRow}>
                                    <Text
                                        style={{
                                            fontSize: 10,
                                            color: colors.tabIconDefault,
                                            marginRight: 4,
                                        }}
                                    >
                                        {item.timestamp.toLocaleTimeString([], {
                                            hour: '2-digit',
                                            minute: '2-digit',
                                        })}
                                    </Text>
                                    <MaterialCommunityIcons
                                        name={item.isRead || item.isDelivered ? 'check-all' : 'check'}
                                        size={16}
                                        color={
                                            item.isRead
                                                ? '#25D366' // WhatsApp Green as requested
                                                : colors.tabIconDefault
                                        }
                                    />
                                </View>
                            </View>
                            {reactions.length > 0 && (
                                <View style={[styles.reactionBadge, { left: -10, right: undefined }]}>
                                    <Text style={{ fontSize: 10 }}>{reactions[0]}</Text>
                                </View>
                            )}
                        </View>
                    )}
                </TouchableOpacity>
            </View>
        );
    };

    /* -------------------- render -------------------- */

    return (
        <ScreenWrapper
            style={styles.container}
            edges={['top', 'left', 'right']}
        >

            {/* Header */}
            <View
                style={[
                    styles.header,
                    {
                        backgroundColor: colors.background,
                        borderBottomColor: colors.itemSeparator,
                    },
                ]}
            >
                <TouchableOpacity
                    onPress={() => router.back()}
                    style={styles.backButton}
                >
                    <FontAwesome
                        name="chevron-left"
                        size={20}
                        color={colors.text}
                    />
                </TouchableOpacity>

                <Image
                    source={
                        chat.avatar
                            ? { uri: chat.avatar }
                            : require('@/assets/images/default-avatar.png')
                    }
                    style={styles.headerAvatar}
                />

                <View style={styles.headerInfo}>
                    <Text
                        style={[
                            styles.headerName,
                            { color: colors.text },
                        ]}
                    >
                        {chat.name}
                    </Text>
                    <Text
                        style={[
                            styles.headerStatus,
                            { color: colors.accent },
                        ]}
                    >
                        {typingUsers[chat.id]
                            ? `${typingUsers[chat.id]} is typing...`
                            : chat.status || 'Online'}
                    </Text>
                </View>

                <TouchableOpacity onPress={() => setChatOptionsVisible(true)} style={{ padding: 10 }}>
                    <MaterialCommunityIcons name="dots-vertical" size={24} color={colors.text} />
                </TouchableOpacity>

                {/* Chat Options Modal */}
                <Modal
                    transparent={true}
                    visible={chatOptionsVisible}
                    animationType="fade"
                    onRequestClose={() => setChatOptionsVisible(false)}
                >
                    <Pressable style={styles.modalOverlay} onPress={() => setChatOptionsVisible(false)}>
                        <View style={[styles.chatOptionsContainer, { backgroundColor: colors.background, borderColor: colors.itemSeparator }]}>
                            <TouchableOpacity onPress={handleDeleteChat} style={styles.menuOption}>
                                <Text style={{ color: 'red', fontSize: 16 }}>Delete Chat</Text>
                                <MaterialCommunityIcons name="trash-can-outline" size={20} color="red" />
                            </TouchableOpacity>
                        </View>
                    </Pressable>
                </Modal>

                {/* Message Options Modal */}
                <Modal
                    transparent={true}
                    visible={modalVisible}
                    animationType="fade"
                    onRequestClose={() => setModalVisible(false)}
                >
                    <Pressable style={styles.modalOverlay} onPress={() => setModalVisible(false)}>
                        <View style={[styles.modalContent, { backgroundColor: colors.background }]}>
                            {selectedMessage && (
                                <>
                                    <View style={styles.reactionRow}>
                                        {['👍', '❤️', '😂', '😮', '😢', '😡'].map((emoji) => (
                                            <TouchableOpacity key={emoji} onPress={() => handleReact(emoji)} style={styles.reactionButton}>
                                                <Text style={{ fontSize: 24 }}>{emoji}</Text>
                                            </TouchableOpacity>
                                        ))}
                                    </View>

                                    <View style={{ height: 1, backgroundColor: colors.itemSeparator, marginVertical: 10 }} />

                                    {selectedMessage.sender === 'me' && (
                                        <>
                                            <TouchableOpacity onPress={handleEditOption} style={styles.menuOption}>
                                                <Text style={{ color: colors.text, fontSize: 16 }}>Edit</Text>
                                                <MaterialCommunityIcons name="pencil-outline" size={20} color={colors.text} />
                                            </TouchableOpacity>
                                            <TouchableOpacity onPress={handleDeleteOption} style={styles.menuOption}>
                                                <Text style={{ color: 'red', fontSize: 16 }}>Delete</Text>
                                                <MaterialCommunityIcons name="trash-can-outline" size={20} color="red" />
                                            </TouchableOpacity>
                                        </>
                                    )}
                                    <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.menuOption}>
                                        <Text style={{ color: colors.text, fontSize: 16 }}>Cancel</Text>
                                    </TouchableOpacity>
                                </>
                            )}
                        </View>
                    </Pressable>
                </Modal>
            </View>

            <KeyboardAvoidingView
                style={{ flex: 1 }}
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 90 + insets.top : 0}
            >
                <FlatList
                    ref={flatListRef}
                    data={[...chat.messages]}
                    keyExtractor={(item) => item.id}
                    renderItem={renderMessage}
                    style={{ flex: 1 }}
                    contentContainerStyle={styles.listContent}
                    keyboardDismissMode="interactive"
                    keyboardShouldPersistTaps="handled"
                />

                {/* Input */}
                <View
                    style={[
                        styles.inputContainer,
                        {
                            paddingBottom: !keyboardVisible
                                ? insets.bottom
                                : 10,
                            borderTopColor: colors.itemSeparator,
                            backgroundColor: colors.background,
                        },
                    ]}
                >
                    <TouchableOpacity
                        style={[
                            styles.attachButton,
                            { backgroundColor: colors.messageBubbleThem },
                        ]}
                        onPress={() => {
                            if (editingMessageId) {
                                setEditingMessageId(null);
                                setText('');
                            }
                        }}
                    >
                        <FontAwesome
                            name={editingMessageId ? "times" : "plus"}
                            size={20}
                            color={colors.text}
                        />
                    </TouchableOpacity>

                    <TextInput
                        style={[
                            styles.input,
                            {
                                backgroundColor: colors.inputBackground,
                                color: colors.text,
                            },
                        ]}
                        value={text}
                        onChangeText={handleTextChange}
                        placeholder="Type a message..."
                        placeholderTextColor={colors.tabIconDefault}
                        multiline
                        maxLength={1000}
                    />

                    <TouchableOpacity
                        onPress={handleSend}
                        disabled={!text.trim()}
                    >
                        <LinearGradient
                            colors={[colors.primary, colors.secondary]}
                            style={styles.sendButton}
                        >
                            <FontAwesome
                                name={editingMessageId ? "check" : "send"}
                                size={16}
                                color="white"
                            />
                        </LinearGradient>
                    </TouchableOpacity>
                </View>
            </KeyboardAvoidingView>
        </ScreenWrapper>
    );
}

/* -------------------- styles -------------------- */

const styles = StyleSheet.create({
    container: { flex: 1 },

    header: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 10,
        borderBottomWidth: 1,
    },
    backButton: { padding: 10 },
    headerAvatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        marginLeft: 5,
    },
    headerInfo: { flex: 1, marginLeft: 10 },
    headerName: { fontSize: 16, fontWeight: 'bold' },
    headerStatus: { fontSize: 12 },

    listContent: { padding: 15 },

    messageContainer: {
        marginBottom: 10,
        maxWidth: '80%',
    },
    myMessageContainer: { alignSelf: 'flex-start' },
    theirMessageContainer: { alignSelf: 'flex-end' },

    messageBubbleThem: {
        padding: 12,
        borderRadius: 20,
        borderBottomRightRadius: 4,
    },
    messageBubbleMe: {
        padding: 12,
        borderRadius: 20,
        borderBottomLeftRadius: 4,
    },

    messageText: { fontSize: 16 },
    timestamp: {
        fontSize: 10,
        opacity: 0.7,
        alignSelf: 'flex-end',
        marginTop: 4,
    },

    readRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'flex-end',
        marginTop: 4,
    },

    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 10,
        paddingTop: 10,
        borderTopWidth: 1,
    },
    attachButton: {
        padding: 10,
        borderRadius: 20,
        marginRight: 10,
    },
    input: {
        flex: 1,
        borderRadius: 20,
        paddingHorizontal: 15,
        paddingVertical: 10,
        marginRight: 10,
        maxHeight: 100,
    },
    sendButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        alignItems: 'center',
        justifyContent: 'center',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContent: {
        width: '80%',
        borderRadius: 20,
        padding: 20,
        elevation: 5,
    },
    reactionRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 10,
    },
    reactionButton: {
        padding: 5,
    },
    menuOption: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 12,
    },
    chatOptionsContainer: {
        position: 'absolute',
        top: 60,
        right: 10,
        width: 150,
        borderRadius: 10,
        padding: 10,
        elevation: 5,
        borderWidth: 1,
    },
    reactionBadge: {
        position: 'absolute',
        bottom: -10,
        right: -5,
        backgroundColor: 'white',
        borderRadius: 10,
        paddingHorizontal: 5,
        paddingVertical: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.2,
        shadowRadius: 1,
        elevation: 2,
        borderWidth: 1,
        borderColor: '#eee'
    }
});
