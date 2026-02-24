# StimIQ Patient App

An [Expo](https://expo.dev) app (iOS & Android) for the patient-side of the StimIQ platform.

---

## Screens

| Screen | Description |
|--------|-------------|
| Dashboard | Overview with links to all patient features |
| Daily Report | 10-question PROM check-in submitted to the backend |
| Standard Tests | List of available standardized assessments |
| → Hand Movement Test | Camera-based wrist-tracking test (15 s video capture) |
| → Finger Tapping Test | Camera-based finger-tap test (15 s video capture) |
| → Speech Task | Three-step microphone recording task |
| IMU Tracking | Continuous accelerometer capture via `expo-sensors` |

---

## Tech stack

- [Expo SDK 54](https://docs.expo.dev/) with the **New Architecture** enabled
- [expo-router](https://expo.github.io/router/) – file-based navigation
- [expo-sensors](https://docs.expo.dev/versions/latest/sdk/sensors/) – accelerometer (IMU tracking)
- [expo-av](https://docs.expo.dev/versions/latest/sdk/av/) – microphone recording (speech task)
- [expo-camera](https://docs.expo.dev/versions/latest/sdk/camera/) – camera capture (hand & finger tests)
- [@react-native-async-storage/async-storage](https://react-native-async-storage.github.io/async-storage/) – local persistence

---

## Getting started

### Prerequisites

- Node.js ≥ 18
- [Expo CLI](https://docs.expo.dev/get-started/installation/) (`npm install -g expo-cli`)
- iOS: Xcode ≥ 15 (macOS only) **or** the [Expo Go](https://expo.dev/go) app
- Android: Android Studio (SDK ≥ 33) **or** the [Expo Go](https://expo.dev/go) app

### Install dependencies

```bash
cd patient-app
npm install
```

### Configure the backend URL

Copy the example env file and set your backend URL:

```bash
cp .env.example .env
# Edit .env and set EXPO_PUBLIC_API_BASE_URL to your backend address
```

### Run the app

```bash
# Start the Metro bundler (scan the QR code with Expo Go)
npm start

# Or target a specific platform
npm run ios
npm run android
npm run web
```

---

## Building for the App Store / Google Play

Use [EAS Build](https://docs.expo.dev/build/introduction/) for cloud builds:

```bash
npm install -g eas-cli
eas build --platform ios
eas build --platform android
```

Configure your `eas.json` before the first build — see the [EAS Build docs](https://docs.expo.dev/build/setup/).

---

## Camera-based tests — a note on hand landmark detection

The web version of the hand movement and finger tapping tests uses
[MediaPipe Tasks Vision](https://developers.google.com/mediapipe/solutions/vision/hand_landmarker)
to extract wrist/finger landmarks in real time via WebAssembly.

On iOS and Android, MediaPipe is not available directly in React Native.
The current mobile implementation captures a 15-second video clip using `expo-camera`.
To enable the same real-time landmark pipeline on native, integrate
[react-native-vision-camera](https://mrousavy.com/react-native-vision-camera/) with a
hand-pose TFLite / Core ML model and wire the extracted coordinates to
`processLineFollowSession()` / `processFingerTapSession()` in `lib/apiClient.ts`.
