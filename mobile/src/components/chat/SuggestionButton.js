/**
 * SuggestionButton - Botão de sugestão de pergunta
 * 
 * Botão estilizado para sugestões de continuação da conversa.
 * Exibe um ícone e texto de sugestão.
 */

import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { COLORS, SIZES, FONTS } from '../../../theme';

const SuggestionButton = ({
    icon = 'help-circle',
    text,
    onPress,
}) => {
    return (
        <TouchableOpacity
            style={styles.container}
            onPress={onPress}
            activeOpacity={0.7}
        >
            <Feather name={icon} size={18} color="#34D399" style={styles.icon} />
            <Text style={styles.text}>{text}</Text>
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.surfaceSolid,
        borderRadius: SIZES.radiusSm,
        borderWidth: 1,
        borderColor: COLORS.border,
        padding: SIZES.sm + 4,
        marginBottom: SIZES.sm,
    },
    icon: {
        marginRight: SIZES.sm,
    },
    text: {
        flex: 1,
        color: COLORS.textPrimary,
        fontFamily: FONTS.regular,
        fontSize: SIZES.fontBase,
    },
});

export default SuggestionButton;
