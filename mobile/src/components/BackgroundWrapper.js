/**
 * BackgroundWrapper - Container global com efeito de luz ambiente
 * 
 * Cria um fundo com luzes difusas (glow) para dar profundidade ao app.
 * Estrutura: Background > Ambient Lights > SafeArea > Content
 */

import React from 'react';
import { StyleSheet, View, SafeAreaView, StatusBar } from 'react-native';
import { COLORS } from '../constants/theme';

export default function BackgroundWrapper({ children, style }) {
    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />

            {/* Layer 1: Ambient Light / Glow (Top-Left) */}
            <View style={[styles.ambientLight, styles.ambientTopLeft]} />

            {/* Layer 1b: Ambient Light / Glow (Bottom-Right) */}
            <View style={[styles.ambientLight, styles.ambientBottomRight]} />

            {/* Layer 2: Content */}
            <SafeAreaView style={[styles.content, style]}>
                {children}
            </SafeAreaView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    ambientLight: {
        position: 'absolute',
        width: 300,
        height: 300,
        borderRadius: 150,
        opacity: 0.12,
    },
    ambientTopLeft: {
        top: -100,
        left: -100,
        backgroundColor: COLORS.primary,
    },
    ambientBottomRight: {
        bottom: -100,
        right: -100,
        backgroundColor: COLORS.secondary,
    },
    content: {
        flex: 1,
    },
});
