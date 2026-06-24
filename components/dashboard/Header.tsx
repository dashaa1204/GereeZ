import { Home } from "lucide-react";

export function Header() {
  return (
    <header className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-white px-4 py-3">
      <div className="flex items-center gap-2">
        <div className="flex size-8 items-center justify-center rounded-lg bg-navy text-white">
          <Home className="size-4" />
        </div>
        <span className="text-lg font-semibold text-navy">GereeZ</span>
      </div>
    </header>
  );
}
