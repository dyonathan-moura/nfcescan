/**
 * CategoryIcon - Renderiza ícone 3D da categoria
 * 
 * Usa imagens PNG 3D quando disponíveis, fallback para emoji
 */

import React from 'react';
import { Image, Text, View, StyleSheet } from 'react-native';
import { COLORS, SIZES } from '../../theme';

// Mapeamento de ícones PNG 3D disponíveis
const CATEGORY_ICONS = {
    alimentacao: require('../../assets/icons/alimentacao.png'),
    bebidas: require('../../assets/icons/bebidas.png'),
    hortifruti: require('../../assets/icons/hortifruti.png'),
};

// Fallback emojis para categorias sem ícone 3D
const CATEGORY_EMOJIS = {
    alimentacao: '🍔',
    bebidas: '🥤',
    transporte: '🚗',
    casa: '🏠',
    limpeza: '🧹',
    higiene: '🧴',
    acougue: '🥩',
    hortifruti: '🥬',
    laticinios: '🧀',
    padaria: '🥖',
    pet: '🐕',
    farmacia: '💊',
    roupas: '👕',
    outros: '📦',
};

export default function CategoryIcon({
    category,
    size = 32,
    style,
    showBackground = false
}) {
    const categoryKey = category?.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const hasIcon = CATEGORY_ICONS[categoryKey];

    const containerStyle = [
        styles.container,
        showBackground && styles.withBackground,
        { width: size + 8, height: size + 8 },
        style
    ];

    if (hasIcon) {
        return (
            <View style={containerStyle}>
                <Image
                    source={CATEGORY_ICONS[categoryKey]}
                    style={{ width: size, height: size }}
                    resizeMode="contain"
                />
            </View>
        );
    }

    // Fallback para emoji
    const emoji = CATEGORY_EMOJIS[categoryKey] || '📦';
    return (
        <View style={containerStyle}>
            <Text style={{ fontSize: size * 0.8 }}>{emoji}</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    withBackground: {
        backgroundColor: COLORS.glass,
        borderRadius: SIZES.radius,
        borderWidth: 1,
        borderColor: COLORS.glassBorder,
    },
});
