import { ScreenWrapper } from '@/components/ScreenWrapper';
import { Text, View } from '@/components/Themed';
import Colors from '@/constants/Colors';
import { useAppTheme } from '@/hooks/useAppTheme';
import { api } from '@/services/api';
import { useStore } from '@/store';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Stack, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Alert, Image, StyleSheet, TextInput, TouchableOpacity } from 'react-native';

export default function ProfileScreen() {
    const router = useRouter();
    const user = useStore((state) => state.user);
    const token = useStore((state) => state.token);
    const updateUser = useStore((state) => state.updateUser);

    const [name, setName] = useState(user?.username || '');
    const [about, setAbout] = useState(user?.bio || 'Available');
    const [saving, setSaving] = useState(false);
    const { colors } = useAppTheme();

    const handleSave = async () => {
        if (!token) return;
        setSaving(true);
        try {
            const updatedUser = await api.auth.updateProfile(token, {
                username: name,
                bio: about
            });
            updateUser(updatedUser);
            Alert.alert('Success', 'Profile updated successfully');
        } catch (error: any) {
            Alert.alert('Error', 'Failed to update profile');
        } finally {
            setSaving(false);
        }
    };

    return (
        <ScreenWrapper style={styles.container} edges={['top', 'left', 'right']}>
            <Stack.Screen options={{
                headerShown: true,
                title: "Profile",
                headerStyle: { backgroundColor: colors.background },
                headerTintColor: colors.text,
                headerTitleStyle: { fontWeight: 'bold' },
                headerRight: () => (
                    <TouchableOpacity onPress={handleSave} disabled={saving}>
                        <Text style={{ color: colors.accent, fontWeight: 'bold', fontSize: 16 }}>
                            {saving ? 'Saving...' : 'Save'}
                        </Text>
                    </TouchableOpacity>
                )
            }} />

            <View style={styles.content}>
                <View style={styles.avatarContainer}>
                    <Image
                        source={user?.profile_picture ? { uri: user.profile_picture } : require('@/assets/images/default-avatar.png')}
                        style={[styles.avatar, { borderColor: colors.background }]}
                    />
                    <TouchableOpacity style={[styles.cameraButton, { backgroundColor: colors.primary, borderColor: colors.background }]}>
                        <FontAwesome name="camera" size={20} color="white" />
                    </TouchableOpacity>
                </View>

                <View style={styles.inputGroup}>
                    <View style={styles.iconContainer}>
                        <FontAwesome name="user" size={24} color={colors.accent} />
                    </View>
                    <View style={styles.textContainer}>
                        <Text style={styles.label}>Name</Text>
                        <TextInput
                            style={[styles.input, { color: colors.text }]}
                            value={name}
                            onChangeText={setName}
                            placeholderTextColor="#666"
                        />
                        <Text style={styles.hint}>This is not your username or pin. This name will be visible to your contacts.</Text>
                    </View>
                    <TouchableOpacity>
                        <FontAwesome name="pencil" size={20} color={colors.accent} />
                    </TouchableOpacity>
                </View>

                <View style={[styles.separator, { backgroundColor: colors.itemSeparator }]} />

                <View style={styles.inputGroup}>
                    <View style={styles.iconContainer}>
                        <FontAwesome name="info-circle" size={24} color={colors.accent} />
                    </View>
                    <View style={styles.textContainer}>
                        <Text style={styles.label}>About</Text>
                        <TextInput
                            style={[styles.input, { color: colors.text }]}
                            value={about}
                            onChangeText={setAbout}
                            placeholderTextColor="#666"
                        />
                    </View>
                    <TouchableOpacity>
                        <FontAwesome name="pencil" size={20} color={colors.accent} />
                    </TouchableOpacity>
                </View>

                <View style={[styles.separator, { backgroundColor: colors.itemSeparator }]} />

                <View style={styles.inputGroup}>
                    <View style={styles.iconContainer}>
                        <FontAwesome name="phone" size={24} color={colors.accent} />
                    </View>
                    <View style={styles.textContainer}>
                        <Text style={styles.label}>Phone</Text>
                        <Text style={[styles.readOnlyText, { color: colors.text }]}>{user?.phone_number || '+1 234 567 890'}</Text>
                    </View>
                </View>

            </View>
        </ScreenWrapper>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.dark.background,
        paddingTop: 20,
    },
    content: {
        padding: 20,

    },
    avatarContainer: {
        alignItems: 'center',
        marginBottom: 30,
        position: 'relative',
    },
    avatar: {
        width: 150,
        height: 150,
        borderRadius: 75,
        borderWidth: 3,
    },
    cameraButton: {
        position: 'absolute',
        bottom: 5,
        right: '35%',
        width: 44,
        height: 44,
        borderRadius: 22,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 3,
    },
    inputGroup: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginBottom: 10,
    },
    iconContainer: {
        width: 40,
        paddingTop: 15,
        alignItems: 'center',
    },
    textContainer: {
        flex: 1,
        marginLeft: 15,
    },
    label: {
        fontSize: 14,
        color: 'gray',
        marginBottom: 5,
    },
    input: {
        fontSize: 18,
        // color: Colors.dark.text, -> handled in render
        borderBottomWidth: 1,
        borderBottomColor: 'transparent',
        paddingVertical: 5,
    },
    readOnlyText: {
        fontSize: 18,
        // color: Colors.dark.text, -> handled in render
        paddingVertical: 5,
    },
    hint: {
        fontSize: 12,
        color: 'gray',
        marginTop: 5,
    },
    separator: {
        height: StyleSheet.hairlineWidth,
        backgroundColor: 'rgba(255,255,255,0.1)',
        marginLeft: 55, // Offset for icon
        marginVertical: 15,
    }
});
