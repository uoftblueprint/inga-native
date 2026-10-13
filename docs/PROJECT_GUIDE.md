# Inga Native: project lead's guide

This explains how the project actually works, from the frameworks down to individual lines of config, and then explains each Sprint 1 issue with the background needed to review it.

It assumes you can program but have not used Django, React Native or Docker in anger. Read it in order the first time. After that it is a reference.

## Contents

- [Part 1. What we are building](#part-1-what-we-are-building)
  - [1.1 The product](#11-the-product)
  - [1.2 The two repositories](#12-the-two-repositories)
  - [1.3 The stack, and why each piece is there](#13-the-stack-and-why-each-piece-is-there)
- [Part 2. Django](#part-2-django)
  - [2.1 The mental model: project vs app](#21-the-mental-model-project-vs-app)
  - [2.2 What happens when a request arrives](#22-what-happens-when-a-request-arrives)
  - [2.3 `backend/src/config/settings.py`, line by line](#23-backendsrcconfigsettingspy-line-by-line)
  - [2.4 URL routing](#24-url-routing)
  - [2.5 Views, and what DRF adds](#25-views-and-what-drf-adds)
  - [2.6 Models, migrations and the ORM](#26-models-migrations-and-the-orm)
  - [2.7 `manage.py`, `wsgi.py`, `asgi.py`](#27-managepy-wsgipy-asgipy)
- [Part 3. Python packaging and config files](#part-3-python-packaging-and-config-files)
  - [3.1 `requirements.txt`](#31-requirementstxt)
  - [3.2 `pyproject.toml`](#32-pyprojecttoml)
  - [3.3 `pytest.toml`](#33-pytesttoml)
  - [3.4 The three environment files](#34-the-three-environment-files)
  - [3.5 The import path trap, worth understanding properly](#35-the-import-path-trap-worth-understanding-properly)
- [Part 4. Docker](#part-4-docker)
  - [4.1 The core idea](#41-the-core-idea)
  - [4.2 `backend/Dockerfile`, line by line](#42-backenddockerfile-line-by-line)
  - [4.3 `docker-compose.yaml`, line by line](#43-docker-composeyaml-line-by-line)
  - [4.4 The commands you will actually use](#44-the-commands-you-will-actually-use)
- [Part 5. The database](#part-5-the-database)
  - [5.1 Postgres, and what Neon is](#51-postgres-and-what-neon-is)
  - [5.2 The connection string](#52-the-connection-string)
  - [5.3 Transactions and `ATOMIC_REQUESTS`](#53-transactions-and-atomicrequests)
- [Part 6. The frontend](#part-6-the-frontend)
  - [6.1 React, React Native and Expo](#61-react-react-native-and-expo)
  - [6.2 `app.json`](#62-appjson)
  - [6.3 File-based routing with expo-router](#63-file-based-routing-with-expo-router)
  - [6.4 `app/index.tsx`, the current home screen](#64-appindextsx-the-current-home-screen)
  - [6.5 `services/api.ts`](#65-servicesapits)
  - [6.6 Why the API URL differs per device](#66-why-the-api-url-differs-per-device)
  - [6.7 `tsconfig.json`](#67-tsconfigjson)
  - [6.8 ESLint](#68-eslint)
- [Part 7. The pieces not yet built](#part-7-the-pieces-not-yet-built)
  - [7.1 JWT authentication](#71-jwt-authentication)
  - [7.2 Cloudflare R2 and presigned URLs](#72-cloudflare-r2-and-presigned-urls)
  - [7.3 Offline support](#73-offline-support)
- [Part 8. Process](#part-8-process)
  - [8.1 `.github/workflows/ci.yml`](#81-githubworkflowsciyml)
  - [8.2 Branch protection and the review flow](#82-branch-protection-and-the-review-flow)
  - [8.3 Conventions worth setting now](#83-conventions-worth-setting-now)
- [Part 9. The Sprint 1 issues](#part-9-the-sprint-1-issues)
  - [9.1 Dependency order](#91-dependency-order)
  - [9.2 Setup issues, for you](#92-setup-issues-for-you)
  - [9.3 Authentication: Aryan (senior) and Ethan (junior)](#93-authentication-aryan-senior-and-ethan-junior)
  - [9.4 Database schema: Olivia (senior) and Ginni (junior)](#94-database-schema-olivia-senior-and-ginni-junior)
  - [9.5 Images to R2: Bryan (senior) and April (junior)](#95-images-to-r2-bryan-senior-and-april-junior)
  - [9.6 Form submission: Cindy (senior) and Jasmine (junior)](#96-form-submission-cindy-senior-and-jasmine-junior)
  - [9.7 Labels and milestone](#97-labels-and-milestone)
- [Part 10. How to get proficient quickly](#part-10-how-to-get-proficient-quickly)
- [Part 11. Open decisions](#part-11-open-decisions)

---

# Part 1. What we are building

## 1.1 The product

Inga field workers drive to farms, hand over supplies (tree seeds, plants) and record what they delivered and what the land looks like. Today that is paper and memory. We are building a phone app that lets them:

- log in with an account an admin created for them
- pick the site they are standing on
- record what they delivered
- take photos
- submit, including when there is no signal

The offline requirement is the hard part and is deliberately **not** in Sprint 1.

## 1.2 The two repositories

| Repo | What it is | Status |
| --- | --- | --- |
| `uoftblueprint/inga` | Last year's admin dashboard, Ruby on Rails 8.1 | Finished, never deployed |
| `uoftblueprint/inga-native` | This year's mobile app and API | What we are building |

The old repo matters for one reason: its **data model** is good, and if we match its shape, the dashboard can later be pointed at our database. We are not sharing a database with it, and we are not modifying it.

What the old schema established, which we should mirror in spirit:

```
Project          a programme, e.g. "Inga Alley Cropping, Honduras"
  └── Subproject a specific farm or site, with an address and a Region
        └── LogEntry   one visit: who, when, and a JSON blob of what was recorded
Region           a named area with latitude and longitude
User + UserRole  accounts with roles (admin, reporter, analyst)
```

The clever part of that design is `Project.log_schema`. Each project defines its own form fields as JSON, for example:

```json
{ "Inga seeds": "numerical", "Citrus trees": "numerical", "Soil tested": "boolean" }
```

and a `LogEntry.metadata` holds the filled-in answers. That is how "items delivered and quantity" already works, without an items table. Only three field types exist: `numerical`, `boolean`, `text`.

Things we are free to design from scratch, because the old app has nothing usable: image storage (it has no photo feature at all), authentication (its auth is Rails sessions and browser cookies, useless to a mobile app), and the database engine (it uses a local SQLite file, we use Postgres on Neon).

## 1.3 The stack, and why each piece is there

```
   Phone (Expo / React Native, TypeScript)
          |
          |  HTTPS, JSON, with a JWT in the Authorization header
          v
   Django + Django REST Framework  (Python)
          |                      \
          | SQL                   \  hands back a presigned URL
          v                        v
   Postgres (Neon)            Cloudflare R2  <-- phone uploads the photo directly
```

- **React Native** draws real native iOS and Android UI from one TypeScript codebase. It is not a web page in a wrapper.
- **Expo** is the toolchain around React Native: dev server, build service, and a library of native modules (camera, secure storage) you would otherwise wire up in Xcode and Android Studio by hand.
- **Django** is the Python web framework: URL routing, database layer, admin site, migrations.
- **Django REST Framework (DRF)** sits on Django and makes it good at JSON APIs rather than HTML pages.
- **Postgres** is the database. **Neon** is a company that hosts Postgres.
- **JWT** is the login token format.
- **Cloudflare R2** is file storage for photos. Photos never pass through Django.

---

# Part 2. Django

## 2.1 The mental model: project vs app

Django has two levels of organisation and the naming is unhelpful.

A **project** is the whole deployable thing. Ours lives in `backend/src/` and its configuration package is called `config/`. It holds settings, the root URL table, and the server entrypoints.

An **app** is a self-contained feature module: its own models, views, URLs and migrations. A project is a list of apps. Apps are just Python packages listed in `INSTALLED_APPS`.

We have five apps:

```
backend/src/
  config/        the project: settings, root urls, wsgi/asgi
  api/           health check only
  accounts/      the User model and authentication
  projects/      Project, Site, Region
  submissions/   the forms field workers submit
  photos/        photo records and R2
```

The split exists for a human reason, not a technical one. Four pairs working in one `models.py` for two weeks would produce constant merge conflicts. One app per workstream means each pair mostly edits files nobody else touches.

## 2.2 What happens when a request arrives

```
HTTP request
  -> MIDDLEWARE, top to bottom          (security, CORS, sessions, auth)
  -> ROOT_URLCONF: config/urls.py       match the path against urlpatterns
  -> include() delegates to an app's urls.py
  -> the view function runs             (talks to models, returns a Response)
  -> MIDDLEWARE, bottom to top
HTTP response
```

Everything below is one of those steps.

## 2.3 `backend/src/config/settings.py`, line by line

This file is just a Python module. Django imports it and reads its uppercase module-level names. Anything lowercase is ignored by Django and is ours.

### Lines 13-18, imports

```python
import os
from pathlib import Path

import dj_database_url
from django.core.exceptions import ImproperlyConfigured
from dotenv import load_dotenv
```

`dj_database_url` turns a connection string like `postgres://user:pass@host:5432/dbname` into the nested dictionary Django wants. `python-dotenv` reads a `.env`-style file into environment variables.

### Line 21, the path anchor

```python
BASE_DIR = Path(__file__).resolve().parent.parent
```

`__file__` is `backend/src/config/settings.py`. `.resolve()` makes it absolute, then two `.parent` hops go `config/` to `src/`. So **`BASE_DIR` is `backend/src`**, not `backend`. This trips people up constantly, and it is why the next line needs another `.parent`.

### Line 23, loading the env file

```python
load_dotenv(BASE_DIR.parent / ".env.local")
```

`BASE_DIR.parent` is `backend/`, so this reads `backend/.env.local` and copies its keys into `os.environ`.

Two things to know. First, `load_dotenv` does **not** overwrite variables that already exist, so inside Docker, where compose has already injected them, this line is a harmless no-op. Second, it was previously bare `load_dotenv()`, which looks for a file called `.env` and so never found `.env.local` at all.

### Line 29, the secret key

```python
SECRET_KEY = os.environ.get("DJANGO_SECRET_KEY")
```

Django signs sessions, password reset tokens and anything else needing a tamper-proof signature with this. If it leaks, those signatures can be forged. Each environment has its own, and `backend/generate_random_key.py` prints a new one.

### Line 32, debug mode

```python
DEBUG = os.environ.get("DJANGO_DEBUG", "true").lower() in {"1", "true", "yes"}
```

With `DEBUG = True`, an error returns a full stack trace including local variables and settings. It must be off outside local dev.

This line was the most serious bug we have found. It previously read:

```python
DEBUG = os.environ.get("DJANG0_DEBUG", True)   # DJANG0, with a zero
```

Two faults at once. The typo meant `DJANGO_DEBUG` was never read, so it always fell back to `True`. And environment variables are always **strings**, so even where a variable named `DJANG0_DEBUG` was set to `"false"`, Python saw a non-empty string, which is truthy. There was no spelling of false that turned debug off, in any environment. Comparing against a set of known-true strings fixes both faults.

### Lines 35-39, allowed hosts

```python
ALLOWED_HOSTS = [host.strip() for host in os.environ.get(...).split(",") if host.strip()]
```

A whitelist of `Host:` headers Django will answer. A request for an unlisted host is rejected. This is why a physical phone hitting `192.168.1.20:8000` fails until that IP is added.

### Lines 44-58, installed apps

`django.contrib.*` are built in: `admin` is the auto-generated admin site, `auth` is users and permissions, `contenttypes` tracks model types, and `sessions`, `messages`, `staticfiles` are self-evident. Then third-party (`corsheaders`, `rest_framework`), then ours.

Adding an app here is what makes Django look for its models and migrations.

### Lines 60-69, middleware

A stack of wrappers around every request, run top-down on the way in and bottom-up on the way out. `CorsMiddleware` must sit high so it can add headers to responses generated further down. `CsrfViewMiddleware` protects form posts. `AuthenticationMiddleware` is what puts `request.user` in place.

### Line 71, the root URL table

```python
ROOT_URLCONF = "config.urls"
```

The module Django imports to find `urlpatterns`. This was `"src.config.urls"`, which only resolved inside the container. See section 3.5, it is worth understanding properly.

### Lines 73-86, templates

Server-rendered HTML config. We barely use it, but the Django admin does, so it must stay.

### Line 88, WSGI

```python
WSGI_APPLICATION = "config.wsgi.application"
```

WSGI is the standard interface between a Python web app and a production web server. In development `runserver` provides its own, so this matters only on deploy.

### Lines 94-112, the database

```python
DATABASE_URL = os.environ.get("DATABASE_URL")
if not DATABASE_URL:
    raise ImproperlyConfigured("DATABASE_URL is not set. ...")

default_config = dj_database_url.config(default=DATABASE_URL,
                                        conn_max_age=600,
                                        conn_health_checks=True)

default_config["ATOMIC_REQUESTS"] = True
default_config["ENGINE"] = "django.db.backends.postgresql"

DATABASES = {'default': default_config}
```

This was `os.environ["DATABASE_URL"]`, which raises a bare `KeyError`. Since neither `.env.staging` nor `.env.production` defines `DATABASE_URL`, neither could start, and the error said nothing useful. Now it names the fix.

- `conn_max_age=600` keeps a database connection alive for 10 minutes rather than reconnecting on every request. Postgres connections are expensive to open.
- `conn_health_checks=True` pings a reused connection before trusting it.
- `ATOMIC_REQUESTS=True` wraps **every single request** in a database transaction. If a view raises, every write it made is rolled back. Good default for an app where a half-written submission is worse than no submission. It has a side effect worth knowing: every request now touches the database, even one that reads no models. That is exactly why our health-check test needs `@pytest.mark.django_db`, and why CI caught it when local SQLite runs did not.
- `ENGINE` is forced to postgresql, so SQLite is not an option here.

### Lines 116-118, the user model

```python
AUTH_USER_MODEL = "accounts.User"
DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"
```

`AUTH_USER_MODEL` is the single most important early decision in a Django project. Django ships a `User` model, and if you use it and later need to add a field or change the login identifier, you cannot swap it out without dropping the database, because dozens of foreign keys point at it. Defining our own empty subclass up front costs nothing and keeps every door open.

`DEFAULT_AUTO_FIELD` makes new primary keys 64-bit integers.

### Lines 124-137, password validators

Rules applied when a password is set: not too similar to the username, minimum length, not in a common-password list, not all numeric.

### Lines 143-149, internationalisation

`USE_TZ = True` means Django stores all datetimes in UTC and converts on display. Always leave this on.

### Lines 161-165, email

`MAILERS` is the Django 6.1 replacement for the older `EMAIL_BACKEND`, which is deprecated until Django 7.0. The console backend prints emails to the terminal instead of sending them.

### Lines 169-181, CORS

Browsers refuse cross-origin requests unless the server opts in. This affects Expo running in a **browser** only; the real iOS and Android apps are not browsers and ignore CORS entirely. In debug we allow the Expo dev server origins; in production an explicit list comes from the environment. We never allow all origins.

## 2.4 URL routing

`config/urls.py`:

```python
urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/", include("api.urls")),
    path("api/accounts/", include("accounts.urls")),
    path("api/projects/", include("projects.urls")),
    path("api/submissions/", include("submissions.urls")),
    path("api/photos/", include("photos.urls")),
]
```

Django tries each pattern in order against the path. `include()` chops off the matched prefix and hands the rest to that app's `urls.py`. A request for `/api/accounts/login/` matches `api/accounts/`, and `accounts/urls.py` then sees `login/`.

This is why each pair can add endpoints without touching a shared file: their app's `urls.py` is already wired in.

`api/urls.py` is the one real example today:

```python
urlpatterns = [path("health/", health, name="health")]
```

giving `/api/health/`. The `name` lets you generate the URL by name elsewhere rather than hardcoding the string.

## 2.5 Views, and what DRF adds

`api/views.py`:

```python
from rest_framework.decorators import api_view
from rest_framework.response import Response

@api_view(["GET"])
def health(request):
    return Response({"status": "ok"})
```

A plain Django view takes a request and returns a response, and you would do your own JSON encoding. DRF's `@api_view` wraps it so that:

- only the listed HTTP methods are accepted, others get `405`
- `request.data` is parsed from JSON automatically
- `Response` takes Python objects and negotiates the output format
- DRF's authentication and permission machinery can hook in

The three DRF concepts to learn, in order of importance:

**Serializers** convert model instances to JSON and, crucially, validate incoming JSON before it becomes a model. They are the equivalent of a form.

**Generic views and ViewSets** package the common patterns. `ListAPIView` is "return all of these as JSON". `CreateAPIView` is "validate and save one". A `ModelViewSet` is all five CRUD operations at once.

**Permissions** are small classes answering "may this request proceed?", set globally in a `REST_FRAMEWORK` dict or per view.

## 2.6 Models, migrations and the ORM

A model is a Python class that defines a database table:

```python
class Region(models.Model):
    name = models.CharField(max_length=200, unique=True)
    latitude = models.DecimalField(max_digits=10, decimal_places=6, null=True)
    longitude = models.DecimalField(max_digits=10, decimal_places=6, null=True)
```

Django adds an `id` column automatically. You then query without writing SQL:

```python
Region.objects.filter(name__startswith="Hon").order_by("name")
```

**Migrations** are the part that surprises people. Changing a model does not change the database. You generate a migration, which is a Python file describing the change, commit it, and apply it:

```bash
python src/manage.py makemigrations    # writes e.g. projects/migrations/0002_....py
python src/manage.py migrate           # applies anything unapplied
```

Rules for the team:

1. **Migrations are committed to git.** They are source code.
2. Never edit a migration that has been applied anywhere. Add a new one.
3. If two people generate migrations on the same app at the same time, git merges both files happily and Django then complains about a split history. Fix with `makemigrations --merge`.
4. CI runs `makemigrations --check --dry-run`, which fails if a model changed without a migration. That check exists because a forgotten migration breaks everyone else's database, not yours.

`accounts/migrations/0001_initial.py` is worth opening once. It is the full `AbstractUser` table spelled out: username with a uniqueness constraint and a validator, password, the `is_staff` / `is_active` / `is_superuser` flags, `date_joined`, and many-to-many links to groups and permissions. Our model body is empty, but the migration is not, because it inherits all of that.

## 2.7 `manage.py`, `wsgi.py`, `asgi.py`

`manage.py` is the CLI entrypoint. Its one interesting line:

```python
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
```

`setdefault` means an existing environment variable wins, which is how you point it at different settings without editing code.

Commands worth knowing: `runserver`, `migrate`, `makemigrations`, `createsuperuser`, `shell` (a Python REPL with Django loaded, excellent for poking at data), `check`, `dbshell`.

`wsgi.py` and `asgi.py` expose the app to a production server, synchronous and asynchronous respectively. We do not touch them yet.
---

# Part 3. Python packaging and config files

This part is the least glamorous and the most common source of "it works on my machine".

## 3.1 `requirements.txt`

```
asgiref
Django
django-cors-headers
djangorestframework
sqlparse
pytest
pytest-django
python-dotenv
pytest-env
dj-database-url
psycopg2
psycopg[binary]
```

A flat list of packages for `pip install -r requirements.txt`.

- `asgiref` and `sqlparse` are Django's own dependencies, listed explicitly here.
- `django-cors-headers` provides the CORS middleware.
- `dj-database-url` parses the connection string.
- `python-dotenv` reads the `.env.*` files.
- `pytest`, `pytest-django`, `pytest-env` are the test stack.
- `psycopg` is the Postgres driver.

**Two known issues, deliberately not yet fixed:**

Nothing is pinned to a version. `Django` means "whatever the latest is today". We already have proof this bites: CI installed Django **6.1.2** while local machines have **6.1.1**. Different people are running different framework versions right now. The fix is `Django==6.1.1` style pins, or a lock file.

Both `psycopg2` and `psycopg[binary]` are listed. These are the old and new generations of the same driver. `psycopg[binary]` ships precompiled wheels; plain `psycopg2` compiles from C source, which is the only reason the Dockerfile needs `build-essential` and `libpq-dev`. Dropping `psycopg2` would make the image smaller and the build faster.

## 3.2 `pyproject.toml`

```toml
[build-system]
requires = ["setuptools>=61.0.0"]
build-backend = "setuptools.build_meta"

[project]
name = 'backend'
version = '0.1.0'
dynamic = ["dependencies"]

[tool.setuptools.dynamic]
dependencies = { file = "requirements.txt" }

[tool.setuptools.packages.find]
where = ["src"]
```

TOML is a config format: `[section]` headers and `key = value` pairs.

This file declares the backend as an installable Python package.

- `[build-system]` says use setuptools to build it.
- `[project]` is the package metadata. `dynamic = ["dependencies"]` means the dependency list is not written here.
- `[tool.setuptools.dynamic]` says it comes from `requirements.txt` instead, so there is one source of truth.
- `[tool.setuptools.packages.find] where = ["src"]` is the important line. It says packages live under `src/`, so installing this package puts `config`, `api`, `accounts`, `projects`, `submissions` and `photos` on the import path as **top-level** names.

That last line is why `pip install -e .` makes `import config.settings` work. The `-e` means "editable": instead of copying files into site-packages, it adds a pointer to your working directory, so your edits take effect immediately without reinstalling.

## 3.3 `pytest.toml`

```toml
[pytest]
DJANGO_SETTINGS_MODULE="config.settings"
minversion = "9.0"
testpaths = ["tests"]
env_files = [".env.local"]
```

- `DJANGO_SETTINGS_MODULE` tells `pytest-django` how to boot Django.
- `minversion` refuses to run on older pytest.
- `testpaths` means bare `pytest` only looks in `tests/`. Consequence: a `tests.py` inside an app is **never collected**. We deleted `api/tests.py` for exactly this reason, since anything written there would silently never run.
- `env_files` is `pytest-env` loading `.env.local` before tests start.

One genuine trap: the filename `pytest.toml` is only recognised by **pytest 9 and newer**. On pytest 8 this file is ignored entirely and every setting silently reverts to default. Do not downgrade pytest. You can confirm it is being read by looking for `configfile: pytest.toml` in the pytest header.

## 3.4 The three environment files

We keep three, none committed, all gitignored:

| File | Used by |
| --- | --- |
| `backend/.env.local` | your machine and the containers |
| `backend/.env.staging` | the staging deployment |
| `backend/.env.production` | the production deployment |

`backend/.env.example` is committed, holds no real values, and is the template.

The keys:

```
DJANGO_SECRET_KEY=        signing key, different per environment
DJANGO_DEBUG=             true locally, false everywhere else
DJANGO_ALLOWED_HOSTS=     comma-separated hostnames Django will answer for
CORS_ALLOWED_ORIGINS=     comma-separated browser origins, production only
DATABASE_URL=             postgres://user:password@host:5432/dbname
DJANGO_SETTINGS_MODULE=   config.settings
```

**Two outstanding problems in the shared env file contents**, which live outside git and so cannot be fixed by a PR:

1. `.env.staging` sets `DJANG0_DEBUG=false`, carrying the same zero-for-O typo the settings file had. It must be `DJANGO_DEBUG`.
2. Neither `.env.staging` nor `.env.production` sets `DATABASE_URL`. Both will now fail with a clear `ImproperlyConfigured` message until they do.

Also: secret keys should never be distributed over Discord. Anything posted there should be regenerated with `generate_random_key.py` and shared through something private.

## 3.5 The import path trap, worth understanding properly

This caused a real bug and it will catch someone again.

Python can only import a name if some directory **on its search path** contains a folder with that name. The old code said:

```python
ROOT_URLCONF = "src.config.urls"
```

so Python needed to find a folder literally called `src`.

**Inside the container** the Dockerfile sets `WORKDIR /inga-native` and `ENV PYTHONPATH=/inga-native`. The build context is `backend/`, so `backend/`'s contents land at `/inga-native`, which contains a folder named `src`. The search path points at the level **above** `src`, so `src.config.urls` resolves.

**Outside the container** you run `python src/manage.py` from `backend/`. Python always puts *the script's own directory* first on the path, and `manage.py` lives inside `src/`, so the path gets `backend/src`:

```
sys.path[0] = .../inga-native/backend/src
contents:     config  api  accounts  photos  projects  submissions  manage.py
```

There is no folder called `src` in there. The path points **at** `src`, not above it. So the import failed with `ModuleNotFoundError: No module named 'src'`.

One directory level decides whether the name exists.

What made it genuinely confusing is that the container resolved **two different prefixes at once**: `src.config.*` via `PYTHONPATH`, and `config.*` via the editable install. Both worked, nothing complained, and the project drifted into using `DJANGO_SETTINGS_MODULE=config.settings` and `WSGI_APPLICATION=config.wsgi.application` with one prefix while `ROOT_URLCONF` used the other. Loading the same files under two module names also causes subtle bugs later, because Python treats them as two unrelated modules.

The fix is to use the prefix that works under both mechanisms, which is `config.urls` and `api.urls`.

**The general lesson:** a container can have an extra directory on its import path that a local run does not, so it will happily accept a module path that was never really valid. Anything that only ever runs one way can hide this indefinitely. It is a good argument for CI running the backend outside Docker, which is what ours does.

---

# Part 4. Docker

## 4.1 The core idea

A container is a process on your machine running with its own filesystem, its own installed packages and its own network identity. It is not a virtual machine; there is no second operating system booting. It is ordinary Linux process isolation.

Two words you must keep apart:

- an **image** is a built, immutable filesystem snapshot, like a class
- a **container** is a running instance of an image, like an object

You build an image once and run many containers from it. Changing code does not change a running container; you rebuild the image.

Why we use it: Postgres, Redis and object storage all run with one command, at identical versions for all eight developers, without anyone installing Postgres natively.

## 4.2 `backend/Dockerfile`, line by line

A Dockerfile is a recipe for building an image. Each instruction creates a layer, and layers are cached, which is why instruction order matters for build speed.

```dockerfile
FROM python:3.14-slim
```

Start from the official Python 3.14 image. `-slim` is a trimmed Debian with fewer preinstalled packages.

```dockerfile
ENV PYTHONUNBUFFERED=1
ENV PYTHONDONTWRITEBYTECODE=1
```

`PYTHONUNBUFFERED` makes print and log output appear immediately instead of sitting in a buffer, which matters because a crash can otherwise lose the messages explaining it. `PYTHONDONTWRITEBYTECODE` stops `.pyc` files, which are pointless in a throwaway filesystem.

```dockerfile
WORKDIR /inga-native
```

Sets the working directory for everything after, creating it if needed.

```dockerfile
COPY requirements.txt .
```

Copy **only** the requirements file first. This is a deliberate caching trick: the expensive `pip install` layer below is only invalidated when `requirements.txt` changes. Copying all the source first would rebuild dependencies on every code edit.

```dockerfile
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    && pip install --no-cache-dir -r requirements.txt \
    && apt-get remove -y build-essential libpq-dev \
    && apt-get autoremove -y \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*
```

One long chain, and the chaining is the point. Each `RUN` creates a layer, and a file added in one layer and deleted in a later layer still occupies space in the image. Installing a C compiler, using it, and removing it **within a single `RUN`** means the compiler never ends up in the final image.

`build-essential` and `libpq-dev` are only needed because `psycopg2` compiles from source. Dropping `psycopg2` from requirements would let this whole block become one `pip install`.

```dockerfile
COPY . .
```

Now copy the source. The build context is `backend/` (set in compose), so this brings `src/`, `tests/`, `pyproject.toml` and so on into `/inga-native`.

`.dockerignore` lists what to leave out. It currently excludes `.venv`, `.env.staging`, `.env.production` and `.env.example`, but **not `.env.local`**, which means the local secret key is baked into the image. Compose already supplies those variables separately, so the copy is unnecessary. Worth fixing.

```dockerfile
RUN pip install --no-cache-dir -e .
```

Install the backend as an editable package, which is what puts `config`, `api` and the rest on the import path. See 3.2.

```dockerfile
EXPOSE 8000
```

Documentation only. It records the intended port; it does not publish anything. Publishing happens in compose.

```dockerfile
ENV PYTHONPATH=/inga-native
```

Adds `/inga-native` to the import path. This is what used to make `src.config.urls` resolvable in the container but nowhere else.

```dockerfile
CMD ["python", "src/manage.py", "runserver", "0.0.0.0:8000"]
```

The default command. `0.0.0.0` means "listen on all network interfaces" rather than only loopback, which is required for traffic from outside the container to arrive at all.

`runserver` is Django's development server. It auto-reloads on code change and is explicitly not for production.

## 4.3 `docker-compose.yaml`, line by line

Compose runs several containers together as one named stack. Our file defines four services.

### postgres

```yaml
image: postgis/postgis:latest
container_name: inga-postgres
environment:
  POSTGRES_DB: inga
  POSTGRES_USER: postgres
  POSTGRES_PASSWORD: postgres
ports:
  - "5432:5432"
volumes:
  - postgres_data:/var/lib/postgresql
healthcheck:
  test: [ "CMD-SHELL", "pg_isready -U postgres" ]
  interval: 30s
  timeout: 5s
  retries: 3
```

`postgis/postgis` is Postgres plus the PostGIS extension, which adds geographic types and queries such as "sites within 5km of this point". A sensible choice given regions carry latitude and longitude.

The `environment` keys are read by the Postgres image itself on first startup to create the database and user. These credentials are local-only.

`ports: "5432:5432"` maps host port 5432 to container port 5432, which is what lets a GUI client on your laptop connect.

`volumes: postgres_data:/var/lib/postgresql` is the important one. A container's filesystem is destroyed when it is removed. A **named volume** is storage managed by Docker that outlives containers, so your data survives `docker compose down`.

The `healthcheck` runs `pg_isready` every 30 seconds. Postgres takes a few seconds to initialise, and a service marked healthy is what other services can wait on.

### silo

```yaml
image: pgsty/silo:latest
command: server /data --console-address ":9001"
ports: ["9000:9000", "9001:9001"]
```

An S3-compatible object storage server for local development, in the MinIO family. Port 9000 is the API, 9001 a web console. It exists so photo upload code can be developed without hitting Cloudflare. Whether we use it or just use an R2 development bucket is an open decision, since R2 is itself S3-compatible.

### redis

```yaml
image: redis:latest
ports: ["6379:6379"]
```

An in-memory key-value store, typically used for caching or as a background-job queue. Nothing in the project uses it yet.

### backend

```yaml
build:
  context: ./backend
  dockerfile: Dockerfile
env_file:
  - ./backend/.env.local
ports:
  - "8000:8000"
depends_on:
  postgres:
    condition: service_healthy
  silo:
    condition: service_healthy
  redis:
    condition: service_started
```

`build.context: ./backend` is why `COPY . .` in the Dockerfile copies `backend/`'s contents and not the repo root.

`env_file` injects every line of `.env.local` as an environment variable.

`depends_on` with `condition: service_healthy` makes Django wait until Postgres actually answers, not merely until its container has started. Without that, Django races the database and crashes on boot.

### Important consequence of the compose network

Compose puts all services on a private network where **the service name is the hostname**. That is why `.env.local` has:

```
DATABASE_URL=postgres://postgres:postgres@postgres:5432/inga
```

The host is `postgres`, the service name. If you ever run Django natively against this database, that must become `localhost`, because `postgres` is not a name your laptop can resolve.

### volumes block

```yaml
volumes:
  silo-data:
  postgres_data:
  redis_data:
```

Declares the named volumes. `docker volume ls` lists them; deleting one deletes that data permanently.

## 4.4 The commands you will actually use

```bash
docker compose up --build          # build images and start everything
docker compose up -d               # start in the background
docker compose down                # stop and remove containers (volumes survive)
docker compose down -v             # also delete volumes, wiping the database
docker compose logs -f backend     # follow one service's logs
docker compose exec backend bash   # shell inside the running container
docker compose exec backend pytest
docker compose exec backend python src/manage.py migrate
docker compose exec backend python src/manage.py createsuperuser
docker compose ps                  # what is running
```

Rebuild rules: changed `requirements.txt` needs `--build`; changed application code needs `docker compose up --build --force-recreate backend`.

Per the README, do not change `Dockerfile` or `docker-compose.yaml` without checking with the PLs first.

---

# Part 5. The database

## 5.1 Postgres, and what Neon is

Postgres is a database that runs as a **server** you connect to over a network, which is why several applications can share one. SQLite, by contrast, is a single file sitting next to the application, reachable only by that process. That difference is why we could never have "shared" last year's SQLite database with our API.

Neon is a company that hosts Postgres for you. Nothing in our code is Neon-specific; it is ordinary Postgres behind a connection string. Its useful feature is database branching, which creates a copy-on-write branch of your data for a feature branch or a test run.

## 5.2 The connection string

```
postgres://USER:PASSWORD@HOST:PORT/DATABASE?sslmode=require
```

Local compose gives `postgres://postgres:postgres@postgres:5432/inga`. Neon gives something ending in `.neon.tech` with `sslmode=require`, which forces an encrypted connection.

`dj_database_url` parses this into Django's `DATABASES` dict so nobody has to write that structure by hand.

## 5.3 Transactions and `ATOMIC_REQUESTS`

A transaction is a group of database operations that either all apply or none do. With `ATOMIC_REQUESTS = True` every HTTP request is wrapped in one automatically, so a view that writes three rows and then raises on the fourth leaves no trace.

The cost is that every request opens a transaction, including ones that never touch a model. In tests, `pytest-django` blocks database access unless a test explicitly asks for it, which is why even a trivial health-check test needs:

```python
@pytest.mark.django_db
def test_health_returns_ok(client):
    ...
```

That is not a workaround; it is the test honestly declaring that the request hits the database.
---

# Part 6. The frontend

## 6.1 React, React Native and Expo

**React** is a JavaScript library for building interfaces out of components. A component is a function returning a description of what should appear; when its data changes, React recomputes and updates only what differs.

**React Native** uses the same model but renders **real native widgets** instead of HTML. `<View>` becomes a `UIView` on iOS and an `android.view.View` on Android. There is no browser and no DOM. Styling looks like CSS but is a subset implemented in JavaScript, and layout is always flexbox.

**Expo** is the toolchain and library set on top. It gives you a dev server, a prebuilt app called Expo Go for running your project on a real phone without compiling anything, a cloud build service, and a large set of vetted native modules such as camera, image picker and secure storage.

The practical rule the README states, and which matters: install packages with `npx expo install <package>`, not `npm install <package>`. Expo SDK 57 pins a mutually compatible set of React, React Native and native module versions, and plain npm will cheerfully install something that breaks the native build.

## 6.2 `app.json`

Expo's configuration.

- `name` and `slug` are the display name and the project identifier.
- `scheme: "inga"` registers the `inga://` deep-link scheme, which OAuth-style redirects need.
- `orientation`, `icon`, `ios`, `android`, `web` are per-platform assets and behaviour.
- `plugins` are build-time config modifications. `expo-router` and `expo-splash-screen` are listed.
- `experiments.typedRoutes` generates TypeScript types for your routes so a typo in a navigation path is a compile error.
- `experiments.reactCompiler` enables the React compiler, which inserts memoisation automatically.

## 6.3 File-based routing with expo-router

`package.json` has `"main": "expo-router/entry"`, which hands the app's entrypoint to expo-router. Router then maps the `app/` directory straight onto navigation:

```
app/_layout.tsx   wraps everything, defines the navigator
app/index.tsx     the route "/"
app/login.tsx     would be "/login"
app/sites/[id].tsx would be "/sites/123", with id as a parameter
```

`app/_layout.tsx`:

```tsx
import "react-native-gesture-handler";
import { Stack } from "expo-router";

export default function RootLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
```

The bare `import "react-native-gesture-handler"` is imported for its side effects and must come first; the library requires it. `<Stack>` is a stack navigator, the usual phone pattern where screens push on and pop off, and `headerShown: false` turns off the default title bar.

## 6.4 `app/index.tsx`, the current home screen

This is small but demonstrates most of the patterns the team will use.

```tsx
const [state, setState] = useState<ConnectionState>("loading");
const [detail, setDetail] = useState("");
```

`useState` is React's state hook. It returns the current value and a setter; calling the setter re-renders the component. `ConnectionState` is a union type of three literal strings, so the compiler rejects any other value.

```tsx
useEffect(() => {
  let cancelled = false;
  getHealth()
    .then(() => { if (!cancelled) setState("connected"); })
    .catch((error: unknown) => { if (!cancelled) { setState("error"); setDetail(...); } });
  return () => { cancelled = true; };
}, []);
```

`useEffect` runs side effects after render. The `[]` dependency array means "run once when the component mounts".

The `cancelled` flag is a standard and important pattern. If the user navigates away before the request finishes, the component is gone, and calling `setState` on it is a bug. The function returned from the effect is the cleanup, run on unmount, and it flips the flag so the late response is ignored.

```tsx
<SafeAreaView style={styles.screen}>
```

`SafeAreaView` keeps content clear of the notch, status bar and home indicator.

```tsx
const styles = StyleSheet.create({ screen: { flex: 1, backgroundColor: "#ffffff" }, ... });
```

`StyleSheet.create` validates style objects at build time. `flex: 1` means "take all available space". Note the camelCase keys and the absence of units; numbers are density-independent pixels.

## 6.5 `services/api.ts`

```ts
function apiBaseUrl(): string {
  const value = process.env.EXPO_PUBLIC_API_URL;
  if (!value) throw new Error("EXPO_PUBLIC_API_URL is not set");
  return value.replace(/\/$/, "");
}

export async function getHealth(): Promise<HealthResponse> {
  const response = await fetch(`${apiBaseUrl()}/api/health/`);
  if (!response.ok) throw new Error(`Health check failed (${response.status})`);
  return response.json() as Promise<HealthResponse>;
}
```

Keeping all network calls in one module means auth headers, base URL and error handling get added in one place later rather than scattered through screens.

Two details:

`EXPO_PUBLIC_` is a required prefix. Expo only exposes environment variables with that prefix to app code, and the values are **baked in at bundle time**, not read at runtime. So editing `.env` requires restarting the Expo dev server; a hot reload will not pick it up. The prefix is also a warning: these values ship inside the app and are not secret.

`fetch` only rejects on network failure. A 404 or 500 is a successful fetch with `ok === false`, which is why the explicit check is there.

## 6.6 Why the API URL differs per device

| Where the app runs | `EXPO_PUBLIC_API_URL` |
| --- | --- |
| iOS Simulator | `http://127.0.0.1:8000` |
| Android Emulator | `http://10.0.2.2:8000` |
| Physical phone | `http://<your LAN IP>:8000` |

`localhost` on a phone means the phone itself, not your computer. The iOS simulator shares the host's network stack, so loopback works. The Android emulator is a virtual machine, and `10.0.2.2` is its special alias for the host. A real phone must reach your computer across the Wi-Fi, so it needs the LAN IP, and that IP must also be in `DJANGO_ALLOWED_HOSTS`.

## 6.7 `tsconfig.json`

```json
{
  "extends": "expo/tsconfig.base",
  "compilerOptions": {
    "strict": true,
    "paths": { "@/*": ["./*"] }
  },
  "include": ["**/*.ts", "**/*.tsx", ".expo/types/**/*.ts", "expo-env.d.ts"]
}
```

`strict: true` turns on all strict type checks, most importantly null checking.

`paths` creates the `@/` alias, which is why screens write `import { getHealth } from "@/services/api"` rather than counting `../../` hops.

`.expo/types` is generated, which is where typed routes land.

`npx tsc --noEmit` type-checks without producing output. CI runs it, because the bundler itself does not type-check; it strips types and runs.

## 6.8 ESLint

`eslint.config.js` uses the modern flat config format:

```js
const { defineConfig } = require("eslint/config");
const expoConfig = require("eslint-config-expo/flat");

module.exports = defineConfig([
  expoConfig,
  { ignores: ["dist/*", ".expo/*", "node_modules/*"] },
]);
```

`eslint-config-expo` bundles the React, React Hooks and React Native rules matching SDK 57, so we do not hand-pick plugins. The hooks rules are the valuable part: they catch a `useEffect` with a missing dependency, which is one of the most common real bugs in React code.

The `lint` script is `eslint .` rather than `expo lint`, because `expo lint` globs `components/`, `constants/` and `hooks/`, which currently hold only `.gitkeep`, and ESLint 9 treats an empty glob as a hard error.

---

# Part 7. The pieces not yet built

## 7.1 JWT authentication

**The problem.** Classic web auth uses a session cookie: the server stores session state and the browser sends the cookie automatically. That suits a browser and suits an app poorly, especially one that must work offline.

**The JWT approach.** The server hands the client a signed token. The client stores it and attaches it to each request. The server verifies the signature and needs no stored session.

A JWT is three base64 segments separated by dots:

```
header.payload.signature
```

The header names the algorithm, the payload holds claims such as the user id and an expiry timestamp, and the signature is those two signed with the server's secret. Anyone can **read** a JWT, so never put anything secret in the payload; the signature only guarantees it has not been **altered**.

**Two tokens.** `djangorestframework-simplejwt` issues a short-lived access token, typically minutes, and a long-lived refresh token, typically days.

```
POST /api/accounts/login/     {username, password}  ->  {access, refresh}
GET  /api/submissions/        Authorization: Bearer <access>
POST /api/accounts/refresh/   {refresh}             ->  {access}
```

The short access lifetime limits the damage of a leaked token; the refresh token means the user does not retype their password every ten minutes.

**On the phone**, the refresh token goes in `expo-secure-store`, which uses the iOS Keychain and Android Keystore. Not `AsyncStorage`, which is plain unencrypted files.

**Our constraint**: accounts are provisioned, never self-registered. So there is no signup endpoint at all, which removes a large amount of usual work.

## 7.2 Cloudflare R2 and presigned URLs

**Why files do not go in the database.** Databases are poor at large binaries: they bloat backups, consume connection time and make queries slow. Standard practice is to put the file in object storage and keep only a reference in the database.

**Object storage** is a bucket of files addressed by a key, more like a giant hash map reachable over HTTP than a filesystem. R2 is Cloudflare's, and it speaks the Amazon S3 API, so any S3 client library works against it. Its commercial appeal is that it charges nothing for data transfer out, which matters for an app serving photos.

**Presigned URLs** are the key idea. The naive design has the phone upload a 4MB photo to Django, which then forwards it to R2, so every byte crosses our server twice and a Python worker is tied up for the duration.

Instead:

```
1. phone -> Django:  "I want to upload a photo"
2. Django -> phone:  a presigned URL, valid ~15 minutes, plus the object key
3. phone -> R2:      HTTP PUT of the bytes, directly
4. phone -> Django:  "uploaded, the key is X"  (Django saves a Photo row)
```

The presigned URL is a normal R2 URL with a signature in the query string proving Django authorised this specific operation on this specific key before a specific expiry. R2 verifies it without ever contacting us. The R2 credentials stay on the server and never reach the phone.

Django's side uses `boto3`, the AWS SDK, pointed at R2's endpoint.

## 7.3 Offline support

Not in Sprint 1, and the hardest thing in the project. The shape it will take: writes go into a local SQLite queue on the phone, a sync process drains the queue when connectivity returns, and every submission carries a client-generated unique id so a retry cannot create a duplicate. It needs a stable API to sync against, which is what Sprint 1 is building.

---

# Part 8. Process

## 8.1 `.github/workflows/ci.yml`

GitHub Actions runs this on every pull request and every push to `main`.

```yaml
on:
  pull_request:
  push:
    branches: [main]

concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true
```

`concurrency` cancels an in-flight run when you push again to the same branch, so you are not waiting on results for code you have already replaced.

### The backend job

```yaml
services:
  postgres:
    image: postgis/postgis:latest
    env: { POSTGRES_DB: inga, POSTGRES_USER: postgres, POSTGRES_PASSWORD: postgres }
    ports: ["5432:5432"]
    options: >-
      --health-cmd pg_isready --health-interval 10s --health-timeout 5s --health-retries 5
```

GitHub starts a real Postgres container alongside the job, the same image compose uses, so CI and local run the same database. The health options stop the job starting before Postgres answers.

The steps:

1. `actions/checkout@v5` clones the repo.
2. `actions/setup-python@v6` installs Python 3.14 and caches pip downloads keyed on `requirements.txt`.
3. Install `libpq-dev`, needed only because `psycopg2` builds from source.
4. `pip install -r requirements.txt` then `pip install -e .`, matching the Dockerfile.
5. Write a `.env.local`, since the real one is gitignored. Here `DATABASE_URL` points at `localhost`, not `postgres`, because a service container is published on the job's own network.
6. `manage.py check --fail-level WARNING` runs Django's static checks and fails on warnings, not just errors.
7. `makemigrations --check --dry-run` fails if a model changed without a migration.
8. `migrate` proves the migrations actually apply to a real Postgres.
9. `pytest`.

### The frontend job

`npm ci` (installs exactly the lock file, unlike `npm install` which may update it), `npx tsc --noEmit`, then `npm run lint -- --max-warnings=0`, which treats warnings as failures.

### Why CI earns its keep

A concrete example from this week: a test passed locally on SQLite and failed in CI, because `ATOMIC_REQUESTS` makes every request touch the database and the local run was not using the real settings. Without CI that lands on `main` and everyone's build breaks.

## 8.2 Branch protection and the review flow

`main` is protected:

- one approving review required
- conversation resolution required
- stale reviews dismissed on a new push
- admins are **not** exempt

GitHub does not let anyone approve their own pull request, so every change needs a second person. Because approvals are dismissed by a new push, get the approval last.

The flow:

```bash
git checkout main && git pull
git checkout -b feature/short-description
# work, commit
git push -u origin feature/short-description
gh pr create     # or open it on the web
```

Then CI runs, someone reviews, you merge.

Two outstanding repo tasks:

1. **Make CI a required status check.** `required_status_checks` is still null, so a red CI does not actually block a merge. Settings, Branches, edit the `main` rule, require `Backend (Django + Postgres)` and `Frontend (Expo + TypeScript)`.
2. **Give the eight developers write access.** They currently have `read`, which means they cannot push a branch at all.

## 8.3 Conventions worth setting now

- Branch names: `feature/`, `fix/`, `chore/` plus a short description.
- One pull request per issue, and link it with `Closes #12` so the issue closes on merge.
- Commit messages: a short summary line, then why rather than what.
- Never commit `.env*`, credentials or your LAN IP.
- Tests live in `backend/tests/`, never in an app's `tests.py`.
- Migrations are always committed.
---

# Part 9. The Sprint 1 issues

Sprint 1 is: authentication, database schema, image upload to R2, and form submission, each working in a simple way end to end. Offline is explicitly out of scope.

## 9.1 Dependency order

```
#1 Neon          ──┐
#2 R2 bucket     ──┼──> everything that touches a database or storage
                   │
#6 Project/Site/Region models  ──┬──> #7 list endpoints
                                 ├──> #10 Submission model  ──> #11 form screen
                                 └──> #8 Photo model        ──> #9 camera upload
#3 JWT endpoints ──> #4 /me/
                 └─> #5 login screen
```

**#6 is the critical path.** Submissions and photos both need a `Site` to point at. It should land first, which is why it goes to Olivia, who asked for backend and Postgres work.

A pair can start against an agreed model shape before #6 merges, as long as they do not both write migrations for the same app.

## 9.2 Setup issues, for you

### #1 Provision Neon Postgres and share the connection string

**Why.** Everyone currently runs their own throwaway Postgres in Docker. We need one shared hosted database for staging, and it is the production target.

**Scope.** Create the Neon project. Create a database named `inga`. Put the connection string, which ends in `.neon.tech` and carries `sslmode=require`, somewhere private, not Discord. Add it as `DATABASE_URL` in `.env.staging`.

**Done when.** Someone can set `DATABASE_URL` to the Neon string, run `python src/manage.py migrate`, and see tables appear in the Neon console.

**Note.** Neon's branching is worth enabling. A branch per environment keeps staging data away from anything real.

### #2 Create the Cloudflare R2 bucket and API token

**Why.** Blocks #8 and #9.

**Scope.** Create the bucket. Create an API token scoped to **that bucket only**, with object read and write. Record the account id, access key id, secret access key, bucket name and the S3 endpoint, which looks like `https://<account-id>.r2.cloudflarestorage.com`. Decide whether development uses a separate bucket or the local `silo` service.

**Done when.** The five values exist in a private store and `.env.example` lists the key names.

**Gotcha.** Do not issue an account-wide token. Scope it to the bucket.

## 9.3 Authentication: Aryan (senior) and Ethan (junior)

### #3 JWT login and refresh endpoints — Aryan

**Background.** Read 7.1. The short version: the client gets a signed token and sends it as `Authorization: Bearer <token>`; the server verifies the signature instead of keeping a session.

**Scope.**

- Add `djangorestframework-simplejwt` to `requirements.txt`.
- Add a `REST_FRAMEWORK` dict in `settings.py` with `DEFAULT_AUTHENTICATION_CLASSES` set to SimpleJWT's and `DEFAULT_PERMISSION_CLASSES` set to `IsAuthenticated`, so endpoints are private by default and must opt out.
- Add `SIMPLE_JWT` settings with a deliberate access-token lifetime, roughly 15 to 60 minutes, and a refresh lifetime of days.
- Routes in `accounts/urls.py`: `POST login/` returning access and refresh, `POST refresh/` exchanging a refresh for a new access.
- Keep `/api/health/` public with an explicit `@permission_classes([AllowAny])`.

**Done when.** Correct credentials return two tokens; wrong credentials return 401; a protected endpoint returns 401 without a token and 200 with one; an expired access token is refreshable. Tests cover all four.

**Gotchas.** Tokens are signed with `SECRET_KEY`, so rotating it logs everyone out. Do not put anything secret in the payload; it is readable by anyone. Changing the default permission to `IsAuthenticated` will break the health check unless it is explicitly exempted, which is a good thing because it proves the default took effect.

**Review checklist.** Default permission is deny; health check explicitly public; lifetimes are deliberate not default; no secret in the token payload.

### #4 Account provisioning and `GET /api/accounts/me/` — Ethan

**Background.** Field workers never self-register, so there is no signup endpoint. Accounts are created by an admin. Read 2.6 on models and 2.5 on serializers.

**Scope.**

- A management command, for example `python src/manage.py createfieldworker <username>`, that creates a user with a generated or prompted password. A Django management command is a Python file under `accounts/management/commands/`; both directories need an `__init__.py`.
- `GET /api/accounts/me/` returning the authenticated user's id, username and name, via a small `UserSerializer`.
- Register `User` in `accounts/admin.py` with `UserAdmin` so the admin site can also create accounts. Already done.

**Done when.** The command creates a working account, `/me/` returns that user's details with a valid token and 401 without one. Tests cover both.

**Gotchas.** Always use `User.objects.create_user(...)`, never `User(...)` plus `save()`, because only `create_user` hashes the password. Use `get_user_model()` rather than importing `User` directly; it is the habit that keeps code working with a swappable user model.

**Review checklist.** Password is hashed, confirmed by checking the stored value is not the plaintext; `/me/` returns only the requesting user, never an id from the request; no password field in the serializer output.

### #5 Login screen and secure token storage — Aryan

**Background.** Read Part 6. Aryan asked for React Native exposure, and this is a good first piece of it: a form, a network call, storage and a redirect.

**Scope.**

- `app/login.tsx` with username and password inputs, a submit button, a loading state and an error message.
- Store the tokens with `expo-secure-store`, which uses the iOS Keychain and Android Keystore.
- Extend `services/api.ts` so requests attach `Authorization: Bearer <access>` and a 401 triggers one refresh attempt, then a redirect to login if that fails.
- Redirect unauthenticated users to `/login` and authenticated users away from it.

**Done when.** A provisioned worker can log in, the app remembers them across a restart, an expired access token refreshes transparently, and logging out clears storage.

**Gotchas.** Never `AsyncStorage` for tokens; it is plain unencrypted files. Guard against several simultaneous 401s each firing their own refresh. Remember `EXPO_PUBLIC_API_URL` is baked in at bundle time, so restart Expo after changing `.env`.

**Review checklist.** Tokens in SecureStore; no token logged to the console; refresh loop cannot recurse forever; password field uses `secureTextEntry`.

## 9.4 Database schema: Olivia (senior) and Ginni (junior)

### #6 `Project`, `Site` and `Region` models and migrations — Olivia

**Background.** Read 1.2 for the shape we are mirroring and 2.6 for models and migrations. This is the critical path.

**Scope.**

- In `projects/models.py`:
  - `Region`: name unique, latitude and longitude as `DecimalField(max_digits=10, decimal_places=6, null=True)`, validated to the real coordinate ranges.
  - `Project`: name unique, description, `active` boolean, and `log_schema` as a `JSONField` defaulting to an empty dict. Validate that every value is one of `numerical`, `boolean`, `text`.
  - `Site`: foreign keys to `Project` and `Region`, name, address, description, unique on project plus name. Called `Subproject` in the old schema; `Site` matches what field workers say.
  - `created_at` and `updated_at` on each, via `auto_now_add` and `auto_now`.
- Generate and commit the migration.
- Register all three in `projects/admin.py`.
- Tests for the uniqueness constraints and the `log_schema` validation.

**Done when.** `migrate` applies cleanly to Postgres, all three are usable in the admin, and CI is green.

**Gotchas.** Decide `on_delete` deliberately for each foreign key: `PROTECT` on `Site.region` stops deleting a region that is in use, which is probably what you want, while `CASCADE` on `Site.project` deletes sites with their project. Use `DecimalField` for coordinates, never `FloatField`, because binary floats cannot represent decimal degrees exactly. Postgres has a real `jsonb` type and Django's `JSONField` uses it, so it is queryable rather than an opaque string.

**Review checklist.** Migration committed; `on_delete` justified on every FK; coordinate validators present; `log_schema` rejects an unknown type.

### #7 Seed data and the project and site list endpoints — Ginni

**Background.** Deliberately guided: the app scaffolding, URL wiring and test layout already exist, so this is "fill in the shapes". Read 2.5 on serializers and generic views.

**Scope.**

- `projects/serializers.py` with a `RegionSerializer`, `ProjectSerializer` and `SiteSerializer`.
- `GET /api/projects/` listing active projects.
- `GET /api/projects/<id>/sites/` listing that project's sites.
- A fixture or management command creating a handful of realistic projects, regions and sites, so the app has something to show.
- Tests that both endpoints return the expected shape and require authentication.

**Done when.** Both endpoints return sensible JSON for a seeded database and 401 without a token.

**Gotchas.** `ListAPIView` with a `queryset` and `serializer_class` is almost the whole job; resist writing it by hand. Watch for the N+1 query problem: serialising sites that each reference a region issues one extra query per site unless the queryset uses `select_related("region")`. This is the single most common performance mistake in Django and a good thing to learn now.

**Review checklist.** `select_related` where a related object is serialised; filtering to active projects; endpoints authenticated.

## 9.5 Images to R2: Bryan (senior) and April (junior)

### #8 `Photo` model and the presigned upload URL endpoint — Bryan

**Background.** Read 7.2 carefully; the presigned-URL flow is the whole design.

**Scope.**

- Add `boto3` to `requirements.txt`.
- R2 settings read from the environment, and the key names added to `.env.example`.
- `photos/models.py`: `Photo` with the object key, content type, size in bytes, uploader, created timestamp, and a nullable link to a submission so #10 can attach it later.
- `POST /api/photos/upload-url/` taking a content type and returning a presigned PUT URL plus the object key. Generate keys server-side, for example `photos/<year>/<month>/<uuid>.jpg`; never accept a client-supplied key.
- `POST /api/photos/` recording the `Photo` row once the client reports success.
- Tests with `boto3` mocked, so CI never touches the network.

**Done when.** The endpoint returns a working URL, a real `PUT` to it lands in the bucket, the row records the key, and tests pass without network access.

**Gotchas.** Accepting a client-supplied key lets a caller overwrite someone else's object; always generate it. Set a short expiry, around 15 minutes. Validate the content type against an allowlist. R2 needs the endpoint URL and region set explicitly on the boto3 client, unlike plain S3. Never let R2 credentials reach the phone.

**Review checklist.** Key generated server-side; expiry short; content type allowlisted; credentials server-only; tests do not hit the network.

### #9 Take or pick a photo and upload it — April

**Background.** Read Part 6 and 7.2. Front and back, which is what April asked for.

**Scope.**

- `expo-image-picker`, installed with `npx expo install`, for both camera capture and gallery selection.
- Request camera and library permissions, and handle refusal with a real message rather than a silent failure.
- Call `/api/photos/upload-url/`, `PUT` the file to the returned URL, then `POST /api/photos/`.
- Show progress and a clear error state, and allow retry.
- Compress or resize before upload; a modern phone photo can exceed 5MB.

**Done when.** A worker can take or pick a photo and see it arrive in the bucket, with progress shown and failures recoverable.

**Gotchas.** iOS and Android return different URI shapes from the picker. Permissions must be requested at runtime, not merely declared. A plain `fetch` with a file body does not report progress, so either accept that for Sprint 1 or use `expo-file-system`'s uploader. Test on a real device, not only a simulator.

**Review checklist.** Permission denial handled; image resized; upload failure is recoverable; no token or presigned URL logged.

## 9.6 Form submission: Cindy (senior) and Jasmine (junior)

### #10 `Submission` model and create endpoint — Cindy

**Background.** Read 1.2 on `log_schema` and 2.6 on models. The interesting part is validating dynamic data.

**Scope.**

- `submissions/models.py`: `Submission` with a foreign key to `Site`, a foreign key to the user, `metadata` as a `JSONField`, `created_at`, and a client-generated `uuid` that is unique.
- `POST /api/submissions/` creating one for the authenticated user.
- Validation in the serializer: every key in `metadata` must exist in the site's project's `log_schema`, and each value must match the declared type. Reject an empty submission.
- `GET /api/submissions/` listing the current user's own submissions.
- Tests for a valid submission, an unknown field, a wrong type, and an empty one.

**Done when.** A valid submission is stored, each invalid case returns 400 with a message naming the offending field, and the user is taken from the token rather than the request body.

**Gotchas.** Never take the user id from the request body; use `request.user`. The unique client-generated `uuid` is what makes offline retries safe later, so it is worth adding now even though offline is out of scope. `ATOMIC_REQUESTS` already gives you all-or-nothing per request.

**Review checklist.** User from the token; uuid unique; validation covers unknown key, wrong type and empty; list endpoint cannot see other users' rows.

### #11 Submission form screen — Jasmine

**Background.** Read Part 6. Pure React Native, which is what Jasmine asked for. The interesting part is that the form is **not** hardcoded; it is generated from the project's `log_schema`.

**Scope.**

- A screen to pick a site, from `GET /api/projects/` and `GET /api/projects/<id>/sites/`.
- Render form fields from the project's `log_schema`: a numeric keyboard for `numerical`, a switch for `boolean`, a text input for `text`.
- Submit to `POST /api/submissions/`, show success, and show field-level errors from a 400.
- Disable submit while in flight so a double tap cannot send twice.

**Done when.** A worker can pick a site, fill the generated fields, submit, and see either confirmation or a useful error.

**Gotchas.** `keyboardType="numeric"` still yields a string, so convert before sending. Wrap the form in a `KeyboardAvoidingView` or the keyboard covers the inputs, and the behaviour differs between iOS and Android. Build the fields by mapping over the schema rather than writing a component per field; that is the entire point of the design.

**Review checklist.** Fields driven by `log_schema`, not hardcoded; numbers converted from strings; double-submit prevented; server errors surfaced per field.

## 9.7 Labels and milestone

Labels to create: `area: backend`, `area: app`, `area: database`, `area: infra`, `type: feature`, `type: chore`, `difficulty: junior`, `difficulty: senior`, `blocker`.

All eleven go on the existing **Sprint 1** milestone.

---

# Part 10. How to get proficient quickly

A suggested order, two or three evenings:

1. **Run it.** `docker compose up --build`, then `curl http://127.0.0.1:8000/api/health/`. Then `docker compose exec backend pytest`.
2. **Use the shell.** `docker compose exec backend python src/manage.py shell`, then create and query a user. The ORM makes sense fastest when you are typing at it.
3. **Make a model change end to end.** Add a throwaway field, run `makemigrations`, read the generated file, `migrate`, then delete it all. This is the loop everyone will use daily.
4. **Open the admin.** `createsuperuser`, then `http://127.0.0.1:8000/admin/`. Seeing `accounts.User` there makes `AUTH_USER_MODEL` concrete.
5. **Break something deliberately.** Set `DJANGO_DEBUG=false` and trigger an error, or remove `DATABASE_URL`. Knowing what the failures look like is most of debugging a teammate's screenshot.
6. **Run the app.** Expo Go on your phone, with `EXPO_PUBLIC_API_URL` set to your LAN IP. Hitting the `ALLOWED_HOSTS` error once teaches it permanently.

Worth bookmarking: the Django topic guides (not the reference), the DRF tutorial, the Expo Router docs, and `pytest-django`'s fixture list.

The highest-value thing you can do as lead is read every PR properly. Most of the gotchas above are things a reviewer catches and a linter does not: an N+1 query, a user id taken from the body instead of the token, a missing migration, a client-supplied object key.

# Part 11. Open decisions

| Question | Who decides | Blocks |
| --- | --- | --- |
| Pin `requirements.txt` and drop `psycopg2` | PLs | nothing yet, but versions already differ between CI and local |
| Exclude `.env.local` in `.dockerignore` | PLs | a secret key is currently baked into the image |
| Local `silo` or an R2 dev bucket | Bryan and PLs | #8, #9 |
| Is `redis` needed | PLs | nothing; currently unused |
| Make CI a required status check | you | a red CI does not block merges today |
| Give the eight developers write access | you | all of Sprint 1 |
| Rotate the secret keys posted on Discord | you | security |
