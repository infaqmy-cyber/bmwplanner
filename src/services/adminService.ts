import { 
  collection, 
  doc, 
  addDoc, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  onSnapshot,
  getDocs
} from 'firebase/firestore';
import { db, auth, OperationType, handleFirestoreError } from '../firebase';

export interface ClientProfile {
  id?: string;
  name: string;
  email: string;
  phone?: string;
  notes?: string;
  status: 'Pending' | 'Active' | 'Deactivated';
  assignedUserId?: string;
  createdById: string;
  createdAt: string;
}

export interface UserRoleRecord {
  id?: string;
  userId?: string;
  email: string;
  name?: string;
  role: 'admin' | 'pengguna';
  createdAt: string;
}

export const adminService = {
  // 1. Clients Management
  addClient: async (client: Omit<ClientProfile, 'id' | 'createdById' | 'createdAt'>) => {
    if (!auth.currentUser) return null;
    try {
      const docRef = await addDoc(collection(db, 'clients'), {
        ...client,
        createdById: auth.currentUser.uid,
        createdAt: new Date().toISOString()
      });
      return docRef.id;
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'clients');
      return null;
    }
  },

  updateClient: async (id: string, updates: Partial<Omit<ClientProfile, 'id' | 'createdById' | 'createdAt'>>) => {
    try {
      await updateDoc(doc(db, 'clients', id), updates);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'clients');
    }
  },

  deleteClient: async (id: string) => {
    try {
      await deleteDoc(doc(db, 'clients', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'clients');
    }
  },

  subscribeClients: (callback: (clients: ClientProfile[]) => void) => {
    const q = collection(db, 'clients');
    return onSnapshot(q, (snapshot) => {
      callback(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ClientProfile)));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'clients');
    });
  },

  // 2. Admin & User Roles Management
  subscribeUserRoles: (callback: (roles: UserRoleRecord[]) => void) => {
    const q = collection(db, 'userRoles');
    return onSnapshot(q, (snapshot) => {
      callback(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as UserRoleRecord)));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'userRoles');
    });
  },

  addPreapprovedAdmin: async (email: string) => {
    const cleanEmail = email.trim().toLowerCase();
    const docId = `email:${cleanEmail}`;
    try {
      await setDoc(doc(db, 'userRoles', docId), {
        email: cleanEmail,
        role: 'admin',
        createdAt: new Date().toISOString()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'userRoles');
    }
  },

  updateUserRole: async (uidOrDocId: string, role: 'admin' | 'pengguna') => {
    try {
      await updateDoc(doc(db, 'userRoles', uidOrDocId), { role });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'userRoles');
    }
  },

  deleteUserRole: async (uidOrDocId: string) => {
    try {
      await deleteDoc(doc(db, 'userRoles', uidOrDocId));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'userRoles');
    }
  }
};
