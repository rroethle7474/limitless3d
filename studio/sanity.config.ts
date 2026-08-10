import {visionTool} from '@sanity/vision'
import {defineConfig} from 'sanity'
import {structureTool} from 'sanity/structure'

import {schemaTypes} from './schemaTypes'

/**
 * Project id / dataset are not secrets (the dataset is public; content is
 * world-readable by design). The site's build reads the same values from
 * src/data/sanity-project.ts — keep them in sync if they ever change.
 */
// TODO(session-5): filled in right after `sanity init --bare` creates the project.
export const projectId = 'REPLACE_WITH_PROJECT_ID'
export const dataset = 'production'

export default defineConfig({
  name: 'default',
  title: 'Limitless 3D',
  projectId,
  dataset,

  plugins: [
    structureTool({
      structure: (S) =>
        S.list()
          .title('Content')
          .items([
            S.documentTypeListItem('galleryEntry').title('Gallery entries'),
            S.documentTypeListItem('testimonial').title('Testimonials'),
            S.documentTypeListItem('servicePage').title('Service pages'),
            S.divider(),
            // Singletons: pinned editors with fixed ids — no "create new" list.
            S.listItem()
              .title('Homepage stats')
              .id('siteStats')
              .child(S.document().schemaType('siteStats').documentId('siteStats')),
            S.listItem()
              .title('Business info')
              .id('businessInfo')
              .child(S.document().schemaType('businessInfo').documentId('businessInfo')),
            S.divider(),
            S.documentTypeListItem('quoteSubmission')
              .title('Quote submissions')
              .child(
                S.documentTypeList('quoteSubmission')
                  .title('Quote submissions')
                  .defaultOrdering([{field: 'submittedAt', direction: 'desc'}]),
              ),
          ]),
    }),
    visionTool(),
  ],

  schema: {
    types: schemaTypes,
  },

  document: {
    /**
     * PII guardrail (D-027, free tier): submissions exist only as drafts —
     * that is what keeps them token-gated in this public dataset. Publishing
     * one would make it world-readable, so the Publish action must not exist
     * for the type. Duplicate goes for the same reason. Delete stays: clearing
     * spam is legitimate. Singletons lose Duplicate/Delete so they cannot be
     * forked or removed by accident.
     */
    actions: (prev, context) => {
      if (context.schemaType === 'quoteSubmission') {
        return prev.filter(
          ({action}) => action !== 'publish' && action !== 'duplicate' && action !== 'unpublish',
        )
      }
      if (context.schemaType === 'siteStats' || context.schemaType === 'businessInfo') {
        return prev.filter(({action}) => action !== 'duplicate' && action !== 'delete')
      }
      return prev
    },
    /** Neither the singletons nor submissions can be created by hand. */
    newDocumentOptions: (prev) =>
      prev.filter(
        (item) =>
          item.templateId !== 'siteStats' &&
          item.templateId !== 'businessInfo' &&
          item.templateId !== 'quoteSubmission',
      ),
  },
})
