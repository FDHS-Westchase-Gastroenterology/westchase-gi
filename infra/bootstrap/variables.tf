variable "state_bucket_name" {
  type        = string
  description = "Name of the Terraform state bucket. Every root's backend block names it, so changing it means editing those blocks too."
  default     = "westchase-gi-tfstate-use2"
}

variable "production_state_writer_role_name" {
  type        = string
  description = "The only IAM role allowed to read, write or delete objects under production/ in the state bucket: the GitHub Actions production deploy role created by infra/shared."
  default     = "wgi-github-deploy-production"
}

variable "production_plan_role_name" {
  type        = string
  description = "The GitHub Actions production plan role created by infra/shared: reads production/ state and is the only writer of saved plans under production-plans/."
  default     = "wgi-github-plan-production"
}

variable "breakglass_role_name" {
  type        = string
  description = "The production break-glass role created by infra/shared: the one role besides the deploy and plan roles that may read production/ state."
  default     = "wgi-breakglass-production"
}
