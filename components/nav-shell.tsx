"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { SignOutButton } from "@/components/sign-out-button";

function isActive(pathname: string, href: string): boolean {
  if (href === "/orders") {
    return (
      pathname === "/orders" ||
      (pathname.startsWith("/orders/") && !pathname.startsWith("/orders/new"))
    );
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

function NavLink({ href, children }: { href: string; children: ReactNode }) {
  const pathname = usePathname();
  return (
    <Link
      href={href}
      className={cn(
        "rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-muted hover:text-muted-foreground",
        isActive(pathname, href)
          ? "bg-muted text-muted-foreground"
          : "text-foreground"
      )}
    >
      {children}
    </Link>
  );
}

export function NavShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <nav className="border-b">
        <div className="container mx-auto flex h-14 items-center gap-1 overflow-x-auto whitespace-nowrap px-4">
          <NavLink href="/dashboard">Dashboard</NavLink>
          <NavLink href="/orders/new">New Order</NavLink>
          <NavLink href="/orders">Orders</NavLink>
          <NavLink href="/dispatch">Dispatch</NavLink>
          <NavLink href="/khata">Khata</NavLink>
          <div className="ml-auto">
            <SignOutButton />
          </div>
        </div>
      </nav>
      <main className="container mx-auto flex flex-grow flex-col px-4 py-6">
        {children}
      </main>
    </div>
  );
}
