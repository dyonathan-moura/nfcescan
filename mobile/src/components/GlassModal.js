/**
 * GlassModal - Modal imersivo com overlay blur
 * 
 * Substitui o Modal padrão por uma experiência dark/glass.
 * Estrutura: Blur Backdrop > GlassCard Container
 */

import React from 'react';
import {
    StyleSheet,
    View,
    Modal,
    TouchableOpacity,
    TouchableWithoutFeedback,
    Text,
    KeyboardAvoidingView,
    Platform
} from 'react-native';
import { BlurView } from 'expo-blur';
import GlassCard from './GlassCard';
import { COLORS, SIZES, FONTS } from '../constants/theme';

export default function GlassModal({
    visible,
    onClose,
    title,
    children,
    position = 'center', // 'center' | 'bottom'
    showCloseButton = true
}) {
    return (
        <Modal
            visible={visible}
            transparent={true}
            animationType="fade"
            onRequestClose={onClose}
            statusBarTranslucent
        >
            <TouchableWithoutFeedback onPress={onClose}>
                <View style={styles.backdrop}>
                    {/* Blur Background */}
                    <BlurView intensity={20} tint="dark" style={StyleSheet.absoluteFill} />

                    {/* Dark Overlay */}
                    <View style={styles.darkOverlay} />
                </View>
            </TouchableWithoutFeedback>

            {/* Content Container */}
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={[
                    styles.contentContainer,
                    position === 'bottom' ? styles.contentBottom : styles.contentCenter
                ]}
                pointerEvents="box-none"
            >
                <TouchableWithoutFeedback>
                    <View style={[
                        styles.modalContent,
                        position === 'bottom' && styles.modalContentBottom
                    ]}>
                        <GlassCard
                            variant="elevated"
                            borderRadius={position === 'bottom' ? 24 : SIZES.radiusMd}
                            noPadding
                        >
                            {/* Header */}
                            {(title || showCloseButton) && (
                                <View style={styles.header}>
                                    <Text style={styles.title}>{title}</Text>
                                    {showCloseButton && (
                                        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                                            <Text style={styles.closeButtonText}>✕</Text>
                                        </TouchableOpacity>
                                    )}
                                </View>
                            )}

                            {/* Content */}
                            <View style={styles.body}>
                                {children}
                            </View>
                        </GlassCard>
                    </View>
                </TouchableWithoutFeedback>
            </KeyboardAvoidingView>
        </Modal>
    );
}

const styles = StyleSheet.create({
    backdrop: {
        ...StyleSheet.absoluteFillObject,
    },
    darkOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.7)',
    },
    contentContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    contentCenter: {
        justifyContent: 'center',
        padding: SIZES.padding,
    },
    contentBottom: {
        justifyContent: 'flex-end',
    },
    modalContent: {
        width: '100%',
        maxWidth: 400,
    },
    modalContentBottom: {
        maxWidth: '100%',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: SIZES.padding,
        paddingTop: SIZES.padding,
        paddingBottom: SIZES.sm,
    },
    title: {
        fontSize: 20,
        fontWeight: 'bold',
        color: COLORS.textPrimary,
        flex: 1,
    },
    closeButton: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: 'rgba(255,255,255,0.1)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    closeButtonText: {
        fontSize: 16,
        color: COLORS.textSecondary,
    },
    body: {
        padding: SIZES.padding,
        paddingTop: SIZES.sm,
    },
});
