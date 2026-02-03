import { buildMetadata } from "@/lib/metadata";
import RegisterForm from "@/components/RegisterForm";

export const metadata = buildMetadata({
  title: "Register",
  description: "Create your firm account and get started.",
});

export default function RegisterPage() {
  return <RegisterForm />;
}