# -*- coding: utf-8 -*-
"""
LangChain Service - Chat com IA usando LangChain.

Implementa:
- SQL Agent para consultas ao banco de dados
- Custom Callback Handler para logging detalhado
- Formatação de resposta para widgets no frontend

Usa Groq (Llama 3) como LLM via langchain-groq.
"""

import os
import json
import logging
from datetime import datetime
from typing import Optional, Dict, List, Any, Union
from sqlalchemy.orm import Session
from sqlalchemy import text

# LangChain imports
from langchain_groq import ChatGroq
from langchain_community.utilities import SQLDatabase
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain_core.output_parsers import StrOutputParser
from langchain_core.callbacks import BaseCallbackHandler
from langchain_core.messages import HumanMessage, AIMessage, SystemMessage

# Configurar logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("FinAI")

# Configuração
MODEL_NAME = "llama-3.3-70b-versatile"
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./notas.db")

# Corrigir URL do PostgreSQL se necessário
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

# Tipos de resposta
RESPONSE_TYPES = {
    "TEXT": "text_message",
    "FINANCIAL_SUMMARY": "financial_summary",
    "BUDGET_PROGRESS": "budget_progress",
    "ERROR": "error",
}


# =============================================================================
# CUSTOM CALLBACK HANDLER - Logging de cada etapa
# =============================================================================

class ChatLogCallback(BaseCallbackHandler):
    """
    Callback handler customizado para logar cada etapa da execução.
    Permite debugging e observabilidade do fluxo de chat.
    """
    
    def __init__(self, request_id: str = None):
        self.request_id = request_id or datetime.now().strftime("%H%M%S")
        self.logs = []
        
    def _log(self, level: str, emoji: str, message: str):
        """Helper para logging estruturado."""
        log_entry = {
            "timestamp": datetime.now().isoformat(),
            "request_id": self.request_id,
            "level": level,
            "message": message
        }
        self.logs.append(log_entry)
        logger.info(f"[CHAT:{self.request_id}] {emoji} {message}")
    
    def on_llm_start(self, serialized: Dict, prompts: List[str], **kwargs):
        """Chamado quando o LLM começa a processar."""
        prompt_preview = prompts[0][:100] if prompts else "N/A"
        self._log("INFO", "🧠", f"LLM Start | Prompt: {prompt_preview}...")
    
    def on_llm_end(self, response, **kwargs):
        """Chamado quando o LLM termina."""
        try:
            text = response.generations[0][0].text[:100]
            self._log("INFO", "✅", f"LLM End | Response: {text}...")
        except:
            self._log("INFO", "✅", "LLM End")
    
    def on_llm_error(self, error: Exception, **kwargs):
        """Chamado em caso de erro no LLM."""
        self._log("ERROR", "❌", f"LLM Error: {str(error)}")
    
    def on_chain_start(self, serialized: Dict, inputs: Dict, **kwargs):
        """Chamado quando uma chain começa."""
        chain_name = serialized.get("name", "Unknown")
        self._log("INFO", "⛓️", f"Chain Start: {chain_name}")
    
    def on_chain_end(self, outputs: Dict, **kwargs):
        """Chamado quando uma chain termina."""
        output_preview = str(outputs)[:100]
        self._log("INFO", "🏁", f"Chain End: {output_preview}...")
    
    def on_tool_start(self, serialized: Dict, input_str: str, **kwargs):
        """Chamado quando uma tool (SQL) começa."""
        self._log("INFO", "🔧", f"SQL Query: {input_str[:200]}")
    
    def on_tool_end(self, output: str, **kwargs):
        """Chamado quando uma tool termina."""
        self._log("INFO", "📊", f"SQL Result: {output[:200] if output else 'Empty'}...")
    
    def get_logs(self) -> List[Dict]:
        """Retorna todos os logs coletados."""
        return self.logs


# =============================================================================
# LANGCHAIN SERVICE
# =============================================================================

class LangChainService:
    """Serviço de chat usando LangChain com SQL Agent."""
    
    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key or os.getenv("GROQ_API_KEY")
        
        if not self.api_key:
            logger.warning("⚠️ GROQ_API_KEY não encontrada. Chat IA desativado.")
            self.llm = None
        else:
            # Inicializar LLM
            self.llm = ChatGroq(
                model=MODEL_NAME,
                temperature=0,
                groq_api_key=self.api_key,
            )
            logger.info(f"✅ LangChain inicializado com modelo: {MODEL_NAME}")
        
        # Inicializar SQLDatabase
        try:
            self.db = SQLDatabase.from_uri(
                DATABASE_URL,
                include_tables=["notas_fiscais", "itens", "categorias"],
                sample_rows_in_table_info=3
            )
            logger.info(f"✅ SQLDatabase conectado: {len(self.db.get_usable_table_names())} tabelas")
        except Exception as e:
            logger.error(f"❌ Erro ao conectar SQLDatabase: {e}")
            self.db = None
    
    def process_message(
        self, 
        message: str, 
        db_session: Session, 
        history: List[Dict] = None
    ) -> Dict[str, Any]:
        """
        Processa mensagem do usuário e retorna resposta estruturada.
        
        Args:
            message: Pergunta do usuário
            db_session: Sessão SQLAlchemy (para queries manuais se necessário)
            history: Histórico de conversa
            
        Returns:
            Dict com type, payload e text
        """
        # Criar callback para logging
        callback = ChatLogCallback()
        
        callback._log("INFO", "📥", f"Pergunta: {message}")
        
        if not self.llm:
            return self._error_response("Serviço de IA não configurado", "NO_API_KEY")
        
        if not self.db:
            return self._error_response("Banco de dados não conectado", "NO_DATABASE")
        
        try:
            # 1. Analisar intenção e decidir se precisa de SQL
            intent = self._analyze_intent(message, callback)
            callback._log("INFO", "🔍", f"Intent: {intent.get('intent')} | SQL: {intent.get('requires_sql')}")
            
            # 2. Se precisa de SQL, executar query
            sql_result = None
            if intent.get("requires_sql") and intent.get("sql_query"):
                sql_result = self._execute_sql(intent.get("sql_query"), db_session, callback)
            
            # 3. Gerar resposta formatada
            if sql_result and len(sql_result) > 0:
                response = self._format_financial_response(message, sql_result, callback)
            else:
                response = self._generate_text_response(message, callback)
            
            callback._log("INFO", "📤", f"Tipo: {response.get('type')}")
            
            # Adicionar logs à resposta (para debug)
            response["_logs"] = callback.get_logs()
            
            return response
            
        except Exception as e:
            callback._log("ERROR", "💥", f"Erro: {str(e)}")
            return self._error_response(str(e), "PROCESSING_ERROR")
    
    def _analyze_intent(self, message: str, callback: ChatLogCallback) -> Dict[str, Any]:
        """Analisa intenção usando LLM."""
        
        today = datetime.now()
        
        prompt = ChatPromptTemplate.from_messages([
            ("system", """Você é um analisador de intenções financeiras. 
Analise a mensagem e retorne APENAS um JSON válido.

SCHEMA DO BANCO (PostgreSQL):
- notas_fiscais (id, estabelecimento, total, data_emissao)
- itens (id, nota_id, nome, qtd, valor, categoria_id)
- categorias (id, nome, icone)

REGRAS SQL:
- Use notas_fiscais (não "notas")
- Para datas use: DATE_TRUNC('month', CURRENT_DATE)
- JOINs: itens.nota_id = notas_fiscais.id

Retorne JSON: {{"intent": "spending_query|budget_check|comparison|general", "requires_sql": true|false, "sql_query": "SELECT..."}}"""),
            ("human", f"Data atual: {today.strftime('%Y-%m-%d')}\n\nMensagem: {message}")
        ])
        
        try:
            chain = prompt | self.llm | StrOutputParser()
            result = chain.invoke({}, config={"callbacks": [callback]})
            
            # Limpar JSON
            result = result.strip()
            if "```" in result:
                result = result.split("```")[1]
                if result.startswith("json"):
                    result = result[4:]
                result = result.strip()
            
            return json.loads(result)
            
        except Exception as e:
            callback._log("WARNING", "⚠️", f"Erro ao analisar intenção: {e}")
            return {"intent": "general", "requires_sql": False}
    
    def _execute_sql(
        self, 
        sql_query: str, 
        db_session: Session, 
        callback: ChatLogCallback
    ) -> Optional[List[Dict]]:
        """Executa SQL de forma segura (read-only)."""
        
        if not sql_query:
            return None
        
        # Validar que é SELECT apenas
        sql_upper = sql_query.upper().strip()
        if not sql_upper.startswith("SELECT"):
            callback._log("WARNING", "🚫", f"Query não-SELECT bloqueada")
            return None
        
        # Bloquear palavras perigosas
        dangerous = ["INSERT", "UPDATE", "DELETE", "DROP", "ALTER", "CREATE", "TRUNCATE"]
        for word in dangerous:
            if word in sql_upper:
                callback._log("WARNING", "🚫", f"Query com {word} bloqueada")
                return None
        
        callback._log("INFO", "🔧", f"SQL: {sql_query[:150]}")
        
        try:
            result = db_session.execute(text(sql_query))
            rows = result.fetchall()
            columns = result.keys()
            data = [dict(zip(columns, row)) for row in rows]
            
            callback._log("INFO", "📊", f"Resultado: {len(data)} linhas")
            return data
            
        except Exception as e:
            callback._log("ERROR", "❌", f"Erro SQL: {e}")
            return None
    
    def _format_financial_response(
        self, 
        message: str, 
        data: List[Dict], 
        callback: ChatLogCallback
    ) -> Dict[str, Any]:
        """Formata resultado SQL como widget financeiro."""
        
        # Calcular total
        total = 0
        for row in data:
            if "total" in row and row["total"]:
                total += float(row["total"])
            elif "valor" in row and row["valor"]:
                total += float(row["valor"])
            elif "sum" in row and row["sum"]:
                total += float(row["sum"])
        
        # Determinar categoria
        category = "Total de Gastos"
        if data and len(data) > 0:
            first_row = data[0]
            if "categoria" in first_row:
                category = first_row.get("categoria", category)
            elif "estabelecimento" in first_row:
                category = first_row.get("estabelecimento", category)
            elif "nome" in first_row:
                category = first_row.get("nome", category)
        
        # Formatar fontes
        sources = []
        for row in data[:5]:
            source = {
                "id": row.get("id", 0),
                "name": row.get("estabelecimento") or row.get("nome") or "Sem nome",
                "date": str(row.get("data_emissao", ""))[:10],
                "value": float(row.get("total") or row.get("valor") or 0),
            }
            sources.append(source)
        
        return {
            "type": RESPONSE_TYPES["FINANCIAL_SUMMARY"],
            "payload": {
                "amount": round(total, 2),
                "category": category,
                "comparison_percentage": 0,
                "comparison_label": "período atual",
                "trend": "stable",
                "insight": f"Encontrei {len(data)} registro(s) para sua consulta.",
                "sources": sources,
            },
            "text": "Aqui está o resumo dos seus gastos:",
        }
    
    def _generate_text_response(
        self, 
        message: str, 
        callback: ChatLogCallback
    ) -> Dict[str, Any]:
        """Gera resposta textual quando não há dados SQL."""
        
        prompt = ChatPromptTemplate.from_messages([
            ("system", """Você é o FinAI, um assistente financeiro amigável.
Responda de forma útil e concisa (máximo 2-3 frases).
Se não puder responder com dados exatos, sugira como o usuário pode obter a informação.
Responda em português brasileiro."""),
            ("human", message)
        ])
        
        try:
            chain = prompt | self.llm | StrOutputParser()
            response_text = chain.invoke({}, config={"callbacks": [callback]})
            
            return {
                "type": RESPONSE_TYPES["TEXT"],
                "payload": None,
                "text": response_text.strip(),
            }
            
        except Exception as e:
            callback._log("ERROR", "❌", f"Erro ao gerar resposta: {e}")
            return {
                "type": RESPONSE_TYPES["TEXT"],
                "payload": None,
                "text": "Entendi sua pergunta. Para uma análise mais precisa, tente perguntar sobre gastos específicos.",
            }
    
    def _error_response(self, message: str, code: str) -> Dict[str, Any]:
        """Retorna resposta de erro padronizada."""
        return {
            "type": RESPONSE_TYPES["ERROR"],
            "payload": {
                "message": message,
                "code": code,
            },
            "text": "Ocorreu um erro ao processar sua solicitação.",
        }


# =============================================================================
# SINGLETON
# =============================================================================

_langchain_service = None

def get_langchain_service() -> LangChainService:
    """Retorna instância singleton do LangChainService."""
    global _langchain_service
    if _langchain_service is None:
        _langchain_service = LangChainService()
    return _langchain_service
