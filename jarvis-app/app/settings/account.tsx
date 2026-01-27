import { ScreenWrapper } from '@/components/ScreenWrapper';
import { Text, View } from '@/components/Themed';
import { useStore } from '@/store';
import { useAppTheme } from '@/hooks/useAppTheme';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { ScrollView, StyleSheet, TouchableOpacity, Switch } from 'react-native';
import { useRouter } from 'expo-router';

export default function AccountSettingsScreen() {
    const { colors, isDark } = useAppTheme();
    const user = useStore((state) => state.user);
    const updateSettings = useStore((state) => state.updateSettings);
    const deleteAccount = useStore((state) => state.deleteAccount);
    const showAlert = useStore((state) => state.showAlert);
    const router = useRouter();

    const handleToggleSecurity = async (value: boolean) => {
        try {
            await updateSettings({ security_notifications_enabled: value });
        } catch (e) { }
    };

    const handleToggleTwoStep = async (value: boolean) => {
        try {
            await updateSettings({ two_step_verification_enabled: value });
        } catch (e) { }
    };

    const handleDeleteAccount = () => {
        showAlert(
            'Delete Account',
            'Are you sure you want to delete your account? This action is permanent and cannot be undone.',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await deleteAccount();
                            router.replace('/auth/login');
                        } catch (e) { }
                    }
                }
            ]
        );
    };

    const SettingRow = ({ title, icon, onPress, isSwitch, switchValue, onSwitchChange }: any) => (
        <TouchableOpacity
            style={[styles.row, { borderBottomColor: colors.itemSeparator }]}
            onPress={onPress}
            disabled={isSwitch}
        >
            <View style={styles.iconContainer}>
                <FontAwesome name={icon} size={18} color={colors.primary} />
            </View>
            <Text style={[styles.rowTitle, { color: colors.text }]}>{title}</Text>
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
                    <FontAwesome name="user" size={18} color={colors.primary} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: colors.text }]}>Account</Text>
                {/* <View style={{ width: 40 }} /> */}
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent}>
                <View style={[styles.card, { backgroundColor: isDark ? colors.inputBackground : '#fff' }]}>
                    <SettingRow
                        title="Security notifications"
                        icon="shield"
                        isSwitch
                        switchValue={user?.security_notifications_enabled ?? false}
                        onSwitchChange={handleToggleSecurity}
                    />
                    <SettingRow
                        title="Two-step verification"
                        icon="lock"
                        isSwitch
                        switchValue={user?.two_step_verification_enabled ?? false}
                        onSwitchChange={handleToggleTwoStep}
                    />
                    <SettingRow title="Change number" icon="phone" onPress={() => router.push('/settings/profile')} />
                    <SettingRow title="Request account info" icon="file-text-o" onPress={() => showAlert('Action Success', 'Your account info report will be ready in 3 days.')} />
                    <SettingRow title="Delete my account" icon="trash-o" onPress={handleDeleteAccount} />
                </View>
            </ScrollView>
        </ScreenWrapper>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 ,},
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 15, paddingTop: 20, paddingBottom: 12, borderBottomWidth: StyleSheet.hairlineWidth },
    backButton: { padding: 5, width: 40 },
    headerTitle: { fontSize: 18, fontWeight: 'bold' , marginVertical: 10 },
    scrollContent: { padding: 16 },
    card: { borderRadius: 16, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 2 },
    row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 16, paddingHorizontal: 16, borderBottomWidth: StyleSheet.hairlineWidth },
    iconContainer: { width: 32, alignItems: 'center', marginRight: 12 },
    rowTitle: { flex: 1, fontSize: 16, fontWeight: '500' }
});
