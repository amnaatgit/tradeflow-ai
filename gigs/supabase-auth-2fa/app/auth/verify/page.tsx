import { MfaVerify } from "../../../components/MfaVerify";
import { AuthGuard } from "../../../components/auth-guard";

export default function VerifyPage() {
  return (
    <AuthGuard need="session">
      <MfaVerify />
    </AuthGuard>
  );
}
