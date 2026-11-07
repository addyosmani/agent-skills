'use strict';

const MAX_BATCH_SIZE = 50;
const RETENTION_MS = 72 * 60 * 60 * 1000;
const MAX_RETRIES = 3;
const jobs = new Map();

function submit(batch, now = Date.now()) {
  if (batch.length > MAX_BATCH_SIZE) throw new Error('Batch exceeds limit');
  for (const job of batch) {
    jobs.set(job.id, { ...job, createdAt: now, retries: 0, state: 'queued' });
  }
}

function recordFailure(id) {
  const job = jobs.get(id);
  if (!job) throw new Error('Unknown job');
  if (job.retries < MAX_RETRIES) {
    job.retries += 1;
    job.state = 'queued';
  } else {
    job.state = 'operator-review';
  }
}

function expire(now = Date.now()) {
  for (const [id, job] of jobs) {
    if (now - job.createdAt >= RETENTION_MS) jobs.delete(id);
  }
}

module.exports = { submit, recordFailure, expire, MAX_BATCH_SIZE, RETENTION_MS, MAX_RETRIES };
