import { useAppTheme } from '@/hooks/useAppTheme';
import React, { useEffect } from 'react';
import { StyleSheet, ViewStyle, View, Platform, LayoutAnimation, UIManager } from 'react-native';
import { Edge, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useStore } from '@/store';

// setLayoutAnimationEnabledExperimental is a no-op in the New Architecture and triggers a warning
// if (Platform.OS === 'android') {
//     if (UIManager.setLayoutAnimationEnabledExperimental) {
//         UIManager.setLayoutAnimationEnabledExperimental(true);
//     }
// }

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
    const insets = useSafeAreaInsets();
    const { colors } = useAppTheme();
    const animationsEnabled = useStore((state) => state.animationsEnabled);

    // Calculate padding based on edges
    const paddingStyle = {
        paddingTop: edges.includes('top') ? insets.top : 0,
        paddingBottom: edges.includes('bottom') ? insets.bottom : 0,
        paddingLeft: edges.includes('left') ? insets.left : 0,
        paddingRight: edges.includes('right') ? insets.right : 0,
    };

    const containerStyle = {
        backgroundColor: backgroundColor || colors.background,
        flex: 1,
    };

    return (
        <View style={[styles.container, containerStyle, paddingStyle]}>
            <View style={[styles.contentContainer, style]}>
                {children}
            </View>
        </View>
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
