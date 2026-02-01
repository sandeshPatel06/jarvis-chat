import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import * as LocalAuthentication from 'expo-local-authentication';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { LinearGradient } from 'expo-linear-gradient';
import { useAppTheme } from '@/hooks/useAppTheme';

export const LockScreen: React.FC<{ onUnlock: () => void }> = ({ onUnlock }) => {
    const { colors } = useAppTheme();
    const [authenticating, setAuthenticating] = useState(false);

    useEffect(() => {
        // Auto-trigger authentication on mount
        handleAuthenticate();
    }, []);

    const handleAuthenticate = async () => {
        try {
            setAuthenticating(true);

            const hasHardware = await LocalAuthentication.hasHardwareAsync();
            if (!hasHardware) {
                Alert.alert('Not Supported', 'Biometric authentication is not available on this device');
                onUnlock(); // Unlock anyway
                return;
            }

            const isEnrolled = await LocalAuthentication.isEnrolledAsync();
            if (!isEnrolled) {
                Alert.alert(
                    'Not Enrolled',
                    'No biometric data found. Please set up biometric authentication in your device settings.',
                    [
                        {
                            text: 'Unlock Anyway',
                            onPress: onUnlock,
                        },
                    ]
                );
                return;
            }

            const result = await LocalAuthentication.authenticateAsync({
                promptMessage: 'Unlock Jarvis Chat',
                fallbackLabel: 'Use Passcode',
                cancelLabel: 'Cancel',
            });

            if (result.success) {
                onUnlock();
            } else {
                Alert.alert('Authentication Failed', 'Please try again');
            }
        } catch (error) {
            console.error('Authentication error:', error);
            Alert.alert('Error', 'Authentication failed');
        } finally {
            setAuthenticating(false);
        }
    };

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <LinearGradient
                colors={[colors.primary + '20', colors.secondary + '20']}
                style={styles.gradient}
            >
                <View style={styles.content}>
                    <View style={[styles.iconContainer, { backgroundColor: colors.card }]}>
                        <FontAwesome name="lock" size={60} color={colors.primary} />
                    </View>

                    <Text style={[styles.title, { color: colors.text }]}>
                        Jarvis Chat is Locked
                    </Text>

                    <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                        Authenticate to continue
                    </Text>

                    <TouchableOpacity
                        style={[styles.button, { backgroundColor: colors.primary }]}
                        onPress={handleAuthenticate}
                        disabled={authenticating}
                    >
                        <FontAwesome name="hand-o-up" size={24} color="#fff" style={styles.buttonIcon} />
                        <Text style={styles.buttonText}>
                            {authenticating ? 'Authenticating...' : 'Unlock'}
                        </Text>
                    </TouchableOpacity>
                </View>
            </LinearGradient>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    gradient: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    content: {
        alignItems: 'center',
        padding: 20,
    },
    iconContainer: {
        width: 120,
        height: 120,
        borderRadius: 60,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 30,
        elevation: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
    },
    title: {
        fontSize: 24,
        fontWeight: '700',
        marginBottom: 10,
        textAlign: 'center',
    },
    subtitle: {
        fontSize: 16,
        marginBottom: 40,
        textAlign: 'center',
    },
    button: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 15,
        paddingHorizontal: 30,
        borderRadius: 25,
        elevation: 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
    },
    buttonIcon: {
        marginRight: 10,
    },
    buttonText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: '600',
    },
});
