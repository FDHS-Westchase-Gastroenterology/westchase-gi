# Every environment shares one account, so a grant that names a pattern such
# as rds!db-* or userpool/* reaches the other environment too (hosting-
# pipeline-design §5.1). The environment roots create their database, user
# pool and e2e capture table after this root, so this root finds each one by
# its exact name and the boundaries name it by its exact ARN.
#
# Before an environment root has created a resource, its lookup is empty and
# the statement that would name it is left out: the boundary then allows
# nothing on it. After each environment root's apply that creates one of these
# resources, plan and apply this root again (infra/README.md, "Environment
# boundary").

locals {
  environment_names = toset(["staging", "production"])
}

# aws_db_instance fails when the instance does not exist, so the plural lookup
# runs first. RDS identifiers are unique, so it finds one instance or none.
data "aws_db_instances" "environment" {
  for_each = local.environment_names

  filter {
    name   = "db-instance-id"
    values = ["wgi-${each.key}-db"]
  }
}

data "aws_db_instance" "environment" {
  for_each = {
    for env, found in data.aws_db_instances.environment :
    env => one(found.instance_identifiers) if length(found.instance_identifiers) > 0
  }

  db_instance_identifier = each.value
}

# Pool names are not unique; one() fails the plan if two pools share a name,
# rather than letting the boundary name either.
data "aws_cognito_user_pools" "environment" {
  for_each = local.environment_names

  name = "wgi-${each.key}-staff"
}

data "aws_cognito_user_pool" "environment" {
  for_each = {
    for env, found in data.aws_cognito_user_pools.environment :
    env => one(found.ids) if length(found.ids) > 0
  }

  user_pool_id = each.value
}

# The table list is null, not empty, when the account has no tables.
data "aws_dynamodb_tables" "all" {}

data "aws_dynamodb_table" "e2e_mail" {
  count = contains(coalesce(data.aws_dynamodb_tables.all.names, []), "wgi-staging-e2e-mail") ? 1 : 0

  name = "wgi-staging-e2e-mail"
}

locals {
  key_arn_prefix = "arn:${local.partition}:kms:${local.region}:${local.account_id}:key/"

  # Key identifiers each environment's resources report. RDS, Cognito and
  # DynamoDB return key ARNs; a bare key ID would still be made into one.
  discovered_key_ids = {
    for env in local.environment_names : env => {
      data    = compact([try(data.aws_db_instance.environment[env].kms_key_id, "")])
      secrets = compact([for s in try(data.aws_db_instance.environment[env].master_user_secret, []) : s.kms_key_id])
      sender  = compact([for c in try(data.aws_cognito_user_pool.environment[env].lambda_config, []) : c.kms_key_id])
      capture = env == "staging" ? compact([for t in data.aws_dynamodb_table.e2e_mail : try(t.server_side_encryption[0].kms_key_arn, "")]) : []
    }
  }

  discovered_key_arns = {
    for env, kinds in local.discovered_key_ids : env => {
      for kind, ids in kinds : kind => [
        for id in ids : startswith(id, "arn:") ? id : "${local.key_arn_prefix}${id}"
      ]
    }
  }

  # Exact ARNs per environment. The staging data and secrets keys are made in
  # this root (kms.tf); production's are made by the production root.
  environment_resources = {
    for env in local.environment_names : env => {
      master_secret_arns = [for s in try(data.aws_db_instance.environment[env].master_user_secret, []) : s.secret_arn]
      db_resource_ids    = compact([try(data.aws_db_instance.environment[env].resource_id, "")])
      user_pool_arns     = compact([try(data.aws_cognito_user_pool.environment[env].arn, "")])
      capture_key_arns   = local.discovered_key_arns[env].capture
      key_arns = distinct(concat(
        [for k, v in local.keys : module.kms[k].arn if v.env == env],
        flatten(values(local.discovered_key_arns[env])),
      ))
    }
  }
}
