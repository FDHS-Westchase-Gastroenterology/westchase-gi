terraform {
  required_version = ">= 1.10"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 6.68"
    }
  }

  # This root creates the bucket and key named here, so its first apply runs on
  # a local backend and then migrates into the bucket. See infra/README.md.
  backend "s3" {
    bucket       = "westchase-gi-tfstate-use2"
    key          = "bootstrap/terraform.tfstate"
    region       = "us-east-2"
    encrypt      = true
    kms_key_id   = "alias/wgi-tfstate"
    use_lockfile = true
  }
}
