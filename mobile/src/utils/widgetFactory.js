/**
 * Widget Factory
 * Factory pattern para seleção de componente baseado no tipo de resposta
 */

import React from 'react';
import { Text, View, StyleSheet } from 'react-native';
import { RESPONSE_TYPES } from '../constants/chatTypes';
import { COLORS, FONTS } from '../../theme';

// Importar widgets (lazy load para performance)
import FinancialSummaryWidget from '../components/chat/FinancialSummaryWidget';
import BudgetProgressWidget from '../components/chat/BudgetProgressWidget';

/**
 * Cria o widget apropriado baseado no tipo de resposta
 * @param {Object} response - Resposta do backend {type, payload}
 * @param {Object} handlers - Handlers de eventos {onActionPress, onSourcePress}
 * @returns {React.Component} Componente renderizado
 */
export const createWidget = (response, handlers = {}) => {
    if (!response || !response.type) {
        return null;
    }

    const { type, payload, text } = response;
    const { onActionPress, onSourcePress } = handlers;

    switch (type) {
        case RESPONSE_TYPES.FINANCIAL_SUMMARY:
            return (
                <FinancialSummaryWidget
                    {...payload}
                    onActionPress={onActionPress}
                    onSourcePress={onSourcePress}
                />
            );

        case RESPONSE_TYPES.BUDGET_PROGRESS:
            return (
                <BudgetProgressWidget
                    {...payload}
                    onActionPress={onActionPress}
                />
            );

        case RESPONSE_TYPES.TEXT:
            return null; // Texto é renderizado diretamente no ChatBubble

        case RESPONSE_TYPES.ERROR:
            return (
                <View style={styles.errorContainer}>
                    <Text style={styles.errorText}>
                        ⚠️ {payload?.message || 'Erro desconhecido'}
                    </Text>
                    {payload?.suggestion && (
                        <Text style={styles.errorSuggestion}>
                            {payload.suggestion}
                        </Text>
                    )}
                </View>
            );

        default:
            console.warn(`Widget type "${type}" não suportado`);
            return null;
    }
};

/**
 * Parseia a resposta do backend e retorna dados estruturados
 * @param {Object} apiResponse - Resposta bruta da API
 * @returns {Object} Resposta estruturada para o chat
 */
export const parseBackendResponse = (apiResponse) => {
    try {
        // Se vier como string, tenta parsear
        const data = typeof apiResponse === 'string'
            ? JSON.parse(apiResponse)
            : apiResponse;

        // Validar estrutura básica
        if (!data.type) {
            return {
                type: RESPONSE_TYPES.TEXT,
                payload: null,
                text: data.message || data.text || String(data),
            };
        }

        return {
            type: data.type,
            payload: data.payload || data.data || {},
            text: data.text || data.message || null,
        };
    } catch (error) {
        console.error('Erro ao parsear resposta:', error);
        return {
            type: RESPONSE_TYPES.ERROR,
            payload: {
                message: 'Não foi possível processar a resposta',
                code: 'PARSE_ERROR',
            },
            text: null,
        };
    }
};

/**
 * Cria uma mensagem de chat formatada
 * @param {string} content - Conteúdo textual
 * @param {string} type - 'user' | 'ai'
 * @param {Object} widget - Dados do widget (opcional)
 * @returns {Object} Mensagem formatada
 */
export const createChatMessage = (content, type = 'user', widget = null) => {
    return {
        id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type,
        content,
        widget,
        timestamp: new Date().toISOString(),
    };
};

/**
 * Gera resposta mockada para desenvolvimento
 * @param {string} userMessage - Mensagem do usuário
 * @returns {Object} Resposta mockada
 */
export const generateMockResponse = (userMessage) => {
    const message = userMessage.toLowerCase();

    // Mock: perguntas sobre gastos
    if (message.includes('gastei') || message.includes('gasto')) {
        return {
            type: RESPONSE_TYPES.FINANCIAL_SUMMARY,
            payload: {
                amount: Math.random() * 2000 + 500,
                category: 'Total de Gastos',
                comparison_percentage: Math.floor(Math.random() * 30) - 15,
                comparison_label: 'vs mês passado',
                trend: Math.random() > 0.5 ? 'up' : 'down',
                insight: 'Este valor representa seus gastos totais no período selecionado.',
                sources: [
                    { id: 1, name: 'Supermercado BIG', date: '15 Dez', value: 234.50 },
                    { id: 2, name: 'Posto Shell', date: '12 Dez', value: 189.90 },
                ],
            },
            text: 'Aqui está o resumo dos seus gastos:',
        };
    }

    // Mock: perguntas sobre orçamento
    if (message.includes('orçamento') || message.includes('budget') || message.includes('limite')) {
        return {
            type: RESPONSE_TYPES.BUDGET_PROGRESS,
            payload: {
                category: 'Alimentação',
                icon: 'shopping-cart',
                spent: 850,
                budget: 1200,
                period: 'Dezembro 2025',
                trend: 'up',
            },
            text: 'Seu progresso no orçamento de Alimentação:',
        };
    }

    // Mock: resposta genérica
    return {
        type: RESPONSE_TYPES.TEXT,
        payload: null,
        text: `Entendi sua pergunta sobre "${userMessage}". Para fornecer uma análise precisa, preciso acessar seus dados financeiros. O que você gostaria de saber especificamente?`,
    };
};

const styles = StyleSheet.create({
    errorContainer: {
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
        borderRadius: 12,
        padding: 16,
        borderWidth: 1,
        borderColor: 'rgba(239, 68, 68, 0.3)',
    },
    errorText: {
        color: '#ef4444',
        fontSize: 14,
        fontFamily: FONTS.semiBold,
    },
    errorSuggestion: {
        color: COLORS.textSecondary,
        fontSize: 12,
        fontFamily: FONTS.regular,
        marginTop: 8,
    },
});

export default {
    createWidget,
    parseBackendResponse,
    createChatMessage,
    generateMockResponse,
};
