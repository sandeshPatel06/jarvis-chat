import { useAppTheme } from '@/hooks/useAppTheme';
import { useStore } from '@/store';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useRouter } from 'expo-router';
import React from 'react';
import { Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { BlurView } from 'expo-blur';

export default function IncomingCallModal() {
    const { callState, acceptCall, endCall, chats } = useStore();
    const { incomingCall } = callState;
    const { colors, isDark } = useAppTheme();
    const router = useRouter();

    if (!incomingCall) return null;

    const chat = chats.find(c => c.id === incomingCall.chatId);

    const handleAccept = async () => {
        await acceptCall();
        router.push(`/call/${incomingCall.chatId}`);
    };

    const handleDecline = () => {
        endCall();
    };

    return (
        <Modal
            transparent
            visible={!!incomingCall}
            animationType="slide"
            onRequestClose={handleDecline}
        >
            <View style={styles.overlay}>
                <BlurView
                    intensity={90}
                    tint={isDark ? "dark" : "light"}
                    style={StyleSheet.absoluteFill}
                />

                <View style={styles.container}>
                    <View style={styles.callerInfo}>
                        <View style={[styles.avatarContainer, { backgroundColor: colors.primary }]}>
                            <FontAwesome name="user" size={40} color="white" />
                        </View>
                        <Text style={[styles.callerName, { color: colors.text }]}>{chat?.name || 'Unknown Caller'}</Text>
                        <Text style={[styles.callStatus, { color: colors.text }]}>Incoming Video Call...</Text>
                    </View>

                    <View style={styles.actions}>
                        <TouchableOpacity style={[styles.button, styles.declineButton]} onPress={handleDecline}>
                            <MaterialIcons name="call-end" size={32} color="white" />
                            <Text style={styles.buttonText}>Decline</Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={[styles.button, styles.acceptButton]} onPress={handleAccept}>
                            <MaterialIcons name="call" size={32} color="white" />
                            <Text style={styles.buttonText}>Accept</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    container: {
        width: '100%',
        height: '100%',
        justifyContent: 'space-between',
        paddingVertical: 100,
        paddingHorizontal: 40,
    },
    callerInfo: {
        alignItems: 'center',
    },
    avatarContainer: {
        width: 100,
        height: 100,
        borderRadius: 50,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 20,
        elevation: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 10,
    },
    callerName: {
        fontSize: 28,
        fontWeight: 'bold',
        marginBottom: 10,
    },
    callStatus: {
        fontSize: 16,
        opacity: 0.7,
    },
    actions: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        width: '100%',
    },
    button: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    acceptButton: {
        backgroundColor: '#4CD964',
        width: 70,
        height: 70,
        borderRadius: 35,
        elevation: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 5,
    },
    declineButton: {
        backgroundColor: '#FF3B30',
        width: 70,
        height: 70,
        borderRadius: 35,
        elevation: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 5,
    },
    buttonText: {
        color: 'white',
        marginTop: 8,
        fontSize: 14,
        fontWeight: '600',
        position: 'absolute',
        bottom: -30,
    },
});
