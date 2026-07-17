import { getAuth, type Auth } from "firebase/auth";
import { app } from "./app";
import { firebaseConfig } from "@/config/firebase";

/**
 * Singleton Firebase Authentication instance with SSR/prerender safety.
 */
let authInstance: Auth;

try {
  authInstance = getAuth(app);
} catch (err) {
  if (firebaseConfig.isSSR || firebaseConfig.isPlaceholder) {
    authInstance = {} as Auth;
  } else {
    throw err;
  }
}

export const auth: Auth = authInstance;
export default auth;
