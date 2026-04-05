import { FieldValue } from 'firebase-admin/firestore';
import { adminDb, adminMessaging } from '../config/firebaseAdmin.js';

export async function createNotification({ userId, title, message, severity = 'warning', metadata = {} }) {
  const docRef = await adminDb.collection('notifications').add({
    userId,
    title,
    message,
    severity,
    metadata,
    read: false,
    createdAt: FieldValue.serverTimestamp(),
  });

  return docRef.id;
}

export async function sendPushToUserIfTokenExists(userId, payload) {
  const userDoc = await adminDb.collection('users').doc(userId).get();
  if (!userDoc.exists) return { sent: false, reason: 'user_not_found' };

  const data = userDoc.data();
  const token = data?.fcmToken;

  if (!token) return { sent: false, reason: 'missing_token' };

  try {
    await adminMessaging.send({
      token,
      notification: {
        title: payload.title,
        body: payload.message,
      },
      data: {
        severity: payload.severity ?? 'warning',
      },
    });

    return { sent: true };
  } catch (error) {
    console.error('Failed to send FCM notification:', error.message);
    return { sent: false, reason: 'fcm_error' };
  }
}
