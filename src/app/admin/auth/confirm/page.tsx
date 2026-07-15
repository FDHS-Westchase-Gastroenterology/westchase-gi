import Link from "next/link";
import { AuthCard } from "@/app/admin/auth-card";
import { ConfirmAuthForm } from "./confirm-form";

export default function ConfirmAuthPage() {
  return (
    <AuthCard
      title="Secure password setup"
      description="Continue to verify this one-time link before choosing your password."
      footer={
        <p>
          Link expired?{" "}
          <Link
            href="/admin/forgot-password"
            className="font-bold text-[var(--color-teal-ink)] underline underline-offset-2"
          >
            Request a reset
          </Link>{" "}
          or ask your portal administrator for a new invitation.
        </p>
      }
    >
      <ConfirmAuthForm />
    </AuthCard>
  );
}
