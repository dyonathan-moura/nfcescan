# -*- coding: utf-8 -*-
"""
Chat Service - Processamento de mensagens de chat com IA.

Usa o Groq (Llama 3) para:
1. Analisar a intenção do usuário
2. Gerar consultas SQL quando necessário
3. Formatar respostas em JSON estruturado para o frontend

Prioriza consultas read-only (SELECT apenas).
"""

import os
import json
from datetime import datetime, timedelta
from typing import Optional, Dict, List, Any
from groq import Groq
from sqlalchemy.orm import Session
from sqlalchemy import text

# Configuração
MODEL_NAME = "llama-3.3-70b-versatile"

# Tipos de resposta suportados
RESPONSE_TYPES = {
    "TEXT": "text_message",
    "FINANCIAL_SUMMARY": "financial_summary",
    "BUDGET_PROGRESS": "budget_progress",
    "ERROR": "error",
}


class ChatService:
    """Serviço de chat com IA para análise financeira."""
    
    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key or os.getenv("GROQ_API_KEY")
        if not self.api_key:
            print("⚠️ GROQ_API_KEY não encontrada. Chat IA desativado.")
            self.client = None
        else:
            self.client = Groq(api_key=self.api_key)
    
    def process_message(self, message: str, db: Session, history: List[Dict] = None) -> Dict[str, Any]:
        """
        Processa uma mensagem do usuário e retorna resposta estruturada.
        
        Args:
            message: Mensagem do usuário
            db: Sessão do banco de dados
            history: Histórico de mensagens (opcional)
            
        Returns:
            Dict com type, payload e text
        """
        if not self.client:
            return {
                "type": RESPONSE_TYPES["ERROR"],
                "payload": {
                    "message": "Serviço de IA não configurado",
                    "code": "NO_API_KEY"
                },
                "text": None
            }
        
        try:
            # 1. Analisar intenção e extrair parâmetros
            intent = self._analyze_intent(message)
            
            # 2. Se necessário, executar consulta SQL
            sql_result = None
            if intent.get("requires_sql"):
                sql_result = self._execute_safe_query(intent.get("sql_query"), db)
            
            # 3. Gerar resposta formatada
            response = self._generate_response(message, intent, sql_result)
            
            return response
            
        except Exception as e:
            print(f"❌ Erro no chat service: {e}")
            return {
                "type": RESPONSE_TYPES["ERROR"],
                "payload": {
                    "message": str(e),
                    "code": "PROCESSING_ERROR"
                },
                "text": "Desculpe, ocorreu um erro ao processar sua pergunta."
            }
    
    def _analyze_intent(self, message: str) -> Dict[str, Any]:
        """Analisa a intenção do usuário usando IA."""
        
        # Obter data atual para contexto
        today = datetime.now()
        current_month = today.strftime("%Y-%m")
        current_year = today.year
        
        prompt = f"""Analise a mensagem do usuário sobre finanças pessoais e retorne JSON:

MENSAGEM: "{message}"

CONTEXTO TEMPORAL:
- Data atual: {today.strftime("%Y-%m-%d")}
- Mês atual: {today.strftime("%B %Y")}

Identifique:
1. intent: tipo de pergunta (spending_query, budget_check, comparison, general)
2. period: período mencionado (today, week, month, year, custom)
3. category: categoria de gastos se mencionada (alimentação, transporte, etc)
4. requires_sql: true se precisar consultar dados do banco
5. sql_query: SE requires_sql=true, gere SELECT para o schema PostgreSQL:

SCHEMA DO BANCO (PostgreSQL):
- notas_fiscais (id, estabelecimento, endereco, total, data_emissao, data_leitura, url_origem, tipo)
- itens (id, nota_id, nome, qtd, valor, categoria_id)
- categorias (id, nome, icone, cor)

REGRAS IMPORTANTES PARA SQL:
- Use notas_fiscais, NÃO "notas"
- Use itens.nome para nome do produto, NÃO "produto"
- Para datas use sintaxe PostgreSQL:
  * Mês atual: data_emissao >= DATE_TRUNC('month', CURRENT_DATE)
  * Hoje: data_emissao::date = CURRENT_DATE
  * Este ano: EXTRACT(YEAR FROM data_emissao) = {current_year}
- JOINs: itens.nota_id = notas_fiscais.id
- JOINs: itens.categoria_id = categorias.id
- Sempre SELECT read-only

EXEMPLOS DE SQL CORRETO:
1. Gastos do mês:
   SELECT SUM(nf.total) as total FROM notas_fiscais nf WHERE data_emissao >= DATE_TRUNC('month', CURRENT_DATE)
   
2. Gastos por categoria:
   SELECT c.nome as categoria, SUM(i.valor * i.qtd) as total FROM itens i 
   JOIN categorias c ON i.categoria_id = c.id 
   JOIN notas_fiscais nf ON i.nota_id = nf.id 
   WHERE nf.data_emissao >= DATE_TRUNC('month', CURRENT_DATE) GROUP BY c.nome ORDER BY total DESC

3. Top estabelecimentos:
   SELECT estabelecimento, SUM(total) as total FROM notas_fiscais 
   WHERE data_emissao >= DATE_TRUNC('month', CURRENT_DATE) GROUP BY estabelecimento ORDER BY total DESC LIMIT 5

Responda APENAS JSON válido:
{{"intent": "...", "period": "...", "category": "...", "requires_sql": true/false, "sql_query": "..."}}"""

        try:
            response = self.client.chat.completions.create(
                model=MODEL_NAME,
                messages=[
                    {"role": "system", "content": "Você é um analisador de intenções. Responda APENAS JSON."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0,
                max_tokens=500,
            )
            
            result_text = response.choices[0].message.content.strip()
            
            # Limpar markdown
            if "```" in result_text:
                result_text = result_text.split("```")[1]
                if result_text.startswith("json"):
                    result_text = result_text[4:]
                result_text = result_text.strip()
            
            return json.loads(result_text)
            
        except Exception as e:
            print(f"⚠️ Erro ao analisar intenção: {e}")
            return {"intent": "general", "requires_sql": False}
    
    def _execute_safe_query(self, sql_query: str, db: Session) -> Optional[List[Dict]]:
        """Executa consulta SQL de forma segura (read-only)."""
        
        if not sql_query:
            return None
        
        # Validar que é SELECT apenas
        sql_upper = sql_query.upper().strip()
        if not sql_upper.startswith("SELECT"):
            print(f"⚠️ Query não-SELECT bloqueada: {sql_query[:50]}")
            return None
        
        # Bloquear palavras perigosas
        dangerous = ["INSERT", "UPDATE", "DELETE", "DROP", "ALTER", "CREATE", "TRUNCATE"]
        for word in dangerous:
            if word in sql_upper:
                print(f"⚠️ Query com {word} bloqueada")
                return None
        
        try:
            result = db.execute(text(sql_query))
            rows = result.fetchall()
            columns = result.keys()
            
            return [dict(zip(columns, row)) for row in rows]
            
        except Exception as e:
            print(f"❌ Erro SQL: {e}")
            return None
    
    def _generate_response(self, message: str, intent: Dict, sql_result: Optional[List]) -> Dict[str, Any]:
        """Gera resposta estruturada baseada na análise."""
        
        intent_type = intent.get("intent", "general")
        
        # Se temos resultado SQL, formatar como widget
        if sql_result and len(sql_result) > 0:
            return self._format_sql_result(message, intent_type, sql_result)
        
        # Resposta textual genérica usando IA
        return self._generate_text_response(message)
    
    def _format_sql_result(self, message: str, intent_type: str, data: List[Dict]) -> Dict[str, Any]:
        """Formata resultado SQL como widget."""
        
        # Calcular total se houver campo de valor
        total = 0
        for row in data:
            if "total" in row:
                total += float(row.get("total") or 0)
            elif "valor" in row:
                total += float(row.get("valor") or 0)
        
        # Determinar categoria principal
        category = "Total de Gastos"
        if data and "categoria" in data[0]:
            category = data[0].get("categoria", category)
        elif data and "estabelecimento" in data[0]:
            category = data[0].get("estabelecimento", category)
        
        # Formatar fontes
        sources = []
        for row in data[:5]:  # Top 5 fontes
            source = {
                "id": row.get("id", 0),
                "name": row.get("estabelecimento") or row.get("produto") or "Sem nome",
                "date": row.get("data_emissao", ""),
                "value": float(row.get("total") or row.get("valor") or 0),
            }
            sources.append(source)
        
        return {
            "type": RESPONSE_TYPES["FINANCIAL_SUMMARY"],
            "payload": {
                "amount": total,
                "category": category,
                "comparison_percentage": 0,  # TODO: calcular comparação
                "comparison_label": "vs período anterior",
                "trend": "stable",
                "insight": f"Encontrei {len(data)} registros para sua consulta.",
                "sources": sources,
            },
            "text": f"Aqui está o resumo dos seus gastos:",
        }
    
    def _generate_text_response(self, message: str) -> Dict[str, Any]:
        """Gera resposta textual usando IA."""
        
        prompt = f"""O usuário perguntou sobre finanças: "{message}"

Responda de forma útil e amigável, em português brasileiro.
Seja conciso (máximo 2-3 frases).
Se não puder responder com dados, sugira como o usuário pode obter a informação."""

        try:
            response = self.client.chat.completions.create(
                model=MODEL_NAME,
                messages=[
                    {"role": "system", "content": "Você é um assistente financeiro amigável."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.7,
                max_tokens=200,
            )
            
            text = response.choices[0].message.content.strip()
            
            return {
                "type": RESPONSE_TYPES["TEXT"],
                "payload": None,
                "text": text,
            }
            
        except Exception as e:
            return {
                "type": RESPONSE_TYPES["TEXT"],
                "payload": None,
                "text": "Entendi sua pergunta. Para uma análise mais precisa, tente perguntar sobre gastos específicos ou categorias.",
            }


# Instância global (singleton)
chat_service = None

def get_chat_service() -> ChatService:
    """Retorna instância singleton do ChatService."""
    global chat_service
    if chat_service is None:
        chat_service = ChatService()
    return chat_service
