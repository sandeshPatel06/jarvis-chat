import { ScreenWrapper } from '@/components/ScreenWrapper';
import { Text, View } from '@/components/Themed';
import { useAppTheme } from '@/hooks/useAppTheme';
import { StyleSheet } from 'react-native';

export default function PeopleScreen() {
    const { colors } = useAppTheme();

    return (
        <ScreenWrapper style={styles.container}>
            <View style={styles.content}>
                <Text style={[styles.title, { color: colors.text }]}>Contacts</Text>
                <View style={[styles.separator, { backgroundColor: colors.itemSeparator }]} />
                <Text style={[styles.subtitle, { color: colors.text, opacity: 0.6 }]}>Find people to chat with</Text>
            </View>
        </ScreenWrapper>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    content: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
    },
    subtitle: {
        fontSize: 16,
        marginTop: 10,
    },
    separator: {
        marginVertical: 30,
        height: 1,
        width: '80%',
    },
});
