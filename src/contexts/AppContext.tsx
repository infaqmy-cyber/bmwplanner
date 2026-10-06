import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, setDoc, onSnapshot, deleteDoc, collection, query, where } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { setActiveViewingUserId } from '../services/sessionStore';

export type UserRole = 'admin' | 'pengguna';

interface AppContextType {
  user: User | null;
  role: UserRole | null;
  isAdmin: boolean;
  loading: boolean;
  isClientDeactivated: boolean;
  viewingUserId: string | null;
  viewingUserName: string | null;
  setViewingUserId: (userId: string | null, userName?: string | null) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(true);
  const [isClientDeactivated, setIsClientDeactivated] = useState(false);
  const [viewingUserId, setViewingUserIdInternal] = useState<string | null>(null);
  const [viewingUserName, setViewingUserName] = useState<string | null>(null);

  const setViewingUserId = (userId: string | null, userName?: string | null) => {
    setActiveViewingUserId(userId);
    setViewingUserIdInternal(userId);
    setViewingUserName(userName || null);
  };

  const isAdmin = role === 'admin';

  useEffect(() => {
    let unsubscribeClientStatus: (() => void) | null = null;

    const unsubscribeAuth = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      
      if (!currentUser) {
        setRole(null);
        setViewingUserId(null);
        setLoading(false);
        setIsClientDeactivated(false);
        if (unsubscribeClientStatus) {
          unsubscribeClientStatus();
          unsubscribeClientStatus = null;
        }
        return;
      }

      // Check user role in userRoles collection
      const roleRef = doc(db, 'userRoles', currentUser.uid);

      // Listen to client status if active
      const clientsQuery = query(collection(db, 'clients'), where('assignedUserId', '==', currentUser.uid));
      unsubscribeClientStatus = onSnapshot(clientsQuery, (querySnapshot) => {
        let suspended = false;
        querySnapshot.forEach((doc) => {
          const clientData = doc.data();
          if (clientData.status === 'Deactivated') {
            suspended = true;
          }
        });
        setIsClientDeactivated(suspended);
      }, (error) => {
        console.error("Error subscribing to client status:", error);
      });
      
      // We will listen in real-time to the user's role
      const unsubscribeRole = onSnapshot(roleRef, async (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          setRole(data.role as UserRole);
          setLoading(false);
        } else {
          // Check if there is a pre-approved admin with their email
          const emailKey = currentUser.email ? `email:${currentUser.email.toLowerCase()}` : '';
          let isPreapprovedAdmin = false;
          
          if (emailKey) {
            const preapprovedRef = doc(db, 'userRoles', emailKey);
            try {
              const preapprovedSnap = await getDoc(preapprovedRef);
              if (preapprovedSnap.exists()) {
                isPreapprovedAdmin = true;
              }
            } catch (err) {
              console.error('Error checking preapproved admin:', err);
            }
          }

          // If role doesn't exist, bootstrap it!
          const isBootstrapAdmin = currentUser.email?.toLowerCase() === 'afyan.ikhlas@gmail.com';
          const defaultRole: UserRole = (isBootstrapAdmin || isPreapprovedAdmin) ? 'admin' : 'pengguna';
          
          try {
            await setDoc(roleRef, {
              userId: currentUser.uid,
              email: currentUser.email || '',
              name: currentUser.displayName || '',
              role: defaultRole,
              createdAt: new Date().toISOString()
            });
            setRole(defaultRole);

            // Clean up preapproved placeholder to keep database tidy
            if (isPreapprovedAdmin && emailKey) {
              const preapprovedRef = doc(db, 'userRoles', emailKey);
              try {
                await deleteDoc(preapprovedRef);
              } catch (deleteErr) {
                console.error('Error deleting preapproved placeholder:', deleteErr);
              }
            }
          } catch (err) {
            console.error('Error bootstrapping user role:', err);
            // Fallback
            setRole('pengguna');
          }
          setLoading(false);
        }
      }, (error) => {
        console.error('Error in role snapshot:', error);
        setRole('pengguna');
        setLoading(false);
      });

      return () => {
        unsubscribeRole();
        if (unsubscribeClientStatus) {
          unsubscribeClientStatus();
          unsubscribeClientStatus = null;
        }
      };
    });

    return () => {
      unsubscribeAuth();
    };
  }, []);

  return (
    <AppContext.Provider
      value={{
        user,
        role,
        isAdmin,
        loading,
        isClientDeactivated,
        viewingUserId,
        viewingUserName,
        setViewingUserId,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
