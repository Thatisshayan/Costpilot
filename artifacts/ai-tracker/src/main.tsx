import { createRoot } from "react-dom/client";
import { ClerkProvider, SignIn, SignedIn, SignedOut, useAuth } from "@clerk/clerk-react";
import { useEffect } from "react";
import { initSentry } from "@/lib/sentry";
import { setAuthTokenGetter, setBaseUrl } from "@workspace/api-client-react/custom-fetch";
import App from "./App";
import "./index.css";

initSentry();

window.addEventListener("online", () => console.log("[App] Back online"));
window.addEventListener("offline", () => console.log("[App] Offline"));

setBaseUrl(import.meta.env.VITE_API_ORIGIN || null);

function AuthenticatedApp() {
  const { getToken } = useAuth();
  useEffect(() => {
    setAuthTokenGetter(() => getToken());
    return () => setAuthTokenGetter(null);
  }, [getToken]);

  return (
    <>
      <SignedIn><App /></SignedIn>
      <SignedOut>
        <main className="min-h-screen flex items-center justify-center p-6">
          <SignIn routing="hash" />
        </main>
      </SignedOut>
    </>
  );
}

const publishableKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;
const root = document.getElementById("root")!;
createRoot(root).render(publishableKey ? (
  <ClerkProvider publishableKey={publishableKey}>
    <AuthenticatedApp />
  </ClerkProvider>
) : (
  <main role="alert" className="min-h-screen flex items-center justify-center p-6">
    Set VITE_CLERK_PUBLISHABLE_KEY to enable sign-in.
  </main>
));
