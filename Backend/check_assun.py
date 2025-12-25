import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from nfce_reader.database import NotaFiscalDB, ItemDB

# Configurar URL de produção
DB_URL = "postgresql://nfcescan_db_user:ea2AF5Ied5om3Xs40HOo5s8X3O4qHuVM@dpg-d54jsa15pdvs73bjm5l0-a.oregon-postgres.render.com/nfcescan_db"

engine = create_engine(DB_URL)
SessionLocal = sessionmaker(bind=engine)
db = SessionLocal()

def check_assun():
    print("🔍 Buscando última nota do Assun/Asun...")
    
    # Buscar nota que contém "Asun" ou "Assun"
    nota = db.query(NotaFiscalDB).filter(
        (NotaFiscalDB.estabelecimento.ilike("%Asun%")) | 
        (NotaFiscalDB.estabelecimento.ilike("%Assun%"))
    ).order_by(NotaFiscalDB.data_emissao.desc()).first()
    
    if not nota:
        print("❌ Nenhuma nota encontrada para Asun/Assun.")
        return

    print(f"\n🏢 Estabelecimento: {nota.estabelecimento}")
    print(f"📅 Data: {nota.data_emissao}")
    print(f"💰 Total: R$ {nota.total}")
    print("-" * 50)
    
    for item in nota.itens: # Acessando relacionamento
        cat_nome = item.categoria_rel.nome if item.categoria_rel else "Sem Categoria"
        print(f"📦 {item.nome:<30} | 🏷️  {cat_nome}")

if __name__ == "__main__":
    check_assun()
