# CLAUDE.md - Project Guidelines and Learning

This file contains important guidelines and patterns learned during development of the Sensay CLI tool.

## Project Overview

This is a TypeScript CLI tool for managing Sensay API operations including.

- The tool must be able to perform the same operations in interactive mode in non-interactive mode.
- Interactive mode does not require commands or parameters to run.
- Always prioritize great user experiences for interactive mode.
- The tool uses by default the current directory as the `project` path. It can be overridden with an Option.
- The project uses the same name of entities and their properties used by the Sensay API.
- All Commands and Options should be documented in the Help. Help is accessible via the Option `--help` or `-h`. The style of the help should be the same as the style returned by `wget --help`
- Interactive mode is the default behavior when running `sensay` without any command
- The `help` command exists but is hidden/undocumented and triggers the same output as `--help`

## Options

- Each Option can be set in different ways, following this priorities: (1) environment variables (2) user settings file `~/.sensay/sensay.config.json` (3) project settings in `sensay.config.json` in the project directory
- Each Option ID has two versions: a long name for command line argument (e.g. `--verbose`), a short name for command line usage (e.g. `-v`). The 
- The Option `-v` outputs API requests METHOD and URL; and status code of the Response to the debug console, in case of Errors also the Response Body is outputted to the error console.
- The Option `-vv` outputs API requests METHOD, URL, HEADERS, and BODY; as well as the RESPONSE CODE, HEADERS, and BODY of the response.
- **Security**: API Keys and other secrets in headers/body should be obfuscated in console output (only show first 4 and last 4 characters, e.g., `sk12...xy89`).

## Task rules

- All new and changed functionalities must be tested automatically via end to end tests, that run the code in non-interactive mode.
- For each new or changed functionality you must ask the User to test the functionality manually in interactive mode. You must provide a test case with detailed step-by-step instruction which include values to input.
- Code must be easy to read, easy to maintain, follow DDD (Domain Driven Development) rules, follow Clean Code rules. 
- Keep the instructions in CLAUDE.MD in sync with the decision taken by the User of Claude Code
- All entities you create on GitHub must have the tag `claude-code` assigned, if the entity has tags, e.g. Issues§.

## Commands

- Commands must reuse the code for their interactive and non-interactive mode.

### Interactive mode

- When an Option used by a Command (for example OrganizationUUID) is already specified, it still asked to the user, but it is set as default option. The Option `silent` skips this step.
- When an Option used by a Command is not specified, it is saved to the project settings file, if the Option `save` is specified.

#### Entities dialog

- Entities are Selectable via a CLI GUI Dialog similar to Commander, which allows to navigate the entities hierarchy via arrows. (e.g. first panel shows Organizations, second panel shows Users, third panel shows Replicas)
- Pressing the letter `r` when the dialog is open refreshes the entities of the current level of the hierarchy. (e.g. if the panel showing Replicas is selected, the Replicas shown in that panel are LISTED again and refreshed on the screen, and the current selected Replica is not unselected)

### Non-interactive mode

- Each Command has three version: a long name (e.g. `--verbose`) and a short version (e.g. `-v`)


## Key Architecture Decisions

### 1. On-Demand SDK Generation

**IMPORTANT**: Always use CLI tools for SDK generation, never write custom generation code.

- Use `openapi-typescript-codegen` to generate complete TypeScript client from OpenAPI schema
- Schema is automatically downloaded from `https://api.sensay.io/schema/internal`
- Generation happens on-demand via `npm run generate-sdk` command
- Generated files are in `src/generated/` and should never be manually edited

```bash
# SDK Generation Command
npx openapi-typescript-codegen \
  --input src/generated/schema.json \
  --output src/generated \
  --client fetch
```

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

The build process uses on-demand SDK generation:

```json
{
  "scripts": {
    "build": "tsc",
    "dev": "ts-node src/index.ts",
    "generate-sdk": "./scripts/generate-sdk.sh"
  }
}
```

SDK generation is triggered manually when needed with `npm run generate-sdk`.

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
- The API key provided by the user is provided via the option (--apikey)
- When logging API requests/responses, always obfuscate sensitive data like API keys (show only first 4 and last 4 characters)

### 10. Testing Philosophy

- Use `jest --passWithNoTests` for test script

## Development Workflow

1. **Make changes** to source code
2. **Generate SDK when needed** with `npm run generate-sdk` (when API changes)
3. **Use generated services** directly in code
4. **Test compilation** with `npm run typecheck`
5. **Test functionality** with `npm run dev`
6. **Build for production** with `npm run build`

## Standard Configuration Priority Pattern

**ALL COMMANDS** must follow this exact priority order for configuration values:

1. **Command line arguments** (highest priority)
2. **Environment variables** 
3. **Interactive prompts** (handled differently based on `silent` option):
   - **CASE 1: without `silent` option**: ask the user for the value, but default it to the current value from priority chain
   - **CASE 2: with `silent` option**: do not ask, use current or default value, and if there is no value set and the option is mandatory, return an error
4. **Project configuration** (`./sensay.config.json`)
5. **User configuration** (`~/.sensay/config.json`) (lowest priority)

### Implementation Pattern

**IMPORTANT**: Use the reusable `OptionResolver` component to handle configuration priority properly following DDD and Clean Code principles.

```typescript
import { OptionResolver } from '../utils/option-resolver';

// 1. Create option resolver with configuration context
const optionResolver = new OptionResolver(folderPath, options);

// 2. Resolve required options with proper priority handling
const replicaName = await optionResolver.resolve({
  key: 'replicaName',
  cliValue: options.replicaName,
  promptMessage: 'Replica name:',
  isRequired: true,
  validator: (input: string) => input.trim().length > 0
});

const message = await optionResolver.resolve({
  key: 'message',
  cliValue: options.message,
  promptMessage: 'Message to send:',
  isRequired: false
});
```

The `OptionResolver` class handles:
- Configuration loading and merging
- Priority chain resolution (CLI → ENV → Interactive → Project → User)
- Interactive vs non-interactive mode logic
- Silent mode handling
- Input validation
- Error handling for missing required values

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
