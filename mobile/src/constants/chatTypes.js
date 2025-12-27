/**
 * Chat Types - Tipos de resposta da IA
 * Define os contratos de interface entre Backend e Frontend
 */

// Tipos de resposta suportados pela IA
export const RESPONSE_TYPES = {
    TEXT: 'text_message',
    FINANCIAL_SUMMARY: 'financial_summary',
    BUDGET_PROGRESS: 'budget_progress',
    EXPENSE_CHART: 'expense_chart',
    COMPARISON: 'comparison',
    ERROR: 'error',
};

// Schema de mensagem de chat
export const MessageSchema = {
    id: 'string',           // UUID único
    type: 'user | ai',      // Tipo de remetente
    content: 'string',      // Texto da mensagem (para type=text)
    widget: 'object | null', // Dados do widget para renderização
    timestamp: 'Date',      // Timestamp da mensagem
};

// Schema de resposta do backend
export const ResponseSchema = {
    type: 'string',         // RESPONSE_TYPES
    payload: 'object',      // Dados específicos do widget
    text: 'string | null',  // Texto opcional acompanhando o widget
};

/**
 * Schema: Financial Summary
 * Widget de resumo financeiro com trend e fontes
 */
export const FinancialSummarySchema = {
    amount: 0,                    // number - Valor em reais
    category: '',                 // string - Categoria ou descrição
    comparison_percentage: 0,     // number - Percentual de comparação
    comparison_label: '',         // string - Label da comparação (ex: "vs mês passado")
    trend: 'up',                  // 'up' | 'down' | 'stable'
    insight: '',                  // string - Insight textual
    sources: [],                  // array - [{id, name, date, value}]
};

/**
 * Schema: Budget Progress
 * Widget de progresso orçamentário
 */
export const BudgetProgressSchema = {
    category: '',                 // string - Nome da categoria
    icon: '',                     // string - Nome do ícone Feather
    spent: 0,                     // number - Valor gasto
    budget: 0,                    // number - Valor orçado
    period: '',                   // string - Período (ex: "Maio 2025")
    trend: 'up',                  // 'up' | 'down' | 'stable'
};

/**
 * Schema: Error Response
 * Widget de erro/aviso
 */
export const ErrorSchema = {
    message: '',                  // string - Mensagem de erro
    code: '',                     // string - Código do erro
    suggestion: '',               // string - Sugestão de correção
};

// Constantes de status
export const CHAT_STATUS = {
    IDLE: 'idle',
    TYPING: 'typing',
    LOADING: 'loading',
    ERROR: 'error',
    CONNECTED: 'connected',
    DISCONNECTED: 'disconnected',
};

// Sugestões padrão para o chat
export const DEFAULT_SUGGESTIONS = [
    { id: 1, icon: 'trending-up', text: 'Quanto gastei este mês?' },
    { id: 2, icon: 'pie-chart', text: 'Quais são minhas maiores categorias?' },
    { id: 3, icon: 'calendar', text: 'Comparar gastos com mês passado' },
    { id: 4, icon: 'alert-circle', text: 'Onde posso economizar?' },
];

export default {
    RESPONSE_TYPES,
    CHAT_STATUS,
    DEFAULT_SUGGESTIONS,
    MessageSchema,
    ResponseSchema,
    FinancialSummarySchema,
    BudgetProgressSchema,
    ErrorSchema,
};
