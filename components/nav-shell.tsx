"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { SignOutButton } from "@/components/sign-out-button";
import {
  BookOpen,
  ClipboardList,
  LayoutDashboard,
  PlusCircle,
  Truck,
} from "lucide-react";

function isActive(pathname: string, href: string): boolean {
  if (href === "/orders") {
    return (
      pathname === "/orders" ||
      (pathname.startsWith("/orders/") && !pathname.startsWith("/orders/new"))
    );
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

function MobileLink({ href, label, icon }: { href: string; label: string; icon: ReactNode }) {
  const pathname = usePathname();
  const active = isActive(pathname, href);
  return (
    <Link href={href} className={cn("flex min-h-14 flex-col items-center justify-center gap-0.5 text-muted-foreground", active && "font-semibold text-primary")}>
      {icon}
      <span className="text-[11px]">{label}</span>
    </Link>
  );
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
          <Link href="/dashboard" className="mr-3 text-sm font-bold text-primary">TradeFlow AI</Link>
          <div className="hidden items-center gap-1 md:flex">
            <NavLink href="/dashboard">Dashboard</NavLink>
            <NavLink href="/orders/new">New Order</NavLink>
            <NavLink href="/orders">Orders</NavLink>
            <NavLink href="/dispatch">Dispatch</NavLink>
            <NavLink href="/khata">Khata</NavLink>
            <NavLink href="/security">Security</NavLink>
          </div>
          <div className="ml-auto flex items-center gap-1">
            <SignOutButton />
          </div>
        </div>
      </nav>
      <main className="container mx-auto flex flex-grow flex-col px-4 pt-6 pb-24 md:pb-6">
        {children}
      </main>
      <div className="no-print fixed inset-x-0 bottom-0 z-40 border-t bg-background md:hidden">
        <div className="grid grid-cols-5">
          <MobileLink href="/dashboard" label="Home" icon={<LayoutDashboard className="h-5 w-5" />} />
          <MobileLink href="/orders/new" label="New" icon={<PlusCircle className="h-5 w-5" />} />
          <MobileLink href="/orders" label="Orders" icon={<ClipboardList className="h-5 w-5" />} />
          <MobileLink href="/dispatch" label="Dispatch" icon={<Truck className="h-5 w-5" />} />
          <MobileLink href="/khata" label="Khata" icon={<BookOpen className="h-5 w-5" />} />
        </div>
      </div>
    </div>
  );
}
