export function pageItems(items, page, perPage) {
  if (page < 1) throw new RangeError("page must be 1 or greater");
  if (perPage < 1) throw new RangeError("perPage must be 1 or greater");

  const start = (page - 1) * perPage;
  const end = page * perPage - 1;
  return items.slice(start, end);
}
