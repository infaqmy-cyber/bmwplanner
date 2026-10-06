import { auth } from '../firebase';

let activeViewingUserId: string | null = null;

export function setActiveViewingUserId(uid: string | null) {
  activeViewingUserId = uid;
}

export function getActiveUserId(): string | null {
  return activeViewingUserId || auth.currentUser?.uid || null;
}
