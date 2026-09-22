import {defineArrayMember, defineField, defineType} from 'sanity'

export const caseStudy = defineType({
  name: 'caseStudy',
  title: 'Case Study',
  type: 'document',
  fields: [
    defineField({
      name: 'title',
      title: 'Title',
      type: 'string',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'authors',
      title: 'Authors',
      type: 'array',
      of: [
        defineArrayMember({
          type: 'object',
          name: 'author',
          title: 'Author',
          fields: [
            defineField({
              name: 'name',
              title: 'Name',
              type: 'string',
              validation: (Rule) => Rule.required(),
            }),
            defineField({
              name: 'isOrganization',
              title: 'This is an organization',
              type: 'boolean',
              description:
                'Turn on for orgs (e.g. Civitai, City Attorney). Leave off for people — the site shows last names for people and full names for orgs.',
              initialValue: false,
            }),
          ],
          preview: {
            select: {title: 'name', isOrg: 'isOrganization'},
            prepare({title, isOrg}) {
              return {
                title: title || 'Untitled',
                subtitle: isOrg ? 'Organization' : 'Person',
              }
            },
          },
        }),
      ],
    }),
    defineField({
      name: 'date',
      title: 'Date',
      type: 'string',
      description: 'Full date as YYYY-MM-DD, or year only as YYYY (e.g. 2023).',
      validation: (Rule) =>
        Rule.custom((value) => {
          if (!value) return true
          if (/^\d{4}$/.test(value)) return true
          if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return true
          return 'Use YYYY or YYYY-MM-DD'
        }),
    }),
    defineField({
      name: 'source',
      title: 'Source / outlet',
      type: 'string',
    }),
    defineField({
      name: 'venue',
      title: 'Venue (papers)',
      type: 'string',
    }),
    defineField({
      name: 'medium',
      title: 'Type',
      type: 'string',
      options: {
        list: [
          {title: 'Research', value: 'Research'},
          {title: 'News Article', value: 'News Article'},
          {title: 'Report', value: 'Report'},
          {title: 'Spreadsheet', value: 'Spreadsheet'},
        ],
      },
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'provenance',
      title: 'Provenance',
      type: 'string',
      options: {
        list: [
          {title: 'Ecosystem paper', value: 'Ecosystem paper'},
          {title: 'Open Submission', value: 'Open Submission'},
          {title: 'Collaborator submission', value: 'Collaborator submission'},
          {title: 'Team find', value: 'Team find'},
          {title: 'Annotated Bibliography', value: 'Annotated Bibliography'},
        ],
      },
    }),
    defineField({
      name: 'paperCitation',
      title: 'Paper citation #',
      type: 'number',
      description:
        'Citation number from the ecosystem paper bibliography (internal only)',
      hidden: ({document}) => document?.provenance !== 'Ecosystem paper',
      validation: (Rule) => Rule.integer().positive(),
    }),
    defineField({
      name: 'sourceUrl',
      title: 'Source URL',
      type: 'string',
    }),
    defineField({
      name: 'submitterContact',
      title: 'Submitter contact',
      type: 'string',
      description:
        'Required for open submissions — email of whoever submitted via the site form. Not shown publicly.',
      hidden: ({document}) => document?.provenance !== 'Open Submission',
      validation: (Rule) =>
        Rule.custom((value, context) => {
          const provenance = context?.document?.provenance
          if (provenance !== 'Open Submission') return true
          const contact = String(value || '').trim()
          if (!contact) {
            return 'Open submissions must include the submitter’s contact email'
          }
          if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact)) {
            return 'Enter a valid email'
          }
          return true
        }),
    }),
    defineField({
      name: 'imageUrl',
      title: 'Image URL',
      type: 'string',
    }),
    defineField({
      name: 'sensitiveThumbnail',
      title: 'Sensitive thumbnail',
      type: 'boolean',
      initialValue: false,
    }),
    defineField({
      name: 'summary',
      title: 'Summary',
      type: 'text',
    }),
    defineField({
      name: 'technologies',
      title: 'Technologies',
      type: 'array',
      of: [
        defineArrayMember({
          type: 'reference',
          to: [{type: 'technology'}],
        }),
      ],
    }),
    defineField({
      name: 'headlineSegments',
      title: 'Headline segments',
      type: 'array',
      of: [
        defineArrayMember({
          type: 'object',
          name: 'headlineSegment',
          fields: [
            defineField({
              name: 'text',
              title: 'Phrase in title',
              type: 'string',
              validation: (Rule) => Rule.required(),
            }),
            defineField({
              name: 'technology',
              title: 'Technology',
              type: 'reference',
              to: [{type: 'technology'}],
            }),
          ],
          preview: {
            select: {title: 'text', subtitle: 'technology.name'},
          },
        }),
      ],
    }),
  ],
  preview: {
    select: {
      title: 'title',
      subtitle: 'medium',
      date: 'date',
      provenance: 'provenance',
      contact: 'submitterContact',
    },
    prepare({title, subtitle, date, provenance, contact}) {
      const bits = [subtitle, date].filter(Boolean)
      if (provenance === 'Open Submission') {
        bits.unshift(contact ? `Submission · ${contact}` : 'Submission')
      }
      return {
        title,
        subtitle: bits.join(' · '),
      }
    },
  },
  orderings: [
    {
      title: 'Date, newest',
      name: 'dateDesc',
      by: [{field: 'date', direction: 'desc'}],
    },
  ],
})
