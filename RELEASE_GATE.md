# Lasoph patient-release gate

Lasoph is **not approved for patient deployment** until every item below has
an accountable owner, evidence, and sign-off. Completing software tasks alone
does not make a clinical triage product safe or legally deployable.

## Clinical safety

- [ ] A qualified clinical governance group has reviewed and approved every
  red-flag rule, escalation message, and intended-use statement for each launch
  jurisdiction and population.
- [ ] The team has completed scenario-based validation using representative,
  de-identified cases, including missed-escalation and false-escalation review.
- [ ] Emergency routing is backed by a maintained, country/location-aware
  service. Until then, the product must not display a country-specific number.
- [ ] A monitored incident process, human escalation route, and safe rollback
  procedure are in place.
- [ ] Accessibility, usability, language, and health-literacy testing has been
  completed with intended users.

## Privacy, security, and legal

- [ ] Counsel has determined applicable privacy, medical-device, consumer
  protection, and data-residency obligations (for example HIPAA, GDPR, and
  local health-data laws).
- [ ] A privacy notice, consent flow, data-retention schedule, deletion process,
  and processor agreements have been approved.
- [ ] Production authentication, authorization, encrypted storage, secrets
  management, audit logging, backups, and penetration testing are in place.
- [ ] A threat model covers browser speech services, exports/downloads,
  third-party model providers, abuse, and prompt injection.
- [ ] Production is served only over HTTPS with `LASOPH_ALLOWED_ORIGINS` and
  `LASOPH_ALLOWED_HOSTS` restricted to the deployed domains. Replace the
  in-process rate limiter with shared edge or gateway rate limiting.

## Model operations (only if enabled)

- [ ] The provider agreement and data controls have been reviewed for health
  information. `store=False` is enabled for model requests.
- [ ] The selected model and prompt are versioned, evaluated, monitored, and
  can be rolled back. The deterministic workflow remains available on failure.
- [ ] Model output is restricted to clinician-draft documentation and never
  determines emergency routing or patient-facing urgency.

## Deployment verification

- [ ] CI runs backend tests and frontend production builds on every change.
- [ ] Dependency, secret, and container-image scans run in CI.
- [ ] Monitoring, alerting, uptime checks, and an on-call owner are configured.
- [ ] A clinician has signed the final production release.
