# -*- coding: utf-8 -*-
"""
Módulo Server - API REST para o NFC-e Reader.

Expõe os módulos decoder e scraper como endpoints HTTP
para integração com aplicativos mobile e web.

Inclui persistência com SQLite e prevenção de duplicatas.

Execute com:
    uvicorn nfce_reader.server:app --host 0.0.0.0 --port 8000 --reload
"""

import os
import tempfile
import uuid
from datetime import datetime
from typing import List

from fastapi import FastAPI, UploadFile, File, HTTPException, Query, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session

import scraper, models
# decoder removido - agora usamos scanner nativo no celular
from database import (
    create_tables,
    get_db,
    get_nota_by_url,
    create_nota,
    get_all_notas,
    delete_nota,
    NotaFiscalDB,
    CategoriaDB,
    ItemDB,
    seed_default_categorias
)


# ============================================================================
# CONFIGURAÇÃO DA APLICAÇÃO
# ============================================================================

app = FastAPI(
    title="NFC-e Reader API",
    description=(
        "API para leitura de Notas Fiscais Eletrônicas (NFC-e) brasileiras. "
        "Recebe imagens de QR Code e retorna dados estruturados em JSON. "
        "Inclui persistência em banco de dados e prevenção de duplicatas."
    ),
    version="2.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# Configurar CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Criar tabelas e seed de categorias ao iniciar
@app.on_event("startup")
def startup():
    create_tables()
    # Seed categorias padrão
    from database import SessionLocal
    db = SessionLocal()
    try:
        seed_default_categorias(db)
    finally:
        db.close()


# ============================================================================
# ENDPOINTS
# ============================================================================

@app.get("/")
async def root():
    """Health check endpoint."""
    return {
        "status": "online",
        "service": "NFC-e Reader API",
        "version": "2.0.0",
        "database": "SQLite"
    }


@app.get("/health")
async def health_check():
    """Health check detalhado."""
    return {
        "status": "healthy",
        "modules": {
            "decoder": "ok",
            "scraper": "ok",
            "database": "ok"
        }
    }


@app.post("/scan")
async def scan_nfce_deprecated():
    """
    ENDPOINT DESABILITADO - Use /scan/url ao invés.
    
    O mobile agora usa scanner nativo e envia apenas a URL.
    """
    raise HTTPException(
        status_code=410,
        detail={
            "error": "endpoint_deprecated",
            "message": "Este endpoint foi desabilitado. Use POST /scan/url?url=<URL> ao invés.",
            "alternative": "/scan/url"
        }
    )


@app.post("/decode")
async def decode_only_deprecated():
    """ENDPOINT DESABILITADO - O mobile agora usa scanner nativo."""
    raise HTTPException(
        status_code=410,
        detail={
            "error": "endpoint_deprecated",
            "message": "Este endpoint foi desabilitado. O mobile agora usa scanner nativo.",
            "alternative": "/scan/url"
        }
    )


@app.post("/scan/url")
async def scan_from_url(
    url: str = Query(..., description="URL do QR Code da NFC-e"),
    db: Session = Depends(get_db)
):
    """
    Processa uma NFC-e a partir da URL lida diretamente pelo scanner nativo.
    
    Muito mais rápido que upload de imagem pois o celular já decodificou o QR.
    """
    # Verificar se a URL parece ser de NFC-e
    if not url or len(url) < 20:
        raise HTTPException(
            status_code=400,
            detail={"error": "invalid_url", "message": "URL inválida"}
        )
    
    # Verificar duplicidade
    nota_existente = get_nota_by_url(db, url)
    if nota_existente:
        return JSONResponse(
            status_code=200,
            content=nota_existente.to_dict(include_cached=True)
        )
    
    # Fazer scraping da NFC-e
    try:
        print(f"[SCAN/URL] Iniciando scraping de: {url[:80]}...")
        data = scraper.scrape_nfce(url, "RS")
        print(f"[SCAN/URL] Resultado: {data}")
    except Exception as e:
        import traceback
        print(f"[SCAN/URL] ERRO: {str(e)}")
        print(f"[SCAN/URL] Traceback: {traceback.format_exc()}")
        raise HTTPException(
            status_code=500,
            detail={"error": "fetch_failed", "message": f"Erro ao acessar NFC-e: {str(e)}"}
        )
    
    if not data or not data.get("estabelecimento"):
        raise HTTPException(
            status_code=400,
            detail={"error": "parse_failed", "message": "Não foi possível extrair dados da nota"}
        )
    
    # Salvar no banco
    nova_nota = create_nota(
        db=db,
        url=url,
        estabelecimento=data.get("estabelecimento", "Não identificado"),
        total=float(data.get("total", 0.0)),
        itens=data.get("itens", []),
        data_emissao=data.get("data_emissao"),
        endereco=data.get("endereco")
    )
    
    return JSONResponse(
        status_code=200,
        content=nova_nota.to_dict(include_cached=False)
    )


@app.get("/notas")
async def listar_notas(
    busca: str = Query(default=None, description="Busca por estabelecimento ou nome de produto"),
    data_inicio: str = Query(default=None, description="Data inicial (YYYY-MM-DD)"),
    data_fim: str = Query(default=None, description="Data final (YYYY-MM-DD)"),
    limit: int = Query(default=50, ge=1, le=500, description="Limite de registros"),
    db: Session = Depends(get_db)
):
    """
    Retorna o histórico de notas fiscais com filtros avançados.
    
    **Filtros:**
    - `busca`: Busca híbrida no estabelecimento OU no nome dos itens
    - `data_inicio`: Filtrar notas a partir desta data
    - `data_fim`: Filtrar notas até esta data
    
    **Ordenação:** Mais recente primeiro.
    """
    from sqlalchemy import or_, and_
    from datetime import datetime
    from database import ItemDB
    
    # Query base
    query = db.query(NotaFiscalDB)
    
    # ===== BUSCA HÍBRIDA (estabelecimento OU item) =====
    if busca:
        busca_like = f"%{busca}%"
        # JOIN com itens para buscar nos produtos
        query = query.outerjoin(ItemDB, NotaFiscalDB.id == ItemDB.nota_id)
        query = query.filter(
            or_(
                NotaFiscalDB.estabelecimento.ilike(busca_like),
                ItemDB.nome.ilike(busca_like)
            )
        )
        # Distinct para evitar duplicatas quando múltiplos itens dão match
        query = query.distinct()
    
    # ===== FILTRO POR DATA (usa data_emissao = quando comprou) =====
    if data_inicio:
        try:
            dt_inicio = datetime.strptime(data_inicio, "%Y-%m-%d")
            query = query.filter(NotaFiscalDB.data_emissao >= dt_inicio)
        except ValueError:
            pass  # Ignora formato inválido
    
    if data_fim:
        try:
            dt_fim = datetime.strptime(data_fim, "%Y-%m-%d")
            # Adicionar 1 dia para incluir o dia inteiro
            from datetime import timedelta
            dt_fim = dt_fim + timedelta(days=1)
            query = query.filter(NotaFiscalDB.data_emissao < dt_fim)
        except ValueError:
            pass
    
    # Ordenar e limitar
    notas = query.order_by(NotaFiscalDB.data_leitura.desc()).limit(limit).all()
    
    # Construir resposta com info do filtro
    filtro_ativo = []
    if busca:
        filtro_ativo.append(f"busca: {busca}")
    if data_inicio:
        filtro_ativo.append(f"desde: {data_inicio}")
    if data_fim:
        filtro_ativo.append(f"até: {data_fim}")
    
    return {
        "total": len(notas),
        "filtros": filtro_ativo if filtro_ativo else None,
        "notas": [nota.to_dict() for nota in notas]
    }


@app.get("/notas/{nota_id}")
async def obter_nota(
    nota_id: int,
    db: Session = Depends(get_db)
):
    """Retorna uma nota específica pelo ID."""
    nota = db.query(NotaFiscalDB).filter(NotaFiscalDB.id == nota_id).first()
    
    if not nota:
        raise HTTPException(status_code=404, detail="Nota não encontrada")
    
    return nota.to_dict()


@app.get("/itens/busca")
async def buscar_itens(
    q: str = Query(..., min_length=2, description="Termo de busca (mínimo 2 caracteres)"),
    limit: int = Query(default=50, ge=1, le=200),
    db: Session = Depends(get_db)
):
    """
    Busca produtos/itens pelo nome e retorna lista comparativa.
    
    Retorna dados planos (flat) com preço, estabelecimento e data
    para facilitar comparação de preços.
    """
    from database import ItemDB, CategoriaDB
    from sqlalchemy import case, func
    
    # Normalizar termo para busca (minúsculo)
    termo_lower = q.lower()
    
    # Criar expressão de relevância:
    # 0 = começa com o termo (mais relevante)
    # 1 = contém o termo no meio (menos relevante)
    relevancia = case(
        (func.lower(ItemDB.nome).like(f"{termo_lower}%"), 0),  # Começa com
        else_=1  # Contém no meio
    )
    
    # JOIN Item + NotaFiscal + Categoria
    results = db.query(
        ItemDB.id,
        ItemDB.nome,
        ItemDB.qtd,
        ItemDB.valor,
        ItemDB.categoria_id,
        ItemDB.nota_id,
        NotaFiscalDB.estabelecimento,
        NotaFiscalDB.data_emissao,
        CategoriaDB.nome.label("categoria_nome"),
        CategoriaDB.icone.label("categoria_icone")
    ).join(
        NotaFiscalDB, ItemDB.nota_id == NotaFiscalDB.id
    ).outerjoin(
        CategoriaDB, ItemDB.categoria_id == CategoriaDB.id
    ).filter(
        ItemDB.nome.ilike(f"%{q}%")
    ).order_by(
        relevancia,           # Primeiro: por relevância (0=começa com, 1=contém)
        ItemDB.nome.asc()     # Desempate: ordem alfabética
    ).limit(limit).all()
    
    # Formatar resposta
    itens = []
    for row in results:
        itens.append({
            "item_id": row.id,
            "nota_id": row.nota_id,
            "produto": row.nome,
            "qtd": row.qtd,
            "valor_unitario": round(row.valor, 2) if row.valor else 0,
            "categoria": {
                "id": row.categoria_id or 0,
                "nome": row.categoria_nome or "Outros",
                "icone": row.categoria_icone or "📦"
            },
            "estabelecimento": row.estabelecimento,
            "data_emissao": row.data_emissao.strftime("%Y-%m-%d") if row.data_emissao else None
        })
    
    return {
        "termo": q,
        "total": len(itens),
        "itens": itens
    }


@app.get("/itens/categoria/{categoria_id}")
async def listar_itens_por_categoria(
    categoria_id: int,
    data_inicio: str = Query(default=None, description="Data inicial (YYYY-MM-DD)"),
    data_fim: str = Query(default=None, description="Data final (YYYY-MM-DD)"),
    limit: int = Query(default=100, ge=1, le=500),
    db: Session = Depends(get_db)
):
    """
    Lista todos os itens de uma categoria específica.
    
    Drill-down do dashboard para ver produtos comprados por categoria.
    """
    from database import ItemDB, CategoriaDB
    
    # Filtro base por categoria
    query = db.query(
        ItemDB.id,
        ItemDB.nome,
        ItemDB.qtd,
        ItemDB.valor,
        ItemDB.nota_id,
        NotaFiscalDB.estabelecimento,
        NotaFiscalDB.data_emissao,
        CategoriaDB.nome.label("categoria_nome"),
        CategoriaDB.icone.label("categoria_icone")
    ).join(
        NotaFiscalDB, ItemDB.nota_id == NotaFiscalDB.id
    ).outerjoin(
        CategoriaDB, ItemDB.categoria_id == CategoriaDB.id
    ).filter(
        ItemDB.categoria_id == categoria_id
    )
    
    # Filtros de data
    if data_inicio:
        try:
            dt_inicio = datetime.strptime(data_inicio, "%Y-%m-%d")
            query = query.filter(NotaFiscalDB.data_emissao >= dt_inicio)
        except ValueError:
            pass
    
    if data_fim:
        try:
            dt_fim = datetime.strptime(data_fim, "%Y-%m-%d")
            query = query.filter(NotaFiscalDB.data_emissao <= dt_fim)
        except ValueError:
            pass
    
    results = query.order_by(NotaFiscalDB.data_emissao.desc()).limit(limit).all()
    
    # Buscar info da categoria
    categoria = db.query(CategoriaDB).filter(CategoriaDB.id == categoria_id).first()
    
    itens = []
    total_valor = 0
    for row in results:
        valor = row.valor or 0
        total_valor += valor
        itens.append({
            "item_id": row.id,
            "nota_id": row.nota_id,
            "produto": row.nome,
            "qtd": row.qtd,
            "valor": round(valor, 2),
            "estabelecimento": row.estabelecimento,
            "data_emissao": row.data_emissao.strftime("%Y-%m-%d") if row.data_emissao else None
        })
    
    return {
        "categoria": {
            "id": categoria.id if categoria else categoria_id,
            "nome": categoria.nome if categoria else "Desconhecida",
            "icone": categoria.icone if categoria else "📦"
        },
        "total_itens": len(itens),
        "total_valor": round(total_valor, 2),
        "itens": itens
    }


@app.get("/itens/fornecedor")
async def listar_itens_por_fornecedor(
    estabelecimento: str = Query(..., description="Nome do estabelecimento"),
    data_inicio: str = Query(default=None, description="Data inicial (YYYY-MM-DD)"),
    data_fim: str = Query(default=None, description="Data final (YYYY-MM-DD)"),
    limit: int = Query(default=100, ge=1, le=500),
    db: Session = Depends(get_db)
):
    """
    Lista todos os itens comprados de um fornecedor (estabelecimento) específico.
    
    Drill-down do dashboard para ver produtos comprados por fornecedor.
    """
    from database import ItemDB, CategoriaDB
    
    # Filtro base por estabelecimento
    query = db.query(
        ItemDB.id,
        ItemDB.nome,
        ItemDB.qtd,
        ItemDB.valor,
        ItemDB.nota_id,
        NotaFiscalDB.estabelecimento,
        NotaFiscalDB.data_emissao,
        CategoriaDB.nome.label("categoria_nome"),
        CategoriaDB.icone.label("categoria_icone")
    ).join(
        NotaFiscalDB, ItemDB.nota_id == NotaFiscalDB.id
    ).outerjoin(
        CategoriaDB, ItemDB.categoria_id == CategoriaDB.id
    ).filter(
        NotaFiscalDB.estabelecimento.ilike(f"%{estabelecimento}%")
    )
    
    # Filtros de data
    if data_inicio:
        try:
            dt_inicio = datetime.strptime(data_inicio, "%Y-%m-%d")
            query = query.filter(NotaFiscalDB.data_emissao >= dt_inicio)
        except ValueError:
            pass
    
    if data_fim:
        try:
            dt_fim = datetime.strptime(data_fim, "%Y-%m-%d")
            query = query.filter(NotaFiscalDB.data_emissao <= dt_fim)
        except ValueError:
            pass
    
    results = query.order_by(NotaFiscalDB.data_emissao.desc()).limit(limit).all()
    
    itens = []
    total_valor = 0
    categorias_count = {}
    
    for row in results:
        valor = row.valor or 0
        total_valor += valor
        
        cat_nome = row.categoria_nome or "Outros"
        categorias_count[cat_nome] = categorias_count.get(cat_nome, 0) + 1
        
        itens.append({
            "item_id": row.id,
            "nota_id": row.nota_id,
            "produto": row.nome,
            "qtd": row.qtd,
            "valor": round(valor, 2),
            "categoria": cat_nome,
            "categoria_icone": row.categoria_icone or "📦",
            "data_emissao": row.data_emissao.strftime("%Y-%m-%d") if row.data_emissao else None
        })
    
    return {
        "estabelecimento": estabelecimento,
        "total_itens": len(itens),
        "total_valor": round(total_valor, 2),
        "categorias_compradas": categorias_count,
        "itens": itens
    }


@app.delete("/notas/{nota_id}")
async def deletar_nota(
    nota_id: int,
    db: Session = Depends(get_db)
):
    """Deleta uma nota fiscal pelo ID."""
    success = delete_nota(db, nota_id)
    
    if not success:
        raise HTTPException(status_code=404, detail="Nota não encontrada")
    
    return {"message": "Nota deletada com sucesso", "id": nota_id}


@app.put("/estabelecimento/renomear")
async def renomear_estabelecimento(
    nome_atual: str = Query(..., description="Nome atual do estabelecimento"),
    novo_nome: str = Query(..., description="Novo nome (apelido) para o estabelecimento"),
    db: Session = Depends(get_db)
):
    """
    Renomeia um estabelecimento em todas as notas (bulk update).
    
    Útil para transformar nomes técnicos como "ARCOS DOURADOS LTDA" 
    em nomes amigáveis como "McDonald's".
    """
    # Contar quantas notas serão afetadas
    notas_afetadas = db.query(NotaFiscalDB).filter(
        NotaFiscalDB.estabelecimento == nome_atual
    ).count()
    
    if notas_afetadas == 0:
        raise HTTPException(
            status_code=404, 
            detail=f"Nenhuma nota encontrada com o estabelecimento '{nome_atual}'"
        )
    
    # Executar update em massa
    db.query(NotaFiscalDB).filter(
        NotaFiscalDB.estabelecimento == nome_atual
    ).update({"estabelecimento": novo_nome})
    
    db.commit()
    
    return {
        "message": f"Estabelecimento renomeado com sucesso",
        "nome_anterior": nome_atual,
        "novo_nome": novo_nome,
        "notas_atualizadas": notas_afetadas
    }


# ============================================================================
# CATEGORIAS
# ============================================================================

@app.get("/categorias")
async def listar_categorias(db: Session = Depends(get_db)):
    """Lista todas as categorias disponíveis."""
    categorias = db.query(CategoriaDB).order_by(CategoriaDB.nome).all()
    return {
        "total": len(categorias),
        "categorias": [cat.to_dict() for cat in categorias]
    }


@app.post("/categorias")
async def criar_categoria(
    nome: str = Query(..., min_length=2, max_length=50),
    icone: str = Query(..., min_length=1, max_length=10),
    cor: str = Query(default="#666666", regex="^#[0-9A-Fa-f]{6}$"),
    db: Session = Depends(get_db)
):
    """
    Cria uma nova categoria personalizada.
    
    - nome: Nome da categoria (ex: "Cerveja Artesanal")
    - icone: Emoji (ex: "🍺")
    - cor: Cor hex (ex: "#FF5733")
    """
    # Verificar se já existe
    existente = db.query(CategoriaDB).filter(CategoriaDB.nome == nome).first()
    if existente:
        raise HTTPException(status_code=400, detail=f"Categoria '{nome}' já existe")
    
    categoria = CategoriaDB(nome=nome, icone=icone, cor=cor)
    db.add(categoria)
    db.commit()
    db.refresh(categoria)
    
    return categoria.to_dict()


@app.put("/item/{item_id}/categoria")
async def atualizar_categoria_item(
    item_id: int,
    categoria_id: int = Query(..., description="ID da nova categoria"),
    db: Session = Depends(get_db)
):
    """
    Atualiza a categoria de um item específico.
    Usado para correção manual quando a classificação automática erra.
    """
    # Buscar item
    item = db.query(ItemDB).filter(ItemDB.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item não encontrado")
    
    # Verificar se categoria existe
    categoria = db.query(CategoriaDB).filter(CategoriaDB.id == categoria_id).first()
    if not categoria:
        raise HTTPException(status_code=404, detail="Categoria não encontrada")
    
    # Guardar categoria anterior para aprendizado
    categoria_anterior_id = item.categoria_id
    
    # Atualizar
    item.categoria_id = categoria_id
    db.commit()
    
    # Salvar aprendizado (se mudou)
    if categoria_anterior_id and categoria_anterior_id != categoria_id:
        from classification_service import save_correction
        save_correction(
            db=db, 
            item_id=item_id, 
            old_category_id=categoria_anterior_id, 
            new_category_id=categoria_id, 
            product_name=item.nome
        )
    
    return {
        "message": "Categoria do item atualizada",
        "item_id": item_id,
        "nova_categoria": categoria.to_dict()
    }


# ============================================================================
# DASHBOARD / ANALYTICS
# ============================================================================

@app.get("/dashboard/resumo")
async def dashboard_resumo(
    data_inicio: str = Query(default=None, description="Data inicial (YYYY-MM-DD)"),
    data_fim: str = Query(default=None, description="Data final (YYYY-MM-DD)"),
    db: Session = Depends(get_db)
):
    """
    Retorna dados agregados para o dashboard de gastos.
    
    Agrupa por categoria e calcula totais e porcentagens
    para renderização em gráfico de pizza.
    """
    from datetime import datetime, timedelta
    from sqlalchemy import func
    
    # Se não passou datas, usa mês atual
    if not data_inicio:
        hoje = datetime.now()
        data_inicio = datetime(hoje.year, hoje.month, 1).strftime("%Y-%m-%d")
    
    if not data_fim:
        hoje = datetime.now()
        # Próximo mês, dia 1
        if hoje.month == 12:
            prox_mes = datetime(hoje.year + 1, 1, 1)
        else:
            prox_mes = datetime(hoje.year, hoje.month + 1, 1)
        data_fim = prox_mes.strftime("%Y-%m-%d")
    
    # Converter para datetime
    try:
        dt_inicio = datetime.strptime(data_inicio, "%Y-%m-%d")
        dt_fim = datetime.strptime(data_fim, "%Y-%m-%d")
    except ValueError:
        raise HTTPException(status_code=400, detail="Formato de data inválido")
    
    # Query: JOIN Item + Nota + Categoria, filtrar por data, agrupar
    resultados = db.query(
        CategoriaDB.id,
        CategoriaDB.nome,
        CategoriaDB.icone,
        CategoriaDB.cor,
        func.sum(ItemDB.valor * ItemDB.qtd).label("total")
    ).join(
        ItemDB, ItemDB.categoria_id == CategoriaDB.id
    ).join(
        NotaFiscalDB, ItemDB.nota_id == NotaFiscalDB.id
    ).filter(
        NotaFiscalDB.data_emissao >= dt_inicio,
        NotaFiscalDB.data_emissao < dt_fim
    ).group_by(
        CategoriaDB.id
    ).order_by(
        func.sum(ItemDB.valor * ItemDB.qtd).desc()
    ).all()
    
    # Calcular total geral
    total_periodo = sum(row.total or 0 for row in resultados)
    
    # Montar resposta com porcentagens
    categorias = []
    for row in resultados:
        total_cat = row.total or 0
        porcentagem = (total_cat / total_periodo * 100) if total_periodo > 0 else 0
        categorias.append({
            "id": row.id,
            "nome": row.nome,
            "icone": row.icone,
            "cor": row.cor,
            "total": round(total_cat, 2),
            "porcentagem": round(porcentagem, 1)
        })
    
    return {
        "periodo": {
            "inicio": data_inicio,
            "fim": data_fim
        },
        "total_periodo": round(total_periodo, 2),
        "categorias": categorias
    }


@app.get("/dashboard/fornecedores")
async def dashboard_fornecedores(
    data_inicio: str = Query(default=None, description="Data inicial (YYYY-MM-DD)"),
    data_fim: str = Query(default=None, description="Data final (YYYY-MM-DD)"),
    limit: int = Query(default=10, ge=1, le=50, description="Limite de fornecedores"),
    db: Session = Depends(get_db)
):
    """
    Retorna gastos agregados por fornecedor (estabelecimento).
    
    Útil para análise de onde o usuário mais gasta.
    """
    from datetime import datetime
    from sqlalchemy import func
    
    # Se não passou datas, usa mês atual
    if not data_inicio:
        hoje = datetime.now()
        data_inicio = datetime(hoje.year, hoje.month, 1).strftime("%Y-%m-%d")
    
    if not data_fim:
        hoje = datetime.now()
        if hoje.month == 12:
            prox_mes = datetime(hoje.year + 1, 1, 1)
        else:
            prox_mes = datetime(hoje.year, hoje.month + 1, 1)
        data_fim = prox_mes.strftime("%Y-%m-%d")
    
    # Converter para datetime
    try:
        dt_inicio = datetime.strptime(data_inicio, "%Y-%m-%d")
        dt_fim = datetime.strptime(data_fim, "%Y-%m-%d")
    except ValueError:
        raise HTTPException(status_code=400, detail="Formato de data inválido")
    
    # Query: Agrupar por estabelecimento
    resultados = db.query(
        NotaFiscalDB.estabelecimento,
        func.sum(NotaFiscalDB.total).label("total"),
        func.count(NotaFiscalDB.id).label("num_compras")
    ).filter(
        NotaFiscalDB.data_emissao >= dt_inicio,
        NotaFiscalDB.data_emissao < dt_fim
    ).group_by(
        NotaFiscalDB.estabelecimento
    ).order_by(
        func.sum(NotaFiscalDB.total).desc()
    ).limit(limit).all()
    
    # Calcular total geral
    total_periodo = sum(row.total or 0 for row in resultados)
    
    # Montar resposta
    fornecedores = []
    for row in resultados:
        total_fornec = row.total or 0
        porcentagem = (total_fornec / total_periodo * 100) if total_periodo > 0 else 0
        fornecedores.append({
            "nome": row.estabelecimento,
            "total": round(total_fornec, 2),
            "num_compras": row.num_compras,
            "porcentagem": round(porcentagem, 1)
        })
    
    return {
        "periodo": {
            "inicio": data_inicio,
            "fim": data_fim
        },
        "total_fornecedores": len(fornecedores),
        "total_periodo": round(total_periodo, 2),
        "fornecedores": fornecedores
    }


@app.get("/dashboard/estatisticas")
async def dashboard_estatisticas(
    data_inicio: str = Query(default=None, description="Data inicial (YYYY-MM-DD)"),
    data_fim: str = Query(default=None, description="Data final (YYYY-MM-DD)"),
    db: Session = Depends(get_db)
):
    """
    Retorna estatísticas gerais para KPIs do dashboard.
    
    Inclui total, média, contagens e comparativo com período anterior.
    """
    from datetime import datetime, timedelta
    from sqlalchemy import func
    
    # Se não passou datas, usa mês atual
    if not data_inicio:
        hoje = datetime.now()
        data_inicio = datetime(hoje.year, hoje.month, 1).strftime("%Y-%m-%d")
    
    if not data_fim:
        hoje = datetime.now()
        if hoje.month == 12:
            prox_mes = datetime(hoje.year + 1, 1, 1)
        else:
            prox_mes = datetime(hoje.year, hoje.month + 1, 1)
        data_fim = prox_mes.strftime("%Y-%m-%d")
    
    # Converter para datetime
    dt_inicio = datetime.strptime(data_inicio, "%Y-%m-%d")
    dt_fim = datetime.strptime(data_fim, "%Y-%m-%d")
    dias_periodo = (dt_fim - dt_inicio).days or 1
    
    # =====PERÍODO ATUAL =====
    stats_atual = db.query(
        func.sum(NotaFiscalDB.total).label("total"),
        func.count(NotaFiscalDB.id).label("num_notas"),
        func.count(func.distinct(NotaFiscalDB.estabelecimento)).label("num_fornecedores")
    ).filter(
        NotaFiscalDB.data_emissao >= dt_inicio,
        NotaFiscalDB.data_emissao < dt_fim
    ).first()
    
    total_atual = stats_atual.total or 0
    num_notas = stats_atual.num_notas or 0
    num_fornecedores = stats_atual.num_fornecedores or 0
    media_dia = total_atual / dias_periodo if dias_periodo > 0 else 0
    ticket_medio = total_atual / num_notas if num_notas > 0 else 0
    
    # ===== PERÍODO ANTERIOR (mesma duração) =====
    dt_inicio_ant = dt_inicio - timedelta(days=dias_periodo)
    dt_fim_ant = dt_inicio
    
    stats_anterior = db.query(
        func.sum(NotaFiscalDB.total).label("total")
    ).filter(
        NotaFiscalDB.data_emissao >= dt_inicio_ant,
        NotaFiscalDB.data_emissao < dt_fim_ant
    ).first()
    
    total_anterior = stats_anterior.total or 0
    
    # Calcular variação
    if total_anterior > 0:
        variacao = ((total_atual - total_anterior) / total_anterior) * 100
    else:
        variacao = 100 if total_atual > 0 else 0
    
    return {
        "periodo": {
            "inicio": data_inicio,
            "fim": data_fim,
            "dias": dias_periodo
        },
        "total": round(total_atual, 2),
        "media_dia": round(media_dia, 2),
        "ticket_medio": round(ticket_medio, 2),
        "num_notas": num_notas,
        "num_fornecedores": num_fornecedores,
        "comparativo": {
            "total_anterior": round(total_anterior, 2),
            "variacao_percentual": round(variacao, 1),
            "tendencia": "alta" if variacao > 0 else "baixa" if variacao < 0 else "estavel"
        }
    }


# ============================================================================
# UTILITÁRIOS
# ============================================================================

def _get_extension(filename: str) -> str:
    """Extrai a extensão do arquivo."""
    if "." in filename:
        return "." + filename.rsplit(".", 1)[-1].lower()
    return ".jpg"


# ============================================================================
# EXECUÇÃO DIRETA
# ============================================================================

if __name__ == "__main__":
    import uvicorn
    
    uvicorn.run(
        "nfce_reader.server:app",
        host="0.0.0.0",
        port=8000,
        reload=True
    )
