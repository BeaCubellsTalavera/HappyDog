import { create } from 'zustand';
import { onAuthStateChanged, getRedirectResult, type User } from 'firebase/auth';
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

// Procesa el resultado del redirect de Google lo antes posible (nivel módulo),
// antes de que cualquier componente se monte. Sin esta llamada, onAuthStateChanged
// puede disparar con null mientras el redirect aún está pendiente de procesar.
getRedirectResult(auth).catch(() => {});

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
