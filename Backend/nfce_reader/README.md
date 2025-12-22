# NFC-e Reader 📱💰

Sistema completo de **Gestão de Gastos** via leitura de NFC-e (Nota Fiscal Eletrônica).  
Backend Python + App Mobile React Native.

## ✨ Funcionalidades

- 📷 **Scanner de QR Code** - Leitura nativa instantânea
- 🏪 **Extração automática** - Estabelecimento, itens, valores, endereço
- 🏷️ **Categorização inteligente** - Classifica produtos automaticamente
- ✏️ **Edição manual** - Corrija categorias com um clique
- 📊 **Dashboard Analytics** - Gráficos de pizza por categoria
- 🔄 **Histórico completo** - Busca, filtros por período
- ☁️ **Pronto para nuvem** - Suporta PostgreSQL (Railway, Render)

## 📁 Estrutura do Projeto

```
Gestão de custos/
├── Backend/
│   └── nfce_reader/
│       ├── server.py      # API FastAPI
│       ├── database.py    # SQLAlchemy (SQLite/PostgreSQL)
│       ├── scraper.py     # Web scraping das NFC-e
│       ├── decoder.py     # Decodificação QR Code
│       ├── classifier.py  # Categorização automática
│       └── models.py      # Estruturas de dados
│
└── mobile/
    └── App.js             # React Native / Expo
```

## 🚀 Instalação

### Backend

```bash
cd Backend/nfce_reader
pip install -r requirements.txt
uvicorn server:app --host 0.0.0.0 --port 8000 --reload
```

### Mobile (Expo)

```bash
cd mobile
npm install
npx expo start
```

> ⚠️ Atualize `API_URL` em `App.js` com o IP do seu computador

## 📡 API Endpoints

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| `POST` | `/scan/url` | Processa NFC-e via URL (scanner nativo) |
| `POST` | `/scan` | Processa NFC-e via imagem |
| `GET` | `/notas` | Lista notas (busca, filtros) |
| `GET` | `/notas/{id}` | Detalhes da nota |
| `GET` | `/categorias` | Lista categorias |
| `POST` | `/categorias` | Cria categoria |
| `PUT` | `/item/{id}/categoria` | Altera categoria do item |
| `GET` | `/dashboard/resumo` | Analytics agregados |
| `PUT` | `/estabelecimento/renomear` | Renomeia em massa |

## 🗄️ Banco de Dados

### Desenvolvimento (SQLite)
```bash
# Automático - sem configuração necessária
```

### Produção (PostgreSQL)
```bash
# Crie arquivo .env
DATABASE_URL=postgresql://user:pass@host:5432/dbname
```

## 📊 Categorias Padrão

| Emoji | Categoria | Cor |
|-------|-----------|-----|
| 🍽️ | Alimentação | #FF6B35 |
| 🥤 | Bebidas | #4ECDC4 |
| 🚗 | Transporte | #45B7D1 |
| 🏠 | Casa | #96CEB4 |
| 🧹 | Limpeza | #88D8B0 |
| 🧴 | Higiene | #FFEAA7 |
| 🥩 | Açougue | #E17055 |
| 🥬 | Hortifruti | #00B894 |
| 🥛 | Laticínios | #FDCB6E |
| 🥖 | Padaria | #E9967A |
| 🐕 | Pet | #A29BFE |
| 💊 | Farmácia | #74B9FF |
| 📦 | Outros | #636E72 |

## 🛠️ Tecnologias

**Backend:**
- Python 3.11+
- FastAPI
- SQLAlchemy
- Beautiful Soup
- OpenCV / pyzbar

**Mobile:**
- React Native / Expo
- expo-camera (barcode scanner)
- react-native-chart-kit
- axios

## 📱 Screenshots

### Scanner
- Enquadre o QR Code da NFC-e
- Leitura automática (sem apertar botão)
- Vibração ao detectar

### Dashboard
- Gráfico de pizza por categoria
- Filtros: Este Mês, Mês Passado, 3 Meses, Este Ano
- Detalhamento com barras de progresso

## 🚀 Deploy (Produção)

### Railway

```bash
# Procfile
web: gunicorn server:app -w 4 -k uvicorn.workers.UvicornWorker --bind 0.0.0.0:$PORT
```

### Variáveis de Ambiente
```
DATABASE_URL=postgresql://...
```

## 📝 Licença

MIT License
