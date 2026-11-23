import { useEffect, useRef, useState } from 'react';
import { dataUrlKb, photoToDataUrl } from '../lib/photo';

/**
 * Botões para escolher uma foto: do aparelho (galeria/câmera, reduzida), colando da
 * área de transferência (botão ou Ctrl+V) ou por link. Chama onPick com a URL final (data: ou https:).
 */
export function PhotoPicker({
  onPick,
  maxSide = 480,
  allowLink = true,
  label = '📷 Enviar foto do aparelho',
}: {
  onPick: (url: string) => void;
  maxSide?: number;
  allowLink?: boolean;
  label?: string;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [link, setLink] = useState('');
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  /** Reduz e salva uma imagem (arquivo escolhido ou colado). */
  const handleImage = async (blob: Blob, origem: string) => {
    setBusy(true);
    setMsg(null);
    try {
      const file = blob instanceof File ? blob : new File([blob], 'colada', { type: blob.type || 'image/png' });
      const url = await photoToDataUrl(file, maxSide);
      onPick(url);
      setMsg(`Foto ${origem} salva (${dataUrlKb(url)} KB).`);
    } catch (err) {
      setMsg((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  /** Usa um texto colado se for um link de imagem. */
  const handleText = (text: string) => {
    const url = text.trim();
    if (/^https?:\/\/\S+$/i.test(url)) {
      onPick(url);
      setMsg('Link colado salvo.');
      return true;
    }
    return false;
  };

  /** Botão "Colar foto": lê a área de transferência (pede permissão em alguns navegadores). */
  const pasteFromClipboard = async () => {
    setMsg(null);
    try {
      if (navigator.clipboard?.read) {
        const items = await navigator.clipboard.read();
        for (const item of items) {
          const type = item.types.find((t) => t.startsWith('image/'));
          if (type) return void (await handleImage(await item.getType(type), 'colada'));
        }
        for (const item of items) {
          if (item.types.includes('text/plain')) {
            const text = await (await item.getType('text/plain')).text();
            if (handleText(text)) return;
          }
        }
        return setMsg('Não há imagem copiada. Copie a foto (segure o dedo nela → Copiar) e tente de novo.');
      }
      if (navigator.clipboard?.readText && handleText(await navigator.clipboard.readText())) return;
      setMsg('Este navegador não deixa ler a área de transferência por botão. No computador, use Ctrl+V (ou ⌘+V).');
    } catch {
      setMsg('O navegador não permitiu colar. Toque em “Permitir”/“Colar” se ele perguntar, ou use Ctrl+V no computador.');
    }
  };

  // Ctrl+V / ⌘+V com este painel aberto (fora de campos de texto)
  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && /^(INPUT|TEXTAREA)$/.test(target.tagName) && !(target as HTMLInputElement).dataset.pasteImage) return;
      const files = [...(e.clipboardData?.items ?? [])].filter((i) => i.kind === 'file' && i.type.startsWith('image/'));
      const blob = files[0]?.getAsFile();
      if (blob) {
        e.preventDefault();
        void handleImage(blob, 'colada');
        return;
      }
      const text = e.clipboardData?.getData('text/plain');
      if (text && handleText(text)) e.preventDefault();
    };
    document.addEventListener('paste', onPaste);
    return () => document.removeEventListener('paste', onPaste);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [maxSide, onPick]);

  const applyLink = () => {
    const url = link.trim();
    if (!/^https?:\/\//i.test(url)) return setMsg('Cole um link que comece com https://');
    onPick(url);
    setLink('');
    setMsg('Link salvo.');
  };

  return (
    <div className="photo-picker">
      <div className="row">
        <button type="button" className="btn primary" disabled={busy} onClick={() => fileRef.current?.click()}>
          {busy ? 'Preparando foto…' : label}
        </button>
        <button type="button" className="btn" disabled={busy} onClick={pasteFromClipboard} title="Colar uma foto copiada (ou use Ctrl+V)">
          📋 Colar foto
        </button>
      </div>
      <p className="small muted paste-hint">Dica: copie a foto em qualquer app ou site e toque em “Colar foto” (no computador, Ctrl+V também funciona).</p>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        hidden
        onChange={async (e) => {
          const f = e.target.files?.[0];
          e.target.value = '';
          if (f) await handleImage(f, 'enviada');
        }}
      />
      {/* Sem <form>: este componente fica dentro de outros formulários */}
      {allowLink && (
        <div className="row">
          <input
            type="url"
            placeholder="…ou cole o link de uma imagem (https://…)"
            data-paste-image="1"
            value={link}
            onChange={(e) => setLink(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                applyLink();
              }
            }}
          />
          <button className="btn small" type="button" onClick={applyLink}>
            Usar link
          </button>
        </div>
      )}
      {msg && <p className="small muted">{msg}</p>}
    </div>
  );
}
