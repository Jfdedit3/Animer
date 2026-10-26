/** Local compatibility layer for the library APIs. No account, token or network. */
export const LOCAL_USER = {
  id: "local-browser",
  is_anonymous: false,
  user_metadata: { full_name: "Ma bibliothèque" },
};
export const LOCAL_SESSION = { user: LOCAL_USER };
export const DATABASE_KEY = "animer:library:v1";
const TABLES = [
  "favorites",
  "anime_lists",
  "episode_progress",
  "scan_progress",
];
function read() {
  const raw = localStorage.getItem(DATABASE_KEY);
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch {
    throw new Error(
      "Sauvegarde locale illisible. Exportez-la avant de la réinitialiser.",
    );
  }
}
function write(db) {
  localStorage.setItem(DATABASE_KEY, JSON.stringify(db));
}
export function exportLocalData() {
  return {
    app: "animer-local",
    version: 1,
    exportedAt: new Date().toISOString(),
    tables: read(),
  };
}
export function importLocalData(value) {
  if (
    value?.app !== "animer-local" ||
    value.version !== 1 ||
    !value.tables ||
    typeof value.tables !== "object"
  )
    throw new Error("Fichier de sauvegarde invalide.");
  const next = {};
  for (const table of TABLES) {
    const rows = value.tables[table] || [];
    if (
      !Array.isArray(rows) ||
      rows.length > 20000 ||
      rows.some(
        (row) =>
          !row ||
          typeof row !== "object" ||
          Array.isArray(row) ||
          typeof row.anime_slug !== "string",
      )
    )
      throw new Error("Contenu de sauvegarde invalide.");
    next[table] = rows;
  }
  write(next);
  // Imported progress is authoritative; discard older per-player checkpoint mirrors.
  for (let i = localStorage.length - 1; i >= 0; i--) {
    const key = localStorage.key(i);
    if (key?.startsWith("yoru:resume:")) localStorage.removeItem(key);
  }
}
export function clearLocalData() {
  localStorage.removeItem(DATABASE_KEY);
}
class Query {
  constructor(table) {
    this.table = table;
    this.filters = [];
    this.orders = [];
    this.action = "select";
    this.one = false;
    this.start = 0;
    this.end = Infinity;
  }
  select() {
    return this;
  }
  eq(k, v) {
    this.filters.push((r) => r[k] === v);
    return this;
  }
  in(k, v) {
    this.filters.push((r) => v.includes(r[k]));
    return this;
  }
  is(k, v) {
    return this.eq(k, v);
  }
  order(k, { ascending = true, nullsFirst = false } = {}) {
    this.orders.push({ k, ascending, nullsFirst });
    return this;
  }
  limit(n) {
    this.end = n - 1;
    return this;
  }
  range(a, b) {
    this.start = a;
    this.end = b;
    return this;
  }
  maybeSingle() {
    this.one = true;
    return this;
  }
  single() {
    this.one = true;
    return this;
  }
  abortSignal() {
    return this;
  }
  upsert(value, { onConflict = "user_id,anime_slug" } = {}) {
    this.action = "upsert";
    this.value = Array.isArray(value) ? value : [value];
    this.keys = onConflict.split(",");
    return this;
  }
  insert(value) {
    this.action = "insert";
    this.value = Array.isArray(value) ? value : [value];
    return this;
  }
  update(value) {
    this.action = "update";
    this.value = value;
    return this;
  }
  delete() {
    this.action = "delete";
    return this;
  }
  execute() {
    try {
      const db = read();
      let rows = Array.isArray(db[this.table]) ? db[this.table] : [];
      const match = (r) => this.filters.every((f) => f(r));
      const now = new Date().toISOString();
      if (this.action === "upsert" || this.action === "insert")
        for (const value of this.value) {
          const i =
            this.action === "upsert"
              ? rows.findIndex((r) => this.keys.every((k) => r[k] === value[k]))
              : -1;
          const row = {
            added_at: now,
            updated_at: now,
            hidden_from_resume: false,
            media_type: "anime",
            ...(i >= 0 ? rows[i] : {}),
            ...value,
          };
          if (i >= 0) rows[i] = row;
          else rows.push(row);
        }
      if (this.action === "update")
        rows = rows.map((r) =>
          match(r) ? { ...r, ...this.value, updated_at: now } : r,
        );
      if (this.action === "delete") rows = rows.filter((r) => !match(r));
      if (this.action !== "select") {
        if (!TABLES.includes(this.table))
          throw new Error("Fonction en ligne indisponible.");
        db[this.table] = rows;
        write(db);
      }
      let result = rows.filter(match);
      result.sort((a, b) => {
        for (const { k, ascending, nullsFirst } of this.orders) {
          if (a[k] === b[k]) continue;
          if (a[k] == null) return nullsFirst ? -1 : 1;
          if (b[k] == null) return nullsFirst ? 1 : -1;
          return (a[k] < b[k] ? -1 : 1) * (ascending ? 1 : -1);
        }
        return 0;
      });
      result = result.slice(this.start, this.end + 1);
      return { data: this.one ? result[0] || null : result, error: null };
    } catch (error) {
      return { data: null, error };
    }
  }
  then(resolve, reject) {
    return Promise.resolve(this.execute()).then(resolve, reject);
  }
}
async function rpc(name, p = {}) {
  try {
    if (name === "set_anime_status")
      return await new Query("anime_lists").upsert({
        user_id: LOCAL_USER.id,
        anime_slug: p.p_slug,
        status: p.p_status,
        anime_title: p.p_title,
        anime_cover: p.p_cover,
        started_at:
          p.p_status === "watching"
            ? new Date().toISOString().slice(0, 10)
            : null,
        completed_at:
          p.p_status === "completed"
            ? new Date().toISOString().slice(0, 10)
            : null,
      });
    if (name === "set_anime_list_dates")
      return await new Query("anime_lists")
        .update({ started_at: p.p_started_at, completed_at: p.p_completed_at })
        .eq("anime_slug", p.p_slug);
    if (name === "reorder_favorites" || name === "reorder_anime_list") {
      for (const [index, slug] of (p.p_slugs || []).entries()) {
        const result = await new Query(
          name === "reorder_favorites" ? "favorites" : "anime_lists",
        )
          .update({ sort_order: index })
          .eq("anime_slug", slug);
        if (result.error) return result;
      }
      return { data: null, error: null };
    }
    if (name === "watch_tick") {
      const pct =
        p.p_duration > 0
          ? Math.min(100, (p.p_position / p.p_duration) * 100)
          : 0;
      return await new Query("episode_progress").upsert(
        {
          user_id: LOCAL_USER.id,
          episode_key: p.p_episode_key,
          anime_slug: p.p_slug,
          anime_title: p.p_title,
          anime_cover: p.p_cover,
          season_id: p.p_season_id,
          episode_number: p.p_episode_number,
          language: p.p_language,
          position_seconds: p.p_position,
          duration: p.p_duration,
          progress_percent: pct,
          completed: pct >= 90,
        },
        { onConflict: "user_id,episode_key" },
      );
    }
    if (name === "heartbeat_watch" || name === "log_client_event")
      return { data: null, error: null };
    return {
      data: null,
      error: new Error(
        "Cette fonction nécessite un service en ligne et est désactivée.",
      ),
    };
  } catch (error) {
    return { data: null, error };
  }
}
export const localClient = {
  from: (table) => new Query(table),
  rpc,
  auth: {
    getSession: async () => ({ data: { session: LOCAL_SESSION }, error: null }),
    getUser: async () => ({ data: { user: LOCAL_USER }, error: null }),
    onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }),
  },
};
