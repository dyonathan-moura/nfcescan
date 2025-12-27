/**
 * ChatInput - Campo de entrada do chat
 * 
 * Input estilizado com botões de mídia e envio.
 * Segue o design FinAI com fundo escuro e botão roxo.
 */

import React, { useState } from 'react';
import { View, TextInput, TouchableOpacity, StyleSheet, Keyboard } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, SIZES, FONTS } from '../../../theme';

const ChatInput = ({
    placeholder = 'Pergunte sobre suas finanças',
    onSend,
    onAttach,
    onMic,
    disabled = false,
}) => {
    const [message, setMessage] = useState('');

    const handleSend = () => {
        if (message.trim() && !disabled) {
            onSend?.(message.trim());
            setMessage('');
            Keyboard.dismiss();
        }
    };

    return (
        <View style={styles.container}>
            <View style={styles.inputRow}>
                {/* Botão de anexar */}
                <TouchableOpacity
                    style={styles.iconButton}
                    onPress={onAttach}
                    disabled={disabled}
                >
                    <Feather name="plus" size={22} color={COLORS.textPrimary} />
                </TouchableOpacity>

                {/* Campo de texto */}
                <TextInput
                    style={styles.input}
                    placeholder={placeholder}
                    placeholderTextColor={COLORS.textSecondary}
                    value={message}
                    onChangeText={setMessage}
                    multiline
                    maxLength={500}
                    editable={!disabled}
                    returnKeyType="send"
                    onSubmitEditing={handleSend}
                    blurOnSubmit
                />

                {/* Botão de microfone */}
                <TouchableOpacity
                    style={styles.iconButton}
                    onPress={onMic}
                    disabled={disabled}
                >
                    <Feather name="mic" size={20} color={COLORS.textPrimary} />
                </TouchableOpacity>

                {/* Botão de enviar */}
                <TouchableOpacity
                    style={[
                        styles.sendButton,
                        !message.trim() && styles.sendButtonDisabled
                    ]}
                    onPress={handleSend}
                    disabled={!message.trim() || disabled}
                >
                    <LinearGradient
                        colors={message.trim() ? ['#5C43CC', '#7054FF'] : [COLORS.textMuted, COLORS.textMuted]}
                        style={styles.sendGradient}
                    >
                        <Feather name="arrow-up" size={20} color={COLORS.white} />
                    </LinearGradient>
                </TouchableOpacity>
            </View>

            {/* Disclaimer */}
            <View style={styles.disclaimerContainer}>
                <Feather name="info" size={12} color={COLORS.textMuted} style={styles.disclaimerIcon} />
                <View style={styles.disclaimerTextContainer}>
                    <View style={styles.disclaimerText}>
                        {/* Usando Text inline para evitar nesting complexo */}
                    </View>
                </View>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        backgroundColor: COLORS.surfaceSolid,
        borderTopWidth: 1,
        borderTopColor: COLORS.border,
        paddingHorizontal: SIZES.md,
        paddingTop: SIZES.md,
        paddingBottom: SIZES.sm,
    },

    inputRow: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.surface,
        borderRadius: 28,
        paddingHorizontal: 4,
        paddingVertical: 4,
    },

    iconButton: {
        width: 40,
        height: 40,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 20,
    },

    input: {
        flex: 1,
        color: COLORS.textPrimary,
        fontFamily: FONTS.regular,
        fontSize: SIZES.fontBase,
        paddingHorizontal: SIZES.sm,
        paddingVertical: 8,
        maxHeight: 100,
    },

    sendButton: {
        marginLeft: 4,
    },
    sendButtonDisabled: {
        opacity: 0.5,
    },
    sendGradient: {
        width: 44,
        height: 44,
        borderRadius: 22,
        alignItems: 'center',
        justifyContent: 'center',
    },

    disclaimerContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: SIZES.sm,
    },
    disclaimerIcon: {
        marginRight: 4,
    },
    disclaimerTextContainer: {
        // Container apenas para alinhamento
    },
    disclaimerText: {
        color: COLORS.textMuted,
        fontFamily: FONTS.regular,
        fontSize: SIZES.fontXs,
        textAlign: 'center',
    },
});

export default ChatInput;
