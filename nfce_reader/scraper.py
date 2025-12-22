# -*- coding: utf-8 -*-
"""
Módulo Scraper - Responsável por acessar URLs de NFC-e e extrair dados.

Este módulo utiliza requests para buscar HTML e BeautifulSoup para
fazer o parse e extrair informações de Notas Fiscais Eletrônicas.

Os seletores CSS são configuráveis para suportar diferentes estados
(SEFAZ de cada estado tem layouts diferentes).
"""

import re
from typing import Optional
from dataclasses import dataclass

import requests
from bs4 import BeautifulSoup, Tag


# ============================================================================
# SELETORES CSS POR ESTADO
# ============================================================================
# Adicione ou modifique os seletores conforme o padrão do seu estado.
# Cada estado da SEFAZ tem um layout HTML diferente.

@dataclass
class EstadoSelectors:
    """Seletores CSS específicos de um estado."""
    nome: str
    # Seletor para o nome do estabelecimento
    estabelecimento: str
    # Seletor para o valor total
    total: str
    # Seletor para a tabela/lista de itens
    itens_container: str
    # Seletores dentro de cada item
    item_nome: str
    item_qtd: str
    item_valor: str


# Seletores conhecidos por estado
SELETORES_ESTADO: dict[str, EstadoSelectors] = {
    # Rio Grande do Sul
    "RS": EstadoSelectors(
        nome="RS",
        estabelecimento=".txtTopo",
        total=".txtMax",
        itens_container="#tabResult tr",
        item_nome=".txtTit",
        item_qtd=".Rqtd",
        item_valor=".valor"
    ),
    # São Paulo
    "SP": EstadoSelectors(
        nome="SP",
        estabelecimento="#u20",
        total=".totalNumb",
        itens_container="#tabResult tbody tr",
        item_nome=".txtTit",
        item_qtd=".RqtdBox",
        item_valor=".RvlUnit"
    ),
    # Rio de Janeiro
    "RJ": EstadoSelectors(
        nome="RJ",
        estabelecimento=".txtTopo",
        total=".linhaShade .txtMax",
        itens_container="table.toggable tr",
        item_nome=".txtTit",
        item_qtd=".Rqtd",
        item_valor=".valor"
    ),
    # Genérico (fallback)
    "GENERICO": EstadoSelectors(
        nome="GENERICO",
        estabelecimento="",
        total="",
        itens_container="table tr, ul li",
        item_nome="",
        item_qtd="",
        item_valor=""
    )
}


# ============================================================================
# HEADERS HTTP
# ============================================================================

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/120.0.0.0 Safari/537.36"
    ),
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7",
    "Accept-Encoding": "gzip, deflate, br",
    "Connection": "keep-alive",
}


# ============================================================================
# FUNÇÕES PRINCIPAIS
# ============================================================================

def fetch_page(url: str, timeout: int = 30) -> Optional[str]:
    """
    Busca o conteúdo HTML de uma URL.
    
    Args:
        url: URL da página a ser buscada.
        timeout: Timeout em segundos para a requisição.
    
    Returns:
        Conteúdo HTML da página, ou None se falhar.
    """
    try:
        response = requests.get(url, headers=HEADERS, timeout=timeout)
        response.raise_for_status()
        response.encoding = response.apparent_encoding or "utf-8"
        return response.text
    except requests.Timeout:
        print(f"[ERRO] Timeout ao acessar: {url}")
        return None
    except requests.ConnectionError:
        print(f"[ERRO] Falha de conexão ao acessar: {url}")
        return None
    except requests.HTTPError as e:
        print(f"[ERRO] Erro HTTP {e.response.status_code}: {url}")
        return None
    except requests.RequestException as e:
        print(f"[ERRO] Erro ao acessar URL: {e}")
        return None


def parse_nfce(html: str, estado: str = "GENERICO") -> dict:
    """
    Faz o parse do HTML de uma NFC-e e extrai os dados.
    
    Args:
        html: Conteúdo HTML da página.
        estado: Sigla do estado (RS, SP, RJ) ou GENERICO.
    
    Returns:
        Dicionário com 'estabelecimento', 'total', 'itens' e 'data_emissao'.
    """
    soup = BeautifulSoup(html, "html.parser")
    
    # Tentar usar seletores específicos do estado
    selectors = SELETORES_ESTADO.get(estado.upper(), SELETORES_ESTADO["GENERICO"])
    
    result = {
        "estabelecimento": _extract_estabelecimento(soup, selectors),
        "endereco": _extract_endereco(soup),
        "total": _extract_total(soup, selectors),
        "itens": _extract_itens(soup, selectors),
        "data_emissao": _extract_data_emissao(soup)
    }
    
    # Se não encontrou itens com seletores específicos, tenta fallback genérico
    if not result["itens"] and estado.upper() != "GENERICO":
        result["itens"] = _extract_itens_generico(soup)
    
    return result


def scrape_nfce(url: str, estado: str = "GENERICO") -> Optional[dict]:
    """
    Pipeline completo: busca HTML e extrai dados da NFC-e.
    
    Args:
        url: URL da nota fiscal eletrônica.
        estado: Sigla do estado para usar seletores específicos.
    
    Returns:
        Dicionário com dados extraídos, ou None se falhar.
    """
    html = fetch_page(url)
    if html is None:
        return None
    
    return parse_nfce(html, estado)


# ============================================================================
# FUNÇÕES AUXILIARES DE EXTRAÇÃO
# ============================================================================

def _extract_estabelecimento(soup: BeautifulSoup, selectors: EstadoSelectors) -> str:
    """Extrai o nome do estabelecimento."""
    if selectors.estabelecimento:
        elem = soup.select_one(selectors.estabelecimento)
        if elem:
            return _clean_text(elem.get_text())
    
    # Fallback: procurar padrões comuns
    for pattern in [".txtTopo", "#u20", ".emit", ".razao", "[class*='emitente']"]:
        elem = soup.select_one(pattern)
        if elem:
            text = _clean_text(elem.get_text())
            if len(text) > 3:
                return text
    
    return "Não identificado"


def _extract_endereco(soup: BeautifulSoup) -> Optional[str]:
    """
    Extrai o endereço do estabelecimento.
    
    Procura por padrões típicos de endereço brasileiro:
    - Palavras como Rua, Av, Avenida, Travessa
    - Padrões de CEP (00000-000)
    """
    # Padrões para identificar endereço
    endereco_patterns = [
        r'(?:Rua|R\.|Av\.|Avenida|Travessa|Tv\.|Alameda|Al\.|Praça|Pç\.)\s+[^,\n]+',
        r'\d{5}-?\d{3}',  # CEP
    ]
    
    # Seletores comuns para endereço
    selectors_endereco = [
        "[class*='endereco']",
        "[class*='address']",
        ".txtTit + div",
        ".inf-adic",
        "li",
        "div"
    ]
    
    for selector in selectors_endereco:
        for elem in soup.select(selector):
            text = elem.get_text()
            # Verificar se parece endereço
            if re.search(r'(Rua|R\.|Av\.|Avenida|Travessa)', text, re.IGNORECASE):
                # Limpar e extrair só o endereço relevante
                endereco = _clean_text(text)
                if len(endereco) > 10 and len(endereco) < 200:
                    return endereco
    
    # Fallback: buscar no texto todo
    full_text = soup.get_text()
    match = re.search(r'((?:Rua|R\.|Av\.|Avenida)\s+[^\n]{10,80})', full_text, re.IGNORECASE)
    if match:
        return _clean_text(match.group(1))
    
    return None


def _extract_total(soup: BeautifulSoup, selectors: EstadoSelectors) -> float:
    """Extrai o valor total da nota."""
    if selectors.total:
        elem = soup.select_one(selectors.total)
        if elem:
            return _parse_money(elem.get_text())
    
    # Fallback: procurar padrões comuns
    for pattern in [".txtMax", ".totalNumb", ".total", "[class*='total']", "#totalNota"]:
        elem = soup.select_one(pattern)
        if elem:
            value = _parse_money(elem.get_text())
            if value > 0:
                return value
    
    return 0.0


def _extract_data_emissao(soup: BeautifulSoup) -> Optional[str]:
    """
    Extrai a data de emissão da nota fiscal.
    
    Procura por padrões de data no formato dd/mm/aaaa no HTML.
    
    Returns:
        Data no formato ISO (YYYY-MM-DD) ou None se não encontrar.
    """
    from datetime import datetime
    
    # Padrões de data brasileira: dd/mm/aaaa ou dd/mm/aa
    date_pattern = r'(\d{2})[/.-](\d{2})[/.-](\d{2,4})'
    
    # Procurar em elementos comuns que contêm data
    selectors_data = [
        "[class*='data']",
        "[class*='emissao']",
        ".infNFe",
        "#infNFe",
        "li",
        "td",
        "span"
    ]
    
    for selector in selectors_data:
        for elem in soup.select(selector):
            text = elem.get_text()
            match = re.search(date_pattern, text)
            if match:
                dia, mes, ano = match.groups()
                
                # Converter ano de 2 dígitos para 4
                if len(ano) == 2:
                    ano = "20" + ano if int(ano) < 50 else "19" + ano
                
                try:
                    dt = datetime(int(ano), int(mes), int(dia))
                    return dt.strftime("%Y-%m-%d")
                except ValueError:
                    continue
    
    # Fallback: procurar no texto inteiro da página
    full_text = soup.get_text()
    match = re.search(date_pattern, full_text)
    if match:
        dia, mes, ano = match.groups()
        if len(ano) == 2:
            ano = "20" + ano if int(ano) < 50 else "19" + ano
        try:
            dt = datetime(int(ano), int(mes), int(dia))
            return dt.strftime("%Y-%m-%d")
        except ValueError:
            pass
    
    return None


def _extract_itens(soup: BeautifulSoup, selectors: EstadoSelectors) -> list[dict]:
    """Extrai a lista de itens usando seletores específicos do estado."""
    itens = []
    
    if not selectors.itens_container:
        return itens
    
    rows = soup.select(selectors.itens_container)
    
    for row in rows:
        item = _extract_item_from_row(row, selectors)
        if item and _is_valid_product(item["nome"]):
            itens.append(item)
    
    return itens


def _extract_item_from_row(row: Tag, selectors: EstadoSelectors) -> Optional[dict]:
    """Extrai dados de um único item de uma linha da tabela."""
    nome = ""
    qtd = 1.0
    valor = 0.0
    
    # Extrair nome
    if selectors.item_nome:
        elem = row.select_one(selectors.item_nome)
        if elem:
            nome = _clean_text(elem.get_text())
    
    if not nome:
        # Tentar pegar do primeiro td ou span
        elem = row.select_one("td, span")
        if elem:
            nome = _clean_text(elem.get_text())
    
    if not nome or len(nome) < 2:
        return None
    
    # Extrair quantidade
    if selectors.item_qtd:
        elem = row.select_one(selectors.item_qtd)
        if elem:
            qtd = _parse_number(elem.get_text())
    
    # Extrair valor
    if selectors.item_valor:
        elem = row.select_one(selectors.item_valor)
        if elem:
            valor = _parse_money(elem.get_text())
    
    if valor == 0:
        # Tentar encontrar valor no texto da linha
        valor = _find_money_in_text(row.get_text())
    
    return {
        "nome": nome,
        "qtd": qtd if qtd > 0 else 1.0,
        "valor": valor
    }


def _extract_itens_generico(soup: BeautifulSoup) -> list[dict]:
    """
    Extração genérica de itens quando não há seletores específicos.
    Tenta identificar padrões comuns em tabelas HTML.
    """
    itens = []
    
    # Tentar encontrar tabelas de produtos
    tables = soup.select("table")
    
    for table in tables:
        rows = table.select("tr")
        for row in rows:
            cells = row.select("td")
            if len(cells) >= 2:
                # Heurística: primeira célula = nome, última = valor
                nome = _clean_text(cells[0].get_text())
                
                # Ignorar linhas de cabeçalho ou muito curtas
                if len(nome) < 3 or nome.upper() in ["ITEM", "PRODUTO", "DESCRIÇÃO"]:
                    continue
                
                # Procurar valor monetário nas células
                valor = 0.0
                qtd = 1.0
                
                for cell in cells[1:]:
                    text = cell.get_text()
                    money = _parse_money(text)
                    if money > 0:
                        valor = money
                    else:
                        num = _parse_number(text)
                        if 0 < num < 1000:  # Provavelmente quantidade
                            qtd = num
                
                if nome and valor > 0 and _is_valid_product(nome):
                    itens.append({
                        "nome": nome,
                        "qtd": qtd,
                        "valor": valor
                    })
    
    return itens


# ============================================================================
# UTILITÁRIOS DE PARSING
# ============================================================================

def _clean_text(text: str) -> str:
    """
    Limpa o texto removendo espaços extras e metadados técnicos da nota.
    
    Transforma: "PRODUTO X (Código: 123) Qtd..." -> "PRODUTO X"
    """
    if not text:
        return ""
    
    # 1. Normaliza espaços (transforma quebras de linha e tabs em um espaço só)
    text = re.sub(r'\s+', ' ', text).strip()
    
    # 2. Corta o texto onde começa a parte técnica "(Código:" ou "(Cód."
    # O regex procura por parenteses seguido de Codigo ou Cod
    split_pattern = r'\s*\(C[óo]d'
    text = re.split(split_pattern, text, flags=re.IGNORECASE)[0]
    
    return text.strip()


def _is_valid_product(nome: str) -> bool:
    """
    Valida se o nome representa um produto real.
    
    Retorna False se:
    - O nome for composto apenas por dígitos e espaços (chave de acesso da nota)
    - O nome tiver mais de 10 caracteres numéricos consecutivos
    - O nome estiver vazio ou muito curto
    
    Args:
        nome: Nome do produto a ser validado.
    
    Returns:
        True se for um produto válido, False caso contrário.
    """
    if not nome or len(nome) < 3:
        return False
    
    # Remover espaços para verificar se é apenas números
    nome_sem_espacos = nome.replace(' ', '')
    
    # Se for apenas dígitos e tiver mais de 10 caracteres, é chave de acesso
    if nome_sem_espacos.isdigit() and len(nome_sem_espacos) > 10:
        return False
    
    # Verificar se há sequência de mais de 15 dígitos (padrão de chave NFC-e)
    if re.search(r'\d{15,}', nome_sem_espacos):
        return False
    
    return True


def _parse_money(text: str) -> float:
    """
    Converte texto com valor monetário para float.
    Suporta formatos: R$ 1.234,56 / 1234.56 / 1234,56
    """
    if not text:
        return 0.0
    
    # Remover símbolos de moeda e espaços
    text = re.sub(r'[R$\s]', '', text)
    
    # Detectar formato brasileiro (1.234,56) vs americano (1,234.56)
    if ',' in text and '.' in text:
        # Formato brasileiro: 1.234,56
        if text.rfind(',') > text.rfind('.'):
            text = text.replace('.', '').replace(',', '.')
        else:
            # Formato americano: 1,234.56
            text = text.replace(',', '')
    elif ',' in text:
        # Apenas vírgula: 1234,56 (brasileiro)
        text = text.replace(',', '.')
    
    try:
        return float(text)
    except ValueError:
        return 0.0


def _parse_number(text: str) -> float:
    """Extrai um número de um texto."""
    if not text:
        return 0.0
    
    # Procurar padrão numérico
    match = re.search(r'[\d.,]+', text)
    if match:
        return _parse_money(match.group())
    
    return 0.0


def _find_money_in_text(text: str) -> float:
    """Procura valor monetário em um texto livre."""
    # Padrão: R$ X.XXX,XX ou X.XXX,XX ou X,XX
    patterns = [
        r'R\$\s*([\d.,]+)',
        r'([\d]+[.,][\d]{2})\s*$',
        r'([\d]+[.,][\d]{3}[.,][\d]{2})',
    ]
    
    for pattern in patterns:
        match = re.search(pattern, text)
        if match:
            value = _parse_money(match.group(1) if match.groups() else match.group())
            if value > 0:
                return value
    
    return 0.0
