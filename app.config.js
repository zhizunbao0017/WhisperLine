// Dynamic Expo configuration
// This allows conditional plugin inclusion based on build profile

const fs = require('fs');
const path = require('path');

module.exports = function (config) {
  // NOTE: Environment variables are set in eas.json
  // EAS build system will set these automatically based on eas.json env configuration
  // No need to set them here to avoid conflicts
  
  const isProduction = process.env.EAS_BUILD_PROFILE === 'production' || 
                       process.env.NODE_ENV === 'production' ||
                       (!process.env.EAS_BUILD_PROFILE && !process.env.EXPO_PUBLIC_ENV);

  // Read base configuration from app.json (if it exists)
  // This satisfies expo doctor's requirement that app.config.js uses values from app.json
  let baseConfigFromJson = {};
  const appJsonPath = path.join(__dirname, 'app.json');
  if (fs.existsSync(appJsonPath)) {
    try {
      const appJsonContent = fs.readFileSync(appJsonPath, 'utf8');
      const appJson = JSON.parse(appJsonContent);
      baseConfigFromJson = appJson.expo || {};
    } catch (e) {
      console.warn('⚠️  Could not read app.json:', e.message);
    }
  }

  // Base configuration (merge app.json values with dynamic overrides)
  const baseConfig = {
    expo: {
      // Use values from app.json if available, otherwise use defaults
      name: baseConfigFromJson.name || "WhisperLine",
      slug: baseConfigFromJson.slug || "whisperline",
      version: baseConfigFromJson.version || "1.1.1",
      orientation: baseConfigFromJson.orientation || "portrait",
      icon: baseConfigFromJson.icon || "./assets/images/icon.png",
      scheme: baseConfigFromJson.scheme || "whisperline",
      userInterfaceStyle: baseConfigFromJson.userInterfaceStyle || "automatic",
      // CRITICAL: New Architecture is DISABLED for build stability
      // Reason: Some native modules may not fully support New Architecture yet
      // Plan: Keep disabled until app is successfully built and published
      // After successful App Store release, we can gradually enable and test
      // DO NOT ENABLE until all modules are verified compatible
      newArchEnabled: false,
      ios: {
        ...(baseConfigFromJson.ios || {}),
        supportsTablet: baseConfigFromJson.ios?.supportsTablet !== undefined ? baseConfigFromJson.ios.supportsTablet : true,
        infoPlist: {
          ...(baseConfigFromJson.ios?.infoPlist || {}),
          NSLocationWhenInUseUsageDescription: baseConfigFromJson.ios?.infoPlist?.NSLocationWhenInUseUsageDescription || "We need your location to get the current weather for your diary entry.",
          NSFaceIDUsageDescription: baseConfigFromJson.ios?.infoPlist?.NSFaceIDUsageDescription || "WhisperLine uses Face ID to securely lock and protect your entries.",
          NSPhotoLibraryUsageDescription: baseConfigFromJson.ios?.infoPlist?.NSPhotoLibraryUsageDescription || "Allow WhisperLine to access your photos to let you personalize your Companions and journal entries with your own images.",
          NSCameraUsageDescription: baseConfigFromJson.ios?.infoPlist?.NSCameraUsageDescription || "Allow WhisperLine to use your camera to let you capture photos for your Companions and journal entries.",
          ITSAppUsesNonExemptEncryption: baseConfigFromJson.ios?.infoPlist?.ITSAppUsesNonExemptEncryption !== undefined ? baseConfigFromJson.ios.infoPlist.ITSAppUsesNonExemptEncryption : false
        },
        bundleIdentifier: baseConfigFromJson.ios?.bundleIdentifier || "com.xietian.whisperline",
        buildNumber: baseConfigFromJson.ios?.buildNumber || "14"
      },
      android: {
        ...(baseConfigFromJson.android || {}),
        adaptiveIcon: baseConfigFromJson.android?.adaptiveIcon || {
          backgroundColor: "#E6F4FE",
          foregroundImage: "./assets/images/android-icon-foreground.png",
          backgroundImage: "./assets/images/android-icon-background.png",
          monochromeImage: "./assets/images/android-icon-monochrome.png"
        },
        edgeToEdgeEnabled: baseConfigFromJson.android?.edgeToEdgeEnabled !== undefined ? baseConfigFromJson.android.edgeToEdgeEnabled : true,
        predictiveBackGestureEnabled: baseConfigFromJson.android?.predictiveBackGestureEnabled !== undefined ? baseConfigFromJson.android.predictiveBackGestureEnabled : false,
        package: baseConfigFromJson.android?.package || "com.xietian.whisperline",
        permissions: baseConfigFromJson.android?.permissions || [
          "android.permission.CAMERA",
          "android.permission.READ_EXTERNAL_STORAGE",
          "android.permission.READ_MEDIA_IMAGES"
        ]
      },
      web: {
        ...(baseConfigFromJson.web || {}),
        output: baseConfigFromJson.web?.output || "static",
        favicon: baseConfigFromJson.web?.favicon || "./assets/images/favicon.png"
      },
      // CRITICAL: Read plugins from app.json to ensure expo-build-properties is included
      // This allows app.json to be the single source of truth for plugin configuration
      plugins: [
        // Read plugins from app.json, fallback to default if not present
        ...(baseConfigFromJson.plugins || [
          "expo-router",
          // CRITICAL: Only include expo-dev-client in development builds
          // In production builds, devDependencies are not installed, causing plugin resolution failures
          ...(isProduction ? [] : ["expo-dev-client"]),
          [
            "expo-image-picker",
            {
              photosPermission: "Allow WhisperLine to access your photos to let you personalize your Companions and journal entries with your own images.",
              cameraPermission: "Allow WhisperLine to use your camera to let you capture photos for your Companions and journal entries."
            }
          ],
          [
            "expo-splash-screen",
            {
              image: "./assets/images/icon.png",
              resizeMode: "contain",
              backgroundColor: "#03ACE2",
              dark: {
                image: "./assets/images/icon.png",
                resizeMode: "contain",
                backgroundColor: "#03ACE2"
              }
            }
          ]
        ])
      ],
      experiments: {
        ...(baseConfigFromJson.experiments || {}),
        typedRoutes: baseConfigFromJson.experiments?.typedRoutes !== undefined ? baseConfigFromJson.experiments.typedRoutes : true,
        // CRITICAL: Conditionally enable reactCompiler only in development
        // React Compiler can cause issues in production builds (Expo SDK 51+)
        // Override app.json value if it exists
        reactCompiler: !isProduction
      },
      extra: {
        ...(baseConfigFromJson.extra || {}),
        router: baseConfigFromJson.extra?.router || {},
        eas: {
          ...(baseConfigFromJson.extra?.eas || {}),
          projectId: baseConfigFromJson.extra?.eas?.projectId || "9685fd18-75f1-4c62-807b-e38eed6370ae"
        }
      }
    }
  };

  // Log the configuration for debugging
  if (isProduction) {
    console.log('📦 [Production Build] expo-dev-client plugin excluded');
    console.log('📦 [Production Build] reactCompiler disabled');
    console.log('📦 [Production Build] Source maps disabled');
  } else {
    console.log('🔧 [Development Build] expo-dev-client plugin included');
    console.log('🔧 [Development Build] reactCompiler enabled');
  }

  return baseConfig;
};

