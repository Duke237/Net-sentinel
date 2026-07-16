import { useEffect, useState } from "react";
import { getCurrentUser, onAuthChange, type User } from "./auth";

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    setUser(getCurrentUser());
    setReady(true);
    return onAuthChange(() => setUser(getCurrentUser()));
  }, []);
  return { user, ready };
}
