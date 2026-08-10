import {defineField, defineType} from 'sanity'

/**
 * Quote submission — the D-027 dual-write's storage half. Created ONLY by the
 * quote Pages Function, always as a `drafts.`-prefixed document: in this public
 * dataset, draft documents are unreadable without an API token (the dot-in-_id
 * rule), which is what keeps the PII private on the free tier. The studio must
 * never offer Publish for this type (see sanity.config.ts) — publishing one
 * would make it world-readable. Fields are read-only: this is a record, not
 * content. Deleting spam is allowed.
 */
export const quoteSubmission = defineType({
  name: 'quoteSubmission',
  title: 'Quote submission',
  type: 'document',
  readOnly: true,
  fields: [
    defineField({name: 'submittedAt', title: 'Received', type: 'datetime', readOnly: true}),
    defineField({name: 'name', title: 'Name', type: 'string', readOnly: true}),
    defineField({name: 'email', title: 'Email', type: 'string', readOnly: true}),
    defineField({name: 'phone', title: 'Phone', type: 'string', readOnly: true}),
    defineField({name: 'service', title: 'Service asked about', type: 'string', readOnly: true}),
    defineField({name: 'details', title: 'Details', type: 'text', readOnly: true}),
    defineField({
      name: 'page',
      title: 'Submitted from page',
      type: 'string',
      readOnly: true,
    }),
    defineField({
      name: 'photos',
      title: 'Photos (sent with the email — not stored here)',
      type: 'array',
      readOnly: true,
      of: [
        {
          type: 'object',
          fields: [
            defineField({name: 'filename', title: 'File name', type: 'string'}),
            defineField({name: 'size', title: 'Size (bytes)', type: 'number'}),
          ],
          preview: {select: {title: 'filename'}},
        },
      ],
    }),
  ],
  orderings: [
    {
      title: 'Newest first',
      name: 'submittedAtDesc',
      by: [{field: 'submittedAt', direction: 'desc'}],
    },
  ],
  preview: {
    select: {name: 'name', service: 'service', submittedAt: 'submittedAt'},
    prepare: ({name, service, submittedAt}) => ({
      title: name || '(no name)',
      subtitle: [service, submittedAt ? new Date(submittedAt).toLocaleString() : null]
        .filter(Boolean)
        .join(' — '),
    }),
  },
})
