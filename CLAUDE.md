# Sensay CLI - Development Guide

## Project Overview

This is a TypeScript-based CLI tool for Sensay API operations, designed to simplify organization setup, user management, and replica training. The tool supports both interactive prompts and command-line arguments for all operations.

## Architecture

### Project Structure
```
sensay-cli/
├── src/
│   ├── api/
│   │   └── client.ts          # Sensay API client
│   ├── commands/
│   │   ├── claim-key.ts       # API key claiming command
│   │   └── simple-organization-setup.ts  # Main setup command
│   ├── config/
│   │   └── manager.ts         # Configuration management
│   ├── types/
│   │   └── api.ts            # TypeScript interfaces
│   ├── utils/
│   │   ├── files.ts          # File processing utilities
│   │   └── progress.ts       # Progress tracking and UI
│   └── index.ts              # Main CLI entry point
├── package.json
├── tsconfig.json
└── CLAUDE.md
```

### Key Components

1. **API Client** (`src/api/client.ts`)
   - Axios-based HTTP client for Sensay API
   - Handles authentication with X-ORGANIZATION-SECRET and X-USER-ID headers
   - Implements all required endpoints for organization, user, and replica management

2. **Configuration Management** (`src/config/manager.ts`)
   - Supports both user-wide (~/.sensay/config.json) and project-specific (./sensay.config.json) configurations
   - Environment variable support (SENSAY_API_KEY, SENSAY_ORGANIZATION_ID, etc.)
   - Automatic config merging with precedence: env vars > user config > project config

3. **File Processing** (`src/utils/files.ts`)
   - Recursive scanning of training-data folder
   - Supports .txt, .md, .json, .csv, .log files (max 10MB each)
   - Automatic system-message.txt detection and processing
   - Visual feedback for skipped files and file sizes

4. **Progress Management** (`src/utils/progress.ts`)
   - Ora-based spinning indicators for long-running operations
   - Training status polling with visual feedback
   - ASCII-style progress display for multiple file uploads

## Commands

### 1. `sensay claim-key`
Claims an API key using the hard-coded internal code `GNEFSHAF`.

**Arguments:**
- `-o, --organization-name <name>` - Organization name
- `-n, --name <name>` - Your name  
- `-e, --email <email>` - Your email
- `-s, --save-location <location>` - Save location (user|project)

**Interactive Mode:** Prompts for missing values if not provided as arguments.

**Important:** The API response includes an expiration date. If expired, the CLI warns users to contact support for manual database updates.

### 2. `sensay simple-organization-setup [folder-path]`
Main command that creates/reuses organization, user, and replica, then processes system message and training data.

**Arguments:**
- `[folder-path]` - Target folder (default: current directory)
- `-o, --organization-name <name>` - Organization name
- `-u, --user-name <name>` - User name
- `-e, --user-email <email>` - User email  
- `-r, --replica-name <name>` - Replica name

**Behavior:**
1. Loads existing project config if available (no prompts for saved values)
2. Creates or finds existing user
3. Creates or finds existing replica by name
4. Updates system message from `system-message.txt` if present
5. Clears existing training data
6. Uploads files from `training-data/` folder recursively
7. Polls training status and displays progress
8. Saves all configuration to `sensay.config.json`

### 3. `sensay interactive`
Interactive mode with menu-driven interface for all operations.

### 4. `sensay help-detailed`
Comprehensive help with examples, environment variables, and file structure documentation.

## Configuration

### Environment Variables
- `SENSAY_API_KEY` - API key (overrides config files)
- `SENSAY_ORGANIZATION_ID` - Organization ID
- `SENSAY_USER_ID` - User ID
- `SENSAY_BASE_URL` - API base URL (default: https://api.sensay.io)

### Config Files
1. **User Config** (`~/.sensay/config.json`)
   ```json
   {
     "apiKey": "your-api-key",
     "organizationId": "org-id"
   }
   ```

2. **Project Config** (`./sensay.config.json`)
   ```json
   {
     "organizationName": "My Organization",
     "userName": "John Doe",
     "userEmail": "john@example.com",
     "replicaName": "My Replica",
     "organizationId": "org-id",
     "userId": "user-id",
     "replicaId": "replica-id"
   }
   ```

## File Structure Requirements

### Training Data Setup
```
your-project/
├── system-message.txt     # Optional: LLM system message
├── training-data/         # Optional: Training files folder
│   ├── file1.txt         # Supported file types
│   ├── file2.md
│   ├── file3.json
│   └── subfolder/
│       └── file4.csv
└── sensay.config.json    # Auto-generated project config
```

### Supported File Types
- `.txt`, `.md`, `.json`, `.csv`, `.log`
- Maximum file size: 10MB
- Recursive folder scanning supported

## Development Commands

```bash
# Development
npm run dev              # Run with ts-node
npm run build           # Compile TypeScript
npm run start           # Run compiled JavaScript

# Quality
npm run lint            # ESLint checking
npm run typecheck       # TypeScript type checking
npm run clean           # Remove dist folder

# Testing
npm run test            # Run all tests
npm run test:e2e        # Run E2E tests only

# SDK Maintenance
npm run generate-sdk    # Download latest OpenAPI schema

# Manual testing
node dist/index.js claim-key --help
node dist/index.js simple-organization-setup --help
```

## API Integration

### Base URL
- Production: `https://api.sensay.io`
- API Version: `2025-03-25` (via X-API-Version header)

### Authentication
- `X-ORGANIZATION-SECRET`: API key from claim-key operation
- `X-USER-ID`: User ID (string type)
- `X-USER-ID-TYPE`: "string"

### Key Endpoints Used
- `POST /v1/api-keys/invites/{code}/redeem` - Claim API key
- `GET/POST /v1/users` - User management
- `GET/POST /v1/replicas` - Replica management
- `PUT /v1/replicas/{id}` - Update replica (system message)
- `POST /v1/replicas/{id}/training` - Upload training data
- `DELETE /v1/replicas/{id}/training` - Clear training data
- `GET /v1/replicas/{id}/training/status` - Check training status

## Design Principles

### Dual Mode Operation
**CRITICAL**: All operations must support both interactive prompts AND command-line arguments. This allows for:
- Interactive development/testing
- Automated CI/CD pipelines
- Scripting and automation
- User preference flexibility

### Configuration Persistence
- Project configs prevent re-prompting for the same values
- User configs provide sensible defaults across projects
- Environment variables enable CI/CD integration

### Error Handling
- Graceful API error handling with user-friendly messages
- Validation for email formats, required fields
- Clear feedback for expired organizations
- File processing error reporting

### User Experience
- Colored output with chalk for better readability
- Progress indicators for long-running operations
- File size formatting and skipped file reporting
- Clear success/failure feedback

## Extension Guidelines

### Adding New Commands
1. Create command file in `src/commands/`
2. Export setup function that registers with Commander.js
3. Import and call setup function in `src/index.ts`
4. Support both interactive and CLI argument modes
5. Add to interactive menu if appropriate

### Adding New API Endpoints
1. Download latest schema: `npm run generate-sdk`
2. Compare new schema with existing types in `src/generated/`
3. Update `src/generated/types.ts` with new interfaces
4. Add methods to `src/generated/api-client.ts` following existing patterns
5. Follow existing authentication and error handling patterns
6. Test the new endpoints thoroughly

### Adding New Configuration Options
1. Update interfaces in `src/types/api.ts`
2. Update `ConfigManager` class methods
3. Add environment variable support if needed
4. Update help documentation

## Testing Strategy

### Automated E2E Testing
The project includes comprehensive end-to-end tests using Jest and nock for API mocking:

**Test Coverage:**
- Complete organization setup workflow with system message and training data
- Handling existing users and replicas gracefully  
- Missing system message and training data scenarios
- Error handling (missing API key, API failures)
- File processing and type filtering
- Configuration management and persistence

**Test Structure:**
```
tests/
├── e2e/
│   ├── organization-setup.test.ts    # Main E2E test suite
│   └── test-fixtures/               # Test data documentation
└── setup.ts                        # Jest configuration
```

**Running Tests:**
```bash
npm run test           # All tests
npm run test:e2e       # E2E tests only
npm run build && npm test  # Full validation
```

### Manual Testing Workflow
1. Test claim-key command with valid/invalid inputs
2. Test simple-organization-setup with various folder structures
3. Verify config file creation and reuse
4. Test interactive mode flows
5. Verify error handling with invalid API keys
6. Test file processing with different file types and sizes

## Troubleshooting

### Common Issues
1. **"No API key found"** - Run `sensay claim-key` first
2. **"Organization expired"** - Contact support for database update
3. **"Training files not found"** - Check folder structure and file types
4. **Permission errors** - Check file/folder permissions for config directories

### Debug Mode
Use `--verbose` flag for detailed output (future enhancement).

### Logging
Currently uses console output. Future: Add file-based logging option.

## Future Enhancements

### Priority 1
- Add `--verbose` flag for debug output
- Implement retry logic for API failures
- Add progress bars for file uploads
- Support for additional file types

### Priority 2
- Add `sensay status` command to check current setup
- Implement `sensay validate` for configuration validation
- Add `sensay cleanup` for removing configurations
- Support for replica templates

### Priority 3
- Add automated tests
- Implement plugin system for custom commands
- Add configuration encryption for sensitive data
- Support for multiple environments/profiles

## Dependencies

### Runtime Dependencies
- `axios` - HTTP client for API calls
- `chalk` - Colored terminal output
- `commander` - CLI framework and argument parsing
- `inquirer` - Interactive prompts
- `fs-extra` - Enhanced file system operations
- `ora` - Elegant terminal spinners
- `dotenv` - Environment variable loading

### Development Dependencies
- `typescript` - TypeScript compiler
- `ts-node` - TypeScript execution
- `@types/*` - TypeScript type definitions
- `eslint` - Code linting
- `@typescript-eslint/*` - TypeScript ESLint rules

## Performance Considerations

- File processing is done in memory (10MB limit per file)
- Training status polling uses 5-second intervals
- Configuration files are cached in memory during execution
- API client reuses HTTP connections

## Security Considerations

- API keys stored in plain text config files (consider encryption)
- No sensitive data logged to console
- File content validation before upload
- Proper error handling to avoid information leakage