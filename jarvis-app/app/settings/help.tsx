import { ScreenWrapper } from '@/components/ScreenWrapper';
import { Text, View } from '@/components/Themed';
import { useStore } from '@/store';
import { useAppTheme } from '@/hooks/useAppTheme';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';

export default function HelpSettingsScreen() {
    const { colors, isDark } = useAppTheme();
    const showAlert = useStore((state) => state.showAlert);
    const router = useRouter();

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
                    <FontAwesome name="chevron-left" size={18} color={colors.primary} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: colors.text }]}>Help</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent}>
                <View style={[styles.card, { backgroundColor: isDark ? colors.inputBackground : '#fff' }]}>
                    <SettingRow title="Help Center" icon="question-circle" onPress={() => showAlert('External Link', 'Opening Help Center...')} />
                    <SettingRow title="Contact us" icon="envelope-o" onPress={() => showAlert('Contact', 'Developing contact form...')} />
                    <SettingRow title="Terms and Privacy Policy" icon="file-text-o" onPress={() => showAlert('Privacy', 'Opening Privacy Policy...')} />
                    <SettingRow title="App info" icon="info-circle" onPress={() => showAlert('App Info', 'Jarvis AI v1.0.0')} />
                </View>
            </ScrollView>
        </ScreenWrapper>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 15, paddingTop: 20, paddingBottom: 12, borderBottomWidth: StyleSheet.hairlineWidth },
    backButton: { padding: 5, width: 40 },
    headerTitle: { fontSize: 18, fontWeight: 'bold' },
    scrollContent: { padding: 16 },
    card: { borderRadius: 16, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 2 },
    row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 16, paddingHorizontal: 16, borderBottomWidth: StyleSheet.hairlineWidth },
    iconContainer: { width: 32, alignItems: 'center', marginRight: 12 },
    rowTitle: { flex: 1, fontSize: 16, fontWeight: '500' }
});
