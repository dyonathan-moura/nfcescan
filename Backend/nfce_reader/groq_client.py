# -*- coding: utf-8 -*-
"""
Cliente Groq para classificação inteligente de produtos.
Usa o modelo Llama 3 para inferir categorias com base no contexto.
"""
import os
from groq import Groq
from typing import List, Dict, Optional

# Modelo rápido e eficiente
MODEL_NAME = "llama-3.1-8b-instant"

class GroqClient:
    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key or os.getenv("GROQ_API_KEY")
        if not self.api_key:
            print("⚠️ GROQ_API_KEY não encontrada. Classificação inteligente desativada.")
            self.client = None
        else:
            self.client = Groq(api_key=self.api_key)

    def classify_item(self, product_name: str, categories: List[str], corrections: List[Dict]) -> str:
        """
        Classifica um item usando o modelo Llama 3 no Groq.
        
        Args:
            product_name: Nome do produto a ser classificado.
            categories: Lista de categorias disponíveis no sistema.
            corrections: Lista de exemplos de correções anteriores (aprendizado).
            
        Returns:
            Nome da categoria sugerida.
        """
        if not self.client:
            return "Outros"

        # Construir o prompt com contexto
        prompt = self._build_prompt(product_name, categories, corrections)

        try:
            response = self.client.chat.completions.create(
                model=MODEL_NAME,
                messages=[
                    {"role": "system", "content": "Você é um assistente especializado em classificar produtos de notas fiscais brasileiras."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.1, # Baixa temperatura para ser determinístico
                max_tokens=60,
                top_p=1,
            )
            
            result = response.choices[0].message.content.strip()
            
            # Limpar pontuação extra se houver (ex: "Vestuário.")
            result = result.rstrip(".")
            
            # Validar se o resultado é uma categoria válida
            if result in categories:
                return result
                
            # Tentar matching aproximado se alucinar
            for cat in categories:
                if cat.lower() in result.lower():
                    return cat
                    
            return "Outros"

        except Exception as e:
            print(f"❌ Erro na classificação Groq: {e}")
            return "Outros"

    def _build_prompt(self, product: str, categories: List[str], corrections: List[Dict]) -> str:
        """Constrói o prompt enriquecido com contexto."""
        
        cats_str = ", ".join(categories)
        
        # Formatar exemplos de aprendizado
        examples_str = ""
        if corrections:
            examples_str = "\nHISTÓRICO DE APRENDIZADO (Use como regra):\n"
            for corr in corrections[-10:]: # Usar apenas os 10 últimos para economizar tokens
                examples_str += f"- '{corr['termo']}' é '{corr['categoria']}'\n"
        
        return f"""
Classifique o seguinte produto em UMA das categorias abaixo.

CATEGORIAS DISPONÍVEIS:
{cats_str}

{examples_str}
REGRAS GERAIS:
- Produtos de limpeza (sabão, detergente) -> Limpeza
- Higiene pessoal (shampoo, sabonete) -> Higiene
- Comida e snacks -> Alimentação
- Bebidas (suco, refri, cerveja) -> Bebidas
- Roupas e calçados -> Vestuário
- Eletrônicos e cabos -> Eletrônicos
- Carnes frescas -> Açougue (mas congelados industrializados SADIA/PERDIGAO -> Alimentação)

PRODUTO: "{product}"

Responda APENAS com o nome exato da categoria.
"""
