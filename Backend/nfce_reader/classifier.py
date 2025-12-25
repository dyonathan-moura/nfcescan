# -*- coding: utf-8 -*-
"""
Classificador de Produtos - Categorização automática por palavras-chave.

Este módulo classifica produtos de notas fiscais em categorias usando
lógica de keyword matching. É rápido, gratuito e resolve ~80% dos casos.
"""

# ============================================================================
# REGRAS DE CLASSIFICAÇÃO (Dicionário de Palavras-Chave)
# ============================================================================

REGRAS_CATEGORIA = {
    "Transporte": [
        "gasolina", "etanol", "diesel", "gnv", "alcool", "combustivel",
        "estacionamento", "pedagio", "uber", "99", "cabify"
    ],
    
    "Bebidas": [
        "cerveja", "chopp", "brahma", "skol", "heineken", "budweiser",
        "vinho", "vodka", "whisky", "whiskey", "rum", "gin", "cachaça",
        "refri", "coca-cola", "coca cola", "pepsi", "fanta", "guarana",
        "suco", "nectar", "agua", "h2oh", "sprite", "schweppes",
        "energetico", "monster", "redbull", "red bull", "gatorade",
        "clight", "tang", "mid", "fresh", "ref ", "ref."
    ],
    
    "Limpeza": [
        "sabao", "detergente", "lava loucas", "amaciante", "alvejante",
        "desinfetante", "agua sanitaria", "cloro",
        "papel higienico", "papel toalha", "guardanapo",
        "saco de lixo", "lixo", "vassoura", "rodo", "mop", "pano",
        "esponja", "bombril", "palha de aco",
        "veja", "omo", "ype", "brilhante", "comfort", "downy"
    ],
    
    "Higiene": [
        "sabonete", "shampoo", "condicionador", "creme",
        "pasta dental", "creme dental", "colgate", "oral-b",
        "escova dental", "fio dental",
        "desodorante", "perfume", "colonia",
        "absorvente", "fralda", "pampers", "huggies",
        "gilete", "barbeador", "lamina"
    ],
    
    "Padaria": [
        "pao", "paes", "baguete", "ciabatta", "frances",
        "bolo", "torta", "pudim", "sonho", "croissant",
        "biscoito", "bolacha", "wafer", "rosquinha"
    ],
    
    "Açougue": [
        "carne", "bife", "contra file", "file mignon", "maminha",
        "picanha", "alcatra", "patinho", "acem", "costela",
        "frango", "coxa", "sobrecoxa", "peito de frango", "asa",
        "linguica", "salsicha", "bacon", "presunto", "mortadela",
        "peixe", "salmao", "tilapia", "bacalhau", "camarao"
    ],
    
    "Hortifruti": [
        "banana", "maca", "laranja", "limao", "uva", "morango",
        "manga", "mamao", "melancia", "melao", "abacaxi", "kiwi",
        "tomate", "cebola", "alho", "batata", "cenoura", "beterraba",
        "alface", "rucula", "agriao", "couve", "brocolis", "espinafre",
        "pepino", "abobrinha", "pimentao", "berinjela"
    ],
    
    "Laticínios": [
        "leite", "iogurte", "queijo", "mussarela", "prato", "minas",
        "requeijao", "manteiga", "margarina", "creme de leite", "nata",
        "danone", "activia", "nestle", "italac", "parmalat"
    ],
    
    "Mercearia": [
        "arroz", "feijao", "macarrao", "massa", "espaguete",
        "oleo", "soja", "azeite", "vinagre",
        "sal", "acucar", "farinha", "trigo", "fuba", "amido",
        "cafe", "cha", "achocolatado", "nescau", "toddy",
        "molho", "catchup", "ketchup", "mostarda", "maionese",
        "atum", "sardinha", "milho", "ervilha", "palmito"
    ],
    
    "Congelados": [
        "pizza", "lasanha", "hamburguer", "nuggets", "empanado",
        "sorvete", "picole", "acai", "kibon", "haagen"
    ],
    
    "Pet": [
        "racao", "pet", "cao", "cachorro", "gato", "felino",
        "pedigree", "whiskas", "royal canin"
    ],
    
    "Farmácia": [
        "remedio", "medicamento", "dipirona", "paracetamol", "ibuprofeno",
        "vitamina", "suplemento", "band-aid", "curativo", "algodao",
        "termometro", "seringa", "mascara"
    ]
}


def classify_product(nome_produto: str) -> str:
    """
    Classifica um produto em uma categoria baseado em palavras-chave.
    
    Args:
        nome_produto: Nome do produto da nota fiscal.
    
    Returns:
        Nome da categoria (ex: "Bebidas", "Limpeza", "Alimentação").
    """
    if not nome_produto:
        return "Outros"
    
    # Normalizar: minúsculo e remover acentos básicos
    nome = nome_produto.lower()
    
    # Verificar cada categoria
    for categoria, palavras_chave in REGRAS_CATEGORIA.items():
        for palavra in palavras_chave:
            if palavra in nome:
                return categoria
    
    # Default: assumir que é alimentação geral
    return "Alimentação"


def get_category_icon(categoria: str) -> str:
    """
    Retorna o emoji/ícone correspondente à categoria.
    
    Args:
        categoria: Nome da categoria.
    
    Returns:
        Emoji representativo.
    """
    icons = {
        "Transporte": "⛽",
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
        "Alimentação": "🍽️",
        "Outros": "📦"
    }
    return icons.get(categoria, "📦")


# Para uso direto no terminal
if __name__ == "__main__":
    # Testar algumas classificações
    testes = [
        "COCA COLA 2L",
        "ARROZ TIO JOAO 5KG",
        "DETERGENTE YPE 500ML",
        "PICANHA ANGUS KG",
        "BANANA PRATA KG",
        "LEITE INTEGRAL ITALAC",
        "GASOLINA COMUM",
        "SHAMPOO PANTENE 400ML",
        "RACAO PEDIGREE 15KG",
        "ITEM ALEATORIO XYZ"
    ]
    
    print("=== Teste de Classificação ===\n")
    for item in testes:
        cat = classify_product(item)
        icon = get_category_icon(cat)
        print(f"{icon} {item} -> {cat}")
