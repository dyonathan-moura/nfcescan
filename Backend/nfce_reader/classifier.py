# -*- coding: utf-8 -*-
"""
Classificador de Produtos - Versão IA.

Toda a classificação é feita pelo Groq/Llama 3.
Este arquivo mantém apenas a lista de categorias válidas e função de ícones.
"""

# Lista de categorias válidas (usada pelo prompt da IA)
CATEGORIAS_VALIDAS = [
    "Bebidas", "Limpeza", "Higiene", "Padaria", "Açougue", 
    "Hortifruti", "Laticínios", "Mercearia", "Congelados", 
    "Pet", "Farmácia", "Transporte", "Casa", "Vestuário", 
    "Eletrônicos", "Lazer", "Ferramentas", "Outros"
]

def get_category_icon(categoria: str) -> str:
    """Retorna emoji para a categoria."""
    icons = {
        "Bebidas": "🥤", 
        "Limpeza": "🧹", 
        "Higiene": "🧴", 
        "Padaria": "🥖", 
        "Açougue": "🥩", 
        "Hortifruti": "🥬", 
        "Laticínios": "🥛", 
        "Mercearia": "🛒", 
        "Congelados": "🧊",
        "Pet": "🐕", 
        "Farmácia": "💊", 
        "Transporte": "⛽",
        "Casa": "🏠", 
        "Vestuário": "👕", 
        "Eletrônicos": "🖥️",
        "Lazer": "🎮", 
        "Ferramentas": "🛠️", 
        "Outros": "📦"
    }
    return icons.get(categoria, "📦")


# ============================================================================
# FUNÇÃO LEGADA (mantida para compatibilidade durante migração)
# Retorna "Outros" para forçar uso da IA
# ============================================================================

def classify_product(nome_produto: str) -> str:
    """
    Função legada - retorna sempre 'Outros' para forçar classificação via IA.
    Será removida após migração completa.
    """
    return "Outros"
