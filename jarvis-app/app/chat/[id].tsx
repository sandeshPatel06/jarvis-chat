import { View } from '@/components/Themed';
import { useAppTheme } from '@/hooks/useAppTheme';
import { useStore } from '@/store';
import { Message } from '@/types';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
    FlatList,
    Keyboard,
    Platform,
    StyleSheet,
    TouchableOpacity,
    Modal,
    Pressable,
    Text,
    LayoutAnimation,
    TextInput
} from 'react-native';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ScreenWrapper } from '@/components/ScreenWrapper';
import { ChatHeader, ChatInput, MessageItem, ForwardMessageModal } from '@/components/chat';
import * as Clipboard from 'expo-clipboard';

export default function ChatDetailScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { colors } = useAppTheme();

    const chats = useStore((state) => state.chats);
    const sendMessage = useStore((state) => state.sendMessage);
    const fetchMessages = useStore((state) => state.fetchMessages);
    const loadMoreMessages = useStore((state) => state.loadMoreMessages); // New
    const connectWebSocket = useStore((state) => state.connectWebSocket);
    const typingUsers = useStore((state) => state.typingUsers);
    const sendTyping = useStore((state) => state.sendTyping);

    const markRead = useStore((state) => state.markRead);
    const editMessage = useStore((state) => state.editMessage);
    const deleteMessage = useStore((state) => state.deleteMessage);
    const reactToMessage = useStore((state) => state.reactToMessage);
    const deleteChat = useStore((state) => state.deleteChat);
    const forwardMessage = useStore((state) => state.forwardMessage);
    const showAlert = useStore((state) => state.showAlert);

    const [text, setText] = useState('');
    const [keyboardVisible, setKeyboardVisible] = useState(false);

    // Message Context Menu State
    const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
    const [modalVisible, setModalVisible] = useState(false);
    const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
    const [replyingToMessage, setReplyingToMessage] = useState<Message | null>(null);
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const [customEmoji, setCustomEmoji] = useState('');

    // Chat Options
    const [chatOptionsVisible, setChatOptionsVisible] = useState(false);
    const [loadingMore, setLoadingMore] = useState(false); // New

    // Forward Message State
    const [forwardModalVisible, setForwardModalVisible] = useState(false);
    const [messageToForward, setMessageToForward] = useState<Message | null>(null);

    const flatListRef = useRef<FlatList>(null);
    const lastTypingSent = useRef<number>(0);

    /* -------------------- lifecycle -------------------- */
    useEffect(() => {
        if (id) {
            useStore.getState().setActiveChat(id);
            fetchMessages(id);
            connectWebSocket();
        }
        return () => {
            useStore.getState().setActiveChat(null);
        };
    }, [id]);

    const animationsEnabled = useStore((state) => state.animationsEnabled);

    useEffect(() => {
        const show = Keyboard.addListener('keyboardDidShow', () => {
            setKeyboardVisible(true);
            if (animationsEnabled) LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        });
        const hide = Keyboard.addListener('keyboardDidHide', () => {
            setKeyboardVisible(false);
            if (animationsEnabled) LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        });
        return () => {
            show.remove();
            hide.remove();
        };
    }, [animationsEnabled]);

    useEffect(() => {
        if (animationsEnabled && chats) LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    }, [chats, animationsEnabled]);

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
                <Text style={{ color: colors.text }}>Chat not found</Text>
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
                sendMessage(chat.id, text.trim(), replyingToMessage?.id);
                setReplyingToMessage(null);
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
            setShowEmojiPicker(false);
            setCustomEmoji('');
        }
    };

    const handleOpenEmojiPicker = () => {
        setShowEmojiPicker(true);
    };

    const handleCustomEmojiSubmit = () => {
        if (customEmoji.trim()) {
            handleReact(customEmoji.trim());
        }
    };

    const handleReplyOption = () => {
        if (selectedMessage) {
            setReplyingToMessage(selectedMessage);
            setModalVisible(false);
            setSelectedMessage(null);
        }
    };

    const handleCopyOption = async () => {
        if (selectedMessage) {
            await Clipboard.setStringAsync(selectedMessage.text);
            setModalVisible(false);
            setSelectedMessage(null);
            // Optional: show a small toast if available, or just close modal
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
                showAlert("Time Limit Exceeded", "You can only edit messages sent within the last 30 minutes.");
            }
        }
    };

    const handleDeleteOption = () => {
        if (selectedMessage) {
            const now = new Date();
            const msgTime = new Date(selectedMessage.timestamp);
            const diffMins = (now.getTime() - msgTime.getTime()) / 60000;

            if (diffMins <= 60) {
                showAlert(
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
                showAlert("Time Limit Exceeded", "You can only delete messages sent within the last 1 hour.");
            }
        }
    };

    const handleDeleteChat = () => {
        showAlert(
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

    const handleSwipeReply = (message: Message) => {
        setReplyingToMessage(message);
    };

    const handleSwipeForward = (message: Message) => {
        setMessageToForward(message);
        setForwardModalVisible(true);
    };

    const handleForwardSubmit = async (chatIds: string[]) => {
        if (messageToForward) {
            await forwardMessage(messageToForward, chatIds);
            setForwardModalVisible(false);
            setMessageToForward(null);
        }
    };

    const renderMessage = ({ item }: { item: Message }) => {
        return <MessageItem item={item} onLongPress={handleLongPressMessage} onSwipeReply={handleSwipeReply} onSwipeForward={handleSwipeForward} />;
    };

    const handleLoadMore = async () => {
        if (loadingMore || chat.messages.length < 20) return;
        setLoadingMore(true);
        await loadMoreMessages(chat.id);
        setLoadingMore(false);
    };

    const renderFooter = () => {
        if (!loadingMore) return null;
        return (
            <View style={{ padding: 10, alignItems: 'center' }}>
                <Text style={{ color: colors.text, fontSize: 12 }}>Loading more...</Text>
            </View>
        );
    };

    /* -------------------- render -------------------- */
    return (
        <ScreenWrapper
            style={styles.container}
            edges={['top', 'left', 'right']}
        >
            <ChatHeader
                chat={chat}
                typingUser={typingUsers[chat.id] || null}
                onOptionsPress={() => setChatOptionsVisible(true)}
            />

            {/* Chat Options Modal */}
            <Modal
                transparent={true}
                visible={chatOptionsVisible}
                animationType="fade"
                onRequestClose={() => setChatOptionsVisible(false)}
            >
                <Pressable style={styles.modalOverlay} onPress={() => setChatOptionsVisible(false)}>
                    <View style={[styles.chatOptionsContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
                        <TouchableOpacity onPress={handleDeleteChat} style={styles.menuOption}>
                            <Text style={{ color: colors.error, fontSize: 16 }}>Delete Chat</Text>
                            <MaterialCommunityIcons name="trash-can-outline" size={20} color={colors.error} />
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
                                {!showEmojiPicker ? (
                                    <View style={styles.reactionRow}>
                                        {['👍', '❤️', '😂', '😮', '😢'].map((emoji) => (
                                            <TouchableOpacity key={emoji} onPress={() => handleReact(emoji)} style={styles.reactionButton}>
                                                <Text style={{ fontSize: 24 }}>{emoji}</Text>
                                            </TouchableOpacity>
                                        ))}
                                        <TouchableOpacity onPress={handleOpenEmojiPicker} style={styles.reactionButton}>
                                            <Text style={{ fontSize: 24 }}>➕</Text>
                                        </TouchableOpacity>
                                    </View>
                                ) : (
                                    <View style={styles.emojiPickerContainer}>
                                        <TextInput
                                            style={[styles.emojiInput, { color: colors.text, borderColor: colors.border }]}
                                            placeholder="Type or paste emoji..."
                                            placeholderTextColor={colors.tabIconDefault}
                                            value={customEmoji}
                                            onChangeText={setCustomEmoji}
                                            autoFocus
                                            onSubmitEditing={handleCustomEmojiSubmit}
                                        />
                                        <TouchableOpacity onPress={handleCustomEmojiSubmit} style={[styles.emojiSubmitButton, { backgroundColor: colors.primary }]}>
                                            <MaterialCommunityIcons name="send" size={20} color="white" />
                                        </TouchableOpacity>
                                        <TouchableOpacity onPress={() => { setShowEmojiPicker(false); setCustomEmoji(''); }} style={styles.emojiCancelButton}>
                                            <MaterialCommunityIcons name="close" size={20} color={colors.text} />
                                        </TouchableOpacity>
                                    </View>
                                )}

                                <View style={{ height: 1, backgroundColor: colors.border, marginVertical: 10 }} />

                                {selectedMessage && (
                                    <>
                                        <TouchableOpacity onPress={handleReplyOption} style={styles.menuOption}>
                                            <Text style={{ color: colors.text, fontSize: 16 }}>Reply</Text>
                                            <MaterialCommunityIcons name="reply" size={20} color={colors.text} />
                                        </TouchableOpacity>

                                        <TouchableOpacity onPress={handleCopyOption} style={styles.menuOption}>
                                            <Text style={{ color: colors.text, fontSize: 16 }}>Copy</Text>
                                            <MaterialCommunityIcons name="content-copy" size={20} color={colors.text} />
                                        </TouchableOpacity>

                                        {selectedMessage.sender === 'me' && (
                                            <>
                                                <TouchableOpacity onPress={handleEditOption} style={styles.menuOption}>
                                                    <Text style={{ color: colors.text, fontSize: 16 }}>Edit</Text>
                                                    <MaterialCommunityIcons name="pencil-outline" size={20} color={colors.text} />
                                                </TouchableOpacity>
                                                <TouchableOpacity onPress={handleDeleteOption} style={styles.menuOption}>
                                                    <Text style={{ color: colors.error, fontSize: 16 }}>Delete</Text>
                                                    <MaterialCommunityIcons name="trash-can-outline" size={20} color={colors.error} />
                                                </TouchableOpacity>
                                            </>
                                        )}
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

            <KeyboardAvoidingView
                style={{ flex: 1 }}
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 90 + insets.top : 0}
            >
                <FlatList
                    ref={flatListRef}
                    data={chat.messages} // Messages are now stored Newest -> Oldest
                    keyExtractor={(item) => item.id.toString()}
                    renderItem={renderMessage}
                    inverted={true} // Inverted list: Bottom is Index 0 (Newest)
                    style={{ flex: 1 }}
                    contentContainerStyle={styles.listContent}
                    keyboardDismissMode="interactive"
                    keyboardShouldPersistTaps="handled"
                    onEndReached={handleLoadMore}
                    onEndReachedThreshold={0.5}
                    ListFooterComponent={renderFooter} // Appears at TOP of inverted list
                />

                <ChatInput
                    chatId={chat.id}
                    text={text}
                    setText={handleTextChange}
                    handleSend={handleSend}
                    editingMessageId={editingMessageId}
                    setEditingMessageId={setEditingMessageId}
                    replyingToMessage={replyingToMessage}
                    setReplyingToMessage={setReplyingToMessage}
                    insets={insets}
                    keyboardVisible={keyboardVisible}
                />
            </KeyboardAvoidingView>

            {/* Forward Message Modal */}
            <ForwardMessageModal
                visible={forwardModalVisible}
                onClose={() => setForwardModalVisible(false)}
                message={messageToForward}
                chats={chats.filter(c => c.id !== chat.id)}
                onForward={handleForwardSubmit}
            />
        </ScreenWrapper>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    listContent: { padding: 15 },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.4)',
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
    emojiPickerContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 10,
        gap: 8,
    },
    emojiInput: {
        flex: 1,
        borderWidth: 1,
        borderRadius: 12,
        paddingHorizontal: 12,
        paddingVertical: 8,
        fontSize: 16,
    },
    emojiSubmitButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
    },
    emojiCancelButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
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
});
