# -*- coding: utf-8 -*-
"""
NFC-e Reader - Ponto de entrada principal.

Execute com:
    python -m nfce_reader.main <caminho_da_imagem>
"""

import sys
from nfce_reader.cli import main

if __name__ == "__main__":
    sys.exit(main())
