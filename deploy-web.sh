#!/bin/bash

# Script to deploy DailyTask Monitor as a web app

echo "Building DailyTask Monitor for web..."

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "Installing dependencies..."
    npm install
fi

# Build for web
echo "Building for web..."
expo build:web

# Check if build was successful
if [ -d "web-build" ]; then
    echo "Web build completed successfully!"
    echo "Files are in the web-build directory"
    
    # Optional: Deploy to Firebase Hosting
    echo "Do you want to deploy to Firebase Hosting? (y/n)"
    read -r response
    if [[ "$response" =~ ^[Yy]$ ]]; then
        echo "Deploying to Firebase Hosting..."
        firebase deploy --only hosting
    fi
    
    # Optional: Serve locally
    echo "Do you want to serve the web app locally? (y/n)"
    read -r response
    if [[ "$response" =~ ^[Yy]$ ]]; then
        echo "Starting local server..."
        npx serve web-build -p 3000
    fi
else
    echo "Web build failed!"
    exit 1
fi