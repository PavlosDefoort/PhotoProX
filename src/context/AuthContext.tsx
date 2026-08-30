import { AuthContextValue } from "@/interfaces/ContextInterfaces";
import { DEFAULT_GUEST_USER } from "@/interfaces/FirebaseInterfaces";
import { createContext } from "react";

export const AuthContext = createContext<AuthContextValue>({
  user: null,
  zynaloUser: DEFAULT_GUEST_USER,
  loading: true,
  setZynaloUser: (value) => {
    // Add your implementation here
  },
});
