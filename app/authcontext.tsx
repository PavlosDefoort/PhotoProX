// AuthContext.tsx
import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import { auth } from "./firebase"; // Import your Firebase authentication instance
import { Auth, User } from "firebase/auth";

interface AuthProviderProps {
  children: ReactNode;
}

interface AuthContextProps {
  user: User | null;
  loading: boolean;
}

export const AuthContext = createContext<AuthContextProps>({
  user: null,
  loading: true,
});

const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((authUser) => {
      setUser(authUser);
      setLoading(false); // Set loading to false once the authentication state is determined
    });

    return () => unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthProvider;

export const useAuth = (): AuthContextProps => {
  return useContext(AuthContext);
};
