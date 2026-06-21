import { setAuthTokenGetter } from "@workspace/api-client-react";

export const TOKEN_KEY = "chatcart_token";

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function removeToken() {
  localStorage.removeItem(TOKEN_KEY);
}

export function initAuth() {
  setAuthTokenGetter(() => {
    return getToken();
  });
}

initAuth();
