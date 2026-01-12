#!/bin/bash
# Script to inject runtime configuration into the built application
# This should be run after the build step in the deployment pipeline

set -e

BUILD_DIR="${1:-build}"
GOOGLE_CLIENT_ID="${GOOGLE_CLIENT_ID:-}"
GOOGLE_API_KEY="${GOOGLE_API_KEY:-}"
GOOGLE_DRIVE_FOLDER_ID="${GOOGLE_DRIVE_FOLDER_ID:-}"
GOOGLE_PHOTOS_CLIENT_ID="${GOOGLE_PHOTOS_CLIENT_ID:-}"

if [ ! -d "$BUILD_DIR" ]; then
    echo "Error: Build directory not found: $BUILD_DIR"
    exit 1
fi

CONFIG_FILE="$BUILD_DIR/config.js"

if [ ! -f "$CONFIG_FILE" ]; then
    echo "Error: Config file not found: $CONFIG_FILE"
    exit 1
fi

echo "Injecting runtime configuration..."

# Function to format value - returns null or quoted string
format_value() {
    if [ -z "$1" ]; then
        echo "null"
    else
        # Escape double quotes and backslashes in the value
        local escaped=$(echo "$1" | sed 's/\\/\\\\/g' | sed 's/"/\\"/g')
        echo "\"$escaped\""
    fi
}

cat > "$CONFIG_FILE" << EOF
// Runtime configuration - Injected during deployment
window.APP_CONFIG = {
    GOOGLE_CLIENT_ID: $(format_value "$GOOGLE_CLIENT_ID"),
    GOOGLE_API_KEY: $(format_value "$GOOGLE_API_KEY"),
    GOOGLE_DRIVE_FOLDER_ID: $(format_value "$GOOGLE_DRIVE_FOLDER_ID"),
    GOOGLE_PHOTOS_CLIENT_ID: $(format_value "$GOOGLE_PHOTOS_CLIENT_ID")
};
EOF

echo "Runtime configuration injected successfully."
echo "Config file location: $CONFIG_FILE"
