data "aws_caller_identity" "current" {}

data "aws_partition" "current" {}

locals {
  role_arn_prefix             = "arn:${data.aws_partition.current.partition}:iam::${data.aws_caller_identity.current.account_id}:role"
  production_state_writer_arn = "${local.role_arn_prefix}/${var.production_state_writer_role_name}"
  production_plan_arn         = "${local.role_arn_prefix}/${var.production_plan_role_name}"
  breakglass_arn              = "${local.role_arn_prefix}/${var.breakglass_role_name}"
  state_bucket_arn            = "arn:${data.aws_partition.current.partition}:s3:::${var.state_bucket_name}"
}

module "state_key" {
  source = "../modules/kms-key"

  name         = "wgi-tfstate"
  description  = "Encrypts Terraform state for westchase-gi"
  via_services = ["s3.${local.region}.amazonaws.com"]
}

# Production state is changed only through the production deploy role, which
# only a GitHub Actions job in the protected aws-production environment can
# assume. It is read by that role, the production plan role (a trunk job in the
# aws-production-plan environment, planning with -lock=false) and the
# break-glass role. Saved production plans under production-plans/ are written
# only by the plan role and read only by the plan and deploy roles; they hold
# cleartext values, so a lifecycle rule below expires them. Every other
# principal, the account root, administrators, agents and any S3 replication
# role included, is denied. Editing these statements is the break-glass path
# (infra/README.md, "Break glass"); infra/shared alarms on every change to this
# bucket's policy, lifecycle, replication, versioning, public access block, ACL
# or CORS configuration (protected-bucket-policy-changed) and to the three roles
# (production-deploy-role-changed).
data "aws_iam_policy_document" "state_bucket" {
  statement {
    sid    = "DenyProductionStateReadsExceptProductionRoles"
    effect = "Deny"
    actions = [
      "s3:GetObject",
      "s3:GetObjectVersion",
      "s3:GetObjectVersionForReplication",
    ]
    resources = ["${local.state_bucket_arn}/production/*"]

    principals {
      type        = "*"
      identifiers = ["*"]
    }

    condition {
      test     = "ArnNotEquals"
      variable = "aws:PrincipalArn"
      values   = [local.production_state_writer_arn, local.production_plan_arn, local.breakglass_arn]
    }
  }

  statement {
    sid    = "DenyProductionStateWritesExceptProductionDeployRole"
    effect = "Deny"
    actions = [
      "s3:DeleteObject",
      "s3:DeleteObjectVersion",
      "s3:PutObject",
      "s3:ReplicateDelete",
      "s3:ReplicateObject",
      "s3:ReplicateTags",
    ]
    resources = ["${local.state_bucket_arn}/production/*"]

    principals {
      type        = "*"
      identifiers = ["*"]
    }

    condition {
      test     = "ArnNotEquals"
      variable = "aws:PrincipalArn"
      values   = [local.production_state_writer_arn]
    }
  }

  statement {
    sid    = "DenyProductionPlanReadsExceptPlanAndDeployRoles"
    effect = "Deny"
    actions = [
      "s3:GetObject",
      "s3:GetObjectVersion",
      "s3:GetObjectVersionForReplication",
    ]
    resources = ["${local.state_bucket_arn}/production-plans/*"]

    principals {
      type        = "*"
      identifiers = ["*"]
    }

    condition {
      test     = "ArnNotEquals"
      variable = "aws:PrincipalArn"
      values   = [local.production_state_writer_arn, local.production_plan_arn]
    }
  }

  statement {
    sid    = "DenyProductionPlanWritesExceptPlanRole"
    effect = "Deny"
    actions = [
      "s3:DeleteObject",
      "s3:DeleteObjectVersion",
      "s3:PutObject",
      "s3:ReplicateDelete",
      "s3:ReplicateObject",
      "s3:ReplicateTags",
    ]
    resources = ["${local.state_bucket_arn}/production-plans/*"]

    principals {
      type        = "*"
      identifiers = ["*"]
    }

    condition {
      test     = "ArnNotEquals"
      variable = "aws:PrincipalArn"
      values   = [local.production_plan_arn]
    }
  }
}

module "state_bucket" {
  source = "../modules/s3-bucket"

  name             = var.state_bucket_name
  kms_key_arn      = module.state_key.arn
  policy_documents = [data.aws_iam_policy_document.state_bucket.json]
}

resource "aws_s3_bucket_lifecycle_configuration" "state" {
  bucket = module.state_bucket.id

  rule {
    id     = "expire-old-state-versions"
    status = "Enabled"

    filter {}

    noncurrent_version_expiration {
      noncurrent_days           = 90
      newer_noncurrent_versions = 30
    }

    expiration {
      expired_object_delete_marker = true
    }

    abort_incomplete_multipart_upload {
      days_after_initiation = 7
    }
  }

  # A saved plan is needed only between the plan job and the apply job that
  # verifies its digest; it holds cleartext values, so no copy outlives a week.
  rule {
    id     = "expire-production-plans"
    status = "Enabled"

    filter {
      prefix = "production-plans/"
    }

    expiration {
      days = 7
    }

    noncurrent_version_expiration {
      noncurrent_days = 7
    }

    abort_incomplete_multipart_upload {
      days_after_initiation = 1
    }
  }
}
