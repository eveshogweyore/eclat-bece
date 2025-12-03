import { useNavigate } from "react-router-dom";
import { useAuthContext } from "@/components/AuthProvider";

export const useAuth = () => {
  const { user, session, loading, signOut } = useAuthContext();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate("/auth");
  };

  return { user, session, loading, signOut: handleSignOut };
};
