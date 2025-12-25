/**
 * CategoryGrid - Seletor de categorias em formato de grid
 * 
 * Botões quadrados com emojis para seleção de categoria.
 */

import React from 'react';
import { StyleSheet, View, TouchableOpacity, Text, Dimensions } from 'react-native';
import { COLORS, SIZES, FONTS } from '../../theme';

const SCREEN_WIDTH = Dimensions.get('window').width;

export default function CategoryGrid({
    categories = [],
    selectedId,
    onSelect,
    columns = 4,
    showAddButton = true,
    onAddPress
}) {
    // Calcular tamanho do botão baseado no container
    // Container width aproximado: screen width - padding do modal (40) - padding do modal (40)
    const containerWidth = SCREEN_WIDTH - 80;
    const gap = 8;
    const buttonSize = (containerWidth - (gap * (columns - 1))) / columns;

    return (
        <View style={styles.container}>
            <View style={styles.grid}>
                {categories.map((cat) => (
                    <TouchableOpacity
                        key={cat.id}
                        style={[
                            styles.categoryButton,
                            { width: buttonSize, height: buttonSize },
                            selectedId === cat.id && styles.categoryButtonSelected,
                        ]}
                        onPress={() => onSelect(cat.id)}
                        activeOpacity={0.7}
                    >
                        <Text style={[styles.categoryIcon, selectedId === cat.id && styles.categoryIconSelected]}>{cat.icone || '📦'}</Text>
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
                        style={[
                            styles.categoryButton,
                            styles.addButton,
                            { width: buttonSize, height: buttonSize }
                        ]}
                        onPress={onAddPress}
                        activeOpacity={0.7}
                    >
                        <Text style={styles.addIcon}>➕</Text>
                        <Text style={styles.addText}>Nova</Text>
                    </TouchableOpacity>
                )}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        marginTop: SIZES.sm,
    },
    grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    categoryButton: {
        backgroundColor: COLORS.surface,
        borderRadius: SIZES.radius,
        borderWidth: 1,
        borderColor: COLORS.border,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 4,
    },
    categoryButtonSelected: {
        backgroundColor: COLORS.primary,
        borderColor: COLORS.primary,
    },
    categoryIcon: {
        fontSize: 26,
        marginBottom: 2,
    },
    categoryIconSelected: {
        color: COLORS.white,
    },
    categoryName: {
        fontSize: 10,
        fontFamily: FONTS.regular,
        color: COLORS.textSecondary,
        textAlign: 'center',
    },
    categoryNameSelected: {
        color: COLORS.white,
        fontFamily: FONTS.semiBold,
    },
    addButton: {
        borderWidth: 2,
        borderColor: COLORS.primary,
        backgroundColor: 'transparent',
    },
    addIcon: {
        fontSize: 22,
        marginBottom: 2,
        color: COLORS.primary,
    },
    addText: {
        fontSize: 10,
        color: COLORS.primary,
        fontFamily: FONTS.semiBold,
    },
});
