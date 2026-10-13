output "id" {
  description = "Bucket name."
  value       = aws_s3_bucket.main.id
}

output "arn" {
  description = "Bucket ARN."
  value       = aws_s3_bucket.main.arn
}

output "policy_id" {
  description = "ID of the bucket policy resource, for callers that must wait until the policy is in place."
  value       = aws_s3_bucket_policy.main.id
}
