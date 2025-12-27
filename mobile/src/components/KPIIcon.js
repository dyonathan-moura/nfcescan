/**
 * KPIIcon - Renderiza ícones vetoriais modernos para os KPIs do dashboard
 * Substitui as imagens PNG antigas para remover fundo branco
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { COLORS } from '../../theme';

// Mapeamento de ícones KPI com cores do tema
const KPI_ICONS = {
    money: {
        name: 'dollar-sign',
        color: COLORS.primary
    },
    chart: {
        name: 'bar-chart-2',
        color: COLORS.accent
    },
    receipt: {
        name: 'file-text',
        color: COLORS.success
    },
    store: {
        name: 'shopping-bag',
        color: COLORS.secondary
    },
};

export default function KPIIcon({
    name,
    size = 40,
    style
}) {
    const iconDef = KPI_ICONS[name];

    if (!iconDef) {
        return null; // Fallback ou null se não encontrar
    }

    return (
        <View style={[
            styles.container,
            {
                width: size + 20,
                height: size + 20,
                // Fundo sutil colorido baseado na cor do ícone (glass effect)
                backgroundColor: iconDef.color + '15', // 15% opacidade
                borderColor: iconDef.color + '30',     // 30% opacidade na borda
            },
            style
        ]}>
            <Feather
                name={iconDef.name}
                size={size * 0.7} // Ícone levemente menor que o container
                color={iconDef.color}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 16,
        borderWidth: 1,
    },
});
