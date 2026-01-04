#!/bin/bash

# Script to build DailyTask Monitor APK for Android

echo "Building DailyTask Monitor APK..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if Firebase config is updated
if grep -q "YOUR_API_KEY" "config/firebase.js"; then
    echo -e "${RED}Error: Please update Firebase configuration in config/firebase.js${NC}"
    exit 1
fi

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}Installing dependencies...${NC}"
    npm install
fi

# Check if EAS CLI is installed
if ! command -v eas &> /dev/null; then
    echo -e "${YELLOW}Installing EAS CLI...${NC}"
    npm install -g eas-cli
fi

# Login to Expo if not already logged in
if ! expo whoami &> /dev/null; then
    echo -e "${YELLOW}Please login to Expo:${NC}"
    expo login
fi

# Build APK
echo -e "${GREEN}Building APK...${NC}"
eas build -p android --profile preview

echo -e "${GREEN}Build completed!${NC}"
echo "You can download the APK from the build URL provided above."

# Optional: Install on connected device
echo -e "${YELLOW}Do you want to install the APK on a connected device? (y/n)${NC}"
read -r response
if [[ "$response" =~ ^[Yy]$ ]]; then
    # This would require the APK file path
    echo "To install manually, use: adb install path-to-apk.apk"
fi

echo -e "${GREEN}Done!${NC}"