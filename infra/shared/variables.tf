variable "alarm_email" {
  type        = string
  description = "Address subscribed to the alerts topic. No default: pass it with TF_VAR_alarm_email so no personal address is committed. AWS emails a confirmation link that must be clicked before any alert arrives."
  sensitive   = true

  validation {
    condition     = can(regex("^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$", var.alarm_email))
    error_message = "alarm_email must be an email address."
  }
}

variable "monthly_budget_usd" {
  type        = number
  description = "Monthly cost budget in USD, measured before credits. Alerts fire at 80% of actual spend and at 100% of forecast spend."
  default     = 200
}

variable "github_repository" {
  type        = string
  description = "GitHub repository (OWNER/NAME) whose Actions workflows may assume the OIDC roles."
  default     = "FDHS-Westchase-Gastroenterology/westchase-gi"
}

variable "staging_branch" {
  type        = string
  description = "Branch whose pushes deploy staging. The staging deploy role trusts only workflow runs on this branch."
  default     = "portal/appointment-workflow-experience"
}

variable "production_environment" {
  type        = string
  description = "GitHub environment whose jobs may assume the production deploy role. It must have a required reviewer and a deployment-branch policy before infra/shared is applied. Lower case, because the role compares the name case-sensitively."
  default     = "aws-production"

  validation {
    condition     = can(regex("^[a-z0-9-]+$", var.production_environment))
    error_message = "production_environment must be lower-case letters, digits and hyphens."
  }
}

variable "state_bucket_name" {
  type        = string
  description = "Terraform state bucket created by infra/bootstrap."
  default     = "westchase-gi-tfstate-use2"
}

variable "domain_name" {
  type        = string
  description = "Apex domain for the public hosted zone."
  default     = "westchasegi.com"
}

variable "vpc_cidr" {
  type        = string
  description = "VPC address range. Subnets are carved from it in network.tf."
  default     = "10.20.0.0/16"
}

variable "guardduty_alert_min_severity" {
  type        = number
  description = "Lowest GuardDuty finding severity sent to the alerts topic. 4 is Medium, 7 is High."
  default     = 4
}
