/**
 * ChatBubble - Bolha de mensagem para o chat
 * 
 * Renderiza mensagens do usuário ou da IA com estilo diferenciado.
 * Suporta renderização de widgets para Generative UI.
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { COLORS, SIZES, FONTS } from '../../../theme';

const ChatBubble = ({
    type = 'user', // 'user' | 'ai'
    content,
    widget = null, // Componente widget para Generative UI
    timestamp,
    isTyping = false
}) => {
    const isUser = type === 'user';

    // Indicador de digitação da IA
    if (isTyping) {
        return (
            <View style={styles.aiContainer}>
                <View style={styles.aiAvatar}>
                    <Feather name="cpu" size={18} color={COLORS.white} />
                </View>
                <View style={[styles.bubble, styles.aiBubble]}>
                    <View style={styles.typingIndicator}>
                        <View style={[styles.typingDot, styles.typingDot1]} />
                        <View style={[styles.typingDot, styles.typingDot2]} />
                        <View style={[styles.typingDot, styles.typingDot3]} />
                    </View>
                </View>
            </View>
        );
    }

    // Mensagem do usuário
    if (isUser) {
        return (
            <View style={styles.userContainer}>
                <View style={[styles.bubble, styles.userBubble]}>
                    <Text style={styles.userText}>{content}</Text>
                </View>
            </View>
        );
    }

    // Mensagem da IA (pode conter widget)
    return (
        <View style={styles.aiContainer}>
            <View style={styles.aiAvatar}>
                <Feather name="cpu" size={18} color={COLORS.white} />
            </View>
            <View style={styles.aiContent}>
                {/* Se tem widget, renderiza o widget */}
                {widget ? (
                    widget
                ) : (
                    <View style={[styles.bubble, styles.aiBubble]}>
                        <Text style={styles.aiText}>{content}</Text>
                    </View>
                )}
                {timestamp && (
                    <Text style={styles.timestamp}>{timestamp}</Text>
                )}
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    // Containers
    userContainer: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        marginBottom: SIZES.md,
        paddingHorizontal: SIZES.md,
    },
    aiContainer: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginBottom: SIZES.md,
        paddingHorizontal: SIZES.md,
    },
    aiContent: {
        flex: 1,
        maxWidth: '85%',
    },

    // Avatar da IA
    aiAvatar: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: '#34D399', // Verde secundário do design
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: SIZES.sm,
    },

    // Bolhas
    bubble: {
        padding: SIZES.md,
        borderRadius: 20,
        maxWidth: '80%',
    },
    userBubble: {
        backgroundColor: '#8E78FF', // Roxo claro do design
        borderBottomRightRadius: 4,
    },
    aiBubble: {
        backgroundColor: COLORS.surfaceSolid,
        borderTopLeftRadius: 4,
        borderWidth: 1,
        borderColor: COLORS.border,
    },

    // Textos
    userText: {
        color: COLORS.white,
        fontFamily: FONTS.regular,
        fontSize: SIZES.fontBase,
        lineHeight: 20,
    },
    aiText: {
        color: COLORS.textPrimary,
        fontFamily: FONTS.regular,
        fontSize: SIZES.fontBase,
        lineHeight: 20,
    },
    timestamp: {
        color: COLORS.textMuted,
        fontFamily: FONTS.regular,
        fontSize: SIZES.fontXs,
        marginTop: 4,
        marginLeft: 4,
    },

    // Indicador de digitação
    typingIndicator: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 4,
    },
    typingDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: COLORS.textMuted,
        marginHorizontal: 2,
    },
    typingDot1: {
        opacity: 0.4,
    },
    typingDot2: {
        opacity: 0.6,
    },
    typingDot3: {
        opacity: 0.8,
    },
});

export default ChatBubble;
