# -*- coding: utf-8 -*-
"""
Classificador de Produtos - Categorização composta (Nome + Unidade).

Lógica de 3 Camadas:
1. Modificadores Fortes (ex: "Sabonete", "Refri") -> Definem categoria imediatamente.
2. Nome Principal (ex: "Morango") -> Gera candidato.
3. Unidade de Medida (ex: "ML" vs "KG") -> Desempate/Correção.
"""

import re

# ============================================================================
# REGRAS DE CLASSIFICAÇÃO
# ============================================================================

# Categorias "Fortes" - Se der match aqui, dificilmente é erro de contexto
CATEGORIAS_FORTES = {
    "Transporte": [
        "gasolina", "etanol", "diesel", "gnv", "alcool", "combustivel",
        "pedagio", "uber", "99", "cabify"
    ],
    "Limpeza": [
        "sabao", "detergente", "lava loucas", "lava roupa", "amaciante", "alvejante",
        "desinfetante", "agua sanitaria", "cloro", "vassoura", "rodo", 
        "mop", "pano", "esponja", "bombril", "veja", "omo", "ype", "ariel"
    ],
    "Higiene": [
        "papel higienico", "sabonete", "shampoo", "condicionador", 
        "creme dental", "pasta dental", "colgate", "oral-b", "escova dental",
        "fio dental", "desodorante", "perfume", "fralda", "pampers", "huggies",
        "absorvente", "gilete", "barbeador"
    ],
    "Pet": [
        "racao", "pet ", " pet", "cachorro", "gato", "felino", "pedigree", "whiskas",
        "royal canin", "golden", "premier"
    ],
    "Farmácia": [
        "remedio", "medicamento", "dipirona", "paracetamol", "ibuprofeno",
        "vitamina", "suplemento", "band-aid", "curativo"
    ],
    "Bebidas": [
        "cerveja", "chopp", "brahma", "skol", "heineken", "budweiser",
        "vinho", "vodka", "whisky", "gin", "cachaça",
        "refri", "coca-cola", "coca cola", "pepsi", "fanta", "guarana", "sprite",
        "suco", "nectar", "agua", "h2oh", "schweppes",
        "energetico", "monster", "redbull", "red bull", "gatorade",
        "clight", "tang", "mid", "fresh", "ref ", "ref."
    ],
     "Padaria": [
        "pao", "paes", "baguete", "ciabatta", "frances",
        "bolo", "torta", "pudim", "sonho", "croissant", "panetone",
        "biscoito", "bisc", "bolacha", "wafer", "rosquinha"
    ],
}

# Categorias "Fracas" - Dependem de contexto (ex: "Morango" pode ser fruta, suco ou iogurte)
CATEGORIAS_FRACAS = {
    "Açougue": [
        "carne", "bife", "contra file", "file mignon", "maminha", "picanha",
        "alcatra", "patinho", "acem", "costela", "linguica", "salsicha",
        "bacon", "presunto", "mortadela", "peixe", "salmao", "tilapia",
        "frango", "coxa", "sobrecoxa", "asa"
    ],
    "Hortifruti": [
        "banana", "maca", "laranja", "limao", "uva", "morango", "maracuja",
        "manga", "mamao", "melancia", "melao", "abacaxi", "kiwi", "pessego",
        "tomate", "cebola", "alho", "batata", "cenoura", "beterraba",
        "alface", "rucula", "agriao", "couve", "brocolis", "espinafre",
        "pepino", "abobrinha", "pimentao", "berinjela", "ovos"
    ],
    "Laticínios": [
        "leite", "iogurte", "queijo", "mussarela", "prato", "minas",
        "requeijao", "manteiga", "margarina", "nata", "danone", "activia",
        "yakult", "chandelle", "danette", "parmalat", "tirol"
    ],
    "Mercearia": [
        "arroz", "feijao", "macarrao", "massa", "espaguete", "lasanha",
        "oleo", "soja", "azeite", "vinagre", "sal", "acucar", 
        "farinha", "trigo", "fuba", "amido", "cafe", "cha", "achocolatado",
        "nescau", "toddy", "molho", "catchup", "maionese", "milho", "ervilha"
    ],
    "Congelados": [
        "pizza", "hamburguer", "nuggets", "empanado", "sorvete", "picole", "acai"
    ],
    "Casa": ["lampada", "pilha", "bateria"],
    "Vestuário": ["camiseta", "calca", "meia", "cueca", "calcinha", "tenis", "sandalia"],
    "Eletrônicos": ["cabo", "carregador", "fone", "usb", "mouse"],
}

def extract_unit(nome: str) -> str:
    """
    Extrai a unidade de medida do nome do produto.
    Retorna: 'KG', 'G', 'L', 'ML' ou None.
    """
    # Procura por padrões no final ou meio da string isolados por espaço/número
    # Ex: 200ML, 200 ML, 1KG, 1 KG
    match = re.search(r'(\d+)\s*(ml|l|lt|litro|kg|g|gr|gramas)\b', nome.lower())
    if match:
        unit = match.group(2)
        if unit in ['lt', 'litro']: return 'L'
        if unit in ['gr', 'gramas']: return 'G'
        return unit.upper()
    return None

def classify_product(nome_produto: str) -> str:
    """Classificação composta (Modificador > Nome > Unidade)."""
    if not nome_produto:
        return "Outros"
    
    nome = nome_produto.lower()
    
    # 1. CAMADA 1: Modificadores Fortes (Prioridade Total)
    # Se achou "Sabão", é Limpeza, não importa se é "Sabão de Coco" (Hortifruti?? não)
    for categoria, palavras in CATEGORIAS_FORTES.items():
        for palavra in palavras:
            if palavra in nome:
                return categoria

    # 2. CAMADA 2: Nome Principal (Candidato)
    candidato = "Alimentação" # Default fallback
    
    for categoria, palavras in CATEGORIAS_FRACAS.items():
        for palavra in palavras:
            if palavra in nome:
                candidato = categoria
                break
        if candidato != "Alimentação":
            break
            
    # 3. CAMADA 3: Tira Teima com Unidade
    # Se o candidato for "Hortifruti" mas a unidade for ML/L, provavelmente é suco ou iogurte
    unit = extract_unit(nome_produto)
    
    if candidato in ["Hortifruti", "Açougue"]:
        if unit in ["ML", "L"]:
            # Conflito! Fruta/Carne em líquido? 
            # Verifica Laticínios (Iogurte de morango) vs Bebidas (Suco de morango)
            if "iogurte" in nome or "leite" in nome or "drink" in nome:
                return "Laticínios"
            return "Bebidas" # Default para líquido de fruta é bebida
            
    return candidato

def get_category_icon(categoria: str) -> str:
    icons = {
        "Transporte": "⛽", "Bebidas": "🥤", "Limpeza": "🧹", "Higiene": "🧴",
        "Padaria": "🥖", "Açougue": "🥩", "Hortifruti": "🥬", "Laticínios": "🥛",
        "Mercearia": "🛒", "Congelados": "🧊", "Pet": "🐕", "Farmácia": "💊",
        "Alimentação": "🍽️", "Outros": "📦", "Vestuário": "👕", 
        "Eletrônicos": "🖥️", "Casa": "🏠", "Lazer": "🎮", "Ferramentas": "🛠️"
    }
    return icons.get(categoria, "📦")


if __name__ == "__main__":
    testes = [
        "IOGURTE MORANGO 200ML", # Esperado: Laticínios (mesmo tendo morango)
        "SUCO DE UVA 1L",        # Esperado: Bebidas (mesmo tendo uva)
        "MORANGO 250G",          # Esperado: Hortifruti
        "DETERGENTE",            # Esperado: Limpeza
        "SABAO DE COCO",         # Esperado: Limpeza (mesmo tendo coco)
        "AGUA SEM GAS",          # Esperado: Bebidas
        "REFRIGERANTE 2L"
    ]
    print("=== Teste Lógica Composta ===")
    for t in testes:
        print(f"{t} -> {classify_product(t)}")
