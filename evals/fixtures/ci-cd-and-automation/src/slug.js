'use strict';

exports.slugify = (value) => value.trim().toLowerCase().replace(/\s+/g, '-');
