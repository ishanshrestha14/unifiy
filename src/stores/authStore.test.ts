import { describe, it, expect, beforeEach, vi } from "vitest";

const { auth, from, toastError } = vi.hoisted(() => ({
  auth: {
    signUp: vi.fn(),
    signInWithPassword: vi.fn(),
    signOut: vi.fn(),
    getSession: vi.fn(),
    onAuthStateChange: vi.fn(),
  },
  from: vi.fn(),
  toastError: vi.fn(),
}));

vi.mock("../lib/supabase", () => ({ supabase: { auth, from } }));
vi.mock("../lib/logger", () => ({ logError: vi.fn() }));
vi.mock("sonner", () => ({ toast: { error: toastError } }));

import { useAuthStore } from "./authStore";
import { SUPABASE_NOT_FOUND_CODE, TOAST_MESSAGES } from "../constants";

const user = { id: "user-1", email: "ada@example.com" };
const session = { user, access_token: "token" };
const profileRow = {
  id: "user-1",
  tier: "free",
  current_workspace_id: "ws-1",
  onboarding_complete: true,
};

/** Mocks `supabase.from('profiles').select().eq().single()` */
function mockProfileSelect(result: { data: unknown; error: unknown }) {
  const single = vi.fn().mockResolvedValue(result);
  from.mockReturnValue({
    select: () => ({ eq: () => ({ single }) }),
  });
}

/** Mocks `supabase.from('profiles').update(payload).eq()` */
function mockProfileUpdate(result: { error: unknown }) {
  const update = vi.fn(() => ({ eq: vi.fn().mockResolvedValue(result) }));
  from.mockReturnValue({ update });
  return update;
}

const initialState = useAuthStore.getState();

describe("authStore", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, "log").mockImplementation(() => {});
    useAuthStore.setState(initialState, true);
  });

  describe("signIn", () => {
    it("stores the user and fetches their profile", async () => {
      auth.signInWithPassword.mockResolvedValue({ data: { user, session }, error: null });
      mockProfileSelect({ data: profileRow, error: null });

      const result = await useAuthStore.getState().signIn("ada@example.com", "pw");

      expect(result.error).toBeNull();
      expect(auth.signInWithPassword).toHaveBeenCalledWith({
        email: "ada@example.com",
        password: "pw",
      });
      const state = useAuthStore.getState();
      expect(state.user).toEqual(user);
      expect(state.loading).toBe(false);
      expect(state.profile).toEqual({
        id: "user-1",
        tier: "free",
        currentWorkspaceId: "ws-1",
        onboardingComplete: true,
      });
    });

    it("surfaces auth errors without setting a user", async () => {
      const error = { message: "Invalid login credentials" };
      auth.signInWithPassword.mockResolvedValue({ data: { user: null, session: null }, error });

      const result = await useAuthStore.getState().signIn("ada@example.com", "wrong");

      expect(result.error).toBe(error);
      expect(useAuthStore.getState()).toMatchObject({
        user: null,
        loading: false,
        error: "Invalid login credentials",
      });
      expect(from).not.toHaveBeenCalled();
    });
  });

  describe("signUp", () => {
    it("stores the new user", async () => {
      auth.signUp.mockResolvedValue({ data: { user, session }, error: null });
      mockProfileSelect({ data: profileRow, error: null });

      const result = await useAuthStore.getState().signUp("ada@example.com", "pw");

      expect(result.error).toBeNull();
      expect(useAuthStore.getState().user).toEqual(user);
    });

    it("surfaces signup errors", async () => {
      auth.signUp.mockResolvedValue({
        data: { user: null, session: null },
        error: { message: "User already registered" },
      });

      await useAuthStore.getState().signUp("ada@example.com", "pw");

      expect(useAuthStore.getState().error).toBe("User already registered");
    });
  });

  describe("signOut", () => {
    beforeEach(() => {
      useAuthStore.setState({ user: user as never, session: session as never, loading: false });
    });

    it("clears auth state", async () => {
      auth.signOut.mockResolvedValue({ error: null });

      await useAuthStore.getState().signOut();

      expect(useAuthStore.getState()).toMatchObject({ user: null, session: null, profile: null });
      expect(toastError).not.toHaveBeenCalled();
    });

    it("still clears local state and shows a toast when the API call throws", async () => {
      auth.signOut.mockRejectedValue(new Error("offline"));

      await useAuthStore.getState().signOut();

      expect(useAuthStore.getState().user).toBeNull();
      expect(toastError).toHaveBeenCalledWith(TOAST_MESSAGES.SIGN_OUT_FAILED);
    });
  });

  describe("fetchProfile", () => {
    it("returns null without querying when signed out", async () => {
      expect(await useAuthStore.getState().fetchProfile()).toBeNull();
      expect(from).not.toHaveBeenCalled();
    });

    it("treats a missing profile row as a non-error", async () => {
      useAuthStore.setState({ user: user as never });
      mockProfileSelect({ data: null, error: { code: SUPABASE_NOT_FOUND_CODE } });

      expect(await useAuthStore.getState().fetchProfile()).toBeNull();
      expect(useAuthStore.getState()).toMatchObject({ profileLoading: false, error: null });
    });

    it("records other database errors", async () => {
      useAuthStore.setState({ user: user as never });
      mockProfileSelect({ data: null, error: new Error("db down") });

      expect(await useAuthStore.getState().fetchProfile()).toBeNull();
      expect(useAuthStore.getState().error).toBe("db down");
    });
  });

  describe("updateProfile", () => {
    beforeEach(() => {
      useAuthStore.setState({
        user: user as never,
        profile: { id: "user-1", tier: "free", currentWorkspaceId: null, onboardingComplete: false },
      });
    });

    it("maps camelCase fields to snake_case columns and updates local state", async () => {
      const update = mockProfileUpdate({ error: null });

      await useAuthStore.getState().updateProfile({ onboardingComplete: true, currentWorkspaceId: "ws-9" });

      expect(update).toHaveBeenCalledWith({ onboarding_complete: true, current_workspace_id: "ws-9" });
      expect(useAuthStore.getState().profile).toMatchObject({
        onboardingComplete: true,
        currentWorkspaceId: "ws-9",
      });
    });

    it("keeps the old profile and toasts on failure", async () => {
      mockProfileUpdate({ error: new Error("denied") });

      await useAuthStore.getState().updateProfile({ onboardingComplete: true });

      expect(useAuthStore.getState().profile?.onboardingComplete).toBe(false);
      expect(toastError).toHaveBeenCalledWith(TOAST_MESSAGES.PROFILE_UPDATE_FAILED);
    });
  });

  describe("initialize", () => {
    it("restores an existing session and subscribes to auth changes", async () => {
      auth.getSession.mockResolvedValue({ data: { session } });
      mockProfileSelect({ data: profileRow, error: null });

      await useAuthStore.getState().initialize();

      expect(useAuthStore.getState()).toMatchObject({ user, loading: false });
      expect(useAuthStore.getState().profile?.id).toBe("user-1");
      expect(auth.onAuthStateChange).toHaveBeenCalledOnce();
    });

    it("clears the profile when the auth listener reports a sign-out", async () => {
      auth.getSession.mockResolvedValue({ data: { session } });
      mockProfileSelect({ data: profileRow, error: null });
      await useAuthStore.getState().initialize();

      const listener = auth.onAuthStateChange.mock.calls[0][0];
      await listener("SIGNED_OUT", null);

      expect(useAuthStore.getState()).toMatchObject({ user: null, profile: null });
    });

    it("does not refetch the profile when the same user's session refreshes", async () => {
      auth.getSession.mockResolvedValue({ data: { session } });
      mockProfileSelect({ data: profileRow, error: null });
      await useAuthStore.getState().initialize();
      from.mockClear();

      const listener = auth.onAuthStateChange.mock.calls[0][0];
      await listener("TOKEN_REFRESHED", session);

      expect(from).not.toHaveBeenCalled();
    });
  });
});
