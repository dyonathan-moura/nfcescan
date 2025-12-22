# NFC-e Reader 📱

Leitor de Notas Fiscais Eletrônicas (NFC-e) brasileiras via CLI.  
Extrai dados de QR Codes e exporta para JSON estruturado.

## 📦 Instalação

### 1. Dependências do Sistema

**Windows**: Geralmente funciona out-of-the-box.

**Linux**:
```bash
sudo apt-get install libzbar0
```

**macOS**:
```bash
brew install zbar
```

### 2. Dependências Python

```bash
pip install -r requirements.txt
```

## 🚀 Uso

### Básico
```bash
python -m nfce_reader.main <caminho_da_imagem>
```

### Exemplos
```bash
# Processar QR Code e salvar como compra.json (padrão)
python -m nfce_reader.main nota_fiscal.jpg

# Especificar arquivo de saída
python -m nfce_reader.main foto_qr.png --output minha_compra.json

# Usar seletores específicos do Rio Grande do Sul
python -m nfce_reader.main imagem.jpg --estado RS

# Apenas extrair a URL (sem scraping)
python -m nfce_reader.main qrcode.png --url-only

# Modo verbose (debug)
python -m nfce_reader.main nota.jpg -v
```

### Argumentos

| Argumento | Descrição |
|-----------|-----------|
| `image_path` | Caminho para imagem do QR Code (obrigatório) |
| `-o, --output` | Nome do arquivo JSON (padrão: `compra.json`) |
| `-e, --estado` | Estado para seletores CSS: RS, SP, RJ, GENERICO |
| `--url-only` | Apenas extrai a URL, sem fazer scraping |
| `-v, --verbose` | Exibe informações de debug |

## 📄 Estrutura do JSON

```json
{
  "meta": {
    "data_processamento": "2024-12-21 22:50:00",
    "url_origem": "https://..."
  },
  "estabelecimento": "Nome da Loja",
  "total": 150.75,
  "itens": [
    {
      "nome": "Produto X",
      "qtd": 2,
      "valor": 25.50
    }
  ]
}
```

## ⚙️ Customizando Seletores CSS

Cada estado (SEFAZ) tem um layout HTML diferente. Se o scraping não funcionar, edite `nfce_reader/scraper.py` e adicione/modifique seletores em `SELETORES_ESTADO`.

### Exemplo: Adicionando suporte a um novo estado

```python
SELETORES_ESTADO["MG"] = EstadoSelectors(
    nome="MG",
    estabelecimento=".nome-emitente",
    total=".valor-total",
    itens_container=".lista-itens tr",
    item_nome=".descricao",
    item_qtd=".quantidade",
    item_valor=".valor-unitario"
)
```

### Como descobrir os seletores?

1. Acesse a URL da sua NFC-e no navegador
2. Pressione F12 para abrir DevTools
3. Use o inspetor para identificar as classes CSS
4. Atualize `scraper.py` com os seletores

## 🔧 Estrutura do Projeto

```
Gestão de custos/
├── requirements.txt
├── README.md
└── nfce_reader/
    ├── __init__.py
    ├── main.py       # Ponto de entrada
    ├── cli.py        # Interface de linha de comando
    ├── decoder.py    # Decodificação de QR Code
    ├── scraper.py    # Web scraping da NFC-e
    └── models.py     # Estruturas de dados
```

## 📝 Licença

MIT License
