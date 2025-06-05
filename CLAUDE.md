# CLAUDE.md - Project Guidelines and Learning

This file contains important guidelines and patterns learned during development of the Sensay CLI tool.

## Project Overview

This is a TypeScript CLI tool for managing Sensay API operations including:
- API key claiming with internal codes
- Organization, user, and replica setup
- Training data management and upload (text and file-based)
- Interactive and command-line modes

## Key Architecture Decisions

### 1. Fully Automated SDK Generation

**IMPORTANT**: Always use CLI tools for SDK generation, never write custom generation code.

- Use `openapi-typescript-codegen` to generate complete TypeScript client from OpenAPI schema
- Schema is automatically downloaded from `https://api.sensay.io/schema`
- Generation happens before every build (`prebuild` and `predev` scripts)
- Generated files are in `src/generated/` and should never be manually edited

```bash
# SDK Generation Command
npx openapi-typescript-codegen \
  --input src/generated/schema.json \
  --output src/generated \
  --client fetch
```

### 2. Use Generated Services Directly

**NEVER** create wrapper classes. Always use the generated services directly:

```typescript
// ✅ CORRECT - Use generated services
import { ApiKeysService, UsersService, ReplicasService, OpenAPI } from '../generated/index';

// ❌ WRONG - Don't create custom wrapper classes
// import { SensayApiClient } from './custom-wrapper';
```

### 3. OpenAPI Configuration Pattern

Configure the global OpenAPI client once per command:

```typescript
// Configure authentication headers
OpenAPI.HEADERS = {
  'X-API-Version': '2025-03-25',
  'X-ORGANIZATION-SECRET': effectiveConfig.apiKey,
};

if (effectiveConfig.userId) {
  OpenAPI.HEADERS['X-USER-ID'] = effectiveConfig.userId;
  // Note: Do NOT specify X-USER-ID-TYPE
}
```

### 4. Configuration Management Issues

**CRITICAL**: Object spread operator fails with config objects. Always use manual property copying:

```typescript
// ❌ WRONG - Object spread fails
const result = { ...userConfig, ...projectConfig, ...envConfig };

// ✅ CORRECT - Manual property copying
const result: SensayConfig = {};
for (const key in userConfig) {
  if (userConfig.hasOwnProperty(key)) {
    (result as any)[key] = (userConfig as any)[key];
  }
}
// Repeat for projectConfig and envConfig
```

### 5. Error Handling Pattern

Use the generated `ApiError` class for proper error handling:

```typescript
import { ApiError } from '../generated/index';

try {
  // API call
} catch (error: any) {
  if (error instanceof ApiError) {
    console.error(`Status: ${error.status}`);
    console.error(`Error: ${error.message}`);
    
    // Extract additional error details from body
    if (error.body) {
      const body = error.body as any;
      if (body.request_id) {
        console.error(`Request ID: ${body.request_id}`);
      }
      if (body.fingerprint) {
        console.error(`Fingerprint: ${body.fingerprint}`);
      }
    }
  }
}
```

### 6. Project Structure

```
sensay-cli/
├── src/
│   ├── generated/            # Auto-generated SDK (never edit manually)
│   ├── commands/             # CLI command implementations
│   ├── config/               # Configuration management
│   ├── utils/                # Utility functions
│   └── index.ts              # Main CLI entry point
├── scripts/                  # Build and generation scripts
└── package.json
```

### 7. Build Process

The build process automatically generates the SDK:

```json
{
  "scripts": {
    "prebuild": "npm run generate-sdk",
    "build": "tsc",
    "predev": "npm run generate-sdk", 
    "dev": "ts-node src/index.ts",
    "generate-sdk": "./scripts/generate-sdk.sh"
  }
}
```

### 8. Import Patterns

For development (`npm run dev` with ts-node):
```typescript
// ✅ CORRECT - No .js extensions for ts-node
import { setupClaimKeyCommand } from './commands/claim-key';
```

The TypeScript compiler handles the extensions during build.

### 9. Security Considerations

- Never commit `sensay.config.json` (contains API keys)
- Always add config files to `.gitignore`
- API keys are stored in project config, user config, or environment variables
- Priority: env vars > project config > user config

### 10. Testing Philosophy

- No complex e2e tests (user prefers simpler approach)
- Focus on TypeScript compilation and basic functionality
- Use `jest --passWithNoTests` for test script

## Development Workflow

1. **Make changes** to source code
2. **Auto-generate SDK** (happens automatically with `npm run dev` or `npm run build`)
3. **Use generated services** directly in code
4. **Test compilation** with `npm run typecheck`
5. **Test functionality** with `npm run dev`
6. **Build for production** with `npm run build`

## Standard Configuration Priority Pattern

**ALL COMMANDS** must follow this exact priority order for configuration values:

1. **Command line arguments** (highest priority)
2. **Environment variables** 
3. **Interactive prompts** (only if missing and not in non-interactive mode)
4. **Project configuration** (`./sensay.config.json`)
5. **User configuration** (`~/.sensay/config.json`) (lowest priority)

### Implementation Pattern
```typescript
// 1. Get command line options
let { replicaName, message } = options;

// 2. Load configs
const { projectConfig } = await ConfigManager.getMergedConfig(folderPath);
const effectiveConfig = await ConfigManager.getEffectiveConfig(folderPath);

// 3. Check for missing values and handle based on mode
if (!replicaName) {
  if (options.nonInteractive) {
    // Try project config, then user config, then fail
    replicaName = projectConfig.replicaName;
    if (!replicaName) {
      console.error('❌ Missing --replica-name parameter in non-interactive mode');
      process.exit(1);
    }
  } else {
    // Interactive prompt with default from config
    const { replica } = await inquirer.prompt({
      type: 'input',
      name: 'replica',
      message: 'Replica name:',
      default: projectConfig.replicaName,
      validate: (input: string) => input.trim().length > 0
    });
    replicaName = replica;
  }
}
```

**CRITICAL**: Never change this priority order. This pattern ensures consistency across all commands and proper automation support.

## Common Patterns

### API Service Usage
```typescript
// API Key claiming
const response = await ApiKeysService.postV1ApiKeysInvitesRedeem(code, {
  organizationName,
  name,
  email
});

// User management
const user = await UsersService.getV1UsersMe();
const newUser = await UsersService.postV1Users({ name, email });

// Replica management
const replicas = await ReplicasService.getV1Replicas();
const replica = await ReplicasService.postV1Replicas({ name, systemMessage });
await ReplicasService.putV1Replicas(uuid, { systemMessage });

// Training data (text-based)
const knowledgeBase = await TrainingService.postV1ReplicasTraining(replicaUuid);
await TrainingService.putV1ReplicasTraining(replicaUuid, knowledgeBase.knowledgeBaseID, {
  rawText: content
});

// Training data (file-based with signed URLs)
const signedUrl = await TrainingService.getV1ReplicasTrainingFilesUpload(replicaUuid, filename);
await fetch(signedUrl.signedURL!, {
  method: 'PUT',
  body: fileBuffer,
  headers: { 'Content-Type': 'application/octet-stream' }
});
```

### Configuration Loading
```typescript
const { projectConfig } = await ConfigManager.getMergedConfig(targetPath);
const effectiveConfig = await ConfigManager.getEffectiveConfig(targetPath);
```

### Progress Management
```typescript
const progress = new ProgressManager();
const spinner = progress.createSpinner('id', 'message');
spinner.succeed('Success message');
```

## Training File Management

The tool supports both text-based and file-based training approaches:

### Supported File Types
- **Text files**: `.txt`, `.md`, `.json`, `.csv`, `.log` (processed as text)
- **Binary files**: `.pdf`, `.docx` (uploaded via signed URLs)
- **File size limit**: 50MB (API limit)

### Training Process
1. **Scan** training-data folder for supported files
2. **Text files**: Create knowledge base entry, then update with raw text
3. **Binary files**: Get signed URL, upload file directly to cloud storage
4. **Monitor** upload status and provide user feedback

### File Structure
The user can organize files in any folder structure. When running the command, they specify the folder path:

```
user-folder/                 # User-specified folder path
├── training-data/           # Training files directory
│   ├── company-info.txt    # Text-based training
│   ├── features.md         # Markdown training
│   └── manual.pdf          # File-based training
├── system-message.txt      # Replica personality/behavior
└── sensay.config.json      # Project configuration (generated)
```

Usage: `sensay simple-organization-setup user-folder/`

## Key Learnings

1. **Always use CLI tools** for code generation instead of custom scripts
2. **Manual property copying** is required for configuration merging
3. **Generated services** provide better type safety than custom wrappers
4. **OpenAPI global configuration** is cleaner than per-instance config
5. **Remove .js extensions** from TypeScript imports for ts-node compatibility
6. **Object spread operators fail** with certain object property descriptors
7. **API error handling** requires extracting details from error.body
8. **Training uploads** require two different approaches: text vs file-based
9. **Signed URLs** are used for binary file uploads to cloud storage

## Dependencies

- `openapi-typescript-codegen` - For SDK generation
- `commander` - CLI framework
- `inquirer` - Interactive prompts  
- `chalk` - Terminal colors
- `ora` - Progress spinners
- `fs-extra` - File operations
- `axios` - HTTP client (used by generated code)

This approach ensures:
- ✅ Fully automated SDK generation
- ✅ Type-safe API interactions
- ✅ No manual maintenance of API client code
- ✅ Always up-to-date with latest API schema
- ✅ Proper error handling with generated types