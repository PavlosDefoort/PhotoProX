import { AuthContextValue } from "@/interfaces/ContextInterfaces";
import { DEFAULT_GUEST_USER } from "@/interfaces/FirebaseInterfaces";
import { createContext } from "react";

export const AuthContext = createContext<AuthContextValue>({
  user: null,
  photoProXUser: DEFAULT_GUEST_USER,
  loading: true,
  setPhotoProXUser: (value) => {
    // Add your implementation here
  },
});
