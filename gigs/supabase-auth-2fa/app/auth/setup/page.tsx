import { MfaSetup } from "../../../components/MfaSetup";
import { AuthGuard } from "../../../components/auth-guard";

export default function SetupPage() {
  return (
    <AuthGuard need="session">
      <MfaSetup />
    </AuthGuard>
  );
}
