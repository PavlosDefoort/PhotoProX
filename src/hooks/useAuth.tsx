import { AuthContext } from "@/context/AuthContext";
import { AuthContextValue } from "@/interfaces/ContextInterfaces";
import { getUserState } from "@/services/FireBase";
import { useContext, useEffect } from "react";

export const useAuth = (): AuthContextValue => {
  const { user, loading, photoProXUser, setPhotoProXUser } =
    useContext(AuthContext);

  // Update the photoProXUser state through firebase

  useEffect(() => {
    if (!user) return;
    getUserState(user).then((photoProXUser) => {
      setPhotoProXUser(photoProXUser);
    });
  }, [setPhotoProXUser, user]);

  return { user, loading, photoProXUser, setPhotoProXUser };
};
