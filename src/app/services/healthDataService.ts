import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
  type DocumentData,
} from 'firebase/firestore';
import { db } from '../lib/firebase';

export type HealthDataEntry = {
  id?: string;
  userId: string;
  height: number;
  weight: number;
  bloodPressureSystolic: number;
  bloodPressureDiastolic: number;
  sugarLevel: number;
  createdAt?: unknown;
  updatedAt?: unknown;
};

const healthDataCollection = collection(db, 'healthData');

export async function createHealthDataEntry(entry: HealthDataEntry): Promise<string> {
  const docRef = await addDoc(healthDataCollection, {
    ...entry,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  return docRef.id;
}

export async function getHealthDataByUser(userId: string): Promise<HealthDataEntry[]> {
  const q = query(
    healthDataCollection,
    where('userId', '==', userId),
    orderBy('createdAt', 'desc')
  );
  const snapshot = await getDocs(q);

  return snapshot.docs.map((docSnap) => {
    const data = docSnap.data() as DocumentData;
    return {
      id: docSnap.id,
      userId: data.userId,
      height: data.height,
      weight: data.weight,
      bloodPressureSystolic: data.bloodPressureSystolic,
      bloodPressureDiastolic: data.bloodPressureDiastolic,
      sugarLevel: data.sugarLevel,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
    };
  });
}

export async function updateHealthDataEntry(
  id: string,
  updates: Partial<Omit<HealthDataEntry, 'id' | 'userId'>>
): Promise<void> {
  await updateDoc(doc(db, 'healthData', id), {
    ...updates,
    updatedAt: serverTimestamp(),
  });
}

export async function deleteHealthDataEntry(id: string): Promise<void> {
  await deleteDoc(doc(db, 'healthData', id));
}
