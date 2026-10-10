import { Link, Outlet } from 'react-router';
import { cn } from 'cn';
import { CartProvider } from '@/context/CartContext';
import { CatalogProvider } from '@/context/CatalogContext';
import { ToastProvider } from '@/context/ToastContext';
import { CartPanel } from '@/shop/CartPanel';
import { SearchBar } from '@/shop/SearchBar';
import { FOCUS_RING } from '@/shop/styles';

export const STORE_NAME = 'Side A';

export function RootLayout() {
  return (
    <CatalogProvider>
      <CartProvider>
        <ToastProvider>
          <div className="min-h-full bg-background text-foreground">
            <header className="border-b border-border">
              <div className="mx-auto flex w-full max-w-[90rem] flex-wrap items-center gap-x-10 gap-y-3 px-5 py-4 sm:flex-nowrap sm:px-10">
                <Link
                  to="/"
                  className={cn(FOCUS_RING, 'text-lg font-semibold tracking-tight')}
                  aria-label={`${STORE_NAME} Records, home`}
                >
                  {STORE_NAME}
                  <span className="font-light text-muted-foreground"> Records</span>
                </Link>
                <SearchBar className="order-last w-full sm:order-none sm:ml-auto sm:max-w-xs" />
                <div className="ml-auto sm:ml-0">
                  <CartPanel />
                </div>
              </div>
            </header>
            <main className="pb-24">
              <Outlet />
            </main>
          </div>
        </ToastProvider>
      </CartProvider>
    </CatalogProvider>
  );
}
