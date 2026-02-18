

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

        // 🔥 Campo para forzar cambio de contraseña en primer login
        must_change_password: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: true
        },

        deleted_at: {
            type: DataTypes.DATE,
            allowNull: true
        }

    }, {
        tableName: 'usuarios',
        timestamps: true,
        paranoid: true,
        deletedAt: 'deleted_at',

        hooks: {

            // 🔐 Encripta automáticamente al crear
            beforeCreate: async (usuario) => {
                if (usuario.contraseña) {
                    const salt = await bcrypt.genSalt(10);
                    usuario.contraseña = await bcrypt.hash(usuario.contraseña, salt);
                }
            },

            // 🔐 Encripta solo si la contraseña cambió
            beforeUpdate: async (usuario) => {
                if (usuario.changed('contraseña')) {
                    const salt = await bcrypt.genSalt(10);
                    usuario.contraseña = await bcrypt.hash(usuario.contraseña, salt);
                }
            }
        }
    });

    return Usuario;
};
