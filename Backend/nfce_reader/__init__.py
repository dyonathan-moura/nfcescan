# -*- coding: utf-8 -*-
"""
Módulo __init__ - Ponto de entrada do pacote nfce_reader.
"""

from .decoder import decode_qr_from_image, decode_multiple_qr
from .scraper import fetch_page, parse_nfce, scrape_nfce
from .models import Item, Meta, NFCe, create_nfce_from_dict

__all__ = [
    "decode_qr_from_image",
    "decode_multiple_qr",
    "fetch_page",
    "parse_nfce",
    "scrape_nfce",
    "Item",
    "Meta",
    "NFCe",
    "create_nfce_from_dict",
]

__version__ = "0.1.0"
