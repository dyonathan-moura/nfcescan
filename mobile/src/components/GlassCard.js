/**
 * GlassCard - Container com efeito de vidro (Glassmorphism)
 * 
 * Usa BlurView para criar um efeito de desfoque com fundo semitransparente.
 */

import React from 'react';
import { StyleSheet, View } from 'react-native';
import { BlurView } from 'expo-blur';
import { COLORS, SIZES } from '../constants/theme';

export default function GlassCard({ children, style, intensity = 20, noPadding = false }) {
    return (
        <BlurView
            intensity={intensity}
            tint="dark"
            style={[styles.container, style]}
        >
            <View style={[styles.innerContainer, noPadding && { padding: 0 }]}>
                {children}
            </View>
        </BlurView>
    );
}

const styles = StyleSheet.create({
    container: {
        backgroundColor: COLORS.surfaceGlass,
        borderColor: COLORS.border,
        borderWidth: 1,
        borderRadius: SIZES.radius,
        overflow: 'hidden',
    },
    innerContainer: {
        padding: SIZES.padding,
    },
});
