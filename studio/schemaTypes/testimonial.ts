import {defineField, defineType} from 'sanity'

/**
 * Testimonial / review (plan §4.2). Three seeded: the site-wide quote band
 * (`quoteBand: true`) plus the two review-page cards. The quote-band text is a
 * shortened variant of review #1 — deliberately separate documents.
 */
export const testimonial = defineType({
  name: 'testimonial',
  title: 'Testimonial',
  type: 'document',
  fields: [
    defineField({
      name: 'quote',
      title: 'Quote',
      type: 'text',
      rows: 4,
      description: 'The customer’s words, without surrounding quotation marks — the site adds those.',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'highlight',
      title: 'Highlighted phrase',
      type: 'string',
      description:
        'Optional: an exact phrase from the quote to show in the accent color (used by the big quote band). Must match the quote text letter-for-letter.',
      validation: (rule) =>
        rule.custom((highlight, context) => {
          if (!highlight) return true
          const quote = (context.document?.quote as string | undefined) ?? ''
          return quote.includes(highlight)
            ? true
            : 'This phrase does not appear in the quote — it must match letter-for-letter.'
        }),
    }),
    defineField({
      name: 'attribution',
      title: 'Attribution',
      type: 'string',
      description: 'Who said it, e.g. "Verified customer · fountain nozzle project".',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'source',
      title: 'Where it came from',
      type: 'string',
      options: {list: ['Google', 'Etsy', 'Direct'], layout: 'radio'},
      description: 'Optional — for your own records; not shown on the site yet.',
    }),
    defineField({
      name: 'quoteBand',
      title: 'Use in the big quote band',
      type: 'boolean',
      description:
        'On = this is the single quote shown in the wide band on the homepage, gallery, and about pages. The reviews page lists the others. Turn it on for exactly one testimonial.',
      initialValue: false,
    }),
    defineField({
      name: 'order',
      title: 'Sort order',
      type: 'number',
      description: 'Lower numbers show first on the reviews page.',
    }),
  ],
  orderings: [
    {
      title: 'Sort order',
      name: 'orderAsc',
      by: [{field: 'order', direction: 'asc'}],
    },
  ],
  preview: {
    select: {title: 'attribution', subtitle: 'quote'},
  },
})
