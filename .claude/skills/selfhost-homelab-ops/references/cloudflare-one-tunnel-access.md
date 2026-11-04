<!-- Trimmed from https://github.com/cloudflare/skills @ 1f2cd0a19588e2c6197c91dd7c71729df1fb6156 skills/cloudflare-one/SKILL.md (Apache-2.0; modified by trimming for FixFlow on 2026-11-04, see ../UPSTREAM.md): kept the docs-first rule (L6-8), Workflow (L10-16), Access and SaaS Federation prompts (L31-36), Tunnel and Private Networking prompts (L38-46), the first Guardrails block (L67-78), Identity and Access (L80-88), Private Networking (L112-118), Output Defaults, Validation Prompts, API Safety (L161-180); dropped Gateway/TLS/DLP, CASB, WAN, Device Client, Infrastructure Access, Logs/DEX and Skill feedback. Upstream's own dated note kept by reference: it says the Gateway Audit SSH action reached end of life on July 15, 2026 (dropped section, L142). Workflow steps 4-5, L46, L69, L78, L118 and the account-inspection bullets are REJECTED for FixFlow — read SKILL.md "Where upstream disagrees" before acting on any of them. "[...]" marks a cut. -->
# Cloudflare One

Before citing limits, settings, API fields, category IDs, or exact UI paths, retrieve current information from the [Cloudflare One docs](https://developers.cloudflare.com/cloudflare-one/index.md), the Cloudflare docs MCP server, or the Cloudflare API schema.

## Workflow

1. Classify the ask: architecture, configuration, troubleshooting, migration, or review.
2. Gather context: account ID, users/sites/apps, identity provider, SCIM/group sync, device management, traffic path, compliance constraints, and rollout blast radius.
3. Retrieve only the current docs needed for the products involved: Access, Gateway, WARP/device client, Tunnel/Mesh, Cloudflare WAN, DLP, CASB, device posture, or identity.
4. If account access is available, inspect existing resources before proposing or making changes: Access apps/policies/groups/IdPs, Gateway rules/lists/categories, device profiles/posture checks, tunnels/routes, DNS/resolver settings, and locations/sites.
5. Propose the change set with prerequisites, validation, and rollback. For risky changes, stage disabled or scoped to a pilot group/site unless the user explicitly asks otherwise.

[...]

### Access and SaaS Federation

- App shape: web app, API, SSH/RDP/VNC, database, SaaS app, public hostname, private IP, or private hostname. Retrieve [Access application type](https://developers.cloudflare.com/cloudflare-one/access-controls/applications/choose-application-type/index.md) docs before choosing.
- Access model: clientless browser access, private networking with device client, peer to peer connectivity, service connections with service tokens or mutual TLS, or SaaS SSO federation.
- Policy needs: user groups, device posture, session duration, mTLS, service tokens, and app launcher visibility. Retrieve [Access policy](https://developers.cloudflare.com/cloudflare-one/access-controls/policies/index.md) docs before configuring selectors or evaluation order.
- SaaS details: SAML vs OIDC support, ACS/redirect URLs, Entity IDs/client IDs, required attributes, and tenant-control requirements.

### Tunnel and Private Networking

- Sites and segments: which data centers, VPCs, offices, or network segments need connectivity.
- HA: dev/test single connector, production multiple connectors, or advanced multi-tunnel/site redundancy.
- Runtime: where cloudflared or Cloudflare Mesh nodes (formerly WARP Connector) will run: VM, container, Kubernetes, bare metal, or other target.
- Egress: whether connectors can reach Cloudflare over the required outbound ports/protocols. Retrieve [Tunnel connectivity prechecks](https://developers.cloudflare.com/cloudflare-one/networks/connectors/cloudflare-tunnel/troubleshoot-tunnels/connectivity-prechecks/index.md) before naming exact endpoints.
- Origin reachability: whether the connector can resolve and reach every private origin.
- Routing: required CIDRs/hostnames, overlapping IP spaces, [virtual networks](https://developers.cloudflare.com/cloudflare-one/networks/connectors/cloudflare-tunnel/private-net/cloudflared/tunnel-virtual-networks/index.md), [Split Tunnels](https://developers.cloudflare.com/cloudflare-one/team-and-resources/devices/cloudflare-one-client/configure/route-traffic/split-tunnels/index.md), and private DNS/[resolver policy](https://developers.cloudflare.com/cloudflare-one/traffic-policies/resolver-policies/index.md) needs.
- Management model: prefer remotely managed/token-based tunnels for new deployments unless there is a clear reason for local config.

[...]

## Guardrails

- Access controls application authorization; Gateway controls traffic inspection/filtering. Use both when the requirement spans identity-aware app access and network/web security.
- For new Access deployments, create policies through the reusable policy API (`/access/policies`) and attach them to applications. Do not send inline `policies` in an application create/update request unless the current API documentation explicitly requires an app-scoped policy.
- Treat an app-scoped policy reported as `reusable: false` as legacy. Migrate existing policies with the documented `make_reusable` endpoint or replace them with reusable policies; do not create new legacy policies. Distinguish legacy policies from the deprecated legacy private-network application type.
- Public hostname Access apps can be clientless. Private destination apps require the Cloudflare One Client or another network on-ramp plus routes and DNS resolution. Retrieve [self-hosted private app](https://developers.cloudflare.com/cloudflare-one/access-controls/applications/non-http/self-hosted-private-app/index.md) docs before configuring private destinations.
- Cloudflare Tunnel is an off-ramp from a private network to Cloudflare. Cloudflare WAN and Mesh are other off-ramps which can also be on-ramps.
- Group-based policies depend on IdP group claims or SCIM. If group sync is missing, do not invent group selectors.
- Private hostnames need explicit DNS routing/resolution; creating an Access app alone is not enough. Use [resolver policies](https://developers.cloudflare.com/cloudflare-one/traffic-policies/resolver-policies/index.md) and review [Connect a private hostname](https://developers.cloudflare.com/cloudflare-one/networks/connectors/cloudflare-tunnel/private-net/cloudflared/connect-private-hostname/index.md)
- HTTP inspection and DLP for encrypted web traffic require TLS inspection and planned Do Not Inspect exceptions.
- Gateway DNS, Network, HTTP, and Egress policies have different evaluation semantics. Retrieve [order of enforcement](https://developers.cloudflare.com/cloudflare-one/traffic-policies/order-of-enforcement/index.md) docs before explaining precedence.
- Start broad block/allow/DLP/TLS policies disabled limited to a pilot with specific target users or groups unless the user approves a wider rollout.

### Identity and Access

- Access Groups are Cloudflare objects; IdP/SCIM groups are identity claims. Gateway group selectors use synced IdP groups, not Access Groups.
- Group names and SAML/OIDC attributes are case-sensitive. Verify exact claim names and values before creating group-based rules.
- SCIM changes and group membership can be stale until sync and re-authentication complete. Troubleshoot with the user's last authenticated identity, not just the IdP state.
- Access policies are default-deny. A private app with routes but no Allow policy still blocks access.
- Access policy selectors can use IP lists, not Gateway domain or URL lists.
- SaaS federation handles authentication into the SaaS app. SaaS authorization and tenant restrictions usually require SaaS-side roles and/or Gateway tenant controls.
- Browser Rendering for SSH/VNC/RDP is an Access capability. Browser Isolation renders general web content remotely. Do not conflate them.

[...]

### Private Networking

- Split tunnel mode changes the meaning of every route decision: Exclude mode sends traffic to Cloudflare when removed from excludes; Include mode sends traffic only when added to includes.
- Virtual networks should be used primarily when IP subnets overlap and hostname-based routing is not used. It can be used to control other user connectivity behavior, but it is recommended to manage through security policies.
- A healthy tunnel only proves cloudflared can reach Cloudflare. The tunnel must have appropriate published application routes, network routes, or hostname routes for connectivity to function.
- Cloudflare Tunnel and Cloudflare Mesh can both be used to facilitate connectivity to internal networks. Cloudflare WAN can as well, but it is gated behind Enterprise subscriptions. Retrieve [choose an on-ramp](https://developers.cloudflare.com/learning-paths/secure-internet-traffic/connect-devices-networks/choose-on-ramp/index.md) when deliberating between Tunnel types.
- Run multiple cloudflared connectors for production HA, preferably on separate hosts. Token-based, remotely managed tunnels are the default for new deployments.

[...]

## Output Defaults

- Designs: current assumptions, target architecture, product responsibilities, rollout phases, validation, and open decisions.
- Configuration work: prerequisites, exact resources to inspect/create/change, test cases, and rollback.
- Troubleshooting: traffic path, likely failure point, evidence to collect, and next test.

## Validation Prompts

- Access: test authorized, unauthorized, posture-failing, service-token, and multi-IdP flows when applicable; inspect logs and policy precedence. For new policies, verify they are managed through the reusable policy collection and not returned as `reusable: false` app-scoped policies.
- Private network access: verify route lookup, tunnel health, origin reachability, split tunnel behavior, DNS resolution, and end-to-end access from a device client test device.
- Gateway: verify rule type, action, traffic expression, precedence/evaluation phase, referenced lists, and Gateway settings before enabling broadly.
- TLS/DLP: test Do Not Inspect exceptions and root CA trust before enabling inspection; test DLP with known samples and monitor false positives before blocking.
- CASB/risk: confirm integration health, credential expiry, asset discovery, scan timing, finding instances, and risk-score signal latency before declaring remediation complete.
- Cloudflare WAN: verify tunnel health, route priority/ownership, traffic flow, firewall expression syntax, and connector/appliance telemetry where applicable.

## API Safety

- Use fully qualified MCP tool names when MCP tools are available.
- Never guess category IDs, application IDs, wirefilter fields, or API request bodies. Retrieve the current schema/docs and existing account objects.
- Do not enable broad production policies without explicit approval.
