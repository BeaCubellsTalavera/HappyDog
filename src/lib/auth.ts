import { GoogleAuthProvider, signInWithRedirect, getRedirectResult, signOut } from 'firebase/auth';
import { auth } from './firebase';

const provider = new GoogleAuthProvider();
// Muestra selector de cuentas aunque el navegador ya tenga sesión activa de Google.
provider.setCustomParameters({ prompt: 'select_account' });

// Redirect (misma pestaña) en lugar de popup: comparte cookies del navegador,
// así Google ve las cuentas ya logueadas y no pide email+contraseña.
export function signInWithGoogle() {
  return signInWithRedirect(auth, provider);
}

// Llamar en Login al montar para recoger errores del redirect de vuelta.
export function checkRedirectResult() {
  return getRedirectResult(auth);
}

export function signOutUser() {
  return signOut(auth);
}
