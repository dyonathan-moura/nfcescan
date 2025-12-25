/**
 * BackgroundWrapper - Container global com efeito de luz ambiente
 * 
 * Cria um fundo com luzes difusas (glow) para dar profundidade ao app.
 * Estrutura: Background > Ambient Lights > SafeArea > Content
 */

import React from 'react';
import { View, SafeAreaView, StatusBar, StyleSheet } from 'react-native';
import { COLORS } from '../../theme';

export default function BackgroundWrapper({ children, style }) {
    return (
        <SafeAreaView style={[styles.container, style]}>
            <StatusBar barStyle="dark-content" backgroundColor={COLORS.background} />
            {children}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
});
