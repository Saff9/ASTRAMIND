# Frontend Deployment Guide

This document explains how to build, push, and run the frontend Docker image locally and in CI.

## Build the Docker Image
```bash
# From the repository root
docker build -t your-frontend:latest -f frontend/Dockerfile .
```
The Dockerfile located at `frontend/Dockerfile` creates a production‑ready Next.js image.

## Push the Image to a Registry (Placeholder)
Replace `YOUR_REGISTRY` with your container registry URL (e.g., `ghcr.io/your-org`).
```bash
docker tag your-frontend:latest YOUR_REGISTRY/your-frontend:latest
# Push to registry
# docker push YOUR_REGISTRY/your-frontend:latest
```
> **Note**: The GitHub Actions workflow contains a placeholder step for pushing the image. Enable and configure it for your environment.

## Run the Container Locally
```bash
docker run -d -p 3000:3000 --name frontend your-frontend:latest
```
Visit `http://localhost:3000` in your browser.

## CI/CD Integration
The workflow at `.github/workflows/frontend-ci.yml` automatically:
1. Checks out the repo.
2. Sets up Node.js v20.
3. Caches `node_modules`.
4. Installs dependencies.
5. Runs lint and tests.
6. Builds the Docker image.
7. (Optionally) pushes the image.
8. Executes a Lighthouse performance audit against the running container.

Ensure Docker is available on the CI runner (GitHub-hosted `ubuntu‑latest` images have Docker pre‑installed). Adjust the placeholder push step and registry credentials as needed.
