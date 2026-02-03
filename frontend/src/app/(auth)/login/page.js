import { buildMetadata } from "@/lib/metadata";
import LoginForm from "@/components/LoginForm";

export const metadata = buildMetadata({
  title: "Login",
  description: "Sign in to your firm dashboard.",
});

export default function LoginPage() {
  return <LoginForm />;
}