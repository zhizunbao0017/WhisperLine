// Dynamic Expo configuration
// This allows conditional plugin inclusion based on build profile

module.exports = function (config) {
  const isProduction = process.env.EAS_BUILD_PROFILE === 'production' || 
                       process.env.NODE_ENV === 'production' ||
                       (!process.env.EAS_BUILD_PROFILE && !process.env.EXPO_PUBLIC_ENV);

  // Base configuration from app.json
  const baseConfig = {
    expo: {
      name: "WhisperLine",
      slug: "whisperline",
      version: "1.1.1",
      orientation: "portrait",
      icon: "./assets/images/icon.png",
      scheme: "whisperline",
      userInterfaceStyle: "automatic",
      newArchEnabled: true,
      ios: {
        supportsTablet: true,
        infoPlist: {
          NSLocationWhenInUseUsageDescription: "We need your location to get the current weather for your diary entry.",
          NSFaceIDUsageDescription: "WhisperLine uses Face ID to securely lock and protect your entries.",
          NSPhotoLibraryUsageDescription: "Allow WhisperLine to access your photos to let you personalize your Companions and journal entries with your own images.",
          NSCameraUsageDescription: "Allow WhisperLine to use your camera to let you capture photos for your Companions and journal entries.",
          ITSAppUsesNonExemptEncryption: false
        },
        bundleIdentifier: "com.xietian.whisperline",
        buildNumber: "14"
      },
      android: {
        adaptiveIcon: {
          backgroundColor: "#E6F4FE",
          foregroundImage: "./assets/images/android-icon-foreground.png",
          backgroundImage: "./assets/images/android-icon-background.png",
          monochromeImage: "./assets/images/android-icon-monochrome.png"
        },
        edgeToEdgeEnabled: true,
        predictiveBackGestureEnabled: false,
        package: "com.xietian.whisperline",
        permissions: [
          "android.permission.CAMERA",
          "android.permission.READ_EXTERNAL_STORAGE",
          "android.permission.READ_MEDIA_IMAGES"
        ]
      },
      web: {
        output: "static",
        favicon: "./assets/images/favicon.png"
      },
      plugins: [
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
      ],
      experiments: {
        typedRoutes: true,
        reactCompiler: true
      },
      extra: {
        router: {},
        eas: {
          projectId: "9685fd18-75f1-4c62-807b-e38eed6370ae"
        }
      }
    }
  };

  // Log the configuration for debugging
  if (isProduction) {
    console.log('📦 [Production Build] expo-dev-client plugin excluded');
  } else {
    console.log('🔧 [Development Build] expo-dev-client plugin included');
  }

  return baseConfig;
};

