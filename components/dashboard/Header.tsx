import { Home } from "lucide-react";
import { SignOutButton } from "@/components/auth/SignOutButton";
import { getAuthenticatedUser } from "@/lib/supabase-server";

export async function Header() {
  const user = await getAuthenticatedUser();

  return (
    <header className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-white px-4 py-3">
      <div className="flex items-center gap-2">
        <div className="flex size-8 items-center justify-center rounded-lg bg-navy text-white">
          <Home className="size-4" />
        </div>
        <span className="text-lg font-semibold text-navy">GereeZ</span>
      </div>

      {user && (
        <div className="flex items-center gap-2">
          <span className="max-w-[10rem] truncate text-xs text-muted-foreground">
            {user.email}
          </span>
          <SignOutButton />
        </div>
      )}
    </header>
  );
}
