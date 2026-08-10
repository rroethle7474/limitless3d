import {defineField, defineType} from 'sanity'

/**
 * Service page copy (plan §4.5): the hero lead, hero photo, and the prose
 * "split" sections for each of the three service pages. Headlines, FAQs, and
 * feature cards are code-fixed (approved scoping, session 4) — this is the
 * copy the owner might actually reword, not the typography.
 */
export const servicePage = defineType({
  name: 'servicePage',
  title: 'Service page',
  type: 'document',
  fields: [
    defineField({
      name: 'service',
      title: 'Which service',
      type: 'string',
      options: {
        list: [
          {title: '3D Scanning', value: 'scanning'},
          {title: '3D Design', value: 'design'},
          {title: '3D Printing', value: 'printing'},
        ],
        layout: 'radio',
      },
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'lead',
      title: 'Opening paragraph',
      type: 'text',
      rows: 3,
      description: 'The paragraph under the big headline at the top of the page.',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'heroImage',
      title: 'Top photo',
      type: 'image',
      options: {hotspot: true},
      fields: [
        defineField({
          name: 'alt',
          title: 'Photo description (alt text)',
          type: 'string',
          validation: (rule) => rule.required(),
        }),
      ],
      validation: (rule) => rule.required().assetRequired(),
    }),
    defineField({
      name: 'splits',
      title: 'Story sections',
      type: 'array',
      description:
        'The photo-beside-text sections. They alternate sides automatically — just write them in order.',
      of: [
        {
          type: 'object',
          name: 'split',
          fields: [
            defineField({
              name: 'kicker',
              title: 'Kicker (small line above the heading)',
              type: 'string',
              validation: (rule) => rule.required(),
            }),
            defineField({
              name: 'heading',
              title: 'Heading',
              type: 'string',
              validation: (rule) => rule.required(),
            }),
            defineField({
              name: 'image',
              title: 'Photo',
              type: 'image',
              options: {hotspot: true},
              fields: [
                defineField({
                  name: 'alt',
                  title: 'Photo description (alt text)',
                  type: 'string',
                  validation: (rule) => rule.required(),
                }),
              ],
              validation: (rule) => rule.required().assetRequired(),
            }),
            defineField({
              name: 'body',
              title: 'Text',
              type: 'array',
              of: [
                {
                  type: 'block',
                  styles: [{title: 'Normal', value: 'normal'}],
                  lists: [],
                  marks: {
                    decorators: [
                      {title: 'Bold', value: 'strong'},
                      {title: 'Italic', value: 'em'},
                    ],
                    annotations: [],
                  },
                },
              ],
              validation: (rule) => rule.required(),
            }),
          ],
          preview: {select: {title: 'heading', subtitle: 'kicker', media: 'image'}},
        },
      ],
      validation: (rule) => rule.required().min(1),
    }),
  ],
  preview: {
    select: {service: 'service'},
    prepare: ({service}) => ({
      title:
        service === 'scanning'
          ? '3D Scanning'
          : service === 'design'
            ? '3D Design'
            : service === 'printing'
              ? '3D Printing'
              : 'Service page',
    }),
  },
})
