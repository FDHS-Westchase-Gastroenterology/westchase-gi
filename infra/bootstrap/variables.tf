variable "state_bucket_name" {
  type        = string
  description = "Name of the Terraform state bucket. Every root's backend block names it, so changing it means editing those blocks too."
  default     = "westchase-gi-tfstate-use2"
}

variable "production_state_writer_role_name" {
  type        = string
  description = "The only IAM role allowed to write or delete objects under production/ in the state bucket: the GitHub Actions production deploy role created by infra/shared."
  default     = "wgi-github-deploy-production"
}
