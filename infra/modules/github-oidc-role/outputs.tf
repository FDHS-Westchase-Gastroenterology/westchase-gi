output "arn" {
  description = "Role ARN, for aws-actions/configure-aws-credentials role-to-assume."
  value       = aws_iam_role.main.arn
}

output "name" {
  description = "Role name."
  value       = aws_iam_role.main.name
}
