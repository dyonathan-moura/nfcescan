/**
 * FinancialSummaryWidget - Widget de resumo financeiro
 * 
 * Card interativo que exibe:
 * - Valor total gasto
 * - Categoria/descrição
 * - Comparação percentual com período anterior
 * - Insight textual
 * - Áreas para gráfico (placeholder)
 * - Sugestões de ações
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, SIZES, FONTS, SHADOWS } from '../../../theme';

const FinancialSummaryWidget = ({
    title = 'Análise de Gastos',
    amount,
    currency = 'BRL',
    category,
    comparison_percentage,
    trend = 'up', // 'up' | 'down'
    comparison_label = 'vs. mês anterior',
    insight_text,
    chartPlaceholder = null,
    actions = [],
    sources = [],
    onActionPress,
    onSourcePress,
}) => {
    const isPositiveTrend = trend === 'up';
    const trendColor = isPositiveTrend ? '#34D399' : '#EF4444';

    // Formatar valor em moeda brasileira
    const formatCurrency = (value) => {
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: currency,
        }).format(value);
    };

    return (
        <View style={styles.container}>
            {/* Header do widget */}
            <Text style={styles.title}>{title}</Text>

            {/* Valor principal e comparação */}
            <View style={styles.mainRow}>
                <View style={styles.amountContainer}>
                    <Text style={styles.amount}>{formatCurrency(amount)}</Text>
                    <Text style={styles.category}>{category}</Text>
                </View>

                {comparison_percentage !== undefined && (
                    <View style={styles.comparisonContainer}>
                        <View style={styles.percentageRow}>
                            <Feather
                                name={isPositiveTrend ? 'arrow-up' : 'arrow-down'}
                                size={16}
                                color={trendColor}
                            />
                            <Text style={[styles.percentage, { color: trendColor }]}>
                                {comparison_percentage}%
                            </Text>
                        </View>
                        <Text style={styles.comparisonLabel}>{comparison_label}</Text>
                    </View>
                )}
            </View>

            {/* Insight textual */}
            {insight_text && (
                <Text style={styles.insight}>
                    {insight_text.split(/(\d+%)/g).map((part, index) => {
                        if (part.match(/\d+%/)) {
                            return (
                                <Text key={index} style={{ color: trendColor, fontFamily: FONTS.bold }}>
                                    {part}
                                </Text>
                            );
                        }
                        return part;
                    })}
                </Text>
            )}

            {/* Área de gráfico (placeholder) */}
            {chartPlaceholder && (
                <View style={styles.chartArea}>
                    <Text style={styles.chartPlaceholder}>{chartPlaceholder}</Text>
                </View>
            )}

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

            {/* Fontes identificadas */}
            {sources.length > 0 && (
                <View style={styles.sourcesSection}>
                    <Text style={styles.sourcesTitle}>FONTES IDENTIFICADAS</Text>
                    {sources.map((source, index) => (
                        <TouchableOpacity
                            key={index}
                            style={styles.sourceCard}
                            onPress={() => onSourcePress?.(source)}
                        >
                            <View style={styles.sourceIcon}>
                                <Feather name="file-text" size={18} color="#34D399" />
                            </View>
                            <View style={styles.sourceInfo}>
                                <Text style={styles.sourceName}>{source.name}</Text>
                                <Text style={styles.sourceLocation}>{source.location}</Text>
                            </View>
                            <Feather name="chevron-right" size={18} color={COLORS.textMuted} />
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

    // Header
    title: {
        color: COLORS.textSecondary,
        fontFamily: FONTS.regular,
        fontSize: SIZES.fontSm,
        marginBottom: SIZES.sm,
    },

    // Main row
    mainRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: SIZES.md,
    },
    amountContainer: {
        flex: 1,
    },
    amount: {
        color: COLORS.white,
        fontFamily: FONTS.bold,
        fontSize: 28,
        marginBottom: 2,
    },
    category: {
        color: COLORS.textSecondary,
        fontFamily: FONTS.regular,
        fontSize: SIZES.fontSm,
    },

    // Comparison
    comparisonContainer: {
        alignItems: 'flex-end',
    },
    percentageRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    percentage: {
        fontFamily: FONTS.bold,
        fontSize: SIZES.fontLg,
        marginLeft: 2,
    },
    comparisonLabel: {
        color: COLORS.textSecondary,
        fontFamily: FONTS.regular,
        fontSize: SIZES.fontSm,
    },

    // Insight
    insight: {
        color: COLORS.textSecondary,
        fontFamily: FONTS.regular,
        fontSize: SIZES.fontSm,
        lineHeight: 20,
        marginBottom: SIZES.md,
    },

    // Chart placeholder
    chartArea: {
        backgroundColor: COLORS.background,
        borderRadius: SIZES.radiusSm,
        padding: SIZES.lg,
        alignItems: 'center',
        justifyContent: 'center',
        height: 96,
        marginBottom: SIZES.md,
    },
    chartPlaceholder: {
        color: COLORS.textMuted,
        fontFamily: FONTS.regular,
        fontSize: SIZES.fontSm,
        fontStyle: 'italic',
    },

    // Actions
    actionsRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: SIZES.sm,
        marginBottom: SIZES.md,
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

    // Sources
    sourcesSection: {
        marginTop: SIZES.md,
        paddingTop: SIZES.md,
        borderTopWidth: 1,
        borderTopColor: COLORS.border,
    },
    sourcesTitle: {
        color: COLORS.textSecondary,
        fontFamily: FONTS.bold,
        fontSize: SIZES.fontXs,
        letterSpacing: 0.5,
        marginBottom: SIZES.sm,
    },
    sourceCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.background,
        borderRadius: SIZES.radiusSm,
        padding: SIZES.sm,
    },
    sourceIcon: {
        width: 32,
        height: 32,
        borderRadius: 8,
        backgroundColor: 'rgba(52, 211, 153, 0.2)',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: SIZES.sm,
    },
    sourceInfo: {
        flex: 1,
    },
    sourceName: {
        color: COLORS.textPrimary,
        fontFamily: FONTS.semiBold,
        fontSize: SIZES.fontSm,
    },
    sourceLocation: {
        color: COLORS.textSecondary,
        fontFamily: FONTS.regular,
        fontSize: SIZES.fontXs,
    },
});

export default FinancialSummaryWidget;
