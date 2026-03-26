const admin = require('firebase-admin');

try {
  // Attempt to load the service account file
  const serviceAccount = require('./firebase-key.json');
  
  // Fix the private key format by replacing literal \n with actual newlines
  if (serviceAccount.private_key) {
    serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
  }
  
  // If the file is just our placeholder, we warn instead of crashing
  if (serviceAccount.private_key_id === "REPLACE_THIS_ENTIRE_FILE_WITH_YOUR_ACTUAL_JSON_FILE") {
    console.warn('Firebase Admin Warning: Service Account is a placeholder. Pushes are disabled until replaced.');
  } else {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
    console.log('Firebase Admin Initialized Successfully.');
  }
} catch (error) {
  console.warn('Firebase Admin Initialization Error:', error.message);
  console.warn('Firebase Admin Initialization Warning: firebase-key.json not found in backend/config. Pushes disabled.');
}

module.exports = admin;
