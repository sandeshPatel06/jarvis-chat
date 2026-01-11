import { ScreenWrapper } from '@/components/ScreenWrapper';
import { Text, View } from '@/components/Themed';
import { useAppTheme } from '@/hooks/useAppTheme';
import { api } from '@/services/api';
import { useStore } from '@/store';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import * as Contacts from 'expo-contacts';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Image, Pressable, StyleSheet, TouchableOpacity } from 'react-native';

export default function SelectContactScreen() {
    const router = useRouter();
    const token = useStore((state) => state.token);
    const { colors } = useAppTheme();
    const [permissionGranted, setPermissionGranted] = useState(false);
    const [registeredContacts, setRegisteredContacts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        (async () => {
            const { status } = await Contacts.requestPermissionsAsync();
            if (status === 'granted') {
                setPermissionGranted(true);
                loadContacts();
            } else {
                setLoading(false);
            }
        })();
    }, []);

    const loadContacts = async () => {
        try {
            const { data } = await Contacts.getContactsAsync({
                fields: [Contacts.Fields.PhoneNumbers],
            });

            if (data.length > 0) {
                const phoneNumbers = data
                    .flatMap(c => c.phoneNumbers || [])
                    .map(p => p.number ? p.number.replace(/\D/g, '') : '')
                    .filter(n => n && n.length >= 10);

                const uniqueNumbers = [...new Set(phoneNumbers)];
                if (token) {
                    const users = await api.chat.checkContacts(token, uniqueNumbers);
                    setRegisteredContacts(users);
                }
            }
        } catch (error) {
            console.error('Error loading contacts:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSelectContact = async (user: any) => {
        if (!token) return;
        try {
            setLoading(true);
            const conversation = await api.chat.createConversation(token, user.username);
            useStore.getState().fetchChats();
            router.replace(`/chat/${conversation.id}`);
        } catch (error) {
            console.error(error);
            alert('Failed to start chat');
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <ScreenWrapper style={styles.container}>
                <View style={styles.centerContainer}>
                    <ActivityIndicator size="large" color={colors.primary} />
                </View>
            </ScreenWrapper>
        );
    }

    if (!permissionGranted) {
        return (
            <ScreenWrapper style={styles.container}>
                <View style={styles.centerContainer}>
                    <Text style={[styles.text, { color: colors.text }]}>Permission to access contacts was denied</Text>
                </View>
            </ScreenWrapper>
        );
    }

    return (
        <ScreenWrapper style={styles.container}>
            <View style={[styles.header, { backgroundColor: colors.background, borderBottomColor: colors.itemSeparator }]}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <FontAwesome name="arrow-left" size={20} color={colors.text} />
                </TouchableOpacity>
                <View>
                    <Text style={[styles.headerTitle, { color: colors.text }]}>Select Contact</Text>
                    <Text style={[styles.headerSubtitle, { color: colors.accent }]}>{registeredContacts.length} contacts on Jarvis</Text>
                </View>
            </View>

            <FlatList
                data={registeredContacts}
                keyExtractor={(item) => item.id.toString()}
                renderItem={({ item }) => (
                    <Pressable
                        onPress={() => handleSelectContact(item)}
                        style={({ pressed }) => [
                            styles.itemContainer,
                            { opacity: pressed ? 0.7 : 1 }
                        ]}
                    >
                        <Image
                            source={item.profile_picture ? { uri: item.profile_picture } : require('../../assets/images/logo.png')}
                            style={styles.avatar}
                        />
                        <View style={styles.contentContainer}>
                            <Text style={[styles.name, { color: colors.text }]}>{item.username}</Text>
                            <Text style={[styles.status, { color: colors.text, opacity: 0.6 }]}>{item.bio || 'Available'}</Text>
                        </View>
                    </Pressable>
                )}
                contentContainerStyle={styles.listContent}
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <Text style={[styles.emptyText, { color: colors.text }]}>No contacts found on Jarvis.</Text>
                        <Text style={styles.emptySubText}>Invite your friends to chat!</Text>
                    </View>
                }
            />
        </ScreenWrapper>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    centerContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 15,
        paddingTop: 10,
        borderBottomWidth: StyleSheet.hairlineWidth,
    },
    backButton: {
        marginRight: 15,
        padding: 5,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: 'bold',
    },
    headerSubtitle: {
        fontSize: 12,
    },
    listContent: {
        padding: 10,
    },
    itemContainer: {
        flexDirection: 'row',
        padding: 15,
        alignItems: 'center',
        backgroundColor: 'transparent',
    },
    avatar: {
        width: 50,
        height: 50,
        borderRadius: 25,
        marginRight: 15,
        backgroundColor: '#333',
    },
    contentContainer: {
        flex: 1,
    },
    name: {
        fontSize: 16,
        fontWeight: 'bold',
        marginBottom: 2,
    },
    status: {
        fontSize: 12,
    },
    emptyContainer: {
        padding: 30,
        alignItems: 'center',
    },
    emptyText: {
        fontSize: 16,
        marginBottom: 10,
    },
    emptySubText: {
        color: 'gray',
    },
    text: {
        textAlign: 'center',
        marginTop: 50,
    }
});
