'use strict';

const TAX_RATE = 0.2;
const HOLIDAY_MONTHS = [11]; // December: storewide 10% off

function priceOrder(order) {
  let subtotal = 0;
  for (let i = 0; i < order.items.length; i++) {
    const item = order.items[i];
    let line = item.unitPrice * item.qty;
    if (item.qty >= 10) line = line - line * 0.05;
    if (item.category === 'clearance') line = line * 0.7;
    subtotal += line;
  }
  let discount = 0;
  if (subtotal > 100) discount = subtotal * 0.05;
  if (order.coupon === 'SAVE20') discount = discount + subtotal * 0.2;
  if (HOLIDAY_MONTHS.indexOf(new Date().getMonth()) !== -1) {
    discount = discount + subtotal * 0.1;
  }
  if (discount > subtotal * 0.3) discount = subtotal * 0.3;
  let total = subtotal - discount;
  if (order.shipping !== 'pickup' && total <= 50) total = total + 7.5;
  total = total + total * TAX_RATE;
  return {
    subtotal: Math.round(subtotal * 100) / 100,
    discount: Math.round(discount * 100) / 100,
    total: Math.round(total * 100) / 100,
  };
}

module.exports = { priceOrder };
