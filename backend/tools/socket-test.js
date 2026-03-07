// =================================================================
// ARCHIVO: socket-test.js
// ROL: Script para probar funcionalidades de Socket.IO
// =================================================================

import { io } from 'socket.io-client';
import axios from 'axios';

const API_URL = 'http://localhost:3000';

let token = process.env.TEST_TOKEN || '';

async function loginYObtenerToken() {
    const correo = process.env.TEST_CORREO;
    const contrasena = process.env.TEST_CONTRASENA;

    if (!correo || !contrasena) {
        throw new Error('Faltan variables de entorno: TEST_CORREO y TEST_CONTRASENA (o usa TEST_TOKEN)');
    }

    const res = await axios.post(`${API_URL}/api/auth/login`, { correo, contraseña: contrasena }, {
        headers: { 'Content-Type': 'application/json' }
    });

    if (!res.data || !res.data.accessToken) {
        throw new Error('La respuesta del login no contiene accessToken');
    }

    return res.data.accessToken;
}

/**
 * Crea una conexión Socket.IO con autenticación
 */
function crearSocketCliente(etiqueta = 'CLIENTE') {
    const socket = io(API_URL, {
        auth: { token },
        transports: ['websocket', 'polling']
    });

    // Eventos de conexión
    socket.on('connect', () => {
        console.log(`[${etiqueta}] ✅ Conectado: ${socket.id}`);
    });

    socket.on('connect_error', (err) => {
        console.log(`[${etiqueta}] ❌ Error de conexión:`, err.message);
    });

    // Eventos de autenticación
    socket.on('estado_conexion', (data) => {
        console.log(`[${etiqueta}] 📊 Estado conexión:`, data);
    });

    socket.on('conexion_confirmada', (data) => {
        console.log(`[${etiqueta}] ✅ Conexión confirmada:`, data);
    });

    // Eventos de notificaciones
    socket.on('nuevo_pedido', (data) => {
        console.log(`[${etiqueta}] 🆕 NUEVO PEDIDO:`, data);
    });

    socket.on('cambio_estado_pedido', (data) => {
        console.log(`[${etiqueta}] 🔄 CAMBIO ESTADO:`, data);
    });

    socket.on('pedido_cancelado', (data) => {
        console.log(`[${etiqueta}] ❌ PEDIDO CANCELADO:`, data);
    });

    socket.on('actualizar_dashboard', (data) => {
        console.log(`[${etiqueta}] 📈 DASHBOARD ACTUALIZADO:`, data);
    });

    socket.on('historial_dashboard', (data) => {
        console.log(`[${etiqueta}] 📋 HISTORIAL DASHBOARD:`, data);
    });

    socket.on('disconnect', (reason) => {
        console.log(`[${etiqueta}] 🔌 Desconectado:`, reason);
    });

    return socket;
}

/**
 * Realiza una petición HTTP con autenticación
 */
async function hacerPeticion(method, endpoint, data = null) {
    try {
        const config = {
            method,
            url: `${API_URL}${endpoint}`,
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        };

        if (data) {
            config.data = data;
        }

        const response = await axios(config);
        return response.data;
    } catch (error) {
        console.error(`❌ Error en ${method} ${endpoint}:`, error.response?.data || error.message);
        throw error;
    }
}

/**
 * Flujo completo de pruebas
 */
async function ejecutarPruebas() {
    console.log('🚀 INICIANDO PRUEBAS DE SOCKET.IO\n');

    if (!token) {
        token = await loginYObtenerToken();
    }

    // 1. Conectar cliente Socket.IO
    const socket = crearSocketCliente('ADMIN');
    
    // Esperar conexión
    await new Promise(resolve => {
        socket.on('connect', resolve);
        setTimeout(resolve, 2000); // Timeout por si falla
    });

    if (!socket.connected) {
        console.log('❌ No se pudo conectar al servidor Socket.IO');
        return;
    }

    console.log('\n📝 CREANDO PEDIDO...');
    
    try {
        // 2. Crear pedido
        const pedidoResponse = await hacerPeticion('POST', '/api/pedidos', {
            mesa_id: 1,
            items: [
                { producto_id: 1, cantidad: 2, notas: 'Prueba Socket.IO' }
            ]
        });
        
        console.log('✅ Pedido creado:', pedidoResponse.pedido);
        
        // 3. Unirse a sala del pedido
        socket.emit('unir_sala_pedido', { pedidoId: pedidoResponse.pedido.pedido_id });
        
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // 4. Cambiar estado del pedido
        console.log('\n🔄 CAMBIANDO ESTADO DEL PEDIDO...');
        await hacerPeticion('PUT', `/api/pedidos/${pedidoResponse.pedido.pedido_id}/estado`, {
            estado: 'en_preparacion'
        });
        
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // 5. Cancelar pedido
        console.log('\n❌ CANCELANDO PEDIDO...');
        await hacerPeticion('DELETE', `/api/pedidos/${pedidoResponse.pedido.pedido_id}`);
        
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // 6. Solicitar historial (solo admin)
        console.log('\n📋 SOLICITANDO HISTORIAL...');
        socket.emit('obtener_historial');
        
        await new Promise(resolve => setTimeout(resolve, 2000));
        
    } catch (error) {
        console.error('❌ Error en el flujo de pruebas:', error.message);
    }

    // 7. Desconectar
    console.log('\n🔌 DESCONECTANDO...');
    socket.disconnect();
    
    console.log('\n✅ PRUEBAS COMPLETADAS');
}

// Ejecutar pruebas
ejecutarPruebas().catch(console.error);
