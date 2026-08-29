function formatTimestamp(date = new Date(), format = "iso") {
  if (format === "iso") return date.toISOString();
  return date.toString();
}

module.exports = { formatTimestamp };

if (require.main === module) {
  const format = process.argv.includes("--format")
    ? process.argv[process.argv.indexOf("--format") + 1]
    : "iso";
  console.log(formatTimestamp(new Date(), format));
}
