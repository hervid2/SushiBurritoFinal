// =================================================================
// ARCHIVO: src/config/database.js
// ROL: Establece y configura la conexión a la base de datos
//      utilizando Sequelize. Este es el punto central de la
//      configuración de la base de datos para toda la aplicación.
// =================================================================

// Se importa la clase Sequelize, que es el constructor principal del ORM(Object-Relational Mapper).
import { Sequelize } from 'sequelize';
import fs from 'fs';
import { env } from './env.js';

// --- Configuración TLS opcional ---
// Las bases gestionadas (DigitalOcean, PlanetScale, etc.) exigen conexión cifrada.
// Con DB_SSL sin definir el comportamiento es el de siempre: conexión sin TLS.
const buildSslOptions = () => {
    if (String(process.env.DB_SSL || '').toLowerCase() !== 'true') return undefined;

    const caPath = String(process.env.DB_SSL_CA_PATH || '').trim();

    return {
        // El certificado de la autoridad que entrega el proveedor (ej. ca-certificate.crt).
        ca: caPath ? fs.readFileSync(caPath, 'utf8') : undefined,
        // Solo se desactiva la verificación si se pide explícitamente.
        rejectUnauthorized: String(process.env.DB_SSL_REJECT_UNAUTHORIZED || 'true').toLowerCase() !== 'false'
    };
};

const sslOptions = buildSslOptions();

// --- Creación de la Instancia de Sequelize ---
// Se crea una nueva instancia de Sequelize, que representa la conexión a la base de datos.
const sequelize = new Sequelize(
    // Argumento 1: Nombre de la base de datos, obtenido de las variables de entorno.
    process.env.DB_NAME,
    // Argumento 2: Nombre de usuario de la base de datos.
    process.env.DB_USER,
    // Argumento 3: Contraseña del usuario de la base de datos.
    process.env.DB_PASSWORD,
    // Argumento 4: Objeto de configuración.
    {
        // host: La dirección del servidor de la base de datos.
        host: process.env.DB_HOST,
        // port: las bases gestionadas exponen MySQL en un puerto distinto al 3306
        // (DigitalOcean usa 25060), sobre todo al conectarse desde fuera de su red privada.
        port: Number(process.env.DB_PORT) || 3306,
        // dialect: Especifica el tipo de SQL que se usará. Es crucial para que Sequelize
        // genere las consultas correctas.
        dialect: 'mysql',
        // Solo se envía dialectOptions cuando DB_SSL=true, para no alterar conexiones locales.
        ...(sslOptions ? { dialectOptions: { ssl: sslOptions } } : {}),
        logging: env.nodeEnv === 'development' ? console.log : false,
    }
);

// Se exporta la instancia 'sequelize' por defecto.
// Otros archivos, como 'src/models/index.js', importarán esta instancia
// para definir los modelos y realizar operaciones en la base de datos.
export default sequelize;
