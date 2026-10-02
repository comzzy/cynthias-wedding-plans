import "server-only";
import { promises as fs } from "node:fs";
import path from "node:path";
import { get, list, put } from "@vercel/blob";
import type { Rsvp, Wish } from "./guests";

/**
 * Storage adapter.
 *  - Vercel Blob (private store) when BLOB_READ_WRITE_TOKEN is set: shared by every guest's device.
 *  - Local JSON files in DATA_DIR (default ./.data) otherwise, for development.
 * Every record is its own object, so two guests saving at once never overwrite each other.
 */
type Kind = "rsvps" | "wishes";

interface Store {
  name: string;
  putRecord(kind: Kind, id: string, data: unknown): Promise<void>;
  listRecords<T>(kind: Kind): Promise<T[]>;
  putAudio(id: string, data: ArrayBuffer, contentType: string): Promise<void>;
  getAudio(id: string): Promise<{ body: ReadableStream<Uint8Array> | Buffer; contentType: string } | null>;
}

const audioExt = (ct: string) => (ct.includes("mp4") ? "m4a" : ct.includes("ogg") ? "ogg" : ct.includes("mpeg") ? "mp3" : ct.includes("wav") ? "wav" : "webm");
const SAFE_ID = /^[a-z0-9-]{4,80}$/;

class BlobStore implements Store {
  name = "vercel-blob";
  access = (process.env.BLOB_ACCESS === "public" ? "public" : "private") as "public" | "private";
  async putRecord(kind: Kind, id: string, data: unknown) {
    await put(`${kind}/${id}.json`, JSON.stringify(data), {
      access: this.access, addRandomSuffix: false, allowOverwrite: true, contentType: "application/json", cacheControlMaxAge: 60,
    });
  }
  async listRecords<T>(kind: Kind): Promise<T[]> {
    const paths: string[] = [];
    let cursor: string | undefined;
    do {
      const r = await list({ prefix: `${kind}/`, cursor, limit: 1000 });
      paths.push(...r.blobs.map((b) => b.pathname).filter((p) => p.endsWith(".json")));
      cursor = r.hasMore ? r.cursor : undefined;
    } while (cursor);
    const out: T[] = [];
    for (let i = 0; i < paths.length; i += 20) {
      const batch = await Promise.all(
        paths.slice(i, i + 20).map(async (p) => {
          const g = await get(p, { access: this.access, useCache: false });
          if (!g || g.statusCode !== 200) return null;
          return JSON.parse(await new Response(g.stream).text()) as T;
        }),
      );
      out.push(...(batch.filter(Boolean) as T[]));
    }
    return out;
  }
  async putAudio(id: string, data: ArrayBuffer, contentType: string) {
    await put(`audio/${id}.${audioExt(contentType)}`, Buffer.from(data), {
      access: this.access, addRandomSuffix: false, allowOverwrite: true, contentType,
    });
  }
  async getAudio(id: string) {
    if (!SAFE_ID.test(id)) return null;
    const r = await list({ prefix: `audio/${id}.`, limit: 1 });
    const b = r.blobs[0];
    if (!b) return null;
    const g = await get(b.pathname, { access: this.access });
    if (!g || g.statusCode !== 200) return null;
    return { body: g.stream, contentType: g.blob.contentType };
  }
}

class FileStore implements Store {
  name = "local-files";
  dir = process.env.DATA_DIR || (process.env.VERCEL ? "/tmp/cwp-data" : path.join(process.cwd(), ".data"));
  async putRecord(kind: Kind, id: string, data: unknown) {
    const d = path.join(this.dir, kind);
    await fs.mkdir(d, { recursive: true });
    await fs.writeFile(path.join(d, `${id}.json`), JSON.stringify(data, null, 2));
  }
  async listRecords<T>(kind: Kind): Promise<T[]> {
    const d = path.join(this.dir, kind);
    const files = await fs.readdir(d).catch(() => [] as string[]);
    const out: T[] = [];
    for (const f of files.filter((f) => f.endsWith(".json"))) {
      try { out.push(JSON.parse(await fs.readFile(path.join(d, f), "utf8"))); } catch {}
    }
    return out;
  }
  async putAudio(id: string, data: ArrayBuffer, contentType: string) {
    const d = path.join(this.dir, "audio");
    await fs.mkdir(d, { recursive: true });
    await fs.writeFile(path.join(d, `${id}.${audioExt(contentType)}`), Buffer.from(data));
    await fs.writeFile(path.join(d, `${id}.type`), contentType);
  }
  async getAudio(id: string) {
    if (!SAFE_ID.test(id)) return null;
    const d = path.join(this.dir, "audio");
    const ct = await fs.readFile(path.join(d, `${id}.type`), "utf8").catch(() => null);
    if (!ct) return null;
    const body = await fs.readFile(path.join(d, `${id}.${audioExt(ct)}`)).catch(() => null);
    return body ? { body, contentType: ct } : null;
  }
}

let store: Store | null = null;
export function getStore(): Store {
  if (!store) store = process.env.BLOB_READ_WRITE_TOKEN ? new BlobStore() : new FileStore();
  return store;
}

export const newId = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;

export const saveRsvp = (r: Rsvp) => getStore().putRecord("rsvps", r.id, r);
export const listRsvps = () => getStore().listRecords<Rsvp>("rsvps");
export const saveWish = (w: Wish) => getStore().putRecord("wishes", w.id, w);
export const listWishes = async () =>
  (await getStore().listRecords<Wish>("wishes")).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
