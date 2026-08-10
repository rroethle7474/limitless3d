import {defineField, defineType} from 'sanity'

/**
 * Business info (plan §4.4). Singleton. Only the facts that change and that the
 * site renders: phone, email, service area. Everything else (legal name, owner,
 * address for JSON-LD, social URLs, nav) is code-fixed per §4.
 */
export const businessInfo = defineType({
  name: 'businessInfo',
  title: 'Business info',
  type: 'document',
  fields: [
    defineField({
      name: 'phone',
      title: 'Phone number',
      type: 'string',
      description: 'As shown on the site, e.g. "920-360-7543". The tap-to-call link is built from this automatically.',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'email',
      title: 'Email address',
      type: 'string',
      description: 'Shown in the quote section, contact page, and footer.',
      validation: (rule) =>
        rule.required().custom((value) =>
          value && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) ? true : 'That does not look like an email address.',
        ),
    }),
    defineField({
      name: 'areaServed',
      title: 'Cities served',
      type: 'array',
      of: [{type: 'string'}],
      description: 'Used in the site’s search-engine data, e.g. Neenah, Appleton, Oshkosh, Menasha.',
      validation: (rule) => rule.required().min(1),
    }),
    defineField({
      name: 'areaServedState',
      title: 'State served',
      type: 'string',
      description: 'e.g. "Wisconsin".',
      validation: (rule) => rule.required(),
    }),
  ],
  preview: {
    prepare: () => ({title: 'Business info'}),
  },
})
