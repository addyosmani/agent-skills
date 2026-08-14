# Catalog product brief (schema focus)

We need a multi-tenant product catalog for an internal ops tool.

Entities (draft):

- Tenant (organization)
- Product (belongs to one tenant)
- Price (a product may have many prices over time; only one active price per currency)

Known query shapes:

1. List active products for the current tenant, ordered by updated_at desc, paginated.
2. Fetch a product by public id within a tenant (authz must not leak cross-tenant).
3. Resolve the active price for a product + currency at checkout time.

Constraints from the business:

- Product SKUs are unique per tenant, not globally.
- Prices are monetary amounts in USD or EUR only for v1.
- Soft-delete products; hard-delete is not allowed after a price has been charged.
- We will rename `products.title` → `products.name` within two releases (legacy column exists in a prototype DB).

Still undecided:

- Whether price history is retained forever or compacted after 90 days.
- Whether SKUs may be reused after soft-delete.
