# ============================================================================
# PROCFILE - Comandos para iniciar os serviços
# ============================================================================

# ============================================================================
# PRODUÇÃO (Railway/Heroku/Render)
# ============================================================================
# O provedor de cloud executa automaticamente o comando "web:"
web: cd Backend/nfce_reader && gunicorn server:app -w 4 -k uvicorn.workers.UvicornWorker --bind 0.0.0.0:$PORT


# ============================================================================
# DESENVOLVIMENTO LOCAL
# ============================================================================
# Execute estes comandos manualmente no terminal:

# --- BACKEND (API Python) ---
# Terminal 1:
#   cd Backend/nfce_reader
#   pip install -r requirements.txt
#   uvicorn server:app --host 0.0.0.0 --port 8000 --reload
#
# A API estará disponível em: http://localhost:8000
# Documentação Swagger: http://localhost:8000/docs

# --- MOBILE (React Native / Expo) ---
# Terminal 2:
#   cd mobile
#   npm install
#   npx expo start
#
# Escaneie o QR Code com o app Expo Go no celular
# Ou pressione 'a' para Android emulator / 'w' para web

# --- IMPORTANTE ---
# Atualize API_URL no arquivo mobile/App.js com o IP do seu computador:
#   const API_URL = 'http://SEU_IP_LOCAL:8000';
#
# Para descobrir seu IP local:
#   Windows: ipconfig
#   Mac/Linux: ifconfig ou ip addr
