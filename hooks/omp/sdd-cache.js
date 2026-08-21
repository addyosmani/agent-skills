import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";


function hashKey(url) {
  return crypto.createHash("sha256").update(url, "utf8").digest("hex").slice(0, 32);
}

function isHttpUrl(value) {
  return typeof value === "string" && /^https?:\/\//i.test(value);
}

function cacheDirFor(cwd) {
  return path.join(cwd, ".omp", "sdd-cache");
}

function formatHit({ url, content, fetchedAt, prompt }) {
  let verified = "unknown";
  if (Number.isFinite(fetchedAt) && fetchedAt > 0) {
    verified = new Date(fetchedAt * 1000).toISOString().replace(/\.\d{3}Z$/, "Z");
  }
  let out =
    `[sdd-cache] Cache hit for ${url}\n\n` +
    `Revalidated via HTTP 304; unchanged since ${verified}. Use the cached\n` +
    `content below as if WebFetch had just returned it.\n\n`;
  if (prompt) {
    out +=
      `Original WebFetch prompt: "${prompt}". If your angle differs, judge\n` +
      `whether this reading still covers it.\n\n`;
  }
  out += `----- BEGIN CACHED CONTENT -----\n${content}\n----- END CACHED CONTENT -----\n`;
  return out;
}

function headerGet(headers, name) {
  if (!headers) return "";
  if (typeof headers.get === "function") {
    return headers.get(name) || headers.get(name.toLowerCase()) || "";
  }
  return headers[name] || headers[name.toLowerCase()] || "";
}

function extractText(content) {
  if (typeof content === "string") return content;
  if (!Array.isArray(content)) return "";
  return content
    .filter((chunk) => chunk && chunk.type === "text" && typeof chunk.text === "string")
    .map((chunk) => chunk.text)
    .join("");
}

function readEntry(file) {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    return null;
  }
}

/**
 * Opt-in Oh My Pi extension. Intercepts `read` of http(s) URLs.
 * Enable via `extensions:` in config — do not drop this file in `.omp/extensions/`.
 *
 * @param {{ on: Function }} pi
 * @param {{ cwd?: string, fetch?: Function }} [opts]
 */
function sddCache(pi, opts = {}) {
  const fetchImpl = opts.fetch || globalThis.fetch;

  pi.on("tool_call", async (event, ctx) => {
    try {
      if (event.toolName !== "read") return;
      const url = event.input?.path;
      if (!isHttpUrl(url)) return;
      const cwd = opts.cwd || ctx?.cwd || process.cwd();
      const file = path.join(cacheDirFor(cwd), `${hashKey(url)}.json`);
      if (!fs.existsSync(file)) return;
      const entry = readEntry(file);
      if (!entry?.content) return;
      const etag = entry.etag || "";
      const lastModified = entry.last_modified || "";
      if (!etag && !lastModified) return;

      const headers = {};
      if (etag) headers["If-None-Match"] = etag;
      if (lastModified) headers["If-Modified-Since"] = lastModified;
      const res = await fetchImpl(url, {
        method: "HEAD",
        headers,
        redirect: "follow",
        signal: AbortSignal.timeout(5000),
      });
      if (res.status !== 304) return;

      const dir = cacheDirFor(cwd);
      fs.mkdirSync(dir, { recursive: true });
      const hitPath = path.join(dir, `${hashKey(url)}.hit.md`);
      fs.writeFileSync(
        hitPath,
        formatHit({
          url,
          content: entry.content,
          fetchedAt: entry.fetched_at,
          prompt: entry.prompt,
        }),
      );
      return { input: { ...event.input, path: hitPath } };
    } catch {
      return;
    }
  });

  pi.on("tool_result", async (event, ctx) => {
    try {
      if (event.toolName !== "read" || event.isError) return;
      const url = event.input?.path;
      if (!isHttpUrl(url)) return;
      const body = extractText(event.content);
      if (!body) return;
      const cwd = opts.cwd || ctx?.cwd || process.cwd();

      const res = await fetchImpl(url, {
        method: "HEAD",
        redirect: "follow",
        signal: AbortSignal.timeout(5000),
      });
      const etag = headerGet(res.headers, "etag");
      const lastModified = headerGet(res.headers, "last-modified");
      const dir = cacheDirFor(cwd);
      const file = path.join(dir, `${hashKey(url)}.json`);
      if (!etag && !lastModified) {
        try {
          fs.unlinkSync(file);
        } catch {
          /* no stale entry */
        }
        return;
      }
      fs.mkdirSync(dir, { recursive: true });
      const tmp = `${file}.${process.pid}.tmp`;
      fs.writeFileSync(
        tmp,
        JSON.stringify({
          url,
          prompt: event.input?.prompt || "",
          etag,
          last_modified: lastModified,
          content: body,
          fetched_at: Math.floor(Date.now() / 1000),
        }),
      );
      fs.renameSync(tmp, file);
    } catch {
      return;
    }
  });
}

export default sddCache;
export { hashKey, isHttpUrl, formatHit };
