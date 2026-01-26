import React from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet } from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useAppTheme } from '@/hooks/useAppTheme';
import { Chat } from '@/types';
import { useStore } from '@/store';
import { useRouter } from 'expo-router';
import { getMediaUrl } from '@/utils/media';

interface ChatHeaderProps {
    chat: Chat;
    typingUser: string | null;
    onOptionsPress: () => void;
}

export const ChatHeader = ({ chat, typingUser, onOptionsPress }: ChatHeaderProps) => {
    const { colors } = useAppTheme();
    const router = useRouter();
    const startCall = useStore((state) => state.startCall);

    const handleVideoCall = () => {
        startCall(chat.id, true);
        router.push(`/call/${chat.id}`);
    };

    const handleAudioCall = () => {
        startCall(chat.id, false);
        router.push(`/call/${chat.id}`);
    };

    const avatarUrl = getMediaUrl(chat.avatar);

    return (
        <View
            style={[
                styles.header,
                {
                    backgroundColor: colors.background, // Clean background
                    borderBottomColor: colors.itemSeparator,
                },
            ]}
        >
            <TouchableOpacity
                onPress={() => router.back()}
                style={styles.backButton}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
                <FontAwesome
                    name="chevron-left"
                    size={20}
                    color={colors.primary} // Tint color for back button
                />
            </TouchableOpacity>

            <TouchableOpacity style={styles.profileContainer} activeOpacity={0.7}>
                <Image
                    source={
                        avatarUrl
                            ? { uri: avatarUrl }
                            : require('@/assets/images/default-avatar.png')
                    }
                    style={styles.headerAvatar}
                />

                <View style={styles.headerInfo}>
                    <Text
                        numberOfLines={1}
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
                            { color: typingUser ? colors.primary : colors.tabIconDefault },
                        ]}
                    >
                        {typingUser
                            ? `${typingUser} is typing...`
                            : chat.status || 'Online'}
                    </Text>
                </View>
            </TouchableOpacity>

            <View style={{ flex: 1 }} />

            <TouchableOpacity onPress={handleAudioCall} style={styles.actionButton}>
                <MaterialCommunityIcons name="phone" size={24} color={colors.primary} />
            </TouchableOpacity>

            <TouchableOpacity onPress={handleVideoCall} style={[styles.actionButton, { marginRight: 5 }]}>
                <MaterialCommunityIcons name="video" size={24} color={colors.primary} />
            </TouchableOpacity>

            <TouchableOpacity onPress={onOptionsPress} style={styles.actionButton}>
                <MaterialCommunityIcons name="dots-vertical" size={24} color={colors.primary} />
            </TouchableOpacity>
        </View>
    );
};

const styles = StyleSheet.create({
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12, // More vertical padding
        borderBottomWidth: 0.5, // Hairline border
        elevation: 0, // Remove heavy shadow
        shadowOpacity: 0, // Remove iOS shadow
    },
    backButton: {
        paddingRight: 12,
    },
    profileContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1, // Allow clicking name to open profile
    },
    headerAvatar: {
        width: 42, // Slightly larger
        height: 42,
        borderRadius: 21,
    },
    headerInfo: {
        marginLeft: 10,
        justifyContent: 'center',
    },
    headerName: {
        fontSize: 17, // Standard nav bar title size
        fontWeight: '600',
        letterSpacing: 0.3,
    },
    headerStatus: {
        fontSize: 10,
        marginTop: 2,
    },
    actionButton: {
        padding: 8,
        marginLeft: 4,
    }
});
