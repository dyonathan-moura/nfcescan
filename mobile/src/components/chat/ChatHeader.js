/**
 * ChatHeader - Header do chat FinAI
 * 
 * Exibe título, status de conexão e botão de novo chat.
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, SIZES, FONTS } from '../../../theme';

const ChatHeader = ({
    title = 'FinAI Assistant',
    connectionStatus = { connected: true, sources: '15 notas e 3 planilhas' },
    onNewChat,
    onBack,
}) => {
    return (
        <View style={styles.container}>
            <View style={styles.leftSection}>
                {onBack && (
                    <TouchableOpacity onPress={onBack} style={styles.backButton}>
                        <Feather name="arrow-left" size={24} color={COLORS.textPrimary} />
                    </TouchableOpacity>
                )}
                <View>
                    <Text style={styles.title}>{title}</Text>
                    <View style={styles.statusRow}>
                        <View style={[
                            styles.statusDot,
                            { backgroundColor: connectionStatus.connected ? '#34D399' : COLORS.danger }
                        ]} />
                        <Text style={styles.statusText}>
                            Conectado a {connectionStatus.sources}
                        </Text>
                    </View>
                </View>
            </View>

            <TouchableOpacity onPress={onNewChat}>
                <LinearGradient
                    colors={['#5C43CC', '#7054FF']}
                    style={styles.newChatButton}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                >
                    <Feather name="plus" size={16} color={COLORS.white} />
                    <Text style={styles.newChatText}>NOVO CHAT</Text>
                </LinearGradient>
            </TouchableOpacity>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: COLORS.surfaceSolid,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
        paddingHorizontal: SIZES.md,
        paddingVertical: SIZES.sm + 4,
    },

    leftSection: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    backButton: {
        marginRight: SIZES.sm,
        padding: 4,
    },

    title: {
        color: COLORS.textPrimary,
        fontFamily: FONTS.bold,
        fontSize: SIZES.fontXl,
    },
    statusRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 2,
    },
    statusDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        marginRight: 6,
    },
    statusText: {
        color: COLORS.textSecondary,
        fontFamily: FONTS.regular,
        fontSize: SIZES.fontSm,
    },

    newChatButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: SIZES.md,
        paddingVertical: SIZES.sm,
        borderRadius: 20,
    },
    newChatText: {
        color: COLORS.white,
        fontFamily: FONTS.bold,
        fontSize: SIZES.fontSm,
        marginLeft: 6,
    },
});

export default ChatHeader;
