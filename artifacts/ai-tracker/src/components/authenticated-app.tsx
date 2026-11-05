import { SignIn, useAuth } from "@clerk/react";
import { useEffect, useState } from "react";
import { setAuthTokenGetter } from "@workspace/api-client-react/custom-fetch";
import App from "@/App";

export function AuthenticatedApp() {
  const { getToken, isLoaded, isSignedIn, userId } = useAuth();
  const [registeredUser, setRegisteredUser] = useState<string | null | undefined>(undefined);
  useEffect(() => {
    if (!isLoaded) return;
    setAuthTokenGetter(() => isSignedIn ? getToken() : null);
    setRegisteredUser(userId ?? null);
    return () => setAuthTokenGetter(null);
  }, [getToken, isLoaded, isSignedIn, userId]);
  if (!isLoaded || registeredUser !== (userId ?? null)) return <p role="status">Loading session...</p>;
  return isSignedIn ? <App key={userId} /> : <main className="min-h-screen flex items-center justify-center p-6">
    <SignIn routing="hash" fallbackRedirectUrl={window.location.pathname + window.location.search} />
  </main>;
}
