import {defineCliConfig} from 'sanity/cli'

export default defineCliConfig({
  vite: {
    define: {
      'process.env.SANITY_PROJECT_ID': JSON.stringify(process.env.SANITY_PROJECT_ID || ''),
      'process.env.SANITY_DATASET': JSON.stringify(process.env.SANITY_DATASET || 'production'),
    },
  },
  api: {
    projectId: process.env.SANITY_PROJECT_ID,
    dataset: process.env.SANITY_DATASET || 'production',
  },
})
