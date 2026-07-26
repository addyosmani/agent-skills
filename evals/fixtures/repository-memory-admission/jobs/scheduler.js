'use strict';

const store = require('./store');

function dueJobs(now = new Date()) {
  const all = store.loadAll();
  return Object.values(all).filter((job) => new Date(job.nextRun) <= now);
}

function reschedule(job, now = new Date()) {
  const all = store.loadAll();
  all[job.id].nextRun = new Date(now.getTime() + job.intervalMs).toISOString();
  const fs = require('fs');
  fs.writeFileSync(process.env.JOBS_DB || 'jobs.json', JSON.stringify(all, null, 2));
}

function tick(fire, now = new Date()) {
  for (const job of dueJobs(now)) {
    fire(job);
    reschedule(job, now);
  }
}

module.exports = { dueJobs, reschedule, tick };
