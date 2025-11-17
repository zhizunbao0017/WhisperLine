#!/bin/bash
# Launch the app in simulator first, then start Expo dev server

SIMULATOR_ID="3969D318-F908-4362-8E77-D2A0A13EC30E"
BUNDLE_ID="com.xietian.whisperline"

echo "Launching app in simulator..."
xcrun simctl launch "$SIMULATOR_ID" "$BUNDLE_ID"

# Wait a moment for the app to start
sleep 2

echo "Starting Expo development server..."
npx expo start --dev-client

