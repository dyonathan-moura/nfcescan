/**
 * KPIIcon - Renderiza ícones 3D para os KPIs do dashboard
 */

import React from 'react';
import { Image, View, StyleSheet } from 'react-native';
import { COLORS, SIZES } from '../../theme';

// Mapeamento de ícones KPI 3D
const KPI_ICONS = {
    money: require('../../assets/icons/money.png'),
    chart: require('../../assets/icons/chart.png'),
    receipt: require('../../assets/icons/receipt.png'),
    store: require('../../assets/icons/store.png'),
};

export default function KPIIcon({
    name,
    size = 48,
    style
}) {
    const iconSource = KPI_ICONS[name];

    if (!iconSource) {
        return null;
    }

    return (
        <View style={[styles.container, { width: size, height: size }, style]}>
            <Image
                source={iconSource}
                style={{ width: size, height: size }}
                resizeMode="contain"
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        justifyContent: 'center',
        alignItems: 'center',
    },
});
