import { redirect } from "next/navigation";
import { AuthCard } from "@/app/admin/auth-card";
import {
  getVerifiedStaffAuthState,
  readPasswordAuthFlow,
} from "@/lib/portal/auth";
import { PasswordForm } from "./password-form";

export default async function SetPasswordPage() {
  const staff = await getVerifiedStaffAuthState();
  if (!staff?.active) redirect("/admin/login?auth=invalid");

  const flow = await readPasswordAuthFlow(staff.id);
  const expectedFlow = staff.onboardedAt ? "recovery" : "invite";
  if (!flow || flow !== expectedFlow) {
    redirect("/admin/login?auth=invalid");
  }

  return (
    <AuthCard
      title={
        flow === "invite" ? "Create your password" : "Choose a new password"
      }
      description="Use at least 12 characters. This one-time setup expires shortly."
    >
      <PasswordForm />
    </AuthCard>
  );
}
