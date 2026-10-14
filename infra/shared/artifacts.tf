# Run artifacts (hosting-pipeline-design §4.5, L331-335): each cut-over task
# writes its verify.json under cutover/<env>/<run_id>/, which the release
# packet copies, and the staging e2e task writes Playwright reports under
# e2e/staging/<run_id>/. One bucket serves both environments, so every prefix
# belongs to one environment and only that environment's roles may write under
# it: staging can never overwrite the verify.json production's packet copies.
#
# Object keys carry only the environment, the run ID, a timestamp or a hash,
# never patient data: the plan roles' wgi-terraform-read lists keys in every
# bucket.

locals {
  artifacts_bucket_name = "wgi-artifacts"
  artifacts_bucket_arn  = "arn:${local.partition}:s3:::${local.artifacts_bucket_name}"

  # Each prefix and the environment whose roles alone write under it. The
  # environment boundaries grant the same prefixes (boundaries.tf).
  artifact_prefixes = {
    CutoverStaging    = { prefix = "cutover/staging", env = "staging" }
    CutoverProduction = { prefix = "cutover/production", env = "production" }
    E2eStaging        = { prefix = "e2e/staging", env = "staging" }
  }
}

# Denies only. A resource policy that allowed a role session directly would
# reach past the role's permissions boundary, so the grants stay on the roles
# and this policy only refuses.
data "aws_iam_policy_document" "artifacts_bucket" {
  # An environment's roles are named wgi-<env>-* (README "Naming contract"),
  # and a deploy role can create only its own environment's names. Anyone
  # else, an administrator included, is refused under the prefix.
  dynamic "statement" {
    for_each = local.artifact_prefixes

    content {
      sid       = "OnlyOwnEnvironmentWrites${statement.key}"
      effect    = "Deny"
      actions   = ["s3:PutObject"]
      resources = ["${local.artifacts_bucket_arn}/${statement.value.prefix}/*"]

      principals {
        type        = "*"
        identifiers = ["*"]
      }

      condition {
        test     = "ArnNotLike"
        variable = "aws:PrincipalArn"
        values   = ["arn:${local.partition}:iam::${local.account_id}:role/wgi-${statement.value.env}-*"]
      }
    }
  }

  statement {
    sid           = "DenyWritesOutsidePrefixes"
    effect        = "Deny"
    actions       = ["s3:PutObject"]
    not_resources = [for p in values(local.artifact_prefixes) : "${local.artifacts_bucket_arn}/${p.prefix}/*"]

    principals {
      type        = "*"
      identifiers = ["*"]
    }
  }
}

module "artifacts_bucket" {
  source = "../modules/s3-bucket"

  name             = local.artifacts_bucket_name
  kms_key_arn      = module.kms["artifacts"].arn
  policy_documents = [data.aws_iam_policy_document.artifacts_bucket.json]
}

# The packet copies what it needs when it is made, so nothing is kept past 14
# days. Versioning is on for every bucket here; a version that is overwritten
# or expires goes a day later.
resource "aws_s3_bucket_lifecycle_configuration" "artifacts" {
  bucket = module.artifacts_bucket.id

  rule {
    id     = "expire-after-14-days"
    status = "Enabled"

    filter {}

    expiration {
      days = 14
    }

    noncurrent_version_expiration {
      noncurrent_days = 1
    }

    abort_incomplete_multipart_upload {
      days_after_initiation = 1
    }
  }

  rule {
    id     = "remove-expired-delete-markers"
    status = "Enabled"

    filter {}

    expiration {
      expired_object_delete_marker = true
    }
  }
}
