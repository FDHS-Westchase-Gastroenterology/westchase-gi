# One provider for both Regions: resources that also exist in us-east-1 set the
# provider's per-resource region argument.
provider "aws" {
  region = local.region

  # env tells production resources apart by machine: the account guardrails
  # key on env = production. Everything here serves every environment, so the
  # default is shared; the keys and deploy roles that belong to one
  # environment override it.
  default_tags {
    tags = {
      Project       = "westchase-gi"
      Repository    = var.github_repository
      ManagedBy     = "terraform"
      TerraformRoot = "infra/shared"
      env           = "shared"
    }
  }
}
