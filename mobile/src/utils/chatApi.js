/**
 * Chat API Service
 * Handles communication with the backend /api/chat endpoint
 */

// URL da API (mesmo do App.js)
const API_URL = 'https://nfcescan-api.onrender.com';

/**
 * Envia mensagem para o chat e retorna resposta da IA
 * @param {string} message - Mensagem do usuário
 * @param {Array} history - Histórico de mensagens (opcional)
 * @returns {Promise<Object>} Resposta estruturada {type, payload, text}
 */
export const sendChatMessage = async (message, history = []) => {
    try {
        const response = await fetch(`${API_URL}/api/chat`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                message,
                history,
            }),
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Erro ao enviar mensagem:', error);

        // Retorna erro estruturado
        return {
            type: 'error',
            payload: {
                message: 'Não foi possível conectar ao servidor',
                code: 'CONNECTION_ERROR',
                suggestion: 'Verifique sua conexão com a internet',
            },
            text: null,
        };
    }
};

/**
 * Verifica status da API de chat
 * @returns {Promise<boolean>} true se API está online
 */
export const checkChatApiStatus = async () => {
    try {
        const response = await fetch(`${API_URL}/health`, {
            method: 'GET',
            timeout: 5000,
        });
        return response.ok;
    } catch (error) {
        return false;
    }
};

export default {
    sendChatMessage,
    checkChatApiStatus,
    API_URL,
};
