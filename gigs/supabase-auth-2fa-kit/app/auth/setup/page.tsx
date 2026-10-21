import { AuthGuard } from "../../../components/auth-guard";
import { MfaSetup } from "../../../components/mfa-setup";

export default function SetupPage() {
  return (
    <AuthGuard need="session">
      <MfaSetup optional />
    </AuthGuard>
  );
}
