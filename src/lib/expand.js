// Gera a lista de photocards a partir das regras de cada lançamento.
// JS puro: usado pelo app e pelos scripts em scripts/.

export function slug(s) {
  return String(s)
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9぀-ヿ一-鿿가-힯]+/g, '-')
    .replace(/^-|-$/g, '');
}

export function releaseMembers(db, r) {
  return r.members ?? db.members.filter((m) => !m.former).map((m) => m.id);
}

export function expandRelease(db, r) {
  const cards = [];
  const members = releaseMembers(db, r);
  for (const set of r.sets) {
    const versions = set.versions?.length ? set.versions : [null];
    const setMembers = set.members ?? members;
    const per = set.perMember ?? 1;
    const meta = {
      category: set.category ?? 'photocard',
      ...(set.itemType ? { itemType: set.itemType } : {}),
      ...(set.store ? { store: set.store } : {}),
      format: set.format ?? 'card',
    };
    for (const version of versions) {
      const vKey = version ? slug(version) : '_';
      for (const memberId of setMembers) {
        for (let i = 1; i <= per; i++) {
          cards.push({
            id: `${r.id}:${set.id}:${vKey}:${memberId}:${i}`,
            releaseId: r.id,
            setId: set.id,
            setName: set.name,
            version,
            memberId,
            label: per > 1 ? `#${i}` : '',
            index: i,
            ...meta,
          });
        }
      }
      for (const extra of set.extras ?? []) {
        cards.push({
          id: `${r.id}:${set.id}:${vKey}:x-${extra.id}:1`,
          releaseId: r.id,
          setId: set.id,
          setName: set.name,
          version,
          memberId: extra.members?.length === 1 ? extra.members[0] : 'group',
          label: extra.label,
          index: 1,
          ...meta,
        });
      }
    }
  }
  return cards;
}
