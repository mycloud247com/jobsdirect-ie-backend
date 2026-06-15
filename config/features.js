/**
 * Feature flags — single source of truth for feature availability.
 *
 * V1 hides certain features. V2 enables them by flipping flags to true.
 * Only checked at edges: route registration, product filtering.
 * Controllers and services never check these — routes simply don't register.
 */
export const Features = {
  cvDatabase: false,    // Hidden for V1
  fullMessaging: false,  // Hidden for V1 — structured actions remain
}
