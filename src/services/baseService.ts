import { 
  collection, 
  addDoc, 
  query, 
  where, 
  onSnapshot, 
  orderBy, 
  deleteDoc, 
  doc, 
  updateDoc,
  setDoc
} from 'firebase/firestore';
import { db, auth, OperationType, handleFirestoreError } from '../firebase';
import { getActiveUserId } from './sessionStore';

function cleanUndefined(obj: any): any {
  if (obj === null || obj === undefined) return undefined;
  if (typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) {
    return obj.map(cleanUndefined).filter(val => val !== undefined);
  }
  const cleaned: any = {};
  for (const key of Object.keys(obj)) {
    const val = obj[key];
    if (val !== undefined) {
      cleaned[key] = cleanUndefined(val);
    }
  }
  return cleaned;
}

export function createService<T extends { id?: string; userId: string }>(collectionName: string) {
  return {
    add: async (data: Omit<T, 'id' | 'userId'>, overrideUserId?: string) => {
      const uid = overrideUserId || getActiveUserId();
      if (!uid) return null;
      try {
        const cleanedData = cleanUndefined(data);
        const docRef = await addDoc(collection(db, collectionName), {
          ...cleanedData,
          userId: uid,
          createdAt: new Date().toISOString(),
        });
        return docRef.id;
      } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, collectionName);
        return null;
      }
    },
    set: async (id: string, data: T, overrideUserId?: string) => {
      const uid = overrideUserId || getActiveUserId();
      if (!uid) return;
      try {
        const cleanedData = cleanUndefined(data);
        await setDoc(doc(db, collectionName, id), {
          ...cleanedData,
          userId: uid,
          updatedAt: new Date().toISOString(),
        }, { merge: true });
      } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, collectionName);
      }
    },
    subscribe: (callback: (data: T[]) => void, overrideUserId?: string) => {
      const uid = overrideUserId || getActiveUserId();
      if (!uid) return () => {};
      const q = query(
        collection(db, collectionName),
        where('userId', '==', uid)
      );

      return onSnapshot(q, (snapshot) => {
        callback(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as T)));
      }, (error) => {
        handleFirestoreError(error, OperationType.LIST, collectionName);
      });
    },
    update: async (id: string, data: Partial<Omit<T, 'id' | 'userId'>>) => {
      try {
        const cleaned = cleanUndefined(data);
        const { id: omittedId, userId: omittedUserId, ...updateFields } = cleaned;
        await updateDoc(doc(db, collectionName, id), {
          ...updateFields,
          updatedAt: new Date().toISOString(),
        });
      } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, collectionName);
      }
    },
    remove: async (id: string) => {
      try {
        await deleteDoc(doc(db, collectionName, id));
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, collectionName);
      }
    }
  };
}
