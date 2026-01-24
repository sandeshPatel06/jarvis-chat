import { useAppTheme } from '@/hooks/useAppTheme';
import React, { useEffect } from 'react';
import { StyleSheet, ViewStyle, View, Platform, LayoutAnimation, UIManager } from 'react-native';
import { Edge, SafeAreaView } from 'react-native-safe-area-context';
import { useStore } from '@/store';

if (Platform.OS === 'android') {
    if (UIManager.setLayoutAnimationEnabledExperimental) {
        UIManager.setLayoutAnimationEnabledExperimental(true);
    }
}

interface ScreenWrapperProps {
    children: React.ReactNode;
    style?: ViewStyle | ViewStyle[];
    edges?: Edge[];
    backgroundColor?: string;
}

export const ScreenWrapper: React.FC<ScreenWrapperProps> = ({
    children,
    style,
    edges = ['left', 'right'], // Default edges - top and bottom handled by navigation
    backgroundColor
}) => {
    const { colors } = useAppTheme();
    const animationsEnabled = useStore((state) => state.animationsEnabled);

    // Optional: Global layout animation for screen entry/updates if desired
    // useEffect(() => {
    //    if (animationsEnabled) LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    // }, [children, animationsEnabled]);

    const containerStyle = {
        backgroundColor: backgroundColor || colors.background,
        flex: 1,
    };

    return (
        <SafeAreaView edges={edges} style={[styles.container, containerStyle]}>
            <View style={[styles.contentContainer, style]}>
                {children}
            </View>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    contentContainer: {
        flex: 1,
        width: '100%',
        maxWidth: 600, // Responsive Limit
        alignSelf: 'center',
        paddingTop: Platform.OS === 'web' ? 20 : 0, // Extra top padding for web
    },
});
