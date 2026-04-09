import cron from 'node-cron';
import { adminDb } from '../config/firebaseAdmin.js';
import { createNotification, sendPushToUserIfTokenExists } from './notificationService.js';

export function startMonitoringJob() {
  // Every day at 08:00 server time, checks yesterday's vitals for critical patterns.
  cron.schedule('0 8 * * *', async () => {
    try {
      const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const snapshot = await adminDb
        .collection('vitals')
        .where('measuredAt', '>=', dayAgo)
        .get();

      for (const doc of snapshot.docs) {
        const vital = doc.data();
        const risky =
          vital.systolic >= 160 || vital.diastolic >= 100 || vital.sugarLevel >= 200 || vital.sugarLevel < 55;

        if (!risky) continue;

        const userId = vital.userId;
        await createNotification({
          userId,
          title: 'Daily risk check alert',
          message:
            'A suspicious value was found in your recent readings. Please check your health dashboard.',
          severity: 'critical',
          metadata: {
            vitalId: doc.id,
            source: 'daily-monitoring-job',
          },
        });

        await sendPushToUserIfTokenExists(userId, {
          title: 'Daily Health Alert',
          message: 'Please review your latest BP/Sugar values in the app.',
          severity: 'critical',
        });
      }
    } catch (error) {
      console.error('Monitoring job failed:', error.message);
    }
  });

  // Every minute, send push for due routine reminders that were not pushed yet.
  cron.schedule('* * * * *', async () => {
    try {
      const now = new Date();

      const snapshot = await adminDb
        .collection('notifications')
        .where('metadata.source', '==', 'daily-routine')
        .where('read', '==', false)
        .limit(200)
        .get();

      for (const doc of snapshot.docs) {
        const data = doc.data();
        if (data.pushSentAt) continue;

        const dueAtRaw = data.dueAt;
        const dueAt = dueAtRaw?.toDate ? dueAtRaw.toDate() : new Date(dueAtRaw);
        if (!dueAt || Number.isNaN(dueAt.getTime())) continue;
        if (dueAt > now) continue;

        const pushStatus = await sendPushToUserIfTokenExists(data.userId, {
          title: data.title ?? 'Health Reminder',
          message: data.message ?? 'You have a scheduled reminder in your health plan.',
          severity: data.severity ?? 'info',
        });

        await doc.ref.update({
          pushSentAt: new Date(),
          pushStatus,
        });
      }
    } catch (error) {
      console.error('Due reminder push dispatcher failed:', error.message);
    }
  });
}
