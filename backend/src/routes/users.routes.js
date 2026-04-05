import { Router } from 'express';
import { FieldValue } from 'firebase-admin/firestore';
import { z } from 'zod';
import { adminDb } from '../config/firebaseAdmin.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/errors.js';

const router = Router();

const userCreateSchema = z.object({
  name: z.string().min(2),
  age: z.number().int().min(1).max(120),
  gender: z.enum(['male', 'female', 'other']),
  heightCm: z.number().min(80).max(250),
  weightKg: z.number().min(20).max(400),
  email: z.string().email().optional(),
  conditions: z.array(z.string()).default([]),
});

const userUpdateSchema = userCreateSchema.partial();

router.post(
  '/',
  asyncHandler(async (req, res) => {
    const payload = userCreateSchema.parse(req.body);

    if (payload.email) {
      const existing = await adminDb
        .collection('users')
        .where('email', '==', payload.email)
        .limit(1)
        .get();

      if (!existing.empty) {
        const doc = existing.docs[0];
        return res.status(200).json({ id: doc.id, ...doc.data() });
      }
    }

    const docRef = await adminDb.collection('users').add({
      ...payload,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });

    return res.status(201).json({ id: docRef.id, ...payload });
  })
);

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const email = typeof req.query.email === 'string' ? req.query.email.trim() : '';

    if (email) {
      const snapshot = await adminDb.collection('users').where('email', '==', email).limit(1).get();
      if (snapshot.empty) return res.json({ user: null });

      const doc = snapshot.docs[0];
      return res.json({ user: { id: doc.id, ...doc.data() } });
    }

    const snapshot = await adminDb.collection('users').orderBy('createdAt', 'desc').limit(50).get();
    return res.json({ users: snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })) });
  })
);

router.get(
  '/:userId',
  asyncHandler(async (req, res) => {
    const snap = await adminDb.collection('users').doc(req.params.userId).get();

    if (!snap.exists) {
      throw new ApiError(404, 'User not found');
    }

    return res.json({ id: snap.id, ...snap.data() });
  })
);

router.put(
  '/:userId',
  asyncHandler(async (req, res) => {
    const payload = userUpdateSchema.parse(req.body);

    const userRef = adminDb.collection('users').doc(req.params.userId);
    const snap = await userRef.get();
    if (!snap.exists) throw new ApiError(404, 'User not found');

    await userRef.update({
      ...payload,
      updatedAt: FieldValue.serverTimestamp(),
    });

    return res.json({ id: req.params.userId, ...payload });
  })
);

router.post(
  '/:userId/device-token',
  asyncHandler(async (req, res) => {
    const schema = z.object({ token: z.string().min(10) });
    const { token } = schema.parse(req.body);

    const userRef = adminDb.collection('users').doc(req.params.userId);
    const snap = await userRef.get();
    if (!snap.exists) throw new ApiError(404, 'User not found');

    await userRef.update({
      fcmToken: token,
      updatedAt: FieldValue.serverTimestamp(),
    });

    return res.json({ ok: true });
  })
);

export default router;
