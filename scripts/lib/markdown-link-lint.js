'use strict';

const path = require('node:path');

function stripFencedCodeBlocks(markdown) {
  const lines = markdown.split('\n');
  let fence = null;

  return lines.map((line) => {
    if (fence !== null) {
      const closingFence = new RegExp(
        `^ {0,3}\\${fence.character}{${fence.length},}[ \\t]*$`,
      );
      if (closingFence.test(line)) fence = null;
      return '';
    }

    const openingFence = line.match(/^ {0,3}(`{3,}|~{3,})(.*)$/);
    if (
      openingFence
      && !(openingFence[1][0] === '`' && openingFence[2].includes('`'))
    ) {
      fence = {
        character: openingFence[1][0],
        length: openingFence[1].length,
      };
      return '';
    }

    return line;
  }).join('\n');
}

function stripCodeSpans(markdown) {
  const characters = [...markdown];
  let cursor = 0;

  while (cursor < characters.length) {
    if (characters[cursor] !== '`') {
      cursor++;
      continue;
    }

    const openingStart = cursor;
    while (characters[cursor] === '`') cursor++;
    const openingLength = cursor - openingStart;
    let search = cursor;
    let closingEnd = null;

    while (search < characters.length) {
      if (characters[search] !== '`') {
        search++;
        continue;
      }
      const runStart = search;
      while (characters[search] === '`') search++;
      if (search - runStart === openingLength) {
        closingEnd = search;
        break;
      }
    }

    if (closingEnd === null) continue;
    for (let index = openingStart; index < closingEnd; index++) {
      if (characters[index] !== '\n' && characters[index] !== '\r') {
        characters[index] = ' ';
      }
    }
    cursor = closingEnd;
  }

  return characters.join('');
}

function stripCode(markdown) {
  return stripCodeSpans(stripFencedCodeBlocks(markdown));
}

function unescapeMarkdown(value) {
  return value.replace(
    /\\([!"#$%&'()*+,\-./:;<=>?@[\\\]^_`{|}~])/g,
    '$1',
  );
}

function isIgnoredDestination(destination) {
  const unescaped = unescapeMarkdown(destination);
  return (
    unescaped.length === 0
    || /^[a-z][a-z0-9+.-]*:/i.test(unescaped)
    || unescaped.startsWith('//')
    || unescaped.startsWith('/')
  );
}

function isEscaped(value, index) {
  let backslashes = 0;
  for (let cursor = index - 1; cursor >= 0 && value[cursor] === '\\'; cursor--) {
    backslashes++;
  }
  return backslashes % 2 === 1;
}

function openingBracketFor(line, closeBracket) {
  for (let index = closeBracket - 1; index >= 0; index--) {
    if (line[index] === ']' && !isEscaped(line, index)) return -1;
    if (line[index] === '[' && !isEscaped(line, index)) return index;
  }
  return -1;
}

function inlineDestinations(line, lineNumber) {
  const destinations = [];
  let cursor = 0;

  while (cursor < line.length) {
    const closeBracket = line.indexOf('](', cursor);
    if (closeBracket === -1) break;

    const openBracket = isEscaped(line, closeBracket)
      ? -1
      : openingBracketFor(line, closeBracket);
    if (openBracket === -1) {
      cursor = closeBracket + 2;
      continue;
    }

    const isImage = openBracket > 0 && line[openBracket - 1] === '!';
    let start = closeBracket + 2;
    while (/\s/.test(line[start] ?? '')) start++;

    let destination = '';
    let destinationEnd = start;
    let closingParenthesis = null;
    if (line[start] === '<') {
      const closingAngle = line.indexOf('>', start + 1);
      if (closingAngle !== -1) {
        destination = line.slice(start + 1, closingAngle);
        const candidate = line.indexOf(')', closingAngle + 1);
        if (candidate !== -1) closingParenthesis = candidate;
      }
    } else {
      let depth = 0;
      let escaped = false;
      let destinationComplete = false;
      for (let index = start; index < line.length; index++) {
        const character = line[index];
        if (escaped) {
          escaped = false;
          if (!destinationComplete) destinationEnd = index + 1;
          continue;
        }
        if (character === '\\') {
          escaped = true;
          if (!destinationComplete) destinationEnd = index + 1;
          continue;
        }
        if (character === '(') {
          depth++;
        } else if (character === ')') {
          if (depth === 0) {
            closingParenthesis = index;
            if (!destinationComplete) destinationEnd = index;
            break;
          }
          depth--;
        } else if (/\s/.test(character) && depth === 0) {
          destinationComplete = true;
          continue;
        }
        if (!destinationComplete) destinationEnd = index + 1;
      }
      destination = line.slice(start, destinationEnd);
    }

    if (
      closingParenthesis !== null
      && !isImage
      && !isIgnoredDestination(destination)
    ) {
      destinations.push({ destination, line: lineNumber });
    }
    cursor = closingParenthesis === null
      ? closeBracket + 2
      : closingParenthesis + 1;
  }

  return destinations;
}

function extractDestinations(markdown) {
  const prose = stripCode(markdown);
  const destinations = [];
  const definitions = new Map();
  const definitionLines = new Set();
  const lines = prose.split('\n');

  lines.forEach((line, index) => {
    const lineNumber = index + 1;
    destinations.push(...inlineDestinations(line, lineNumber));

    const definition = line.match(
      /^\s{0,3}\[([^\]]+)\]:\s*(?:<([^>]+)>|(\S+))/,
    );
    const destination = definition?.[2] ?? definition?.[3];
    if (definition && destination && !isIgnoredDestination(destination)) {
      const label = definition[1].trim().replace(/\s+/g, ' ').toLowerCase();
      if (!definitions.has(label)) {
        definitions.set(label, { destination, line: lineNumber });
      }
      definitionLines.add(index);
    }
  });

  const usedLabels = new Set();
  lines.forEach((line, index) => {
    if (definitionLines.has(index)) return;

    const reference = /(!?)\[([^\]]+)\](?:\[([^\]]*)\])?/g;
    let match;
    while ((match = reference.exec(line)) !== null) {
      if (
        match[1] === '!'
        || isEscaped(line, match.index)
        || line[reference.lastIndex] === '('
      ) {
        continue;
      }
      const label = (match[3] || match[2]).trim().replace(/\s+/g, ' ').toLowerCase();
      if (definitions.has(label)) usedLabels.add(label);
    }
  });

  for (const [label, definition] of definitions) {
    if (usedLabels.has(label)) destinations.push(definition);
  }

  destinations.sort((left, right) => left.line - right.line);
  return destinations;
}

function githubSlug(text) {
  return text
    .trim()
    .toLowerCase()
    .replace(/<[^>]*>/g, '')
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/[*~`]/g, '')
    .replace(/[^\p{L}\p{N}\s_-]/gu, '')
    .replace(/\s/g, '-');
}

function buildAnchorSet(markdown) {
  const prose = stripFencedCodeBlocks(markdown);
  const anchors = new Set();
  const usedHeadingSlugs = new Set();
  const lines = prose.split('\n');

  function addHeading(headingText) {
    const baseSlug = githubSlug(headingText);
    if (!baseSlug) return;

    let slug = baseSlug;
    let suffix = 1;
    while (usedHeadingSlugs.has(slug)) {
      slug = `${baseSlug}-${suffix}`;
      suffix++;
    }
    usedHeadingSlugs.add(slug);
    anchors.add(slug);
  }

  for (let index = 0; index < lines.length; index++) {
    const line = lines[index];
    const atxHeading = line.match(/^\s{0,3}#{1,6}\s+(.+?)\s*#*\s*$/);
    if (atxHeading) addHeading(atxHeading[1]);

    const setextUnderline = lines[index + 1]?.match(/^\s{0,3}(?:=+|-+)\s*$/);
    if (!atxHeading && setextUnderline && line.trim()) addHeading(line.trim());

    const explicitAnchor = /\b(?:id|name)\s*=\s*["']([^"']+)["']/gi;
    let match;
    while ((match = explicitAnchor.exec(line)) !== null) {
      anchors.add(match[1]);
    }
  }

  return anchors;
}

function toPosix(filePath) {
  return filePath.split(path.sep).join('/');
}

function defaultExistingPaths(documents) {
  const existingPaths = new Set(['.']);
  for (const documentPath of documents.keys()) {
    const normalized = toPosix(path.normalize(documentPath));
    existingPaths.add(normalized);

    let parent = path.posix.dirname(normalized);
    while (parent !== '.') {
      existingPaths.add(parent);
      parent = path.posix.dirname(parent);
    }
  }
  return existingPaths;
}

function decodePart(value) {
  try {
    return { value: decodeURIComponent(value) };
  } catch {
    return { error: 'invalid percent encoding' };
  }
}

function targetForDestination(_root, source, destination) {
  const logicalDestination = unescapeMarkdown(destination);
  const hashIndex = logicalDestination.indexOf('#');
  const pathAndQuery = hashIndex === -1
    ? logicalDestination
    : logicalDestination.slice(0, hashIndex);
  const queryIndex = pathAndQuery.indexOf('?');
  const rawPath = queryIndex === -1
    ? pathAndQuery
    : pathAndQuery.slice(0, queryIndex);
  const rawFragment = hashIndex === -1
    ? null
    : logicalDestination.slice(hashIndex + 1);
  const decodedPath = decodePart(rawPath);
  if (decodedPath.error) return { error: decodedPath.error };

  const decodedFragment = rawFragment === null ? { value: null } : decodePart(rawFragment);
  if (decodedFragment.error) return { error: decodedFragment.error };

  const unresolvedTarget = rawPath === ''
    ? source
    : path.posix.normalize(
      path.posix.join(path.posix.dirname(source), decodedPath.value),
    );
  const relativeTarget = unresolvedTarget.replace(/\/+$/, '') || '.';
  if (
    relativeTarget === '..'
    || relativeTarget.startsWith('../')
    || path.posix.isAbsolute(relativeTarget)
  ) {
    return { error: 'target escapes repository root' };
  }

  return {
    fragment: decodedFragment.value,
    target: relativeTarget,
  };
}

function validateDocuments(root, documents, existingPaths = defaultExistingPaths(documents)) {
  const normalizedDocuments = new Map(
    [...documents].map(([documentPath, content]) => [
      toPosix(path.normalize(documentPath)),
      content,
    ]),
  );
  const normalizedExistingPaths = new Set(
    [...existingPaths].map((filePath) => toPosix(path.normalize(filePath))),
  );
  const anchorsByDocument = new Map();
  const diagnostics = [];

  for (const [source, markdown] of normalizedDocuments) {
    for (const { destination, line } of extractDestinations(markdown)) {
      const resolved = targetForDestination(root, source, destination);
      if (resolved.error) {
        diagnostics.push({ destination, line, reason: resolved.error, source });
        continue;
      }

      if (!normalizedExistingPaths.has(resolved.target)) {
        diagnostics.push({
          destination,
          line,
          reason: `target does not exist: ${resolved.target}`,
          source,
        });
        continue;
      }

      if (resolved.fragment === null || resolved.fragment === '') continue;
      if (!/\.md$/i.test(resolved.target)) {
        diagnostics.push({
          destination,
          line,
          reason: `cannot validate fragment on non-Markdown target: ${resolved.target}`,
          source,
        });
        continue;
      }

      if (!anchorsByDocument.has(resolved.target)) {
        const targetMarkdown = normalizedDocuments.get(resolved.target);
        anchorsByDocument.set(
          resolved.target,
          targetMarkdown === undefined ? new Set() : buildAnchorSet(targetMarkdown),
        );
      }
      if (!anchorsByDocument.get(resolved.target).has(resolved.fragment)) {
        diagnostics.push({
          destination,
          line,
          reason: `fragment not found in ${resolved.target}: #${resolved.fragment}`,
          source,
        });
      }
    }
  }

  return diagnostics;
}

module.exports = {
  buildAnchorSet,
  extractDestinations,
  githubSlug,
  stripCode,
  validateDocuments,
};
