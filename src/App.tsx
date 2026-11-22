import { useCallback, useEffect, useMemo, useState } from 'react';
import { expandRelease, syncDatabase, type SyncResult } from './lib/data';
import { useCollection } from './lib/collection';
import { useCustomImages } from './lib/images';
import type { Database, ItemCategory, Photocard } from './lib/types';
import { useVisibleCategories, useVisibleMembers } from './lib/categories';
import { providerInfo, reconnect, useCloud } from './lib/cloud';
import { getSaveError, useProfile } from './lib/profile';
import { LoginView } from './views/LoginView';
import { ItemsView } from './views/ItemsView';
import { usePwa } from './lib/pwa';
import { HomeView } from './views/HomeView';
import { ReleaseView } from './views/ReleaseView';
import { StatsView } from './views/StatsView';
import { SettingsView } from './views/SettingsView';
import { TemplatesView } from './views/TemplatesView';

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
  /** Itens visíveis (respeitando as categorias escolhidas), por lançamento. */
  byRelease: Map<string, Photocard[]>;
  /** Todos os itens do lançamento, independente das categorias escolhidas. */
  byReleaseAll: Map<string, Photocard[]>;
  /** Todos os itens da base, por ID. */
  byId: Map<string, Photocard>;
  /** Itens visíveis da base inteira. */
  all: Photocard[];
  visible: ItemCategory[];
}

function buildFullIndex(db: Database) {
  const byReleaseAll = new Map<string, Photocard[]>();
  const byId = new Map<string, Photocard>();
  for (const r of db.releases) {
    const cards = expandRelease(db, r);
    byReleaseAll.set(r.id, cards);
    for (const c of cards) byId.set(c.id, c);
  }
  return { byReleaseAll, byId };
}

function filterIndex(full: ReturnType<typeof buildFullIndex>, visible: ItemCategory[], members: string[] | null): CardIndex {
  const show = new Set(visible);
  const who = members ? new Set(members) : null;
  const byRelease = new Map<string, Photocard[]>();
  const all: Photocard[] = [];
  for (const [id, cards] of full.byReleaseAll) {
    const list = cards.filter((c) => show.has(c.category) && (!who || who.has(c.memberId)));
    byRelease.set(id, list);
    all.push(...list);
  }
  return { ...full, byRelease, all, visible };
}

export function App() {
  const route = useHashRoute();
  const pwa = usePwa();
  const [sync, setSync] = useState<SyncResult | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const { collection, setStatus, setQty, migrateIds } = useCollection();
  const { custom: customImages, setImage: setCustomImage } = useCustomImages();
  const cloud = useCloud();
  useProfile(); // re-renderiza quando o arquivo pessoal muda
  // A tela de login aparece a cada abertura do app (até a pessoa entrar ou escolher visitante)
  const [entered, setEntered] = useState(false);

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

  // Cards que mudaram de ID na base: leva junto as marcações e imagens escolhidas
  useEffect(() => {
    if (!db?.idMigrations) return;
    migrateIds(db.idMigrations);
  }, [db, migrateIds]);
  const { visible, toggle: toggleCategory, setVisible: setVisibleCategories } = useVisibleCategories();
  const fullIndex = useMemo(() => (db ? buildFullIndex(db) : null), [db]);
  const { members: visibleMembers } = useVisibleMembers();
  const index = useMemo(
    () => (fullIndex ? filterIndex(fullIndex, visible, visibleMembers) : null),
    [fullIndex, visible, visibleMembers],
  );

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
    const props = {
      db,
      index,
      collection,
      setStatus,
      setQty,
      customImages,
      setCustomImage,
      toggleCategory,
      setVisibleCategories,
    };
    if (page === 'release' && param) content = <ReleaseView {...props} releaseId={decodeURIComponent(param)} />;
    else if (page === 'stats') content = <StatsView {...props} />;
    else if (page === 'templates') content = <TemplatesView {...props} />;
    else if (page === 'itens') content = <ItemsView {...props} />;
    else if (page === 'settings')
      content = <SettingsView {...props} sync={sync} onSync={() => runSync(true)} onToast={setToast} />;
    else content = <HomeView {...props} />;
  }

  const page = route[0] ?? '';
  if (!entered) return <LoginView onDone={() => setEntered(true)} />;
  const saveError = getSaveError();
  return (
    <div className="app">
      {cloud.session && cloud.session.mode !== 'guest' && cloud.status === 'reconnect' && (
        <div className="cloud-banner" role="status">
          <span>
            <span className="cloud-dot reconnect" />
            Sincronização com o {providerInfo(cloud.session.mode)?.storageName} pausada.
          </span>
          <button className="btn small primary" onClick={() => reconnect().catch(() => {})}>
            Reconectar
          </button>
        </div>
      )}
      {saveError && (
        <div className="cloud-banner" role="alert">
          <span>⚠ {saveError}</span>
        </div>
      )}
      <header className="topbar">
        <a href="#/" className="brand">
          <span className="logo">SKZ</span>
          <span>Pocadex</span>
        </a>
        <nav>
          <a href="#/" className={page === '' || page === 'release' ? 'active' : ''}>
            <span className="nav-long">Lançamentos</span>
            <span className="nav-short">Álbuns</span>
          </a>
          <a href="#/stats" className={page === 'stats' ? 'active' : ''}>
            <span className="nav-long">Minha coleção</span>
            <span className="nav-short">Coleção</span>
          </a>
          <a href="#/itens" className={page === 'itens' ? 'active' : ''}>
            <span className="nav-long">Meus itens</span>
            <span className="nav-short">Itens</span>
          </a>
          <a href="#/templates" className={page === 'templates' ? 'active' : ''}>
            Templates
          </a>
          <a href="#/settings" className={page === 'settings' ? 'active' : ''} aria-label="Configurações">
            {cloud.session && cloud.session.mode !== 'guest' && <span className={`cloud-dot ${cloud.status}`} />}⚙︎
          </a>
        </nav>
      </header>
      <main>{content}</main>
      <footer className="footer muted small">
        SKZ Pocadex v{__APP_VERSION__}
        {db && <> · base {db.dataVersion}</>}
        {sync?.status === 'offline' && <> · offline</>} · projeto de fã, sem afiliação com JYP Entertainment
      </footer>
      {pwa.updateReady && (
        <div className="update-banner" role="status">
          <span>Nova versão do app disponível.</span>
          <button className="btn small primary" onClick={pwa.applyUpdate}>
            Atualizar
          </button>
        </div>
      )}
      {toast && (
        <div className="toast" role="status" onClick={() => setToast(null)}>
          {toast}
        </div>
      )}
    </div>
  );
}
