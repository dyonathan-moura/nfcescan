import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), "nfce_reader"))

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from nfce_reader.database import ItemDB, CategoriaDB
from nfce_reader.classification_service import classify_item_smart

# Prod DB
DB_URL = "postgresql://nfcescan_db_user:ea2AF5Ied5om3Xs40HOo5s8X3O4qHuVM@dpg-d54jsa15pdvs73bjm5l0-a.oregon-postgres.render.com/nfcescan_db"

engine = create_engine(DB_URL)
SessionLocal = sessionmaker(bind=engine)
db = SessionLocal()

def force_fix():
    print("🔧 Corrigindo itens classificados errado (bugs antigos)...")
    
    # Busca itens específicos que sabemos que estão errados
    targets = ["CORACAO", "LAVA ROUPA", "NEGRESCO"]
    
    cats = db.query(CategoriaDB).all()
    cat_map = {c.nome: c.id for c in cats}
    
    for term in targets:
        items = db.query(ItemDB).filter(ItemDB.nome.ilike(f"%{term}%")).all()
        for item in items:
            old_cat = item.categoria_rel.nome if item.categoria_rel else "None"
            
            # Reclassificar com a NOVA lógica (sem bug do cao/nestle)
            new_cat_name = classify_item_smart(db, item.nome)
            
            if new_cat_name in cat_map:
                item.categoria_id = cat_map[new_cat_name]
                print(f"✅ {item.nome}: {old_cat} -> {new_cat_name}")
            else:
                print(f"❌ {item.nome}: Nova categoria {new_cat_name} não encontrada.")
                
    db.commit()
    print("✨ Feito.")

if __name__ == "__main__":
    force_fix()
