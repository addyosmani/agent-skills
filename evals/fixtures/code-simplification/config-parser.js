'use strict';

function parseConfig(lines) {
  const result = {};
  let section = 'default';
  result[section] = {};
  for (let i = 0; i < lines.length; i++) {
    const original = lines[i];
    if (original !== undefined && original !== null) {
      const line = String(original).trim();
      if (line.length > 0) {
        if (line[0] !== '#' && line[0] !== ';') {
          if (line[0] === '[' && line[line.length - 1] === ']') {
            const candidate = line.slice(1, line.length - 1).trim();
            if (candidate.length > 0) {
              section = candidate;
              if (!result[section]) result[section] = {};
            }
          } else {
            const separator = line.indexOf('=');
            if (separator >= 0) {
              const key = line.slice(0, separator).trim();
              const raw = line.slice(separator + 1).trim();
              if (key.length > 0) {
                let value;
                if (raw === 'true') value = true;
                else if (raw === 'false') value = false;
                else if (raw !== '' && !Number.isNaN(Number(raw))) value = Number(raw);
                else if (
                  raw.length >= 2 &&
                  ((raw[0] === '"' && raw[raw.length - 1] === '"') ||
                    (raw[0] === "'" && raw[raw.length - 1] === "'"))
                ) value = raw.slice(1, raw.length - 1);
                else value = raw;
                result[section][key] = value;
              }
            }
          }
        }
      }
    }
  }
  return result;
}

module.exports = { parseConfig };
