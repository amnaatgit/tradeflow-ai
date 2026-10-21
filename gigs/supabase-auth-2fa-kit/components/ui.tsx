import type { ButtonHTMLAttributes, InputHTMLAttributes, LabelHTMLAttributes, ReactNode } from "react";

// Tiny Tailwind primitives so the kit has no UI-library dependency. Swap for your own components.
export function Button({
  variant = "primary",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "ghost" | "danger" }) {
  const styles = {
    primary: "bg-blue-600 text-white hover:bg-blue-700",
    ghost: "bg-transparent text-gray-700 hover:bg-gray-100",
    danger: "bg-red-600 text-white hover:bg-red-700",
  }[variant];
  return (
    <button
      className={`inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-medium transition disabled:opacity-50 ${styles} ${className}`}
      {...props}
    />
  );
}

export function Input({ className = "", ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={`w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${className}`}
      {...props}
    />
  );
}

export function Label(props: LabelHTMLAttributes<HTMLLabelElement>) {
  return <label className="text-sm font-medium text-gray-800" {...props} />;
}

export function Card({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
  return (
    <div className="w-full rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
      <h1 className="text-xl font-semibold">{title}</h1>
      {description && <p className="mt-1 text-sm text-gray-500">{description}</p>}
      <div className="mt-5">{children}</div>
    </div>
  );
}

export function Alert({ kind = "error", children }: { kind?: "error" | "success" | "info"; children: ReactNode }) {
  const styles = {
    error: "bg-red-50 text-red-700",
    success: "bg-green-50 text-green-800",
    info: "bg-gray-100 text-gray-700",
  }[kind];
  return <p className={`mb-4 rounded-md p-3 text-sm ${styles}`}>{children}</p>;
}
