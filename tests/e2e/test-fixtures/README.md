# E2E Test Fixtures

This directory contains sample data used in end-to-end tests.

## Test Project Structure

The E2E tests create temporary projects with the following structure:

```
test-project/
├── system-message.txt          # AI system prompt
├── training-data/              # Training files directory
│   ├── conversation1.txt       # Customer support conversation
│   ├── knowledge.txt          # Product knowledge base
│   ├── advanced/              # Subdirectory
│   │   └── troubleshooting.md # Troubleshooting guide
│   └── image.png              # File to be skipped (unsupported)
└── sensay.config.json         # Generated during test
```

## Test Scenarios

1. **Complete Setup**: Tests full workflow with system message and training data
2. **Existing Resources**: Tests handling of existing users and replicas
3. **Missing Data**: Tests graceful handling of missing files
4. **Error Cases**: Tests error handling (missing API key, API failures)

## Mock API Responses

The tests use `nock` to mock Sensay API responses:

- User creation/retrieval
- Replica creation/retrieval  
- System message updates
- Training data upload
- Training status polling

All API interactions are mocked to ensure tests are deterministic and don't require actual API access.