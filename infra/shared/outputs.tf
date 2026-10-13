# Values the environment roots read through terraform_remote_state, or that a
# person copies into GitHub settings. alarm_email is deliberately not output.

output "vpc_id" {
  description = "Shared VPC."
  value       = aws_vpc.main.id
}

output "vpc_cidr" {
  description = "Shared VPC CIDR block."
  value       = aws_vpc.main.cidr_block
}

output "subnet_ids" {
  description = "Subnet IDs by tier (public, app, db), each a list ordered by Availability Zone."
  value = {
    for tier, by_az in local.subnets : tier => [for az in sort(keys(by_az)) : aws_subnet.main["${tier}-${az}"].id]
  }
}

output "route_table_ids" {
  description = "Route table IDs by tier."
  value = {
    public = aws_route_table.public.id
    app    = aws_route_table.app.id
    db     = aws_route_table.db.id
  }
}

output "vpc_endpoint_ids" {
  description = "VPC endpoint IDs by service (s3, ecr.api, ecr.dkr, secretsmanager, kms, logs), for aws:SourceVpce conditions."
  value = merge(
    { s3 = aws_vpc_endpoint.s3.id },
    { for svc, endpoint in aws_vpc_endpoint.interface : svc => endpoint.id },
  )
}

output "kms_key_arns" {
  description = "CMK ARNs by purpose."
  value       = { for k, m in module.kms : k => m.arn }
}

output "kms_key_aliases" {
  description = "CMK aliases by purpose."
  value       = { for k, m in module.kms : k => m.alias_name }
}

output "alerts_topic_arn" {
  description = "SNS topic for alarms and security findings."
  value       = aws_sns_topic.alerts.arn
}

output "audit_bucket" {
  description = "Bucket holding CloudTrail, Config and VPC flow-log records."
  value       = module.audit_bucket.id
}

output "state_bucket" {
  description = "Terraform state bucket (created by infra/bootstrap)."
  value       = var.state_bucket_name
}

output "ecr_repository_url" {
  description = "Application image repository."
  value       = aws_ecr_repository.app.repository_url
}

output "github_role_arns" {
  description = "Roles for aws-actions/configure-aws-credentials, by purpose."
  value = {
    plan              = module.github_plan.arn
    deploy_staging    = module.github_deploy_staging.arn
    deploy_production = module.github_deploy_production.arn
  }
}

output "terraform_read_policy_arn" {
  description = "Managed policy with the metadata reads Terraform plans need; environment roots attach their own additions beside it."
  value       = aws_iam_policy.terraform_read.arn
}

output "route53_zone_id" {
  description = "Public hosted zone ID."
  value       = aws_route53_zone.public.zone_id
}

output "route53_name_servers" {
  description = "Nameservers to set at the registrar once the zone holds every live record."
  value       = aws_route53_zone.public.name_servers
}
