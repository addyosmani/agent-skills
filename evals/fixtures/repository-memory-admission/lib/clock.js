'use strict';

function pad(n) {
  return String(n).padStart(2, '0');
}

function serialize(date) {
  return (
    date.getFullYear() + '-' + pad(date.getMonth() + 1) + '-' + pad(date.getDate()) +
    'T' + pad(date.getHours()) + ':' + pad(date.getMinutes()) + ':' + pad(date.getSeconds())
  );
}

function parse(s) {
  return new Date(s);
}

function compare(a, b) {
  return parse(a).getTime() - parse(b).getTime();
}

module.exports = { serialize, parse, compare };
