# -*- coding: utf-8 -*-
"""
Serviço de Classificação Híbrida.
Orquestra: Regras Locais -> Memória (Correções) -> AI (Groq).
"""
from sqlalchemy.orm import Session
from database import CategoriaDB, CorrecaoClassificacaoDB
from classifier import classify_product as classify_rules
from groq_client import GroqClient
import os

# Inicializar cliente Groq
groq_client = GroqClient()

def classify_item_smart(db: Session, product_name: str) -> str:
    """
    Fluxo de classificação inteligente:
    1. Regras locais (rápido/grátis)
    2. Memória de correções (aprendizado exato)
    3. Inteligência Artificial (Groq - fallback inteligente)
    """
    
    # 1. Tentar regras locais primeiro
    category_rules = classify_rules(product_name)
    
    # Se a regra retornou algo específico (não "Outros" e não "Alimentação" genérico), confiamos nela
    # OBS: "Alimentação" é o fallback do rules, então se vier isso, tentamos ser mais específicos se possível
    if category_rules != "Outros" and category_rules != "Alimentação":
        return category_rules
        
    # 2. Verificar Memória de Correções (Aprendizado Exato)
    # Busca se esse termo exato já foi corrigido antes
    correction = db.query(CorrecaoClassificacaoDB).filter(
        CorrecaoClassificacaoDB.termo_original == product_name
    ).order_by(CorrecaoClassificacaoDB.created_at.desc()).first()
    
    if correction and correction.categoria_nova:
        print(f"🧠 Memória usada: '{product_name}' -> {correction.categoria_nova.nome}")
        return correction.categoria_nova.nome

    # 3. Inteligência Artificial (Groq)
    # Se caiu no fallback ("Alimentação" ou "Outros"), vamos perguntar pra IA
    # mas só se tivermos chave de API
    if groq_client.client:
        # Carregar contexto: Categorias disponíveis
        cats_db = db.query(CategoriaDB).all()
        categories = [c.nome for c in cats_db]
        
        # Carregar contexto: Últimas correções para few-shot learning
        last_corrections = db.query(CorrecaoClassificacaoDB)\
            .order_by(CorrecaoClassificacaoDB.created_at.desc())\
            .limit(10)\
            .all()
            
        corrections_data = []
        for c in last_corrections:
            if c.categoria_nova:
                corrections_data.append({
                    "termo": c.termo_original,
                    "categoria": c.categoria_nova.nome
                })
        
        # Chamar IA
        print(f"🤖 Chamando Groq para: '{product_name}'")
        ai_category = groq_client.classify_item(product_name, categories, corrections_data)
        
        if ai_category != "Outros":
            return ai_category

    # Fallback final (o que a regra original deu, provavelmente Alimentação ou Outros)
    return category_rules

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
    print(f"📝 Aprendizado salvo: '{product_name}' agora é Categoria {new_category_id}")
