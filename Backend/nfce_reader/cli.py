# -*- coding: utf-8 -*-
"""
Módulo CLI - Interface de linha de comando para o NFC-e Reader.

Utiliza argparse para processar argumentos do terminal e
orquestrar o pipeline de decodificação e extração.
"""

import argparse
import json
import sys
from pathlib import Path
from typing import Optional

from . import decoder, scraper, models


def create_parser() -> argparse.ArgumentParser:
    """Cria o parser de argumentos do CLI."""
    parser = argparse.ArgumentParser(
        prog="nfce-reader",
        description=(
            "Leitor de Notas Fiscais Eletrônicas (NFC-e) brasileiras. "
            "Extrai dados de QR Codes e exporta para JSON."
        ),
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Exemplos de uso:
  python -m nfce_reader.main nota.jpg
  python -m nfce_reader.main foto_qr.png --output minha_compra.json
  python -m nfce_reader.main imagem.jpg --estado RS

Estados suportados com seletores específicos: RS, SP, RJ
Use --estado GENERICO para tentativa de extração automática.
        """
    )
    
    parser.add_argument(
        "image_path",
        type=str,
        help="Caminho para a imagem do QR Code (jpg, png)"
    )
    
    parser.add_argument(
        "-o", "--output",
        type=str,
        default="compra.json",
        help="Nome do arquivo JSON de saída (padrão: compra.json)"
    )
    
    parser.add_argument(
        "-e", "--estado",
        type=str,
        default="GENERICO",
        choices=["RS", "SP", "RJ", "GENERICO"],
        help="Sigla do estado para usar seletores CSS específicos (padrão: GENERICO)"
    )
    
    parser.add_argument(
        "--url-only",
        action="store_true",
        help="Apenas extrair e exibir a URL do QR Code, sem fazer scraping"
    )
    
    parser.add_argument(
        "-v", "--verbose",
        action="store_true",
        help="Exibir informações detalhadas de debug"
    )
    
    return parser


def print_header() -> None:
    """Exibe o cabeçalho do programa."""
    print("=" * 60)
    print("  NFC-e Reader - Leitor de Notas Fiscais Eletrônicas")
    print("=" * 60)
    print()


def print_nfce(nfce: models.NFCe) -> None:
    """Exibe os dados da NFC-e formatados no terminal."""
    print("\n" + "-" * 50)
    print(f"  ESTABELECIMENTO: {nfce.estabelecimento}")
    print("-" * 50)
    
    if nfce.itens:
        print(f"\n{'PRODUTO':<35} {'QTD':>6} {'VALOR':>10}")
        print("-" * 53)
        
        for item in nfce.itens:
            nome = item.nome[:33] + ".." if len(item.nome) > 35 else item.nome
            print(f"{nome:<35} {item.qtd:>6.2f} R${item.valor:>8.2f}")
        
        print("-" * 53)
    else:
        print("\n[!] Nenhum item encontrado. Pode ser necessário ajustar")
        print("    os seletores CSS para o seu estado.")
    
    print(f"{'TOTAL':>43} R${nfce.total:>8.2f}")
    print()


def save_json(nfce: models.NFCe, output_path: str) -> bool:
    """Salva a NFC-e como arquivo JSON."""
    try:
        with open(output_path, "w", encoding="utf-8") as f:
            json.dump(nfce.to_dict(), f, ensure_ascii=False, indent=2)
        return True
    except IOError as e:
        print(f"[ERRO] Falha ao salvar JSON: {e}")
        return False


def run_pipeline(
    image_path: str,
    output: str,
    estado: str,
    url_only: bool = False,
    verbose: bool = False
) -> int:
    """
    Executa o pipeline completo de extração.
    
    Returns:
        Código de saída (0 = sucesso, 1 = erro)
    """
    print_header()
    
    # Passo 1: Decodificar QR Code
    print(f"[1/3] Lendo QR Code de: {image_path}")
    
    try:
        url = decoder.decode_qr_from_image(image_path)
    except FileNotFoundError as e:
        print(f"[ERRO] {e}")
        return 1
    except ValueError as e:
        print(f"[ERRO] {e}")
        return 1
    
    if url is None:
        print("[ERRO] Nenhum QR Code encontrado na imagem.")
        print("       Verifique se a imagem contém um QR Code legível.")
        return 1
    
    print(f"[OK]   URL extraída: {url[:70]}..." if len(url) > 70 else f"[OK]   URL extraída: {url}")
    
    if url_only:
        print(f"\nURL completa:\n{url}")
        return 0
    
    # Passo 2: Fazer scraping
    print(f"\n[2/3] Acessando página da NFC-e... (Estado: {estado})")
    
    data = scraper.scrape_nfce(url, estado)
    
    if data is None:
        print("[ERRO] Falha ao acessar a página da nota fiscal.")
        print("       Verifique sua conexão ou se o site da SEFAZ está online.")
        return 1
    
    if verbose:
        print(f"[DEBUG] Dados extraídos: {json.dumps(data, indent=2, ensure_ascii=False)}")
    
    # Criar modelo de dados
    nfce = models.create_nfce_from_dict(data, url)
    
    # Exibir no terminal
    print_nfce(nfce)
    
    # Passo 3: Salvar JSON
    print(f"[3/3] Salvando dados em: {output}")
    
    if save_json(nfce, output):
        print(f"[OK]   Arquivo salvo com sucesso!")
    else:
        return 1
    
    print("\n" + "=" * 60)
    print("  Processamento concluído!")
    print("=" * 60)
    
    return 0


def main() -> int:
    """Ponto de entrada principal do CLI."""
    parser = create_parser()
    args = parser.parse_args()
    
    return run_pipeline(
        image_path=args.image_path,
        output=args.output,
        estado=args.estado,
        url_only=args.url_only,
        verbose=args.verbose
    )


if __name__ == "__main__":
    sys.exit(main())
