import React from 'react';
import { View, TextInput, TouchableOpacity, StyleSheet, Text, ActivityIndicator, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import * as DocumentPicker from 'expo-document-picker';
import { useAppTheme } from '@/hooks/useAppTheme';
import { api } from '@/services/api';
import { useStore } from '@/store';
import { Message } from '@/types';
import * as Haptics from 'expo-haptics';

interface ChatInputProps {
    text: string;
    setText: (text: string) => void;
    handleSend: () => void;
    editingMessageId: string | null;
    setEditingMessageId: (id: string | null) => void;
    replyingToMessage: Message | null;
    setReplyingToMessage: (msg: Message | null) => void;
    insets: { bottom: number };
    keyboardVisible: boolean;
    chatId: string; // Added chatId
}

export const ChatInput = ({
    text,
    setText,
    handleSend,
    editingMessageId,
    setEditingMessageId,
    replyingToMessage,
    setReplyingToMessage,
    insets,
    keyboardVisible,
    chatId,
}: ChatInputProps) => {
    const { colors } = useAppTheme();
    const sendFileMessage = useStore(state => state.sendFileMessage);
    const [uploading, setUploading] = React.useState(false);
    const [showAttachMenu, setShowAttachMenu] = React.useState(false);
    const [selectedFile, setSelectedFile] = React.useState<any>(null);

    const handleAttachment = async (type: string = '*/*') => {
        setShowAttachMenu(false);
        try {
            const result = await DocumentPicker.getDocumentAsync({
                type: type,
                copyToCacheDirectory: true,
            });

            if (result.canceled) return;

            const file = result.assets[0];
            // Show preview instead of sending immediately
            setSelectedFile(file);

        } catch (error) {
            console.error('File pick error', error);
        }
    };

    const handleSendFile = async () => {
        if (!selectedFile) return;

        try {
            setUploading(true);
            await sendFileMessage(chatId, selectedFile, text, replyingToMessage?.id);
            setSelectedFile(null);
            setText('');
            setReplyingToMessage(null);
        } catch (error) {
            console.error('Send file error', error);
        } finally {
            setUploading(false);
        }
    };

    const handleCancelFile = () => {
        setSelectedFile(null);
    };

    return (
        <View style={{ backgroundColor: colors.background, paddingBottom: !keyboardVisible ? Math.max(insets.bottom, 20) : 40, zIndex: 10 }}>
            {showAttachMenu && (
                <View style={[styles.attachMenu, { backgroundColor: colors.background, borderColor: colors.border, borderWidth: 1, zIndex: 10, marginBottom: 15 }]}>
                    <TouchableOpacity onPress={() => handleAttachment('*/*')} style={styles.menuItem}>
                        <FontAwesome name="file-text-o" size={20} color={colors.text} style={{ width: 25 }} />
                        <Text style={[styles.menuText, { color: colors.text }]}>Document</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => handleAttachment('image/*')} style={styles.menuItem}>
                        <FontAwesome name="image" size={20} color={colors.text} style={{ width: 25 }} />
                        <Text style={[styles.menuText, { color: colors.text }]}>Image</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => handleAttachment('video/*')} style={styles.menuItem}>
                        <FontAwesome name="video-camera" size={20} color={colors.text} style={{ width: 25 }} />
                        <Text style={[styles.menuText, { color: colors.text }]}>Video</Text>
                    </TouchableOpacity>
                </View>
            )}
            {replyingToMessage && (
                <View style={[styles.replyPreview, { backgroundColor: colors.inputBackground, marginHorizontal: 15, borderRadius: 15 }]}>
                    <View style={[styles.replyBar, { backgroundColor: colors.primary }]} />
                    <View style={{ flex: 1, marginLeft: 10 }}>
                        <Text style={{ color: colors.primary, fontWeight: 'bold' }}>Replying to {replyingToMessage.sender === 'me' ? 'Yourself' : 'Them'}</Text>
                        <Text numberOfLines={1} style={{ color: colors.text }}>{replyingToMessage.text}</Text>
                    </View>
                    <TouchableOpacity onPress={() => setReplyingToMessage(null)}>
                        <FontAwesome name="times" size={16} color={colors.text} />
                    </TouchableOpacity>
                </View>
            )}
            {selectedFile && (
                <View style={[styles.filePreview, { backgroundColor: colors.inputBackground, marginHorizontal: 15, borderRadius: 15 }]}>
                    {selectedFile.mimeType?.startsWith('image/') ? (
                        <Image
                            source={{ uri: selectedFile.uri }}
                            style={styles.previewImage}
                            resizeMode="cover"
                        />
                    ) : (
                        <View style={styles.fileInfo}>
                            <FontAwesome name="file" size={40} color={colors.text} />
                            <Text style={[styles.fileName, { color: colors.text }]} numberOfLines={1}>
                                {selectedFile.name}
                            </Text>
                            <Text style={[styles.fileSize, { color: colors.tabIconDefault }]}>
                                {(selectedFile.size / 1024).toFixed(2)} KB
                            </Text>
                        </View>
                    )}
                    <TouchableOpacity onPress={handleCancelFile} style={styles.cancelFileButton}>
                        <FontAwesome name="times-circle" size={24} color={colors.text} />
                    </TouchableOpacity>
                </View>
            )}
            <View
                style={[
                    styles.inputContainer,
                    {
                        paddingTop: 10,
                        paddingHorizontal: 15,
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
                        } else {
                            setShowAttachMenu(!showAttachMenu);
                        }
                    }}
                >
                    {uploading ? (
                        <ActivityIndicator color={colors.text} size="small" />
                    ) : (
                        <FontAwesome
                            name={editingMessageId ? "times" : "plus"}
                            size={20}
                            color={colors.text}
                        />
                    )}
                </TouchableOpacity>

                <TextInput
                    style={[
                        styles.input,
                        {
                            backgroundColor: colors.inputBackground,
                            color: colors.text,
                            borderColor: 'transparent',
                            borderWidth: 0,
                        },
                    ]}
                    value={text}
                    onChangeText={setText}
                    placeholder="Type a message..."
                    placeholderTextColor={colors.tabIconDefault}
                    multiline
                    maxLength={1000}
                />

                <TouchableOpacity
                    onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                        selectedFile ? handleSendFile() : handleSend();
                    }}
                    disabled={!selectedFile && !text.trim()}
                    style={styles.sendButtonContainer}
                >
                    <LinearGradient
                        colors={[colors.primary, colors.secondary]}
                        style={styles.sendButton}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                    >
                        <FontAwesome
                            name={editingMessageId ? "check" : "paper-plane"}
                            size={18}
                            color="white"
                            style={{ marginLeft: editingMessageId ? 0 : -2 }} // Adjust icon center
                        />
                    </LinearGradient>
                </TouchableOpacity>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 10,
    },
    attachButton: {
        padding: 10,
        borderRadius: 22,
        marginRight: 10,
        width: 44,
        height: 44,
        alignItems: 'center',
        justifyContent: 'center'
    },
    input: {
        flex: 1,
        borderRadius: 22, // Full pill shape
        paddingHorizontal: 20,
        paddingVertical: 12,
        marginRight: 10,
        maxHeight: 100,
        fontSize: 16,
    },
    sendButtonContainer: {
        shadowColor: "#000",
        shadowOffset: {
            width: 0,
            height: 4,
        },
        shadowOpacity: 0.3,
        shadowRadius: 4.65,
        elevation: 8,
    },
    sendButton: {
        width: 48,
        height: 48,
        borderRadius: 24,
        alignItems: 'center',
        justifyContent: 'center',
    },
    replyPreview: {
        flexDirection: 'row',
        padding: 10,
        alignItems: 'center',
        borderBottomWidth: 0,
        marginBottom: 5,
    },
    replyBar: {
        width: 4,
        borderRadius: 2,
        marginRight: 5,
    },
    attachMenu: {
        position: 'absolute',
        bottom: 80,
        left: 15,
        borderRadius: 12,
        padding: 5,
        shadowColor: "#000",
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.1,
        shadowRadius: 3.84,
        elevation: 5,
        width: 150,
    },
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 10,
    },
    menuText: {
        fontSize: 16,
        marginLeft: 10,
    },
    filePreview: {
        padding: 12,
        marginBottom: 10,
        position: 'relative',
    },
    previewImage: {
        width: '100%',
        height: 200,
        borderRadius: 12,
    },
    fileInfo: {
        alignItems: 'center',
        paddingVertical: 20,
    },
    fileName: {
        fontSize: 14,
        fontWeight: '600',
        marginTop: 10,
        maxWidth: '80%',
    },
    fileSize: {
        fontSize: 12,
        marginTop: 4,
    },
    cancelFileButton: {
        position: 'absolute',
        top: 8,
        right: 8,
        padding: 4,
    },
});
