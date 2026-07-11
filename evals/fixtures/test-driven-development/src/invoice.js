export function invoiceTotal(items, taxRate = 0) {
  const subtotal = items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
  return subtotal + subtotal * taxRate;
}
