'use strict';

async function retryPayment(payment, gateway) {
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      return await gateway.charge(payment);
    } catch (error) {
      console.log(`retry ${attempt} failed: ${error.message}`);
    }
  }
  throw new Error('payment failed');
}

module.exports = { retryPayment };
