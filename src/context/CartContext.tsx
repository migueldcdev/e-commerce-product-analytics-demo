import { useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react';
import { useCatalog } from './CatalogContext';
import {
  addLine,
  CartContext,
  setLineQuantity,
  type AddResult,
  type CartContextValue,
  type CartItem,
  type CartLine,
} from './cart';

/** The demo cart: in memory only, gone on reload. Stock limits come from the catalog. */
export function CartProvider({ children }: { children: ReactNode }) {
  const { byId } = useCatalog();
  const [lines, setLines] = useState<readonly CartLine[]>([]);
  // addToCart returns its result synchronously, so it reads the latest lines from a ref.
  // commit is the only writer of both, which keeps them in step.
  const linesRef = useRef(lines);

  const commit = useCallback((next: readonly CartLine[]) => {
    linesRef.current = next;
    setLines(next);
  }, []);

  const addToCart = useCallback(
    (recordId: string): AddResult => {
      const { lines: next, result } = addLine(linesRef.current, byId(recordId));
      if (result.ok) commit(next);
      return result;
    },
    [byId, commit],
  );

  const setQuantity = useCallback(
    (recordId: string, quantity: number) => {
      commit(setLineQuantity(linesRef.current, byId(recordId), quantity));
    },
    [byId, commit],
  );

  const remove = useCallback((recordId: string) => setQuantity(recordId, 0), [setQuantity]);

  const value = useMemo<CartContextValue>(() => {
    const items: CartItem[] = lines.flatMap((line) => {
      const record = byId(line.recordId);
      return record ? [{ ...line, record, lineTotal: record.price * line.quantity }] : [];
    });
    return {
      items,
      count: items.reduce((sum, item) => sum + item.quantity, 0),
      subtotal: items.reduce((sum, item) => sum + item.lineTotal, 0),
      addToCart,
      setQuantity,
      remove,
    };
  }, [lines, byId, addToCart, setQuantity, remove]);

  return <CartContext value={value}>{children}</CartContext>;
}

// eslint-disable-next-line react-refresh/only-export-components -- the hook lives with its provider
export function useCart(): CartContextValue {
  const context = useContext(CartContext);
  if (!context) throw new Error('useCart must be used within a <CartProvider>');
  return context;
}
