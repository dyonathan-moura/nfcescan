/**
 * Design System - Premium Dark
 * Tema Escuro com Gradientes e Glassmorphism
 * Inspirado no NodPay
 */

export const COLORS = {
    // Bases - Dark Mode
    background: '#0D0D1A',           // Deep Dark
    backgroundSecondary: '#1A1A2E',  // Dark Blue
    surface: 'rgba(255,255,255,0.06)', // Glass Surface
    surfaceSolid: '#1E1E32',         // Solid Dark Surface

    // Cores Principais - Vibrantes
    primary: '#6366F1',              // Indigo
    primaryLight: '#818CF8',         // Indigo Light
    primaryGradient: ['#6366F1', '#8B5CF6'],

    secondary: '#8B5CF6',            // Purple
    accent: '#00D9FF',               // Cyan Glow
    accentGradient: ['#00D9FF', '#6366F1'],

    // Textos - Para fundo escuro
    textPrimary: '#FFFFFF',          // White
    textSecondary: 'rgba(255,255,255,0.7)', // White 70%
    textMuted: 'rgba(255,255,255,0.4)',     // White 40%

    // Status - Mais vibrantes
    success: '#10B981',              // Emerald
    danger: '#EF4444',               // Red
    warning: '#F59E0B',              // Amber

    // UI Elements
    border: 'rgba(255,255,255,0.1)',
    borderLight: 'rgba(255,255,255,0.15)',
    white: '#FFFFFF',
    black: '#0D0D1A',

    // Glass Effect
    glass: 'rgba(255,255,255,0.08)',
    glassLight: 'rgba(255,255,255,0.12)',
    glassBorder: 'rgba(255,255,255,0.18)',

    // Categorias (cores vibrantes para dark mode)
    categories: {
        alimentacao: '#FF6B35',
        bebidas: '#4ECDC4',
        transporte: '#45B7D1',
        casa: '#96CEB4',
        limpeza: '#88D8B0',
        higiene: '#FFEAA7',
        acougue: '#E17055',
        hortifruti: '#00B894',
        laticinios: '#FDCB6E',
        padaria: '#E9967A',
        pet: '#A29BFE',
        farmacia: '#74B9FF',
        outros: '#9CA3AF',
        roupas: '#A29BFE',
    }
};

export const FONTS = {
    regular: 'Nunito_400Regular',
    semiBold: 'Nunito_600SemiBold',
    bold: 'Nunito_700Bold',
};

export const SIZES = {
    // Border Radius
    radiusXs: 8,
    radiusSm: 12,
    radius: 16,
    radiusMd: 20,
    radiusLg: 24,
    radiusXl: 32,
    radiusFull: 9999,

    // Spacing
    base: 8,
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48,

    // Padding padrão
    padding: 20,
    paddingSm: 12,
    paddingLg: 28,

    // Typography
    fontXs: 10,
    fontSm: 12,
    fontBase: 14,
    fontMd: 16,
    fontLg: 18,
    fontXl: 20,
    font2xl: 24,
    font3xl: 28,
    font4xl: 32,
    font5xl: 40,
};

export const SHADOWS = {
    sm: {
        shadowColor: '#6366F1',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 4,
        elevation: 2,
    },
    md: {
        shadowColor: '#6366F1',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 4,
    },
    lg: {
        shadowColor: '#6366F1',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.25,
        shadowRadius: 16,
        elevation: 8,
    },
    glow: (color) => ({
        shadowColor: color,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.5,
        shadowRadius: 12,
        elevation: 8,
    }),
    glowSm: (color) => ({
        shadowColor: color,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.3,
        shadowRadius: 6,
        elevation: 4,
    }),
};

// Tema completo exportado
export default {
    COLORS,
    FONTS,
    SIZES,
    SHADOWS,
};
