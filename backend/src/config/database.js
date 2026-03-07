// =================================================================
// ARCHIVO: src/config/database.js
// ROL: Establece y configura la conexión a la base de datos
//      utilizando Sequelize. Este es el punto central de la
//      configuración de la base de datos para toda la aplicación.
// =================================================================

// Se importa la clase Sequelize, que es el constructor principal del ORM(Object-Relational Mapper).
import { Sequelize } from 'sequelize';
import { env } from './env.js';

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
        // dialect: Especifica el tipo de SQL que se usará. Es crucial para que Sequelize
        // genere las consultas correctas.
        dialect: 'mysql',
        logging: env.nodeEnv === 'development' ? console.log : false,
    }
);

// Se exporta la instancia 'sequelize' por defecto.
// Otros archivos, como 'src/models/index.js', importarán esta instancia
// para definir los modelos y realizar operaciones en la base de datos.
export default sequelize;
