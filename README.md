# Sistema de Gestión para Restaurante "Sushi Burrito"

Este repositorio contiene el código fuente completo para un sistema de gestión de restaurantes (POS), diseñado para optimizar las operaciones diarias de "Sushi Burrito". La aplicación está dividida en un backend robusto construido con Node.js/Express y un frontend interactivo construido con Vanilla JavaScript y Vite.

---

## 🚀 Características Principales

-   **Autenticación y Roles de Usuario:** Sistema de inicio de sesión seguro con JWT (Access y Refresh Tokens) y control de acceso basado en roles (Administrador, Mesero, Cocinero).
-   **Gestión de Menú (CRUD):** Interfaz para que los administradores puedan crear, leer, actualizar y eliminar productos y categorías del menú.
-   **Gestión de Mesas y Pedidos:** Flujo de trabajo completo para meseros, desde la creación de nuevos pedidos en mesas disponibles hasta la edición y seguimiento de los mismos.
-   **Interfaz para Cocina:** Vista de "tablero de tareas" para que el personal de cocina pueda ver los pedidos pendientes, marcarlos como "en preparación" y "listos".
-   **Sistema de Facturación:** Generación de facturas a partir de pedidos entregados, con cálculo de impuestos y propinas. Incluye la capacidad de anular facturas para corrección.
-   **Reportes y Estadísticas:**
    -   Dashboard administrativo con métricas clave en tiempo real.
    -   Página de estadísticas con filtros por fecha para analizar ingresos, productos más vendidos y métodos de pago.
    -   Generación de reportes en PDF y envío por correo electrónico.

---

## 🛠️ Stack Tecnológico

### Backend
-   **Entorno:** Node.js
-   **Framework:** Express.js
-   **Base de Datos:** MySQL
-   **ORM:** Sequelize
-   **Autenticación:** JSON Web Tokens (`jsonwebtoken`)
-   **Seguridad:** `bcryptjs` para el hasheo de contraseñas
-   **Utilidades:** `nodemailer` para envío de correos, `pdfkit` para generación de PDFs.

### Frontend
-   **Lenguaje:** JavaScript (Vanilla JS, ES Modules)
-   **Herramienta de Construcción:** Vite
-   **Estilos:** CSS con Variables y arquitectura modular.
-   **Notificaciones:** SweetAlert2

---

## ⚙️ Instalación y Configuración

Para poner en marcha el proyecto, necesitarás clonar este repositorio y configurar tanto el backend como el frontend por separado.

### Requisitos Previos
-   Node.js (versión 18 o superior recomendada)
-   NPM (generalmente se instala con Node.js)
-   Un servidor de base de datos MySQL en ejecución.

### 1. Configuración del Backend

1.  **Navega a la carpeta del backend:**
    ```bash
    cd backend
    ```

2.  **Instala las dependencias:**
    ```bash
    npm install
    ```

3.  **Configura las variables de entorno (globales):**
    -   Crea una copia del archivo `backend/.env.example` y renómbrala a `backend/.env`.
    -   Abre el archivo `backend/.env` y rellena todas las variables con tus credenciales:
        ```env
        # Configuración del Servidor
        NODE_ENV=development
        PORT=3000

        # Configuración de la Base de Datos
        DB_HOST=localhost
        DB_USER=tu_usuario_mysql
        DB_PASSWORD=tu_contraseña_mysql
        DB_NAME=sushi_burrito_db

        # Secretos para JSON Web Token (genera cadenas aleatorias y seguras)
        ACCESS_TOKEN_SECRET=tu_secreto_super_seguro_para_access_token
        REFRESH_TOKEN_SECRET=tu_otro_secreto_super_seguro_para_refresh_token
        ACCESS_TOKEN_EXPIRES_IN=15m
        REFRESH_TOKEN_EXPIRES_IN=7d
        REFRESH_TOKEN_MAX_AGE_MS=604800000
        REFRESH_COOKIE_NAME=refreshToken
        REFRESH_COOKIE_SAME_SITE=lax
        REFRESH_COOKIE_SECURE=false

        # Frontend permitido para CORS (acepta múltiples orígenes separados por coma)
        FRONTEND_URL=http://localhost:5173
        RESET_PASSWORD_URL=http://localhost:5173/#/reset-password

        # Rate limit de autenticación
        AUTH_RATE_LIMIT_WINDOW_MS=900000
        AUTH_RATE_LIMIT_MAX_REQUESTS=20

        # Configuración para envío de correos (ej. con Gmail)
        EMAIL_SERVICE=gmail
        EMAIL_USER=tu_correo@gmail.com
        EMAIL_PASSWORD=tu_contraseña_de_aplicacion_de_gmail
        ```

4.  **Configura variables de entorno del Frontend (Vite):**
    -   Crea una copia de `Frontend/.env.example` y renómbrala a `Frontend/.env`.
    -   Define:
        ```env
        VITE_API_URL=http://localhost:3000/api
        VITE_SOCKET_URL=http://localhost:3000
        ```

5.  **Crea la base de datos:** Asegúrate de crear una base de datos en MySQL con el nombre que especificaste en `DB_NAME`.

6.  **Puebla la base de datos con datos iniciales:**
    -   El archivo `src/seed.js` está preparado para crear los roles y un usuario administrador por defecto.
    -   Ejecuta el siguiente comando:
    ```bash
    npm run db:seed
    ```
    Esto insertará los roles y el primer usuario administrador para que puedas iniciar sesión.

### 2. Configuración del Frontend

1.  **Abre una nueva terminal y navega a la carpeta del frontend:**
    ```bash
    cd frontend
    ```

2.  **Instala las dependencias:**
    ```bash
    npm install
    ```

---

## ▶️ Ejecución de la Aplicación

Debes tener dos terminales abiertas, una para el backend y otra para el frontend.

1.  **Iniciar el Servidor Backend:**
    -   En la terminal de la carpeta `backend`, ejecuta:
    ```bash
    npm run dev
    ```
    -   El servidor se iniciará en `http://localhost:3000`.

2.  **Iniciar la Aplicación Frontend:**
    -   En la terminal de la carpeta `frontend`, ejecuta:
    ```bash
    npm run dev
    ```
    -   La aplicación estará disponible en `http://localhost:5173`.

¡Ahora puedes abrir `http://localhost:5173` en tu navegador y empezar a usar la aplicación!

---

## 🧪 Pruebas

### Backend
```bash
npm test
```

Incluye:
- 2 pruebas unitarias (`verifyToken` y `rate limiter`).
- 1 prueba de integración (cabeceras de seguridad + limitación en `/api/auth/login`).

### Frontend
```bash
npm test
```

Incluye pruebas unitarias de helpers de autenticación.

### E2E
```bash
npm run test:e2e
```

Prueba de login E2E del rol administrador con navegación a dashboard.

---
