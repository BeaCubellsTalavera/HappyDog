import { create } from 'zustand';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';

interface AuthState {
  user: User | null;
  loading: boolean;
}

// auth.currentUser se popula síncronamente desde localStorage (browserLocalPersistence).
// Si ya hay sesión, saltamos el estado loading para evitar la pantalla de carga.
export const useAuth = create<AuthState>(() => ({
  user: auth.currentUser,
  loading: auth.currentUser === null,
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
