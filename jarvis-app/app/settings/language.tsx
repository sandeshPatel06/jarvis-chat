import { ScreenWrapper } from '@/components/ScreenWrapper';
import { Text, View } from '@/components/Themed';
import { useStore } from '@/store';
import { useAppTheme } from '@/hooks/useAppTheme';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';

export default function LanguageSettingsScreen() {
    const { colors, isDark } = useAppTheme();
    const user = useStore((state) => state.user);
    const updateSettings = useStore((state) => state.updateSettings);
    const router = useRouter();

    const languages = [
        { code: 'en', name: 'English', native: 'English' },
        { code: 'es', name: 'Spanish', native: 'Español' },
        { code: 'fr', name: 'French', native: 'Français' },
        { code: 'de', name: 'German', native: 'Deutsch' },
        { code: 'hi', name: 'Hindi', native: 'हिन्दी' },
    ];

    const handleSelect = async (code: string) => {
        try {
            await updateSettings({ app_language: code });
        } catch (error) {
            // Error handled by store
        }
    };

    return (
        <ScreenWrapper style={styles.container} edges={['top', 'left', 'right', 'bottom']}>
            <View style={[styles.header, { borderBottomColor: colors.itemSeparator }]}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <FontAwesome name="chevron-left" size={18} color={colors.primary} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: colors.text }]}>App Language</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent}>
                <View style={[styles.card, { backgroundColor: isDark ? colors.inputBackground : '#fff' }]}>
                    {languages.map((lang) => (
                        <TouchableOpacity
                            key={lang.code}
                            style={[styles.row, { borderBottomColor: colors.itemSeparator }]}
                            onPress={() => handleSelect(lang.code)}
                        >
                            <View style={styles.rowMain}>
                                <Text style={[styles.rowTitle, { color: colors.text }]}>{lang.name}</Text>
                                <Text style={styles.rowValue}>{lang.native}</Text>
                            </View>
                            {user?.app_language === lang.code && (
                                <FontAwesome name="check-circle" size={20} color={colors.primary} />
                            )}
                        </TouchableOpacity>
                    ))}
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
    rowMain: { flex: 1 },
    rowTitle: { fontSize: 16, fontWeight: '500' },
    rowValue: { fontSize: 14, color: 'gray', marginTop: 2 }
});
