# -*- coding: utf-8 -*-
"""Script para analisar dados do banco de produção."""
import psycopg2

DATABASE_URL = "postgresql://nfcescan_db_user:ea2AF5Ied5om3Xs40HOo5s8X3O4qHuVM@dpg-d54jsa15pdvs73bjm5l0-a.oregon-postgres.render.com/nfcescan_db"

conn = psycopg2.connect(DATABASE_URL)
cur = conn.cursor()

# Ver tabelas
cur.execute("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'")
print("=== TABELAS ===")
for t in cur.fetchall():
    print(f"  - {t[0]}")

# Contar registros
print("\n=== CONTAGEM DE REGISTROS ===")
cur.execute("SELECT COUNT(*) FROM notas_fiscais")
print(f"Notas fiscais: {cur.fetchone()[0]}")

cur.execute("SELECT COUNT(*) FROM itens")
print(f"Itens: {cur.fetchone()[0]}")

cur.execute("SELECT COUNT(*) FROM categorias")
print(f"Categorias: {cur.fetchone()[0]}")

# Ver categorias existentes
print("\n=== CATEGORIAS ===")
cur.execute("SELECT id, nome, icone FROM categorias ORDER BY nome")
for row in cur.fetchall():
    print(f"  {row[2]} {row[1]} (id={row[0]})")

# Ver distribuição de itens por categoria
print("\n=== DISTRIBUIÇÃO POR CATEGORIA ===")
cur.execute("""
    SELECT c.nome, c.icone, COUNT(i.id) as qtd
    FROM itens i
    LEFT JOIN categorias c ON i.categoria_id = c.id
    GROUP BY c.nome, c.icone
    ORDER BY qtd DESC
""")
for row in cur.fetchall():
    cat = row[0] or "SEM CATEGORIA"
    icon = row[1] or "❓"
    print(f"  {icon} {cat}: {row[2]} itens")

# Ver exemplos de itens por categoria (para análise)
print("\n=== EXEMPLOS DE ITENS POR CATEGORIA ===")
cur.execute("""
    SELECT c.nome, i.nome as item_nome
    FROM itens i
    LEFT JOIN categorias c ON i.categoria_id = c.id
    ORDER BY c.nome, RANDOM()
    LIMIT 50
""")
current_cat = None
for row in cur.fetchall():
    cat = row[0] or "SEM CATEGORIA"
    if cat != current_cat:
        print(f"\n  [{cat}]")
        current_cat = cat
    print(f"    - {row[1]}")

conn.close()
print("\n✅ Análise concluída!")
