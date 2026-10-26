import test from "node:test";
import assert from "node:assert/strict";
import {
  localClient,
  DATABASE_KEY,
  LOCAL_USER,
  exportLocalData,
  importLocalData,
} from "../src/local/database.js";
const memory = new Map();
globalThis.localStorage = {
  getItem: (k) => memory.get(k) ?? null,
  setItem: (k, v) => memory.set(k, String(v)),
  removeItem: (k) => memory.delete(k),
};
test("local library survives client recreation and supports favorites, lists, progress and removal", async () => {
  memory.clear();
  const user_id = LOCAL_USER.id;
  let result = await localClient
    .from("favorites")
    .upsert({ user_id, anime_slug: "mal-1", anime_title: "Test" });
  assert.equal(result.error, null);
  assert.equal(
    (
      await localClient
        .from("favorites")
        .select()
        .eq("anime_slug", "mal-1")
        .maybeSingle()
    ).data.anime_title,
    "Test",
  );
  await localClient.rpc("set_anime_status", {
    p_slug: "mal-1",
    p_status: "planned",
    p_title: "Test",
  });
  await localClient.rpc("watch_tick", {
    p_slug: "mal-1",
    p_episode_key: "mal-1:s1:1:vostfr",
    p_season_id: "s1",
    p_episode_number: 1,
    p_position: 600,
    p_duration: 1200,
  });
  assert.equal(
    (await localClient.from("episode_progress").select()).data[0]
      .progress_percent,
    50,
  );
  const copy = exportLocalData();
  assert.equal(copy.tables.anime_lists[0].status, "planned");
  memory.clear();
  importLocalData(copy);
  assert.equal((await localClient.from("favorites").select()).data.length, 1);
  await localClient.from("favorites").delete().eq("anime_slug", "mal-1");
  assert.equal((await localClient.from("favorites").select()).data.length, 0);
  const session = await localClient.auth.getSession();
  assert.equal(session.data.session.access_token, undefined);
});
test("local import rejects invalid backup before modifying the existing library", () => {
  const before = localStorage.getItem(DATABASE_KEY);
  for (const input of [
    {},
    { app: "animer-local", version: 1, tables: { favorites: "invalid" } },
    {
      app: "animer-local",
      version: 1,
      tables: { favorites: [{ anime_title: "missing slug" }] },
    },
  ])
    assert.throws(() => importLocalData(input));
  assert.equal(localStorage.getItem(DATABASE_KEY), before);
});
test("a full or unavailable local storage returns a write error instead of pretending a save succeeded", async () => {
  const set = localStorage.setItem;
  localStorage.setItem = () => {
    throw new Error("QuotaExceeded");
  };
  try {
    const result = await localClient
      .from("favorites")
      .upsert({ anime_slug: "x" });
    assert.match(result.error.message, /QuotaExceeded/);
  } finally {
    localStorage.setItem = set;
  }
});

test('bundled fallback contains attributed real catalogue records with stable unique library keys',async()=>{
 const {readFile}=await import('node:fs/promises');
 const data=JSON.parse(await readFile(new URL('../public/data/catalog.json',import.meta.url),'utf8'));
 assert.match(data.source,/manami-project/);assert.match(data.license,/ODbL/);assert.ok(data.items.length>24&&data.items.length<=500);
 assert.equal(new Set(data.items.map(a=>a.slug)).size,data.items.length);
 assert.ok(data.items.every(a=>/^mal-\d+$/.test(a.slug)&&a.title&&a.url.startsWith('https://myanimelist.net/anime/')));
});
