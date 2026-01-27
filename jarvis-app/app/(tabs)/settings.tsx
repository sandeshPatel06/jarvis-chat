import { ScreenWrapper } from '@/components/ScreenWrapper';
import { Text, View } from '@/components/Themed';
import { useStore } from '@/store';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useRouter } from 'expo-router';
import { Image, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { useAppTheme } from '@/hooks/useAppTheme';
import { getMediaUrl } from '@/utils/media';

export default function SettingsScreen() {
    const router = useRouter();
    const { colors, isDark } = useAppTheme();
    const user = useStore((state) => state.user);
    const logout = useStore((state) => state.logout);

    const handleLogout = () => {
        logout();
        router.replace('/auth/login');
    };

    const SettingCard = ({ icon, title, subtitle, onPress, badge }: any) => {
        const { colors } = useAppTheme();
        return (
            <TouchableOpacity
                style={[styles.card, { backgroundColor: colors.card }]}
                onPress={onPress}
            >
                <View style={[styles.iconBox, { backgroundColor: colors.backgroundSecondary }]}>
                    <FontAwesome name={icon} size={20} color={colors.primary} />
                </View>
                <View style={styles.cardTextContainer}>
                    <Text style={[styles.cardTitle, { color: colors.text }]}>{title}</Text>
                    {subtitle && <Text style={styles.cardSubtitle}>{subtitle}</Text>}
                </View>
                {badge && (
                    <View style={[styles.badge, { backgroundColor: colors.primary }]}>
                        <Text style={styles.badgeText}>{badge}</Text>
                    </View>
                )}
                <FontAwesome name="chevron-right" size={14} color={colors.tabIconDefault} style={styles.chevron} />
            </TouchableOpacity>
        );
    };

    return (
        <ScreenWrapper style={styles.container} edges={['top', 'left', 'right']}>
            <ScrollView
                style={[styles.container, { backgroundColor: colors.background }]}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                {/* <Text style={[styles.pageTitle, { color: colors.text }]}>Settings</Text> */}

                {/* Profile Header Card */}
                <TouchableOpacity
                    onPress={() => router.push('/settings/profile')}
                    activeOpacity={0.9}
                >
                    <LinearGradient
                        colors={[colors.primary, isDark ? '#4A42B3' : '#8E85FF']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.profileCard}
                    >
                        <Image
                            source={getMediaUrl(user?.profile_picture) ? { uri: getMediaUrl(user?.profile_picture)! } : require('@/assets/images/default-avatar.png')}
                            style={styles.avatar}
                        />
                        <View style={styles.profileInfo}>
                            <Text style={styles.name}>{user?.username || 'User'}</Text>
                            <Text style={styles.status} numberOfLines={1}>{user?.bio || 'Available'}</Text>
                            {/* <View style={styles.profileBadge}>
                                <FontAwesome name="star" size={10} color="#FFD700" />
                                <Text style={styles.profileBadgeText}>Premium User</Text>
                            </View> */}
                        </View>
                        <TouchableOpacity style={styles.qrButton}>
                            <FontAwesome name="qrcode" size={20} color="white" />
                        </TouchableOpacity>
                    </LinearGradient>
                </TouchableOpacity>

                <View style={styles.section}>
                    <Text style={[styles.sectionTitle, { color: colors.text, opacity: 0.6 }]}>Preferences</Text>
                    <SettingCard
                        icon="user"
                        title="Account"
                        subtitle="Security, change number, delete account"
                        onPress={() => router.push('/settings/account')}
                    />
                    <SettingCard
                        icon="lock"
                        title="Privacy"
                        subtitle="Last seen, profile photo, read receipts"
                        onPress={() => router.push('/settings/privacy')}
                    />
                    <SettingCard
                        icon="comment-o"
                        title="Chats"
                        subtitle="Theme, wallpapers, animations"
                        onPress={() => router.push('/settings/chats')}
                    />
                    <SettingCard
                        icon="bell-o"
                        title="Notifications"
                        subtitle="Message, group & call tones"
                        onPress={() => router.push('/settings/notifications')}
                    />
                    <SettingCard
                        icon="database"
                        title="Storage and data"
                        subtitle="Network usage, auto-download"
                        onPress={() => router.push('/settings/storage')}
                    />
                </View>

                <View style={styles.section}>
                    <Text style={[styles.sectionTitle, { color: colors.text, opacity: 0.6 }]}>App Info</Text>
                    <SettingCard
                        icon="globe"
                        title="App language"
                        subtitle={user?.app_language === 'en' ? 'English' : (user?.app_language || 'English')}
                        onPress={() => router.push('/settings/language')}
                    />
                    <SettingCard
                        icon="question-circle-o"
                        title="Help"
                        subtitle="Help center, contact us, privacy policy"
                        onPress={() => router.push('/settings/help')}
                    />
                    <SettingCard
                        icon="users"
                        title="Invite a friend"
                        onPress={() => { }}
                    />
                </View>

                <TouchableOpacity
                    style={[styles.logoutButton, { backgroundColor: colors.error + '20' }]}
                    onPress={handleLogout}
                >
                    <FontAwesome name="sign-out" size={18} color={colors.error} style={{ marginRight: 10 }} />
                    <Text style={[styles.logoutText, { color: colors.error }]}>Log out</Text>
                </TouchableOpacity>

                <View style={styles.footer}>
                    <Text style={styles.version}>v1.0.0</Text>
                    <Text style={[styles.brand, { color: colors.primary }]}>JARVIS AI</Text>
                </View>

                <View style={{ height: 40 }} />
            </ScrollView>
        </ScreenWrapper>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    scrollContent: {
        paddingHorizontal: 20,
        paddingTop: 30,
    },
    pageTitle: {
        fontSize: 32,
        fontWeight: '800',
        marginBottom: 25,
        letterSpacing: -0.5,
    },
    profileCard: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 20,
        marginTop:-30,
        borderRadius: 24,
        marginBottom: 30,
        elevation: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 12,
    },
    avatar: {
        width: 70,
        height: 70,
        borderRadius: 35,
        borderWidth: 3,
        borderColor: 'rgba(255,255,255,0.3)',
    },
    profileInfo: {
        flex: 1,
        marginLeft: 15,
    },
    name: {
        fontSize: 22,
        fontWeight: 'bold',
        color: 'white',
        letterSpacing: 0.5,
    },
    status: {
        fontSize: 14,
        color: 'rgba(255,255,255,0.8)',
        marginTop: 2,
    },
    profileBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.2)',
        alignSelf: 'flex-start',
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 10,
        marginTop: 8,
    },
    profileBadgeText: {
        color: 'white',
        fontSize: 10,
        fontWeight: 'bold',
        marginLeft: 4,
    },
    qrButton: {
        backgroundColor: 'rgba(255,255,255,0.2)',
        padding: 10,
        borderRadius: 15,
    },
    section: {
        marginBottom: 25,
    },
    sectionTitle: {
        fontSize: 13,
        fontWeight: '700',
        marginBottom: 12,
        marginLeft: 5,
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    card: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderRadius: 20,
        marginBottom: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
        elevation: 2,
    },
    iconBox: {
        width: 44,
        height: 44,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
    },
    cardTextContainer: {
        flex: 1,
        marginLeft: 15,
    },
    cardTitle: {
        fontSize: 17,
        fontWeight: '600',
    },
    cardSubtitle: {
        fontSize: 13,
        color: 'gray',
        marginTop: 2,
    },
    chevron: {
        opacity: 0.3,
    },
    badge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 10,
        marginRight: 10,
    },
    badgeText: {
        color: 'white',
        fontSize: 12,
        fontWeight: 'bold',
    },
    logoutButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 18,
        borderRadius: 20,
        marginTop: 10,
    },
    logoutText: {
        fontSize: 17,
        fontWeight: '700',
    },
    footer: {
        marginTop: 30,
        alignItems: 'center',
    },
    version: {
        fontSize: 12,
        color: 'gray',
    },
    brand: {
        fontSize: 16,
        fontWeight: '900',
        letterSpacing: 3,
        marginTop: 5,
    }
});

