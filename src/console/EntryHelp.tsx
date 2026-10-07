import { CircleQuestionMark } from 'lucide-react';
import { useRef, useState } from 'react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

/**
 * The ? button of a console row. The tooltip opens on hover and keyboard focus like any
 * tooltip, and also on click or tap so it works on touch screens, where tooltips never open
 * on their own. A click pins it open; a second click, Escape or a click elsewhere closes it.
 */
export function EntryHelp({ label, help }: { label: string; help: string }) {
  const [open, setOpen] = useState(false);
  // Opened by a click: stays open when the pointer leaves or focus moves.
  const pinned = useRef(false);
  // Closed by a click: a pending hover-open must not bring it back until the pointer leaves.
  const dismissed = useRef(false);
  const trigger = useRef<HTMLButtonElement>(null);

  const unpin = () => {
    pinned.current = false;
  };
  const reset = () => {
    dismissed.current = false;
  };

  return (
    <Tooltip
      open={open}
      onOpenChange={(next) => {
        if (!next && pinned.current) return;
        if (next && dismissed.current) return;
        setOpen(next);
      }}
    >
      <TooltipTrigger
        ref={trigger}
        aria-label={`About ${label}`}
        onClick={(event) => {
          // Radix closes the tooltip on click; preventing default skips that.
          event.preventDefault();
          pinned.current = !pinned.current;
          dismissed.current = !pinned.current;
          setOpen(pinned.current);
        }}
        onPointerLeave={reset}
        onBlur={reset}
        className="inline-flex size-5 items-center justify-center rounded-full text-zinc-600 outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring [&_svg]:size-3.5"
      >
        <CircleQuestionMark aria-hidden="true" />
      </TooltipTrigger>
      <TooltipContent
        side="right"
        align="start"
        collisionPadding={8}
        onEscapeKeyDown={unpin}
        onPointerDownOutside={(event) => {
          // A press on the ? itself is handled by its click, not as an outside press.
          if (event.target instanceof Node && trigger.current?.contains(event.target)) {
            event.preventDefault();
            return;
          }
          unpin();
        }}
        className="ph-no-capture max-w-72 text-left leading-snug text-pretty"
      >
        {help}
      </TooltipContent>
    </Tooltip>
  );
}
