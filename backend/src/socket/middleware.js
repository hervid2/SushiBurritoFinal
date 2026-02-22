// =================================================================
// ARCHIVO: src/socket/middleware.js
// ROL: Middleware para autenticación de conexiones Socket.IO
//      Verifica tokens JWT y asigna usuarios a salas según su rol.
// =================================================================

import jwt from 'jsonwebtoken';
import db from '../models/index.js';

/**
 * Middleware de autenticación para Socket.IO
 * Verifica el token JWT y extrae información del usuario
 * @param {object} socket - Socket del cliente
 * @param {function} next - Función para continuar al siguiente middleware
 */
export const authenticateSocket = async (socket, next) => {
    try {
        // El token se envía en el handshake de conexión
        const token = socket.handshake.auth.token;
        
        if (!token) {
            return next(new Error('Token de autenticación requerido'));
        }

        // Verificar el token JWT con ACCESS_TOKEN_SECRET
        const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
        
        // Consultar usuario en BD para obtener nombre y rol
        const usuario = await db.Usuario.findByPk(decoded.id, {
            include: [{
                model: db.Rol,
                attributes: ['nombre_rol']
            }]
        });

        if (!usuario) {
            return next(new Error('Usuario no encontrado'));
        }

        // Adjuntar información del usuario al socket
        socket.userId = usuario.usuario_id;
        socket.userRol = usuario.Rol.nombre_rol;
        socket.userName = usuario.nombre;
        
        console.log(`Usuario ${socket.userName} (rol: ${socket.userRol}) conectado via Socket.IO`);
        
        next();
    } catch (error) {
        console.error('Error en autenticación Socket.IO:', error.message);
        next(new Error('Token inválido o expirado'));
    }
};

/**
 * Asigna el usuario a las salas correspondientes según su rol
 * @param {object} socket - Socket del cliente
 */
export const assignUserToRooms = (socket) => {
    const { userRol, userId } = socket;
    
    // Sala general para todas las notificaciones
    socket.join('notificaciones_globales');
    
    // Asignar a salas específicas por rol
    switch (userRol) {
        case 'cocinero':
            socket.join('cocineros');
            console.log(`Cocinero ${socket.userName} asignado a sala 'cocineros'`);
            break;
            
        case 'mesero':
            socket.join('meseros');
            console.log(`Mesero ${socket.userName} asignado a sala 'meseros'`);
            break;
            
        case 'administrador':
            socket.join('administradores');
            socket.join('cocineros'); // Admin puede ver todo
            socket.join('meseros');
            console.log(`Administrador ${socket.userName} asignado a todas las salas`);
            break;
            
        default:
            console.log(`Usuario ${socket.userName} con rol ${userRol} sin salas específicas`);
    }
    
    // Sala personal para notificaciones individuales
    socket.join(`usuario_${userId}`);
};
