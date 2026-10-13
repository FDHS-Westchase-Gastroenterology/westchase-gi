output "arn" {
  description = "Key ARN."
  value       = aws_kms_key.main.arn
}

output "key_id" {
  description = "Key ID."
  value       = aws_kms_key.main.key_id
}

output "alias_name" {
  description = "Alias name, including the alias/ prefix."
  value       = aws_kms_alias.main.name
}

output "alias_arn" {
  description = "Alias ARN."
  value       = aws_kms_alias.main.arn
}
