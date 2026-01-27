import { ScreenWrapper } from '@/components/ScreenWrapper';
import { Text, View } from '@/components/Themed';
import { useStore } from '@/store';
import { useAppTheme } from '@/hooks/useAppTheme';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { ScrollView, StyleSheet, TouchableOpacity, Switch } from 'react-native';
import { useRouter } from 'expo-router';

export default function StorageSettingsScreen() {
    const { colors, isDark } = useAppTheme();
    const user = useStore((state) => state.user);
    const updateSettings = useStore((state) => state.updateSettings);
    const router = useRouter();

    const handleToggle = async (value: boolean) => {
        try {
            await updateSettings({ storage_auto_download_media: value });
        } catch (error) {
            // Error handled by store
        }
    };

    return (
        <ScreenWrapper style={styles.container} edges={['top', 'left', 'right', 'bottom']}>
            <View style={[styles.header, { borderBottomColor: colors.itemSeparator }]}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <FontAwesome name="database" size={18} color={colors.primary} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: colors.text }]}>Storage and Data</Text>
                {/* <View style={{ width: 40 }} /> */}
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent}>
                <View style={styles.section}>
                    <Text style={[styles.sectionTitle, { color: colors.primary }]}>Media Auto-download</Text>
                    <View style={[styles.card, { backgroundColor: isDark ? colors.inputBackground : '#fff' }]}>
                        <View style={[styles.row, { borderBottomColor: colors.itemSeparator }]} >
                            <View style={styles.rowMain}>
                                <Text style={[styles.rowTitle, { color: colors.text }]}>Auto-download Media</Text>
                                <Text style={styles.rowValue}>Automatically download incoming photos and videos</Text>
                            </View>
                            <Switch
                                value={user?.storage_auto_download_media ?? true}
                                onValueChange={handleToggle}
                                trackColor={{ false: '#767577', true: colors.primary }}
                                thumbColor={'white'}
                            />
                        </View>
                    </View>
                </View>

                <View style={styles.section}>
                    <Text style={[styles.sectionTitle, { color: colors.primary }]}>Network Usage</Text>
                    <View style={[styles.card, { backgroundColor: isDark ? colors.inputBackground : '#fff' }]}>
                        <TouchableOpacity style={styles.row}>
                            <Text style={[styles.rowTitle, { color: colors.text }]}>Manage Storage</Text>
                            <Text style={styles.rowValue}>0 KB</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.row}>
                            <Text style={[styles.rowTitle, { color: colors.text }]}>Network Usage</Text>
                            <Text style={styles.rowValue}>0 KB sent • 0 KB received</Text>
                        </TouchableOpacity>
                    </View>
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
    section: { marginBottom: 24 },
    sectionTitle: { fontSize: 14, fontWeight: 'bold', marginBottom: 8, marginLeft: 4, textTransform: 'uppercase' },
    card: { borderRadius: 16, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 2 },
    row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 16, paddingHorizontal: 16, borderBottomWidth: StyleSheet.hairlineWidth },
    rowMain: { flex: 1 },
    rowTitle: { fontSize: 16, fontWeight: '500' },
    rowValue: { fontSize: 14, color: 'gray', marginTop: 2 }
});
