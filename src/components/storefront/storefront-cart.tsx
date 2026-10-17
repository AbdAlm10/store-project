"use client";

import { CartBottomBar, CartSpacer } from "@/features/cart/cart-chrome";
import { CartProvider, type CartStore, type PopularProduct } from "@/features/cart/cart-context";
import { CartSheet } from "@/features/cart/cart-sheet";

export function StorefrontCart({
  store,
  popular,
  children,
}: {
  store: CartStore;
  popular: PopularProduct[];
  children: React.ReactNode;
}) {
  return (
    <CartProvider store={store} popular={popular}>
      {children}
      <CartSpacer />
      <CartBottomBar />
      <CartSheet />
    </CartProvider>
  );
}
