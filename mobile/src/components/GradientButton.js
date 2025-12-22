/**
 * GradientButton - Botão de ação com gradiente neon
 * 
 * Botão principal do app com efeito de glow e gradiente laranja.
 */

import React from 'react';
import { StyleSheet, TouchableOpacity, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, SIZES, FONTS } from '../constants/theme';

export default function GradientButton({
    title,
    onPress,
    icon,
    style,
    colors = COLORS.primaryGradient,
    disabled = false,
    size = 'medium' // 'small', 'medium', 'large'
}) {
    const getSizeStyles = () => {
        switch (size) {
            case 'small':
                return { padding: 12, fontSize: 14 };
            case 'large':
                return { padding: 20, fontSize: 18 };
            default:
                return { padding: 16, fontSize: 16 };
        }
    };

    const sizeStyles = getSizeStyles();

    return (
        <TouchableOpacity
            activeOpacity={0.8}
            onPress={onPress}
            disabled={disabled}
            style={[
                styles.buttonShadow,
                disabled && styles.disabled,
                style
            ]}
        >
            <LinearGradient
                colors={disabled ? [COLORS.textMuted, COLORS.textMuted] : colors}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={[
                    styles.gradient,
                    { padding: sizeStyles.padding }
                ]}
            >
                {icon && (
                    <Text style={styles.icon}>{icon}</Text>
                )}
                <Text style={[
                    styles.text,
                    { fontSize: sizeStyles.fontSize },
                    icon && { marginLeft: 8 }
                ]}>
                    {title}
                </Text>
            </LinearGradient>
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    buttonShadow: {
        borderRadius: SIZES.radius,
        shadowColor: COLORS.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.5,
        shadowRadius: 12,
        elevation: 8,
    },
    gradient: {
        borderRadius: SIZES.radius,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
    },
    icon: {
        fontSize: 20,
    },
    text: {
        color: COLORS.white,
        fontFamily: FONTS.bold,
        fontWeight: 'bold',
        textAlign: 'center',
    },
    disabled: {
        opacity: 0.6,
        shadowOpacity: 0,
    },
});
