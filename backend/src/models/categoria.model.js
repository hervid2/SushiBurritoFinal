// =================================================================
// ARCHIVO: src/models/categoria.model.js
// ROL: Define el modelo de Sequelize para la tabla 'categorias'.
//      Este modelo representa la estructura de la tabla y proporciona
//      la interfaz para interactuar con ella desde el código.
//      Implementa soft delete mediante paranoid.
// =================================================================

/**
 * Define y exporta el modelo 'Categoria' de Sequelize.
 *
 * @param {object} sequelize - La instancia de conexión de Sequelize.
 * @param {object} DataTypes - El objeto que contiene los tipos de datos de Sequelize.
 * @returns {object} El modelo 'Categoria' inicializado.
 */
export default (sequelize, DataTypes) => {
    // sequelize.define() crea un nuevo modelo.
    // El primer argumento 'Categoria' es el nombre del modelo en la aplicación.
    const Categoria = sequelize.define('Categoria', {
        // --- Definición de Atributos (Columnas) ---
        // Cada clave en este objeto corresponde a una columna en la tabla.

        categoria_id: {
            // type: Define el tipo de dato de la columna.
            type: DataTypes.INTEGER,
            // autoIncrement: Indica que la base de datos debe generar el valor automáticamente.
            autoIncrement: true,
            // primaryKey: Marca esta columna como la clave primaria de la tabla.
            primaryKey: true
        },
        nombre: {
            // STRING(100) equivale a VARCHAR(100) en SQL.
            type: DataTypes.STRING(100), 
            // allowNull: false indica que esta columna no puede contener valores nulos (es obligatoria).
            allowNull: false,
            // unique: true crea una restricción de unicidad, asegurando que no haya dos categorías con el mismo nombre.
            unique: true
        }
    }, {
        // --- Opciones Adicionales del Modelo ---

        // tableName: Especifica explícitamente el nombre de la tabla en la base de datos.
        tableName: 'categorias',
        
          // *** CAMBIO CLAVE: Habilitar soft delete ***
        // timestamps: true es necesario para usar paranoid
        timestamps: true,
        
        // paranoid: true habilita el soft delete
        // Sequelize usará la columna deletedAt automáticamente
        paranoid: true,
        
        // Especificar el nombre exacto de la columna en la BD
        deletedAt: 'deleted_at',
        
        // Deshabilitar createdAt y updatedAt si no las necesitas
        createdAt: false,
        updatedAt: false
    });

    // Se devuelve el modelo definido para que pueda ser utilizado en otras partes de la aplicación,
    // especialmente en 'src/models/index.js' para establecer las asociaciones.
    return Categoria;
};


