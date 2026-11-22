/**
 * Lê uma foto escolhida no aparelho (galeria ou câmera) e devolve uma versão
 * reduzida em JPEG, como "data:" URL, para guardar no arquivo pessoal.
 * Cards: ~480 px de largura (≈ 20–40 KB). Templates: até ~1400 px.
 */
export async function photoToDataUrl(file: File, maxSide = 480, quality = 0.78): Promise<string> {
  if (!file.type.startsWith('image/')) throw new Error('Escolha um arquivo de imagem.');
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = () => reject(new Error('Não foi possível abrir esta imagem.'));
      i.src = url;
    });
    const scale = Math.min(1, maxSide / Math.max(img.naturalWidth, img.naturalHeight));
    const w = Math.max(1, Math.round(img.naturalWidth * scale));
    const h = Math.max(1, Math.round(img.naturalHeight * scale));
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, w, h);
    ctx.drawImage(img, 0, 0, w, h);
    return canvas.toDataURL('image/jpeg', quality);
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** Tamanho aproximado (KB) de uma imagem em data: URL. */
export function dataUrlKb(dataUrl: string): number {
  return Math.round((dataUrl.length * 3) / 4 / 1024);
}

/** Link para sugerir algo à base de todos (abre uma issue pré-preenchida no GitHub). */
export function suggestUrl(title: string, lines: string[]): string {
  const body = [...lines, '', '_Enviado pelo app SKZ Pocadex._'].join('\n');
  return `https://github.com/nexten-dev/skz-pocadex/issues/new?title=${encodeURIComponent(title)}&body=${encodeURIComponent(body)}&labels=sugest%C3%A3o`;
}
