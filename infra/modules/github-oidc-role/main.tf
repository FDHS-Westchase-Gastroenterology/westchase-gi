# A role that GitHub Actions assumes with the job's OIDC token. The trust
# policy matches the token's audience and its exact subject; no wildcards, so a
# role meant for one branch or environment cannot be assumed from another.

data "aws_iam_policy_document" "trust" {
  statement {
    sid     = "GitHubActionsOidc"
    actions = ["sts:AssumeRoleWithWebIdentity"]

    principals {
      type        = "Federated"
      identifiers = [var.oidc_provider_arn]
    }

    condition {
      test     = "StringEquals"
      variable = "token.actions.githubusercontent.com:aud"
      values   = ["sts.amazonaws.com"]
    }

    condition {
      test     = "StringEquals"
      variable = "token.actions.githubusercontent.com:sub"
      values   = var.subjects
    }
  }
}

resource "aws_iam_role" "main" {
  name                 = var.name
  description          = var.description
  assume_role_policy   = data.aws_iam_policy_document.trust.json
  max_session_duration = 3600
  tags                 = var.tags
}

resource "aws_iam_role_policy" "main" {
  name   = var.name
  role   = aws_iam_role.main.id
  policy = var.policy_json
}

resource "aws_iam_role_policy_attachment" "main" {
  for_each = var.managed_policy_arns

  role       = aws_iam_role.main.name
  policy_arn = each.value
}
