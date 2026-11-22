import { useRef, useState } from 'react';
import { dataUrlKb, photoToDataUrl } from '../lib/photo';

/**
 * Botões para escolher uma foto: do aparelho (galeria/câmera, reduzida) ou por link.
 * Chama onPick com a URL final (data: ou https:).
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
  const applyLink = () => {
    const url = link.trim();
    if (!/^https?:\/\//i.test(url)) return setMsg('Cole um link que comece com https://');
    onPick(url);
    setLink('');
    setMsg('Link salvo.');
  };

  return (
    <div className="photo-picker">
      <button type="button" className="btn primary" disabled={busy} onClick={() => fileRef.current?.click()}>
        {busy ? 'Preparando foto…' : label}
      </button>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        hidden
        onChange={async (e) => {
          const f = e.target.files?.[0];
          e.target.value = '';
          if (!f) return;
          setBusy(true);
          setMsg(null);
          try {
            const url = await photoToDataUrl(f, maxSide);
            onPick(url);
            setMsg(`Foto salva (${dataUrlKb(url)} KB).`);
          } catch (err) {
            setMsg((err as Error).message);
          } finally {
            setBusy(false);
          }
        }}
      />
      {/* Sem <form>: este componente fica dentro de outros formulários */}
      {allowLink && (
        <div className="row">
          <input
            type="url"
            placeholder="…ou cole o link de uma imagem (https://…)"
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
