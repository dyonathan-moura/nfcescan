/**
 * Formatters - Utilitários de formatação para dados
 * 
 * Funções para formatar moeda, datas e valores no padrão brasileiro.
 */

/**
 * Formata um valor numérico para moeda brasileira (R$ 1.200,00)
 * @param {number} value - Valor a ser formatado
 * @param {boolean} showSign - Se deve mostrar + ou - antes do valor
 * @returns {string} Valor formatado
 */
export function formatCurrency(value, showSign = false) {
    if (value === null || value === undefined || isNaN(value)) {
        return 'R$ 0,00';
    }

    const absValue = Math.abs(value);
    const formatted = absValue.toLocaleString('pt-BR', {
        style: 'currency',
        currency: 'BRL',
    });

    if (showSign && value !== 0) {
        return value > 0 ? `+${formatted}` : `-${formatted}`;
    }

    return formatted;
}

/**
 * Formata uma data para exibição curta (DD/MM)
 * @param {string|Date} date - Data a ser formatada
 * @returns {string} Data formatada
 */
export function formatDateShort(date) {
    if (!date) return '';

    const d = typeof date === 'string' ? new Date(date) : date;

    if (isNaN(d.getTime())) return '';

    const day = d.getDate().toString().padStart(2, '0');
    const month = (d.getMonth() + 1).toString().padStart(2, '0');

    return `${day}/${month}`;
}

/**
 * Formata uma data para exibição completa (DD de MMM)
 * @param {string|Date} date - Data a ser formatada
 * @returns {string} Data formatada
 */
export function formatDateLong(date) {
    if (!date) return '';

    const d = typeof date === 'string' ? new Date(date) : date;

    if (isNaN(d.getTime())) return '';

    const months = [
        'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
        'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'
    ];

    const day = d.getDate().toString().padStart(2, '0');
    const month = months[d.getMonth()];

    return `${day} de ${month}`;
}

/**
 * Formata uma data para exibição completa com ano (DD/MM/YYYY)
 * @param {string|Date} date - Data a ser formatada
 * @returns {string} Data formatada
 */
export function formatDateFull(date) {
    if (!date) return '';

    const d = typeof date === 'string' ? new Date(date) : date;

    if (isNaN(d.getTime())) return '';

    const day = d.getDate().toString().padStart(2, '0');
    const month = (d.getMonth() + 1).toString().padStart(2, '0');
    const year = d.getFullYear();

    return `${day}/${month}/${year}`;
}

/**
 * Formata um número para exibição com separadores de milhar
 * @param {number} value - Valor a ser formatado
 * @param {number} decimals - Número de casas decimais
 * @returns {string} Valor formatado
 */
export function formatNumber(value, decimals = 0) {
    if (value === null || value === undefined || isNaN(value)) {
        return '0';
    }

    return value.toLocaleString('pt-BR', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
    });
}

/**
 * Retorna a cor apropriada para um valor (verde para positivo, branco para negativo)
 * @param {number} value - Valor a ser avaliado
 * @param {object} colors - Objeto com cores
 * @returns {string} Cor hexadecimal
 */
export function getValueColor(value, colors) {
    if (!colors) return '#FFFFFF';

    if (value > 0) {
        return colors.success || '#4ade80';
    } else if (value < 0) {
        return colors.textPrimary || '#FFFFFF';
    }

    return colors.textSecondary || '#888888';
}

/**
 * Trunca texto longo e adiciona reticências
 * @param {string} text - Texto a ser truncado
 * @param {number} maxLength - Comprimento máximo
 * @returns {string} Texto truncado
 */
export function truncateText(text, maxLength = 30) {
    if (!text || text.length <= maxLength) return text;
    return text.substring(0, maxLength - 3) + '...';
}
