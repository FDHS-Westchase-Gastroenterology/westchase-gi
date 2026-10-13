data "aws_caller_identity" "current" {}

data "aws_partition" "current" {}

# The account statement keeps the key manageable through IAM (AWS's default key
# policy). The deny statement then limits cryptographic use by this account's
# IAM principals to requests that arrive through the listed services, so no
# role here can decrypt data with this key by calling KMS directly.
#
# The deny is scoped to this account's principals on purpose. AWS services use
# grants whose grantees live in AWS-owned accounts (an RDS host role, for
# example), and those calls carry no kms:ViaService. The RDS guide warns that a
# key-policy deny on all principals breaks them. AWS service principals named
# in var.policy_documents (CloudTrail, CloudWatch Logs, AWS Config and others)
# call KMS as themselves and are scoped by their own statements instead.
data "aws_iam_policy_document" "key" {
  # In a key policy, Resource "*" means this key and nothing else.
  # checkov:skip=CKV_AWS_109: key policy; "*" is the key itself
  # checkov:skip=CKV_AWS_111: key policy; "*" is the key itself
  # checkov:skip=CKV_AWS_356: key policy; "*" is the key itself
  source_policy_documents = var.policy_documents

  statement {
    sid       = "EnableIamPolicies"
    actions   = ["kms:*"]
    resources = ["*"]

    principals {
      type        = "AWS"
      identifiers = ["arn:${data.aws_partition.current.partition}:iam::${data.aws_caller_identity.current.account_id}:root"]
    }
  }

  statement {
    sid    = "DenyCryptoOutsideIntendedServices"
    effect = "Deny"
    actions = [
      "kms:CreateGrant",
      "kms:Decrypt",
      "kms:Encrypt",
      "kms:GenerateDataKey*",
      "kms:ReEncrypt*",
    ]
    resources = ["*"]

    principals {
      type        = "AWS"
      identifiers = ["*"]
    }

    condition {
      test     = "StringNotEquals"
      variable = "kms:ViaService"
      values   = var.via_services
    }

    condition {
      test     = "StringEquals"
      variable = "aws:PrincipalAccount"
      values   = [data.aws_caller_identity.current.account_id]
    }

    condition {
      test     = "Bool"
      variable = "aws:PrincipalIsAWSService"
      values   = ["false"]
    }
  }
}

resource "aws_kms_key" "main" {
  description             = var.description
  enable_key_rotation     = true
  rotation_period_in_days = 365
  deletion_window_in_days = var.deletion_window_in_days
  policy                  = data.aws_iam_policy_document.key.json
  tags                    = var.tags

  lifecycle {
    prevent_destroy = true
  }
}

resource "aws_kms_alias" "main" {
  name          = "alias/${var.name}"
  target_key_id = aws_kms_key.main.key_id
}
