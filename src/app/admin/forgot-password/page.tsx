import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthCard } from "@/app/admin/auth-card";
import { getSessionUser } from "@/lib/portal/auth";
import { ResetRequestForm } from "./reset-request-form";

export default async function ForgotPasswordPage() {
  const session = await getSessionUser();
  if (session) redirect("/admin");

  return (
    <AuthCard
      title="Reset your password"
      description="Enter your staff email. If the account is eligible, we’ll send a secure reset link."
      footer={
        <Link
          href="/admin/login"
          className="font-bold text-[var(--color-teal-ink)] underline underline-offset-2"
        >
          Return to sign in
        </Link>
      }
    >
      <ResetRequestForm />
    </AuthCard>
  );
}
