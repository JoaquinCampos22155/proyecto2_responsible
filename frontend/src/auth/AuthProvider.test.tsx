import { act, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { describe, it, expect, vi, beforeEach } from "vitest";
import type { User } from "firebase/auth";
const sdk = vi.hoisted(() => ({
  listener: null as null | ((user: unknown) => Promise<void>),
  signOut: vi.fn(),
  redirect: vi.fn(),
  popup: vi.fn(),
}));
vi.mock("firebase/app", () => ({ initializeApp: () => ({}) }));
vi.mock("firebase/auth", () => ({
  getAuth: () => ({ currentUser: null }),
  onIdTokenChanged: (
    _auth: unknown,
    callback: (user: unknown) => Promise<void>,
  ) => {
    sdk.listener = callback;
    return () => {};
  },
  getRedirectResult: () => Promise.resolve(null),
  GoogleAuthProvider: class {
    setCustomParameters() {}
  },
  signInWithPopup: sdk.popup,
  signInWithRedirect: sdk.redirect,
  signOut: sdk.signOut,
  connectAuthEmulator: () => {},
  signInWithEmailAndPassword: () => Promise.resolve(),
}));
import { AuthProvider, useAuth } from "./AuthProvider";
function Status() {
  const state = useAuth();
  return (
    <>
      <div>
        {state.loading ? "initializing" : state.user ? "reader" : "signed-out"}
      </div>
      <div>{state.admin ? "editor" : "no-editor"}</div>
      <button onClick={() => void state.logout()}>sign out</button>
    </>
  );
}
function setup() {
  const client = new QueryClient();
  render(
    <QueryClientProvider client={client}>
      <AuthProvider>
        <Status />
      </AuthProvider>
    </QueryClientProvider>,
  );
  return client;
}
beforeEach(() => {
  sdk.signOut.mockResolvedValue(undefined);
});
describe("Firebase session boundaries", () => {
  it("waits for Firebase before showing authenticated content and reads custom claims", async () => {
    setup();
    expect(screen.getByText("initializing")).toBeInTheDocument();
    await act(async () =>
      sdk.listener?.({
        uid: "one",
        getIdTokenResult: async () => ({ claims: { admin: true } }),
      } as unknown as User),
    );
    expect(screen.getByText("reader")).toBeInTheDocument();
    expect(screen.getByText("editor")).toBeInTheDocument();
  });
  it("keeps active query data when a token refreshes for the same user", async () => {
    const client = setup();
    const user = {
      uid: "same",
      getIdTokenResult: async () => ({ claims: {} }),
    };
    await act(async () => sdk.listener?.(user));
    client.setQueryData(["reader-feed"], { title: "loaded" });
    await act(async () => sdk.listener?.(user));
    expect(client.getQueryData(["reader-feed"])).toEqual({ title: "loaded" });
  });
  it("does not restore an old user if a claims request finishes after signout", async () => {
    setup();
    let resolve!: (value: { claims: object }) => void;
    const delayed = new Promise<{ claims: object }>((r) => {
      resolve = r;
    });
    let pending!: Promise<void>;
    await act(async () => {
      pending = sdk.listener!({ uid: "old", getIdTokenResult: () => delayed });
      await sdk.listener!(null);
    });
    expect(screen.getByText("signed-out")).toBeInTheDocument();
    await act(async () => {
      resolve({ claims: { admin: true } });
      await pending;
    });
    await waitFor(() =>
      expect(screen.getByText("signed-out")).toBeInTheDocument(),
    );
  });
});
