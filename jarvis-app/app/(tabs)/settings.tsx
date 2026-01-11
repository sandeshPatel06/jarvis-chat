import { ScreenWrapper } from '@/components/ScreenWrapper';
import { Text, View } from '@/components/Themed';
import Colors from '@/constants/Colors';
import { useStore } from '@/store';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useRouter } from 'expo-router';
import { Alert, Image, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';

import { useAppTheme } from '@/hooks/useAppTheme';

export default function SettingsScreen() {
    const router = useRouter();
    const { colors, isDark } = useAppTheme();
    // Helper to access colors based on theme if needed, but 'colors' object is already correct
    const user = useStore((state) => state.user);
    const logout = useStore((state) => state.logout);

    const handleLogout = () => {
        logout();
        router.replace('/auth/login');
    };

    const SettingItem = ({ icon, title, subtitle, onPress, color = colors.text }: any) => (
        <TouchableOpacity style={styles.item} onPress={onPress}>
            <View style={styles.iconContainer}>
                <FontAwesome name={icon} size={22} color={colors.accent} style={{ opacity: 0.8 }} />
            </View>
            <View style={styles.textContainer}>
                <Text style={[styles.itemTitle, { color }]}>{title}</Text>
                {subtitle && <Text style={styles.itemSubtitle}>{subtitle}</Text>}
            </View>
        </TouchableOpacity>
    );

    return (
        <ScreenWrapper style={styles.container}>
            <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
                {/* Profile Header */}
                <TouchableOpacity style={styles.profileHeader} onPress={() => router.push('/settings/profile')}>
                    <Image
                        source={user?.profile_picture ? { uri: user.profile_picture } : require('@/assets/images/default-avatar.png')}
                        style={styles.avatar}
                    />
                    <View style={styles.profileInfo}>
                        <Text style={[styles.name, { color: colors.text }]}>{user?.username || 'User'}</Text>
                        <Text style={styles.status}>{user?.bio || 'Available'}</Text>
                    </View>
                    <FontAwesome name="qrcode" size={24} color={colors.accent} style={styles.qrIcon} />
                </TouchableOpacity>

                <View style={[styles.separator, { backgroundColor: colors.itemSeparator }]} />

                {/* Settings List */}
                <SettingItem icon="key" title="Account" subtitle="Security notifications, change number" />
                <SettingItem icon="lock" title="Privacy" subtitle="Block contacts, disappearing messages" />
                <SettingItem
                    icon="paint-brush"
                    title="App Theme"
                    subtitle={`Current: ${useStore.getState().theme.charAt(0).toUpperCase() + useStore.getState().theme.slice(1)}`}
                    onPress={() => {
                        Alert.alert('Choose Theme', 'Select your preferred app theme', [
                            { text: 'System Default', onPress: () => useStore.getState().setTheme('system') },
                            { text: 'Light Mode', onPress: () => useStore.getState().setTheme('light') },
                            { text: 'Dark Mode', onPress: () => useStore.getState().setTheme('dark') },
                            { text: 'Cancel', style: 'cancel' }
                        ]);
                    }}
                />
                <SettingItem icon="comment" title="Chats" subtitle="Theme, wallpapers, chat history" />
                <SettingItem icon="bell" title="Notifications" subtitle="Message, group & call tones" />
                <SettingItem icon="hdd-o" title="Storage and data" subtitle="Network usage, auto-download" />
                <SettingItem icon="globe" title="App language" subtitle="English (device's language)" />
                <SettingItem icon="question-circle" title="Help" subtitle="Help center, contact us, privacy policy" />

                <View style={[styles.separator, { backgroundColor: colors.itemSeparator }]} />

                <SettingItem icon="users" title="Invite a friend" />

                <View style={[styles.separator, { backgroundColor: colors.itemSeparator }]} />

                <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
                    <Text style={styles.logoutText}>Log out</Text>
                </TouchableOpacity>

                <View style={{ height: 40 }} />
                <Text style={styles.version}>from</Text>
                <Text style={[styles.brand, { color: colors.text }]}>JARVIS AI</Text>
                <View style={{ height: 40 }} />

            </ScrollView>
        </ScreenWrapper>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    profileHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 20,
        paddingTop: 10,
    },
    avatar: {
        width: 60,
        height: 60,
        borderRadius: 30,
        marginRight: 15,
    },
    profileInfo: {
        flex: 1,
    },
    name: {
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 2,
    },
    status: {
        fontSize: 14,
        color: 'gray',
    },
    qrIcon: {
        padding: 10,
    },
    item: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 15,
        paddingHorizontal: 20,
    },
    iconContainer: {
        width: 30,
        alignItems: 'center',
        marginRight: 15,
    },
    textContainer: {
        flex: 1,
    },
    itemSubtitle: {
        fontSize: 13,
        color: 'gray',
        marginTop: 2,
    },
    separator: {
        height: StyleSheet.hairlineWidth,
        marginVertical: 10,
    },
    // ...
    itemTitle: {
        fontSize: 16,
        fontWeight: '500',
    },
    logoutButton: {
        padding: 20,
        alignItems: 'center',
    },
    logoutText: {
        color: '#ff4444',
        fontSize: 16,
        fontWeight: 'bold',
    },
    version: {
        textAlign: 'center',
        color: 'gray',
        fontSize: 12,
    },
    brand: {
        textAlign: 'center',
        color: Colors.dark.text,
        fontSize: 14,
        fontWeight: 'bold',
        letterSpacing: 2,
        marginTop: 5,
    }
});
