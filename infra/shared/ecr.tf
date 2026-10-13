# One image repository for the application. Every build is tagged with its
# commit SHA and tags never move, so a deployed task definition always names
# the exact image it was tested with. Production releases add a production-
# tag to the same image rather than pushing a new one.
resource "aws_ecr_repository" "app" {
  name                 = local.ecr_repository_name
  image_tag_mutability = "IMMUTABLE"

  image_scanning_configuration {
    scan_on_push = true
  }

  encryption_configuration {
    encryption_type = "KMS"
    kms_key         = module.kms["artifacts"].arn
  }

  lifecycle {
    prevent_destroy = true
  }
}

# Rules run in priority order and an image is handled by the first rule whose
# tag selection it matches.
#
# 1. Untagged images: the per-platform images and attestations inside a
#    multi-platform index are untagged. ECR does not expire an image an index
#    still references, so this only removes orphans.
# 2. Images carrying a production- tag: keep the last 30 releases for rollback.
# 3. Everything else (commit-SHA builds): keep the newest 200.
resource "aws_ecr_lifecycle_policy" "app" {
  repository = aws_ecr_repository.app.name

  policy = jsonencode({
    rules = [
      {
        rulePriority = 1
        description  = "Expire orphaned untagged images after 14 days"
        selection = {
          tagStatus   = "untagged"
          countType   = "sinceImagePushed"
          countUnit   = "days"
          countNumber = 14
        }
        action = { type = "expire" }
      },
      {
        rulePriority = 2
        description  = "Keep the last 30 production releases"
        selection = {
          tagStatus     = "tagged"
          tagPrefixList = ["production-"]
          countType     = "imageCountMoreThan"
          countNumber   = 30
        }
        action = { type = "expire" }
      },
      {
        rulePriority = 3
        description  = "Keep the newest 200 builds"
        selection = {
          tagStatus   = "any"
          countType   = "imageCountMoreThan"
          countNumber = 200
        }
        action = { type = "expire" }
      },
    ]
  })
}
