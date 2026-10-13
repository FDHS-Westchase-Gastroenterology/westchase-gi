output "state_bucket_name" {
  description = "Terraform state bucket, for backend blocks."
  value       = module.state_bucket.id
}

output "state_bucket_arn" {
  description = "Terraform state bucket ARN."
  value       = module.state_bucket.arn
}

output "state_key_arn" {
  description = "ARN of the key that encrypts Terraform state."
  value       = module.state_key.arn
}

output "state_key_alias" {
  description = "Alias of the state key, for backend kms_key_id."
  value       = module.state_key.alias_name
}
