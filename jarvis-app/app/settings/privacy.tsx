import { ScreenWrapper } from '@/components/ScreenWrapper';
import { Text, View } from '@/components/Themed';
import { useStore } from '@/store';
import { useAppTheme } from '@/hooks/useAppTheme';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { ScrollView, StyleSheet, TouchableOpacity, Switch } from 'react-native';
import { useRouter } from 'expo-router';

export default function PrivacySettingsScreen() {
    const { colors, isDark } = useAppTheme();
    const user = useStore((state) => state.user);
    const updateSettings = useStore((state) => state.updateSettings);
    const showAlert = useStore((state) => state.showAlert);
    const router = useRouter();

    const handleToggleReadReceipts = async (value: boolean) => {
        try {
            await updateSettings({ privacy_read_receipts: value });
        } catch (error) {
            // Error handled by store
        }
    };

    const handleChoiceSelection = (field: string, title: string, current: string) => {
        showAlert(
            title,
            'Who can see my ' + title.toLowerCase(),
            [
                { text: 'Everyone', onPress: () => updateSettings({ [field]: 'everyone' }) },
                { text: 'My Contacts', onPress: () => updateSettings({ [field]: 'contacts' }) },
                { text: 'Nobody', onPress: () => updateSettings({ [field]: 'nobody' }) },
                { text: 'Cancel', style: 'cancel' }
            ]
        );
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

    const formatChoice = (choice: string | undefined) => {
        if (!choice) return 'Everyone';
        return choice.charAt(0).toUpperCase() + choice.slice(1).replace('_', ' ');
    };

    const handleDisappearingMessagesSelection = () => {
        showAlert(
            'Default message timer',
            'Start new chats with disappearing messages set to your timer',
            [
                { text: 'Off', onPress: () => updateSettings({ privacy_disappearing_messages_timer: 0 }) },
                { text: '24 Hours', onPress: () => updateSettings({ privacy_disappearing_messages_timer: 86400 }) },
                { text: '7 Days', onPress: () => updateSettings({ privacy_disappearing_messages_timer: 604800 }) },
                { text: '90 Days', onPress: () => updateSettings({ privacy_disappearing_messages_timer: 7776000 }) },
                { text: 'Cancel', style: 'cancel' }
            ]
        );
    };

    const formatTimer = (seconds: number | undefined) => {
        if (!seconds || seconds === 0) return 'Off';
        if (seconds === 86400) return '24 Hours';
        if (seconds === 604800) return '7 Days';
        if (seconds === 7776000) return '90 Days';
        return `${seconds} seconds`;
    };

    return (
        <ScreenWrapper style={styles.container} edges={['top', 'left', 'right', 'bottom']}>
            <View style={[styles.header, { borderBottomColor: colors.itemSeparator }]}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <FontAwesome name="chevron-left" size={18} color={colors.primary} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: colors.text }]}>Privacy</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent}>
                <View style={styles.section}>
                    <Text style={[styles.sectionTitle, { color: colors.primary }]}>Who can see my personal info</Text>
                    <Text style={styles.sectionDescription}>
                        If you don't share your Last Seen, you won't be able to see other people's Last Seen.
                    </Text>

                    <View style={[styles.card, { backgroundColor: isDark ? colors.inputBackground : '#fff' }]}>
                        <SettingRow
                            title="Last Seen"
                            value={formatChoice(user?.privacy_last_seen)}
                            onPress={() => handleChoiceSelection('privacy_last_seen', 'Last Seen', user?.privacy_last_seen || 'everyone')}
                        />
                        <SettingRow
                            title="Profile Photo"
                            value={formatChoice(user?.privacy_profile_photo)}
                            onPress={() => handleChoiceSelection('privacy_profile_photo', 'Profile Photo', user?.privacy_profile_photo || 'everyone')}
                        />
                        <SettingRow
                            title="Read Receipts"
                            isSwitch
                            switchValue={user?.privacy_read_receipts ?? true}
                            onSwitchChange={handleToggleReadReceipts}
                        />
                    </View>
                </View>

                <View style={styles.section}>
                    <Text style={[styles.sectionTitle, { color: colors.primary }]}>Disappearing Messages</Text>
                    <View style={[styles.card, { backgroundColor: isDark ? colors.inputBackground : '#fff' }]}>
                        <SettingRow
                            title="Default message timer"
                            value={formatTimer(user?.privacy_disappearing_messages_timer)}
                            onPress={handleDisappearingMessagesSelection}
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
    sectionDescription: {
        fontSize: 13,
        color: 'gray',
        marginBottom: 12,
        marginLeft: 4,
    },
    card: {
        borderRadius: 16,
        overflow: 'hidden',
        // Shadow for light mode
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
