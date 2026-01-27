import { ScreenWrapper } from '@/components/ScreenWrapper';
import { Text, View } from '@/components/Themed';
import { useStore } from '@/store';
import { useAppTheme } from '@/hooks/useAppTheme';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { ScrollView, StyleSheet, TouchableOpacity, Linking } from 'react-native';
import { useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import * as Device from 'expo-device';

export default function HelpSettingsScreen() {
    const { colors, isDark } = useAppTheme();
    const showAlert = useStore((state) => state.showAlert);
    const router = useRouter();

    const handleHelpCenter = async () => {
        try {
            await WebBrowser.openBrowserAsync('https://support.jarvis-chat.com');
        } catch (error) {
            showAlert('Error', 'Could not open help center. Please try again later.');
        }
    };

    const handleContactUs = async () => {
        const url = 'mailto:support@jarvis-chat.com?subject=Jarvis AI Support Request';
        const canOpen = await Linking.canOpenURL(url);
        if (canOpen) {
            await Linking.openURL(url);
        } else {
            showAlert('Contact Us', 'Please email us at support@jarvis-chat.com');
        }
    };

    const handlePrivacyPolicy = () => {
        router.push('/settings/privacy');
    };

    const handleAppInfo = () => {
        const deviceInfo = `Device: ${Device.modelName || 'Unknown Device'}\nOS: ${Device.osName} ${Device.osVersion || ''}`;
        showAlert('App Info', `Jarvis AI v1.0.0\nDeveloped by High-Tech Services\nBuild 2026.01.27\n\n${deviceInfo}`);
    };

    const SettingRow = ({ title, icon, onPress }: any) => (
        <TouchableOpacity
            style={[styles.row, { borderBottomColor: colors.itemSeparator }]}
            onPress={onPress}
        >
            <View style={styles.iconContainer}>
                <FontAwesome name={icon} size={18} color={colors.primary} />
            </View>
            <Text style={[styles.rowTitle, { color: colors.text }]}>{title}</Text>
            <FontAwesome name="chevron-right" size={14} color={colors.tabIconDefault} />
        </TouchableOpacity>
    );

    return (
        <ScreenWrapper style={styles.container} edges={['top', 'left', 'right', 'bottom']}>
            <View style={[styles.header, { borderBottomColor: colors.itemSeparator }]}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <FontAwesome name="question-circle" size={18} color={colors.primary} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: colors.text }]}>Help</Text>
                {/* <View style={{ width: 40 }} /> */}
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent}>
                <View style={[styles.card, { backgroundColor: isDark ? colors.inputBackground : '#fff' }]}>
                    <SettingRow title="Help Center" icon="question-circle" onPress={handleHelpCenter} />
                    <SettingRow title="Contact us" icon="envelope-o" onPress={handleContactUs} />
                    <SettingRow title="Terms and Privacy Policy" icon="file-text-o" onPress={handlePrivacyPolicy} />
                    <SettingRow title="App info" icon="info-circle" onPress={handleAppInfo} />
                </View>
            </ScrollView>
        </ScreenWrapper>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 15, paddingTop: 20, paddingBottom: 12, borderBottomWidth: StyleSheet.hairlineWidth },
    backButton: { padding: 5, width: 40 },
    headerTitle: { fontSize: 18, fontWeight: 'bold', marginVertical: 10 },
    scrollContent: { padding: 16 },
    card: { borderRadius: 16, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 2 },
    row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 16, paddingHorizontal: 16, borderBottomWidth: StyleSheet.hairlineWidth },
    iconContainer: { width: 32, alignItems: 'center', marginRight: 12 },
    rowTitle: { flex: 1, fontSize: 16, fontWeight: '500' }
});
