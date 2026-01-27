import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Swipeable } from 'react-native-gesture-handler';
import { Message } from '@/types';
import { useAppTheme } from '@/hooks/useAppTheme';
import { MediaViewer } from './MediaViewer';

interface MessageItemProps {
    item: Message;
    onLongPress: (message: Message) => void;
    onSwipeReply?: (message: Message) => void;
    onSwipeForward?: (message: Message) => void;
}

export const MessageItemComponent = ({ item, onLongPress, onSwipeReply, onSwipeForward }: MessageItemProps) => {
    const { colors, isDark } = useAppTheme();
    const isMe = item.sender === 'me';
    const reactions = item.reactions || [];
    const swipeableRef = React.useRef<Swipeable>(null);
    const [imageError, setImageError] = React.useState(false);
    const [viewerVisible, setViewerVisible] = React.useState(false);

    const handleMediaPress = () => {
        if (item.file && item.file_type) {
            // Open full-screen viewer for images and videos
            if (item.file_type.startsWith('image/') || item.file_type.startsWith('video/')) {
                setViewerVisible(true);
            }
        }
    };

    const getMediaType = (): 'image' | 'video' | null => {
        if (!item.file_type) return null;
        if (item.file_type.startsWith('image/')) return 'image';
        if (item.file_type.startsWith('video/')) return 'video';
        return null;
    };

    const handleImageError = (e: any) => {
        console.log('Image load error:', e.nativeEvent.error);
        setImageError(true);
    };

    // Get the image source URI - use local file if available, otherwise construct remote URL
    const getImageSource = () => {
        if (!item.file || imageError) {
            // Fallback to remote file if local file failed or doesn't exist
            if ((item as any).remoteFile) {
                const { getMediaUrl } = require('@/utils/media');
                const remoteUrl = getMediaUrl((item as any).remoteFile);
                if (remoteUrl) {
                    return { uri: remoteUrl };
                }
            }
            return null;
        }

        // item.file could be a string URI or an object with a uri property
        const uri = typeof item.file === 'string' ? item.file : (item.file as any).uri;

        if (uri) {
            return { uri };
        }

        return null;
    };


    const renderLeftActions = (progress: any, dragX: any) => {
        return (
            <View style={styles.swipeLeftAction}>
                <MaterialCommunityIcons name="reply" size={24} color={colors.primary} />
            </View>
        );
    };

    const handleSwipeOpen = (direction: 'left' | 'right') => {
        if (direction === 'left' && onSwipeReply) {
            onSwipeReply(item);
            swipeableRef.current?.close();
        } else if (direction === 'right' && onSwipeForward) {
            onSwipeForward(item);
            swipeableRef.current?.close();
        }
    };

    const renderRightActions = (progress: any, dragX: any) => {
        return (
            <View style={styles.swipeRightAction}>
                <MaterialCommunityIcons name="share" size={24} color={colors.primary} />
            </View>
        );
    };

    return (
        <Swipeable
            ref={swipeableRef}
            renderLeftActions={renderLeftActions}
            renderRightActions={renderRightActions}
            onSwipeableOpen={(direction) => handleSwipeOpen(direction)}
            overshootLeft={false}
            overshootRight={false}
            friction={2}
            leftThreshold={80}
            rightThreshold={80}
        >
            <View
                style={[
                    styles.messageContainer,
                    isMe ? styles.myMessageContainer : styles.theirMessageContainer,
                ]}
            >
                <TouchableOpacity
                    onLongPress={() => onLongPress(item)}
                    delayLongPress={300}
                    activeOpacity={0.8}
                >
                    {!isMe ? (
                        <View>
                            <View
                                style={[
                                    styles.messageBubbleThem,
                                    { backgroundColor: colors.messageBubbleThem }
                                ]}
                            >
                                {item.reply_to && (
                                    <View style={[styles.replyContainer, { backgroundColor: colors.backgroundSecondary, borderLeftColor: colors.primary }]}>
                                        <View style={[styles.replyBar, { backgroundColor: colors.primary }]} />
                                        <View style={{ flex: 1 }}>
                                            <Text numberOfLines={1} style={[styles.replySender, { color: colors.primary }]}>{item.reply_to.sender}</Text>
                                            <Text numberOfLines={1} style={[styles.replyText, { color: colors.text }]}>{item.reply_to.text}</Text>
                                        </View>
                                    </View>
                                )}

                                {item.file && (
                                    <View style={{ marginBottom: item.text ? 5 : 0 }}>
                                        {item.file_type?.startsWith('image/') ? (
                                            <TouchableOpacity onPress={handleMediaPress}>
                                                {getImageSource() && (
                                                    <Image
                                                        source={getImageSource()!}
                                                        style={styles.messageImage}
                                                        resizeMode="cover"
                                                        onError={handleImageError}
                                                    />
                                                )}
                                            </TouchableOpacity>
                                        ) : item.file_type?.startsWith('video/') ? (
                                            <TouchableOpacity onPress={handleMediaPress} style={styles.videoPreview}>
                                                <View style={styles.videoThumbnail}>
                                                    <MaterialCommunityIcons name="play-circle" size={48} color="white" />
                                                </View>
                                                <View style={styles.fileInfo}>
                                                    <MaterialCommunityIcons name="video" size={20} color={colors.text} />
                                                    <Text style={[styles.fileName, { color: colors.text }]} numberOfLines={1}>
                                                        {item.file_name || 'Video'}
                                                    </Text>
                                                </View>
                                            </TouchableOpacity>
                                        ) : item.file_type === 'application/pdf' ? (
                                            <View style={[styles.documentPreview, { backgroundColor: colors.backgroundSecondary }]}>
                                                <View style={[styles.pdfIcon, { backgroundColor: colors.primary + '20' }]}>
                                                    <MaterialCommunityIcons name="file-pdf-box" size={40} color="#E53935" />
                                                </View>
                                                <View style={styles.fileInfo}>
                                                    <Text style={[styles.fileName, { color: colors.text }]} numberOfLines={1}>
                                                        {item.file_name || 'PDF Document'}
                                                    </Text>
                                                    <Text style={[styles.fileType, { color: colors.secondary }]}>PDF</Text>
                                                </View>
                                            </View>
                                        ) : (
                                            <View style={[styles.documentPreview, { backgroundColor: colors.backgroundSecondary }]}>
                                                <View style={[styles.pdfIcon, { backgroundColor: colors.primary + '20' }]}>
                                                    <MaterialCommunityIcons name="file-document" size={40} color={colors.primary} />
                                                </View>
                                                <View style={styles.fileInfo}>
                                                    <Text style={[styles.fileName, { color: colors.text }]} numberOfLines={1}>
                                                        {item.file_name || 'Document'}
                                                    </Text>
                                                    <Text style={[styles.fileType, { color: colors.secondary }]}>
                                                        {item.file_type?.split('/')[1]?.toUpperCase() || 'FILE'}
                                                    </Text>
                                                </View>
                                            </View>
                                        )}
                                    </View>
                                )}

                                {item.text ? (
                                    <Text style={[styles.messageText, { color: colors.text }]}>
                                        {item.text}
                                    </Text>
                                ) : null}

                                <Text style={[styles.timestamp, { color: colors.tabIconDefault }]}>
                                    {item.timestamp.toLocaleTimeString([], {
                                        hour: '2-digit',
                                        minute: '2-digit',
                                    })}
                                </Text>
                            </View>
                            {reactions.length > 0 && (
                                <View style={styles.reactionBadge}>
                                    <Text style={{ fontSize: 10 }}>{reactions[0]}</Text>
                                </View>
                            )}
                        </View>
                    ) : (
                        <View>
                            <LinearGradient
                                colors={[colors.primary, colors.secondary]}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 1 }}
                                style={styles.messageBubbleMe}
                            >
                                {item.reply_to && (
                                    <View style={[styles.replyContainer, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
                                        <View style={[styles.replyBar, { backgroundColor: 'white' }]} />
                                        <View style={{ flex: 1 }}>
                                            <Text numberOfLines={1} style={[styles.replySender, { color: 'white' }]}>{item.reply_to.sender}</Text>
                                            <Text numberOfLines={1} style={[styles.replyText, { color: 'white' }]}>{item.reply_to.text}</Text>
                                        </View>
                                    </View>
                                )}

                                {item.file && (
                                    <View style={{ marginBottom: item.text ? 5 : 0 }}>
                                        {item.file_type?.startsWith('image/') ? (
                                            <TouchableOpacity onPress={handleMediaPress}>
                                                {getImageSource() && (
                                                    <Image
                                                        source={getImageSource()!}
                                                        style={styles.messageImage}
                                                        resizeMode="cover"
                                                        onError={handleImageError}
                                                    />
                                                )}
                                            </TouchableOpacity>
                                        ) : item.file_type?.startsWith('video/') ? (
                                            <TouchableOpacity onPress={handleMediaPress} style={styles.videoPreview}>
                                                <View style={styles.videoThumbnail}>
                                                    <MaterialCommunityIcons name="play-circle" size={48} color="white" />
                                                </View>
                                                <View style={styles.fileInfo}>
                                                    <MaterialCommunityIcons name="video" size={20} color="white" />
                                                    <Text style={[styles.fileName, { color: "white" }]} numberOfLines={1}>
                                                        {item.file_name || 'Video'}
                                                    </Text>
                                                </View>
                                            </TouchableOpacity>
                                        ) : item.file_type === 'application/pdf' ? (
                                            <View style={[styles.documentPreview, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
                                                <View style={[styles.pdfIcon, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
                                                    <MaterialCommunityIcons name="file-pdf-box" size={40} color="#FF6B6B" />
                                                </View>
                                                <View style={styles.fileInfo}>
                                                    <Text style={[styles.fileName, { color: "white" }]} numberOfLines={1}>
                                                        {item.file_name || 'PDF Document'}
                                                    </Text>
                                                    <Text style={[styles.fileType, { color: "rgba(255,255,255,0.7)" }]}>PDF</Text>
                                                </View>
                                            </View>
                                        ) : (
                                            <View style={[styles.documentPreview, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
                                                <View style={[styles.pdfIcon, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
                                                    <MaterialCommunityIcons name="file-document" size={40} color="white" />
                                                </View>
                                                <View style={styles.fileInfo}>
                                                    <Text style={[styles.fileName, { color: "white" }]} numberOfLines={1}>
                                                        {item.file_name || 'Document'}
                                                    </Text>
                                                    <Text style={[styles.fileType, { color: "rgba(255,255,255,0.7)" }]}>
                                                        {item.file_type?.split('/')[1]?.toUpperCase() || 'FILE'}
                                                    </Text>
                                                </View>
                                            </View>
                                        )}
                                    </View>
                                )}

                                {item.text ? (
                                    <Text
                                        style={[
                                            styles.messageText,
                                            { color: 'white' },
                                        ]}
                                    >
                                        {item.text}
                                    </Text>
                                ) : null}

                                <View style={styles.readRow}>
                                    <Text
                                        style={{
                                            fontSize: 10,
                                            color: 'rgba(255,255,255,0.7)',
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
                                                ? '#FFF'
                                                : 'rgba(255,255,255,0.7)'
                                        }
                                    />
                                </View>
                            </LinearGradient>
                            {reactions.length > 0 && (
                                <View style={[styles.reactionBadge, { left: -10, right: undefined }]}>
                                    <Text style={{ fontSize: 10 }}>{reactions[0]}</Text>
                                </View>
                            )}
                        </View>
                    )}
                </TouchableOpacity>
            </View>

            {/* Full-screen Media Viewer */}
            <MediaViewer
                visible={viewerVisible}
                mediaUri={typeof item.file === 'string' ? item.file : (item.file as any)?.uri || null}
                mediaType={getMediaType()}
                onClose={() => setViewerVisible(false)}
            />
        </Swipeable>
    );
};

const styles = StyleSheet.create({
    swipeLeftAction: {
        justifyContent: 'center',
        alignItems: 'center',
        width: 50,
        height: '100%',
    },
    swipeRightAction: {
        justifyContent: 'center',
        alignItems: 'center',
        width: 50,
        height: '100%',
        backgroundColor: 'transparent',
    },
    messageContainer: {
        marginBottom: 12, // Increased spacing
        maxWidth: '75%', // Maximum width adjustment
    },
    myMessageContainer: { alignSelf: 'flex-end', marginRight: 10 },
    theirMessageContainer: { alignSelf: 'flex-start', marginLeft: 10 },
    messageBubbleThem: {
        padding: 14,
        borderRadius: 24, // Consistent squircle
        minWidth: 80,
    },
    messageBubbleMe: {
        padding: 14,
        borderRadius: 24, // Consistent squircle
        minWidth: 80,
        shadowColor: "#000",
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.15,
        shadowRadius: 3.84,
        elevation: 5,
    },
    messageText: { fontSize: 16, lineHeight: 22 },
    timestamp: {
        fontSize: 10,
        alignSelf: 'flex-end',
        marginTop: 6,
    },
    readRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'flex-end',
        marginTop: 4,
    },
    reactionBadge: {
        position: 'absolute',
        bottom: -8,
        right: -4,
        backgroundColor: 'white',
        borderRadius: 12,
        paddingHorizontal: 6,
        paddingVertical: 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.2,
        shadowRadius: 1,
        elevation: 2,
        borderWidth: 1,
        borderColor: '#f0f0f0'
    },
    replyContainer: {
        flexDirection: 'row',
        padding: 8,
        borderRadius: 8,
        marginBottom: 8,
        overflow: 'hidden',
        borderLeftWidth: 3,
    },
    replyBar: {
        width: 3,
        height: '100%',
        marginRight: 8,
        borderRadius: 3,
    },
    replySender: {
        fontWeight: '700',
        fontSize: 12,
        marginBottom: 2,
    },
    replyText: {
        fontSize: 12,
        opacity: 0.9,
    },
    fileContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 5,
    },
    messageImage: {
        width: 200,
        height: 200,
        borderRadius: 8,
        backgroundColor: 'rgba(0,0,0,0.1)',
    },
    videoPreview: {
        width: 200,
        borderRadius: 8,
        overflow: 'hidden',
    },
    videoThumbnail: {
        width: 200,
        height: 150,
        backgroundColor: '#000',
        justifyContent: 'center',
        alignItems: 'center',
    },
    documentPreview: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        borderRadius: 8,
        maxWidth: 250,
    },
    pdfIcon: {
        width: 60,
        height: 60,
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    fileInfo: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingVertical: 4,
    },
    fileName: {
        fontSize: 14,
        fontWeight: '500',
        flex: 1,
    },
    fileType: {
        fontSize: 11,
        fontWeight: '600',
        marginTop: 2,
    },
});

// Memoize the component to prevent re-renders unless props change
export const MessageItem = React.memo(MessageItemComponent);
