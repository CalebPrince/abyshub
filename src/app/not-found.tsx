import Link from "next/link";

import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="mx-auto flex max-w-xl flex-col items-center px-4 py-28 text-center lg:py-36">
      <p className="font-display text-primary text-7xl font-extrabold">404</p>
      <h1 className="font-display mt-4 text-3xl font-extrabold tracking-tight uppercase">
        Not on our shelves
      </h1>
      <p className="text-muted-foreground mt-3">
        The link is out of date, or we no longer stock that item.
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Button asChild>
          <Link href="/products">Browse the shop</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/">Go home</Link>
        </Button>
      </div>
    </div>
  );
}
