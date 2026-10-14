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

# No GitHub or task role may delete an image: ecr:BatchDeleteImage has no tag
# condition key, and a digest in the request removes every tag on it, a
# production release's included. Images leave through this policy instead.
#
# Rules run in priority order. An image that matches a rule's tag selection
# cannot be expired by a later rule, so the rules that keep images come first.
#
# 1. Untagged images: the per-platform images and attestations inside a
#    multi-platform index are untagged. ECR does not expire an image an index
#    still references, so this only removes orphans.
# 2. Images carrying a production- tag (production-<40 hex>-<run_id>): keep the
#    last 30 releases for rollback.
# 3. Images carrying a sha- tag (staging builds): keep the newest 200.
# 4. Images carrying a pr- tag (previews): expire 4 days after the push, just
#    over the 72-hour preview cap. An image that also carries a production- or
#    sha- tag matched rule 2 or 3 and stays.
# 5. Any other image (e2e- builds) expires once the repository holds 200 newer
#    images. Its selection is every image, so that count includes untagged
#    images and the ones rules 1 to 4 keep; it can expire only an image no
#    earlier rule matched.
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
        description  = "Keep the newest 200 staging builds"
        selection = {
          tagStatus     = "tagged"
          tagPrefixList = ["sha-"]
          countType     = "imageCountMoreThan"
          countNumber   = 200
        }
        action = { type = "expire" }
      },
      {
        rulePriority = 4
        description  = "Expire preview images 4 days after the push"
        selection = {
          tagStatus     = "tagged"
          tagPrefixList = ["pr-"]
          countType     = "sinceImagePushed"
          countUnit     = "days"
          countNumber   = 4
        }
        action = { type = "expire" }
      },
      {
        rulePriority = 5
        description  = "Expire other images past the newest 200 in the repository"
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
