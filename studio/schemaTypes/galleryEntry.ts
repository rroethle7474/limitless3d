import {defineField, defineType} from 'sanity'

/**
 * Gallery / build-log entry (plan §4.1). Ten seeded from the hardcoded build;
 * every future one is Randy's. Designed for the Phase 2 acceptance test:
 * "add a gallery entry yourself" — few fields, obvious names.
 */
export const galleryEntry = defineType({
  name: 'galleryEntry',
  title: 'Gallery entry',
  type: 'document',
  fields: [
    defineField({
      name: 'title',
      title: 'Title',
      type: 'string',
      description: 'The project name shown on the slide, e.g. "Pond fountain nozzles".',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'kicker',
      title: 'Kicker (line above the title)',
      type: 'string',
      description: 'Short category label, e.g. "COMMERCIAL COMMISSION" or "REPAIR".',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'sub',
      title: 'Subline (line below the title)',
      type: 'string',
      description: 'One short line about the outcome, e.g. "BACK ON THE MOUNTAIN".',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'photo',
      title: 'Photo',
      type: 'image',
      options: {hotspot: true},
      fields: [
        defineField({
          name: 'alt',
          title: 'Photo description (alt text)',
          type: 'string',
          description:
            'Describe what is in the photo for screen readers and search engines, e.g. "A 3D printed replacement part repairing a ski boot".',
          validation: (rule) => rule.required(),
        }),
      ],
      validation: (rule) => rule.required().assetRequired(),
    }),
    defineField({
      name: 'featured',
      title: 'Show on the homepage',
      type: 'boolean',
      description: 'The homepage build log shows only entries with this switched on.',
      initialValue: false,
    }),
    defineField({
      name: 'order',
      title: 'Sort order',
      type: 'number',
      description: 'Lower numbers show first. Leave gaps (10, 20, 30…) so inserting later is easy.',
      validation: (rule) => rule.required(),
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
    select: {title: 'title', subtitle: 'kicker', media: 'photo'},
  },
})
