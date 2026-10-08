import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { initializeApp } from "firebase/app";
import {
  connectAuthEmulator,
  getAuth,
  onIdTokenChanged,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  signInWithEmailAndPassword,
  getRedirectResult,
  signOut,
  type User,
} from "firebase/auth";
import { useQueryClient } from "@tanstack/react-query";
import { createClient, ApiError } from "../api/client";
const env = import.meta.env;
export const emulator = env.VITE_USE_EMULATORS === "true";
const projectId = env.VITE_FIREBASE_PROJECT_ID ?? "proyecto2responsibleai";
if (
  !["proyecto2responsibleai", "demo-project2-responsible"].includes(projectId)
)
  throw Error("Only Project 2 is supported.");
if (emulator && projectId !== "demo-project2-responsible")
  throw Error("Emulators require the isolated demo project.");
export const firebaseReady = Boolean(env.VITE_FIREBASE_API_KEY);
const app = initializeApp({
  apiKey: env.VITE_FIREBASE_API_KEY ?? "demo-key",
  authDomain:
    env.VITE_FIREBASE_AUTH_DOMAIN ?? "proyecto2responsibleai.firebaseapp.com",
  projectId,
  appId: env.VITE_FIREBASE_APP_ID,
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET || undefined,
});
export const firebaseApp = app;
export const auth = getAuth(firebaseApp);
if (emulator)
  connectAuthEmulator(
    auth,
    env.VITE_AUTH_EMULATOR_URL ?? "http://127.0.0.1:9099",
    { disableWarnings: true },
  );
export const api = createClient(
  env.VITE_API_BASE_URL ??
    "https://us-central1-proyecto2responsibleai.cloudfunctions.net/api",
  async (refresh) => {
    if (!auth.currentUser)
      throw new ApiError(401, "UNAUTHENTICATED", "Vuelve a iniciar sesión.");
    try {
      return await auth.currentUser.getIdToken(refresh);
    } catch {
      throw new ApiError(
        401,
        "UNAUTHENTICATED",
        "Tu sesión ha vencido. Vuelve a iniciar sesión.",
      );
    }
  },
);
type AuthState = {
  user: User | null;
  admin: boolean;
  loading: boolean;
  error: string;
  signIn: (redirect?: boolean) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
  demoSignIn?: () => Promise<void>;
};
const Context = createContext<AuthState | null>(null);
function authMessage(error: unknown) {
  const code = (error as { code?: string }).code;
  return code === "auth/popup-closed-by-user"
    ? "Se cerró la ventana de Google. Puedes volver a intentarlo."
    : code === "auth/popup-blocked"
      ? "El navegador bloqueó la ventana. Permite ventanas emergentes o usa «Entrar en esta pestaña»."
      : code === "auth/unauthorized-domain"
        ? "Este dominio aún no está autorizado para iniciar sesión. Usa localhost:5173."
        : "No pudimos iniciar sesión. Revisa tu conexión y vuelve a intentarlo.";
}
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null),
    [admin, setAdmin] = useState(false),
    [loading, setLoading] = useState(true),
    [error, setError] = useState("");
  const queryClient = useQueryClient();
  useEffect(() => {
    let active = true;
    let revision = 0;
    let previousUid: string | null | undefined;
    const unsubscribe = onIdTokenChanged(auth, async (next) => {
      const current = ++revision;
      let claim = false;
      try {
        claim = next
          ? (await next.getIdTokenResult()).claims.admin === true
          : false;
      } catch {
        if (active)
          setError("No pudimos comprobar tu sesión. Vuelve a entrar.");
      }
      if (active && current === revision) {
        if (previousUid !== next?.uid) {
          queryClient.clear();
          previousUid = next?.uid;
        }
        setUser(next);
        setAdmin(claim);
        setLoading(false);
      }
    });
    getRedirectResult(auth).catch((e) => {
      if (active) setError(authMessage(e));
    });
    return () => {
      active = false;
      unsubscribe();
    };
  }, [queryClient]);
  async function signIn(redirect = false) {
    setError("");
    setLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: "select_account" });
      if (redirect) await signInWithRedirect(auth, provider);
      else await signInWithPopup(auth, provider);
    } catch (e) {
      if (import.meta.env.DEV)
        console.warn(
          "Firebase sign-in error:",
          (e as { code?: string }).code ?? "unknown",
        );
      setError(authMessage(e));
    } finally {
      setLoading(false);
    }
  }
  async function logout() {
    await signOut(auth);
    queryClient.clear();
    setError("");
  }
  async function refresh() {
    if (auth.currentUser) {
      const result = await auth.currentUser.getIdTokenResult(true);
      setAdmin(result.claims.admin === true);
    }
  }
  async function demoSignIn() {
    if (!emulator || !import.meta.env.DEV) return;
    setLoading(true);
    setError("");
    try {
      await signInWithEmailAndPassword(
        auth,
        "editor@demo.test",
        "local-demo-only",
      );
    } catch {
      setError(
        "La cuenta de prueba local aún no está preparada. Consulta el handoff.",
      );
    } finally {
      setLoading(false);
    }
  }
  return (
    <Context.Provider
      value={{
        user,
        admin,
        loading,
        error,
        signIn,
        logout,
        refresh,
        ...(emulator && import.meta.env.DEV ? { demoSignIn } : {}),
      }}
    >
      {children}
    </Context.Provider>
  );
}
export function useAuth() {
  const context = useContext(Context);
  if (!context) throw Error("AuthProvider required");
  return context;
}
