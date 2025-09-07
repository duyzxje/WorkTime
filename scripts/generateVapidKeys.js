const webpush = require('web-push');

console.log('Generating VAPID keys for Web Push Notifications...\n');

// Generate VAPID keys
const vapidKeys = webpush.generateVAPIDKeys();

console.log('VAPID Keys Generated Successfully!\n');
console.log('Add these to your environment variables:\n');
console.log('VAPID_SUBJECT=mailto:admin@worktime.com');
console.log(`VAPID_PUBLIC_KEY=${vapidKeys.publicKey}`);
console.log(`VAPID_PRIVATE_KEY=${vapidKeys.privateKey}\n`);

console.log('For Render deployment, add these to your environment variables in the Render dashboard.\n');

console.log('For local development, add these to your .env file:\n');
console.log('VAPID_SUBJECT=mailto:admin@worktime.com');
console.log(`VAPID_PUBLIC_KEY=${vapidKeys.publicKey}`);
console.log(`VAPID_PRIVATE_KEY=${vapidKeys.privateKey}\n`);

console.log('Note: Keep the private key secure and never commit it to version control!');
