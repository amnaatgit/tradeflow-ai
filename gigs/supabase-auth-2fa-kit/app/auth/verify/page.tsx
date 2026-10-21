import { AuthGuard } from "../../../components/auth-guard";
import { MfaVerify } from "../../../components/mfa-verify";

export default function VerifyPage() {
  return (
    <AuthGuard need="session">
      <MfaVerify />
    </AuthGuard>
  );
}
