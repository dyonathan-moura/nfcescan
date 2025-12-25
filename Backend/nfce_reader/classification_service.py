# -*- coding: utf-8 -*-
"""
Serviço de Classificação por IA.
Fluxo: Memória (Correções) -> IA (Groq) em Lote.
"""
from sqlalchemy.orm import Session
from database import CategoriaDB, CorrecaoClassificacaoDB
from groq_client import GroqClient
from classifier import CATEGORIAS_VALIDAS

# Inicializar cliente Groq
groq_client = GroqClient()


def classify_items_batch(db: Session, produtos: list[str]) -> dict[str, str]:
    """
    Classifica uma lista de produtos usando IA em lote.
    
    Fluxo:
    1. Verifica memória de correções (match exato)
    2. Produtos não encontrados vão para IA em lote
    3. Retorna dict {produto: categoria}
    """
    if not produtos:
        return {}
    
    result = {}
    produtos_para_ia = []
    
    # 1. Verificar memória de correções primeiro
    for prod in produtos:
        correction = db.query(CorrecaoClassificacaoDB).filter(
            CorrecaoClassificacaoDB.termo_original == prod
        ).order_by(CorrecaoClassificacaoDB.created_at.desc()).first()
        
        if correction and correction.categoria_nova:
            print(f"🧠 Memória: '{prod}' -> {correction.categoria_nova.nome}")
            result[prod] = correction.categoria_nova.nome
        else:
            produtos_para_ia.append(prod)
    
    # 2. Classificar restante via IA em lote
    if produtos_para_ia and groq_client.client:
        # Carregar categorias do banco
        cats_db = db.query(CategoriaDB).all()
        categorias = [c.nome for c in cats_db]
        
        # Carregar correções para few-shot learning
        last_corrections = db.query(CorrecaoClassificacaoDB)\
            .order_by(CorrecaoClassificacaoDB.created_at.desc())\
            .limit(15)\
            .all()
        
        corrections_data = []
        for c in last_corrections:
            if c.categoria_nova:
                corrections_data.append({
                    "termo": c.termo_original,
                    "categoria": c.categoria_nova.nome
                })
        
        # Chamada em lote para IA
        print(f"🤖 Classificando {len(produtos_para_ia)} itens via Groq...")
        ia_results = groq_client.classify_batch(produtos_para_ia, categorias, corrections_data)
        result.update(ia_results)
    
    # 3. Fallback: produtos que não foram classificados -> "Outros"
    for prod in produtos:
        if prod not in result:
            result[prod] = "Outros"
    
    return result


def classify_item_smart(db: Session, product_name: str) -> str:
    """
    Classifica um único item (usa batch internamente).
    Mantido para compatibilidade com código existente.
    """
    result = classify_items_batch(db, [product_name])
    return result.get(product_name, "Outros")


def save_correction(db: Session, item_id: int, old_category_id: int, new_category_id: int, product_name: str):
    """Salva uma correção feita pelo usuário para aprendizado futuro."""
    if old_category_id == new_category_id:
        return

    correction = CorrecaoClassificacaoDB(
        item_id=item_id,
        termo_original=product_name,
        categoria_anterior_id=old_category_id,
        categoria_nova_id=new_category_id
    )
    db.add(correction)
    db.commit()
    print(f"📝 Aprendizado salvo: '{product_name}' -> Categoria {new_category_id}")
