# GitHub Actions Workflow Templates for Sensay CLI E2E Tests

This directory contains template GitHub Actions workflows for running E2E tests with the Sensay CLI.

## Available Templates

### 1. `e2e-daily.yml.template` - Daily E2E Tests
- Runs daily at 2:00 AM UTC
- Tests all KB types with default settings
- Creates GitHub issue on failure
- Can be triggered manually

### 2. `e2e-on-pr.yml.template` - Pull Request E2E Tests  
- Runs on pull requests to main branch
- Only tests text KB type (faster for PRs)
- Comments on PR with results
- Runs when source files are modified

### 3. `e2e-comprehensive.yml.template` - Comprehensive Matrix Tests
- Tests all KB types across multiple Node.js versions
- Supports manual trigger with custom parameters
- Uploads test artifacts
- Generates summary report

## Setup Instructions

1. **Choose a template** based on your needs

2. **Copy the template** to create an active workflow:
   ```bash
   cp .github/workflows/e2e-daily.yml.template .github/workflows/e2e-daily.yml
   ```

3. **Add the required secret** to your repository:
   - Go to Settings → Secrets and variables → Actions
   - Add a new repository secret named `SENSAY_API_KEY`
   - Set the value to your Sensay API key

4. **Customize the workflow** (optional):
   - Adjust the schedule in cron format
   - Modify KB types to test
   - Change timeout values
   - Add additional notification methods

## How It Works

All workflows:
1. Install the Sensay CLI using the official install script
2. Verify the installation
3. Run e2e tests with the specified configuration
4. Report results (issues, PR comments, or artifacts)

## Environment Variables

The workflows expect these secrets/variables:
- `SENSAY_API_KEY` (required) - Your Sensay API key for authentication

## Manual Triggering

Workflows with `workflow_dispatch` can be triggered manually:
1. Go to Actions tab in your repository
2. Select the workflow
3. Click "Run workflow"
4. Fill in any input parameters (if applicable)

## Customization Examples

### Change Schedule
```yaml
schedule:
  - cron: '0 */6 * * *'  # Every 6 hours
```

### Test Specific KB Types
```bash
sensay e2e --non-interactive --kb-types text,file
```

### Add Slack Notifications
```yaml
- name: Notify Slack on failure
  if: failure()
  uses: 8398a7/action-slack@v3
  with:
    status: ${{ job.status }}
    webhook_url: ${{ secrets.SLACK_WEBHOOK }}
```

## Note

These are templates. Remove the `.template` extension when using them in your repository.