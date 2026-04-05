import { Router } from 'express';
import { FieldValue } from 'firebase-admin/firestore';
import { z } from 'zod';
import { adminDb } from '../config/firebaseAdmin.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/errors.js';
import { generateRecommendations, isSuspicious } from '../services/recommendationEngine.js';
import { createNotification, sendPushToUserIfTokenExists } from '../services/notificationService.js';

const router = Router();

function toMillis(value) {
  if (!value) return 0;
  if (typeof value === 'number') return value;
  if (value instanceof Date) return value.getTime();
  if (typeof value.toDate === 'function') return value.toDate().getTime();
  const parsed = new Date(value).getTime();
  return Number.isNaN(parsed) ? 0 : parsed;
}

function isFirestoreIndexError(error) {
  const code = error?.code;
  const message = String(error?.message ?? '').toLowerCase();
  return (
    String(code).includes('failed-precondition') ||
    Number(code) === 9 ||
    message.includes('requires an index') ||
    message.includes('failed-precondition')
  );
}

const vitalSchema = z.object({
  systolic: z.number().int().min(60).max(260),
  diastolic: z.number().int().min(40).max(180),
  sugarLevel: z.number().min(30).max(600),
  notes: z.string().max(500).optional(),
  measuredAt: z.string().datetime().optional(),
});

async function getUserProfileOrThrow(userId) {
  const userSnap = await adminDb.collection('users').doc(userId).get();
  if (!userSnap.exists) throw new ApiError(404, 'User not found');
  return { id: userSnap.id, ...userSnap.data() };
}

async function createDailyRoutineNotifications(userId, recommendation) {
  const dateKey = new Date().toISOString().slice(0, 10);

  const routineNotifications = [
    {
      id: `${userId}_${dateKey}_exercise`,
      title: 'Exercise Reminder',
      message: recommendation.exercises?.[0] ?? 'Do your planned exercise session today.',
      dueAt: `${dateKey}T07:00:00.000Z`,
      kind: 'exercise',
    },
    {
      id: `${userId}_${dateKey}_meal_lunch`,
      title: 'Food Reminder',
      message: recommendation.food?.[1] ?? 'Follow your lunch recommendation from today\'s plan.',
      dueAt: `${dateKey}T13:00:00.000Z`,
      kind: 'food',
    },
    {
      id: `${userId}_${dateKey}_meal_dinner`,
      title: 'Food Reminder',
      message: recommendation.food?.[3] ?? 'Keep dinner light and according to your plan.',
      dueAt: `${dateKey}T19:00:00.000Z`,
      kind: 'food',
    },
  ];

  await Promise.all(
    routineNotifications.map((item) =>
      adminDb.collection('notifications').doc(item.id).set({
        userId,
        title: item.title,
        message: item.message,
        severity: 'info',
        read: false,
        createdAt: FieldValue.serverTimestamp(),
        dueAt: item.dueAt,
        metadata: {
          kind: item.kind,
          source: 'daily-routine',
          dateKey,
        },
      })
    )
  );
}

router.post(
  '/users/:userId/vitals',
  asyncHandler(async (req, res) => {
    const userId = req.params.userId;
    const payload = vitalSchema.parse(req.body);

    const profile = await getUserProfileOrThrow(userId);

    const vitalsRef = await adminDb.collection('vitals').add({
      userId,
      ...payload,
      createdAt: FieldValue.serverTimestamp(),
      measuredAt: payload.measuredAt ? new Date(payload.measuredAt) : new Date(),
    });

    const recommendation = generateRecommendations(profile, payload);

    await adminDb.collection('recommendations').add({
      userId,
      vitalId: vitalsRef.id,
      recommendation,
      createdAt: FieldValue.serverTimestamp(),
    });

    await createDailyRoutineNotifications(userId, recommendation);

    let notificationId = null;
    let pushStatus = { sent: false, reason: 'not_suspicious' };

    if (isSuspicious(recommendation)) {
      notificationId = await createNotification({
        userId,
        title: 'Suspicious health values detected',
        message:
          'Your latest BP/Sugar reading looks risky. Please retest and contact a doctor if it remains high.',
        severity: 'critical',
        metadata: {
          vitalId: vitalsRef.id,
          vitalFlags: recommendation.vitalFlags,
        },
      });

      pushStatus = await sendPushToUserIfTokenExists(userId, {
        title: 'Health Alert',
        message: 'Suspicious BP/Sugar trend detected. Open app for details.',
        severity: 'critical',
      });
    }

    return res.status(201).json({
      vitalId: vitalsRef.id,
      recommendation,
      notificationId,
      pushStatus,
    });
  })
);

router.get(
  '/users/:userId/vitals',
  asyncHandler(async (req, res) => {
    const userId = req.params.userId;
    const limit = Number(req.query.limit ?? 30);
    const safeLimit = Math.min(Math.max(limit, 1), 100);

    await getUserProfileOrThrow(userId);

    let snapshot;
    try {
      snapshot = await adminDb
        .collection('vitals')
        .where('userId', '==', userId)
        .orderBy('measuredAt', 'desc')
        .limit(safeLimit)
        .get();
    } catch (error) {
      const code = error?.code;
      const message = String(error?.message ?? '');
      const isIndexError =
        String(code).includes('failed-precondition') ||
        Number(code) === 9 ||
        message.toLowerCase().includes('requires an index') ||
        message.toLowerCase().includes('failed-precondition');

      if (!isIndexError) {
        throw error;
      }

      // Fallback for environments missing the required Firestore composite index.
      snapshot = await adminDb.collection('vitals').where('userId', '==', userId).limit(200).get();
    }

    const vitals = snapshot.docs
      .map((d) => ({ id: d.id, ...d.data() }))
      .sort((a, b) => {
        const aTime = toMillis(a.measuredAt || a.createdAt);
        const bTime = toMillis(b.measuredAt || b.createdAt);
        return bTime - aTime;
      })
      .slice(0, safeLimit);

    return res.json({ vitals });
  })
);

router.get(
  '/users/:userId/recommendations/latest',
  asyncHandler(async (req, res) => {
    const userId = req.params.userId;
    await getUserProfileOrThrow(userId);

    let docs;
    try {
      const recSnap = await adminDb
        .collection('recommendations')
        .where('userId', '==', userId)
        .orderBy('createdAt', 'desc')
        .limit(1)
        .get();
      docs = recSnap.docs;
    } catch (error) {
      if (!isFirestoreIndexError(error)) {
        throw error;
      }

      const fallbackSnap = await adminDb
        .collection('recommendations')
        .where('userId', '==', userId)
        .limit(200)
        .get();

      docs = fallbackSnap.docs
        .sort((a, b) => {
          const aTime = toMillis(a.data()?.createdAt);
          const bTime = toMillis(b.data()?.createdAt);
          return bTime - aTime;
        })
        .slice(0, 1);
    }

    if (!docs.length) {
      throw new ApiError(404, 'No recommendation found for this user yet');
    }

    const doc = docs[0];
    return res.json({ id: doc.id, ...doc.data() });
  })
);

router.get(
  '/users/:userId/notifications',
  asyncHandler(async (req, res) => {
    const userId = req.params.userId;
    const limit = Number(req.query.limit ?? 50);
    const safeLimit = Math.min(Math.max(limit, 1), 100);
    await getUserProfileOrThrow(userId);

    const snapshot = await adminDb.collection('notifications').where('userId', '==', userId).limit(200).get();

    const docs = snapshot.docs
      .sort((a, b) => {
        const aData = a.data();
        const bData = b.data();
        const aTime = toMillis(aData.createdAt || aData.dueAt);
        const bTime = toMillis(bData.createdAt || bData.dueAt);
        return bTime - aTime;
      })
      .slice(0, safeLimit);

    return res.json({ notifications: docs.map((d) => ({ id: d.id, ...d.data() })) });
  })
);

router.patch(
  '/notifications/:notificationId/read',
  asyncHandler(async (req, res) => {
    const ref = adminDb.collection('notifications').doc(req.params.notificationId);
    const snap = await ref.get();

    if (!snap.exists) throw new ApiError(404, 'Notification not found');

    await ref.update({ read: true, readAt: FieldValue.serverTimestamp() });
    return res.json({ ok: true });
  })
);

export default router;
