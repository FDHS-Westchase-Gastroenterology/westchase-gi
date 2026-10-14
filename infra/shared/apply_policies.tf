# What an environment root's apply may create, change and delete, attached to
# that environment's deploy role (hosting-pipeline-design §4.4, L306-322). The
# deploy policy in github_oidc.tf already covers images, task definitions,
# one-off tasks, service rollouts and the environment's IAM roles; these add
# the services the staging, preview and production roots manage.
#
# Every environment shares one account, so each Allow names its own
# environment's resources by pattern (wgi-<env>-*, wgi/<env>/*, /wgi/<env>/*,
# aws-waf-logs-wgi-<env>*) and env-boundary.mjs checks every statement against
# §5.1 on each plan. The env tag is the second layer: a create must write
# env=<env> (aws:RequestTag), a change must find it (aws:ResourceTag), and no
# tag call may change it. Resources whose ARN carries no name (security groups,
# certificates) are reached only through that tag, in the forms §5.1's
# carve-out accepts. Actions that accept only "*" are the script's listed
# exceptions.
#
# Each environment's grants are split across managed policies (balancer, edge,
# monitoring) to stay under the 6,144-character limit on one policy. No policy
# grants a KMS cryptographic action, a secret's value, a key policy change, key
# deletion or image deletion.

locals {
  service_arn = {
    for service in [
      "acm", "cloudwatch", "cognito-idp", "dynamodb", "ec2", "elasticloadbalancing", "events",
      "kms", "lambda", "logs", "rds", "scheduler", "secretsmanager", "ssm", "wafv2",
    ] : service => "arn:${local.partition}:${service}:${local.region}:${local.account_id}"
  }

  # An ACM DNS validation record is _<32 hex characters> under the name.
  acm_validation_label = "_${join("", [for _ in range(32) : "?"])}"

  apply_environment = {
    staging = {
      domains        = ["staging.${var.domain_name}", "*.staging.${var.domain_name}"]
      record_types   = ["A", "AAAA", "CNAME", "MX", "TXT"]
      grant_services = ["dynamodb.${local.region}.amazonaws.com", "rds.${local.region}.amazonaws.com"]
    }
    # Only the cut-over writes the apex and www records, and their
    # certificate's validation records. Every other name in the zone belongs
    # to the shared root (mail) or to staging.
    production = {
      domains      = [var.domain_name, "www.${var.domain_name}"]
      record_types = ["A", "AAAA", "CNAME"]
      validation = [
        "${local.acm_validation_label}.${var.domain_name}",
        "${local.acm_validation_label}.www.${var.domain_name}",
      ]
      grant_services = ["rds.${local.region}.amazonaws.com"]
    }
  }

  # Condition blocks by intent, for each environment.
  when = {
    for env in local.environment_names : env => {
      create = { StringEquals = { "aws:RequestTag/env" = env } }
      manage = { StringEquals = { "aws:ResourceTag/env" = env } }
      # Put* actions both create and update; a key the request lacks passes.
      upsert = { StringEqualsIfExists = { "aws:RequestTag/env" = env, "aws:ResourceTag/env" = env } }
      # The tag call a create makes: the new tag is the environment, and an
      # existing resource already carries it.
      tag_on_create = {
        StringEquals         = { "aws:RequestTag/env" = env }
        StringEqualsIfExists = { "aws:ResourceTag/env" = env }
      }
      both = { StringEquals = { "aws:RequestTag/env" = env, "aws:ResourceTag/env" = env } }
      # Other tags change on the environment's own resources; env never does.
      retag = {
        StringEquals                             = { "aws:ResourceTag/env" = env }
        "ForAllValues:StringNotEqualsIgnoreCase" = { "aws:TagKeys" = ["env"] }
      }
    }
  }

  apply_resources = {
    for env in local.environment_names : env => {
      load_balancer = [
        "${local.service_arn.elasticloadbalancing}:loadbalancer/app/wgi-${env}/*",
        "${local.service_arn.elasticloadbalancing}:listener/app/wgi-${env}/*",
        "${local.service_arn.elasticloadbalancing}:listener-rule/app/wgi-${env}/*",
        "${local.service_arn.elasticloadbalancing}:targetgroup/wgi-${env}-*/*",
      ]
      web_acl        = "${local.service_arn.wafv2}:regional/webacl/wgi-${env}/*"
      certificate    = "${local.service_arn.acm}:certificate/*"
      security_group = "${local.service_arn.ec2}:security-group/*"
      cluster        = "${local.ecs_arn_prefix}:cluster/wgi-${env}"
      service        = "${local.ecs_arn_prefix}:service/wgi-${env}/*"
      function       = "${local.service_arn.lambda}:function:wgi-${env}-*"
      rule           = "${local.service_arn.events}:rule/wgi-${env}-*"
      alarm          = "${local.service_arn.cloudwatch}:alarm:wgi-${env}-*"
      log_groups = [
        "${local.service_arn.logs}:log-group:/wgi/${env}/*",
        "${local.service_arn.logs}:log-group:aws-waf-logs-wgi-${env}*",
        "${local.service_arn.logs}:log-group:/aws/rds/instance/wgi-${env}-*",
        "${local.service_arn.logs}:log-group:/aws/lambda/wgi-${env}-*",
      ]
      database = [
        "${local.service_arn.rds}:db:wgi-${env}-*",
        "${local.service_arn.rds}:pg:wgi-${env}-*",
        "${local.service_arn.rds}:subgrp:wgi-${env}-*",
      ]
      key       = "${local.service_arn.kms}:key/*"
      user_pool = "${local.service_arn.cognito-idp}:userpool/*"
      secret    = "${local.service_arn.secretsmanager}:secret:wgi/${env}/*"
      role      = "arn:${local.partition}:iam::${local.account_id}:role/wgi-${env}"
    }
  }

  # The load balancer and its firewall.
  apply_balancer = {
    for env in local.environment_names : env => jsonencode({
      Version = "2012-10-17"
      Statement = [
        {
          Sid       = "CreateLoadBalancing"
          Effect    = "Allow"
          Action    = [for a in ["CreateListener", "CreateLoadBalancer", "CreateRule", "CreateTargetGroup"] : "elasticloadbalancing:${a}"]
          Resource  = local.apply_resources[env].load_balancer
          Condition = local.when[env].create
        },
        {
          Sid      = "TagLoadBalancingOnCreate"
          Effect   = "Allow"
          Action   = "elasticloadbalancing:AddTags"
          Resource = local.apply_resources[env].load_balancer
          Condition = { StringEquals = {
            "aws:RequestTag/env"                = env
            "elasticloadbalancing:CreateAction" = ["CreateListener", "CreateLoadBalancer", "CreateRule", "CreateTargetGroup"]
          } }
        },
        {
          Sid    = "ManageLoadBalancing"
          Effect = "Allow"
          Action = [for a in [
            "AddListenerCertificates", "DeleteListener", "DeleteLoadBalancer", "DeleteRule",
            "DeleteTargetGroup", "DeregisterTargets", "ModifyListener", "ModifyListenerAttributes",
            "ModifyLoadBalancerAttributes", "ModifyRule", "ModifyTargetGroup",
            "ModifyTargetGroupAttributes", "RegisterTargets", "RemoveListenerCertificates",
            "SetIpAddressType", "SetRulePriorities", "SetSecurityGroups", "SetSubnets",
          ] : "elasticloadbalancing:${a}"]
          Resource  = local.apply_resources[env].load_balancer
          Condition = local.when[env].manage
        },
        {
          Sid       = "RetagLoadBalancing"
          Effect    = "Allow"
          Action    = ["elasticloadbalancing:AddTags", "elasticloadbalancing:RemoveTags"]
          Resource  = local.apply_resources[env].load_balancer
          Condition = local.when[env].retag
        },
        {
          Sid       = "CreateWebAcl"
          Effect    = "Allow"
          Action    = "wafv2:CreateWebACL"
          Resource  = local.apply_resources[env].web_acl
          Condition = local.when[env].create
        },
        {
          Sid       = "ManageWebAcl"
          Effect    = "Allow"
          Action    = ["wafv2:DeleteLoggingConfiguration", "wafv2:DeleteWebACL", "wafv2:PutLoggingConfiguration", "wafv2:UpdateWebACL"]
          Resource  = local.apply_resources[env].web_acl
          Condition = local.when[env].manage
        },
        {
          Sid       = "TagWebAclOnCreate"
          Effect    = "Allow"
          Action    = "wafv2:TagResource"
          Resource  = local.apply_resources[env].web_acl
          Condition = local.when[env].tag_on_create
        },
        {
          Sid       = "RetagWebAcl"
          Effect    = "Allow"
          Action    = ["wafv2:TagResource", "wafv2:UntagResource"]
          Resource  = local.apply_resources[env].web_acl
          Condition = local.when[env].retag
        },
        {
          Sid      = "AssociateWebAcl"
          Effect   = "Allow"
          Action   = ["wafv2:AssociateWebACL", "wafv2:DisassociateWebACL"]
          Resource = [local.apply_resources[env].web_acl, local.apply_resources[env].load_balancer[0]]
        },
        # Each accepts only "*" (list_elbv2.html, list_logs.html).
        {
          Sid      = "OnlyStar"
          Effect   = "Allow"
          Action   = ["elasticloadbalancing:SetWebAcl", "logs:CreateLogDelivery", "logs:DeleteLogDelivery"]
          Resource = "*"
        },
      ]
    })
  }

  # Certificates, DNS records and security groups.
  apply_edge = {
    for env in local.environment_names : env => jsonencode({
      Version = "2012-10-17"
      Statement = concat([
        {
          Sid      = "RequestCertificate"
          Effect   = "Allow"
          Action   = "acm:RequestCertificate"
          Resource = "*"
          Condition = {
            StringEquals                = { "aws:RequestTag/env" = env }
            "ForAllValues:StringEquals" = { "acm:DomainNames" = local.apply_environment[env].domains }
            Null                        = { "acm:DomainNames" = "false" }
          }
        },
        {
          Sid       = "TagCertificate"
          Effect    = "Allow"
          Action    = "acm:AddTagsToCertificate"
          Resource  = local.apply_resources[env].certificate
          Condition = local.when[env].both
        },
        {
          Sid       = "ManageCertificate"
          Effect    = "Allow"
          Action    = ["acm:DeleteCertificate", "acm:UpdateCertificateOptions"]
          Resource  = local.apply_resources[env].certificate
          Condition = local.when[env].manage
        },
        {
          Sid       = "RetagCertificate"
          Effect    = "Allow"
          Action    = ["acm:AddTagsToCertificate", "acm:RemoveTagsFromCertificate"]
          Resource  = local.apply_resources[env].certificate
          Condition = local.when[env].retag
        },
        # Normalized names are lower case without the trailing dot
        # (Route53/latest/DeveloperGuide/specifying-rrset-conditions.html).
        {
          Sid      = "ChangeRecords"
          Effect   = "Allow"
          Action   = "route53:ChangeResourceRecordSets"
          Resource = aws_route53_zone.public.arn
          Condition = {
            "ForAllValues:StringLike" = {
              "route53:ChangeResourceRecordSetsNormalizedRecordNames" = env == "staging" ? local.apply_environment.staging.domains : concat(local.apply_environment.production.domains, local.apply_environment.production.validation)
            }
            "ForAllValues:StringEquals" = { "route53:ChangeResourceRecordSetsRecordTypes" = local.apply_environment[env].record_types }
            Null = {
              "route53:ChangeResourceRecordSetsNormalizedRecordNames" = "false"
              "route53:ChangeResourceRecordSetsRecordTypes"           = "false"
            }
          }
        },
        # CreateSecurityGroup's security-group row lists aws:RequestTag only;
        # the VPC is the shared one.
        {
          Sid       = "CreateSecurityGroup"
          Effect    = "Allow"
          Action    = "ec2:CreateSecurityGroup"
          Resource  = local.apply_resources[env].security_group
          Condition = local.when[env].create
        },
        {
          Sid      = "CreateSecurityGroupInVpc"
          Effect   = "Allow"
          Action   = "ec2:CreateSecurityGroup"
          Resource = aws_vpc.main.arn
        },
        {
          Sid      = "TagSecurityGroupOnCreate"
          Effect   = "Allow"
          Action   = "ec2:CreateTags"
          Resource = local.apply_resources[env].security_group
          Condition = { StringEquals = {
            "aws:RequestTag/env" = env
            "ec2:CreateAction"   = "CreateSecurityGroup"
          } }
        },
        {
          Sid    = "ManageSecurityGroup"
          Effect = "Allow"
          Action = [for a in [
            "AuthorizeSecurityGroupEgress", "AuthorizeSecurityGroupIngress", "DeleteSecurityGroup",
            "RevokeSecurityGroupEgress", "RevokeSecurityGroupIngress",
            "UpdateSecurityGroupRuleDescriptionsEgress", "UpdateSecurityGroupRuleDescriptionsIngress",
          ] : "ec2:${a}"]
          Resource  = local.apply_resources[env].security_group
          Condition = local.when[env].manage
        },
        {
          Sid       = "RetagSecurityGroup"
          Effect    = "Allow"
          Action    = ["ec2:CreateTags", "ec2:DeleteTags"]
          Resource  = local.apply_resources[env].security_group
          Condition = local.when[env].retag
        },
        ], [
        # A production wildcard character (?) could otherwise match a
        # staging name of the same length.
        for statement in [{
          Sid      = "NoStagingRecords"
          Effect   = "Deny"
          Action   = "route53:ChangeResourceRecordSets"
          Resource = aws_route53_zone.public.arn
          Condition = { "ForAnyValue:StringLike" = {
            "route53:ChangeResourceRecordSetsNormalizedRecordNames" = ["staging.${var.domain_name}", "*.staging.${var.domain_name}"]
          } }
        }] : statement if env == "production"
      ])
    })
  }

  # EventBridge rules, alarms and log groups.
  apply_monitoring = {
    for env in local.environment_names : env => jsonencode({
      Version = "2012-10-17"
      Statement = [
        {
          Sid       = "PutRule"
          Effect    = "Allow"
          Action    = "events:PutRule"
          Resource  = local.apply_resources[env].rule
          Condition = local.when[env].upsert
        },
        {
          Sid       = "ManageRule"
          Effect    = "Allow"
          Action    = ["events:DeleteRule", "events:DisableRule", "events:EnableRule", "events:PutTargets", "events:RemoveTargets"]
          Resource  = local.apply_resources[env].rule
          Condition = local.when[env].manage
        },
        {
          Sid       = "PutAlarm"
          Effect    = "Allow"
          Action    = "cloudwatch:PutMetricAlarm"
          Resource  = local.apply_resources[env].alarm
          Condition = local.when[env].upsert
        },
        {
          Sid       = "DeleteAlarm"
          Effect    = "Allow"
          Action    = "cloudwatch:DeleteAlarms"
          Resource  = local.apply_resources[env].alarm
          Condition = local.when[env].manage
        },
        {
          Sid       = "TagRuleAndAlarmOnCreate"
          Effect    = "Allow"
          Action    = ["cloudwatch:TagResource", "events:TagResource"]
          Resource  = [local.apply_resources[env].alarm, local.apply_resources[env].rule]
          Condition = local.when[env].tag_on_create
        },
        {
          Sid       = "RetagRuleAndAlarm"
          Effect    = "Allow"
          Action    = ["cloudwatch:TagResource", "cloudwatch:UntagResource", "events:TagResource", "events:UntagResource"]
          Resource  = [local.apply_resources[env].alarm, local.apply_resources[env].rule]
          Condition = local.when[env].retag
        },
        {
          Sid       = "CreateLogGroup"
          Effect    = "Allow"
          Action    = "logs:CreateLogGroup"
          Resource  = local.apply_resources[env].log_groups
          Condition = local.when[env].create
        },
        {
          Sid    = "ManageLogGroup"
          Effect = "Allow"
          Action = [for a in [
            "AssociateKmsKey", "DeleteLogGroup", "DeleteMetricFilter", "DeleteRetentionPolicy",
            "DisassociateKmsKey", "PutMetricFilter", "PutRetentionPolicy",
          ] : "logs:${a}"]
          Resource  = local.apply_resources[env].log_groups
          Condition = local.when[env].manage
        },
        {
          Sid       = "TagLogGroupOnCreate"
          Effect    = "Allow"
          Action    = ["logs:TagLogGroup", "logs:TagResource"]
          Resource  = local.apply_resources[env].log_groups
          Condition = local.when[env].tag_on_create
        },
        {
          Sid       = "RetagLogGroup"
          Effect    = "Allow"
          Action    = ["logs:TagLogGroup", "logs:TagResource", "logs:UntagLogGroup", "logs:UntagResource"]
          Resource  = local.apply_resources[env].log_groups
          Condition = local.when[env].retag
        },
      ]
    })
  }

  apply_policies = merge([
    for env in local.environment_names : {
      "${env}-balancer"   = local.apply_balancer[env]
      "${env}-edge"       = local.apply_edge[env]
      "${env}-monitoring" = local.apply_monitoring[env]
    }
  ]...)
}

resource "aws_iam_policy" "apply" {
  for_each = local.apply_policies

  name        = "wgi-terraform-apply-${each.key}"
  description = "What the ${split("-", each.key)[0]} root's apply may change (${split("-", each.key)[1]}); attached to its deploy role"
  policy      = each.value
  tags        = { env = split("-", each.key)[0] }

  lifecycle {
    precondition {
      condition     = length(replace(each.value, "/\\s/", "")) <= 6144
      error_message = "wgi-terraform-apply-${each.key} exceeds the 6,144-character managed policy limit; move statements to another group."
    }
    precondition {
      condition     = !can(regex("\"(kms:(Decrypt|Encrypt|GenerateDataKey|ReEncrypt|PutKeyPolicy|ScheduleKeyDeletion|DisableKey)[A-Za-z]*|secretsmanager:(Get|Put)SecretValue|ecr:BatchDeleteImage|[a-z0-9-]+:\\*)\"", each.value))
      error_message = "wgi-terraform-apply-${each.key} grants a key's cryptography or policy, a secret's value, image deletion or a service wildcard."
    }
  }
}

# The deploy roles attach these by ARN. The ARN is built from the configured
# name, so it is known at plan time and env-boundary.mjs can check that each
# role holds only its own environment's policies; reading .name keeps the
# attachment ordered after the policy.
locals {
  apply_policy_arns = {
    for env in local.environment_names : env => {
      for group in ["balancer", "edge", "monitoring"] :
      "apply_${group}" => "arn:${local.partition}:iam::${local.account_id}:policy/${aws_iam_policy.apply["${env}-${group}"].name}"
    }
  }
}

# WAF delivers logs to CloudWatch Logs through the log delivery service, which
# needs this resource policy on the aws-waf-logs-wgi-<env> group. Creating it
# here keeps logs:PutResourcePolicy, an account-wide grant, out of the apply
# policies.
resource "aws_cloudwatch_log_resource_policy" "waf_logs" {
  for_each = local.environment_names

  policy_name = "wgi-${each.key}-waf-logs"
  policy_document = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Sid       = "WafLogDelivery"
      Effect    = "Allow"
      Principal = { Service = "delivery.logs.amazonaws.com" }
      Action    = ["logs:CreateLogStream", "logs:PutLogEvents"]
      Resource  = "${local.service_arn.logs}:log-group:aws-waf-logs-wgi-${each.key}:log-stream:*"
      Condition = { StringEquals = { "aws:SourceAccount" = local.account_id } }
    }]
  })
}
