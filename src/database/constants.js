window.DatabaseConstants = (function () {
  'use strict';

  var MEDIUMS = ['Research', 'News Article', 'Report', 'Spreadsheet'];

  var ROLE_CLASS = {
    Creation: 'role-creation',
    Distribution: 'role-distribution',
    'Proliferation & Discovery': 'role-proliferation',
    'Infrastructural Support': 'role-infra',
    Monetization: 'role-monetization'
  };

  var LIMITS = {
    TITLE: 500,
    AUTHORS: 20,
    AUTHOR_NAME: 200,
    HIGHLIGHTS: 30,
    HIGHLIGHT_LEN: 300,
    SOURCE: 300,
    VENUE: 300,
    URL: 2000,
    CONTACT: 200,
    TECHNOLOGIES: 20
  };

  return {
    MEDIUMS: MEDIUMS,
    ROLE_CLASS: ROLE_CLASS,
    LIMITS: LIMITS
  };
})();
