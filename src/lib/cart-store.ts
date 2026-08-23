import { getProductById } from "@/lib/products";
import type { CartItem } from "@/lib/types";

const STORAGE_KEY = "abyshub.cart.v1";

export type CartState = {
  items: CartItem[];
  /** False until the browser store has been read, so the UI can show skeletons. */
  hydrated: boolean;
};

/**
 * The cart lives outside React so it can be read with useSyncExternalStore.
 * That keeps server and hydration renders identical (an empty cart) and lets
 * a change in one tab reach every other tab through the storage event.
 */
const SERVER_STATE: CartState = { items: [], hydrated: false };

let state: CartState = SERVER_STATE;
const listeners = new Set<() => void>();

function parseStoredCart(raw: string | null): CartItem[] {
  if (!raw) return [];

  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    return parsed.flatMap((entry) => {
      if (typeof entry !== "object" || entry === null) return [];
      const { productId, quantity } = entry as Partial<CartItem>;
      if (typeof productId !== "string") return [];
      if (typeof quantity !== "number" || !Number.isFinite(quantity)) return [];
      if (quantity < 1) return [];
      // Drop lines for products that are no longer in the catalog.
      if (!getProductById(productId)) return [];
      return [{ productId, quantity: Math.floor(quantity) }];
    });
  } catch {
    return [];
  }
}

function readStorage(): CartItem[] {
  try {
    return parseStoredCart(window.localStorage.getItem(STORAGE_KEY));
  } catch {
    return [];
  }
}

function writeStorage(items: CartItem[]) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch {
    // Storage can be unavailable (private mode, quota exceeded). The cart still
    // works for this session, it just will not survive a reload.
  }
}

function setState(next: CartState) {
  state = next;
  for (const listener of listeners) listener();
}

function handleStorageEvent(event: StorageEvent) {
  if (event.key !== null && event.key !== STORAGE_KEY) return;
  setState({ items: readStorage(), hydrated: true });
}

export function subscribe(listener: () => void): () => void {
  listeners.add(listener);

  if (listeners.size === 1) {
    window.addEventListener("storage", handleStorageEvent);
  }

  // The first subscription runs after hydration, which is the earliest point
  // it is safe to swap in the stored cart without a markup mismatch.
  if (!state.hydrated) {
    setState({ items: readStorage(), hydrated: true });
  }

  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) {
      window.removeEventListener("storage", handleStorageEvent);
    }
  };
}

export function getSnapshot(): CartState {
  return state;
}

export function getServerSnapshot(): CartState {
  return SERVER_STATE;
}

function commit(items: CartItem[]) {
  setState({ items, hydrated: true });
  writeStorage(items);
}

export function addItem(productId: string, quantity = 1) {
  const existing = state.items.find((item) => item.productId === productId);

  commit(
    existing
      ? state.items.map((item) =>
          item.productId === productId
            ? { ...item, quantity: item.quantity + quantity }
            : item
        )
      : [...state.items, { productId, quantity }]
  );
}

export function removeItem(productId: string) {
  commit(state.items.filter((item) => item.productId !== productId));
}

export function updateQuantity(productId: string, quantity: number) {
  if (quantity < 1) {
    removeItem(productId);
    return;
  }

  commit(
    state.items.map((item) =>
      item.productId === productId ? { ...item, quantity } : item
    )
  );
}

export function clearCart() {
  commit([]);
}
