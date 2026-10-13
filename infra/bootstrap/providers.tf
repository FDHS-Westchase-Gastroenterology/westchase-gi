provider "aws" {
  region = local.region

  default_tags {
    tags = {
      Project       = "westchase-gi"
      Repository    = "FDHS-Westchase-Gastroenterology/westchase-gi"
      ManagedBy     = "terraform"
      TerraformRoot = "infra/bootstrap"
      env           = "shared"
    }
  }
}
