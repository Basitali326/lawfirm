import { buildMetadata } from "@/lib/metadata";
import LoginRedirectGuard from "@/components/auth/LoginRedirectGuard";

export const metadata = buildMetadata({
  title: "Login",
  description: "Sign in to your firm dashboard.",
});

export default function LoginPage() {
  return <LoginRedirectGuard />;
}
