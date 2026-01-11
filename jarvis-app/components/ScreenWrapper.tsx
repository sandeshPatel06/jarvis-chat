import { useAppTheme } from '@/hooks/useAppTheme';
import React from 'react';
import { StyleSheet, ViewStyle } from 'react-native';
import { Edge, SafeAreaView } from 'react-native-safe-area-context';

interface ScreenWrapperProps {
    children: React.ReactNode;
    style?: ViewStyle | ViewStyle[];
    edges?: Edge[];
    backgroundColor?: string;
}

export const ScreenWrapper: React.FC<ScreenWrapperProps> = ({
    children,
    style,
    edges = ['top', 'left', 'right'], // Default edges
    backgroundColor
}) => {
    const { colors } = useAppTheme();

    const containerStyle = {
        backgroundColor: backgroundColor || colors.background,
        flex: 1,
    };

    return (
        <SafeAreaView edges={edges} style={[styles.container, containerStyle, style]}>
            {children}
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
});
