// Lazy-initializes Firebase Admin SDK (server-only)
let initialized = false;

export async function getFirebaseAdmin() {
  const { initializeApp, cert, getApps, getApp } = await import("firebase-admin/app");
  const { getMessaging } = await import("firebase-admin/messaging");

  if (!initialized && !getApps().length) {
    initializeApp({
      credential: cert({
        projectId: process.env.FIREBASE_ADMIN_PROJECT_ID!,
        clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL!,
        privateKey: process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, "\n"),
      }),
    });
    initialized = true;
  }

  return { messaging: getMessaging(getApps()[0] ?? getApp()) };
}
