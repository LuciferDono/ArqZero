export { loadAuth, saveAuth, clearAuth } from './store.js';
export type { AuthData } from './store.js';
export { resolveAuthState } from './license.js';
export type { Tier } from './license.js';
export { isFeatureAllowed, isToolAllowed, isCommandAllowed, getCapabilityLimit, getUpgradeMessage, PRO_TOOLS, PRO_COMMANDS, FREE_CAPABILITY_LIMIT } from './gates.js';
export { isUsageCapped, incrementUsage, getUsageCount } from './usage.js';
export { requestLoginCode, verifyLoginCode, logout, getCheckoutUrl } from './client.js';
