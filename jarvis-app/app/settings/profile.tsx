import { ScreenWrapper } from '@/components/ScreenWrapper';
import { Text, View } from '@/components/Themed';
import Colors from '@/constants/Colors';
import { useAppTheme } from '@/hooks/useAppTheme';
import { api } from '@/services/api';
import { useStore } from '@/store';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Image, StyleSheet, TextInput, TouchableOpacity, ActivityIndicator } from 'react-native';
import * as ImagePicker from 'expo-image-picker';


import { getMediaUrl } from '@/utils/media';


export default function ProfileScreen() {
    const router = useRouter();
    const user = useStore((state) => state.user);
    const token = useStore((state) => state.token);
    const updateUser = useStore((state) => state.updateUser);
    const showToast = useStore((state) => state.showToast);


    const [name, setName] = useState(user?.username || '');
    const [about, setAbout] = useState(user?.bio || 'Available');
    const [saving, setSaving] = useState(false);
    const [image, setImage] = useState<string | null>(null);
    const { colors, isDark } = useAppTheme();

    const avatarUrl = getMediaUrl(user?.profile_picture);

    const pickImage = async () => {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsEditing: true,
            aspect: [1, 1],
            quality: 1,
        });

        if (!result.canceled) {
            setImage(result.assets[0].uri);
        }
    };

    const handleSave = async () => {
        if (!token) return;
        setSaving(true);
        try {
            let updatedUser;

            if (image) {
                // If there's a new image, use FormData
                const formData = new FormData();
                formData.append('username', name);
                formData.append('bio', about);

                const filename = image.split('/').pop();
                const match = /\.(\w+)$/.exec(filename || '');
                const type = match ? `image/${match[1]}` : `image`;

                formData.append('profile_picture', {
                    uri: image,
                    name: filename || 'profile.jpg',
                    type: type,
                } as any);

                updatedUser = await api.auth.updateProfile(token, formData);
            } else {
                // Otherwise just use JSON
                updatedUser = await api.auth.updateProfile(token, {
                    username: name,
                    bio: about
                });
            }

            updateUser(updatedUser);
            showToast('success', 'Profile Updated', 'Your profile has been updated successfully');
            setImage(null);
        } catch (error: any) {
            console.error('Update error:', error);
            showToast('error', 'Update Failed', 'Failed to update profile. Please try again.');
        } finally {
            setSaving(false);
        }
    };


    return (
        <ScreenWrapper style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'left', 'right', 'bottom']}>
            <View style={[styles.header, { borderBottomColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }]}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <FontAwesome name="user-circle" size={18} color={colors.primary} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: colors.text }]}>Profile</Text>
                <TouchableOpacity onPress={handleSave} disabled={saving} style={styles.headerRight}>
                    {saving ? (
                        <ActivityIndicator size="small" color={colors.accent} />
                    ) : (
                        <Text style={{ color: colors.primary, fontWeight: 'bold', fontSize: 16 }}>
                            Save
                        </Text>
                    )}
                </TouchableOpacity>
            </View>

            <View style={styles.content}>
                <View style={styles.avatarContainer}>
                    <TouchableOpacity onPress={pickImage} activeOpacity={0.8}>
                        <View style={[styles.cameraButton, { backgroundColor: colors.primary }]}>
                            <FontAwesome name="camera" size={18} color="white" />
                        </View>
                    </TouchableOpacity>
                </View>

                <View style={[styles.card, { backgroundColor: colors.cardSecondary }]}>
                    <View style={styles.inputGroup}>
                        <View style={styles.iconContainer}>
                            <FontAwesome name="user" size={20} color={colors.accent} />
                        </View>
                        <View style={styles.textContainer}>
                            <Text style={styles.label}>Name</Text>
                            <TextInput
                                style={[styles.input, { color: colors.text, borderBottomColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }]}
                                value={name}
                                onChangeText={setName}
                                placeholder="Enter your name"
                                placeholderTextColor="#666"
                            />
                            <Text style={styles.hint}>This name will be visible to your contacts in chats.</Text>
                        </View>
                    </View>

                    <View style={[styles.separator, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }]} />

                    <View style={styles.inputGroup}>
                        <View style={styles.iconContainer}>
                            <FontAwesome name="info-circle" size={20} color={colors.accent} />
                        </View>
                        <View style={styles.textContainer}>
                            <Text style={styles.label}>About</Text>
                            <TextInput
                                style={[styles.input, { color: colors.text, borderBottomColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }]}
                                value={about}
                                onChangeText={setAbout}
                                placeholder="Tell us about yourself"
                                placeholderTextColor="#666"
                            />
                        </View>
                    </View>

                    <View style={[styles.separator, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }]} />

                    <View style={styles.inputGroup}>
                        <View style={styles.iconContainer}>
                            <FontAwesome name="phone" size={20} color={colors.accent} />
                        </View>
                        <View style={styles.textContainer}>
                            <Text style={styles.label}>Phone</Text>
                            <Text style={[styles.readOnlyText, { color: '#888' }]}>{user?.phone_number || 'Not verified'}</Text>
                        </View>
                    </View>
                </View>
            </View>
        </ScreenWrapper>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    content: {
        padding: 16,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 15,
        paddingTop: 20,
        paddingBottom: 12,
        borderBottomWidth: StyleSheet.hairlineWidth,
    },
    backButton: {
        padding: 5,
        width: 40,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginVertical: 10,
    },
    headerRight: {
        position: 'absolute',
        right: 15,
        top: 25,
    },
    avatarContainer: {
        alignItems: 'center',
        marginVertical: 30,
    },
    avatar: {
        width: 140,
        height: 140,
        borderRadius: 70,
    },
    cameraButton: {
        position: 'absolute',
        bottom: 5,
        right: 5,
        width: 36,
        height: 36,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 3,
        borderColor: 'white',
    },
    card: {
        borderRadius: 20,
        padding: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 3,
    },
    inputGroup: {
        flexDirection: 'row',
        alignItems: 'flex-start',
    },
    iconContainer: {
        width: 30,
        paddingTop: 12,
        alignItems: 'center',
    },
    textContainer: {
        flex: 1,
        marginLeft: 15,
    },
    label: {
        fontSize: 12,
        color: '#888',
        fontWeight: '600',
        textTransform: 'uppercase',
        letterSpacing: 1,
        marginBottom: 4,
    },
    input: {
        fontSize: 16,
        paddingVertical: 8,
        borderBottomWidth: 1,
    },
    readOnlyText: {
        fontSize: 16,
        paddingVertical: 8,
    },
    hint: {
        fontSize: 12,
        color: '#999',
        marginTop: 6,
        lineHeight: 16,
    },
    separator: {
        height: 1,
        marginVertical: 20,
        marginLeft: 45,
    }
});
