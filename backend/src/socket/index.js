// =================================================================
// ARCHIVO: src/socket/index.js
// ROL: Configuración principal de Socket.IO
//      Inicializa el servidor de Socket.IO y registra todos los eventos.
// =================================================================

import { Server } from 'socket.io';
import { authenticateSocket, assignUserToRooms } from './middleware.js';
import { registerSocketEvents } from './events.js';
import { env } from '../config/env.js';

/**
 * Crea y configura una instancia de Socket.IO
 * @param {object} httpServer - Servidor HTTP de Express
 * @returns {object} Instancia de Socket.IO configurada
 */
export const createSocketServer = (httpServer) => {
    // Crear instancia de Socket.IO con configuración de CORS
    const io = new Server(httpServer, {
        cors: {
            origin: env.frontendOrigins,
            methods: ["GET", "POST"],
            credentials: true
        },
        transports: ['websocket', 'polling'] // Permitir ambos transportes para mejor compatibilidad
    });

    // Middleware de autenticación para todas las conexiones
    io.use(authenticateSocket);

    // Manejar conexiones de clientes
    io.on('connection', (socket) => {
        console.log(` Nueva conexión Socket.IO: ${socket.id}`);
        
        // Asignar usuario a salas correspondientes
        assignUserToRooms(socket);
        
        // Registrar todos los eventos del socket
        registerSocketEvents(io, socket);
        
        // Enviar estado inicial
        socket.emit('estado_conexion', {
            conectado: true,
            salas: Array.from(socket.rooms),
            timestamp: new Date().toISOString()
        });
    });

    // Manejar errores del servidor
    io.on('error', (error) => {
        console.error('Error en servidor Socket.IO:', error);
    });

    // Log de inicialización
    console.log('🔌 Servidor Socket.IO inicializado y escuchando conexiones');
    
    return io;
};

/**
 * Obtiene la instancia de Socket.IO (para uso en controladores)
 * @param {object} req - Objeto de petición Express
 * @returns {object} Instancia de Socket.IO
 */
export const getSocketIO = (req) => {
    return req.app.get('io');
};
