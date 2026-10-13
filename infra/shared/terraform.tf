terraform {
  required_version = ">= 1.10"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 6.68"
    }
  }

  # Created by infra/bootstrap. Apply that root first; see infra/README.md.
  backend "s3" {
    bucket       = "westchase-gi-tfstate-use2"
    key          = "shared/terraform.tfstate"
    region       = "us-east-2"
    encrypt      = true
    kms_key_id   = "alias/wgi-tfstate"
    use_lockfile = true
  }
}
