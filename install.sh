#!/usr/bin/env bash

# Sensay CLI Installation Script
# This script automates the installation process for the Sensay CLI tool

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_color() {
    local color=$1
    local message=$2
    echo -e "${color}${message}${NC}"
}

# Function to check if a command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to get Node.js version
get_node_version() {
    node -v 2>/dev/null | cut -d'v' -f2
}

# Function to compare versions
version_ge() {
    test "$(echo "$@" | tr " " "\n" | sort -V | head -n 1)" != "$1"
}

# Header
print_color "$BLUE" "╔══════════════════════════════════════════╗"
print_color "$BLUE" "║        Sensay CLI Installation           ║"
print_color "$BLUE" "╚══════════════════════════════════════════╝"
echo

# Check for Node.js
print_color "$YELLOW" "Checking prerequisites..."

if ! command_exists node; then
    print_color "$RED" "❌ Node.js is not installed!"
    print_color "$YELLOW" "Please install Node.js 18+ from https://nodejs.org/"
    exit 1
fi

NODE_VERSION=$(get_node_version)
if ! version_ge "$NODE_VERSION" "18.0.0"; then
    print_color "$RED" "❌ Node.js version $NODE_VERSION is too old!"
    print_color "$YELLOW" "Please upgrade to Node.js 18+ from https://nodejs.org/"
    exit 1
fi

print_color "$GREEN" "✓ Node.js $NODE_VERSION found"

# Check for npm
if ! command_exists npm; then
    print_color "$RED" "❌ npm is not installed!"
    print_color "$YELLOW" "npm should come with Node.js. Please reinstall Node.js."
    exit 1
fi

NPM_VERSION=$(npm -v 2>/dev/null)
print_color "$GREEN" "✓ npm $NPM_VERSION found"

# Check if already in sensay-cli directory
if [ -f "package.json" ] && grep -q '"name": "sensay-cli"' package.json 2>/dev/null; then
    print_color "$YELLOW" "Already in sensay-cli directory. Installing from current location..."
    INSTALL_DIR=$(pwd)
else
    # Ask for installation directory
    print_color "$YELLOW" "\nWhere would you like to install Sensay CLI?"
    print_color "$YELLOW" "Default: ~/sensay-cli"
    read -p "Installation directory: " INSTALL_DIR
    
    if [ -z "$INSTALL_DIR" ]; then
        INSTALL_DIR="$HOME/sensay-cli"
    fi
    
    # Expand ~ to home directory
    INSTALL_DIR="${INSTALL_DIR/#\~/$HOME}"
    
    # Check if directory exists
    if [ -d "$INSTALL_DIR" ]; then
        print_color "$YELLOW" "\nDirectory $INSTALL_DIR already exists."
        read -p "Do you want to overwrite it? (y/N): " OVERWRITE
        if [[ ! "$OVERWRITE" =~ ^[Yy]$ ]]; then
            print_color "$RED" "Installation cancelled."
            exit 1
        fi
        rm -rf "$INSTALL_DIR"
    fi
    
    # Clone repository
    print_color "$YELLOW" "\nCloning Sensay CLI repository..."
    if ! git clone https://github.com/sensay-io/sensay-cli.git "$INSTALL_DIR" 2>/dev/null; then
        print_color "$RED" "❌ Failed to clone repository"
        print_color "$YELLOW" "Please check your internet connection and try again"
        exit 1
    fi
    
    cd "$INSTALL_DIR"
fi

# Install dependencies
print_color "$YELLOW" "\nInstalling dependencies..."
if ! npm install --silent; then
    print_color "$RED" "❌ Failed to install dependencies"
    exit 1
fi
print_color "$GREEN" "✓ Dependencies installed"

# Build the project
print_color "$YELLOW" "\nBuilding Sensay CLI..."
if ! npm run build >/dev/null 2>&1; then
    print_color "$RED" "❌ Build failed"
    print_color "$YELLOW" "Trying to run TypeScript compiler directly..."
    if ! npx tsc >/dev/null 2>&1; then
        print_color "$RED" "❌ TypeScript compilation failed"
        exit 1
    fi
fi
print_color "$GREEN" "✓ Build completed"

# Ask about global installation
print_color "$YELLOW" "\nWould you like to install Sensay CLI globally?"
print_color "$YELLOW" "This will allow you to use 'sensay' command from anywhere."
read -p "Install globally? (Y/n): " GLOBAL_INSTALL

if [[ ! "$GLOBAL_INSTALL" =~ ^[Nn]$ ]]; then
    print_color "$YELLOW" "\nInstalling globally (may require sudo password)..."
    
    # Try npm link first (preferred method)
    if npm link 2>/dev/null || sudo npm link 2>/dev/null; then
        print_color "$GREEN" "✓ Global installation successful"
        GLOBAL_INSTALLED=true
    else
        print_color "$YELLOW" "npm link failed, trying alternative method..."
        
        # Alternative: create a symlink manually
        SENSAY_BIN="/usr/local/bin/sensay"
        if sudo ln -sf "$INSTALL_DIR/dist/index.js" "$SENSAY_BIN" 2>/dev/null; then
            # Make it executable
            sudo chmod +x "$SENSAY_BIN"
            
            # Create wrapper script
            sudo tee "$SENSAY_BIN" > /dev/null << EOF
#!/usr/bin/env node
require('$INSTALL_DIR/dist/index.js');
EOF
            sudo chmod +x "$SENSAY_BIN"
            print_color "$GREEN" "✓ Global installation successful (manual symlink)"
            GLOBAL_INSTALLED=true
        else
            print_color "$YELLOW" "⚠️  Could not install globally. You can still run locally."
            GLOBAL_INSTALLED=false
        fi
    fi
else
    GLOBAL_INSTALLED=false
fi

# Create convenience scripts
print_color "$YELLOW" "\nCreating convenience scripts..."

# Create run.sh for local execution
cat > "$INSTALL_DIR/run.sh" << 'EOF'
#!/usr/bin/env bash
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
node "$DIR/dist/index.js" "$@"
EOF
chmod +x "$INSTALL_DIR/run.sh"

# Create dev.sh for development mode
cat > "$INSTALL_DIR/dev.sh" << 'EOF'
#!/usr/bin/env bash
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$DIR" && npm run dev -- "$@"
EOF
chmod +x "$INSTALL_DIR/dev.sh"

print_color "$GREEN" "✓ Convenience scripts created"

# Installation complete
echo
print_color "$GREEN" "╔══════════════════════════════════════════╗"
print_color "$GREEN" "║     Installation Complete! 🎉            ║"
print_color "$GREEN" "╚══════════════════════════════════════════╝"
echo

# Show usage instructions
if [ "$GLOBAL_INSTALLED" = true ]; then
    print_color "$BLUE" "You can now use Sensay CLI from anywhere:"
    print_color "$YELLOW" "  sensay --help"
    print_color "$YELLOW" "  sensay claim-key"
    print_color "$YELLOW" "  sensay interactive"
else
    print_color "$BLUE" "You can run Sensay CLI using:"
    print_color "$YELLOW" "  cd $INSTALL_DIR"
    print_color "$YELLOW" "  ./run.sh --help"
    print_color "$YELLOW" "  ./run.sh claim-key"
    print_color "$YELLOW" "  ./run.sh interactive"
    echo
    print_color "$BLUE" "Or for development mode:"
    print_color "$YELLOW" "  ./dev.sh --help"
fi

echo
print_color "$BLUE" "Next steps:"
print_color "$YELLOW" "1. Claim your API key: sensay claim-key"
print_color "$YELLOW" "2. Set up a project: sensay simple-organization-setup"
print_color "$YELLOW" "3. Read the docs: sensay help-detailed"

echo
print_color "$GREEN" "Happy coding! 🚀"

# Offer to run initial setup
echo
read -p "Would you like to claim your API key now? (y/N): " CLAIM_NOW
if [[ "$CLAIM_NOW" =~ ^[Yy]$ ]]; then
    if [ "$GLOBAL_INSTALLED" = true ]; then
        sensay claim-key
    else
        "$INSTALL_DIR/run.sh" claim-key
    fi
fi