# 💰 Gestor de Gastos NFC-e

Sistema completo de gestão financeira pessoal via leitura de Notas Fiscais Eletrônicas (NFC-e).

![Python](https://img.shields.io/badge/Python-3.11+-blue?logo=python)
![React Native](https://img.shields.io/badge/React_Native-Expo-blueviolet?logo=expo)
![FastAPI](https://img.shields.io/badge/FastAPI-0.104+-green?logo=fastapi)

## ✨ Funcionalidades

- 📷 **Scanner instantâneo** - Leitura nativa de QR Code
- 🏪 **Extração automática** - Estabelecimento, itens, valores, endereço
- 🏷️ **Categorização inteligente** - Classifica produtos automaticamente
- ✏️ **Edição manual** - Corrija categorias com um clique
- 📊 **Dashboard Analytics** - Gráficos de pizza por categoria
- 🔍 **Busca avançada** - Por produto ou estabelecimento
- ☁️ **Cloud-ready** - Suporta PostgreSQL

## 📁 Estrutura

```
├── Backend/nfce_reader/   # API Python (FastAPI + SQLAlchemy)
└── mobile/                # App React Native (Expo)
```

## 🚀 Quick Start

### Backend
```bash
cd Backend/nfce_reader
pip install -r requirements.txt
uvicorn server:app --host 0.0.0.0 --port 8000 --reload
```

### Mobile
```bash
cd mobile
npm install
npx expo start
```

> ⚠️ Configure `API_URL` em `App.js` com o IP do seu computador

## 📱 Screenshots

| Scanner | Dashboard | Histórico |
|---------|-----------|-----------|
| Aponte e escaneie | Gráficos por categoria | Busca e filtros |

## 📡 API Endpoints

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| `POST` | `/scan/url` | Processa NFC-e via URL |
| `GET` | `/notas` | Lista notas |
| `GET` | `/categorias` | Lista categorias |
| `GET` | `/dashboard/resumo` | Analytics agregados |

📖 [Documentação completa da API](Backend/nfce_reader/README.md)

## 🛠️ Stack

- **Backend:** Python, FastAPI, SQLAlchemy, BeautifulSoup
- **Mobile:** React Native, Expo, react-native-chart-kit
- **Database:** SQLite (dev) / PostgreSQL (prod)

## 📝 Licença

MIT License
