#!/usr/bin/env node
// Small helper to generate VAPID keys for Web Push
// Usage: node scripts/generate-vapid-keys.mjs
import webpush from 'web-push'

const { publicKey, privateKey } = webpush.generateVAPIDKeys()
const subject = process.env.VAPID_SUBJECT || 'mailto:admin@example.com'

console.log('\nGenerated VAPID keys:')
console.log('VAPID_PUBLIC_KEY=', publicKey)
console.log('VAPID_PRIVATE_KEY=', privateKey)
console.log('VAPID_SUBJECT=', subject)

console.log('\nAdd these to your environment (keep PRIVATE key secret):\n')
console.log(`VAPID_PUBLIC_KEY=${publicKey}`)
console.log(`VAPID_PRIVATE_KEY=${privateKey}`)
console.log(`VAPID_SUBJECT=${subject}`)
console.log('\nAlso mirror the public key to NEXT_PUBLIC_VAPID_PUBLIC_KEY for the client:')
console.log(`NEXT_PUBLIC_VAPID_PUBLIC_KEY=${publicKey}`)
