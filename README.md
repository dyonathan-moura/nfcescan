# Gestão de Custos 💰

Sistema de gestão financeira pessoal via leitura de NFC-e.

## 📁 Estrutura

```
├── Backend/nfce_reader/   # API Python (FastAPI)
└── mobile/                # App React Native (Expo)
```

## 🚀 Quick Start

### Backend
```bash
cd Backend/nfce_reader
pip install -r requirements.txt
uvicorn server:app --host 0.0.0.0 --port 8000
```

### Mobile
```bash
cd mobile
npm install
npx expo start
```

Veja [Backend/nfce_reader/README.md](Backend/nfce_reader/README.md) para documentação completa.
