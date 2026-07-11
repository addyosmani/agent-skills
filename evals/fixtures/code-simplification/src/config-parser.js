export function parseConfig(source) {
  const result = {};
  const lines = source.split(/\r?\n/);

  for (let i = 0; i < lines.length; i += 1) {
    let line = lines[i];
    if (line === undefined) {
      continue;
    } else {
      line = line.trim();
      if (line.length === 0) {
        continue;
      } else {
        if (line[0] === "#") {
          continue;
        } else {
          const equalsIndex = line.indexOf("=");
          if (equalsIndex === -1) {
            continue;
          } else {
            const rawKey = line.slice(0, equalsIndex);
            const rawValue = line.slice(equalsIndex + 1);
            const key = rawKey.trim();
            let value = rawValue.trim();
            if (value === "true") {
              result[key] = true;
            } else {
              if (value === "false") {
                result[key] = false;
              } else {
                const maybeNumber = Number(value);
                if (value !== "" && Number.isFinite(maybeNumber)) {
                  result[key] = maybeNumber;
                } else {
                  if (
                    (value.startsWith('"') && value.endsWith('"')) ||
                    (value.startsWith("'") && value.endsWith("'"))
                  ) {
                    value = value.slice(1, -1);
                  }
                  result[key] = value;
                }
              }
            }
          }
        }
      }
    }
  }

  return result;
}
