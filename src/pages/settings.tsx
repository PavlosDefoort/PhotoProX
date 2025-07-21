import { useRouter } from "next/router";
import { useEffect } from "react";

const RedirectPage = () => {
  const router = useRouter();

  useEffect(() => {
    // Redirect to /settings/general if the current path is /settings
    if (router.pathname === "/settings") {
      router.replace("/settings/general");
    }
  }, [router]);

  // This page does not render anything, it just redirects
  return null;
};

export default RedirectPage;
