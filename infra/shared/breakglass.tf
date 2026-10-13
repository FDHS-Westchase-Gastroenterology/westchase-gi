# Emergency access to production for the failures in infra/README.md, "Break
# glass": a lost deploy role, a key policy missing an administrator, a key
# pending deletion, GitHub unavailable. Only the management account can assume
# it, and only with MFA. The management account ID comes from the Organization,
# so no account ID is written here.
#
# The role has no IAM policy. The state bucket exempts it from the production
# state read deny, and every production key policy must name it as a second
# administrator, so an emergency attaches only the permission it needs. Both
# that attachment and every attempt to assume the role alarm
# (production-deploy-role-changed, breakglass-production-assumed).
data "aws_organizations_organization" "this" {}

data "aws_iam_policy_document" "breakglass_trust" {
  statement {
    sid     = "ManagementAccountWithMfa"
    actions = ["sts:AssumeRole"]

    principals {
      type        = "AWS"
      identifiers = ["arn:${local.partition}:iam::${data.aws_organizations_organization.this.master_account_id}:root"]
    }

    condition {
      test     = "Bool"
      variable = "aws:MultiFactorAuthPresent"
      values   = ["true"]
    }
  }
}

resource "aws_iam_role" "breakglass_production" {
  name                 = "wgi-breakglass-production"
  description          = "Emergency production access from the management account with MFA; no policy of its own"
  assume_role_policy   = data.aws_iam_policy_document.breakglass_trust.json
  max_session_duration = 3600
  tags                 = { env = "production" }

  lifecycle {
    prevent_destroy = true
  }
}
