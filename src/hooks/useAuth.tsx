import { AuthContext } from "@/context/AuthContext";
import { AuthContextValue } from "@/interfaces/ContextInterfaces";
import { getUserState } from "@/services/FireBase";
import { useContext, useEffect } from "react";

export const useAuth = (): AuthContextValue => {
  const { user, loading, zynaloUser, setZynaloUser } =
    useContext(AuthContext);

  // Update the zynaloUser state through firebase

  useEffect(() => {
    if (!user) return;
    getUserState(user).then((zynaloUser) => {
      setZynaloUser(zynaloUser);
    });
  }, [setZynaloUser, user]);

  return { user, loading, zynaloUser, setZynaloUser };
};
