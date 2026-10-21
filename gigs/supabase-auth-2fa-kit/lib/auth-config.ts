// Change these paths to match your app.
export const AUTH_PATHS = {
  signIn: "/auth/sign-in",
  signUp: "/auth/sign-up",
  setup2fa: "/auth/setup",
  verify2fa: "/auth/verify",
  afterLogin: "/dashboard",
} as const;

// Name shown in the user's authenticator app (Google Authenticator, Authy, 1Password...).
export const APP_NAME = "My App";
