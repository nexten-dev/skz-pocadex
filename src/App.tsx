import { useCallback, useEffect, useMemo, useState } from 'react';
import { expandRelease, syncDatabase, type SyncResult } from './lib/data';
import { useCollection } from './lib/collection';
import type { Database, Photocard } from './lib/types';
import { HomeView } from './views/HomeView';
import { ReleaseView } from './views/ReleaseView';
import { StatsView } from './views/StatsView';
import { SettingsView } from './views/SettingsView';

function useHashRoute() {
  const get = () => window.location.hash.replace(/^#\/?/, '').split('/').filter(Boolean);
  const [route, setRoute] = useState<string[]>(get);
  useEffect(() => {
    const on = () => {
      setRoute(get());
      window.scrollTo(0, 0);
    };
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);
  return route;
}

export interface CardIndex {
  byRelease: Map<string, Photocard[]>;
  byId: Map<string, Photocard>;
  all: Photocard[];
}

function buildIndex(db: Database): CardIndex {
  const byRelease = new Map<string, Photocard[]>();
  const byId = new Map<string, Photocard>();
  const all: Photocard[] = [];
  for (const r of db.releases) {
    const cards = expandRelease(db, r);
    byRelease.set(r.id, cards);
    for (const c of cards) {
      byId.set(c.id, c);
      all.push(c);
    }
  }
  return { byRelease, byId, all };
}

export function App() {
  const route = useHashRoute();
  const [sync, setSync] = useState<SyncResult | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const { collection, setStatus, setQty, replace } = useCollection();

  const runSync = useCallback(async (manual = false) => {
    const result = await syncDatabase();
    setSync(result);
    if (result.status === 'updated') {
      setToast(
        result.from
          ? `Base de dados atualizada: ${result.from} → ${result.db.dataVersion}`
          : `Base de dados carregada (${result.db.dataVersion})`,
      );
    } else if (result.status === 'offline') {
      setToast('Sem conexão — usando a base salva no aparelho');
    } else if (manual && result.status === 'current') {
      setToast('A base de dados já está na versão mais recente');
    }
  }, []);

  useEffect(() => {
    runSync();
  }, [runSync]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(t);
  }, [toast]);

  const db = sync?.db ?? null;
  const index = useMemo(() => (db ? buildIndex(db) : null), [db]);

  let content: React.ReactNode;
  if (!sync) {
    content = <div className="center muted">Buscando a base de dados mais recente…</div>;
  } else if (!db || !index) {
    content = (
      <div className="center">
        <p>Não foi possível carregar a base de dados.</p>
        <p className="muted small">{sync.status === 'error' ? sync.error : ''}</p>
        <button className="btn primary" onClick={() => runSync(true)}>
          Tentar novamente
        </button>
      </div>
    );
  } else {
    const [page, param] = route;
    const props = { db, index, collection, setStatus, setQty };
    if (page === 'release' && param) content = <ReleaseView {...props} releaseId={decodeURIComponent(param)} />;
    else if (page === 'stats') content = <StatsView {...props} />;
    else if (page === 'settings')
      content = (
        <SettingsView
          {...props}
          sync={sync}
          onSync={() => runSync(true)}
          onReplace={(c) => {
            replace(c);
            setToast('Backup importado');
          }}
        />
      );
    else content = <HomeView {...props} />;
  }

  const page = route[0] ?? '';
  return (
    <div className="app">
      <header className="topbar">
        <a href="#/" className="brand">
          <span className="logo">SKZ</span>
          <span>Pocadex</span>
        </a>
        <nav>
          <a href="#/" className={page === '' || page === 'release' ? 'active' : ''}>
            Lançamentos
          </a>
          <a href="#/stats" className={page === 'stats' ? 'active' : ''}>
            Minha coleção
          </a>
          <a href="#/settings" className={page === 'settings' ? 'active' : ''} aria-label="Configurações">
            ⚙︎
          </a>
        </nav>
      </header>
      <main>{content}</main>
      <footer className="footer muted small">
        SKZ Pocadex v{__APP_VERSION__}
        {db && <> · base {db.dataVersion}</>}
        {sync?.status === 'offline' && <> · offline</>} · projeto de fã, sem afiliação com JYP Entertainment
      </footer>
      {toast && (
        <div className="toast" role="status" onClick={() => setToast(null)}>
          {toast}
        </div>
      )}
    </div>
  );
}
