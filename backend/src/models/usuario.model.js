

// Se importa la librería bcryptjs para el hasheo de contraseñas.
import bcrypt from 'bcryptjs';

export default (sequelize, DataTypes) => {
    const Usuario = sequelize.define('Usuario', {

        usuario_id: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true
        },
        nombre: {
            type: DataTypes.STRING(100),
            allowNull: false
        },
        rol_id: {
            type: DataTypes.INTEGER,
            allowNull: false
        },
        correo: {
            type: DataTypes.STRING(100),
            allowNull: false,
            unique: true,
            validate: {
                isEmail: true
            }
        },
        contraseña: {
            type: DataTypes.STRING(255),
            allowNull: false
        },

        // IMPORTANTE: agregar esta columna
        deleted_at: {
            type: DataTypes.DATE,
            allowNull: true
        }

    }, {
        tableName: 'usuarios',

        //  ACTIVA timestamps porque paranoid los necesita
        timestamps: true,

        // ACTIVA soft delete
        paranoid: true,

        // Usa tu nombre personalizado
        deletedAt: 'deleted_at',

        hooks: {
            beforeCreate: async (usuario) => {
                if (usuario.contraseña) {
                    const salt = await bcrypt.genSalt(10);
                    usuario.contraseña = await bcrypt.hash(usuario.contraseña, salt);
                }
            }
        }
    });

    return Usuario;
};


