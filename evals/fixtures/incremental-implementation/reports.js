'use strict';

function visibleReports(reports) {
  return reports.filter((report) => !report.archived);
}

module.exports = { visibleReports };
