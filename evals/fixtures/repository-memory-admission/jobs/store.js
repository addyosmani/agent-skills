'use strict';

const fs = require('fs');
const clock = require('../lib/clock');

const DB_PATH = process.env.JOBS_DB || 'jobs.json';

function saveJob(job) {
  const all = loadAll();
  all[job.id] = { id: job.id, intervalMs: job.intervalMs, nextRun: clock.serialize(job.nextRunDate) };
  fs.writeFileSync(DB_PATH, JSON.stringify(all, null, 2));
}

function loadAll() {
  try {
    return JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
  } catch {
    return {};
  }
}

module.exports = { saveJob, loadAll };
