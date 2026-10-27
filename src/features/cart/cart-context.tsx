"use client";

import { getVisitorKey } from "@/lib/analytics/client-track";
import type { PaymentMethodId } from "@/lib/orders/checkout";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

export type CartLine = {
  key: string;
  productId: string;
  slug: string;
  name: string;
  imageUrl: string | null;
  options: Record<string, string>;
  quantity: number;
  unitPrice: number;
  currency: string;
};

export type CustomerDraft = {
  name: string;
  governorate: string;
  address: string;
  notes: string;
  payment: PaymentMethodId;
};

export type PopularProduct = {
  id: string;
  slug: string;
  name: string;
  price: number;
  currency: string;
  imageUrl: string | null;
  hasOptions: boolean;
};

export type CartStore = {
  id: string;
  slug: string;
  name: string;
  whatsapp: string | null;
  showPromo: boolean;
};

type AddLine = Omit<CartLine, "key">;

type CartContextValue = {
  store: CartStore;
  popular: PopularProduct[];
  lines: CartLine[];
  count: number;
  open: boolean;
  bump: number;
  customer: CustomerDraft;
  setOpen: (open: boolean) => void;
  addLine: (line: AddLine) => void;
  setQuantity: (key: string, quantity: number) => void;
  removeLine: (key: string) => void;
  clear: () => void;
  setCustomer: (patch: Partial<CustomerDraft>) => void;
};

const CartContext = createContext<CartContextValue | null>(null);

const emptyCustomer: CustomerDraft = {
  name: "",
  governorate: "",
  address: "",
  notes: "",
  payment: "cash",
};

export function cartLineKey(productId: string, options: Record<string, string>): string {
  const entries = Object.entries(options)
    .filter(([, value]) => value.trim())
    .sort(([a], [b]) => a.localeCompare(b));
  return `${productId}:${JSON.stringify(entries)}`;
}

function cartStorageKey(slug: string): string {
  return `dukkan.cart.${slug}`;
}

function customerStorageKey(slug: string): string {
  return `dukkan.customer.${slug}`;
}

function readJson<T>(key: string): T | null {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export function CartProvider({
  store,
  popular,
  children,
}: {
  store: CartStore;
  popular: PopularProduct[];
  children: React.ReactNode;
}) {
  const [lines, setLines] = useState<CartLine[]>([]);
  const [customer, setCustomerState] = useState<CustomerDraft>(emptyCustomer);
  const [open, setOpen] = useState(false);
  const [bump, setBump] = useState(0);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const stored = readJson<CartLine[]>(cartStorageKey(store.slug));
    const savedCustomer = readJson<Partial<CustomerDraft>>(customerStorageKey(store.slug));
    if (Array.isArray(stored)) {
      setLines(
        stored.filter(
          (line) =>
            line &&
            typeof line.productId === "string" &&
            typeof line.name === "string" &&
            typeof line.quantity === "number",
        ),
      );
    }
    if (savedCustomer) {
      setCustomerState({ ...emptyCustomer, ...savedCustomer, payment: savedCustomer.payment ?? "cash" });
    }
    setReady(true);
  }, [store.slug]);

  useEffect(() => {
    if (!ready) return;
    try {
      window.localStorage.setItem(cartStorageKey(store.slug), JSON.stringify(lines));
    } catch {
      /* private mode */
    }
  }, [lines, ready, store.slug]);

  useEffect(() => {
    if (!ready) return;
    try {
      window.localStorage.setItem(customerStorageKey(store.slug), JSON.stringify(customer));
    } catch {
      /* private mode */
    }
  }, [customer, ready, store.slug]);

  const addLine = useCallback((line: AddLine) => {
    const key = cartLineKey(line.productId, line.options);
    setLines((current) => {
      const existing = current.find((item) => item.key === key);
      if (!existing) return [...current, { ...line, key, quantity: Math.min(99, line.quantity) }];
      return current.map((item) =>
        item.key === key
          ? { ...item, quantity: Math.min(99, item.quantity + line.quantity), unitPrice: line.unitPrice }
          : item,
      );
    });
    setBump((value) => value + 1);
  }, []);

  const setQuantity = useCallback((key: string, quantity: number) => {
    setLines((current) =>
      current.map((item) =>
        item.key === key ? { ...item, quantity: Math.min(99, Math.max(1, quantity)) } : item,
      ),
    );
  }, []);

  const removeLine = useCallback((key: string) => {
    setLines((current) => current.filter((item) => item.key !== key));
  }, []);

  const clear = useCallback(() => setLines([]), []);

  const setCustomer = useCallback((patch: Partial<CustomerDraft>) => {
    setCustomerState((current) => ({ ...current, ...patch }));
  }, []);

  const count = lines.reduce((sum, line) => sum + line.quantity, 0);
  const value = useMemo<CartContextValue>(
    () => ({
      store,
      popular,
      lines,
      count,
      open,
      bump,
      customer,
      setOpen,
      addLine,
      setQuantity,
      removeLine,
      clear,
      setCustomer,
    }),
    [
      store,
      popular,
      lines,
      count,
      open,
      bump,
      customer,
      addLine,
      setQuantity,
      removeLine,
      clear,
      setCustomer,
    ],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const value = useContext(CartContext);
  if (!value) throw new Error("Cart is only available on a storefront.");
  return value;
}

export function useCartOptional(): CartContextValue | null {
  return useContext(CartContext);
}

export function visitorKey(): string {
  return getVisitorKey();
}
