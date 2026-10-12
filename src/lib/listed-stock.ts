/** Dashboard stock: sum variant quantities when any variant tracks stock. */
export function listedProductStock(product: {
  stock: number | null;
  variants?: Array<{ stock: number | null }>;
}): number | null {
  const counted = (product.variants ?? [])
    .map((variant) => variant.stock)
    .filter((stock): stock is number => typeof stock === "number" && Number.isFinite(stock));
  if (counted.length === 0) return product.stock;
  return counted.reduce((sum, stock) => sum + stock, 0);
}
