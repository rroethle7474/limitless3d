import {defineField, defineType} from 'sanity'

/**
 * Homepage stats (plan §4.3) — the proof bar's four numbers. Singleton; the
 * grid is designed for exactly four items, so the count is validated hard.
 */
export const siteStats = defineType({
  name: 'siteStats',
  title: 'Homepage stats',
  type: 'document',
  fields: [
    defineField({
      name: 'stats',
      title: 'The four numbers',
      type: 'array',
      description:
        'Shown in the proof bar on the homepage and reviews page. The layout needs exactly four — edit the numbers as they change.',
      of: [
        {
          type: 'object',
          fields: [
            defineField({
              name: 'value',
              title: 'Value',
              type: 'string',
              description: 'The big number, e.g. "500+" or "★ 4.8".',
              validation: (rule) => rule.required(),
            }),
            defineField({
              name: 'label',
              title: 'Label',
              type: 'string',
              description: 'What it counts, e.g. "Customer reviews".',
              validation: (rule) => rule.required(),
            }),
          ],
          preview: {select: {title: 'value', subtitle: 'label'}},
        },
      ],
      validation: (rule) => rule.required().length(4).error('The proof bar layout needs exactly four stats.'),
    }),
  ],
  preview: {
    prepare: () => ({title: 'Homepage stats'}),
  },
})
