window.DatabaseConstants = (function () {
  'use strict';

  var MEDIUMS = ['Research', 'News Article', 'Report', 'Artifact', 'Law & Policy', 'Misc'];

  var ROLE_CLASS = {
    Creation: 'role-creation',
    Distribution: 'role-distribution',
    'Proliferation & Discovery': 'role-proliferation',
    'Infrastructural Support': 'role-infra',
    Monetization: 'role-monetization'
  };

  var LIMITS = {
    TITLE: 500,
    AUTHORS: 4038,
    HIGHLIGHTS: 30,
    HIGHLIGHT_LEN: 300,
    SOURCE: 300,
    URL: 2000,
    CONTACT: 200,
    TECHNOLOGIES: 20,
    SUBMITTER_NAME: 200,
    SUBMITTER_AFFILIATION: 300,
    ENTRIES: 25
  };

  return {
    MEDIUMS: MEDIUMS,
    ROLE_CLASS: ROLE_CLASS,
    LIMITS: LIMITS
  };
})();
