// AuthContext.tsx
import { AuthContext } from "@/context/AuthContext";
import { User } from "firebase/auth";
import React, { ReactNode, useEffect, useState } from "react";
import { auth, ensureUserDocument } from "../src/services/FireBase"; // Import your Firebase authentication instance
import {
  DEFAULT_GUEST_USER,
  PhotoProXUser,
} from "@/interfaces/FirebaseInterfaces";

interface AuthProviderProps {
  children: ReactNode;
}

const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [photoProXUser, setPhotoProXUser] =
    useState<PhotoProXUser>(DEFAULT_GUEST_USER);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((authUser) => {
      setUser(authUser);
      if (authUser) {
        ensureUserDocument(authUser);
      }
      setLoading(false); // Set loading to false once the authentication state is determined
    });

    return () => unsubscribe();
  }, []);

  return (
    <AuthContext.Provider
      value={{ user, loading, photoProXUser, setPhotoProXUser }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export default AuthProvider;
