# -*- coding: utf-8 -*-
"""
Cliente Groq para classificação inteligente de produtos.
Usa o modelo Llama 3 para classificar TODOS os itens em lote (mais eficiente).
"""
import os
import json
from groq import Groq
from typing import List, Dict, Optional

# Modelo rápido e eficiente
MODEL_NAME = "llama-3.3-70b-versatile"

class GroqClient:
    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key or os.getenv("GROQ_API_KEY")
        if not self.api_key:
            print("⚠️ GROQ_API_KEY não encontrada. Classificação inteligente desativada.")
            self.client = None
        else:
            self.client = Groq(api_key=self.api_key)

    def classify_batch(self, produtos: List[str], categorias: List[str], corrections: List[Dict] = None) -> Dict[str, str]:
        """
        Classifica uma lista de produtos em uma ÚNICA chamada (mais eficiente e barato).
        
        Args:
            produtos: Lista de nomes de produtos a classificar.
            categorias: Lista de categorias disponíveis.
            corrections: Histórico de correções para few-shot learning.
            
        Returns:
            Dicionário {nome_produto: categoria}
        """
        if not self.client:
            return {prod: "Outros" for prod in produtos}
        
        if not produtos:
            return {}

        # Construir prompt para classificação em lote
        prompt = self._build_batch_prompt(produtos, categorias, corrections or [])

        try:
            response = self.client.chat.completions.create(
                model=MODEL_NAME,
                messages=[
                    {"role": "system", "content": "Você é um classificador JSON de produtos de supermercado. Responda APENAS JSON válido."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0,  # Zero para máxima consistência
                max_tokens=2000,  # Suficiente para muitos itens
                top_p=1,
            )
            
            result_text = response.choices[0].message.content.strip()
            
            # Tentar parsear JSON
            try:
                # Limpar possíveis markdown code blocks
                if result_text.startswith("```"):
                    result_text = result_text.split("```")[1]
                    if result_text.startswith("json"):
                        result_text = result_text[4:]
                
                result_dict = json.loads(result_text)
                
                # Validar e corrigir categorias
                validated = {}
                for prod, cat in result_dict.items():
                    if cat in categorias:
                        validated[prod] = cat
                    else:
                        # Tentar match aproximado
                        found = False
                        for valid_cat in categorias:
                            if valid_cat.lower() in cat.lower() or cat.lower() in valid_cat.lower():
                                validated[prod] = valid_cat
                                found = True
                                break
                        if not found:
                            validated[prod] = "Outros"
                
                # Garantir que todos os produtos originais estão no resultado
                for prod in produtos:
                    if prod not in validated:
                        validated[prod] = "Outros"
                
                return validated
                
            except json.JSONDecodeError:
                print(f"⚠️ Groq retornou JSON inválido: {result_text[:200]}")
                return {prod: "Outros" for prod in produtos}

        except Exception as e:
            print(f"❌ Erro na classificação Groq batch: {e}")
            return {prod: "Outros" for prod in produtos}

    def _build_batch_prompt(self, produtos: List[str], categorias: List[str], corrections: List[Dict]) -> str:
        """Constrói prompt para classificação em lote."""
        
        cats_str = json.dumps(categorias, ensure_ascii=False)
        prods_str = json.dumps(produtos, ensure_ascii=False)
        
        # Formatar exemplos de aprendizado
        examples_str = ""
        if corrections:
            examples = []
            for corr in corrections[-15]:  # Últimos 15 para contexto
                if 'termo' in corr and 'categoria' in corr:
                    examples.append(f'"{corr["termo"]}": "{corr["categoria"]}"')
            if examples:
                examples_str = f"""
HISTÓRICO DE CORREÇÕES (siga estas regras):
{{{", ".join(examples)}}}
"""
        
        return f"""Classifique cada produto em UMA categoria.

CATEGORIAS VÁLIDAS: {cats_str}

REGRAS IMPORTANTES:
- FGO = Frango → Açougue
- BOV = Bovino → Açougue  
- SUI = Suíno → Açougue
- CONG = Congelado
- SEARA, SADIA, PERDIGAO = marcas de carne → Açougue
- Pizza, Lasanha congelada → Congelados
- Iogurte, Queijo, Leite → Laticínios
- MAC N CHEESE → Congelados
- Arroz, Feijão, Macarrão → Mercearia
- Frutas, Verduras → Hortifruti
- Sabão, Detergente, Desinfetante → Limpeza
- Shampoo, Sabonete, Creme dental → Higiene
- Ração de cachorro/gato → Pet
- Se não souber → Outros
{examples_str}
PRODUTOS A CLASSIFICAR: {prods_str}

Responda APENAS um JSON válido no formato: {{"nome_produto": "categoria"}}
Não inclua explicações, apenas o JSON."""


    # ============================================================================
    # MÉTODO LEGADO (mantido para compatibilidade)
    # ============================================================================
    
    def classify_item(self, product_name: str, categories: List[str], corrections: List[Dict]) -> str:
        """Classifica um único item (usa batch internamente)."""
        result = self.classify_batch([product_name], categories, corrections)
        return result.get(product_name, "Outros")
