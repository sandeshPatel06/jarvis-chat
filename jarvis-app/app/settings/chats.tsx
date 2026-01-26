import { ScreenWrapper } from '@/components/ScreenWrapper';
import { Text, View } from '@/components/Themed';
import { useStore } from '@/store';
import { useAppTheme } from '@/hooks/useAppTheme';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { ScrollView, StyleSheet, TouchableOpacity, Switch } from 'react-native';
import { useRouter } from 'expo-router';

export default function ChatsSettingsScreen() {
    const { colors, isDark } = useAppTheme();
    const theme = useStore((state) => state.theme);
    const setTheme = useStore((state) => state.setTheme);
    const user = useStore((state) => state.user);
    const updateSettings = useStore((state) => state.updateSettings);
    const animationsEnabled = useStore((state) => state.animationsEnabled);
    const setAnimationsEnabled = useStore((state) => state.setAnimationsEnabled);
    const showAlert = useStore((state) => state.showAlert);
    const router = useRouter();

    const handleWallpaperSelection = () => {
        showAlert('Selection Wallpaper', 'Choose a background color for your chats', [
            { text: 'Default', onPress: () => updateSettings({ chat_wallpaper: 'default' }) },
            { text: 'Soft Blue', onPress: () => updateSettings({ chat_wallpaper: '#E3F2FD' }) },
            { text: 'Soft Green', onPress: () => updateSettings({ chat_wallpaper: '#E8F5E9' }) },
            { text: 'Dark Slate', onPress: () => updateSettings({ chat_wallpaper: '#263238' }) },
            { text: 'Cancel', style: 'cancel' }
        ]);
    };

    const handleThemeSelection = () => {
        showAlert('Choose Theme', 'Select your preferred app theme', [
            { text: 'System Default', onPress: () => setTheme('system') },
            { text: 'Light Mode', onPress: () => setTheme('light') },
            { text: 'Dark Mode', onPress: () => setTheme('dark') },
            { text: 'Cancel', style: 'cancel' }
        ]);
    };

    const SettingRow = ({ title, value, onPress, isSwitch, switchValue, onSwitchChange }: any) => (
        <TouchableOpacity
            style={[styles.row, { borderBottomColor: colors.itemSeparator }]}
            onPress={onPress}
            disabled={isSwitch}
        >
            <View style={styles.rowMain}>
                <Text style={[styles.rowTitle, { color: colors.text }]}>{title}</Text>
                {value && <Text style={styles.rowValue}>{value}</Text>}
            </View>
            {isSwitch ? (
                <Switch
                    value={switchValue}
                    onValueChange={onSwitchChange}
                    trackColor={{ false: '#767577', true: colors.primary }}
                    thumbColor={'white'}
                />
            ) : (
                <FontAwesome name="chevron-right" size={14} color={colors.tabIconDefault} />
            )}
        </TouchableOpacity>
    );

    return (
        <ScreenWrapper style={styles.container} edges={['top', 'left', 'right', 'bottom']}>
            <View style={[styles.header, { borderBottomColor: colors.itemSeparator }]}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <FontAwesome name="chevron-left" size={18} color={colors.primary} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: colors.text }]}>Chats</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent}>
                <View style={styles.section}>
                    <Text style={[styles.sectionTitle, { color: colors.primary }]}>Display</Text>
                    <View style={[styles.card, { backgroundColor: isDark ? colors.inputBackground : '#fff' }]}>
                        <SettingRow
                            title="Theme"
                            value={theme.charAt(0).toUpperCase() + theme.slice(1)}
                            onPress={handleThemeSelection}
                        />
                        <SettingRow
                            title="Wallpaper"
                            value={user?.chat_wallpaper || 'Default'}
                            onPress={handleWallpaperSelection}
                        />
                    </View>
                </View>

                <View style={styles.section}>
                    <Text style={[styles.sectionTitle, { color: colors.primary }]}>Experience</Text>
                    <View style={[styles.card, { backgroundColor: isDark ? colors.inputBackground : '#fff' }]}>
                        <SettingRow
                            title="Animations"
                            isSwitch
                            switchValue={animationsEnabled}
                            onSwitchChange={setAnimationsEnabled}
                        />
                    </View>
                </View>
            </ScrollView>
        </ScreenWrapper>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
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
    },
    scrollContent: {
        padding: 16,
    },
    section: {
        marginBottom: 24,
    },
    sectionTitle: {
        fontSize: 14,
        fontWeight: 'bold',
        marginBottom: 8,
        marginLeft: 4,
        textTransform: 'uppercase',
    },
    card: {
        borderRadius: 16,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
        elevation: 2,
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 16,
        paddingHorizontal: 16,
        borderBottomWidth: StyleSheet.hairlineWidth,
    },
    rowMain: {
        flex: 1,
    },
    rowTitle: {
        fontSize: 16,
        fontWeight: '500',
    },
    rowValue: {
        fontSize: 14,
        color: 'gray',
        marginTop: 2,
    }
});
