// =================================================================
// ARCHIVO: app.js
// ROL: Punto de entrada principal y archivo de configuración para
//      el servidor de backend. Ensambla todas las partes de la
//      aplicación Express.
// =================================================================

// --- Importación de Módulos y Librerías ---
import express from 'express';      // Framework principal para construir el servidor web.
import { createServer } from 'http'; // Módulo para crear servidor HTTP para Socket.IO
import cors from 'cors';            // Middleware para habilitar Cross-Origin Resource Sharing, que la api confíe en compartir datos con el frontend.
import cookieParser from 'cookie-parser'; // Middleware para parsear cookies entrantes.
import dotenv from 'dotenv';        // Módulo para cargar variables de entorno desde un archivo .env.
import db from './src/models/index.js'; // Objeto de base de datos inicializado por Sequelize.
import { createSocketServer } from './src/socket/index.js'; // Configuración de Socket.IO
import { env, validateEnvironment } from './src/config/env.js';
import { applySecurityHeaders } from './src/middleware/securityHeaders.middleware.js';
import { createAuthRateLimiter } from './src/middleware/rateLimit.middleware.js';

// Carga las variables de entorno definidas en el archivo .env a process.env.
dotenv.config();
validateEnvironment();

// --- Importación de los Módulos de Rutas ---
// Cada archivo de rutas define los endpoints para una entidad específica.
import usuarioRoutes from './src/routes/usuario.routes.js';
import authRoutes from './src/routes/auth.routes.js';
import categoriaRoutes from './src/routes/categoria.routes.js'; 
import productoRoutes from './src/routes/producto.routes.js';
import mesaRoutes from './src/routes/mesa.routes.js';
import pedidoRoutes from './src/routes/pedido.routes.js';
import facturaRoutes from './src/routes/factura.routes.js';
import metodoPagoRoutes from './src/routes/metodo_pago.routes.js';
import statsRoutes from './src/routes/stats.routes.js';

// Se crea una instancia de la aplicación Express.
const app = express();
const authRateLimiter = createAuthRateLimiter();

if (env.nodeEnv === 'production') {
    app.set('trust proxy', 1);
}

// --- Configuración de Middlewares ---
// Un middleware es una función que procesa una petición antes de que llegue a su manejador de ruta final.

// app.use(cors()): Habilita CORS para permitir peticiones desde el frontend
// que se sirve en un origen diferente (ej. localhost:5173).
app.use(cors({
    origin: (origin, callback) => {
        if (!origin || env.frontendOrigins.includes(origin)) {
            callback(null, true);
            return;
        }

        callback(new Error('Origen no permitido por CORS.'));
    },
    credentials: true
}));

app.use(applySecurityHeaders);

// app.use(express.json()): Parsea las peticiones entrantes con payloads en formato JSON.
// Esto permite acceder a los datos del cuerpo de la petición a través de `req.body`.
app.use(express.json());

// app.use(cookieParser()): Permite acceder a cookies enviadas por el cliente.
app.use(cookieParser());

// --- Definición de Rutas (Endpoints) ---

// Ruta raíz de la API para verificar que el servidor está funcionando.
app.get('/api', (req, res) => {
    res.json({ message: 'Bienvenido al API de Sushi Burrito.' });
});

// Se registran los routers para cada entidad bajo un prefijo de ruta base.
// Por ejemplo, todas las rutas definidas en 'authRoutes' estarán bajo '/api/auth'.
app.use('/api/auth', authRateLimiter);
app.use('/api/auth', authRoutes);
app.use('/api/usuarios', usuarioRoutes);
app.use('/api/categorias', categoriaRoutes);
app.use('/api/productos', productoRoutes);
app.use('/api/mesas', mesaRoutes);
app.use('/api/pedidos', pedidoRoutes);
app.use('/api/facturas', facturaRoutes);
app.use('/api/metodos-pago', metodoPagoRoutes);
app.use('/api/stats', statsRoutes);

// --- Conexión a la Base de Datos y Arranque del Servidor ---

// db.sequelize.sync() intenta conectar con la base de datos y sincronizar los modelos.
// El servidor solo arranca si la conexión a la base de datos es exitosa.
db.sequelize.sync().then(() => {
    console.log('Base de datos sincronizada.');
    
    // Se obtiene el puerto de las variables de entorno, con un valor por defecto de 3000.
    const PORT = env.port;
    
    // Crear servidor HTTP para soporte de Socket.IO
    const httpServer = createServer(app);
    
    // Inicializar servidor Socket.IO
    const io = createSocketServer(httpServer);
    
    // Hacer disponible la instancia de Socket.IO para los controladores
    app.set('io', io);
    
    // Iniciar servidor HTTP
    httpServer.listen(PORT, () => {
        console.log(`Servidor HTTP corriendo en el puerto ${PORT}.`);
        console.log(`Servidor Socket.IO habilitado para notificaciones en tiempo real.`);
    });
}).catch((err) => {
    // Si la conexión a la base de datos falla, se muestra un error y el servidor no arranca.
    console.error('Fallo al sincronizar la base de datos:', err);
});