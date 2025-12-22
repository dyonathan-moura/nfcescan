# -*- coding: utf-8 -*-
"""
Módulo Models - Estruturas de dados para representar NFC-e.

Define dataclasses com Type Hints para representar os dados
extraídos de Notas Fiscais Eletrônicas brasileiras.
"""

from dataclasses import dataclass, field, asdict
from datetime import datetime
from typing import Optional


@dataclass
class Item:
    """Representa um item/produto da nota fiscal."""
    nome: str
    qtd: float
    valor: float
    
    def to_dict(self) -> dict:
        """Converte para dicionário para serialização JSON."""
        return {
            "nome": self.nome,
            "qtd": self.qtd,
            "valor": round(self.valor, 2)
        }


@dataclass
class Meta:
    """Metadados do processamento da nota fiscal."""
    data_processamento: str
    url_origem: str
    
    def to_dict(self) -> dict:
        return {
            "data_processamento": self.data_processamento,
            "url_origem": self.url_origem
        }


@dataclass
class NFCe:
    """Representa uma Nota Fiscal de Consumidor Eletrônica completa."""
    meta: Meta
    estabelecimento: str
    total: float
    itens: list[Item] = field(default_factory=list)
    
    def to_dict(self) -> dict:
        """Converte a NFC-e completa para dicionário JSON."""
        return {
            "meta": self.meta.to_dict(),
            "estabelecimento": self.estabelecimento,
            "total": round(self.total, 2),
            "itens": [item.to_dict() for item in self.itens]
        }
    
    @classmethod
    def create_empty(cls, url: str) -> "NFCe":
        """Cria uma NFC-e vazia com metadados preenchidos."""
        return cls(
            meta=Meta(
                data_processamento=datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
                url_origem=url
            ),
            estabelecimento="Não identificado",
            total=0.0,
            itens=[]
        )


def create_nfce_from_dict(data: dict, url: str) -> NFCe:
    """
    Cria uma instância de NFCe a partir de um dicionário de dados scrapeados.
    
    Args:
        data: Dicionário com chaves 'estabelecimento', 'total', 'itens'.
        url: URL de origem da nota fiscal.
    
    Returns:
        Instância de NFCe preenchida.
    """
    meta = Meta(
        data_processamento=datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        url_origem=url
    )
    
    itens = []
    for item_data in data.get("itens", []):
        item = Item(
            nome=item_data.get("nome", "Produto desconhecido"),
            qtd=float(item_data.get("qtd", 1)),
            valor=float(item_data.get("valor", 0.0))
        )
        itens.append(item)
    
    return NFCe(
        meta=meta,
        estabelecimento=data.get("estabelecimento", "Não identificado"),
        total=float(data.get("total", 0.0)),
        itens=itens
    )
