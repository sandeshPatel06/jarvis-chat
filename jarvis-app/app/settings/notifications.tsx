import { ScreenWrapper } from '@/components/ScreenWrapper';
import { Text, View } from '@/components/Themed';
import { useStore } from '@/store';
import { useAppTheme } from '@/hooks/useAppTheme';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { ScrollView, StyleSheet, TouchableOpacity, Switch } from 'react-native';
import { useRouter } from 'expo-router';

export default function NotificationsSettingsScreen() {
    const { colors, isDark } = useAppTheme();
    const user = useStore((state) => state.user);
    const updateSettings = useStore((state) => state.updateSettings);
    const router = useRouter();

    const handleToggle = async (field: string, value: boolean) => {
        try {
            await updateSettings({ [field]: value });
        } catch (error) {
            // Error handled by store
        }
    };

    const SettingRow = ({ title, subtitle, isSwitch, switchValue, onSwitchChange }: any) => (
        <View style={[styles.row, { borderBottomColor: colors.itemSeparator }]} >
            <View style={styles.rowMain}>
                <Text style={[styles.rowTitle, { color: colors.text }]}>{title}</Text>
                {subtitle && <Text style={styles.rowValue}>{subtitle}</Text>}
            </View>
            <Switch
                value={switchValue}
                onValueChange={onSwitchChange}
                trackColor={{ false: '#767577', true: colors.primary }}
                thumbColor={'white'}
            />
        </View>
    );

    return (
        <ScreenWrapper style={styles.container} edges={['top', 'left', 'right', 'bottom']}>
            <View style={[styles.header, { borderBottomColor: colors.itemSeparator }]}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <FontAwesome name="bell" size={18} color={colors.primary} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: colors.text }]}>Notifications</Text>
                {/* <View style={{ width: 40 }} /> */}
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent}>
                <View style={styles.section}>
                    <Text style={[styles.sectionTitle, { color: colors.primary }]}>Message Notifications</Text>
                    <View style={[styles.card, { backgroundColor: isDark ? colors.inputBackground : '#fff' }]}>
                        <SettingRow
                            title="Show Notifications"
                            subtitle="Show notifications for incoming messages"
                            switchValue={user?.notifications_enabled ?? true}
                            onSwitchChange={(v: boolean) => handleToggle('notifications_enabled', v)}
                        />
                        <SettingRow
                            title="Sound"
                            subtitle="Play sounds for incoming messages"
                            switchValue={user?.notifications_sound ?? true}
                            onSwitchChange={(v: boolean) => handleToggle('notifications_sound', v)}
                        />
                    </View>
                </View>

                <View style={styles.section}>
                    <Text style={[styles.sectionTitle, { color: colors.primary }]}>Group Notifications</Text>
                    <View style={[styles.card, { backgroundColor: isDark ? colors.inputBackground : '#fff' }]}>
                        <SettingRow
                            title="Show Notifications"
                            subtitle="Show notifications for group messages"
                            switchValue={user?.notifications_groups_enabled ?? true}
                            onSwitchChange={(v: boolean) => handleToggle('notifications_groups_enabled', v)}
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
