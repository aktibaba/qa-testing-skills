# ENV Workflow — Instructions

## Overview

This workflow creates reproducible Docker-based test environments. It detects the project's technology stack, designs appropriate container services, generates Docker Compose configuration, adds health checks, and validates the complete setup.

## Prerequisites

- Docker or compatible container runtime installed and running.
- Project source code accessible at `{project-root}`.
- Sufficient disk space for container images.

## How It Works

### Step 1: Preflight

The workflow scans the project to detect:
- Programming language(s) and frameworks (package.json, requirements.txt, go.mod, pom.xml, etc.)
- Existing Docker configuration (Dockerfile, docker-compose.yml)
- Database and service dependencies (connection strings, imports, config files)
- Test framework in use

If Docker is not available, the workflow halts with installation guidance.

### Step 2: Design Environment

Based on detected dependencies, the workflow designs a Docker Compose architecture:
- **Application service**: Containerized app for testing
- **Database services**: PostgreSQL, MySQL, MongoDB, Redis, etc.
- **Message brokers**: RabbitMQ, Kafka, NATS, etc.
- **Cache layers**: Redis, Memcached
- **Supporting services**: Mailhog, LocalStack, MinIO, Elasticsearch, etc.

Each service is configured with:
- Appropriate image version (pinned, not `latest`)
- Resource limits (memory, CPU)
- Network isolation (dedicated test network)
- Volume mounts for persistence or test data seeding
- Environment variables via `.env.test`

### Step 3: Generate Compose

Produces the following files:
- `docker-compose.test.yml` — Main orchestration file
- `docker/test/Dockerfile.*` — Custom Dockerfiles if the base images need modification
- `.env.test` — Environment variable definitions
- `scripts/test-env.sh` — Helper script to start/stop/reset the environment

### Step 4: Health Checks

Every service receives:
- A Docker `HEALTHCHECK` directive with appropriate test command
- `depends_on` conditions using `service_healthy`
- Wait-for-it or dockerize wrappers where native health checks are insufficient
- Startup timeout configuration

### Step 5: Validate and Summary

The workflow validates:
- Docker Compose syntax (`docker compose config`)
- All referenced images are pullable
- Port conflicts with host
- Volume mount paths exist
- Environment variables are defined

Produces a summary with:
- Architecture diagram (text-based)
- Quick-start commands
- Troubleshooting guide
- Teardown instructions

## Key Principles

1. **Reproducibility**: Every environment must produce identical results regardless of host OS.
2. **Isolation**: Test containers must not interfere with development or production services.
3. **Speed**: Use multi-stage builds, layer caching, and tmpfs mounts to minimize startup time.
4. **Disposability**: `docker compose down -v` must cleanly remove all test state.
5. **Security**: Never embed secrets in Dockerfiles. Use `.env.test` and mark it in `.gitignore`.

## Variable Reference

| Variable | Type | Default | Description |
|---|---|---|---|
| `use_docker` | boolean | `true` | Enable Docker-based environments |
| `container_runtime` | string | `docker` | Container runtime: docker, podman, nerdctl |
| `docker_compose_file` | string | `docker-compose.test.yml` | Output Compose file name |
| `test_artifacts` | string | `{project-root}/test-artifacts` | Artifact output directory |
| `test_stack_type` | string | `auto` | Project type for stack detection |

## Error Handling

- If Docker is not installed: halt and provide installation link.
- If a required port is in use: suggest alternative port mapping.
- If an image pull fails: suggest checking network or using a mirror.
- If health checks fail after timeout: log container output and suggest debugging steps.
