# Order Processing Workflow System

A full-stack web application that manages orders through a strict workflow state machine.
Built with Django REST Framework (backend) and React + Vite (frontend).
Built with Django REST Framework (backend), React + Vite (frontend), and React Native + Expo (mobile).

---

## Tech Stack

### Backend
- Python 3.10+
- Django 6
- Python 3.11+
- Django 5.x / 6.x
- Django REST Framework
- SQLite (database)
- Token Authentication
- SimpleJWT Authentication (JSON Web Tokens)

### Frontend
- React 18
- Vite
- React Router DOM
- Axios
- Plain CSS (no UI library)

### Mobile
- React Native (Expo SDK)
- React Navigation (Tabs & Stack)
- Axios (API Client)
- Context API (Auth State)
- Design System (Custom theme-based styles)

---

## Project Structure

```
ordering system/
├── config/                        # Django project settings
│   ├── settings.py
│   ├── urls.py
│   └── wsgi.py
├── orders/                        # Main Django app
│   ├── migrations/
│   ├── templates/
│   │   └── api/
│   │       └── docs.html          # Custom HTML admin panel
│   ├── chatbot.py                 # AI Chatbot logic (OpenAI/Azure)
│   ├── email_utils.py             # Activation & Reset email helpers
│   ├── admin.py
│   ├── models.py                  # Database models
│   ├── serializers.py             # DRF serializers
│   ├── views.py                   # API views
│   └── urls.py                    # API routes
├── frontend/                      # React + Vite app
│   ├── src/
│   │   ├── api/
│   │   │   └── ordersApi.js       # All API calls (axios)
│   │   ├── components/
│   │   │   ├── IconLibrary.jsx    # Reusable SVG icon system
│   │   │   ├── Layout.jsx         # Sidebar + topbar
│   │   │   ├── NotificationBell.jsx
│   │   │   ├── StatusBadge.jsx    # Status color badge
│   │   │   └── Stepper.jsx        # Workflow stepper UI
│   │   ├── context/
│   │   │   └── AuthContext.jsx    # Global auth state
│   │   ├── pages/
│   │   │   ├── Login.jsx
│   │   │   ├── Register.jsx
│   │   │   ├── Dashboard.jsx      # Routes to role-specific dashboard
│   │   │   ├── AdminDashboard.jsx # Admin — analytics, users, orders, customers
│   │   │   ├── OwnerDashboard.jsx # Owner — orders + product management
│   │   │   ├── CustomerDashboard.jsx # Customer — shop + my orders
│   │   │   ├── Orders.jsx
│   │   │   ├── CreateOrder.jsx
│   │   │   ├── OrderDetail.jsx
│   │   │   ├── Customers.jsx
│   │   │   └── Users.jsx
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   └── index.css
│   ├── package.json
│   └── vite.config.js
├── manage.py
├── requirements.txt
└── README.md
```

---

## Setup Instructions

### Requirements
Make sure you have these installed before starting:
- Python 3.10 or higher → https://www.python.org/downloads/
- Node.js 18 or higher → https://nodejs.org/
- Git → https://git-scm.com/

---

### Step 1 — Clone the repository
```bash
git clone https://github.com/coderist1/Ordering_System.git
cd Ordering_System
```

---

### Step 2 — Create and activate virtual environment
```bash
python -m venv .venv
```

**Windows (Git Bash or PowerShell):**
```bash
source .venv/Scripts/activate
```

**Windows (Command Prompt):**
```bash
.venv\Scripts\activate
```

**Mac / Linux:**
```bash
source .venv/bin/activate
```

You should see `(.venv)` at the start of your terminal line.

---

### Step 3 — Install backend dependencies
```bash
pip install -r requirements.txt
```

---

### Step 4 — Run database migrations
```bash
python manage.py migrate
```

You should see a list of `OK` messages.

---

### Step 5 — Start the Django backend server
```bash
python manage.py runserver
```

Backend runs at → `http://127.0.0.1:8000`

---

### Step 6 — Install frontend dependencies

Open a **new terminal**:
```bash
cd frontend
npm install
```

---

### Step 7 — Start the frontend development server
```bash
npm run dev
```

Frontend runs at → `http://localhost:5173`

---

### Step 8 — Install mobile dependencies

Open a **third terminal**:
```bash
cd mobile
npm install
```

---

### Step 9 — Start the Mobile development server

Open a **third terminal**:
```bash
cd mobile
npx expo start
```

Mobile runs in Expo DevTools (QR for Android/iOS, or emulator/simulator).

---

## Run Backend + Frontend + Mobile Together

Use three terminals in parallel:

**Terminal 1 — Backend (Django):**
```bash
source .venv/Scripts/activate
python manage.py runserver
```

**Terminal 2 — Frontend (React + Vite):**
```bash
cd frontend
npm install
npm run dev
```

**Terminal 3 — Mobile (Expo):**
```bash
cd mobile
npm install
npx expo start
```

Run backend first, then frontend, then mobile.

### Full Terminal Commands (Copy/Paste)

#### Local Development (Windows PowerShell)

**Terminal 1 - Backend**
```powershell
cd C:\Users\Acer\Ordering_System
python -m venv .venv
Set-ExecutionPolicy -Scope Process -ExecutionPolicy RemoteSigned
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver
```

**Terminal 2 - Frontend**
```powershell
cd C:\Users\Acer\Ordering_System\frontend
npm install
npm run dev
```

**Terminal 3 - Mobile**
```powershell
cd C:\Users\Acer\Ordering_System\mobile
npm install
npx expo start
```

#### Local Development (macOS/Linux)

**Terminal 1 - Backend**
```bash
cd ~/Ordering_System
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver
```

**Terminal 2 - Frontend**
```bash
cd ~/Ordering_System/frontend
npm install
npm run dev
```

**Terminal 3 - Mobile**
```bash
cd ~/Ordering_System/mobile
npm install
npx expo start
```

#### Ubuntu Server Deployment Commands

```bash
ssh root@YOUR_SERVER_IP
cd /var/www
git clone https://github.com/coderist1/Ordering_System.git
cd Ordering_System
chmod +x scripts/deploy_ubuntu.sh
./scripts/deploy_ubuntu.sh
```

#### PostgreSQL Manual Setup Commands (Alternative)

```bash
sudo -u postgres psql
CREATE DATABASE mydb;
CREATE USER myuser WITH PASSWORD 'strongpassword';
GRANT ALL PRIVILEGES ON DATABASE mydb TO myuser;
\c mydb
GRANT ALL ON SCHEMA public TO myuser;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO myuser;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO myuser;
ALTER SCHEMA public OWNER TO myuser;
```

Or run:
```bash
sudo -u postgres psql -f scripts/postgres_setup.sql
```

#### Service and Nginx Commands

```bash
sudo systemctl daemon-reload
sudo systemctl enable ordering-system
sudo systemctl restart ordering-system
sudo systemctl restart nginx
sudo nginx -t
sudo systemctl status ordering-system
sudo systemctl status nginx
```

#### Firewall Commands

```bash
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw --force enable
sudo ufw status
```

### Email activation setup
The activation email is sent through Django's email backend. By default the project uses the console backend for local development, so no real email is delivered until SMTP is configured.

To send activation emails via Brevo, set these environment variables on your Railway backend service:

```bash
EMAIL_BACKEND=django.core.mail.backends.smtp.EmailBackend
EMAIL_HOST=smtp-relay.brevo.com
EMAIL_PORT=587
EMAIL_USE_TLS=True
EMAIL_HOST_USER=your-login@smtp-brevo.com
EMAIL_HOST_PASSWORD=your-brevo-smtp-key
DEFAULT_FROM_EMAIL=Ordering System <your-verified-sender@gmail.com>
BREVO_API_KEY=your-brevo-api-key
FRONTEND_URL=https://ordering-system-1-up16-production.up.railway.app
BACKEND_URL=https://ordering-system-backend-production.up.railway.app
```

In Brevo: **SMTP & API** → generate an SMTP key, and verify your sender under **Senders**.  
`DEFAULT_FROM_EMAIL` must match a verified sender in Brevo.  
See `EMAIL_SETUP_GUIDE.md` for the full walkthrough.

### Exact deployment order

1. Deploy backend service from repo root (`railway.toml` runs migrate + gunicorn).
2. Add PostgreSQL in Railway and link `DATABASE_URL` to the backend service.
3. Set backend environment variables below on **ordering-system-backend**.
4. Deploy frontend from `frontend/` (`frontend/railway.toml` + `.env.production`).
5. Open `https://ordering-system-1-up16-production.up.railway.app` and test register → activation → login.

### Railway backend environment variables

```bash
DEBUG=False
SECRET_KEY=your-long-random-secret
ALLOWED_HOSTS=localhost,127.0.0.1,.railway.app,ordering-system-backend-production.up.railway.app
FRONTEND_URL=https://ordering-system-1-up16-production.up.railway.app
BACKEND_URL=https://ordering-system-backend-production.up.railway.app
CORS_ALLOWED_ORIGINS=https://ordering-system-1-up16-production.up.railway.app
CSRF_TRUSTED_ORIGINS=https://ordering-system-1-up16-production.up.railway.app

EMAIL_BACKEND=django.core.mail.backends.smtp.EmailBackend
EMAIL_HOST=smtp-relay.brevo.com
EMAIL_PORT=587
EMAIL_USE_TLS=True
EMAIL_HOST_USER=your-login@smtp-brevo.com
EMAIL_HOST_PASSWORD=your-brevo-smtp-key
DEFAULT_FROM_EMAIL=Ordering System <your-verified-sender@gmail.com>
BREVO_API_KEY=your-brevo-api-key
```

### Railway frontend environment variables

The frontend build reads `frontend/.env.production`:

```bash
VITE_API_BASE_URL=https://ordering-system-backend-production.up.railway.app/api/v1
```

---

## Accessing the Application

| URL | Description |
|-----|-------------|
| http://localhost:5173 | React frontend |
| http://127.0.0.1:8000/api/ | Backend API root |
| http://127.0.0.1:8000/api/panel/ | Custom HTML admin panel |
| http://127.0.0.1:8000/admin/ | Django admin panel |

> Both servers must be running at the same time.

---

## User Roles

| Role | What you can do |
|------|----------------|
| **Customer** | Browse products, add to cart, place orders, view own orders, leave reviews on completed orders |
| **Owner** | Add/edit/delete products, view all orders, advance order status |
| **Admin** | Full access — view analytics, manage users and their roles, view all orders, delete orders, view all customers |
| **Customer** | Browse products, add to cart, place orders, view own orders, leave reviews, apply for Owner status |
| **Owner** | Add/edit/delete products, manage business orders, advance order status |
| **Admin** | System-wide control — manage users, review owner applications, view analytics, delete any order |

> **Note:** Admin cannot create orders. Admin manages the system.

---

## How the Workflow Works

Orders follow a strict one-way status progression:

```
Pending → Processing → Shipped → Completed
```

- You **cannot skip steps** — going from Pending directly to Shipped will be rejected.
- You **cannot go backwards** — once Completed it stays Completed.
- Only **Owner** and **Admin** can advance order status.
- Only **Admin** can delete orders.
- **Customers** can only see and manage their own orders.

---

## Role Dashboards

### Customer Dashboard
- **Shop tab** — browse products listed by the owner, add to cart, adjust quantity
- **My Orders tab** — view all placed orders and their current status
- Cart drawer with live total and place order button

### Owner Dashboard
- **Orders tab** — view all customer orders, filter by status, advance order status
- **My Products tab** — add, edit, and delete products from a modal form

### Admin Dashboard
- **Overview tab** — system-wide stats, user role breakdown, order status breakdown
- **Orders tab** — view and delete any order in the system
- **Users tab** — view all registered users, change any user's role
- **Customers tab** — view all customer records

---

## API Endpoints

All protected endpoints require:
```
Authorization: Token <your-token>
```

### Authentication
| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| POST | /api/auth/register/ | Public | Register a new user |
| POST | /api/auth/login/ | Public | Login and receive token |
| POST | /api/auth/logout/ | Authenticated | Logout and delete token |
| GET  | /api/auth/me/ | Authenticated | Get current user info |

### Products
| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| GET    | /api/products/ | Authenticated | List products (customers see active only) |
| POST   | /api/products/ | Owner, Admin | Create a new product |
| GET    | /api/products/{id}/ | Authenticated | Get product details |
| PATCH  | /api/products/{id}/ | Owner, Admin | Update a product |
| DELETE | /api/products/{id}/ | Owner, Admin | Delete a product |

### Orders
| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| GET    | /api/orders/ | Authenticated | List orders (customers see own only) |
| POST   | /api/orders/ | Customer, Owner | Create a new order |
| GET    | /api/orders/{id}/ | Authenticated | Get order details |
| PATCH  | /api/orders/{id}/ | Authenticated | Update order notes |
| DELETE | /api/orders/{id}/ | Admin only | Delete an order |
| POST   | /api/orders/{id}/status/ | Owner, Admin | Advance order status |
| GET    | /api/orders/summary/ | Authenticated | Get order count and revenue stats |
| POST   | /api/orders/{id}/review/ | Customer | Leave a review on completed order |

### Customers & Users
| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| GET   | /api/customers/ | Owner, Admin | List all customers |
| GET   | /api/users/ | Admin only | List all registered users |
| PATCH | /api/users/{id}/role/ | Admin only | Change a user's role |
| GET   | /api/notifications/ | Authenticated | Get notifications |

---

## Testing with Multiple Users

Each browser window shares the same localStorage. Use separate windows per user:

| User | Browser |
|------|---------|
| Admin | Chrome (normal window) |
| Owner | Chrome Incognito — `Ctrl+Shift+N` |
| Customer | Firefox or Edge |

---

## Django Admin Panel

To access the Django admin you need a superuser:
```bash
python manage.py createsuperuser
```

Then go to → http://127.0.0.1:8000/admin/

---

## Common Issues

**`(.venv)` not showing / pip not found**
Activate the virtual environment first (Step 2).

**`ModuleNotFoundError` on runserver**
Run `pip install -r requirements.txt` inside the activated virtual environment.

**CORS error in browser console**
Make sure `corsheaders` is in `INSTALLED_APPS` and `CorsMiddleware` is at the top of `MIDDLEWARE` in `config/settings.py`.

**`npm: command not found`**
Download Node.js from https://nodejs.org/

**Frontend shows blank page**
Both servers must be running — Django on 8000 AND Vite on 5173.

**Login says invalid credentials**
Register first at http://localhost:5173/register

**`TemplateDoesNotExist: docs.html`**
Make sure `docs.html` is placed in `orders/templates/api/` and `views.py` uses:
```python
return render(request, 'api/docs.html')
```

---

## Two Terminals Required

**Terminal 1 — Django Backend:**
```bash
source .venv/Scripts/activate
python manage.py runserver
```

**Terminal 2 — React Frontend:**
```bash
cd frontend
npm run dev
```

---

## Ubuntu Deployment (Django + PostgreSQL + Gunicorn + Nginx)

This repository now includes deployment templates and a helper script:

- `.env.example` - production environment variable template
- `scripts/deploy_ubuntu.sh` - automated server bootstrap + app deploy
- `scripts/postgres_setup.sql` - database/user grants
- `deploy/gunicorn.service` - systemd service template
- `deploy/nginx.ordering-system.conf` - Nginx site template

### Quick deploy

```bash
chmod +x scripts/deploy_ubuntu.sh
./scripts/deploy_ubuntu.sh
```

### Then configure

1. Edit `.env` on the server with production values.
2. Update `server_name` in Nginx config to your domain or server IP.
3. Restart services:

```bash
sudo systemctl restart ordering-system
sudo systemctl restart nginx
```

### Verify

```bash
sudo systemctl status ordering-system
sudo systemctl status nginx
```