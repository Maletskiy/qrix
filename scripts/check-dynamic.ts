/**
 * Проверки динамических QR.
 *
 * Гоняем и чистую логику, и живой HTTP через тот же обработчик, что
 * работает на Vercel: без моков и без внешней базы — файл во временном
 * каталоге.
 *
 *   npm run check:dynamic
 */
import { createServer, type Server } from "node:http";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createHandler } from "../src/server/router";
import { FileStore } from "../src/server/store";
import { issueLicense, verifyLicense } from "../src/server/license";
import {
  ApiError,
  createCode,
  deleteCode,
  handleScan,
  normalizeUrl,
  updateCode,
  validateSlug,
} from "../src/server/codes";

let passed = 0;
const failures: string[] = [];

function check(name: string, ok: boolean, detail = ""): void {
  if (ok) {
    passed += 1;
    return;
  }
  failures.push(`${name}${detail ? ` — ${detail}` : ""}`);
}

async function throws(name: string, run: () => Promise<unknown>, code: string): Promise<void> {
  try {
    await run();
    failures.push(`${name} — ошибки не было, ждали ${code}`);
  } catch (error) {
    const actual = error instanceof ApiError ? error.code : "raw";
    check(name, actual === code, `получили ${actual}`);
  }
}

function throwsSync(name: string, run: () => unknown, code: string): void {
  try {
    run();
    failures.push(`${name} — ошибки не было, ждали ${code}`);
  } catch (error) {
    const actual = error instanceof ApiError ? error.code : "raw";
    check(name, actual === code, `получили ${actual}`);
  }
}

const dir = mkdtempSync(join(tmpdir(), "qrix-dyn-"));
const file = join(dir, "db.json");
const store = new FileStore(file);
const base = "https://qr-ix.com";
const secret = "test-secret";

async function logic(): Promise<void> {
  // --- адреса -----------------------------------------------------------
  check("url: https как есть", normalizeUrl("https://example.com/a") === "https://example.com/a");
  check("url: без схемы получает https", normalizeUrl("example.com/x").startsWith("https://example.com/"));
  throwsSync("url: javascript отклонён", () => normalizeUrl("javascript:alert(1)"), "url_scheme");
  throwsSync("url: пустой отклонён", () => normalizeUrl("   "), "url_empty");
  throwsSync("url: длинный отклонён", () => normalizeUrl(`https://a.com/${"x".repeat(2100)}`), "url_long");
  throwsSync(
    "url: петля на свой код отклонена",
    () => normalizeUrl("https://qr-ix.com/d/abc1234"),
    "url_loop"
  );

  // --- слаги ------------------------------------------------------------
  check("slug: свой слаг приведён к нижнему регистру", validateSlug("Promo-2026") === "promo-2026");
  throwsSync("slug: занятое слово", () => validateSlug("api"), "slug_reserved");
  throwsSync("slug: короткий", () => validateSlug("ab"), "slug_length");
  throwsSync("slug: символы", () => validateSlug("привет"), "slug_symbols");

  // --- создание и ключ ---------------------------------------------------
  const first = await createCode(store, { url: "example.com/one" }, { baseUrl: base });
  check("создание: слаг из 7 символов", first.code.slug.length === 7, first.code.slug);
  check("создание: ключ выдан", first.key.length >= 30);
  check("создание: ключ не хранится в записи", !JSON.stringify(first.code).includes(first.key));
  check("создание: счётчик на нуле", first.code.scans === 0);

  const second = await createCode(
    store,
    { url: "https://example.com/two" },
    { key: first.key, baseUrl: base }
  );
  check("создание: второй код с тем же ключом", second.key === first.key);

  // --- лимит бесплатных ---------------------------------------------------
  await createCode(store, { url: "https://example.com/three" }, { key: first.key, baseUrl: base });
  await throws(
    "лимит: четвёртый код без лицензии",
    () => createCode(store, { url: "https://example.com/four" }, { key: first.key, baseUrl: base }),
    "limit_reached"
  );

  // --- лицензия снимает лимит --------------------------------------------
  const license = issueLicense({ v: 1, id: "order-1", plan: "pro", issued: 1 }, secret);
  const verified = verifyLicense(license, secret);
  check("лицензия: подпись сходится", verified.ok);
  check("лицензия: подделка не проходит", !verifyLicense(`${license}x`, secret).ok);
  check(
    "лицензия: истёкшая не проходит",
    !verifyLicense(
      issueLicense({ v: 1, id: "order-2", plan: "pro", issued: 1, until: 1000 }, secret),
      secret,
      Date.now()
    ).ok
  );

  const paid = await createCode(
    store,
    { url: "https://example.com/four" },
    { key: first.key, license: { v: 1, id: "order-1", plan: "pro", issued: 1 }, baseUrl: base }
  );
  check("лицензия: четвёртый код создан", Boolean(paid.code.slug));
  check("лицензия: код помечен", paid.code.license === "order-1");

  // --- свой слаг и занятость ---------------------------------------------
  const custom = await createCode(
    store,
    { url: "https://example.com/custom", slug: "Promo-2026" },
    { key: "custom-key-1234567890", baseUrl: base }
  );
  check("слаг: свой адрес создан", custom.code.slug === "promo-2026");
  await throws(
    "слаг: повтор занят",
    () =>
      createCode(
        store,
        { url: "https://example.com/x", slug: "promo-2026" },
        { key: "other-key-1234567890", baseUrl: base }
      ),
    "slug_taken"
  );

  // --- правка и чужой ключ ------------------------------------------------
  const updated = await updateCode(store, custom.code.slug, "custom-key-1234567890", {
    url: "https://example.com/renamed",
  });
  check("правка: адрес заменён", updated.url === "https://example.com/renamed");
  await throws(
    "правка: чужой ключ отклонён",
    () => updateCode(store, custom.code.slug, "wrong-key-1234567890", { url: "https://example.com/x" }),
    "forbidden"
  );

  // --- сканы --------------------------------------------------------------
  const scan1 = await handleScan(store, custom.code.slug, {
    visitorId: "visitor-a",
    country: "DE",
    userAgent: "Mozilla/5.0 (iPhone)",
  });
  check("скан: редирект на новый адрес", scan1.kind === "redirect" && scan1.url === "https://example.com/renamed");

  const scan2 = await handleScan(store, custom.code.slug, {
    visitorId: "visitor-a",
    country: "DE",
    userAgent: "Mozilla/5.0 (iPhone)",
  });
  check("скан: повторный визит тоже считается", scan2.kind === "redirect");

  const after = await store.getCode(custom.code.slug);
  check("скан: счётчик вырос дважды", after?.scans === 2, String(after?.scans));

  const days = await store.days(custom.code.slug, 2);
  const today = Object.values(days)[0];
  check("статистика: уникальный визит один", today?.scans === 1, String(today?.scans));
  check("статистика: страна записана", today?.countries.DE === 1);
  check("статистика: устройство телефон", today?.devices.phone === 1);

  check("скан: несуществующий код", (await handleScan(store, "nope123", { visitorId: "v" })).kind === "missing");

  await updateCode(store, custom.code.slug, "custom-key-1234567890", { paused: true });
  check(
    "пауза: код отвечает paused",
    (await handleScan(store, custom.code.slug, { visitorId: "v2" })).kind === "paused"
  );

  // --- удаление -----------------------------------------------------------
  await deleteCode(store, custom.code.slug, "custom-key-1234567890");
  check("удаление: код исчез", (await store.getCode(custom.code.slug)) === null);
  await throws(
    "удаление: повторно нечего удалять",
    () => deleteCode(store, custom.code.slug, "custom-key-1234567890"),
    "not_found"
  );
}

async function http(): Promise<void> {
  const handler = createHandler({
    QR_DB_FILE: join(dir, "http.json"),
    QR_LICENSE_SECRET: secret,
    QR_IP_SALT: "salt",
    QR_BASE_URL: "http://127.0.0.1:0",
  });

  const server: Server = createServer((req, res) => {
    handler(req, res).catch(() => {
      res.writeHead(500);
      res.end();
    });
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  const port = typeof address === "object" && address ? address.port : 0;
  const origin = `http://127.0.0.1:${port}`;

  try {
    check("api: health", (await fetch(`${origin}/api/health`)).status === 200);

    const created = await fetch(`${origin}/api/codes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: "https://example.com/http" }),
    });
    const payload = (await created.json()) as {
      code: { slug: string; shortUrl: string };
      key: string;
    };
    check("api: создание 201", created.status === 201, String(created.status));
    check("api: короткий адрес собран", payload.code.shortUrl.endsWith(`/d/${payload.code.slug}`));
    check("api: ключ вернули", payload.key.length >= 30);

    // редирект
    const scan = await fetch(`${origin}/d/${payload.code.slug}`, { redirect: "manual" });
    check("api: редирект 302", scan.status === 302, String(scan.status));
    check("api: Location верный", scan.headers.get("location") === "https://example.com/http");

    // правка без ключа и с ключом
    const forbidden = await fetch(`${origin}/api/codes/${payload.code.slug}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: "https://example.com/next" }),
    });
    check("api: правка без ключа 401", forbidden.status === 401, String(forbidden.status));

    const patched = await fetch(`${origin}/api/codes/${payload.code.slug}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", "x-qrix-key": payload.key },
      body: JSON.stringify({ url: "https://example.com/next" }),
    });
    check("api: правка с ключом 200", patched.status === 200, String(patched.status));

    const afterPatch = await fetch(`${origin}/d/${payload.code.slug}`, { redirect: "manual" });
    check("api: редирект уже на новый адрес", afterPatch.headers.get("location") === "https://example.com/next");

    // список по слагам
    const list = await fetch(`${origin}/api/codes?slugs=${payload.code.slug},missing`);
    const listed = (await list.json()) as { codes: { slug: string }[] };
    check("api: список отдаёт только существующие", listed.codes.length === 1);

    // статистика
    const stats = await fetch(`${origin}/api/codes/${payload.code.slug}/stats`, {
      headers: { "x-qrix-key": payload.key },
    });
    const statsBody = (await stats.json()) as { total: number };
    check("api: статистика считает сканы", statsBody.total >= 2, String(statsBody.total));

    // несуществующий код
    check("api: 404 на неизвестный слаг", (await fetch(`${origin}/d/zzzzzzz`)).status === 404);

    // удаление
    const removed = await fetch(`${origin}/api/codes/${payload.code.slug}`, {
      method: "DELETE",
      headers: { "x-qrix-key": payload.key },
    });
    check("api: удаление 200", removed.status === 200);
    check("api: после удаления 404", (await fetch(`${origin}/d/${payload.code.slug}`)).status === 404);

    // плохая схема адреса
    const bad = await fetch(`${origin}/api/codes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: "javascript:alert(1)" }),
    });
    check("api: javascript отклонён 400", bad.status === 400, String(bad.status));
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
}

try {
  await logic();
  await http();
} catch (error) {
  failures.push(`непойманная ошибка: ${error instanceof Error ? error.message : String(error)}`);
} finally {
  rmSync(dir, { recursive: true, force: true });
}

console.log(failures.length ? failures.map((f) => `✗ ${f}`).join("\n") : "");
console.log(`\nПройдено: ${passed}. Провалов: ${failures.length}.`);
if (failures.length) process.exitCode = 1;
