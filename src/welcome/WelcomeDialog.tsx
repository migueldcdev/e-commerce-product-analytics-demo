import { useRef, useState } from 'react';
import { cn } from 'cn';
import { Dialog } from 'radix-ui';
import { FOCUS_RING } from '@/shop/styles';

/** sessionStorage key set once the visitor dismisses the welcome screen. */
export const WELCOME_DISMISSED_KEY = 'demo-welcome-dismissed';

// Storage can throw (private mode, blocked site data); then the welcome shows on every load.
function wasDismissed(): boolean {
  try {
    return sessionStorage.getItem(WELCOME_DISMISSED_KEY) === '1';
  } catch {
    return false;
  }
}

function rememberDismissed() {
  try {
    sessionStorage.setItem(WELCOME_DISMISSED_KEY, '1');
  } catch {
    // Nothing to remember it in; the welcome shows again on the next load.
  }
}

/**
 * Full-screen "this is a demo" notice shown once per browser session. Only the button and
 * Esc close it; clicks on the backdrop are ignored so the message isn't skipped by accident.
 * The app keeps rendering (and loading data) underneath.
 */
export function WelcomeDialog() {
  const [open, setOpen] = useState(() => !wasDismissed());
  const startRef = useRef<HTMLButtonElement>(null);

  const onOpenChange = (next: boolean) => {
    if (next) return;
    rememberDismissed();
    setOpen(false);
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[70] bg-black/60 backdrop-blur-sm data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0" />
        <Dialog.Content
          aria-modal="true"
          onOpenAutoFocus={(event) => {
            event.preventDefault();
            startRef.current?.focus();
          }}
          onInteractOutside={(event) => event.preventDefault()}
          className={cn(
            'ph-no-capture fixed inset-0 z-[70] flex flex-col bg-background text-foreground outline-none',
            'sm:inset-auto sm:top-1/2 sm:left-1/2 sm:max-h-[calc(100dvh-4rem)] sm:w-[calc(100%-4rem)] sm:max-w-[560px] sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-xl sm:border sm:shadow-2xl',
            'data-open:animate-in data-open:fade-in-0 sm:data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0',
          )}
        >
          <div className="min-h-0 flex-1 overflow-y-auto px-6 py-8 sm:p-10">
            <Dialog.Title className="text-4xl/none font-light tracking-tighter sm:text-5xl/none">
              This is a demo
            </Dialog.Title>
            <Dialog.Description className="mt-5 text-base/relaxed">
              Play around as much as you like. Nothing will break, and you won&rsquo;t be charged.
            </Dialog.Description>

            <h3 className="mt-8 text-lg font-medium tracking-tight">What is this?</h3>
            <p className="mt-2 text-sm/relaxed text-muted-foreground">
              This demo shows how user interactions in an app can be captured with product
              analytics. Product analytics helps teams understand user behavior, improve the
              customer journey and make data-driven decisions.
            </p>

            <p className="mt-6 border-l-2 border-foreground pl-4 text-sm/relaxed">
              Your clicks, searches and filters on this page are recorded as anonymous events for
              this demo.
            </p>
          </div>

          <div className="flex shrink-0 justify-center border-t px-6 py-4 sm:px-10 sm:py-6">
            <Dialog.Close
              ref={startRef}
              className={cn(
                FOCUS_RING,
                'inline-flex h-11 w-full items-center justify-center bg-primary px-6 text-sm font-medium text-primary-foreground hover:bg-primary/85 sm:w-auto',
              )}
            >
              Understood, start browsing
            </Dialog.Close>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
