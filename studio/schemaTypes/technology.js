import {defineField, defineType} from 'sanity'

export const technology = defineType({
  name: 'technology',
  title: 'Technology',
  type: 'document',
  fields: [
    defineField({
      name: 'name',
      title: 'Name',
      type: 'string',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'role',
      title: 'Ecosystem role',
      type: 'string',
      options: {
        list: [
          {title: 'Creation', value: 'Creation'},
          {title: 'Distribution', value: 'Distribution'},
          {title: 'Proliferation & Discovery', value: 'Proliferation & Discovery'},
          {title: 'Infrastructural Support', value: 'Infrastructural Support'},
          {title: 'Monetization', value: 'Monetization'},
        ],
        layout: 'radio',
      },
      validation: (Rule) => Rule.required(),
    }),
  ],
  preview: {
    select: {title: 'name', subtitle: 'role'},
  },
})
