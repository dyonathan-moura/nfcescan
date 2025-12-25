# 📐 Guia de Iconografia - Fundly

## Problema Atual

| Elemento | Atual | Problema |
|----------|-------|----------|
| Categorias | 🍔🥤🚗 | Emojis variam entre dispositivos, parecem infantis |
| Ações | 📋📊⚠️ | Inconsistentes, estilo "WhatsApp" |
| UI | Feather icons | Bons, mas misturados com emojis |

**Resultado:** App parece amador, não transmite confiança para gestão financeira.

---

## Solução Recomendada

### Biblioteca: **Phosphor Icons**
> Moderna, consistente, 6 estilos em uma família

**Por que Phosphor:**
- ✅ 6.000+ ícones (cobre todas as necessidades)
- ✅ 6 pesos: Thin, Light, Regular, Bold, Fill, Duotone
- ✅ Estilo moderno e profissional
- ✅ Fácil de instalar no React Native
- ✅ Gratuito e open source

**Instalação:**
```bash
npm install phosphor-react-native
```

---

## Estilo Definido

### Peso: **Regular** (padrão) + **Fill** (selecionado)
- Ícones de linha (Regular) para estados normais
- Ícones preenchidos (Fill) para estados ativos/selecionados

### Tamanhos Padrão
| Contexto | Tamanho | Exemplo |
|----------|---------|---------|
| Tab bar | 24px | Navegação principal |
| Botões de ação | 20px | Header buttons |
| Inline/texto | 16px | Junto a labels |
| Cards grandes | 32px | KPIs, destaque |

### Cores
- **Primário (ação):** `#1ABC9C` (Turquoise)
- **Neutro:** `#2C3E50` (Midnight Blue)
- **Muted:** `#8E8E93` (Grey)
- **Sucesso:** `#2ECC71`
- **Erro:** `#E74C3C`

---

## Mapeamento de Ícones

### Navegação Principal
| Função | Ícone Phosphor | Preview |
|--------|----------------|---------|
| Scanner/Home | `Scan` | 📷→ □⃞ |
| Histórico | `ClockCounterClockwise` | 📋→ ↺ |
| Relatórios | `ChartPie` | 📊→ ◔ |
| Configurações | `GearSix` | ⚙️→ ⚙ |

### Ações da Câmera
| Função | Ícone Phosphor |
|--------|----------------|
| Fechar | `X` |
| Flash on | `Lightning` |
| Flash off | `LightningSlash` |
| Trocar câmera | `CameraRotate` |
| Digitar código | `Keyboard` |

### Status e Feedback
| Função | Ícone Phosphor |
|--------|----------------|
| Sucesso | `CheckCircle` |
| Erro | `WarningCircle` |
| Loading | `SpinnerGap` (animado) |
| Info | `Info` |
| Voltar | `ArrowLeft` |

### Categorias (Substituindo Emojis)
| Categoria | Emoji Atual | Ícone Phosphor |
|-----------|-------------|----------------|
| Alimentação | 🍔 | `Hamburger` |
| Bebidas | 🥤 | `Beer` ou `Coffee` |
| Transporte | 🚗 | `Car` |
| Casa | 🏠 | `House` |
| Limpeza | 🧹 | `Broom` |
| Higiene | 🧴 | `Drop` |
| Açougue | 🥩 | `Knife` |
| Hortifruti | 🥬 | `Carrot` |
| Laticínios | 🧀 | `Egg` (próximo) |
| Padaria | 🥖 | `Bread` |
| Pet | 🐕 | `Dog` |
| Farmácia | 💊 | `Pill` |
| Roupas | 👕 | `TShirt` |
| Outros | 📦 | `Package` |

---

## Exemplo Visual de Transformação

### Antes (Atual)
```
[📋 Histórico]  [📊 Relatórios]  [⚙️ Config]
     
     🍔 Alimentação    R$ 450,00
     🥤 Bebidas        R$ 120,00
```

### Depois (Phosphor)
```
[↺ Histórico]  [◔ Relatórios]  [⚙ Config]
     
     ☰ Alimentação    R$ 450,00
     ♨ Bebidas        R$ 120,00
```

---

## Implementação

### Passo 1: Instalar Phosphor
```bash
cd mobile
npm install phosphor-react-native react-native-svg
```

### Passo 2: Uso Básico
```jsx
import { House, Scan, ClockCounterClockwise } from 'phosphor-react-native';

// Ícone normal
<House size={24} color={COLORS.textPrimary} />

// Ícone ativo (preenchido)
<House size={24} color={COLORS.primary} weight="fill" />
```

### Passo 3: Criar Constante de Categorias
```javascript
// src/constants/categories.js
export const CATEGORY_ICONS = {
  alimentacao: 'Hamburger',
  bebidas: 'Beer',
  transporte: 'Car',
  casa: 'House',
  limpeza: 'Broom',
  // ...
};
```

---

## Decisão Necessária

> [!IMPORTANT]
> **Pergunta:** Quer manter a possibilidade de emojis customizados pelo usuário nas categorias, ou padronizar 100% com ícones Phosphor?

**Opção A:** Ícones fixos (mais profissional, consistente)  
**Opção B:** Permitir emoji OU ícone (mais flexível, mas menos consistente)

---

## Próximos Passos

1. [ ] Aprovar este guia
2. [ ] Instalar `phosphor-react-native`
3. [ ] Criar mapeamento de categorias
4. [ ] Substituir ícones na UI
5. [ ] Remover emojis do código
6. [ ] Testar em iOS e Android
