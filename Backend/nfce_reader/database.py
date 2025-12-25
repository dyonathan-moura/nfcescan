# -*- coding: utf-8 -*-
"""
Módulo Database - Persistência de dados com SQLAlchemy.

Suporta SQLite (desenvolvimento) e PostgreSQL (produção).
Lê DATABASE_URL de variável de ambiente, com fallback para SQLite.
"""

import os
from datetime import datetime
from typing import Optional, List
from sqlalchemy import create_engine, Column, Integer, String, Float, DateTime, ForeignKey, Text
from sqlalchemy.orm import sessionmaker, declarative_base, relationship, Session

# Carregar variáveis de ambiente
from dotenv import load_dotenv
load_dotenv()

# ============================================================================
# CONFIGURAÇÃO DO BANCO (Híbrida: SQLite ou PostgreSQL)
# ============================================================================

# Tenta ler do ambiente, senão usa SQLite local
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./notas.db")

# Railway/Heroku às vezes usam 'postgres://' ao invés de 'postgresql://'
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

# SQLite precisa de connect_args especial, PostgreSQL não
if DATABASE_URL.startswith("sqlite"):
    engine = create_engine(
        DATABASE_URL,
        connect_args={"check_same_thread": False}  # Necessário para SQLite + FastAPI
    )
    print("🗄️  Usando SQLite (desenvolvimento local)")
else:
    engine = create_engine(DATABASE_URL)
    print("🐘 Usando PostgreSQL (produção)")

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


# ============================================================================
# MODELOS
# ============================================================================

class NotaFiscalDB(Base):
    """Modelo de Nota Fiscal no banco de dados."""
    __tablename__ = "notas_fiscais"
    
    id = Column(Integer, primary_key=True, index=True)
    estabelecimento = Column(String(255), nullable=False)
    endereco = Column(String(500), nullable=True)  # Endereço do estabelecimento
    total = Column(Float, nullable=False, default=0.0)
    data_emissao = Column(DateTime, nullable=True)
    data_leitura = Column(DateTime, default=datetime.utcnow)
    url_origem = Column(Text, unique=True, nullable=False, index=True)
    
    # Relacionamento com itens
    itens = relationship("ItemDB", back_populates="nota", cascade="all, delete-orphan")
    
    def to_dict(self, include_cached: bool = False) -> dict:
        """Converte para dicionário compatível com o formato JSON da API."""
        result = {
            "id": self.id,
            "meta": {
                "data_leitura": self.data_leitura.strftime("%Y-%m-%d %H:%M:%S") if self.data_leitura else None,
                "url_origem": self.url_origem
            },
            "estabelecimento": self.estabelecimento,
            "endereco": self.endereco,
            "total": round(self.total, 2),
            "data_emissao": self.data_emissao.strftime("%Y-%m-%d") if self.data_emissao else None,
            "itens": [item.to_dict() for item in self.itens]
        }
        if include_cached:
            result["cached"] = True
        return result


class CategoriaDB(Base):
    """Modelo de Categoria personalizada pelo usuário."""
    __tablename__ = "categorias"
    
    id = Column(Integer, primary_key=True, index=True)
    nome = Column(String(100), unique=True, nullable=False)
    icone = Column(String(10), nullable=False, default="📦")  # Emoji
    cor = Column(String(10), nullable=False, default="#666666")  # Hex color
    
    # Relacionamento com itens
    itens = relationship("ItemDB", back_populates="categoria_rel")
    
    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "nome": self.nome,
            "icone": self.icone,
            "cor": self.cor
        }


class ItemDB(Base):
    """Modelo de Item de nota fiscal no banco de dados."""
    __tablename__ = "itens"
    
    id = Column(Integer, primary_key=True, index=True)
    nota_id = Column(Integer, ForeignKey("notas_fiscais.id"), nullable=False)
    nome = Column(String(500), nullable=False)
    qtd = Column(Float, nullable=False, default=1.0)
    valor = Column(Float, nullable=False, default=0.0)
    categoria_id = Column(Integer, ForeignKey("categorias.id"), nullable=True)
    
    # Relacionamentos
    nota = relationship("NotaFiscalDB", back_populates="itens")
    categoria_rel = relationship("CategoriaDB", back_populates="itens")
    
    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "nome": self.nome,
            "qtd": self.qtd,
            "valor": round(self.valor, 2),
            "categoria": self.categoria_rel.to_dict() if self.categoria_rel else {"id": 0, "nome": "Outros", "icone": "📦", "cor": "#666666"}
        }


class CorrecaoClassificacaoDB(Base):
    """Modelo de correção de classificação pelo usuário (Aprendizado)."""
    __tablename__ = "correcoes_classificacao"
    
    id = Column(Integer, primary_key=True, index=True)
    item_id = Column(Integer, ForeignKey("itens.id"), nullable=True) # Link para o item da nota (Rastreabilidade)
    termo_original = Column(String(500), nullable=False)             # Ex: "BLUSA NIKE PRETA"
    categoria_anterior_id = Column(Integer, ForeignKey("categorias.id"), nullable=True)
    categoria_nova_id = Column(Integer, ForeignKey("categorias.id"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relações
    item = relationship("ItemDB")
    categoria_anterior = relationship("CategoriaDB", foreign_keys=[categoria_anterior_id])
    categoria_nova = relationship("CategoriaDB", foreign_keys=[categoria_nova_id])


# ============================================================================
# FUNÇÕES DE ACESSO AO BANCO
# ============================================================================

def create_tables():
    """Cria as tabelas no banco de dados."""
    Base.metadata.create_all(bind=engine)


def seed_default_categorias(db: Session):
    """
    Cria categorias padrão se a tabela estiver vazia.
    Executado na inicialização do servidor.
    """
    
    # Categorias padrão com emojis (sem 'Alimentação' - é genérico demais)
    defaults = [
        {"nome": "Bebidas", "icone": "🥤", "cor": "#4ECDC4"},
        {"nome": "Transporte", "icone": "🚗", "cor": "#45B7D1"},
        {"nome": "Casa", "icone": "🏠", "cor": "#96CEB4"},
        {"nome": "Limpeza", "icone": "🧹", "cor": "#88D8B0"},
        {"nome": "Higiene", "icone": "🧴", "cor": "#FFEAA7"},
        {"nome": "Açougue", "icone": "🥩", "cor": "#E17055"},
        {"nome": "Hortifruti", "icone": "🥬", "cor": "#00B894"},
        {"nome": "Laticínios", "icone": "🥛", "cor": "#FDCB6E"},
        {"nome": "Padaria", "icone": "🥖", "cor": "#E9967A"},
        {"nome": "Pet", "icone": "🐕", "cor": "#A29BFE"},
        {"nome": "Farmácia", "icone": "💊", "cor": "#74B9FF"},
        {"nome": "Vestuário", "icone": "👕", "cor": "#6C5CE7"},
        {"nome": "Eletrônicos", "icone": "🖥️", "cor": "#0984E3"},
        {"nome": "Lazer", "icone": "🎮", "cor": "#FD79A8"},
        {"nome": "Mercearia", "icone": "🛒", "cor": "#FFD700"},
        {"nome": "Congelados", "icone": "🧊", "cor": "#74B9FF"},
        {"nome": "Ferramentas", "icone": "🛠️", "cor": "#636E72"},
        {"nome": "Outros", "icone": "📦", "cor": "#B2BEC3"},
    ]
    
    count_new = 0
    for cat_data in defaults:
        # Verificar se existe pelo nome
        exists = db.query(CategoriaDB).filter(CategoriaDB.nome == cat_data["nome"]).first()
        if not exists:
            categoria = CategoriaDB(**cat_data)
            db.add(categoria)
            count_new += 1
    
    if count_new > 0:
        db.commit()
        print(f"✅ {count_new} novas categorias criadas.")
    print(f"✅ {len(defaults)} categorias padrão criadas.")


def get_db():
    """Dependency para obter sessão do banco."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def get_nota_by_url(db: Session, url: str) -> Optional[NotaFiscalDB]:
    """
    Busca uma nota fiscal pela URL de origem.
    
    Args:
        db: Sessão do banco.
        url: URL do QR Code da nota.
    
    Returns:
        NotaFiscalDB se encontrada, None caso contrário.
    """
    return db.query(NotaFiscalDB).filter(NotaFiscalDB.url_origem == url).first()


def create_nota(
    db: Session,
    url: str,
    estabelecimento: str,
    total: float,
    itens: List[dict],
    data_emissao: Optional[str] = None,
    endereco: Optional[str] = None
) -> NotaFiscalDB:
    """
    Cria uma nova nota fiscal no banco.
    
    Args:
        db: Sessão do banco.
        url: URL de origem (unique).
        estabelecimento: Nome do estabelecimento.
        total: Valor total da nota.
        itens: Lista de dicionários com nome, qtd, valor.
        data_emissao: Data de emissão no formato YYYY-MM-DD.
        endereco: Endereço do estabelecimento.
    
    Returns:
        NotaFiscalDB criada.
    """
    # Converter data_emissao para datetime
    dt_emissao = None
    if data_emissao:
        try:
            dt_emissao = datetime.strptime(data_emissao, "%Y-%m-%d")
        except ValueError:
            pass
    
    # Criar nota
    nota = NotaFiscalDB(
        url_origem=url,
        estabelecimento=estabelecimento,
        endereco=endereco,
        total=total,
        data_emissao=dt_emissao,
        data_leitura=datetime.utcnow()
    )
    db.add(nota)
    db.flush()  # Obter ID antes de criar itens
    
    # Criar itens com classificação automática
    from classification_service import classify_item_smart
    
    # Cache de categorias para evitar múltiplas queries
    categoria_cache = {}
    
    for item_data in itens:
        nome_item = item_data.get("nome", "")
        categoria_nome = classify_item_smart(db, nome_item)
        
        # Buscar categoria_id (com cache)
        if categoria_nome not in categoria_cache:
            cat = db.query(CategoriaDB).filter(CategoriaDB.nome == categoria_nome).first()
            categoria_cache[categoria_nome] = cat.id if cat else None
        
        item = ItemDB(
            nota_id=nota.id,
            nome=nome_item,
            qtd=float(item_data.get("qtd", 1)),
            valor=float(item_data.get("valor", 0)),
            categoria_id=categoria_cache.get(categoria_nome)
        )
        db.add(item)
    
    db.commit()
    db.refresh(nota)
    
    return nota


def get_all_notas(db: Session, limit: int = 100) -> List[NotaFiscalDB]:
    """
    Retorna todas as notas ordenadas por data (mais recente primeiro).
    
    Args:
        db: Sessão do banco.
        limit: Limite de registros.
    
    Returns:
        Lista de NotaFiscalDB.
    """
    return db.query(NotaFiscalDB)\
        .order_by(NotaFiscalDB.data_processamento.desc())\
        .limit(limit)\
        .all()


def delete_nota(db: Session, nota_id: int) -> bool:
    """
    Deleta uma nota fiscal pelo ID.
    
    Returns:
        True se deletada, False se não encontrada.
    """
    nota = db.query(NotaFiscalDB).filter(NotaFiscalDB.id == nota_id).first()
    if nota:
        db.delete(nota)
        db.commit()
        return True
    return False
