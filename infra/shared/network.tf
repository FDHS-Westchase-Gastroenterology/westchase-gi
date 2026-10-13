# One VPC across two Availability Zones, shared by staging, preview and
# production. Three tiers:
#   public  - the load balancer and the NAT gateway; nothing else gets a public IP
#   app     - ECS tasks, including one-off run-task jobs (migrations, e2e runs);
#             outbound internet through the NAT gateway, S3 through a gateway
#             endpoint, and ECR, Secrets Manager, KMS and CloudWatch Logs
#             through interface endpoints
#   db      - RDS only; no route to the internet in either direction, and a
#             network ACL that admits PostgreSQL from the app tier and nothing else
# Environments are separated inside the VPC by security groups, IAM roles and
# their own KMS keys and secrets; infra/README.md weighs this against one VPC
# per environment.

locals {
  azs = {
    a = "${local.region}a"
    b = "${local.region}b"
  }

  subnets = {
    public = {
      a = cidrsubnet(var.vpc_cidr, 8, 0) # 10.20.0.0/24
      b = cidrsubnet(var.vpc_cidr, 8, 1) # 10.20.1.0/24
    }
    app = {
      a = cidrsubnet(var.vpc_cidr, 4, 1) # 10.20.16.0/20
      b = cidrsubnet(var.vpc_cidr, 4, 2) # 10.20.32.0/20
    }
    db = {
      a = cidrsubnet(var.vpc_cidr, 8, 64) # 10.20.64.0/24
      b = cidrsubnet(var.vpc_cidr, 8, 65) # 10.20.65.0/24
    }
  }

  subnet_list = merge([
    for tier, by_az in local.subnets : {
      for az, cidr in by_az : "${tier}-${az}" => {
        tier = tier
        az   = az
        cidr = cidr
      }
    }
  ]...)
}

resource "aws_vpc" "main" {
  cidr_block           = var.vpc_cidr
  enable_dns_support   = true
  enable_dns_hostnames = true

  tags = {
    Name = "wgi"
  }
}

# The default security group admits nothing, so a resource launched without an
# explicit group is isolated rather than open to its neighbours.
resource "aws_default_security_group" "main" {
  vpc_id = aws_vpc.main.id

  tags = {
    Name = "wgi-default-deny"
  }
}

resource "aws_subnet" "main" {
  for_each = local.subnet_list

  vpc_id                  = aws_vpc.main.id
  availability_zone       = local.azs[each.value.az]
  cidr_block              = each.value.cidr
  map_public_ip_on_launch = false

  tags = {
    Name = "wgi-${each.key}"
    Tier = each.value.tier
  }
}

resource "aws_internet_gateway" "main" {
  vpc_id = aws_vpc.main.id

  tags = {
    Name = "wgi"
  }
}

# One NAT gateway, in zone a. A second one would keep zone b's outbound
# traffic up through a zone a outage for about $36 a month more; see the README.
resource "aws_eip" "nat" {
  domain = "vpc"

  tags = {
    Name = "wgi-nat-a"
  }
}

resource "aws_nat_gateway" "main" {
  allocation_id = aws_eip.nat.id
  subnet_id     = aws_subnet.main["public-a"].id

  tags = {
    Name = "wgi-nat-a"
  }

  depends_on = [aws_internet_gateway.main]
}

resource "aws_route_table" "public" {
  vpc_id = aws_vpc.main.id

  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.main.id
  }

  tags = {
    Name = "wgi-public"
  }
}

resource "aws_route_table" "app" {
  vpc_id = aws_vpc.main.id

  route {
    cidr_block     = "0.0.0.0/0"
    nat_gateway_id = aws_nat_gateway.main.id
  }

  tags = {
    Name = "wgi-app"
  }
}

# Only the implicit local route: the database tier cannot reach or be reached
# from the internet.
resource "aws_route_table" "db" {
  vpc_id = aws_vpc.main.id

  tags = {
    Name = "wgi-db"
  }
}

resource "aws_route_table_association" "main" {
  for_each = local.subnet_list

  subnet_id = aws_subnet.main[each.key].id
  route_table_id = {
    public = aws_route_table.public.id
    app    = aws_route_table.app.id
    db     = aws_route_table.db.id
  }[each.value.tier]
}

# S3 traffic from the app tier stays on the AWS network and costs no NAT
# processing. The endpoint reaches only this account's buckets, plus the
# AWS-owned bucket ECR serves image layers from in this Region, so a task
# cannot copy data to someone else's bucket through it.
data "aws_iam_policy_document" "s3_endpoint" {
  statement {
    sid       = "OwnAccountBuckets"
    actions   = ["s3:*"]
    resources = ["*"]

    principals {
      type        = "*"
      identifiers = ["*"]
    }

    condition {
      test     = "StringEquals"
      variable = "aws:ResourceAccount"
      values   = [local.account_id]
    }
  }

  statement {
    sid       = "EcrImageLayers"
    actions   = ["s3:GetObject"]
    resources = ["arn:${local.partition}:s3:::prod-${local.region}-starport-layer-bucket/*"]

    principals {
      type        = "*"
      identifiers = ["*"]
    }
  }
}

resource "aws_vpc_endpoint" "s3" {
  vpc_id            = aws_vpc.main.id
  service_name      = "com.amazonaws.${local.region}.s3"
  vpc_endpoint_type = "Gateway"
  route_table_ids   = [aws_route_table.app.id]
  policy            = data.aws_iam_policy_document.s3_endpoint.json

  tags = {
    Name = "wgi-s3"
  }
}

# Interface endpoints in both app subnets, with private DNS, so image pulls,
# secret reads, KMS calls and log delivery from the VPC never leave the AWS
# network. Production's secrets can then require aws:SourceVpce, which a call
# from outside the VPC cannot satisfy. Each endpoint's security group admits
# HTTPS from the VPC and nothing else; it needs no egress rule, because
# security groups return replies statefully. The endpoint policies stay at the
# default: the GuardDuty agent's sidecar image comes from an AWS-owned ECR
# registry, and IAM and the resource policies on keys and secrets do the
# narrowing.
locals {
  interface_endpoints = toset(["ecr.api", "ecr.dkr", "secretsmanager", "kms", "logs"])
}

resource "aws_security_group" "endpoint" {
  # checkov:skip=CKV2_AWS_5: attached to aws_vpc_endpoint.interface for the same key; the graph check misses some for_each edges
  for_each = local.interface_endpoints

  name        = "wgi-vpce-${replace(each.key, ".", "-")}"
  description = "HTTPS from the VPC to the ${each.key} interface endpoint"
  vpc_id      = aws_vpc.main.id

  tags = {
    Name = "wgi-vpce-${replace(each.key, ".", "-")}"
  }
}

resource "aws_vpc_security_group_ingress_rule" "endpoint_https" {
  for_each = local.interface_endpoints

  security_group_id = aws_security_group.endpoint[each.key].id
  description       = "HTTPS from the VPC"
  ip_protocol       = "tcp"
  from_port         = 443
  to_port           = 443
  cidr_ipv4         = aws_vpc.main.cidr_block
}

resource "aws_vpc_endpoint" "interface" {
  for_each = local.interface_endpoints

  vpc_id              = aws_vpc.main.id
  service_name        = "com.amazonaws.${local.region}.${each.key}"
  vpc_endpoint_type   = "Interface"
  private_dns_enabled = true
  subnet_ids          = [aws_subnet.main["app-a"].id, aws_subnet.main["app-b"].id]
  security_group_ids  = [aws_security_group.endpoint[each.key].id]

  tags = {
    Name = "wgi-${replace(each.key, ".", "-")}"
  }
}

# Stateless second layer under the database security groups: PostgreSQL in
# from the app tier, replies out to it, and free traffic between the two
# database subnets for Multi-AZ. Everything else is dropped.
resource "aws_network_acl" "db" {
  # checkov:skip=CKV2_AWS_1: attached through subnet_ids below
  vpc_id     = aws_vpc.main.id
  subnet_ids = [aws_subnet.main["db-a"].id, aws_subnet.main["db-b"].id]

  tags = {
    Name = "wgi-db"
  }
}

locals {
  db_nacl_rules = merge(
    {
      for i, az in keys(local.azs) : "in-postgres-from-app-${az}" => {
        egress = false, rule_number = 100 + i, protocol = "tcp", cidr = local.subnets.app[az], from = 5432, to = 5432
      }
    },
    {
      for i, az in keys(local.azs) : "in-all-from-db-${az}" => {
        egress = false, rule_number = 200 + i, protocol = "-1", cidr = local.subnets.db[az], from = 0, to = 0
      }
    },
    {
      for i, az in keys(local.azs) : "out-replies-to-app-${az}" => {
        egress = true, rule_number = 100 + i, protocol = "tcp", cidr = local.subnets.app[az], from = 1024, to = 65535
      }
    },
    {
      for i, az in keys(local.azs) : "out-all-to-db-${az}" => {
        egress = true, rule_number = 200 + i, protocol = "-1", cidr = local.subnets.db[az], from = 0, to = 0
      }
    },
  )
}

resource "aws_network_acl_rule" "db" {
  for_each = local.db_nacl_rules

  network_acl_id = aws_network_acl.db.id
  egress         = each.value.egress
  rule_number    = each.value.rule_number
  rule_action    = "allow"
  protocol       = each.value.protocol
  cidr_block     = each.value.cidr
  from_port      = each.value.from
  to_port        = each.value.to
}

# Every accepted and rejected flow in the VPC, delivered to the audit bucket.
resource "aws_flow_log" "vpc" {
  vpc_id                   = aws_vpc.main.id
  traffic_type             = "ALL"
  log_destination_type     = "s3"
  log_destination          = "${module.audit_bucket.arn}/vpc-flow-logs/"
  max_aggregation_interval = 600

  destination_options {
    file_format        = "plain-text"
    per_hour_partition = true
  }

  tags = {
    Name = "wgi-vpc"
  }

  depends_on = [module.audit_bucket]
}
