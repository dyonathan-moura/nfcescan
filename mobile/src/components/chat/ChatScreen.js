/**
 * ChatScreen - Tela principal do chat FinAI
 * 
 * Implementa a interface de chat com IA para análise de dados financeiros.
 * Suporta Generative UI com widgets interativos.
 */

import React, { useState, useRef, useEffect } from 'react';
import {
    View,
    Text,
    ScrollView,
    StyleSheet,
    SafeAreaView,
    StatusBar,
    KeyboardAvoidingView,
    Platform,
} from 'react-native';
import { COLORS, SIZES, FONTS } from '../../../theme';

// Componentes do chat
import ChatHeader from './ChatHeader';
import ChatBubble from './ChatBubble';
import ChatInput from './ChatInput';
import SuggestionButton from './SuggestionButton';
import FinancialSummaryWidget from './FinancialSummaryWidget';
import BudgetProgressWidget from './BudgetProgressWidget';

// API e utilitários
import { sendChatMessage } from '../../utils/chatApi';
import { createWidget, createChatMessage } from '../../utils/widgetFactory';

// Mensagens mockadas para demonstração
const MOCK_MESSAGES = [
    {
        id: '1',
        type: 'user',
        content: 'Quanto gastei no Uber mês passado?',
        timestamp: '14:32',
    },
    {
        id: '2',
        type: 'ai',
        widget: {
            type: 'financial_summary',
            data: {
                title: 'Análise de Gastos',
                amount: 345.90,
                category: 'em corridas de Uber',
                comparison_percentage: 12,
                trend: 'up',
                comparison_label: 'vs. Outubro',
                insight_text: 'Seu gasto com Uber em Novembro representa um aumento de 12% em relação ao mês anterior.',
                chartPlaceholder: '[Gráfico: Gastos Uber - Últimos 6 meses]',
                actions: [
                    { icon: 'clock', label: 'Ver histórico detalhado' },
                    { icon: 'trending-down', label: 'Sugerir orçamento' },
                ],
                sources: [
                    { name: 'Extrato Nubank - Nov 2023', location: 'Pág. 3 • Linhas 45-52' },
                ],
            },
        },
        timestamp: '14:32',
    },
    {
        id: '3',
        type: 'ai',
        widget: {
            type: 'budget_progress',
            data: {
                title: 'Orçamento de Mercado',
                period: 'Novembro',
                spent: 550,
                budget: 700,
                actions: [
                    { icon: 'grid', label: 'Detalhar por categoria' },
                    { icon: 'edit', label: 'Ajustar orçamento' },
                ],
            },
        },
        timestamp: '14:33',
    },
];

const SUGGESTIONS = [
    { icon: 'shopping-cart', text: 'Quanto gastei em mercado?' },
    { icon: 'file-text', text: 'Resuma compras recentes' },
    { icon: 'trending-up', text: 'Maior despesa do mês?' },
];

const ChatScreen = ({ onBack }) => {
    const [messages, setMessages] = useState(MOCK_MESSAGES);
    const [isTyping, setIsTyping] = useState(false);
    const scrollViewRef = useRef(null);

    // Contagem de notas (mock - substituir por dados reais)
    const connectionStatus = {
        connected: true,
        sources: '15 notas e 3 planilhas',
    };

    // Scroll para o fim quando novas mensagens chegam
    useEffect(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
    }, [messages]);

    // Enviar mensagem
    const handleSend = async (text) => {
        const newMessage = {
            id: Date.now().toString(),
            type: 'user',
            content: text,
            timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
        };

        setMessages(prev => [...prev, newMessage]);
        setIsTyping(true);

        try {
            // Chamar API do backend
            const response = await sendChatMessage(text);

            setIsTyping(false);

            // Construir mensagem de resposta baseada no tipo
            const aiResponse = {
                id: (Date.now() + 1).toString(),
                type: 'ai',
                content: response.text || null,
                timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
            };

            // Se tem payload, adicionar como widget
            if (response.payload && response.type !== 'text_message' && response.type !== 'error') {
                aiResponse.widget = {
                    type: response.type,
                    data: response.payload,
                };
            }

            // Se é erro, mostrar como texto
            if (response.type === 'error') {
                aiResponse.content = response.payload?.message || 'Erro desconhecido';
            }

            setMessages(prev => [...prev, aiResponse]);
        } catch (error) {
            console.error('Erro ao enviar mensagem:', error);
            setIsTyping(false);

            // Adicionar mensagem de erro
            const errorMessage = {
                id: (Date.now() + 1).toString(),
                type: 'ai',
                content: 'Desculpe, não consegui processar sua mensagem. Tente novamente.',
                timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
            };
            setMessages(prev => [...prev, errorMessage]);
        }
    };

    // Clique em sugestão
    const handleSuggestion = (suggestion) => {
        handleSend(suggestion.text);
    };

    // Novo chat
    const handleNewChat = () => {
        setMessages([]);
    };

    // Renderizar widget baseado no tipo
    const renderWidget = (widget) => {
        switch (widget.type) {
            case 'financial_summary':
                return (
                    <FinancialSummaryWidget
                        {...widget.data}
                        onActionPress={(action) => console.log('Action:', action)}
                        onSourcePress={(source) => console.log('Source:', source)}
                    />
                );
            case 'budget_progress':
                return (
                    <BudgetProgressWidget
                        {...widget.data}
                        onActionPress={(action) => console.log('Action:', action)}
                    />
                );
            default:
                return null;
        }
    };

    // Renderizar mensagem
    const renderMessage = (message) => {
        if (message.widget) {
            return (
                <ChatBubble
                    key={message.id}
                    type="ai"
                    widget={renderWidget(message.widget)}
                    timestamp={message.timestamp}
                />
            );
        }

        return (
            <ChatBubble
                key={message.id}
                type={message.type}
                content={message.content}
                timestamp={message.type === 'ai' ? message.timestamp : undefined}
            />
        );
    };

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor={COLORS.surfaceSolid} />

            {/* Header */}
            <ChatHeader
                onBack={onBack}
                onNewChat={handleNewChat}
                connectionStatus={connectionStatus}
            />

            {/* Área de mensagens */}
            <KeyboardAvoidingView
                style={styles.content}
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
            >
                <ScrollView
                    ref={scrollViewRef}
                    style={styles.messagesArea}
                    contentContainerStyle={styles.messagesContent}
                    keyboardShouldPersistTaps="handled"
                >
                    {/* Data do dia */}
                    <Text style={styles.dateLabel}>Hoje, 14:32</Text>

                    {/* Mensagens */}
                    {messages.map(renderMessage)}

                    {/* Indicador de digitação */}
                    {isTyping && (
                        <ChatBubble type="ai" isTyping />
                    )}

                    {/* Sugestões (mostrar apenas se não há mensagens ou após resposta) */}
                    {messages.length > 0 && !isTyping && (
                        <View style={styles.suggestionsContainer}>
                            <Text style={styles.suggestionsTitle}>SUGESTÕES DE CONTINUAÇÃO</Text>
                            {SUGGESTIONS.map((suggestion, index) => (
                                <SuggestionButton
                                    key={index}
                                    icon={suggestion.icon}
                                    text={suggestion.text}
                                    onPress={() => handleSuggestion(suggestion)}
                                />
                            ))}
                        </View>
                    )}
                </ScrollView>

                {/* Input */}
                <ChatInput
                    onSend={handleSend}
                    disabled={isTyping}
                />
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    content: {
        flex: 1,
    },
    messagesArea: {
        flex: 1,
    },
    messagesContent: {
        paddingVertical: SIZES.md,
    },

    dateLabel: {
        color: COLORS.textMuted,
        fontFamily: FONTS.regular,
        fontSize: SIZES.fontSm,
        textAlign: 'center',
        marginVertical: SIZES.md,
    },

    suggestionsContainer: {
        paddingHorizontal: SIZES.md,
        marginTop: SIZES.lg,
    },
    suggestionsTitle: {
        color: COLORS.textSecondary,
        fontFamily: FONTS.bold,
        fontSize: SIZES.fontSm,
        letterSpacing: 0.5,
        marginBottom: SIZES.sm,
    },
});

export default ChatScreen;
