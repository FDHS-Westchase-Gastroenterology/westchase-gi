#!/usr/bin/env bash
# Compares the westchasegi.com records served by Porkbun with the Route 53 mirror
# in infra/shared/dns.tf, name by name and type by type, TTLs included. An empty
# diff is the proof that the nameservers can move to Route 53 without changing an
# answer (infra/README.md, "Moving DNS to Route 53").
#
#   infra/scripts/dns-mirror-diff.sh <route53-nameserver> [porkbun-nameserver]
#
# The Route 53 nameserver is any of `terraform -chdir=infra/shared output
# route53_name_servers`. Every answer must carry the aa flag. Some networks answer
# port 53 themselves, whatever server is asked, which would compare a resolver
# with itself; the script stops instead. A GitHub-hosted runner reaches the
# nameservers directly.
#
# Exit status: 0 when every answer matches, 1 when any differs, 2 when a
# nameserver gave no authoritative answer.
set -euo pipefail

domain=westchasegi.com
route53_ns=${1:?usage: $0 <route53-nameserver> [porkbun-nameserver]}
porkbun_ns=${2:-curitiba.ns.porkbun.com}

# Every name the zone serves, plus names that must not exist on either side.
# Add a name here when the Porkbun export or a later record introduces one.
names=(
  "$domain"
  "www.$domain"
  "send.$domain"
  "resend._domainkey.$domain"
  "_domainkey.$domain"
  "_dmarc.$domain"
  "_acme-challenge.$domain"
  "mail.$domain"
  "staging.$domain"
  "no-such-name-for-the-mirror-check.$domain"
)
# TYPE65 is HTTPS, written numerically for older dig builds. NS and SOA differ
# by design and are not mirrored.
types=(A AAAA CNAME MX TXT CAA SRV TYPE65)

# Prints the response status and the sorted answer records, owner names
# lowercased. Returns 2 when the answer is not authoritative.
answer() {
  local server=$1 name=$2 type=$3 out status
  out=$(dig +norec +noall +comments +answer +time=5 +tries=2 "@$server" "$name" "$type")
  if ! grep -Eq '^;; flags: qr aa[ ;]' <<<"$out"; then
    echo "$server gave no authoritative answer for $name $type" >&2
    return 2
  fi
  status=$(sed -nE 's/.*status: ([A-Z]+),.*/\1/p' <<<"$out")
  echo "$name $type status=$status"
  grep -v '^;' <<<"$out" | grep -v '^$' | awk '{ $1 = tolower($1); print }' | sort || true
}

differences=0
for name in "${names[@]}"; do
  for type in "${types[@]}"; do
    porkbun=$(answer "$porkbun_ns" "$name" "$type") || exit $?
    route53=$(answer "$route53_ns" "$name" "$type") || exit $?
    [[ $porkbun == "$route53" ]] && continue
    differences=$((differences + 1))
    echo "differs: $name $type"
    diff <(echo "$porkbun") <(echo "$route53") \
      | sed -e "s/^</  $porkbun_ns:/" -e "s/^>/  $route53_ns:/" | grep -Ev '^([0-9]|---$)' || true
  done
done

if ((differences > 0)); then
  echo "$differences name/type pairs differ between $porkbun_ns and $route53_ns" >&2
  exit 1
fi
echo "No differences between $porkbun_ns and $route53_ns across ${#names[@]} names and ${#types[@]} types."
