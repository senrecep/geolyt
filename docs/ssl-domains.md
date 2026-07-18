# SSL & Domain Setup

Companion to `deploy.md` (Dokploy stacks, `api.geolyt.io` / `app.geolyt.io`) and `cname-setup.md`
(white-label client domains). This doc covers DNS, HTTPS/Traefik, and certificate lifecycle —
read those two first for the deployment and white-label flow itself.

## 1. DNS records

At your DNS provider, create **A records** pointing the primary domains at the VDS public IP:

| Type | Name  | Value          |
|------|-------|----------------|
| A    | `api` | `<VDS_IP>`     |
| A    | `app` | `<VDS_IP>`     |

- Use a low TTL (300s) during initial setup so changes propagate quickly; raise it once stable.
- Do not proxy through Cloudflare (orange cloud) unless you also configure Cloudflare's edge
  certificates — Traefik's HTTP-01 challenge needs to reach the VDS directly on port 80.
- Client white-label domains use **CNAME**, not A records — see `cname-setup.md`.

## 2. Dokploy domain + HTTPS setup

1. Dokploy > `api` service > Domains > add `api.geolyt.io`.
2. Dokploy > `web` service > Domains > add `app.geolyt.io`.
3. For each domain, enable:
   - **HTTPS** (this provisions a Traefik/Let's Encrypt certificate resolver automatically)
   - **HTTP → HTTPS redirect**
4. Deploy/restart the service so Traefik picks up the new router config.
5. Confirm Traefik dashboard (or `docker logs <traefik-container>`) shows the domain registered
   with no ACME errors.

Traefik requests certificates via the **HTTP-01 challenge**, which requires:
- Port 80 reachable from the public internet (used only for the ACME challenge, then redirected).
- Port 443 reachable for the actual TLS traffic.
- The DNS record already resolving to the VDS IP *before* you add the domain in Dokploy —
  Traefik will fail the challenge and retry-loop otherwise.

## 3. Certificate issuance verification & renewal

Traefik's Let's Encrypt resolver renews certificates automatically (typically ~30 days before
expiry). No manual cron job is needed. To verify a cert:

```bash
# Check the live certificate and expiry date
openssl s_client -connect api.geolyt.io:443 -servername api.geolyt.io </dev/null 2>/dev/null \
  | openssl x509 -noout -dates

# Quick issuer/subject check
echo | openssl s_client -connect app.geolyt.io:443 -servername app.geolyt.io 2>/dev/null \
  | openssl x509 -noout -issuer -subject
```

Expect `issuer=... Let's Encrypt` and `notAfter` roughly 90 days out. If `notAfter` is close
(<7 days) and not moving on repeat deploys, check Traefik logs for ACME errors (rate limits,
DNS mismatch, port 80 blocked — see Troubleshooting).

Dokploy persists the Traefik ACME storage (`acme.json`) in a volume — do not delete the
Traefik data volume, or all certificates will need to be reissued from scratch.

## 4. White-label custom domains (per-client certificates)

Each white-label client domain (e.g. `dashboard.client.com`) needs its own Traefik router +
certificate, issued the same way as the primary domains once its CNAME resolves to
`app.geolyt.io`.

- DNS/CNAME setup, middleware flow, and app-side config: see `cname-setup.md`.
- In Dokploy, add each client domain under the `web` service's Domains list (same as step 2
  above) so Traefik generates a router + cert for that host.
- Let's Encrypt issues per-domain, so a new client domain triggers a fresh HTTP-01 challenge —
  the CNAME must already resolve before adding the domain, or issuance will fail.

## 5. Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| Certificate error / falls back to self-signed | ACME challenge failed | Confirm port 80 is open and DNS resolves to the VDS IP before retrying |
| `too many certificates already issued` | Let's Encrypt rate limit (50/week per registered domain) | Wait for the rate-limit window to reset; avoid repeatedly adding/removing the same domain during testing |
| Domain stuck pending / no cert issued | DNS not propagated yet | `dig +short api.geolyt.io` — must return the VDS IP; wait for TTL to expire |
| Works on VDS IP but not on domain | Port 80/443 blocked by firewall/security group | Open both ports in the VDS firewall (`ufw`, cloud provider security group) |
| White-label client domain returns cert error | CNAME not pointing to `app.geolyt.io`, or domain not added in Dokploy | Verify with `dig dashboard.client.com`, then add the domain in Dokploy's `web` service |
| Renewal not happening | Traefik ACME volume was reset/deleted | Re-add all domains in Dokploy to force fresh issuance; ensure the Traefik data volume is persistent going forward |

### Useful commands

```bash
dig +short api.geolyt.io                 # verify A record
dig +short dashboard.client.com          # verify client CNAME
nc -zv api.geolyt.io 80 443              # confirm ports are reachable
```
