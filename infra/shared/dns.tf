# The public zone for the practice's domain, and a mirror of every record the
# current DNS host (Porkbun) serves. The registrar keeps pointing at Porkbun
# until infra/scripts/dns-mirror-diff.sh finds no difference between the two;
# see infra/README.md, "Moving DNS to Route 53". NS and SOA are the zone's own
# and are not mirrored.
resource "aws_route53_zone" "public" {
  # DNSSEC and query logging wait until this zone is authoritative; both need
  # us-east-1 resources and DNSSEC needs a DS record at the registrar.
  # checkov:skip=CKV2_AWS_38: deferred until the zone is authoritative
  # checkov:skip=CKV2_AWS_39: deferred until the zone is authoritative
  name    = var.domain_name
  comment = "Public zone for ${var.domain_name}; not authoritative until the registrar nameservers change"

  lifecycle {
    prevent_destroy = true
  }
}

# Mirrored records. Values and TTLs are the ones Porkbun serves today; every
# change here is a change to the live site or mail once the zone is
# authoritative. Porkbun serves no CAA, so the mirror has none either: a CAA
# policy arrives with the hosting cut-over, once ACM is the only issuer.

# Apex and www point at Vercel, which serves the site until the cut-over.
resource "aws_route53_record" "apex_a" {
  # checkov:skip=CKV2_AWS_23: the address is Vercel's anycast IP, not an AWS resource
  zone_id = aws_route53_zone.public.zone_id
  name    = var.domain_name
  type    = "A"
  ttl     = 600
  records = ["76.76.21.21"]
}

resource "aws_route53_record" "www_a" {
  # checkov:skip=CKV2_AWS_23: the address is Vercel's anycast IP, not an AWS resource
  zone_id = aws_route53_zone.public.zone_id
  name    = "www.${var.domain_name}"
  type    = "A"
  ttl     = 600
  records = ["76.76.21.21"]
}

# Resend sends from send.westchasegi.com through Amazon SES in us-east-1: the
# return-path MX and SPF live on that name, and the DKIM public key on
# resend._domainkey.
resource "aws_route53_record" "resend_dkim" {
  zone_id = aws_route53_zone.public.zone_id
  name    = "resend._domainkey.${var.domain_name}"
  type    = "TXT"
  ttl     = 600
  records = ["p=MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQCgZrIAuWgXfrKGwKR3zG13VmItwQgoL5ixRI406LT3ldBVZqtE83BMc2AFu7xSWqGTHKMgALEILJtoMWV/vU5NUNxxEpbPPK9JAmpxH+UZ2i1haBFuHskgLgNQRlmUQo/J/UIwLsbKo//zr+BU8yoeyzgV8wGXut2aZMAkT/df0wIDAQAB"]
}

resource "aws_route53_record" "send_mx" {
  zone_id = aws_route53_zone.public.zone_id
  name    = "send.${var.domain_name}"
  type    = "MX"
  ttl     = 600
  records = ["10 feedback-smtp.us-east-1.amazonses.com"]
}

resource "aws_route53_record" "send_spf" {
  zone_id = aws_route53_zone.public.zone_id
  name    = "send.${var.domain_name}"
  type    = "TXT"
  ttl     = 600
  records = ["v=spf1 include:amazonses.com ~all"]
}
