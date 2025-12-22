/**
 * Design System - NFC-e Scanner
 * Tema Dark Mode com Tipografia Archivo e Cores Neon
 */

export const COLORS = {
    // Bases
    background: '#0B0C15',       // Azul Quase Preto (Deep Space)
    surface: '#1C1E2A',          // Superfície Sólida
    surfaceGlass: 'rgba(28, 30, 42, 0.7)', // Vidro (usar com Blur)

    // Cores Principais
    primary: '#FF6B4A',          // Laranja Coral (Ação)
    primaryGradient: ['#FF8560', '#FF6B4A'],

    secondary: '#4DA6FF',        // Azul Elétrico (Dados)
    secondaryGradient: ['#2D7FF9', '#4DA6FF'],

    // Textos
    textPrimary: '#FFFFFF',
    textSecondary: '#8F92A1',    // Cinza Azulado
    textMuted: 'rgba(255,255,255,0.4)',

    // Status
    success: '#00D09C',          // Verde Neon
    danger: '#FF4A4A',           // Vermelho
    warning: '#FFC107',

    // UI Elements
    border: 'rgba(255,255,255,0.1)',
    white: '#FFFFFF',
    black: '#000000',

    // Categorias (cores padrão convertidas para dark mode)
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
        outros: '#636E72',
        roupas: '#A29BFE',
    }
};

export const FONTS = {
    regular: 'Archivo_400Regular',
    medium: 'Archivo_500Medium',
    bold: 'Archivo_700Bold',
    black: 'Archivo_900Black',
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
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    md: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
        elevation: 4,
    },
    lg: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.2,
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
};

// Tema completo exportado
export default {
    COLORS,
    FONTS,
    SIZES,
    SHADOWS,
};
