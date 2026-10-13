# AWS Config records the configuration history of every supported resource in
# the selected Region, plus global IAM resources, and delivers it to the audit
# bucket. That history is what an auditor asks for when they want to know what
# a security group or bucket policy looked like on a given day.
#
# Recording only: no managed rules and no conformance packs yet. Rules are
# billed per evaluation and Security Hub per check; infra/README.md explains
# the decision and when to revisit it.

resource "aws_iam_service_linked_role" "config" {
  aws_service_name = "config.amazonaws.com"
}

resource "aws_config_configuration_recorder" "account" {
  name     = "wgi-account"
  role_arn = aws_iam_service_linked_role.config.arn

  recording_group {
    all_supported                 = true
    include_global_resource_types = true
  }

  recording_mode {
    recording_frequency = "CONTINUOUS"
  }
}

resource "aws_config_delivery_channel" "account" {
  name           = "wgi-account"
  s3_bucket_name = module.audit_bucket.id
  s3_key_prefix  = "config"
  s3_kms_key_arn = module.kms["audit"].arn

  snapshot_delivery_properties {
    delivery_frequency = "TwentyFour_Hours"
  }

  depends_on = [aws_config_configuration_recorder.account]
}

resource "aws_config_configuration_recorder_status" "account" {
  name       = aws_config_configuration_recorder.account.name
  is_enabled = true

  depends_on = [aws_config_delivery_channel.account]
}
