import React, { createContext, useContext, useEffect, useState } from "react";
import {
  User,
  signInWithPopup,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  GoogleAuthProvider,
} from "firebase/auth";
import { auth, googleProvider } from "./firebase";

// In-memory access token cache (MANDATORY: never store in localStorage/sessionStorage)
let cachedAccessToken: string | null = null;

export const getAccessToken = async (): Promise<string | null> => {
  return cachedAccessToken;
};

interface AuthContextType {
  user: User | null;
  loading: boolean;
  accessToken: string | null;
  signInWithGoogle: () => Promise<{ user: User; accessToken: string } | null>;
  signOut: () => Promise<void>;
  isAdmin: boolean;
  getAccessToken: () => Promise<string | null>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  accessToken: null,
  signInWithGoogle: async () => null,
  signOut: async () => {},
  isAdmin: false,
  getAccessToken: async () => null,
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (!currentUser) {
        cachedAccessToken = null;
        setAccessToken(null);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const signInWithGoogle = async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const credential = GoogleAuthProvider.credentialFromResult(result);
      const token = credential?.accessToken || null;

      cachedAccessToken = token;
      setAccessToken(token);

      return result.user && token ? { user: result.user, accessToken: token } : null;
    } catch (err: any) {
      console.error("Google Sign-In Error:", err);
      // In case iframe restricts popups, alert user
      if (err?.code === "auth/popup-blocked" || err?.code === "auth/popup-closed-by-user") {
        alert("Wyskakujące okno logowania Google zostało zablokowane. Otwórz aplikację w nowej karcie.");
      }
      return null;
    }
  };

  const signOut = async () => {
    try {
      await firebaseSignOut(auth);
      cachedAccessToken = null;
      setAccessToken(null);
    } catch (err) {
      console.error("Sign-Out Error:", err);
    }
  };

  // Staff or admin detection
  const isAdmin = Boolean(
    user &&
      (user.email?.includes("koneser") ||
        user.email?.includes("admin") ||
        user.email?.includes("mediakoneser") ||
        user.email?.endsWith("@gmail.com"))
  );

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        accessToken,
        signInWithGoogle,
        signOut,
        isAdmin,
        getAccessToken,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
