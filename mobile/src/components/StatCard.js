/**
 * StatCard - Card de estatísticas para Dashboard
 * 
 * Exibe um valor numérico com ícone e label em estilo neon.
 */

import React from 'react';
import { StyleSheet, View, Text } from 'react-native';
import GlassCard from './GlassCard';
import { COLORS, SIZES, FONTS } from '../constants/theme';

export default function StatCard({
    label,
    value,
    icon,
    type = 'primary', // 'primary' | 'secondary' | 'success' | 'danger'
    style,
    compact = false
}) {
    const getTypeColor = () => {
        switch (type) {
            case 'secondary':
                return COLORS.secondary;
            case 'success':
                return COLORS.success;
            case 'danger':
                return COLORS.danger;
            default:
                return COLORS.primary;
        }
    };

    const accentColor = getTypeColor();

    return (
        <GlassCard style={[styles.container, compact && styles.containerCompact, style]}>
            {icon && (
                <View style={[styles.iconContainer, { backgroundColor: `${accentColor}20` }]}>
                    <Text style={[styles.icon, { color: accentColor }]}>{icon}</Text>
                </View>
            )}

            <Text style={[
                styles.value,
                compact && styles.valueCompact,
                { color: accentColor }
            ]}>
                {value}
            </Text>

            <Text style={[styles.label, compact && styles.labelCompact]}>
                {label}
            </Text>
        </GlassCard>
    );
}

const styles = StyleSheet.create({
    container: {
        alignItems: 'center',
        minWidth: 120,
    },
    containerCompact: {
        minWidth: 100,
        padding: SIZES.sm,
    },
    iconContainer: {
        width: 48,
        height: 48,
        borderRadius: SIZES.radiusMd,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: SIZES.sm,
    },
    icon: {
        fontSize: 24,
    },
    value: {
        fontSize: SIZES.font3xl,
        fontFamily: FONTS.black,
        fontWeight: '900',
        marginBottom: SIZES.xs,
    },
    valueCompact: {
        fontSize: SIZES.fontXl,
    },
    label: {
        fontSize: SIZES.fontSm,
        fontFamily: FONTS.regular,
        color: COLORS.textSecondary,
        textAlign: 'center',
    },
    labelCompact: {
        fontSize: SIZES.fontXs,
    },
});
