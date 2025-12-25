import os
import sys

# Adicionar pasta nfce_reader ao path para imports funcionarem
sys.path.append(os.path.join(os.path.dirname(__file__), "nfce_reader"))

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Configurar URL de produção
DB_URL = "postgresql://nfcescan_db_user:ea2AF5Ied5om3Xs40HOo5s8X3O4qHuVM@dpg-d54jsa15pdvs73bjm5l0-a.oregon-postgres.render.com/nfcescan_db"

# Imports após path config
from nfce_reader.database import CategoriaDB, ItemDB, seed_default_categorias
from nfce_reader.classification_service import classify_item_smart, groq_client

engine = create_engine(DB_URL)
SessionLocal = sessionmaker(bind=engine)
db = SessionLocal()

def reprocess_null_categories():
    print("🔄 Atualizando categorias no banco...")
    try:
        # Importante: seed_default_categorias espera uma session
        seed_default_categorias(db) 
    except Exception as e:
        print(f"⚠️ Erro ao seedar (talvez ja existam): {e}")

    print("\n📦 Buscando itens SEM CATEGORIA...")
    
    # Itens onde categoria_id é NULL
    itens_null = db.query(ItemDB).filter(ItemDB.categoria_id == None).all()
    
    if not itens_null:
        print("✅ Nenhum item sem categoria encontrado.")
        return

    print(f"⚠️ Encontrados {len(itens_null)} itens sem categoria. Reprocessando com IA/Regras...\n")
    
    # Cache de categorias
    cats = db.query(CategoriaDB).all()
    cat_map = {c.nome: c.id for c in cats}

    count_fixed = 0
    for item in itens_null:
        print(f"🔍 Item: {item.nome}")
        
        # Chama a classificação
        novo_nome_cat = classify_item_smart(db, item.nome)
        
        if novo_nome_cat in cat_map:
            new_id = cat_map[novo_nome_cat]
            item.categoria_id = new_id
            count_fixed += 1
            print(f"   ✅ Classificado como: {novo_nome_cat} (ID {new_id})")
        else:
            print(f"   ❌ Categoria '{novo_nome_cat}' não encontrada no banco.")
            
            # Tentar criar a categoria se não existir (ex: retornou algo novo)
            # Mas cuidado com nomes estranhos do Groq
            
    db.commit()
    print(f"\n🎉 Processo concluído! {count_fixed} itens corrigidos.")

if __name__ == "__main__":
    reprocess_null_categories()
