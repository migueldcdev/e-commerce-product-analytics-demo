import { Minus, Plus, ShoppingBag } from 'lucide-react';
import { cn } from 'cn';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { useCart } from '@/context/CartContext';
import { useToast } from '@/context/ToastContext';
import { formatPrice } from '@/lib/format';
import { EYEBROW, FOCUS_RING } from './styles';

export const CHECKOUT_DISABLED_MESSAGE = 'Demo only — checkout disabled.';

const STEP_BUTTON = cn(
  FOCUS_RING,
  'inline-flex size-7 items-center justify-center text-foreground hover:bg-muted disabled:cursor-not-allowed disabled:text-muted-foreground disabled:hover:bg-transparent [&_svg]:size-3.5',
);

function itemsLabel(count: number) {
  return `${count} ${count === 1 ? 'item' : 'items'}`;
}

/** Header cart button and the slide-out panel it opens. */
export function CartPanel() {
  const { items, count, subtotal, setQuantity, remove } = useCart();
  const { toast } = useToast();

  return (
    <Sheet>
      <SheetTrigger
        aria-label={`Cart, ${itemsLabel(count)}`}
        className={cn(FOCUS_RING, 'relative inline-flex h-10 items-center gap-2 px-1 text-sm')}
      >
        <ShoppingBag aria-hidden="true" className="size-5" strokeWidth={1.5} />
        <span aria-hidden="true" data-testid="cart-count" className="min-w-4 tabular-nums">
          {count}
        </span>
      </SheetTrigger>

      <SheetContent side="right" className="w-full gap-0 sm:max-w-md">
        <SheetHeader className="border-b px-8 pt-10 pb-6">
          <SheetTitle className="text-3xl font-light tracking-tight">Cart</SheetTitle>
          <SheetDescription>
            {count === 0 ? 'Your cart is empty.' : itemsLabel(count)}
          </SheetDescription>
        </SheetHeader>

        {items.length > 0 && (
          <ul aria-label="Cart items" className="min-h-0 flex-1 divide-y overflow-y-auto px-8">
            {items.map(({ record, quantity, lineTotal }) => {
              const atLimit = quantity >= record.units;
              return (
                <li key={record.id} data-testid="cart-line" className="flex gap-4 py-6">
                  <img
                    src={record.image}
                    alt=""
                    width={64}
                    height={64}
                    className="size-16 shrink-0 bg-muted object-cover"
                  />
                  <div className="flex min-w-0 flex-1 flex-col gap-1">
                    <p className={cn(EYEBROW, 'truncate text-muted-foreground')}>{record.artist}</p>
                    <p className="truncate text-sm font-medium">{record.title}</p>
                    <div className="mt-2 flex items-center justify-between gap-3">
                      <div className="flex items-center border">
                        <button
                          type="button"
                          aria-label={`Decrease quantity of ${record.title}`}
                          onClick={() => setQuantity(record.id, quantity - 1)}
                          className={STEP_BUTTON}
                        >
                          <Minus aria-hidden="true" />
                        </button>
                        <span
                          aria-label={`Quantity of ${record.title}`}
                          role="status"
                          className="w-8 text-center text-sm tabular-nums"
                        >
                          {quantity}
                        </span>
                        <button
                          type="button"
                          aria-label={`Increase quantity of ${record.title}`}
                          disabled={atLimit}
                          onClick={() => setQuantity(record.id, quantity + 1)}
                          className={STEP_BUTTON}
                        >
                          <Plus aria-hidden="true" />
                        </button>
                      </div>
                      <p className="text-sm tabular-nums" data-testid="line-total">
                        {formatPrice(lineTotal)}
                      </p>
                    </div>
                    <div className="mt-1 flex items-center justify-between gap-3 text-xs text-muted-foreground">
                      <span>{atLimit ? `Max ${record.units} in stock` : ''}</span>
                      <button
                        type="button"
                        aria-label={`Remove ${record.title}`}
                        onClick={() => remove(record.id)}
                        className={cn(FOCUS_RING, 'underline-offset-4 hover:underline')}
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        <SheetFooter className="gap-6 border-t px-8 py-8">
          <dl className="flex items-baseline justify-between">
            <dt className={cn(EYEBROW, 'text-muted-foreground')}>Subtotal</dt>
            <dd className="text-xl tabular-nums" data-testid="subtotal">
              {formatPrice(subtotal)}
            </dd>
          </dl>
          <button
            type="button"
            disabled={count === 0}
            onClick={() => toast(CHECKOUT_DISABLED_MESSAGE)}
            className={cn(
              FOCUS_RING,
              'h-12 w-full bg-foreground text-sm font-medium text-background transition-opacity hover:opacity-85 disabled:cursor-not-allowed disabled:opacity-40',
            )}
          >
            Checkout
          </button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
