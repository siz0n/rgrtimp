export function createPageNumbers(page, totalPages, visible = 5) {
  const safeTotal = Math.max(Number(totalPages) || 1, 1);
  const safePage = Math.min(Math.max(Number(page) || 1, 1), safeTotal);
  const safeVisible = Math.max(Number(visible) || 1, 1);
  const start = Math.max(1, Math.min(safePage - Math.floor(safeVisible / 2), safeTotal - safeVisible + 1));
  const end = Math.min(safeTotal, start + safeVisible - 1);

  return Array.from({ length: end - start + 1 }, (_, index) => start + index);
}
