import { createClient } from '@blinkdotnew/sdk'

export const blink = createClient({
  projectId: 'phishguard-web-phishing-detector-eky2mdxr',
  authRequired: false,
  auth: { 
    mode: 'headless'
  }
})
