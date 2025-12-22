/**
 * EmptyState - Componente para estados vazios
 * 
 * Exibe mensagem amigável quando não há dados para mostrar.
 */

import React from 'react';
import { StyleSheet, View, Text } from 'react-native';
import GradientButton from './GradientButton';
import { COLORS, SIZES } from '../constants/theme';

export default function EmptyState({
    icon = '📭',
    title = 'Nada por aqui',
    message = 'Não encontramos nenhum dado para exibir.',
    buttonTitle,
    onButtonPress,
    style
}) {
    return (
        <View style={[styles.container, style]}>
            {/* Ícone Grande */}
            <View style={styles.iconContainer}>
                <Text style={styles.icon}>{icon}</Text>
            </View>

            {/* Título */}
            <Text style={styles.title}>{title}</Text>

            {/* Mensagem */}
            <Text style={styles.message}>{message}</Text>

            {/* Botão de Ação (Opcional) */}
            {buttonTitle && onButtonPress && (
                <View style={styles.buttonContainer}>
                    <GradientButton
                        title={buttonTitle}
                        onPress={onButtonPress}
                        size="medium"
                    />
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 40,
        paddingVertical: 60,
    },
    iconContainer: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: `${COLORS.primary}15`,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: SIZES.lg,
    },
    icon: {
        fontSize: 50,
    },
    title: {
        fontSize: 20,
        fontWeight: 'bold',
        color: COLORS.textPrimary,
        textAlign: 'center',
        marginBottom: SIZES.sm,
    },
    message: {
        fontSize: 14,
        color: COLORS.textSecondary,
        textAlign: 'center',
        lineHeight: 22,
    },
    buttonContainer: {
        marginTop: SIZES.xl,
        width: '100%',
        maxWidth: 200,
    },
});
