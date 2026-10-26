import { create } from "zustand";
import { LOCAL_SESSION, LOCAL_USER } from "../local/database.js";
// A stable local identity lets the existing library components work without authentication.
// This object contains no access token and is never sent to a server.
export const useAuthStore = create(() => ({
  session: LOCAL_SESSION,
  user: { ...LOCAL_USER, username: "Ma bibliothèque", role: "local" },
  loading: false,
  init: () => {},
  loadProfile: async () => {},
  isGuest: () => false,
}));
