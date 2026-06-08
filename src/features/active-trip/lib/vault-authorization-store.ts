const VAULT_AUTH_KEY = 'tripnara_vault_authorize_v1';
const VAULT_ORDER_KEY = 'tripnara_vault_milestone_order_v1';

type VaultAuthStore = Record<string, string[]>;
type VaultOrderStore = Record<string, string[]>;

function readVaultAuth(): VaultAuthStore {
  try {
    const raw = localStorage.getItem(VAULT_AUTH_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as VaultAuthStore;
  } catch {
    return {};
  }
}

function writeVaultAuth(store: VaultAuthStore): void {
  try {
    localStorage.setItem(VAULT_AUTH_KEY, JSON.stringify(store));
  } catch {
    /* ignore */
  }
}

function readVaultOrder(): VaultOrderStore {
  try {
    const raw = localStorage.getItem(VAULT_ORDER_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as VaultOrderStore;
  } catch {
    return {};
  }
}

function writeVaultOrder(store: VaultOrderStore): void {
  try {
    localStorage.setItem(VAULT_ORDER_KEY, JSON.stringify(store));
  } catch {
    /* ignore */
  }
}

export function getAuthorizedVaultMilestones(tripId: string): string[] {
  return readVaultAuth()[tripId] ?? [];
}

export function authorizeVaultMilestones(tripId: string, milestoneIds: string[]): string[] {
  const store = readVaultAuth();
  const prev = new Set(store[tripId] ?? []);
  for (const id of milestoneIds) prev.add(id);
  store[tripId] = [...prev];
  writeVaultAuth(store);
  return store[tripId];
}

export function getVaultMilestoneOrder(tripId: string): string[] | null {
  return readVaultOrder()[tripId] ?? null;
}

export function setVaultMilestoneOrder(tripId: string, milestoneIds: string[]): void {
  const store = readVaultOrder();
  store[tripId] = milestoneIds;
  writeVaultOrder(store);
}
