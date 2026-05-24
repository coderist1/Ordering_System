# Mobile App (Expo)

React Native mobile app connected to the Django API.

## Setup

```bash
cd mobile
npm install
```

## Run with Expo Go

1. Start the Django backend: `python manage.py runserver`
2. In the mobile directory, run: `npm start`
3. Scan the QR code with Expo Go (iOS/Android)

## API Configuration

The app uses `EXPO_PUBLIC_API_URL` when it is set.

For local development on Android emulator, the app falls back to your machine's Expo host or `10.0.2.2`.

For Expo Go on a physical device or for a standalone APK, set a real backend URL before building:

```bash
set EXPO_PUBLIC_API_URL=https://ordering-system-15kz.onrender.com
```

On Windows PowerShell for one session:

```powershell
$env:EXPO_PUBLIC_API_URL = 'https://ordering-system-15kz.onrender.com'
```

If you change backend hosts, update the environment variable before rebuilding the APK.

## Build APK

Use Expo Go for development testing, then build the APK with EAS:

```bash
cd mobile
npx expo start
eas build -p android --profile preview
```

The project already configures `preview` and `production` Android builds as APKs in `eas.json`.

## Features

- JWT Authentication
- Dashboard with order summary
- Order listing
- Product browsing
- Profile management

## Project Structure

```
mobile/src/
├── api/client.ts     # API client with all endpoints
├── context/AuthContext.tsx  # Authentication context
├── screens/
│   ├── LoginScreen.tsx
│   └── DashboardScreen.tsx
└── types/index.ts    # TypeScript types
```