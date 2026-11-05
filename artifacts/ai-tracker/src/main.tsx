import { createRoot } from "react-dom/client";
import { ClerkProvider } from "@clerk/react";
import { AuthenticatedApp } from "@/components/authenticated-app";
import { initSentry } from "@/lib/sentry";
import { setBaseUrl } from "@workspace/api-client-react/custom-fetch";
import "./index.css";

initSentry();

window.addEventListener("online", () => console.log("[App] Back online"));
window.addEventListener("offline", () => console.log("[App] Offline"));

setBaseUrl(import.meta.env.VITE_API_ORIGIN || null);

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
