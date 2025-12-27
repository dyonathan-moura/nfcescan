/**
 * BudgetProgressWidget - Widget de progresso do orçamento
 * 
 * Exibe barra de progresso visual do orçamento mensal com:
 * - Título e período
 * - Valor gasto vs limite
 * - Barra de progresso com porcentagem
 * - Ações interativas
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { COLORS, SIZES, FONTS, SHADOWS } from '../../../theme';

const BudgetProgressWidget = ({
    title = 'Orçamento de Mercado',
    period = 'Novembro',
    spent,
    budget,
    currency = 'BRL',
    actions = [],
    onActionPress,
}) => {
    const percentage = Math.min((spent / budget) * 100, 100);
    const isOverBudget = spent > budget;
    const progressColor = isOverBudget ? '#EF4444' : '#34D399';

    // Formatar valor em moeda brasileira
    const formatCurrency = (value) => {
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: currency,
        }).format(value);
    };

    return (
        <View style={styles.container}>
            {/* Header */}
            <Text style={styles.subtitle}>Visão Geral do Orçamento</Text>

            {/* Título e valor */}
            <View style={styles.mainRow}>
                <View style={styles.titleContainer}>
                    <Text style={styles.title}>{title}</Text>
                    <Text style={styles.period}>{period}</Text>
                </View>
                <View style={styles.valueContainer}>
                    <Text style={[styles.spent, { color: progressColor }]}>
                        {formatCurrency(spent)}
                    </Text>
                    <Text style={styles.label}>Gasto Total</Text>
                </View>
            </View>

            {/* Barra de progresso */}
            <View style={styles.progressContainer}>
                <View style={styles.progressBar}>
                    <View
                        style={[
                            styles.progressFill,
                            {
                                width: `${percentage}%`,
                                backgroundColor: progressColor,
                            }
                        ]}
                    />
                </View>
                <Text style={[styles.percentageLabel, { color: progressColor }]}>
                    {Math.round(percentage)}%
                </Text>
            </View>

            {/* Descrição */}
            <Text style={styles.description}>
                Você gastou <Text style={styles.highlight}>{formatCurrency(spent)}</Text> do seu orçamento de{' '}
                <Text style={[styles.highlight, { color: progressColor }]}>{formatCurrency(budget)}</Text>{' '}
                para {title.toLowerCase()}.
            </Text>

            {/* Botões de ação */}
            {actions.length > 0 && (
                <View style={styles.actionsRow}>
                    {actions.map((action, index) => (
                        <TouchableOpacity
                            key={index}
                            style={styles.actionButton}
                            onPress={() => onActionPress?.(action)}
                        >
                            <Feather name={action.icon} size={14} color={COLORS.textPrimary} />
                            <Text style={styles.actionText}>{action.label}</Text>
                        </TouchableOpacity>
                    ))}
                </View>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        backgroundColor: COLORS.surfaceSolid,
        borderRadius: 20,
        borderTopLeftRadius: 4,
        padding: SIZES.md,
        borderWidth: 1,
        borderColor: COLORS.border,
        ...SHADOWS.md,
    },

    subtitle: {
        color: COLORS.textSecondary,
        fontFamily: FONTS.regular,
        fontSize: SIZES.fontSm,
        marginBottom: SIZES.sm,
    },

    mainRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: SIZES.md,
    },
    titleContainer: {
        flex: 1,
    },
    title: {
        color: COLORS.white,
        fontFamily: FONTS.bold,
        fontSize: SIZES.fontXl,
        marginBottom: 2,
    },
    period: {
        color: COLORS.textSecondary,
        fontFamily: FONTS.regular,
        fontSize: SIZES.fontSm,
    },

    valueContainer: {
        alignItems: 'flex-end',
    },
    spent: {
        fontFamily: FONTS.bold,
        fontSize: SIZES.fontLg,
    },
    label: {
        color: COLORS.textSecondary,
        fontFamily: FONTS.regular,
        fontSize: SIZES.fontSm,
    },

    // Progress bar
    progressContainer: {
        marginBottom: SIZES.md,
    },
    progressBar: {
        width: '100%',
        height: 10,
        backgroundColor: COLORS.background,
        borderRadius: 5,
        overflow: 'hidden',
    },
    progressFill: {
        height: '100%',
        borderRadius: 5,
    },
    percentageLabel: {
        fontFamily: FONTS.bold,
        fontSize: SIZES.fontSm,
        marginTop: 4,
        alignSelf: 'flex-end',
    },

    description: {
        color: COLORS.textSecondary,
        fontFamily: FONTS.regular,
        fontSize: SIZES.fontSm,
        lineHeight: 20,
        marginBottom: SIZES.md,
    },
    highlight: {
        color: COLORS.white,
        fontFamily: FONTS.bold,
    },

    // Actions
    actionsRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: SIZES.sm,
    },
    actionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.glass,
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    actionText: {
        color: COLORS.textPrimary,
        fontFamily: FONTS.regular,
        fontSize: SIZES.fontSm,
        marginLeft: 6,
    },
});

export default BudgetProgressWidget;
