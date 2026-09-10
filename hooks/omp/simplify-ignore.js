import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";


function sha1Hex(value) {
  return crypto.createHash("sha1").update(value, "utf8").digest("hex");
}

function fileId(filePath) {
  return sha1Hex(filePath).slice(0, 16);
}

function blockHash(content) {
  return sha1Hex(content).slice(0, 8);
}

function splitSource(src) {
  const hasTrailingNl = src.endsWith("\n");
  const body = hasTrailingNl ? src.slice(0, -1) : src;
  const lines = body.split("\n");
  return { lines, hasTrailingNl };
}

function joinSource(lines, hasTrailingNl) {
  const text = lines.join("\n");
  return hasTrailingNl ? `${text}\n` : text;
}

function extractReason(line) {
  const idx = line.indexOf("simplify-ignore-start:");
  if (idx === -1) return "";
  let rest = line.slice(idx + "simplify-ignore-start:".length).replace(/^\s+/, "");
  rest = rest.replace(/\s*\*\/.*$/, "");
  rest = rest.replace(/\s*-->.*$/, "");
  return rest.replace(/\s+$/, "");
}

function commentSuffix(line) {
  if (line.includes("*/")) return " */";
  if (line.includes("-->")) return " -->";
  return "";
}

function placeholderFor(block) {
  if (block.reason) {
    return `${block.prefix}BLOCK_${block.hash}: ${block.reason}${block.suffix}`;
  }
  return `${block.prefix}BLOCK_${block.hash}${block.suffix}`;
}

/**
 * Replace simplify-ignore blocks with BLOCK_<hash> placeholders.
 * @param {string} src
 * @returns {{ text: string, blocks: Array<{hash: string, content: string, reason: string, prefix: string, suffix: string}>, unclosed: boolean }}
 */
function filterContent(src) {
  const { lines, hasTrailingNl } = splitSource(src);
  const out = [];
  const blocks = [];
  let inBlock = false;
  let buf = "";
  let reason = "";
  let prefix = "";
  let suffix = "";
  let unclosed = false;

  const flushBlock = () => {
    const hash = blockHash(buf);
    const block = { hash, content: buf, reason, prefix, suffix };
    blocks.push(block);
    out.push(placeholderFor(block));
    inBlock = false;
    buf = "";
    reason = "";
    prefix = "";
    suffix = "";
  };

  for (const line of lines) {
    if (!inBlock && line.includes("simplify-ignore-start")) {
      inBlock = true;
      buf = line;
      prefix = line.slice(0, line.indexOf("simplify-ignore-start"));
      suffix = commentSuffix(line);
      reason = extractReason(line);
      if (line.includes("simplify-ignore-end")) {
        flushBlock();
      }
      continue;
    }
    if (inBlock) {
      buf += `\n${line}`;
      if (line.includes("simplify-ignore-end")) {
        flushBlock();
      }
      continue;
    }
    out.push(line);
  }

  if (inBlock && buf) {
    unclosed = true;
    out.push(buf);
  }

  return { text: joinSource(out, hasTrailingNl), blocks, unclosed };
}

function expandPlaceholders(text, blocks) {
  const { lines, hasTrailingNl } = splitSource(text);
  const out = [];
  for (let line of lines) {
    if (line.includes("BLOCK_")) {
      for (const block of blocks) {
        if (!line.includes(`BLOCK_${block.hash}`)) continue;
        const exact = placeholderFor(block);
        if (line.includes(exact)) {
          line = line.split(exact).join(block.content);
        } else if (!block.content.includes(`BLOCK_${block.hash}`)) {
          const fuzzy = `${block.prefix}BLOCK_${block.hash}${block.suffix}`;
          if (line.includes(fuzzy)) {
            line = line.split(fuzzy).join(block.content);
          }
          if (line.includes(`BLOCK_${block.hash}`)) {
            line = line.split(`BLOCK_${block.hash}`).join(block.content);
          }
        }
      }
    }
    out.push(line);
  }
  return joinSource(out, hasTrailingNl);
}

function cacheDirFor(cwd) {
  return path.join(cwd, ".omp", ".simplify-ignore-cache");
}

function skipPath(filePath) {
  const base = path.basename(filePath);
  return (
    base.startsWith("simplify-ignore") ||
    base.startsWith("SIMPLIFY-IGNORE")
  );
}

function isHttpUrl(value) {
  return typeof value === "string" && /^https?:\/\//i.test(value);
}

function pathsFromEditInput(input) {
  const text = typeof input === "string" ? input : input?.input;
  if (typeof text !== "string") return [];
  const paths = [];
  const re = /^\[([^\]#\n]+)#/gm;
  let match;
  while ((match = re.exec(text))) {
    paths.push(match[1]);
  }
  return paths;
}

function writeBlockCache(dir, id, blocks) {
  for (const name of fs.readdirSync(dir)) {
    if (
      name.startsWith(`${id}.block.`) ||
      name.startsWith(`${id}.reason.`) ||
      name.startsWith(`${id}.prefix.`) ||
      name.startsWith(`${id}.suffix.`)
    ) {
      fs.unlinkSync(path.join(dir, name));
    }
  }
  for (const block of blocks) {
    fs.writeFileSync(path.join(dir, `${id}.block.${block.hash}`), block.content);
    if (block.reason) {
      fs.writeFileSync(path.join(dir, `${id}.reason.${block.hash}`), block.reason);
    }
    fs.writeFileSync(path.join(dir, `${id}.prefix.${block.hash}`), block.prefix);
    fs.writeFileSync(path.join(dir, `${id}.suffix.${block.hash}`), block.suffix);
  }
}

function loadBlocks(dir, id) {
  const blocks = [];
  if (!fs.existsSync(dir)) return blocks;
  for (const name of fs.readdirSync(dir)) {
    if (!name.startsWith(`${id}.block.`)) continue;
    const hash = name.slice(`${id}.block.`.length);
    const content = fs.readFileSync(path.join(dir, name), "utf8");
    const reasonFile = path.join(dir, `${id}.reason.${hash}`);
    const prefixFile = path.join(dir, `${id}.prefix.${hash}`);
    const suffixFile = path.join(dir, `${id}.suffix.${hash}`);
    blocks.push({
      hash,
      content,
      reason: fs.existsSync(reasonFile) ? fs.readFileSync(reasonFile, "utf8") : "",
      prefix: fs.existsSync(prefixFile) ? fs.readFileSync(prefixFile, "utf8") : "",
      suffix: fs.existsSync(suffixFile) ? fs.readFileSync(suffixFile, "utf8") : "",
    });
  }
  return blocks;
}

function restoreAll(dir) {
  if (!fs.existsSync(dir)) return;
  for (const name of fs.readdirSync(dir)) {
    if (!name.endsWith(".bak")) continue;
    const id = name.slice(0, -".bak".length);
    const bak = path.join(dir, name);
    const pathFile = path.join(dir, `${id}.path`);
    if (!fs.existsSync(pathFile)) {
      fs.unlinkSync(bak);
      continue;
    }
    const orig = fs.readFileSync(pathFile, "utf8");
    if (fs.existsSync(orig)) {
      fs.copyFileSync(bak, orig);
    } else {
      fs.mkdirSync(path.dirname(`${orig}.recovered`), { recursive: true });
      fs.renameSync(bak, `${orig}.recovered`);
    }
    for (const leftover of fs.readdirSync(dir)) {
      if (leftover === `${id}.bak` || leftover.startsWith(`${id}.`)) {
        try {
          const p = path.join(dir, leftover);
          if (fs.statSync(p).isDirectory()) fs.rmdirSync(p);
          else fs.unlinkSync(p);
        } catch {
          /* ignore */
        }
      }
    }
  }
}

function filterFileInPlace(filePath, dir) {
  if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) return;
  if (skipPath(filePath) || isHttpUrl(filePath)) return;
  const src = fs.readFileSync(filePath, "utf8");
  if (!src.includes("simplify-ignore-start")) return;
  const id = fileId(filePath);
  const bak = path.join(dir, `${id}.bak`);
  if (fs.existsSync(bak)) return;
  fs.mkdirSync(dir, { recursive: true });
  const { text, blocks } = filterContent(src);
  if (blocks.length === 0) return;
  fs.copyFileSync(filePath, bak);
  fs.writeFileSync(path.join(dir, `${id}.path`), filePath);
  writeBlockCache(dir, id, blocks);
  fs.writeFileSync(filePath, text);
}

function expandThenRefilter(filePath, dir) {
  if (!fs.existsSync(filePath)) return;
  const id = fileId(filePath);
  const bak = path.join(dir, `${id}.bak`);
  if (!fs.existsSync(bak)) return;
  const blocks = loadBlocks(dir, id);
  if (blocks.length === 0) return;
  const current = fs.readFileSync(filePath, "utf8");
  const expanded = expandPlaceholders(current, blocks);
  fs.writeFileSync(filePath, expanded);
  fs.copyFileSync(filePath, bak);
  const { text, blocks: next } = filterContent(expanded);
  if (next.length > 0) {
    writeBlockCache(dir, id, next);
    fs.writeFileSync(filePath, text);
  }
}

/**
 * Opt-in Oh My Pi extension for `/code-simplify` block protection.
 * Enable via `extensions:` in config — do not drop this file in `.omp/extensions/`.
 *
 * @param {{ on: Function }} pi
 * @param {{ cwd?: string }} [opts]
 */
function simplifyIgnore(pi, opts = {}) {
  pi.on("tool_call", async (event, ctx) => {
    try {
      if (event.toolName !== "read") return;
      const filePath = event.input?.path;
      if (typeof filePath !== "string" || isHttpUrl(filePath)) return;
      const cwd = opts.cwd || ctx?.cwd || process.cwd();
      filterFileInPlace(path.isAbsolute(filePath) ? filePath : path.resolve(cwd, filePath), cacheDirFor(cwd));
    } catch {
      return;
    }
  });

  pi.on("tool_result", async (event, ctx) => {
    try {
      if (event.toolName !== "write" && event.toolName !== "edit") return;
      const cwd = opts.cwd || ctx?.cwd || process.cwd();
      const dir = cacheDirFor(cwd);
      const files =
        event.toolName === "write"
          ? [event.input?.path].filter(Boolean)
          : pathsFromEditInput(event.input);
      for (const filePath of files) {
        const resolved = path.isAbsolute(filePath) ? filePath : path.resolve(cwd, filePath);
        expandThenRefilter(resolved, dir);
      }
    } catch {
      return;
    }
  });

  pi.on("session_shutdown", async (_event, ctx) => {
    try {
      const cwd = opts.cwd || ctx?.cwd || process.cwd();
      restoreAll(cacheDirFor(cwd));
    } catch {
      return;
    }
  });
}

export default simplifyIgnore;
export { filterContent, expandPlaceholders, fileId, pathsFromEditInput };
