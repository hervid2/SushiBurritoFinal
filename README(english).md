Management System for "Sushi Burrito" Restaurant
This repository contains the full source code for a restaurant management system (POS), designed to optimize the daily operations of "Sushi Burrito". The application is divided into a robust backend built with Node.js/Express and an interactive frontend built with Vanilla JavaScript and Vite.

🚀 Key Features
User Authentication and Roles: Secure login system with JWT (Access and Refresh Tokens) and role-based access control (Administrator, Waiter, Cook).

Menu Management (CRUD): Interface for administrators to create, read, update, and delete products and menu categories.

Table and Order Management: Complete workflow for waiters, from creating new orders at available tables to editing and tracking them.

Kitchen Interface: A "task board" view for kitchen staff to see pending orders, and mark them as "in preparation" and "ready".

Billing System: Generation of invoices from delivered orders, with tax and tip calculation. Includes the ability to void invoices for correction.

Reports and Statistics:

Administrative dashboard with key real-time metrics.

Statistics page with date filters to analyze revenue, best-selling products, and payment methods.

PDF report generation and email delivery.

🛠️ Tech Stack
Backend
Environment: Node.js

Framework: Express.js

Database: MySQL

ORM: Sequelize

Authentication: JSON Web Tokens (jsonwebtoken)

Security: bcryptjs for password hashing

Utilities: nodemailer for sending emails, pdfkit for PDF generation.

Frontend
Language: JavaScript (Vanilla JS, ES Modules)

Build Tool: Vite

Styling: CSS with Variables and modular architecture.

Notifications: SweetAlert2

⚙️ Installation and Setup
To get the project up and running, you will need to clone this repository and set up both the backend and the frontend separately.

Prerequisites
Node.js (version 18 or higher recommended)

NPM (usually installed with Node.js)

A running MySQL database server.

1. Backend Setup
Navigate to the backend folder:

cd backend

Install dependencies:

npm install

Set up global environment variables:

Create a copy of `backend/.env.example` and rename it to `backend/.env`.

Open `backend/.env` and fill in all variables with your credentials:

```env
# Server Configuration
NODE_ENV=development
PORT=3000

# Database Configuration
DB_HOST=localhost
DB_USER=your_mysql_user
DB_PASSWORD=your_mysql_password
DB_NAME=sushi_burrito_db

# JSON Web Token secrets (use random and secure values)
ACCESS_TOKEN_SECRET=your_super_secret_for_access_token
REFRESH_TOKEN_SECRET=your_other_super_secret_for_refresh_token
ACCESS_TOKEN_EXPIRES_IN=15m
REFRESH_TOKEN_EXPIRES_IN=7d
REFRESH_TOKEN_MAX_AGE_MS=604800000
REFRESH_COOKIE_NAME=refreshToken
REFRESH_COOKIE_SAME_SITE=lax
REFRESH_COOKIE_SECURE=false

# Frontend allowed for CORS (supports comma-separated origins)
FRONTEND_URL=http://localhost:5173
RESET_PASSWORD_URL=http://localhost:5173/#/reset-password

# Basic auth endpoint protection
AUTH_RATE_LIMIT_WINDOW_MS=900000
AUTH_RATE_LIMIT_MAX_REQUESTS=20

# Email configuration (e.g. Gmail)
EMAIL_SERVICE=gmail
EMAIL_USER=your_email@gmail.com
EMAIL_PASSWORD=your_gmail_app_password
```

Set up Frontend environment variables (Vite):

Create a copy of `Frontend/.env.example` and rename it to `Frontend/.env`.

Define:

```env
VITE_API_URL=http://localhost:3000/api
VITE_SOCKET_URL=http://localhost:3000
```

Create the database: Make sure to create a database in MySQL with the name you specified in `DB_NAME`.

Seed the database with initial data:

The src/seed.js file is set up to create the default roles and an administrator user.

Run the following command:

npm run db:seed

This will insert the roles and the first administrator user so you can log in.

2. Frontend Setup
Open a new terminal and navigate to the frontend folder:

cd frontend

Install dependencies:

npm install

▶️ Running the Application
You should have two terminals open, one for the backend and one for the frontend.

Start the Backend Server:

In the backend folder terminal, run:

npm run dev

The server will start on http://localhost:3000.

Start the Frontend Application:

In the frontend folder terminal, run:

npm run dev

The application will be available at http://localhost:5173.

Now you can open http://localhost:5173 in your browser and start using the application!

---

🧪 Testing

Backend:

```bash
npm test
```

Includes:
- 2 unit tests (`verifyToken` and `rate limiter`).
- 1 integration test (security headers + auth endpoint throttling).

Frontend:

```bash
npm test
```

Includes unit tests for auth helpers.

E2E:

```bash
npm run test:e2e
```

Includes 1 login E2E flow for administrator navigation to dashboard.
