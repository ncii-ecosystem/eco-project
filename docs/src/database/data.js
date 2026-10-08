window.DATABASE = (function () {
  'use strict';

  var constants = window.DatabaseConstants || {};
  var ROLE_CLASS = constants.ROLE_CLASS || {};
  var CONTENT_TYPES = constants.MEDIUMS || [];

  var TECHNOLOGY_GROUPS = [
    {
      label: 'Creation',
      items: [
        'Training Datasets',
        'Generative AI Models',
        'Generative AI Interfaces'
      ]
    },
    {
      label: 'Distribution',
      items: ['Distribution Channels']
    },
    {
      label: 'Proliferation & Discovery',
      items: [
        'Deepfake Creation Communities',
        'Search Engines',
        'Advertisement Platforms',
        'App Stores'
      ]
    },
    {
      label: 'Infrastructural Support',
      items: ['Developer Platforms', 'Critical Service Providers']
    },
    {
      label: 'Monetization',
      items: ['Payment Processors']
    }
  ];

  var TECH_ICONS = {
    'Training Datasets': 'fa-database',
    'Generative AI Models': 'fa-code',
    'Generative AI Interfaces': 'fa-magic',
    'Distribution Channels': 'fa-comment',
    'Deepfake Creation Communities': 'fa-users',
    'Search Engines': 'fa-search',
    'Advertisement Platforms': 'fa-bullhorn',
    'App Stores': 'fa-shopping-cart',
    'Developer Platforms': 'fa-laptop-code',
    'Critical Service Providers': 'fa-tools',
    'Payment Processors': 'fa-hand-holding-usd'
  };

  var TECH_ROLE = {};
  TECHNOLOGY_GROUPS.forEach(function (group) {
    var cls = ROLE_CLASS[group.label] || '';
    group.items.forEach(function (label) {
      TECH_ROLE[label] = cls;
    });
  });

  return {
    TECHNOLOGY_GROUPS: TECHNOLOGY_GROUPS,
    CONTENT_TYPES: CONTENT_TYPES,
    ROLE_CLASS: ROLE_CLASS,
    TECH_ICONS: TECH_ICONS,
    TECH_ROLE: TECH_ROLE
  };
})();
