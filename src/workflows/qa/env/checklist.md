# ENV Workflow — Validation Checklist

Use this checklist to validate the generated test environment. Each item must pass for the environment to be considered production-ready.

---

## Docker Compose Structure

- [ ] **PASS/FAIL** — `docker-compose.test.yml` exists and is valid YAML
- [ ] **PASS/FAIL** — Compose file version is 3.8 or later (or uses Compose Specification)
- [ ] **PASS/FAIL** — All services have explicit `container_name` values with a `test-` prefix
- [ ] **PASS/FAIL** — A dedicated test network is defined (not using default bridge)
- [ ] **PASS/FAIL** — All services are attached to the test network

## Image Configuration

- [ ] **PASS/FAIL** — All images use pinned version tags (no `latest`)
- [ ] **PASS/FAIL** — Images are from official or verified publishers
- [ ] **PASS/FAIL** — Custom Dockerfiles use multi-stage builds where applicable
- [ ] **PASS/FAIL** — Base images are minimal (alpine/slim variants preferred)

## Health Checks

- [ ] **PASS/FAIL** — Every service has a `healthcheck` directive
- [ ] **PASS/FAIL** — Health check commands are appropriate for the service type
- [ ] **PASS/FAIL** — `interval`, `timeout`, `retries`, and `start_period` are configured
- [ ] **PASS/FAIL** — Dependent services use `depends_on` with `condition: service_healthy`

## Environment Variables

- [ ] **PASS/FAIL** — `.env.test` file exists with all required variables
- [ ] **PASS/FAIL** — No secrets or credentials are hardcoded in Compose or Dockerfiles
- [ ] **PASS/FAIL** — `.env.test` is listed in `.gitignore` (or `.env.test.example` is provided)
- [ ] **PASS/FAIL** — Database connection strings use container service names (not localhost)

## Resource Management

- [ ] **PASS/FAIL** — Memory limits are set for resource-intensive services
- [ ] **PASS/FAIL** — CPU limits are set where appropriate
- [ ] **PASS/FAIL** — `tmpfs` mounts are used for ephemeral data where applicable
- [ ] **PASS/FAIL** — Named volumes are used only when data must persist across restarts

## Port Management

- [ ] **PASS/FAIL** — Host port mappings do not conflict with common development ports
- [ ] **PASS/FAIL** — Test services use offset ports (e.g., 15432 instead of 5432)
- [ ] **PASS/FAIL** — Only necessary ports are exposed to the host

## Cleanup and Isolation

- [ ] **PASS/FAIL** — `docker compose down -v` removes all containers, networks, and volumes
- [ ] **PASS/FAIL** — No orphan containers remain after teardown
- [ ] **PASS/FAIL** — Test data does not leak between test runs
- [ ] **PASS/FAIL** — Environment is fully independent from development docker-compose.yml

## Startup and Reliability

- [ ] **PASS/FAIL** — All services reach healthy state within 60 seconds
- [ ] **PASS/FAIL** — Service startup order is correct via dependency chain
- [ ] **PASS/FAIL** — Environment can be started from a cold state (no pre-pulled images required)
- [ ] **PASS/FAIL** — Repeated start/stop cycles do not accumulate stale state

## Documentation

- [ ] **PASS/FAIL** — Quick-start commands are documented
- [ ] **PASS/FAIL** — Environment variable descriptions are provided
- [ ] **PASS/FAIL** — Troubleshooting section covers common failures
- [ ] **PASS/FAIL** — Teardown instructions are included

---

## Scoring

| Rating | Criteria |
|---|---|
| **GREEN** | All items pass |
| **YELLOW** | 1-3 non-critical items fail (no health check or resource limit gaps) |
| **RED** | Any critical item fails (invalid Compose, no health checks, hardcoded secrets, no cleanup) |

Critical items: Compose validity, health checks, no hardcoded secrets, clean teardown.
