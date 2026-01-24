import React from 'react';
import { Modal, View, StyleSheet, TouchableOpacity, Image, Dimensions, StatusBar, Text, Linking } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Video, ResizeMode } from 'expo-av';
import { WebView } from 'react-native-webview';

interface MediaViewerProps {
    visible: boolean;
    mediaUri: string | null;
    mediaType: 'image' | 'video' | 'pdf' | 'document' | null;
    fileName?: string;
    onClose: () => void;
}

const { width, height } = Dimensions.get('window');

export const MediaViewer: React.FC<MediaViewerProps> = ({ visible, mediaUri, mediaType, fileName, onClose }) => {
    const videoRef = React.useRef<Video>(null);

    React.useEffect(() => {
        if (!visible && videoRef.current) {
            videoRef.current.pauseAsync();
        }
    }, [visible]);

    const handleOpenExternal = () => {
        if (mediaUri) {
            Linking.openURL(mediaUri).catch(err => console.error('Failed to open:', err));
        }
    };

    if (!mediaUri || !mediaType) return null;

    return (
        <Modal
            visible={visible}
            transparent={true}
            animationType="fade"
            onRequestClose={onClose}
            statusBarTranslucent
        >
            <View style={styles.container}>
                <StatusBar hidden />

                {/* Header with filename and buttons */}
                <View style={styles.header}>
                    {fileName && (
                        <Text style={styles.fileName} numberOfLines={1}>
                            {fileName}
                        </Text>
                    )}
                    <View style={styles.headerButtons}>
                        {(mediaType === 'pdf' || mediaType === 'document') && (
                            <TouchableOpacity style={styles.headerButton} onPress={handleOpenExternal}>
                                <MaterialCommunityIcons name="open-in-new" size={24} color="white" />
                            </TouchableOpacity>
                        )}
                        <TouchableOpacity style={styles.headerButton} onPress={onClose}>
                            <MaterialCommunityIcons name="close" size={28} color="white" />
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Media Content */}
                <View style={styles.mediaContainer}>
                    {mediaType === 'image' ? (
                        <Image
                            source={{ uri: mediaUri }}
                            style={styles.image}
                            resizeMode="contain"
                        />
                    ) : mediaType === 'video' ? (
                        <Video
                            ref={videoRef}
                            source={{ uri: mediaUri }}
                            style={styles.video}
                            useNativeControls
                            resizeMode={ResizeMode.CONTAIN}
                            shouldPlay={false}
                        />
                    ) : mediaType === 'pdf' ? (
                        <WebView
                            source={{ uri: `https://docs.google.com/viewer?url=${encodeURIComponent(mediaUri)}&embedded=true` }}
                            style={styles.webview}
                            startInLoadingState
                        />
                    ) : (
                        <View style={styles.documentContainer}>
                            <MaterialCommunityIcons name="file-document" size={80} color="white" />
                            <Text style={styles.documentText}>
                                {fileName || 'Document'}
                            </Text>
                            <TouchableOpacity style={styles.openButton} onPress={handleOpenExternal}>
                                <Text style={styles.openButtonText}>Open with External App</Text>
                            </TouchableOpacity>
                        </View>
                    )}
                </View>

                {/* Background overlay - tapping closes viewer */}
                <TouchableOpacity
                    style={styles.backgroundOverlay}
                    activeOpacity={1}
                    onPress={onClose}
                />
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.95)',
    },
    backgroundOverlay: {
        ...StyleSheet.absoluteFillObject,
        zIndex: -1,
    },
    header: {
        position: 'absolute',
        top: 50,
        left: 0,
        right: 0,
        zIndex: 10,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
    },
    fileName: {
        flex: 1,
        color: 'white',
        fontSize: 16,
        fontWeight: '600',
        marginRight: 16,
    },
    headerButtons: {
        flexDirection: 'row',
        gap: 12,
    },
    headerButton: {
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        borderRadius: 20,
        padding: 8,
    },
    mediaContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingTop: 100,
    },
    image: {
        width: width,
        height: height - 100,
    },
    video: {
        width: width,
        height: height * 0.7,
    },
    webview: {
        flex: 1,
        width: width,
        backgroundColor: 'transparent',
    },
    documentContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 40,
    },
    documentText: {
        color: 'white',
        fontSize: 18,
        fontWeight: '600',
        marginTop: 20,
        marginBottom: 30,
        textAlign: 'center',
    },
    openButton: {
        backgroundColor: '#007AFF',
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 8,
    },
    openButtonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: '600',
    },
});
