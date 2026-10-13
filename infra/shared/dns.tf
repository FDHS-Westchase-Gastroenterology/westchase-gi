# The public zone for the practice's domain. It is created empty: the records
# the site needs today live at the current DNS host (Porkbun), and copying them
# here is a separate step that starts from that host's export. Until the zone
# holds every record from that export, the registrar keeps pointing at the
# current nameservers; see infra/README.md.
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
