# -*- coding: utf-8 -*-
"""
Módulo Decoder - Responsável por decodificar QR Codes de imagens.

Este módulo utiliza OpenCV (cv2) para carregar imagens e pyzbar
para decodificar QR Codes, extraindo URLs de Notas Fiscais Eletrônicas.
"""

from pathlib import Path
from typing import Optional

import cv2
from pyzbar import pyzbar
from pyzbar.pyzbar import Decoded


def decode_qr_from_image(image_path: str) -> Optional[str]:
    """
    Lê uma imagem e extrai a URL contida no QR Code.
    
    Args:
        image_path: Caminho para o arquivo de imagem (jpg, png).
    
    Returns:
        A URL extraída do QR Code, ou None se não encontrado.
    
    Raises:
        FileNotFoundError: Se o arquivo de imagem não existir.
        ValueError: Se o arquivo não puder ser lido como imagem.
    """
    # Validar existência do arquivo
    path = Path(image_path)
    if not path.exists():
        raise FileNotFoundError(f"Arquivo não encontrado: {image_path}")
    
    if not path.is_file():
        raise ValueError(f"Caminho não é um arquivo: {image_path}")
    
    # Carregar imagem com OpenCV
    image = cv2.imread(str(path))
    
    if image is None:
        raise ValueError(
            f"Não foi possível ler a imagem: {image_path}. "
            "Verifique se o arquivo é uma imagem válida (jpg, png)."
        )
    
    # Decodificar QR Codes na imagem
    decoded_objects: list[Decoded] = pyzbar.decode(image)
    
    if not decoded_objects:
        return None
    
    # Retornar o primeiro QR Code encontrado
    for obj in decoded_objects:
        if obj.type == "QRCODE":
            try:
                url = obj.data.decode("utf-8")
                return url
            except UnicodeDecodeError:
                # Tentar latin-1 como fallback
                return obj.data.decode("latin-1", errors="replace")
    
    return None


def decode_multiple_qr(image_path: str) -> list[str]:
    """
    Decodifica múltiplos QR Codes de uma imagem.
    
    Args:
        image_path: Caminho para o arquivo de imagem.
    
    Returns:
        Lista de URLs/dados extraídos de todos os QR Codes encontrados.
    """
    path = Path(image_path)
    if not path.exists():
        raise FileNotFoundError(f"Arquivo não encontrado: {image_path}")
    
    image = cv2.imread(str(path))
    
    if image is None:
        raise ValueError(f"Não foi possível ler a imagem: {image_path}")
    
    decoded_objects = pyzbar.decode(image)
    
    results = []
    for obj in decoded_objects:
        if obj.type == "QRCODE":
            try:
                data = obj.data.decode("utf-8")
            except UnicodeDecodeError:
                data = obj.data.decode("latin-1", errors="replace")
            results.append(data)
    
    return results
