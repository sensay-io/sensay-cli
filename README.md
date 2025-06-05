# Sensay CLI

A powerful command-line tool for managing Sensay API operations, including organization setup, user management, and replica training.

## 🚀 Quick Start

### Installation

#### Option 1: From Source (Recommended for Development)
```bash
# Clone the repository
git clone <repository-url>
cd sensay-internal-api-tool

# Install dependencies
npm install

# Build the project
npm run build

# Link globally (optional)
npm link
```

#### Option 2: Direct Usage
```bash
# Run directly with Node.js
node dist/index.js [command]

# Or use npm scripts for development
npm run dev [command]
```

### Uninstalling

If you used `npm link` for global installation:

```bash
# Unlink the global command
npm unlink -g

# Or specifically unlink sensay-cli
npm unlink -g sensay-cli

# Remove from current project (if linked locally)
npm unlink

# Verify removal
which sensay  # Should return nothing
```

If you installed globally via other methods:
```bash
# Remove global installation
npm uninstall -g sensay-cli
```

### Prerequisites
- Node.js 18+ 
- npm or yarn
- Valid Sensay API access

## 📋 Basic Usage

### 1. Claim Your API Key
First, claim your API key using the internal code:

```bash
# Interactive mode
sensay claim-key

# With arguments
sensay claim-key -o "My Organization" -n "John Doe" -e "john@example.com"
```

### 2. Set Up Your Project
Create an organization, user, and replica with training data:

```bash
# Interactive setup in current folder
sensay simple-organization-setup

# Setup specific folder with arguments
sensay simple-organization-setup ./my-project -r "My Replica Name"
```

### 3. Prepare Your Files
Create the following structure in your project folder:

```
your-project/
├── system-message.txt     # Optional: AI system message
├── training-data/         # Optional: Training files
│   ├── conversation1.txt
│   ├── knowledge.md
│   └── examples/
│       └── more-data.json
└── sensay.config.json    # Auto-generated
```

## 🎯 Commands

### `sensay claim-key`
Claim an API key using internal credentials.

**Options:**
- `-o, --organization-name <name>` - Organization name
- `-n, --name <name>` - Your name
- `-e, --email <email>` - Your email address
- `-s, --save-location <location>` - Save to 'user' or 'project' config

**Examples:**
```bash
sensay claim-key
sensay claim-key -o "ACME Corp" -n "Jane Smith" -e "jane@acme.com"
```

### `sensay simple-organization-setup [folder]`
Complete setup workflow: create organization, user, replica, and process training data.

**Options:**
- `-o, --organization-name <name>` - Organization name
- `-u, --user-name <name>` - User name
- `-e, --user-email <email>` - User email
- `-r, --replica-name <name>` - Replica name

**Examples:**
```bash
sensay simple-organization-setup
sensay simple-organization-setup ./my-bot -r "Customer Support Bot"
```

### `sensay interactive`
Launch interactive menu for all operations.

### `sensay help-detailed`
Show comprehensive help with examples and file structure.

## ⚙️ Configuration

### Environment Variables
```bash
export SENSAY_API_KEY="your-api-key"
export SENSAY_ORGANIZATION_ID="your-org-id"
export SENSAY_USER_ID="your-user-id"
export SENSAY_BASE_URL="https://api.sensay.io"  # Optional
```

### Configuration Files

**User Config** (`~/.sensay/config.json`):
```json
{
  "apiKey": "your-api-key",
  "organizationId": "org-12345"
}
```

**Project Config** (`./sensay.config.json`):
```json
{
  "organizationName": "My Organization",
  "userName": "John Doe",
  "userEmail": "john@example.com",
  "replicaName": "My Bot",
  "organizationId": "org-12345",
  "userId": "user-67890",
  "replicaId": "replica-abcdef"
}
```

## 📁 File Processing

### Supported File Types
- `.txt` - Plain text files
- `.md` - Markdown files
- `.json` - JSON data files
- `.csv` - CSV data files
- `.log` - Log files

### File Size Limits
- Maximum file size: 10MB per file
- Recursive folder scanning supported
- Files exceeding limits are automatically skipped

### Training Data Structure
```
training-data/
├── conversations/
│   ├── support-chat-1.txt
│   └── support-chat-2.txt
├── knowledge-base/
│   ├── product-info.md
│   └── faq.json
└── examples.csv
```

## 🔧 Development

### Available Scripts
```bash
npm run dev         # Run with ts-node (development)
npm run build       # Compile TypeScript
npm run start       # Run compiled version
npm run lint        # ESLint code checking
npm run typecheck   # TypeScript type checking
npm run clean       # Remove build artifacts
npm run generate-sdk # Download latest OpenAPI schema for SDK updates
```

### Project Structure
```
src/
├── commands/       # CLI command implementations
├── config/         # Configuration management
├── generated/      # Auto-generated API SDK
├── types/          # TypeScript type definitions
├── utils/          # Utility functions
└── index.ts        # Main CLI entry point
```

## 🎨 Features

### ✨ Dual Mode Operation
Every command supports both:
- **Interactive prompts** - Great for development and learning
- **Command-line arguments** - Perfect for automation and CI/CD

### 🎯 Smart Configuration
- **Persistent settings** - No need to re-enter information
- **Multiple config locations** - User-wide and project-specific
- **Environment variable support** - CI/CD friendly

### 📊 Visual Feedback
- **Progress spinners** - Real-time operation status
- **Colored output** - Easy-to-read terminal interface
- **File processing summary** - Clear reporting of what's processed

### 🔄 Training Status
- **Real-time polling** - Monitor training progress
- **ASCII progress display** - Visual file processing status
- **Error reporting** - Clear feedback on failed operations

## 🚨 Troubleshooting

### Common Issues

**"No API key found"**
```bash
# Solution: Claim your API key first
sensay claim-key
```

**"Organization expired"**
```
⚠️  WARNING: Your organization has expired!
Please contact support to update the expiration date manually in the database.
```

**API Error with Details**
```
❌ Failed to claim API key:
Status: 400
Error: Invalid invitation code
Request ID: xyz1::reg1:reg1::ab3c4-1234567890123-0123456789ab
Fingerprint: 14fceadd84e74ec499afe9b0f7952d6b

💡 Possible issues:
   • Invalid internal code (check if GNEFSHAF is correct)
   • Code may have expired or already been used
   • Organization name may already exist
   • Email format or validation issues
```

**"No training data found"**
- Check that `training-data/` folder exists
- Verify files have supported extensions (.txt, .md, .json, .csv, .log)
- Ensure files are under 10MB each

**Permission Errors**
```bash
# Ensure config directory is writable
chmod 755 ~/.sensay
```

### Debug Mode
```bash
# Run with verbose output (future feature)
sensay --verbose simple-organization-setup
```

### Getting Help
```bash
sensay --help                    # Basic help
sensay help-detailed             # Comprehensive guide
sensay [command] --help          # Command-specific help
```

## 🔐 Security Notes

- API keys are stored in plain text config files
- No sensitive data is logged to console
- File contents are validated before upload
- Consider using environment variables for production

## 📝 Examples

### Complete Workflow
```bash
# 1. Claim API key
sensay claim-key -o "ACME Corp" -n "Developer" -e "dev@acme.com"

# 2. Create project structure
mkdir my-ai-bot
cd my-ai-bot
mkdir training-data
echo "You are a helpful customer service assistant." > system-message.txt
echo "Customer: Hello\nBot: Hi! How can I help you today?" > training-data/example.txt

# 3. Setup everything
sensay simple-organization-setup -r "Customer Service Bot"

# 4. Check results
cat sensay.config.json
```

### CI/CD Integration
```bash
# Set environment variables in your CI/CD pipeline
export SENSAY_API_KEY=${{ secrets.SENSAY_API_KEY }}
export SENSAY_ORGANIZATION_ID=${{ secrets.SENSAY_ORG_ID }}

# Run automated setup
sensay simple-organization-setup ./production-bot \
  -u "CI/CD Bot" \
  -e "cicd@company.com" \
  -r "Production Assistant"
```

### Batch Operations
```bash
# Setup multiple bots
for project in bot1 bot2 bot3; do
  sensay simple-organization-setup ./$project -r "$project-replica"
done
```

## 🔄 SDK Maintenance

### Updating the Generated SDK

When the Sensay API schema changes, update the SDK:

```bash
# Download the latest OpenAPI schema
npm run generate-sdk

# Compare the new schema with existing types
# Update src/generated/ files as needed
# Verify the changes
npm run build && npm run typecheck

# Commit the updates
git add src/generated/ && git commit -m "Update SDK for API schema changes"
```

**Note:** The SDK types and client are manually maintained to ensure proper error handling and type safety. The `generate-sdk` command only downloads the latest schema for comparison.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Verify code quality: `npm run lint && npm run typecheck`
5. Build: `npm run build`
6. Submit a pull request

## 📄 License

UNLICENSED - Proprietary software by Sensay

---

**Need help?** Run `sensay help-detailed` for comprehensive documentation and examples.