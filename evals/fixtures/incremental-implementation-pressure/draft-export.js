'use strict';

async function exportReports(reports, setStatus, analytics) {
  setStatus('working');
  const csv = `name,total\n${reports.map((r) => `${r.name},${r.total}`).join('\n')}`;
  const blob = new Blob([csv], { type: 'text/csv' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = 'reports.csv';
  document.body.appendChild(link);
  link.click();
  link.remove();
  analytics.track('report_exported', { count: reports.length });
  setStatus('done');
}

module.exports = { exportReports };
