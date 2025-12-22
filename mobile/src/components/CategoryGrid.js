/**
 * CategoryGrid - Seletor de categorias em formato de grid
 * 
 * Botões quadrados com emojis para seleção de categoria.
 */

import React from 'react';
import { StyleSheet, View, TouchableOpacity, Text, ScrollView } from 'react-native';
import { COLORS, SIZES } from '../constants/theme';

export default function CategoryGrid({
    categories = [],
    selectedId,
    onSelect,
    columns = 4,
    showAddButton = true,
    onAddPress
}) {
    return (
        <View style={styles.container}>
            <ScrollView
                horizontal={false}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.gridContainer}
            >
                <View style={styles.grid}>
                    {categories.map((cat) => (
                        <TouchableOpacity
                            key={cat.id}
                            style={[
                                styles.categoryButton,
                                selectedId === cat.id && styles.categoryButtonSelected,
                                { width: `${100 / columns - 3}%` }
                            ]}
                            onPress={() => onSelect(cat.id)}
                            activeOpacity={0.7}
                        >
                            <Text style={styles.categoryIcon}>{cat.icone || '📦'}</Text>
                            <Text
                                style={[
                                    styles.categoryName,
                                    selectedId === cat.id && styles.categoryNameSelected
                                ]}
                                numberOfLines={1}
                            >
                                {cat.nome}
                            </Text>
                        </TouchableOpacity>
                    ))}

                    {/* Botão Adicionar */}
                    {showAddButton && (
                        <TouchableOpacity
                            style={[styles.categoryButton, styles.addButton, { width: `${100 / columns - 3}%` }]}
                            onPress={onAddPress}
                            activeOpacity={0.7}
                        >
                            <Text style={styles.addIcon}>➕</Text>
                            <Text style={styles.addText}>Nova</Text>
                        </TouchableOpacity>
                    )}
                </View>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        maxHeight: 250,
    },
    gridContainer: {
        paddingBottom: SIZES.sm,
    },
    grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'flex-start',
        gap: SIZES.sm,
    },
    categoryButton: {
        aspectRatio: 1,
        backgroundColor: COLORS.surface,
        borderRadius: SIZES.radius,
        borderWidth: 1,
        borderColor: COLORS.border,
        justifyContent: 'center',
        alignItems: 'center',
        padding: SIZES.sm,
    },
    categoryButtonSelected: {
        backgroundColor: `${COLORS.primary}20`,
        borderColor: COLORS.primary,
        shadowColor: COLORS.primary,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.5,
        shadowRadius: 10,
        elevation: 5,
    },
    categoryIcon: {
        fontSize: 28,
        marginBottom: 4,
    },
    categoryName: {
        fontSize: 10,
        color: COLORS.textSecondary,
        textAlign: 'center',
    },
    categoryNameSelected: {
        color: COLORS.primary,
        fontWeight: '600',
    },
    addButton: {
        borderStyle: 'dashed',
        borderColor: COLORS.textMuted,
    },
    addIcon: {
        fontSize: 24,
        marginBottom: 4,
    },
    addText: {
        fontSize: 10,
        color: COLORS.textMuted,
    },
});
