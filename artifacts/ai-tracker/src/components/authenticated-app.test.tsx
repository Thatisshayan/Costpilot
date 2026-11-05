import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { useState } from "react";
import { QueryClient } from "@tanstack/react-query";

const auth = vi.hoisted(() => ({ userId: "account-a" as string | null, isSignedIn: true, isLoaded: true, getToken: vi.fn(async () => "fixture") }));
vi.mock("@clerk/react", () => ({ useAuth: () => auth, SignIn: () => <p>Sign in</p> }));
vi.mock("@/App", () => ({ default: function AccountApp() {
  const [cache] = useState(() => { const c = new QueryClient(); c.setQueryData(["expenses"], auth.userId); return c; });
  return <p>{cache.getQueryData<string>(["expenses"])}</p>;
} }));
import { AuthenticatedApp } from "./authenticated-app";
afterEach(() => { cleanup(); auth.userId = "account-a"; auth.isSignedIn = true; });
describe("account cache isolation", () => {
  it("replaces cached expense state when switching signed-in accounts", () => {
    const view = render(<AuthenticatedApp />);
    expect(screen.getByText("account-a")).toBeTruthy();
    auth.userId = "account-b";
    view.rerender(<AuthenticatedApp />);
    expect(screen.queryByText("account-a")).toBeNull();
    expect(screen.getByText("account-b")).toBeTruthy();
  });
  it("unmounts protected data at sign-out", () => {
    const view = render(<AuthenticatedApp />);
    auth.userId = null; auth.isSignedIn = false;
    view.rerender(<AuthenticatedApp />);
    expect(screen.queryByText("account-a")).toBeNull();
    expect(screen.getByText("Sign in")).toBeTruthy();
  });
});
