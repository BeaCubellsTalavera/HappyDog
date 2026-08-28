import { create } from 'zustand';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';

interface AuthState {
  user: User | null;
  loading: boolean;
}

export const useAuth = create<AuthState>(() => ({
  user: null,
  loading: true,
}));

onAuthStateChanged(auth, (firebaseUser) => {
  useAuth.setState({ user: firebaseUser, loading: false });

  if (firebaseUser) {
    const userRef = doc(db, 'users', firebaseUser.uid);
    getDoc(userRef)
      .then((snap) =>
        setDoc(
          userRef,
          {
            displayName: firebaseUser.displayName,
            email: firebaseUser.email,
            photoURL: firebaseUser.photoURL,
            ...(snap.exists() ? {} : { createdAt: serverTimestamp() }),
          },
          { merge: true }
        )
      )
      .catch(console.error);
  }
});
