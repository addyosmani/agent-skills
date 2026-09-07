'use strict';

async function previewWebhook(url, fetchImpl = fetch) {
  const response = await fetchImpl(url, { redirect: 'follow' });
  return {
    status: response.status,
    body: (await response.text()).slice(0, 2048),
  };
}

module.exports = { previewWebhook };
