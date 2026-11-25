// src/server/router.ts
import { createHash as createHash2 } from "node:crypto";

// src/server/codes.ts
import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

// src/server/schema.ts
var SCHEMA_VERSION = 1;
var FREE_CODES = 3;
var SLUG_LENGTH = 7;
var SLUG_ALPHABET = "23456789abcdefghjkmnpqrstuvwxyz";
var MAX_URL_LENGTH = 2048;

// node_modules/@upstash/redis/chunk-HJPPKKDO.mjs
var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var error_exports = {};
__export(error_exports, {
  UpstashError: () => UpstashError,
  UpstashJSONParseError: () => UpstashJSONParseError,
  UrlError: () => UrlError
});
var UpstashError = class extends Error {
  constructor(message, options) {
    super(message, options);
    this.name = "UpstashError";
  }
};
var UrlError = class extends Error {
  constructor(url) {
    super(
      `Upstash Redis client was passed an invalid URL. You should pass a URL starting with https. Received: "${url}". `
    );
    this.name = "UrlError";
  }
};
var UpstashJSONParseError = class extends UpstashError {
  constructor(body, options) {
    const truncatedBody = body.length > 200 ? body.slice(0, 200) + "..." : body;
    super(`Unable to parse response body: ${truncatedBody}`, options);
    this.name = "UpstashJSONParseError";
  }
};
var MAX_BUFFER_SIZE = 1024 * 1024;

// node_modules/@upstash/redis/nodejs.mjs
var BUILD = /* @__PURE__ */ Symbol("build");
var TextFieldBuilder = class _TextFieldBuilder {
  _noTokenize;
  _noStem;
  _from;
  constructor(noTokenize = { noTokenize: false }, noStem = { noStem: false }, from = { from: null }) {
    this._noTokenize = noTokenize;
    this._noStem = noStem;
    this._from = from;
  }
  noTokenize() {
    return new _TextFieldBuilder({ noTokenize: true }, this._noStem, this._from);
  }
  noStem() {
    return new _TextFieldBuilder(this._noTokenize, { noStem: true }, this._from);
  }
  from(field) {
    return new _TextFieldBuilder(this._noTokenize, this._noStem, { from: field });
  }
  [BUILD]() {
    return {
      type: "TEXT",
      ...this._noTokenize.noTokenize ? { noTokenize: true } : {},
      ...this._noStem.noStem ? { noStem: true } : {},
      ...this._from.from ? { from: this._from.from } : {}
    };
  }
};
var NumericFieldBuilder = class _NumericFieldBuilder {
  type;
  _from;
  constructor(type, from = { from: null }) {
    this.type = type;
    this._from = from;
  }
  from(field) {
    return new _NumericFieldBuilder(this.type, { from: field });
  }
  [BUILD]() {
    return this._from.from ? {
      type: this.type,
      fast: true,
      from: this._from.from
    } : {
      type: this.type,
      fast: true
    };
  }
};
var BoolFieldBuilder = class _BoolFieldBuilder {
  _fast;
  _from;
  constructor(fast = { fast: false }, from = { from: null }) {
    this._fast = fast;
    this._from = from;
  }
  fast() {
    return new _BoolFieldBuilder({ fast: true }, this._from);
  }
  from(field) {
    return new _BoolFieldBuilder(this._fast, { from: field });
  }
  [BUILD]() {
    const hasFast = this._fast.fast;
    const hasFrom = Boolean(this._from.from);
    if (hasFast && hasFrom) {
      return {
        type: "BOOL",
        fast: true,
        from: this._from.from
      };
    }
    if (hasFast) {
      return {
        type: "BOOL",
        fast: true
      };
    }
    if (hasFrom) {
      return {
        type: "BOOL",
        from: this._from.from
      };
    }
    return { type: "BOOL" };
  }
};
var DateFieldBuilder = class _DateFieldBuilder {
  _fast;
  _from;
  constructor(fast = { fast: false }, from = { from: null }) {
    this._fast = fast;
    this._from = from;
  }
  fast() {
    return new _DateFieldBuilder({ fast: true }, this._from);
  }
  from(field) {
    return new _DateFieldBuilder(this._fast, { from: field });
  }
  [BUILD]() {
    const hasFast = this._fast.fast;
    const hasFrom = Boolean(this._from.from);
    if (hasFast && hasFrom) {
      return {
        type: "DATE",
        fast: true,
        from: this._from.from
      };
    }
    if (hasFast) {
      return {
        type: "DATE",
        fast: true
      };
    }
    if (hasFrom) {
      return {
        type: "DATE",
        from: this._from.from
      };
    }
    return { type: "DATE" };
  }
};
var HybridFieldBuilder = class _HybridFieldBuilder {
  _noStem;
  _from;
  constructor(noStem = { noStem: false }, from = { from: null }) {
    this._noStem = noStem;
    this._from = from;
  }
  noStem() {
    return new _HybridFieldBuilder({ noStem: true }, this._from);
  }
  from(field) {
    return new _HybridFieldBuilder(this._noStem, { from: field });
  }
  [BUILD]() {
    return {
      type: "HYBRID",
      ...this._noStem.noStem ? { noStem: true } : {},
      ...this._from.from ? { from: this._from.from } : {}
    };
  }
};
var KeywordFieldBuilder = class {
  [BUILD]() {
    return { type: "KEYWORD" };
  }
};
var FacetFieldBuilder = class {
  [BUILD]() {
    return { type: "FACET" };
  }
};
if (typeof atob === "undefined") {
  global.atob = (b64) => Buffer.from(b64, "base64").toString("utf8");
}

// lib/redis.ts
function read(env, ...names) {
  for (const name of names) {
    const value = env[name];
    if (value && value.trim()) return value.trim();
  }
  return void 0;
}
function redisConfig(env = process.env) {
  const url = read(env, "UPSTASH_REDIS_REST_URL", "QR_DB_URL");
  const token = read(env, "UPSTASH_REDIS_REST_TOKEN", "QR_DB_TOKEN");
  return url && token ? { url, token } : null;
}

// src/server/store.ts
import { mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
function dayKey(time) {
  return new Date(time).toISOString().slice(0, 10);
}
function lastDays(days, now = Date.now()) {
  const out = [];
  for (let i = days - 1; i >= 0; i--) out.push(dayKey(now - i * 864e5));
  return out;
}
var FileStore = class {
  constructor(path) {
    this.path = path;
    this.state = this.load();
  }
  path;
  state;
  queue = Promise.resolve();
  load() {
    try {
      const raw = readFileSync(this.path, "utf8");
      const parsed = JSON.parse(raw);
      return {
        codes: parsed.codes ?? {},
        owned: parsed.owned ?? {},
        days: parsed.days ?? {},
        visits: parsed.visits ?? {},
        limits: parsed.limits ?? {}
      };
    } catch {
      return { codes: {}, owned: {}, days: {}, visits: {}, limits: {} };
    }
  }
  /** Запись через очередь: параллельные запросы не затирают друг друга. */
  flush() {
    const snapshot = JSON.stringify(this.state);
    this.queue = this.queue.then(() => {
      try {
        this.write(snapshot, this.path);
      } catch {
        this.path = join(tmpdir(), "qrix-dynamic.json");
        this.write(snapshot, this.path);
      }
    });
    return this.queue;
  }
  write(snapshot, path) {
    mkdirSync(dirname(path), { recursive: true });
    const tmp = `${path}.tmp`;
    writeFileSync(tmp, snapshot, "utf8");
    renameSync(tmp, path);
  }
  async getCode(slug) {
    return this.state.codes[slug] ?? null;
  }
  async putCode(code) {
    this.state.codes[code.slug] = code;
    await this.flush();
  }
  async deleteCode(slug) {
    delete this.state.codes[slug];
    delete this.state.days[slug];
    await this.flush();
  }
  async ownedSlugs(keyHash) {
    return this.state.owned[keyHash] ?? [];
  }
  async addOwned(keyHash, slug) {
    const list = this.state.owned[keyHash] ?? [];
    if (!list.includes(slug)) list.push(slug);
    this.state.owned[keyHash] = list;
    await this.flush();
  }
  async removeOwned(keyHash, slug) {
    const list = this.state.owned[keyHash] ?? [];
    this.state.owned[keyHash] = list.filter((s) => s !== slug);
    await this.flush();
  }
  async incrScans(slug) {
    const code = this.state.codes[slug];
    if (!code) return 0;
    code.scans += 1;
    await this.flush();
    return code.scans;
  }
  async recordDay(slug, day, country, device) {
    const perSlug = this.state.days[slug] ??= {};
    const dayStats = perSlug[day] ??= { scans: 0, countries: {}, devices: {} };
    dayStats.scans += 1;
    dayStats.countries[country] = (dayStats.countries[country] ?? 0) + 1;
    dayStats.devices[device] = (dayStats.devices[device] ?? 0) + 1;
    await this.flush();
  }
  async days(slug, count) {
    const perSlug = this.state.days[slug] ?? {};
    const out = {};
    for (const day of lastDays(count)) {
      if (perSlug[day]) out[day] = perSlug[day];
    }
    return out;
  }
  async rateLimit(bucket, limit, windowSec) {
    const now = Date.now();
    const entry2 = this.state.limits[bucket];
    if (!entry2 || entry2.reset < now) {
      this.state.limits[bucket] = { count: 1, reset: now + windowSec * 1e3 };
      await this.flush();
      return { ok: true, remaining: limit - 1 };
    }
    entry2.count += 1;
    await this.flush();
    return { ok: entry2.count <= limit, remaining: Math.max(0, limit - entry2.count) };
  }
  async markVisit(slug, visitorId2, ttlSec) {
    const key = `${slug}:${visitorId2}`;
    const now = Date.now();
    const until = this.state.visits[key] ?? 0;
    if (until > now) return false;
    this.state.visits[key] = now + ttlSec * 1e3;
    for (const [k, exp] of Object.entries(this.state.visits)) {
      if (exp < now) delete this.state.visits[k];
    }
    await this.flush();
    return true;
  }
};
var RedisStore = class {
  constructor(url, token) {
    this.url = url;
    this.token = token;
  }
  url;
  token;
  /** Выполняет несколько команд одним запросом — так быстрее и дешевле. */
  async pipeline(commands) {
    const res = await fetch(`${this.url}/pipeline`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(commands)
    });
    if (!res.ok) throw new Error(`redis: ${res.status} ${await res.text()}`);
    const data = await res.json();
    return data.map((row) => row.result);
  }
  async single(command) {
    const [result] = await this.pipeline([command]);
    return result;
  }
  async getCode(slug) {
    const rows = await this.single(["HGETALL", `code:${slug}`]);
    if (!rows || rows.length === 0) return null;
    const map = {};
    for (let i = 0; i < rows.length; i += 2) map[rows[i]] = rows[i + 1];
    return {
      v: Number(map.v ?? 1),
      slug,
      url: map.url,
      keyHash: map.keyHash,
      createdAt: Number(map.createdAt ?? 0),
      updatedAt: Number(map.updatedAt ?? 0),
      scans: Number(map.scans ?? 0),
      license: map.license || void 0,
      paused: map.paused === "1"
    };
  }
  async putCode(code) {
    await this.pipeline([
      [
        "HSET",
        `code:${code.slug}`,
        "v",
        String(code.v),
        "url",
        code.url,
        "keyHash",
        code.keyHash,
        "createdAt",
        String(code.createdAt),
        "updatedAt",
        String(code.updatedAt),
        "scans",
        String(code.scans),
        "paused",
        code.paused ? "1" : "0",
        ...code.license ? ["license", code.license] : []
      ],
      ["SADD", `owner:${code.keyHash}`, code.slug]
    ]);
  }
  async deleteCode(slug) {
    const code = await this.getCode(slug);
    const commands = [["DEL", `code:${slug}`]];
    if (code) commands.push(["SREM", `owner:${code.keyHash}`, slug]);
    await this.pipeline(commands);
  }
  async ownedSlugs(keyHash) {
    const rows = await this.single(["SMEMBERS", `owner:${keyHash}`]);
    return rows ?? [];
  }
  async addOwned(keyHash, slug) {
    await this.single(["SADD", `owner:${keyHash}`, slug]);
  }
  async removeOwned(keyHash, slug) {
    await this.single(["SREM", `owner:${keyHash}`, slug]);
  }
  async incrScans(slug) {
    return Number(await this.single(["HINCRBY", `code:${slug}`, "scans", 1]));
  }
  async recordDay(slug, day, country, device) {
    const key = `d:${slug}:${day}`;
    await this.pipeline([
      ["HINCRBY", key, "scans", 1],
      ["HINCRBY", key, `c:${country}`, 1],
      ["HINCRBY", key, `dev:${device}`, 1],
      ["EXPIRE", key, 60 * 60 * 24 * 120]
    ]);
  }
  async days(slug, count) {
    const keys = lastDays(count);
    const rows = await this.pipeline(keys.map((day) => ["HGETALL", `d:${slug}:${day}`]));
    const out = {};
    keys.forEach((day, index) => {
      const raw = rows?.[index];
      if (!raw || raw.length === 0) return;
      const stats = { scans: 0, countries: {}, devices: {} };
      for (let i = 0; i < raw.length; i += 2) {
        const field = raw[i];
        const value = Number(raw[i + 1]);
        if (field === "scans") stats.scans = value;
        else if (field.startsWith("c:")) stats.countries[field.slice(2)] = value;
        else if (field.startsWith("dev:")) stats.devices[field.slice(4)] = value;
      }
      out[day] = stats;
    });
    return out;
  }
  async rateLimit(bucket, limit, windowSec) {
    const key = `rl:${bucket}`;
    const count = Number(await this.single(["INCR", key]));
    if (count === 1) await this.single(["EXPIRE", key, windowSec]);
    return { ok: count <= limit, remaining: Math.max(0, limit - count) };
  }
  async markVisit(slug, visitorId2, ttlSec) {
    const result = await this.single(["SET", `v:${slug}:${visitorId2}`, "1", "NX", "EX", ttlSec]);
    return result === "OK";
  }
};
function createStore(env) {
  const config = redisConfig(env);
  if (config) return new RedisStore(config.url.replace(/\/+$/, ""), config.token);
  return new FileStore(env.QR_DB_FILE || ".qrix/dynamic.json");
}

// src/server/codes.ts
var ApiError = class extends Error {
  constructor(status, code, message) {
    super(message);
    this.status = status;
    this.code = code;
  }
  status;
  code;
};
var RESERVED = /* @__PURE__ */ new Set([
  "api",
  "d",
  "ru",
  "en",
  "fr",
  "de",
  "es",
  "admin",
  "app",
  "new",
  "edit",
  "stats",
  "login",
  "billing",
  "pro",
  "about",
  "help"
]);
function randomKey() {
  return randomBytes(24).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function hashKey(key) {
  return createHash("sha256").update(`qrix:${key}`).digest("hex");
}
function sameKey(a, b) {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}
function randomSlug() {
  const bytes = randomBytes(SLUG_LENGTH);
  let out = "";
  for (let i = 0; i < SLUG_LENGTH; i++) out += SLUG_ALPHABET[bytes[i] % SLUG_ALPHABET.length];
  return out;
}
function validateSlug(value) {
  const slug = value.trim().toLowerCase();
  if (slug.length < 3 || slug.length > 32) {
    throw new ApiError(400, "slug_length", "\u0421\u043B\u0430\u0433 \u0434\u043E\u043B\u0436\u0435\u043D \u0431\u044B\u0442\u044C \u043E\u0442 3 \u0434\u043E 32 \u0441\u0438\u043C\u0432\u043E\u043B\u043E\u0432");
  }
  if (!/^[a-z0-9][a-z0-9-]*[a-z0-9]$/.test(slug)) {
    throw new ApiError(400, "slug_symbols", "\u0422\u043E\u043B\u044C\u043A\u043E \u043B\u0430\u0442\u0438\u043D\u0441\u043A\u0438\u0435 \u0431\u0443\u043A\u0432\u044B, \u0446\u0438\u0444\u0440\u044B \u0438 \u0434\u0435\u0444\u0438\u0441");
  }
  if (RESERVED.has(slug)) throw new ApiError(409, "slug_reserved", "\u042D\u0442\u043E\u0442 \u0430\u0434\u0440\u0435\u0441 \u0437\u0430\u043D\u044F\u0442");
  return slug;
}
function normalizeUrl(input, selfHost = "qr-ix.com") {
  const raw = input.trim();
  if (!raw) throw new ApiError(400, "url_empty", "\u041D\u0443\u0436\u0435\u043D \u0430\u0434\u0440\u0435\u0441, \u043A\u0443\u0434\u0430 \u0432\u0435\u0441\u0442\u0438 \u043A\u043E\u0434");
  let parsed;
  try {
    parsed = new URL(raw);
  } catch {
    try {
      parsed = new URL(`https://${raw}`);
    } catch {
      throw new ApiError(400, "url_invalid", "\u042D\u0442\u043E \u043D\u0435 \u043F\u043E\u0445\u043E\u0436\u0435 \u043D\u0430 \u0430\u0434\u0440\u0435\u0441");
    }
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new ApiError(400, "url_scheme", "\u041F\u043E\u0434\u0434\u0435\u0440\u0436\u0438\u0432\u0430\u044E\u0442\u0441\u044F \u0442\u043E\u043B\u044C\u043A\u043E http \u0438 https");
  }
  if (parsed.href.length > MAX_URL_LENGTH) {
    throw new ApiError(400, "url_long", `\u0410\u0434\u0440\u0435\u0441 \u0434\u043B\u0438\u043D\u043D\u0435\u0435 ${MAX_URL_LENGTH} \u0441\u0438\u043C\u0432\u043E\u043B\u043E\u0432`);
  }
  if (parsed.hostname === selfHost || parsed.hostname.endsWith(`.${selfHost}`)) {
    if (parsed.pathname.startsWith("/d/")) {
      throw new ApiError(400, "url_loop", "\u041D\u0435\u043B\u044C\u0437\u044F \u0432\u0435\u0441\u0442\u0438 \u0434\u0438\u043D\u0430\u043C\u0438\u0447\u0435\u0441\u043A\u0438\u0439 \u043A\u043E\u0434 \u043D\u0430 \u0434\u0440\u0443\u0433\u043E\u0439 \u0434\u0438\u043D\u0430\u043C\u0438\u0447\u0435\u0441\u043A\u0438\u0439 \u043A\u043E\u0434");
    }
  }
  return parsed.href;
}
function deviceClass(userAgent) {
  const ua = userAgent.toLowerCase();
  if (/ipad|tablet|playbook|silk/.test(ua)) return "tablet";
  if (/mobi|iphone|ipod|android.*mobile|windows phone/.test(ua)) return "phone";
  return "desktop";
}
async function createCode(store, input, ctx) {
  const now = ctx.now ?? Date.now();
  const url = normalizeUrl(input.url, ctx.selfHost);
  const key = ctx.key?.trim() || randomKey();
  const keyHash = hashKey(key);
  if (!ctx.license) {
    const owned = await store.ownedSlugs(keyHash);
    let alive = 0;
    for (const slug2 of owned) {
      if (await store.getCode(slug2)) alive += 1;
    }
    if (alive >= FREE_CODES) {
      throw new ApiError(
        402,
        "limit_reached",
        `\u0411\u0435\u0441\u043F\u043B\u0430\u0442\u043D\u043E \u043C\u043E\u0436\u043D\u043E \u0434\u0435\u0440\u0436\u0430\u0442\u044C ${FREE_CODES} \u0434\u0438\u043D\u0430\u043C\u0438\u0447\u0435\u0441\u043A\u0438\u0445 \u043A\u043E\u0434\u0430`
      );
    }
  }
  let slug;
  if (input.slug) {
    slug = validateSlug(input.slug);
    if (await store.getCode(slug)) {
      throw new ApiError(409, "slug_taken", "\u042D\u0442\u043E\u0442 \u0430\u0434\u0440\u0435\u0441 \u0443\u0436\u0435 \u0437\u0430\u043D\u044F\u0442");
    }
  } else {
    for (let i = 0; i < 6; i++) {
      const candidate = randomSlug();
      if (!await store.getCode(candidate)) {
        slug = candidate;
        break;
      }
    }
    if (!slug) throw new ApiError(500, "slug_failed", "\u041D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u043F\u043E\u0434\u043E\u0431\u0440\u0430\u0442\u044C \u0430\u0434\u0440\u0435\u0441");
  }
  const code = {
    v: SCHEMA_VERSION,
    slug,
    url,
    keyHash,
    createdAt: now,
    updatedAt: now,
    scans: 0,
    paused: false,
    ...ctx.license ? { license: ctx.license.id } : {}
  };
  await store.putCode(code);
  await store.addOwned(keyHash, slug);
  return { code, key };
}
async function requireOwner(store, slug, key) {
  const code = await store.getCode(slug);
  if (!code) throw new ApiError(404, "not_found", "\u041A\u043E\u0434 \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D");
  if (!sameKey(hashKey(key), code.keyHash)) {
    throw new ApiError(403, "forbidden", "\u042D\u0442\u043E\u0442 \u043A\u043E\u0434 \u0441\u043E\u0437\u0434\u0430\u043D \u0441 \u0434\u0440\u0443\u0433\u0438\u043C \u043A\u043B\u044E\u0447\u043E\u043C");
  }
  return code;
}
async function updateCode(store, slug, key, patch, selfHost) {
  const code = await requireOwner(store, slug, key);
  if (patch.url !== void 0) code.url = normalizeUrl(patch.url, selfHost);
  if (patch.paused !== void 0) code.paused = Boolean(patch.paused);
  code.updatedAt = Date.now();
  await store.putCode(code);
  return code;
}
async function deleteCode(store, slug, key) {
  const code = await requireOwner(store, slug, key);
  await store.deleteCode(slug);
  await store.removeOwned(code.keyHash, slug);
}
function publicCode(code, baseUrl) {
  return {
    slug: code.slug,
    url: code.url,
    createdAt: code.createdAt,
    updatedAt: code.updatedAt,
    scans: code.scans,
    paused: Boolean(code.paused),
    shortUrl: `${baseUrl.replace(/\/+$/, "")}/d/${code.slug}`
  };
}
async function handleScan(store, slug, ctx) {
  const code = await store.getCode(slug);
  if (!code) return { kind: "missing" };
  if (code.paused) return { kind: "paused" };
  const now = ctx.now ?? Date.now();
  await store.incrScans(slug);
  const fresh = await store.markVisit(slug, ctx.visitorId, 60 * 60 * 24);
  if (fresh) {
    await store.recordDay(
      slug,
      dayKey(now),
      ctx.country || "??",
      deviceClass(ctx.userAgent ?? "")
    );
  }
  return { kind: "redirect", url: code.url };
}
async function codeStats(store, slug, key, days = 30) {
  const code = await requireOwner(store, slug, key);
  return { total: code.scans, days: await store.days(slug, days) };
}

// src/server/license.ts
import { createHmac, timingSafeEqual as timingSafeEqual2 } from "node:crypto";
var PREFIX = "qr1";
function b64url(input) {
  return input.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function fromB64url(input) {
  return Buffer.from(input.replace(/-/g, "+").replace(/_/g, "/"), "base64");
}
function sign(secret, data) {
  return b64url(createHmac("sha256", secret).update(data).digest());
}
function verifyLicense(token, secret, now = Date.now()) {
  const parts = token.trim().split(".");
  if (parts.length !== 3 || parts[0] !== PREFIX) return { ok: false, reason: "format" };
  const [, body, signature] = parts;
  const expected = sign(secret, `${PREFIX}.${body}`);
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual2(a, b)) return { ok: false, reason: "signature" };
  let payload;
  try {
    payload = JSON.parse(fromB64url(body).toString("utf8"));
  } catch {
    return { ok: false, reason: "format" };
  }
  if (!payload || payload.v !== 1 || typeof payload.id !== "string") {
    return { ok: false, reason: "format" };
  }
  if (payload.until && payload.until * 1e3 < now) return { ok: false, reason: "expired" };
  return { ok: true, payload };
}

// src/server/router.ts
var KEY_HEADER = "x-qrix-key";
var LICENSE_HEADER = "x-qrix-license";
var CREATE_LIMIT = 20;
var API_LIMIT = 120;
function json(res, status, body) {
  const payload = JSON.stringify(body);
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    // API не должен попадать в сниппеты и не должен индексироваться
    "X-Robots-Tag": "noindex",
    "Content-Length": Buffer.byteLength(payload)
  });
  res.end(payload);
}
async function readJson(req) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    const buf = chunk;
    size += buf.length;
    if (size > 8192) throw new ApiError(413, "too_large", "\u0421\u043B\u0438\u0448\u043A\u043E\u043C \u0431\u043E\u043B\u044C\u0448\u043E\u0435 \u0442\u0435\u043B\u043E \u0437\u0430\u043F\u0440\u043E\u0441\u0430");
    chunks.push(buf);
  }
  if (chunks.length === 0) return {};
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    throw new ApiError(400, "bad_json", "\u0422\u0435\u043B\u043E \u0437\u0430\u043F\u0440\u043E\u0441\u0430 \u2014 \u043D\u0435 JSON");
  }
}
function header(req, name) {
  const value = req.headers[name];
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
}
function clientIp(req) {
  const forwarded = header(req, "x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  const real = header(req, "x-real-ip");
  if (real) return real;
  return req.socket.remoteAddress ?? "0.0.0.0";
}
function visitorId(ip, salt, now = Date.now()) {
  return createHash2("sha256").update(`${salt}|${dayKey(now)}|${ip}`).digest("hex").slice(0, 24);
}
function baseUrlOf(req, env) {
  if (env.QR_BASE_URL) return env.QR_BASE_URL.replace(/\/+$/, "");
  const host = header(req, "x-forwarded-host") || header(req, "host") || "qr-ix.com";
  const local = /^(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/.test(host);
  const proto = header(req, "x-forwarded-proto") || (local ? "http" : "https");
  return `${proto}://${host}`;
}
function hostOf(value) {
  try {
    return new URL(value).hostname;
  } catch {
    return "qr-ix.com";
  }
}
function readLicense(req, env) {
  const token = header(req, LICENSE_HEADER);
  if (!token) return void 0;
  const secret = env.QR_LICENSE_SECRET;
  if (!secret) return void 0;
  const check = verifyLicense(token, secret);
  if (!check.ok) {
    if (check.reason === "expired") {
      throw new ApiError(402, "license_expired", "\u0421\u0440\u043E\u043A \u043B\u0438\u0446\u0435\u043D\u0437\u0438\u0438 \u0438\u0441\u0442\u0451\u043A");
    }
    throw new ApiError(402, "license_invalid", "\u041B\u0438\u0446\u0435\u043D\u0437\u0438\u044F \u043D\u0435 \u043F\u043E\u0434\u0445\u043E\u0434\u0438\u0442");
  }
  return check.payload;
}
function str(value) {
  return typeof value === "string" ? value : void 0;
}
function createHandler(env) {
  const store = createStore(env);
  const salt = env.QR_IP_SALT || "qrix-dev-salt";
  const selfHost = hostOf(env.QR_BASE_URL || "https://qr-ix.com");
  return async function handler(req, res) {
    const method = req.method ?? "GET";
    const url = new URL(req.url ?? "/", "http://local");
    const path = url.pathname.replace(/\/+$/, "") || "/";
    try {
      const scan = path.match(/^\/(?:api\/d|d)\/([A-Za-z0-9-]{1,64})$/);
      if (scan && method === "GET") {
        const slug = scan[1].toLowerCase();
        const limit = await store.rateLimit(`scan:${visitorId(clientIp(req), salt)}`, 120, 60);
        if (!limit.ok) {
          res.writeHead(429, { "Content-Type": "text/plain; charset=utf-8" });
          res.end("Too many requests");
          return;
        }
        const result = await handleScan(store, slug, {
          visitorId: visitorId(clientIp(req), salt),
          country: header(req, "x-vercel-ip-country") || void 0,
          userAgent: header(req, "user-agent")
        });
        if (result.kind === "redirect") {
          res.writeHead(302, {
            Location: result.url,
            // сканы не кешируем: иначе счётчик врёт, а смену ссылки не видно
            "Cache-Control": "no-store, max-age=0",
            "X-Robots-Tag": "noindex, nofollow"
          });
          res.end();
          return;
        }
        if (result.kind === "paused") {
          res.writeHead(410, { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" });
          res.end(pausedPage());
          return;
        }
        res.writeHead(404, { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" });
        res.end(notFoundPage());
        return;
      }
      if (path.startsWith("/api/")) {
        const ip = clientIp(req);
        const limit = await store.rateLimit(`api:${visitorId(ip, salt)}`, API_LIMIT, 60);
        if (!limit.ok) throw new ApiError(429, "rate_limited", "\u0421\u043B\u0438\u0448\u043A\u043E\u043C \u043C\u043D\u043E\u0433\u043E \u0437\u0430\u043F\u0440\u043E\u0441\u043E\u0432, \u043F\u043E\u0434\u043E\u0436\u0434\u0438\u0442\u0435 \u043C\u0438\u043D\u0443\u0442\u0443");
        if (path === "/api/health" && method === "GET") {
          json(res, 200, { ok: true, store: env.QR_DB_URL ? "redis" : "file" });
          return;
        }
        if (path === "/api/codes" && method === "POST") {
          const body = await readJson(req);
          const url2 = str(body.url);
          if (!url2) throw new ApiError(400, "url_required", "\u041D\u0443\u0436\u0435\u043D \u0430\u0434\u0440\u0435\u0441 \u043D\u0430\u0437\u043D\u0430\u0447\u0435\u043D\u0438\u044F");
          const createLimit = await store.rateLimit(
            `create:${visitorId(ip, salt)}`,
            CREATE_LIMIT,
            3600
          );
          if (!createLimit.ok) {
            throw new ApiError(429, "create_limited", "\u0421\u043B\u0438\u0448\u043A\u043E\u043C \u043C\u043D\u043E\u0433\u043E \u043D\u043E\u0432\u044B\u0445 \u043A\u043E\u0434\u043E\u0432 \u0437\u0430 \u0447\u0430\u0441");
          }
          const key = header(req, KEY_HEADER) || void 0;
          const license = readLicense(req, env);
          const result = await createCode(
            store,
            { url: url2, slug: str(body.slug) },
            { key, license, baseUrl: baseUrlOf(req, env), selfHost }
          );
          json(res, 201, {
            code: publicCode(result.code, baseUrlOf(req, env)),
            key: result.key,
            licensed: Boolean(license)
          });
          return;
        }
        if (path === "/api/codes" && method === "GET") {
          const raw = url.searchParams.get("slugs") ?? "";
          const slugs = raw.split(",").map((s) => s.trim().toLowerCase()).filter((s) => /^[a-z0-9-]{1,64}$/.test(s)).slice(0, 100);
          const base = baseUrlOf(req, env);
          const out = [];
          for (const slug of slugs) {
            const code = await store.getCode(slug);
            if (code) out.push(publicCode(code, base));
          }
          json(res, 200, { codes: out });
          return;
        }
        const single = path.match(/^\/api\/codes\/([A-Za-z0-9-]{1,64})(\/stats)?$/);
        if (single) {
          const slug = single[1].toLowerCase();
          const wantsStats = Boolean(single[2]);
          const key = header(req, KEY_HEADER);
          const base = baseUrlOf(req, env);
          if (wantsStats && method === "GET") {
            if (!key) throw new ApiError(401, "key_required", "\u041D\u0443\u0436\u0435\u043D \u043A\u043B\u044E\u0447 \u0432\u043B\u0430\u0434\u0435\u043B\u044C\u0446\u0430");
            const stats = await codeStats(store, slug, key);
            json(res, 200, stats);
            return;
          }
          if (method === "GET") {
            const code = await store.getCode(slug);
            if (!code) throw new ApiError(404, "not_found", "\u041A\u043E\u0434 \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D");
            const owned = key ? await requireOwner(store, slug, key) : null;
            json(res, 200, {
              code: publicCode(owned ?? code, base),
              owner: Boolean(owned)
            });
            return;
          }
          if (method === "PATCH" || method === "DELETE") {
            if (!key) throw new ApiError(401, "key_required", "\u041D\u0443\u0436\u0435\u043D \u043A\u043B\u044E\u0447 \u0432\u043B\u0430\u0434\u0435\u043B\u044C\u0446\u0430");
            if (method === "DELETE") {
              await deleteCode(store, slug, key);
              json(res, 200, { ok: true });
              return;
            }
            const body = await readJson(req);
            const patch = {};
            if (typeof body.url === "string") patch.url = normalizeUrl(body.url, selfHost);
            if (typeof body.paused === "boolean") patch.paused = body.paused;
            const code = await updateCode(store, slug, key, patch, selfHost);
            json(res, 200, { code: publicCode(code, base) });
            return;
          }
          throw new ApiError(405, "method", "\u041C\u0435\u0442\u043E\u0434 \u043D\u0435 \u043F\u043E\u0434\u0434\u0435\u0440\u0436\u0438\u0432\u0430\u0435\u0442\u0441\u044F");
        }
        throw new ApiError(404, "no_route", "\u041D\u0435\u0442 \u0442\u0430\u043A\u043E\u0433\u043E \u043C\u0430\u0440\u0448\u0440\u0443\u0442\u0430");
      }
      throw new ApiError(404, "no_route", "\u041D\u0435\u0442 \u0442\u0430\u043A\u043E\u0433\u043E \u043C\u0430\u0440\u0448\u0440\u0443\u0442\u0430");
    } catch (error) {
      if (error instanceof ApiError) {
        json(res, error.status, { error: error.code, message: error.message });
        return;
      }
      console.error("[dynamic]", error);
      json(res, 500, { error: "server", message: "\u0412\u043D\u0443\u0442\u0440\u0435\u043D\u043D\u044F\u044F \u043E\u0448\u0438\u0431\u043A\u0430" });
    }
  };
}
function shell(title, text) {
  return `<!doctype html><html lang="ru"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex">
<title>${title} \u2014 Qrix</title>
<style>
  html,body{margin:0;height:100%}
  body{display:grid;place-items:center;background:#030304;color:#f4f5f6;
    font:16px/1.5 "Google Sans",-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}
  main{max-width:28rem;padding:2rem;text-align:center}
  h1{font-size:1.5rem;font-weight:500;margin:0 0 .75rem}
  p{color:#9aa0a6;margin:0 0 1.5rem}
  a{display:inline-block;padding:.8rem 1.6rem;border-radius:.9rem;background:#d1fe17;
    color:#0b0c0e;text-decoration:none;font-weight:500}
</style></head>
<body><main><h1>${title}</h1><p>${text}</p><a href="https://qr-ix.com/">Qrix</a></main></body></html>`;
}
function notFoundPage() {
  return shell("\u041A\u043E\u0434 \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D", "\u0412\u043E\u0437\u043C\u043E\u0436\u043D\u043E, \u043E\u043D \u0443\u0434\u0430\u043B\u0451\u043D \u0438\u043B\u0438 \u0432 \u0430\u0434\u0440\u0435\u0441\u0435 \u043E\u043F\u0435\u0447\u0430\u0442\u043A\u0430.");
}
function pausedPage() {
  return shell("\u041A\u043E\u0434 \u043E\u0442\u043A\u043B\u044E\u0447\u0451\u043D", "\u0412\u043B\u0430\u0434\u0435\u043B\u0435\u0446 \u0432\u0440\u0435\u043C\u0435\u043D\u043D\u043E \u043E\u0441\u0442\u0430\u043D\u043E\u0432\u0438\u043B \u044D\u0442\u043E\u0442 \u043A\u043E\u0434.");
}

// scripts/api-entry.ts
var ready = null;
var failure = null;
function build() {
  if (ready) return ready;
  if (failure) return null;
  try {
    ready = createHandler({
      QR_DB_URL: process.env.QR_DB_URL,
      QR_DB_TOKEN: process.env.QR_DB_TOKEN,
      QR_DB_FILE: process.env.QR_DB_FILE,
      QR_LICENSE_SECRET: process.env.QR_LICENSE_SECRET,
      QR_IP_SALT: process.env.QR_IP_SALT,
      QR_BASE_URL: process.env.QR_BASE_URL
    });
    return ready;
  } catch (error) {
    const code = error && typeof error === "object" && "code" in error ? String(error.code) : error instanceof Error ? error.name : "unknown";
    failure = code;
    console.error(`qrix api: init failed (${code})`);
    return null;
  }
}
async function entry(req, res) {
  const handler = build();
  if (!handler) {
    res.statusCode = 500;
    res.setHeader("content-type", "application/json; charset=utf-8");
    res.end(JSON.stringify({ error: "init_failed", code: failure ?? "unknown" }));
    return;
  }
  try {
    await handler(req, res);
  } catch (error) {
    const code = error instanceof Error ? error.name : "unknown";
    console.error(`qrix api: request failed (${code})`);
    if (!res.headersSent) {
      res.statusCode = 500;
      res.setHeader("content-type", "application/json; charset=utf-8");
      res.end(JSON.stringify({ error: "request_failed", code }));
    }
  }
}
export {
  entry as default
};
