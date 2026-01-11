import { Text, View } from '@/components/Themed';
import Colors from '@/constants/Colors';
import { StyleSheet } from 'react-native';

export default function PeopleScreen() {
    return (
        <View style={styles.container}>
            <Text style={styles.title}>Contacts</Text>
            <View style={styles.separator} lightColor="#eee" darkColor="rgba(255,255,255,0.1)" />
            <Text style={styles.subtitle}>Find people to chat with</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: Colors.dark.text,
    },
    subtitle: {
        fontSize: 16,
        color: 'gray',
        marginTop: 10,
    },
    separator: {
        marginVertical: 30,
        height: 1,
        width: '80%',
    },
});
