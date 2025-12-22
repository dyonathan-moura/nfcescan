/**
 * TransactionItem - Card de transação para lista de histórico
 * 
 * Usa GlassCard como base com layout avançado:
 * Icon Box (esquerda) + Info (centro) + Valor (direita)
 */

import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import GlassCard from './GlassCard';
import { COLORS, SIZES, FONTS } from '../constants/theme';

export default function TransactionItem({
    icon = '🛒',
    title,
    subtitle,
    value,
    valueColor,
    onPress,
    style
}) {
    // Determinar cor do valor
    const getValueColor = () => {
        if (valueColor) return valueColor;
        if (typeof value === 'number') {
            return value >= 0 ? COLORS.success : COLORS.textPrimary;
        }
        return COLORS.textPrimary;
    };

    // Formatar valor
    const formatValue = () => {
        if (typeof value === 'number') {
            return `R$ ${Math.abs(value).toFixed(2)}`;
        }
        return value;
    };

    const content = (
        <GlassCard style={[styles.card, style]} noPadding variant="subtle">
            <View style={styles.container}>
                {/* Icon Box */}
                <View style={styles.iconBox}>
                    <Text style={styles.icon}>{icon}</Text>
                </View>

                {/* Info (Centro) */}
                <View style={styles.info}>
                    <Text style={styles.title} numberOfLines={1}>{title}</Text>
                    {subtitle && (
                        <Text style={styles.subtitle} numberOfLines={1}>{subtitle}</Text>
                    )}
                </View>

                {/* Valor (Direita) */}
                <Text style={[styles.value, { color: getValueColor() }]}>
                    {formatValue()}
                </Text>
            </View>
        </GlassCard>
    );

    if (onPress) {
        return (
            <TouchableOpacity activeOpacity={0.7} onPress={onPress}>
                {content}
            </TouchableOpacity>
        );
    }

    return content;
}

const styles = StyleSheet.create({
    card: {
        marginBottom: SIZES.sm,
    },
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: SIZES.md,
    },
    iconBox: {
        width: 48,
        height: 48,
        borderRadius: 14,
        backgroundColor: 'rgba(255,255,255,0.1)',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: SIZES.md,
    },
    icon: {
        fontSize: 22,
    },
    info: {
        flex: 1,
        marginRight: SIZES.sm,
    },
    title: {
        fontSize: 16,
        fontWeight: 'bold',
        color: COLORS.textPrimary,
        marginBottom: 2,
    },
    subtitle: {
        fontSize: 12,
        color: COLORS.textSecondary,
    },
    value: {
        fontSize: 16,
        fontWeight: 'bold',
        textAlign: 'right',
    },
});
