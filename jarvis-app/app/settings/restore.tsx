import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, ActivityIndicator, Image } from 'react-native';
import { ScreenWrapper } from '@/components/ScreenWrapper';
import { useAppTheme } from '@/hooks/useAppTheme';
import { useStore } from '@/store';
import { Stack, useRouter } from 'expo-router';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Chat } from '@/types';
import { api } from '@/services/api';
import { getMediaUrl } from '@/utils/media';

export default function RestoreSettingsScreen() {
    const { colors } = useAppTheme();
    const router = useRouter();
    const token = useStore((state) => state.token);
    const restoreChats = useStore((state) => state.restoreChats);
    const [deletedChats, setDeletedChats] = useState<Chat[]>([]);
    const [selectedChatIds, setSelectedChatIds] = useState<number[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchDeletedChats();
    }, []);

    const fetchDeletedChats = async () => {
        if (!token) return;
        try {
            const chats = await api.chat.getConversations(token, true); // true = deleted
            setDeletedChats(chats);
        } catch (e) {
            console.error(e);
            Alert.alert('Error', 'Failed to fetch deleted chats');
        } finally {
            setLoading(false);
        }
    };

    const toggleChatSelection = (chatId: string) => {
        const id = parseInt(chatId);
        setSelectedChatIds(prev =>
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        );
    };

    const handleRestore = async () => {
        if (selectedChatIds.length === 0) {
            Alert.alert('Selection Required', 'Please select at least one chat to restore.');
            return;
        }

        try {
            // Restore functionality no longer uses a date.
            // Just restore the selected conversations.
            await restoreChats(selectedChatIds, undefined);
            Alert.alert('Success', 'Selected chats have been restored', [
                { text: 'OK', onPress: () => router.back() }
            ]);
        } catch (e) {
            Alert.alert('Error', 'Failed to restore chats');
        }
    };

    const renderItem = ({ item }: { item: Chat }) => {
        const isSelected = selectedChatIds.includes(parseInt(item.id));
        const avatarUrl = getMediaUrl(item.avatar);

        return (
            <TouchableOpacity
                style={[styles.chatItem, { backgroundColor: colors.card, borderColor: isSelected ? colors.primary : 'transparent' }]}
                onPress={() => toggleChatSelection(item.id)}
            >
                <View style={styles.chatInfo}>
                    <Image
                        source={avatarUrl ? { uri: avatarUrl } : require('@/assets/images/default-avatar.png')}
                        style={styles.avatar}
                    />
                    <View style={{ flex: 1 }}>
                        <Text style={[styles.chatName, { color: colors.text }]}>{item.name}</Text>
                        <Text style={[styles.chatSubtext, { color: colors.tabIconDefault }]} numberOfLines={1}>
                            Last active: {new Date(item.lastMessageTime).toLocaleDateString()}
                        </Text>
                    </View>
                </View>
                {isSelected && (
                    <FontAwesome name="check-circle" size={24} color={colors.primary} />
                )}
            </TouchableOpacity>
        );
    };

    return (
        <ScreenWrapper style={[styles.container, { backgroundColor: colors.background }]}>
            <Stack.Screen options={{ title: 'Restore Chats', headerBackTitle: 'Settings' }} />

            <View style={styles.header}>
                <Text style={[styles.description, { color: colors.text }]}>
                    Select deleted conversations to restore.
                </Text>
            </View>

            {loading ? (
                <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 20 }} />
            ) : (
                <FlatList
                    data={deletedChats}
                    renderItem={renderItem}
                    keyExtractor={item => item.id}
                    contentContainerStyle={styles.listContent}
                    ListEmptyComponent={
                        <Text style={{ textAlign: 'center', color: colors.tabIconDefault, marginTop: 20 }}>
                            No deleted chats found.
                        </Text>
                    }
                />
            )}

            <View style={[styles.footer, { backgroundColor: colors.background }]}>
                <TouchableOpacity
                    style={[styles.restoreButton, { backgroundColor: selectedChatIds.length > 0 ? colors.primary : colors.textSecondary }]}
                    disabled={selectedChatIds.length === 0}
                    onPress={handleRestore}
                >
                    <Text style={styles.restoreButtonText}>Restore Selected ({selectedChatIds.length})</Text>
                </TouchableOpacity>
            </View>
        </ScreenWrapper>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: { padding: 20 },
    description: { fontSize: 14, lineHeight: 20, opacity: 0.8 },
    listContent: { paddingHorizontal: 20, paddingBottom: 100 },
    chatItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        borderRadius: 12,
        marginBottom: 10,
        borderWidth: 2,
        justifyContent: 'space-between'
    },
    chatInfo: { flexDirection: 'row', alignItems: 'center', flex: 1 },
    avatar: { width: 50, height: 50, borderRadius: 25, marginRight: 15 },
    chatName: { fontWeight: 'bold', fontSize: 16, marginBottom: 4 },
    chatSubtext: { fontSize: 12 },
    footer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        padding: 20,
        borderTopWidth: StyleSheet.hairlineWidth,
        borderTopColor: '#ccc'
    },
    restoreButton: {
        padding: 16,
        borderRadius: 12,
        alignItems: 'center'
    },
    restoreButtonText: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: 16
    }
});
