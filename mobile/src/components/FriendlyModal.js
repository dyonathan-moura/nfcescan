/**
 * FriendlyModal - A clean, simple modal for the Friendly theme.
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
import Card from './Card';
import { COLORS, SIZES, FONTS, SHADOWS } from '../../theme';

export default function FriendlyModal({
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
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.container}
            >
                <TouchableWithoutFeedback onPress={onClose}>
                    <View style={styles.backdrop} />
                </TouchableWithoutFeedback>

                <View
                    style={[
                        styles.contentContainer,
                        position === 'bottom' ? styles.contentBottom : styles.contentCenter
                    ]}
                    pointerEvents="box-none"
                >
                    <Card style={[
                        styles.modalContent,
                        position === 'bottom' && styles.modalContentBottom
                    ]}>
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
                        <View style={styles.body}>
                            {children}
                        </View>
                    </Card>
                </View>
            </KeyboardAvoidingView>
        </Modal>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    backdrop: {
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
        ...SHADOWS.lg,
    },
    modalContentBottom: {
        maxWidth: '100%',
        borderBottomLeftRadius: 0,
        borderBottomRightRadius: 0,
        paddingBottom: SIZES.padding,
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
        fontFamily: FONTS.bold,
        color: COLORS.textPrimary,
        flex: 1,
    },
    closeButton: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: COLORS.background,
        justifyContent: 'center',
        alignItems: 'center',
    },
    closeButtonText: {
        fontSize: 16,
        color: COLORS.textSecondary,
    },
    body: {
        paddingHorizontal: SIZES.padding,
        paddingBottom: SIZES.padding,
        paddingTop: SIZES.sm,
    },
});
