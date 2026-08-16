import Link from "next/link";

import { AuthCard } from "@/app/admin/auth-card";

import { ConfirmAuthForm } from "./confirm-form";

export default function ConfirmAuthPage() {
  return (
    <AuthCard
      title="Secure password setup"
      description="Recovery links open the new-password form directly. Invitation links are verified before setup."
      footer={
        <p>
          Link expired or already used?{" "}
          <Link
            href="/admin/forgot-password"
            className="font-bold text-[var(--color-teal-ink)] underline underline-offset-2"
          >
            Request a new link
          </Link>{" "}
          or ask your portal administrator for a new invitation.
        </p>
      }
    >
      <ConfirmAuthForm />
    </AuthCard>
  );
}
