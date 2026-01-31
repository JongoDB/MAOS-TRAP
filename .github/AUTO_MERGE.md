# Automated PR Merging

## Overview

This repository uses automated workflows to keep base Docker images up-to-date and automatically merge dependency updates.

## How It Works

### 1. Base Image Updates (`check-base-images.yml`)
- Runs daily at 2 AM UTC (can also be triggered manually)
- Checks for updates to Docker base images
- Creates a PR with the `automated` and `dependencies` labels when updates are found
- Updates `.base-images-updated` marker file with timestamp

### 2. Build & Test (`build-containers.yml`)
- Automatically runs on all PRs
- Builds all Docker containers
- Runs health checks and validation tests
- Must pass for PR to be merged

### 3. Auto-Merge (`auto-merge-automated-prs.yml`)
- Triggers when PRs with the `automated` label are created or updated
- Waits for all required checks to complete
- Automatically merges PR if all checks pass
- Uses squash merge and deletes the branch after merging

## Labels

- `automated` - Marks PRs created by automation (triggers auto-merge)
- `dependencies` - Indicates dependency updates

## Security

Only PRs with the `automated` label will be auto-merged, and only after:
- ✅ All containers build successfully
- ✅ All health checks pass
- ✅ All required status checks complete

## Manual Override

To prevent auto-merge on a specific automated PR:
1. Remove the `automated` label from the PR
2. Or close the PR

To manually merge:
1. Review the PR
2. Merge using GitHub UI or `gh pr merge <number>`
