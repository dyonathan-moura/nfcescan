/**
 * GlassCard - Container com efeito de vidro (Glassmorphism Real)
 * 
 * Estrutura de camadas:
 * 1. Container (overflow hidden, borderRadius)
 * 2. BlurView (fundo desfocado)
 * 3. LinearGradient (reflexo sutil)
 * 4. Border (borda translúcida)
 * 5. Content (conteúdo)
 */

import React from 'react';
import { StyleSheet, View } from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, SIZES } from '../constants/theme';

export default function GlassCard({
    children,
    style,
    intensity = 30,
    noPadding = false,
    borderRadius = SIZES.radiusMd,
    variant = 'default' // 'default' | 'elevated' | 'subtle'
}) {
    const getVariantStyles = () => {
        switch (variant) {
            case 'elevated':
                return {
                    borderColor: 'rgba(255,255,255,0.15)',
                    gradientColors: ['rgba(255,255,255,0.12)', 'rgba(255,255,255,0.03)'],
                };
            case 'subtle':
                return {
                    borderColor: 'rgba(255,255,255,0.05)',
                    gradientColors: ['rgba(255,255,255,0.05)', 'rgba(255,255,255,0.01)'],
                };
            default:
                return {
                    borderColor: 'rgba(255,255,255,0.1)',
                    gradientColors: ['rgba(255,255,255,0.08)', 'rgba(255,255,255,0.02)'],
                };
        }
    };

    const variantStyles = getVariantStyles();

    return (
        <View style={[styles.container, { borderRadius }, style]}>
            {/* Layer 1: Blur Background */}
            <BlurView
                intensity={intensity}
                tint="dark"
                style={StyleSheet.absoluteFill}
            />

            {/* Layer 2: Gradient Overlay (glass reflection) */}
            <LinearGradient
                colors={variantStyles.gradientColors}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={StyleSheet.absoluteFill}
            />

            {/* Layer 3: Border */}
            <View
                style={[
                    styles.border,
                    { borderRadius, borderColor: variantStyles.borderColor }
                ]}
            />

            {/* Layer 4: Content */}
            <View style={[styles.content, noPadding && { padding: 0 }]}>
                {children}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        overflow: 'hidden',
        backgroundColor: 'rgba(255,255,255,0.03)',
    },
    border: {
        ...StyleSheet.absoluteFillObject,
        borderWidth: 1,
    },
    content: {
        padding: SIZES.padding,
    },
});
