/**
 * DarkInput - Campo de texto estilizado para dark mode
 * 
 * Visual consistente com o tema glass/neon.
 */

import React from 'react';
import { StyleSheet, View, TextInput, Text } from 'react-native';
import { COLORS, SIZES } from '../constants/theme';

export default function DarkInput({
    value,
    onChangeText,
    placeholder,
    icon,
    label,
    multiline = false,
    keyboardType = 'default',
    style,
    inputStyle,
    autoFocus = false,
    maxLength
}) {
    return (
        <View style={[styles.container, style]}>
            {label && (
                <Text style={styles.label}>{label}</Text>
            )}
            <View style={styles.inputContainer}>
                {icon && (
                    <Text style={styles.icon}>{icon}</Text>
                )}
                <TextInput
                    value={value}
                    onChangeText={onChangeText}
                    placeholder={placeholder}
                    placeholderTextColor={COLORS.textMuted}
                    style={[
                        styles.input,
                        icon && styles.inputWithIcon,
                        multiline && styles.inputMultiline,
                        inputStyle
                    ]}
                    multiline={multiline}
                    keyboardType={keyboardType}
                    autoFocus={autoFocus}
                    maxLength={maxLength}
                    selectionColor={COLORS.primary}
                />
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        marginBottom: SIZES.md,
    },
    label: {
        fontSize: 12,
        color: COLORS.textSecondary,
        marginBottom: SIZES.xs,
        fontWeight: '500',
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.surface,
        borderWidth: 1,
        borderColor: COLORS.border,
        borderRadius: 12,
        paddingHorizontal: SIZES.md,
    },
    icon: {
        fontSize: 18,
        marginRight: SIZES.sm,
    },
    input: {
        flex: 1,
        paddingVertical: 14,
        fontSize: 16,
        color: COLORS.textPrimary,
    },
    inputWithIcon: {
        paddingLeft: 0,
    },
    inputMultiline: {
        minHeight: 100,
        textAlignVertical: 'top',
    },
});
