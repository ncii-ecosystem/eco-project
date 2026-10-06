window.DatabaseConstants = (function () {
  'use strict';

  var submission = window.SUBMISSION_CONSTANTS || {};
  var MEDIUMS = submission.MEDIUMS || [];

  var ROLE_CLASS = {
    Creation: 'role-creation',
    Distribution: 'role-distribution',
    'Proliferation & Discovery': 'role-proliferation',
    'Infrastructural Support': 'role-infra',
    Monetization: 'role-monetization'
  };

  var LIMITS = submission.LIMITS || {};

  return {
    MEDIUMS: MEDIUMS,
    ROLE_CLASS: ROLE_CLASS,
    LIMITS: LIMITS
  };
})();
