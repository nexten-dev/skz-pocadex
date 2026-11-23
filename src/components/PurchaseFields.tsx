import { useEffect, useRef, useState } from 'react';
import { NOTE_FIELDS, setCardNote, useProfile } from '../lib/profile';

type Fields = Record<(typeof NOTE_FIELDS)[number], string>;

const TEXT_FIELDS: { key: 'ceg' | 'dealer' | 'itemset'; label: string; placeholder: string; list: string }[] = [
  { key: 'ceg', label: 'CEG', placeholder: 'Nome da CEG', list: 'opts-ceg' },
  { key: 'dealer', label: 'Dealer', placeholder: 'Nome da dealer', list: 'opts-dealer' },
  { key: 'itemset', label: 'Item/SET', placeholder: 'Ex.: Set Soundwave, Lucky draw 2…', list: 'opts-itemset' },
];

/** Campos de compra do card: CEG, Dealer, Item/SET e link da planilha da CEG. */
export function PurchaseFields({ cardId }: { cardId: string }) {
  const profile = useProfile();
  const saved = profile.notes[cardId];
  const fromSaved = (): Fields => ({ ceg: saved?.ceg ?? '', dealer: saved?.dealer ?? '', itemset: saved?.itemset ?? '', sheet: saved?.sheet ?? '' });
  const [f, setF] = useState<Fields>(fromSaved);
  const latest = useRef(f);
  latest.current = f;

  // Atualiza se mudar em outro aparelho (sincronização)
  useEffect(() => setF(fromSaved()), [saved?.t]); // eslint-disable-line react-hooks/exhaustive-deps

  // Salva ao sair do campo e ao fechar a janela
  const save = () => setCardNote(cardId, latest.current);
  useEffect(() => () => setCardNote(cardId, latest.current), [cardId]);

  // Sugestões com o que você já digitou em outros cards
  const known = (key: keyof Fields) =>
    [...new Set(Object.values(profile.notes).map((n) => n[key]).filter((v): v is string => !!v))].sort((a, b) => a.localeCompare(b));

  const sheetOk = /^https?:\/\/\S+$/i.test(f.sheet.trim());
  const enterBlurs = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      e.currentTarget.blur();
    }
  };

  return (
    <section className="purchase-fields">
      <h3>🧾 Compra</h3>
      {TEXT_FIELDS.map((t) => (
        <label key={t.key}>
          {t.label}
          <input
            type="text"
            value={f[t.key]}
            maxLength={120}
            placeholder={t.placeholder}
            list={t.list}
            data-field={t.key}
            onChange={(e) => setF({ ...f, [t.key]: e.target.value })}
            onBlur={save}
            onKeyDown={enterBlurs}
          />
          <datalist id={t.list}>
            {known(t.key).map((v) => (
              <option key={v} value={v} />
            ))}
          </datalist>
        </label>
      ))}
      <label>
        Planilha CEG
        <span className="row sheet-row">
          <input
            type="url"
            value={f.sheet}
            placeholder="https://… (link da planilha da CEG)"
            data-field="sheet"
            onChange={(e) => setF({ ...f, sheet: e.target.value })}
            onBlur={save}
            onKeyDown={enterBlurs}
          />
          {sheetOk && (
            <a className="btn small" href={f.sheet.trim()} target="_blank" rel="noreferrer">
              Abrir
            </a>
          )}
        </span>
      </label>
      {f.sheet.trim() && !sheetOk && <p className="small login-error">O link precisa começar com https://</p>}
    </section>
  );
}
