# Inga

This README will be updated as the project progresses. It is a work in progress.
Any updates to the README will be communicated on Discord. 

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
- PostgreSQL is the backend database, including local development in Docker.

Expo SDK 58 uses the React Native New Architecture. Do not upgrade React or React Native on their own. Install Expo and React Native packages with `npx expo install` so Expo picks a compatible stable version.

## Prerequisites
- Docker Desktop. You will need it to be able to run and test the application.
- Node.js 22.13 or newer (this repo was initialized with Node 22.23.3)
- npm
- Python 3.12, 3.13, or 3.14 (this repo was initialized with Python 3.14.3)
- The recommended version is python 3.14 because the containers use that version.
- Xcode, for the iOS Simulator, if you have a Mac
- Android Studio, for the Android Emulator
- PyCharm, not strictly required but recommended for Python development. You can get a license to use it from JetBrains for free as a student. See https://www.jetbrains.com/community/education/#students for further details

## Repository setup

When you clone the repository, create three files in the backend/ directory:
- .env.local
- .env.staging
- .env.production

The reason we are using three separate files is that we 
want to be able to have different settings for each environment, 
and we want to keep the sensitive data out of the repository. You will see the benefits of this later,
but we will be able to deploy the application on different platforms without changing any of the code. 

Copy the contents of .env.example into each of these files and fill in the values that 
have been/will be provided for each environment.

You can copy and create the files quickly with the following commands:

```bash
cd backend
cp .env.example .env.local
cp .env.example .env.staging
cp .env.example .env.production
```

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

IMPORTANT: When you start the virtual environment for the first time, make sure that the project is 
using the interpreter inside the virtual environment. 
(.venv/bin/python or .venv\Scripts\python.exe). 
This will ensure that the virtual environment is automatically activated 
when you open the project in your IDE. If you don't know how to do this, please consult your PLs.
In Pycharm, you can set the interpreter in `Settings > Project > Python Interpreter`.
You might also want to navigate to `Settings > Tools > Terminal` and check the box `Activate virtualenv`.
Make sure you don't forget to click `Apply` and `OK` after changing the settings for them to take effect.
To test whether this worked, restart the editor and open a new terminal. You should see

```
(.venv) $
```
at the beginning of the prompt. It signals that your virtual environment is active. 
If you don't see it, please consult your PLs.

### 3. Backend dependencies

With the virtual environment active, from `backend/`:

```bash
python -m pip install -r requirements.txt
python -m pip install -e .
```

The editable install puts `config`, `api` and the other apps on the import path. That is what `DJANGO_SETTINGS_MODULE=config.settings` relies on, and it is what lets your IDE resolve imports.

The backend itself runs in Docker, together with its database, so migrations and tests are run inside the container. See [Running the backend application](#running-the-backend-application).

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

The backend and its database run in Docker. See [Running the backend application](#running-the-backend-application).

The container publishes port 8000, so `http://127.0.0.1:8000` reaches it from your machine. The iOS Simulator can use `127.0.0.1` and the Android Emulator reaches it through `10.0.2.2`.

For a physical device, add your computer's LAN IP to `DJANGO_ALLOWED_HOSTS` in `backend/.env.local`, then restart the container:

```bash
DJANGO_ALLOWED_HOSTS=localhost,127.0.0.1,10.0.2.2,192.168.1.20
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


## Running the backend application.

### 1. Starting the app
With docker desktop installed and running, 
you can run the backend application with the following command:

From /inga-native (the root of the repository):
```bash
docker compose up --build
```
It will take some time to start everything up, but once it is done, 
you can access the backend application at http://localhost:8000.


### 2. Running the tests
The tests/ directory contains some sample tests for the app. 
All tests should be placed inside this directory. For pytest to be able to detect them,
the filenames must start with 'test_'. In addition, the test classes must start with 'Test' 
and the test methods must start with 'test_'. You can put as many subdirectories as you want 
inside the tests/ directory, but make sure to include an __init__.py file in each of them.

With the containers successfully started, do the following:

#### 2.1 Find the container id of the backend container
```bash
docker ps -a
```
You should see a list of running containers. Look for the container with the name
`inga-native-backend` and copy its container id.

If it has not started yet, you can start it with the following command:
```bash
docker start <container_id>
```

#### 2.2 Run the tests
```bash
docker exec -it <container_id> pytest
```
The backend test suite should run and pass.

Alternatively, you can run the command below to run the tests without having to find the container id:
```bash
docker compose exec backend pytest
```

As a final alternative, you can use the docker desktop UI. Navigate to the backend's container and click on the "exec" button. 
Then type `pytest` and hit enter. You should see the tests run and pass.

When you are done, you can stop the containers with the following command:
```bash
docker compose down   
```

If you have changed any of the dependencies in requirements.txt, 
you will need to rebuild the containers with the following command:
```bash
docker compose up --build
```

Similarly, if you have changed any of the application code, you will need to rebuild the container that runs the backend application with the following command:
```bash
docker compose up --build --force-recreate backend
```

Do NOT change the Dockerfile or docker-compose.yml files without approval from your PLs.



## Project structure

The backend has one Django app per workstream, so that parallel work does not collide in a single `models.py`:

```text
backend/src/
  config/        settings, root urls, wsgi/asgi
  api/           health check
  accounts/      the User model (AUTH_USER_MODEL) and authentication
  projects/      projects, sites and regions
  submissions/   the forms field workers submit
  photos/        image records and Cloudflare R2
```

Each app is mounted at `/api/<app>/` by `config/urls.py` and owns its own `urls.py`, so adding an endpoint does not mean editing a shared file.

`AUTH_USER_MODEL` is `accounts.User`, set before there is any data, because changing the user model later means dropping the database.

## Frontend checks

From `frontend/`:

```bash
npx tsc --noEmit
npm run lint
```

CI runs both of these, plus the backend tests, on every pull request.

## Development seed data

After migrations, run this from the repository root:

```bash
docker compose exec backend python src/manage.py seed_demo
```

This extends `seed_projects` to 100 sample farms, including similar names,
different regions and missing addresses. Use `--farms 150` for a larger set.
Once the village and supply models are merged and migrated, the same command
also adds village links and count/measure supply examples. It works before
those models exist and does not introduce their schema.

Rerunning retains existing records, custom form definitions, edited addresses,
chosen villages and retired supplies. Use it for development/demo data.
