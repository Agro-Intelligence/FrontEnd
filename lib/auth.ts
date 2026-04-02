export const AUTH_COOKIE_NAME = "hedge_lab_auth";
export const LOGIN_PATH = "/login";
export const LOGIN_API_PATH = "/api/auth/login";
export const LOGOUT_API_PATH = "/api/auth/logout";

export function getAuthConfig() {
  const password = process.env.WEBAPP_PASSWORD?.trim();
  const sessionToken = process.env.WEBAPP_SESSION_TOKEN?.trim();

  return {
    enabled: Boolean(password && sessionToken),
    password: password ?? "",
    sessionToken: sessionToken ?? "",
  };
}
