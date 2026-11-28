# ScamShield AI — Android Application & Notification Shield Build Guide

This document outlines how to build, test, and package the ScamShield AI Android mobile application with live notification monitoring.

## Prerequisites
- Node.js & pnpm installed.
- Java 21 (or OpenJDK 21) installed.
- Android Studio & Android SDK (API 34+) installed.
- Environment variable `ANDROID_HOME` configured (e.g. `export ANDROID_HOME=$HOME/Library/Android/sdk`).

## 1. Install Dependencies
```bash
pnpm install
```

## 2. Sync Capacitor Android Platform
```bash
npx cap sync android
```

## 3. Build & Run Debug APK
```bash
cd android
export JAVA_HOME="/opt/homebrew/opt/openjdk@21/libexec/openjdk.jdk/Contents/Home"
./gradlew assembleDebug
```
The debug APK will be generated at:
`android/app/build/outputs/apk/debug/app-debug.apk`

## 4. Install on Emulator or Real Device
```bash
adb install android/app/build/outputs/apk/debug/app-debug.apk
```

## 5. Notification Shield Setup on Device
1. Open ScamShield AI app on Android.
2. Tap the **Notification Shield** tab at the bottom navigation.
3. Tap **Grant Access** to open Android Notification Access settings.
4. Enable **ScamShield AI** in the system notification listeners list.
5. Return to the app and toggle **Auto-Monitor Incoming Messages** ON.
6. Incoming WhatsApp, SMS, or Telegram messages containing suspicious keywords (KYC, block, lottery, etc.) will be automatically inspected by the backend API and alert you instantly via native push notifications.
