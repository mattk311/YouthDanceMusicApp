let currentToken: string | null = null;

export function setCurrentToken(t: string | null): void {
  currentToken = t;
}

export function getCurrentToken(): string | null {
  return currentToken;
}
