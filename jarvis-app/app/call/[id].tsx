import { ScreenWrapper } from '@/components/ScreenWrapper';
import { useAppTheme } from '@/hooks/useAppTheme';
import { webrtcService } from '@/services/webrtc';
import { useStore } from '@/store';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { RTCView } from 'react-native-webrtc';

export default function CallScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const router = useRouter();
    const { colors } = useAppTheme();
    const { callState, endCall, chats } = useStore();
    const { localStream, remoteStream, isCalling } = callState;

    const [isMuted, setIsMuted] = useState(false);
    const [isVideoEnabled, setIsVideoEnabled] = useState(true);
    const [isFrontCamera, setIsFrontCamera] = useState(true);
    const [isSpeakerOn, setIsSpeakerOn] = useState(true);

    const chat = chats.find(c => c.id === id);

    useEffect(() => {
        console.log(`[CallScreen] 📺 Stream check: Local=${localStream?.toURL()}, Remote=${remoteStream?.toURL()}`);
        if (remoteStream) {
            console.log(`[CallScreen] Remote Tracks: ${remoteStream.getTracks().length}`);
            remoteStream.getTracks().forEach(t => {
                console.log(`[CallScreen] Remote Track ${t.id}: Kind=${t.kind}, Enabled=${t.enabled}, Muted=${t.muted}`);
                // Add fresh listeners to existing tracks if needed (though we do this in webrtc.ts)
            });
        }
    }, [remoteStream, localStream]);

    useEffect(() => {
        if (!isCalling) {
            // Use replace to go to home instead of back to avoid navigation errors
            router.replace('/(tabs)');
        }
    }, [isCalling]);

    const handleEndCall = () => {
        endCall();
        router.replace('/(tabs)');
    };

    const toggleMute = () => {
        const newMuted = !isMuted;
        setIsMuted(newMuted);
        webrtcService.toggleAudio(!newMuted);
    };

    const toggleVideo = () => {
        const newVideo = !isVideoEnabled;
        setIsVideoEnabled(newVideo);
        webrtcService.toggleVideo(newVideo);
    };

    const switchCamera = () => {
        webrtcService.switchCamera();
        setIsFrontCamera(!isFrontCamera);
    };

    const toggleSpeaker = () => {
        const nextState = !isSpeakerOn;
        setIsSpeakerOn(nextState);
        webrtcService.toggleSpeaker(nextState);
    };

    return (
        <ScreenWrapper style={[styles.container, { backgroundColor: '#000' }]} edges={['top', 'left', 'right', 'bottom']}>
            {/* Remote Stream (Full Screen) */}
            {/* Remote Stream (Full Screen) */}
            <View style={styles.remoteStreamContainer}>
                {remoteStream ? (
                    <RTCView
                        key={remoteStream.toURL()} // Force re-render on stream change
                        streamURL={remoteStream.toURL()}
                        style={styles.remoteStream}
                        objectFit="cover"
                        mirror={false}
                        zOrder={0} // Ensure it's behind local stream
                    />
                ) : (
                    <View style={styles.connectingContainer}>
                        <Text style={styles.connectingText}>Connecting...</Text>
                        <Text style={styles.remoteName}>{chat?.name || 'Unknown'}</Text>
                    </View>
                )}
            </View>

            {/* Local Stream (PIP) */}
            {localStream && isVideoEnabled && (
                <View style={styles.localStreamContainer}>
                    <RTCView
                        key={localStream.toURL()}
                        streamURL={localStream.toURL()}
                        style={styles.localStream}
                        objectFit="cover"
                        mirror={true}
                        zOrder={1} // Ensure it's on top
                    />
                </View>
            )}

            {/* Controls */}
            <View style={styles.controlsContainer}>
                <TouchableOpacity style={[styles.controlButton, { backgroundColor: isMuted ? 'white' : 'rgba(255,255,255,0.2)' }]} onPress={toggleMute}>
                    <FontAwesome name={isMuted ? "microphone-slash" : "microphone"} size={24} color={isMuted ? 'black' : 'white'} />
                </TouchableOpacity>

                <TouchableOpacity style={[styles.controlButton, { backgroundColor: 'red', width: 70, height: 70, borderRadius: 35 }]} onPress={handleEndCall}>
                    <MaterialIcons name="call-end" size={32} color="white" />
                </TouchableOpacity>

                <TouchableOpacity style={[styles.controlButton, { backgroundColor: !isVideoEnabled ? 'white' : 'rgba(255,255,255,0.2)' }]} onPress={toggleVideo}>
                    <FontAwesome name={!isVideoEnabled ? "video-camera" : "video-camera"} size={24} color={!isVideoEnabled ? 'black' : 'white'} />
                    {!isVideoEnabled && <View style={styles.slashLine} />}
                </TouchableOpacity>

                <TouchableOpacity style={[styles.controlButton, { backgroundColor: 'rgba(255,255,255,0.2)' }]} onPress={switchCamera}>
                    <MaterialIcons name="flip-camera-ios" size={24} color="white" />
                </TouchableOpacity>

                <TouchableOpacity style={[styles.controlButton, { backgroundColor: isSpeakerOn ? 'white' : 'rgba(255,255,255,0.2)' }]} onPress={toggleSpeaker}>
                    <MaterialIcons name={isSpeakerOn ? "volume-up" : "volume-off"} size={24} color={isSpeakerOn ? 'black' : 'white'} />
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.controlButton, { backgroundColor: 'rgba(255,255,255,0.2)' }]}
                    onPress={() => {
                        useStore.getState().setIsMinimized(true);
                        router.back();
                    }}
                >
                    <MaterialIcons name="close-fullscreen" size={24} color="white" />
                </TouchableOpacity>
            </View>
        </ScreenWrapper>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    remoteStreamContainer: {
        flex: 1,
        backgroundColor: '#1a1a1a',
        justifyContent: 'center',
        alignItems: 'center',
    },
    remoteStream: {
        width: '100%',
        height: '100%',
    },
    connectingContainer: {
        alignItems: 'center',
    },
    connectingText: {
        color: 'white',
        fontSize: 18,
        marginBottom: 10,
    },
    remoteName: {
        color: 'white',
        fontSize: 24,
        fontWeight: 'bold',
    },
    localStreamContainer: {
        position: 'absolute',
        top: 50,
        right: 20,
        width: 100,
        height: 150,
        borderRadius: 10,
        overflow: 'hidden',
        borderWidth: 2,
        borderColor: 'white',
        elevation: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.5,
        shadowRadius: 5,
        backgroundColor: '#000',
    },
    localStream: {
        width: '100%',
        height: '100%',
    },
    controlsContainer: {
        position: 'absolute',
        bottom: 40,
        left: 0,
        right: 0,
        flexDirection: 'row',
        justifyContent: 'space-evenly',
        alignItems: 'center',
    },
    controlButton: {
        width: 50,
        height: 50,
        borderRadius: 25,
        justifyContent: 'center',
        alignItems: 'center',
    },
    slashLine: {
        position: 'absolute',
        width: '80%',
        height: 2,
        backgroundColor: 'black',
        transform: [{ rotate: '45deg' }],
    },
});
