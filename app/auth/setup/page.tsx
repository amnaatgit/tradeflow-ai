import { MfaSetup } from "@/components/MfaSetup";
import { AuthGuard } from "@/components/auth-guard";

export default function SetupPage() {
  return (
    <AuthGuard need="session">
      <div>
        <MfaSetup />
      </div>
    </AuthGuard>
  );
}
