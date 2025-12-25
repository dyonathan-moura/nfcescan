/**
 * SkeletonCard - Placeholder animado para loading
 * 
 * Usa animação de pulso para indicar carregamento.
 */

import React, { useEffect, useRef } from 'react';
import { StyleSheet, View, Animated } from 'react-native';
import { COLORS, SIZES } from '../../theme';

export default function SkeletonCard({
    width = '100%',
    height = 70,
    borderRadius = SIZES.radius,
    style
}) {
    const pulseAnim = useRef(new Animated.Value(0.3)).current;

    useEffect(() => {
        const pulse = Animated.loop(
            Animated.sequence([
                Animated.timing(pulseAnim, {
                    toValue: 0.7,
                    duration: 800,
                    useNativeDriver: true,
                }),
                Animated.timing(pulseAnim, {
                    toValue: 0.3,
                    duration: 800,
                    useNativeDriver: true,
                }),
            ])
        );
        pulse.start();
        return () => pulse.stop();
    }, []);

    return (
        <Animated.View
            style={[
                styles.skeleton,
                { width, height, borderRadius, opacity: pulseAnim },
                style
            ]}
        />
    );
}

// Componente de loading para lista de transações
export function SkeletonList({ count = 5 }) {
    return (
        <View style={styles.listContainer}>
            {Array.from({ length: count }).map((_, index) => (
                <View key={index} style={styles.skeletonRow}>
                    <SkeletonCard width={48} height={48} borderRadius={14} />
                    <View style={styles.skeletonContent}>
                        <SkeletonCard width="70%" height={16} borderRadius={4} />
                        <SkeletonCard width="40%" height={12} borderRadius={4} style={{ marginTop: 6 }} />
                    </View>
                    <SkeletonCard width={80} height={20} borderRadius={4} />
                </View>
            ))}
        </View>
    );
}

const styles = StyleSheet.create({
    skeleton: {
        backgroundColor: '#2A2D3A',
    },
    listContainer: {
        padding: SIZES.padding,
    },
    skeletonRow: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.surfaceSolid,
        padding: SIZES.md,
        borderRadius: SIZES.radius,
        marginBottom: SIZES.sm,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    skeletonContent: {
        flex: 1,
        marginHorizontal: SIZES.md,
    },
});
