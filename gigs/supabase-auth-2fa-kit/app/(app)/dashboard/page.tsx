"use client";

import { useState } from "react";
import { authFetch } from "../../../lib/auth-fetch";
import { Button } from "../../../components/ui";

// Example protected page that calls a protected API route.
export default function DashboardPage() {
  const [result, setResult] = useState<string>("");
  async function callApi() {
    const res = await authFetch("/api/me");
    setResult(`${res.status}: ${await res.text()}`);
  }
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Dashboard</h1>
      <p className="text-sm text-gray-500">Only signed-in users (with their 2FA code, if 2FA is on) can see this page.</p>
      <Button onClick={callApi}>Call protected API</Button>
      {result && <pre className="rounded bg-gray-100 p-3 text-xs">{result}</pre>}
    </div>
  );
}
