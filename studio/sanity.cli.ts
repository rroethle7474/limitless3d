import {defineCliConfig} from 'sanity/cli'

import {dataset, projectId} from './sanity.config'

export default defineCliConfig({
  api: {projectId, dataset},
  // Hosted studio (D-041): https://limitless3d.sanity.studio — Sanity-hosted,
  // zero infra, deployed via `npx sanity deploy` from this directory.
  studioHost: 'limitless3d',
  deployment: {
    appId: 'ksgj8fdmknx36hehibmarzdg',
    // Hosted studio keeps itself on current Sanity releases; no local rebuild
    // needed for Randy to get fixes.
    autoUpdates: true,
  },
})
