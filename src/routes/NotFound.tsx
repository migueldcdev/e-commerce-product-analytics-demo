import { Link } from 'react-router';
import { cn } from 'cn';
import { EYEBROW, FOCUS_RING } from '@/shop/styles';

export function NotFound() {
  return (
    <div className="mx-auto w-full max-w-[90rem] px-5 py-24 sm:px-10 lg:pl-[22%]">
      <p className={cn(EYEBROW, 'text-muted-foreground')}>404</p>
      <h1 className="mt-4 text-4xl font-light tracking-tight">Page not found</h1>
      <Link
        to="/"
        className={cn(FOCUS_RING, 'mt-8 inline-block text-sm underline underline-offset-4')}
      >
        Browse all records
      </Link>
    </div>
  );
}
