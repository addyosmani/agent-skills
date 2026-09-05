'use strict';

function validateCheckout(body) {
  return Boolean(body && body.cartId && body.paymentMethodId);
}

module.exports = { validateCheckout };
