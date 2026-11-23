import { useEffect, useRef, useState } from 'react';
import { setCardNote, useProfile } from '../lib/profile';

/** Campos de compra do card: CEG (dealer) e link da planilha de pagamento. */
export function PurchaseFields({ cardId }: { cardId: string }) {
  const saved = useProfile().notes[cardId];
  const [ceg, setCeg] = useState(saved?.ceg ?? '');
  const [sheet, setSheet] = useState(saved?.sheet ?? '');
  const latest = useRef({ ceg, sheet });
  latest.current = { ceg, sheet };

  // Atualiza se mudar em outro aparelho (sincronização)
  useEffect(() => {
    setCeg(saved?.ceg ?? '');
    setSheet(saved?.sheet ?? '');
  }, [saved?.t]); // eslint-disable-line react-hooks/exhaustive-deps

  // Salva ao sair do campo e ao fechar a janela
  const save = () => setCardNote(cardId, latest.current);
  useEffect(() => () => setCardNote(cardId, latest.current), [cardId]);

  const sheetOk = /^https?:\/\/\S+$/i.test(sheet.trim());

  return (
    <section className="purchase-fields">
      <h3>🧾 Compra</h3>
      <label>
        CEG
        <input
          type="text"
          value={ceg}
          maxLength={120}
          placeholder="Nome da dealer"
          onChange={(e) => setCeg(e.target.value)}
          onBlur={save}
          onKeyDown={(e) => e.key === 'Enter' && (e.currentTarget.blur(), e.preventDefault())}
        />
      </label>
      <label>
        Planilha de pagamento
        <span className="row sheet-row">
          <input
            type="url"
            value={sheet}
            placeholder="https://… (link da planilha)"
            onChange={(e) => setSheet(e.target.value)}
            onBlur={save}
            onKeyDown={(e) => e.key === 'Enter' && (e.currentTarget.blur(), e.preventDefault())}
          />
          {sheetOk && (
            <a className="btn small" href={sheet.trim()} target="_blank" rel="noreferrer">
              Abrir
            </a>
          )}
        </span>
      </label>
      {sheet.trim() && !sheetOk && <p className="small login-error">O link precisa começar com https://</p>}
    </section>
  );
}
