/**
 * GlassLoader - Overlay de carregamento temático
 * 
 * Exibe um loader premium com blur backdrop.
 */

import React from 'react';
import { StyleSheet, View, Modal, ActivityIndicator, Text } from 'react-native';
import { BlurView } from 'expo-blur';
import { COLORS, SIZES } from '../constants/theme';

export default function GlassLoader({
    visible = false,
    message = 'Processando...',
    showMessage = true
}) {
    return (
        <Modal
            visible={visible}
            transparent={true}
            animationType="fade"
            statusBarTranslucent
        >
            <View style={styles.container}>
                {/* Blur Background */}
                <BlurView intensity={50} tint="dark" style={StyleSheet.absoluteFill} />

                {/* Dark Overlay */}
                <View style={styles.darkOverlay} />

                {/* Loader Content */}
                <View style={styles.loaderContainer}>
                    <View style={styles.loaderBox}>
                        <ActivityIndicator size="large" color={COLORS.primary} />
                        {showMessage && message && (
                            <Text style={styles.message}>{message}</Text>
                        )}
                    </View>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    darkOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(11,12,21,0.7)',
    },
    loaderContainer: {
        zIndex: 10,
    },
    loaderBox: {
        backgroundColor: COLORS.surface,
        borderRadius: SIZES.radiusMd,
        padding: SIZES.xl,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: COLORS.border,
        minWidth: 150,
    },
    message: {
        color: COLORS.textPrimary,
        fontSize: 15,
        fontWeight: '500',
        marginTop: SIZES.md,
        textAlign: 'center',
    },
});
