# Inga

Mobile app and API in one repository. The two apps stay separate.

## Architecture

```text
Expo / React Native
        |
        | HTTPS / JSON REST API
        v
Django REST Framework
        |
        v
Database
```

- React Native is the mobile UI framework.
- Expo provides the React Native development and build tooling.
- The same TypeScript app targets iOS and Android. Native `ios/` and `android/` projects are generated later with Expo Continuous Native Generation, only when a build needs them.
- Django is a separate backend application.
- Django REST Framework exposes the JSON API the mobile app calls.
- SQLite is the local database for this initial setup.

Expo SDK 57 uses the React Native New Architecture. Do not upgrade React or React Native on their own. Install Expo and React Native packages with `npx expo install` so Expo picks a compatible stable version.

## Prerequisites

- Node.js 22.13 or newer (this repo was initialized with Node 22.23.3)
- npm
- Python 3.12, 3.13, or 3.14 (this repo was initialized with Python 3.14.3)
- Xcode, for the iOS Simulator
- Android Studio, for the Android Emulator

## Local development

### 1. Frontend dependencies

```bash
cd frontend
npm ci
```

### 2. Python virtual environment

From `backend/`:

```bash
python3 -m venv .venv
source .venv/bin/activate
```

On Windows: `.venv\Scripts\activate`

### 3. Backend dependencies

With the virtual environment active, from `backend/`:

```bash
python -m pip install -r requirements.txt
python manage.py migrate
```

### 4. Frontend environment

```bash
cp frontend/.env.example frontend/.env
```

Set `EXPO_PUBLIC_API_URL` for the device you are using. Do not commit `.env`.

| Where the app runs | `EXPO_PUBLIC_API_URL` |
| --- | --- |
| iOS Simulator | `http://127.0.0.1:8000` |
| Android Emulator | `http://10.0.2.2:8000` |
| Physical iPhone or Android on the same Wi-Fi | `http://<your computer LAN IP>:8000` |

`localhost` on a phone is the phone, not your computer. Find the computer address in system network settings. Do not commit that address.

Restart Expo after changing `.env`.

### 5. Run Django

From `backend/`, with the virtual environment active:

```bash
python manage.py runserver 0.0.0.0:8000
```

`0.0.0.0` lets a phone on the same network reach the API. The iOS Simulator can use `127.0.0.1`. The Android Emulator reaches the computer through `10.0.2.2`.

For a physical device, include your computer's LAN IP in `DJANGO_ALLOWED_HOSTS` before starting Django:

```bash
DJANGO_ALLOWED_HOSTS=localhost,127.0.0.1,10.0.2.2,192.168.1.20 python manage.py runserver 0.0.0.0:8000
```

Replace `192.168.1.20` with your own address.

Check the API:

```bash
curl http://127.0.0.1:8000/api/health/
```

Expected body: `{"status":"ok"}`.

### 6. Run Expo

From `frontend/`:

```bash
npm run start
```

### 7. iOS

In the Expo terminal, press `i` to open the iOS Simulator. Or run `npm run ios`.

### 8. Android

Start an Android Emulator in Android Studio. In the Expo terminal, press `a`. Or run `npm run android`.

Use `EXPO_PUBLIC_API_URL=http://10.0.2.2:8000` for the emulator.

### 9. Physical device

Install Expo Go on the phone. Phone and computer must be on the same Wi-Fi. Start Expo, then scan the QR code.

Set `EXPO_PUBLIC_API_URL` to `http://<computer LAN IP>:8000` and add that same IP to `DJANGO_ALLOWED_HOSTS`.

## CORS

Browser CORS applies to Expo web, not to the iOS or Android app. In local debug, Django allows the Expo dev origins `http://localhost:8081` and `http://localhost:19006`. Production must set `CORS_ALLOWED_ORIGINS` to an explicit list. The project does not allow every origin.
