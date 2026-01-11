import { Text, View } from '@/components/Themed';
import Colors from '@/constants/Colors';
import { Message, useStore } from '@/store';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { FlatList, Image, KeyboardAvoidingView, Platform, StyleSheet, TextInput, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function ChatDetailScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const router = useRouter();
    const chats = useStore((state) => state.chats);
    const sendMessage = useStore((state) => state.sendMessage);
    const fetchMessages = useStore((state) => state.fetchMessages);
    const connectWebSocket = useStore((state) => state.connectWebSocket);
    const typingUsers = useStore((state) => state.typingUsers);
    const sendTyping = useStore((state) => state.sendTyping);

    // Typing throttle ref
    const lastTypingSent = useRef<number>(0);

    const markRead = useStore((state) => state.markRead);

    useEffect(() => {
        if (id) {
            fetchMessages(id);
            connectWebSocket(); // Ensure WS is connected when entering chat
        }
    }, [id]);

    // Mark unread messages as read when chat is open
    useEffect(() => {
        const chat = chats.find((c) => c.id === id);
        if (chat && chat.messages) {
            chat.messages.forEach(msg => {
                if (msg.sender === 'them' && !msg.isRead) {
                    markRead(chat.id, msg.id);
                }
            });
        }
    }, [chats, id]); // Re-run when chats update (new messages)

    const chat = chats.find((c) => c.id === id);
    const [text, setText] = useState('');
    const flatListRef = useRef<FlatList>(null);

    if (!chat) {
        return (
            <View style={styles.container}>
                <Text style={{ color: 'white' }}>Chat not found</Text>
            </View>
        );
    }

    const handleTextChange = (newText: string) => {
        setText(newText);

        // Throttle typing events: only send once every 2 seconds
        const now = Date.now();
        if (newText.length > 0 && now - lastTypingSent.current > 2000) {
            sendTyping(chat.id);
            lastTypingSent.current = now;
        }
    };

    const handleSend = () => {
        if (text.trim()) {
            sendMessage(chat.id, text.trim());
            setText('');
        }
    };

    const renderMessage = ({ item }: { item: Message }) => {
        const isMe = item.sender === 'me';
        return (
            <View style={[
                styles.messageContainer,
                isMe ? styles.myMessageContainer : styles.theirMessageContainer
            ]}>
                {!isMe && (
                    <LinearGradient
                        colors={[Colors.dark.secondary, Colors.dark.primary]}
                        style={styles.messageBubbleThem}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                    >
                        <Text style={styles.messageText}>{item.text}</Text>
                        <Text style={styles.timestamp}>{item.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
                    </LinearGradient>
                )}
                {isMe && (
                    <View style={styles.messageBubbleMe}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', marginTop: 4 }}>
                            <Text style={{ fontSize: 10, color: '#aaa', marginRight: 4 }}>
                                {item.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </Text>
                            <FontAwesome
                                name={item.isRead ? "check-circle" : "check"}
                                size={12}
                                color={item.isRead ? Colors.dark.accent : "gray"}
                            />
                        </View>
                    </View>
                )}
            </View>
        );
    };

    return (
        <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
            {/* Custom Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <FontAwesome name="chevron-left" size={20} color={Colors.dark.text} />
                </TouchableOpacity>
                <Image source={chat.avatar ? { uri: chat.avatar } : require('@/assets/images/default-avatar.png')} style={styles.headerAvatar} />
                <View style={styles.headerInfo}>
                    <Text style={styles.headerName}>{chat.name}</Text>
                    <Text style={styles.headerStatus}>
                        {typingUsers[chat.id]
                            ? `${typingUsers[chat.id]} is typing...`
                            : (chat.status || 'Online')}
                    </Text>
                </View>
                <View style={styles.headerIcons}>
                    <TouchableOpacity style={styles.iconButton}><FontAwesome name="video-camera" size={20} color={Colors.dark.text} /></TouchableOpacity>
                    <TouchableOpacity style={styles.iconButton}><FontAwesome name="phone" size={20} color={Colors.dark.text} /></TouchableOpacity>
                </View>
            </View>

            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                style={{ flex: 1 }}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 0}
            >
                <FlatList
                    ref={flatListRef}
                    data={[...chat.messages].reverse()} // Reverse for inverted list
                    keyExtractor={(item) => item.id}
                    renderItem={renderMessage}
                    inverted
                    contentContainerStyle={styles.listContent}
                />

                {/* Input Area */}
                <View style={styles.inputContainer}>
                    <TouchableOpacity style={styles.attachButton}>
                        <FontAwesome name="plus" size={20} color={Colors.dark.text} />
                    </TouchableOpacity>
                    <TextInput
                        style={styles.input}
                        value={text}
                        onChangeText={handleTextChange}
                        placeholder="Type a message..."
                        placeholderTextColor="#666"
                        multiline
                    />
                    <TouchableOpacity onPress={handleSend} disabled={!text.trim()}>
                        <LinearGradient
                            colors={[Colors.dark.primary, Colors.dark.secondary]}
                            style={styles.sendButton}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                        >
                            <FontAwesome name="send" size={16} color="white" style={{ marginLeft: 2 }} />
                        </LinearGradient>
                    </TouchableOpacity>
                </View>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.dark.background,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 10,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.1)',
        backgroundColor: Colors.dark.background,
    },
    backButton: {
        padding: 10,
    },
    headerAvatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        marginLeft: 5,
    },
    headerInfo: {
        flex: 1,
        marginLeft: 10,
    },
    headerName: {
        fontSize: 16,
        fontWeight: 'bold',
        color: Colors.dark.text,
    },
    headerStatus: {
        fontSize: 12,
        color: Colors.dark.accent,
    },
    headerIcons: {
        flexDirection: 'row',
    },
    iconButton: {
        padding: 10,
        marginLeft: 5,
    },
    listContent: {
        padding: 15,
    },
    messageContainer: {
        marginBottom: 10,
        maxWidth: '80%',
    },
    myMessageContainer: {
        alignSelf: 'flex-start',
    },
    theirMessageContainer: {
        alignSelf: 'flex-end',
    },
    messageBubbleThem: {
        padding: 12,
        borderRadius: 20,
        borderBottomRightRadius: 4,
    },
    messageBubbleMe: {
        backgroundColor: '#333',
        padding: 12,
        borderRadius: 20,
        borderBottomLeftRadius: 4,
    },
    messageText: {
        color: 'white',
        fontSize: 16,
    },
    messageTextMe: {
        color: 'white',
        fontSize: 16,
    },
    timestamp: {
        fontSize: 10,
        color: 'white',
        opacity: 0.7,
        alignSelf: 'flex-end',
        marginTop: 4,
    },
    timestampMe: {
        fontSize: 10,
        color: '#aaa',
        alignSelf: 'flex-end',
        marginTop: 4,
        flexDirection: 'row',
        alignItems: 'center',
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 10,
        borderTopWidth: 1,
        borderTopColor: 'rgba(255,255,255,0.1)',
        backgroundColor: Colors.dark.background,
    },
    attachButton: {
        padding: 10,
        backgroundColor: '#333',
        borderRadius: 20,
        marginRight: 10,
    },
    input: {
        flex: 1,
        backgroundColor: '#222',
        color: 'white',
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
});
