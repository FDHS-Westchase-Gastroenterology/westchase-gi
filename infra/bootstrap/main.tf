data "aws_caller_identity" "current" {}

data "aws_partition" "current" {}

locals {
  production_state_writer_arn = "arn:${data.aws_partition.current.partition}:iam::${data.aws_caller_identity.current.account_id}:role/${var.production_state_writer_role_name}"
}

module "state_key" {
  source = "../modules/kms-key"

  name         = "wgi-tfstate"
  description  = "Encrypts Terraform state for westchase-gi"
  via_services = ["s3.${local.region}.amazonaws.com"]
}

# Production state is read and changed only through the production deploy role,
# which only a GitHub Actions job in the protected production environment can
# assume. Every other principal, the account root, administrators and agents
# included, can neither read production state nor write, lock or delete it.
# Editing these statements is the break-glass path (infra/README.md, "Break
# glass"); infra/shared alarms on every change to this bucket policy
# (protected-bucket-policy-changed).
data "aws_iam_policy_document" "state_bucket" {
  statement {
    sid    = "DenyProductionStateReadsExceptProductionDeployRole"
    effect = "Deny"
    actions = [
      "s3:GetObject",
      "s3:GetObjectVersion",
    ]
    resources = ["arn:${data.aws_partition.current.partition}:s3:::${var.state_bucket_name}/production/*"]

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
    sid    = "DenyProductionStateWritesExceptProductionDeployRole"
    effect = "Deny"
    actions = [
      "s3:DeleteObject",
      "s3:DeleteObjectVersion",
      "s3:PutObject",
    ]
    resources = ["arn:${data.aws_partition.current.partition}:s3:::${var.state_bucket_name}/production/*"]

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
}
