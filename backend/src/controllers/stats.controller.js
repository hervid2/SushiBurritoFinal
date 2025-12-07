// =================================================================
// ARCHIVO: src/controllers/stats.controller.js
// ROL: Controlador que maneja la lógica para la agregación de datos,
//      generación de estadísticas y reportes para el negocio.
// =================================================================

import db from '../models/index.js';
import { Op, where } from 'sequelize';
import PDFDocument from 'pdfkit';
import nodemailer from 'nodemailer';
import fs from 'fs';

const { Factura, Pedido, DetallePedido, Producto, Usuario, MetodoPago, TransaccionPago, sequelize } = db;

/**
 * Función auxiliar que centraliza las consultas de estadísticas a la base de datos.
 * @param {string} startDate - La fecha de inicio del rango.
 * @param {string} endDate - La fecha de fin del rango.
 * @returns {Promise<object>} - Un objeto con los datos de estadísticas agregados.
 */
const getStatisticsData = async (startDate, endDate) => {
    const finalEndDate = new Date(endDate);
    finalEndDate.setDate(finalEndDate.getDate() + 1); // Se ajusta para incluir el día final completo.
    const dateFilter = { [Op.gte]: new Date(startDate), [Op.lt]: finalEndDate };

    // Se ejecutan todas las consultas de agregación en paralelo para mayor eficiencia.
    const [summary, productsRanking, paymentMethods] = await Promise.all([
        // 1. Resumen de totales de facturas.
        Factura.findOne({
            attributes: [
                [sequelize.fn('COUNT', sequelize.col('factura_id')), 'totalOrders'],
                [sequelize.fn('SUM', sequelize.col('total')), 'totalRevenue']
            ],
            where: { fecha_factura: dateFilter },
            raw: true
        }),
        // 2. Ranking de los 10 productos más vendidos.
        DetallePedido.findAll({
            attributes: [
                [sequelize.col('Producto.nombre_producto'), 'name'],
                [sequelize.fn('SUM', sequelize.col('cantidad')), 'quantity']
            ],
            include: [
                { model: Producto, attributes: [] }, // Join para obtener el nombre.
                { model: Pedido, attributes: [], where: { fecha_creacion: dateFilter }, required: true } // Join para filtrar por fecha.
            ],
            group: ['Producto.nombre_producto'],
            order: [[sequelize.fn('SUM', sequelize.col('cantidad')), 'DESC']],
            limit: 10,
            raw: true
        }),
        // 3. Desglose de ingresos por método de pago.
        TransaccionPago.findAll({
            attributes: [
                [sequelize.col('MetodoPago.nombre_metodo'), 'name'],
                [sequelize.fn('SUM', sequelize.col('monto_pagado')), 'totalAmount']
            ],
            include: [
                { model: MetodoPago, attributes: [] },
                { model: Factura, attributes: [], where: { fecha_factura: dateFilter }, required: true }
            ],
            group: ['MetodoPago.nombre_metodo'],
            raw: true
        })
    ]);

    return {
        summary: { totalOrders: summary.totalOrders || 0, totalRevenue: parseFloat(summary.totalRevenue || 0).toFixed(2) },
        productsRanking,
        paymentMethods
    };
};

/**
 * Función auxiliar para dibujar una tabla con bordes en un documento PDF.
 * @param {PDFDocument} doc - La instancia del documento PDF de pdfkit.
 * @param {number} startY - La posición Y inicial para dibujar la tabla.
 * @param {string} title - El título de la tabla.
 * @param {Array<string>} headers - Un array con los nombres de las columnas.
 * @param {Array<Array<any>>} data - Un array de arrays con los datos de las filas.
 * @returns {number} - La posición Y final después de dibujar la tabla.
 */
function drawTable(doc, startY, title, headers, data) {
    let currentY = startY;
    const tableTop = startY + 25;
    const rowHeight = 25;
    const colWidths = [350, 150];
    const tableRight = 50 + colWidths[0] + colWidths[1];

    doc.fontSize(14).font('Helvetica-Bold').text(title, 50, currentY);
    currentY += 35;

    doc.font('Helvetica-Bold');
    headers.forEach((header, i) => {
        doc.text(header, 50 + (i * colWidths[i-1] || 0), currentY, { width: colWidths[i], align: 'left' });
    });
    doc.moveTo(50, currentY + rowHeight - 5).lineTo(tableRight, currentY + rowHeight - 5).stroke();
    currentY += rowHeight;

    doc.font('Helvetica');
    data.forEach(row => {
        row.forEach((cell, i) => {
            doc.text(String(cell), 50 + (i * colWidths[i-1] || 0), currentY, { width: colWidths[i], align: 'left' });
        });
        doc.moveTo(50, currentY + rowHeight - 5).lineTo(tableRight, currentY + rowHeight - 5).stroke();
        currentY += rowHeight;
    });

    doc.moveTo(50, tableTop - 10).lineTo(50, currentY - 5).stroke();
    doc.moveTo(50 + colWidths[0], tableTop - 10).lineTo(50 + colWidths[0], currentY - 5).stroke();
    doc.moveTo(tableRight, tableTop - 10).lineTo(tableRight, currentY - 5).stroke();

    return currentY;
}

/**
 * Función auxiliar para generar un PDF en memoria.
 * @param {object} stats - El objeto de estadísticas.
 * @param {string} startDate - La fecha de inicio del reporte.
 * @param {string} endDate - La fecha de fin del reporte.
 * @returns {Promise<Buffer>} - Una promesa que se resuelve con el buffer del PDF.
 */
async function createPdfBuffer(stats, startDate, endDate) {
    return new Promise((resolve) => {
        const doc = new PDFDocument({ margin: 50, size: 'A4' });
        const buffers = [];
        doc.on('data', buffers.push.bind(buffers));
        doc.on('end', () => resolve(Buffer.concat(buffers)));

        if (fs.existsSync('assets/logo.jpg')) {
            doc.image('assets/logo.jpg', { fit: [60, 60], x: 50, y: 45 });
        }
        
        doc.fontSize(18).font('Helvetica-Bold').text('Reporte de Estadísticas - Sushi Burrito', { align: 'center' });
        doc.fontSize(12).font('Helvetica').text(`Periodo: ${startDate} al ${endDate}`, { align: 'center' });
        doc.moveDown(3);

        let currentY = doc.y;

        const summaryData = [
            ['Total de Pedidos Facturados', stats.summary.totalOrders],
            ['Ingresos Totales', `$${stats.summary.totalRevenue}`]
        ];
        currentY = drawTable(doc, currentY, 'Resumen General', ['Descripción', 'Valor'], summaryData);
        currentY += 20;

        const paymentData = stats.paymentMethods.length > 0 
            ? stats.paymentMethods.map(method => [method.name, `$${parseFloat(method.totalAmount).toFixed(2)}`])
            : [['No hay datos para este período.', '']];
        currentY = drawTable(doc, currentY, 'Desglose por Método de Pago', ['Método', 'Monto Total'], paymentData);
        currentY += 20;

        const rankingData = stats.productsRanking.length > 0 
            ? stats.productsRanking.map(item => [item.name, item.quantity])
            : [['No hay ranking para este período.', '']];
        currentY = drawTable(doc, currentY, 'Ranking de Productos', ['Producto', 'Cantidad Vendida'], rankingData);
        
        doc.end();
    });
}

/**
 * Endpoint para obtener las estadísticas para un rango de fechas.
 */
export const getStatistics = async (req, res) => {
    try {
        const stats = await getStatisticsData(req.query.startDate, req.query.endDate);
        res.status(200).send(stats);
    } catch (error) {
        res.status(500).send({ message: "Error al procesar las estadísticas." });
    }
};

/**
 * Endpoint para generar y enviar un reporte PDF por correo.
 */
export const sendStatisticsReport = async (req, res) => {
    const { startDate, endDate } = req.body;
    try {
        const [stats, admin] = await Promise.all([ getStatisticsData(startDate, endDate), Usuario.findByPk(req.userId) ]);
        if (!admin) return res.status(404).send({ message: "Usuario administrador no encontrado." });
        const pdfBuffer = await createPdfBuffer(stats, startDate, endDate);
        await sendEmailWithAttachment(admin.correo, pdfBuffer, startDate, endDate);
        res.status(200).send({ message: `Reporte enviado exitosamente a ${admin.correo}` });
    } catch (error) {
        res.status(500).send({ message: "Error al procesar el reporte." });
    }
};

/**
 * Endpoint para obtener el resumen de datos para el Dashboard.
 */
export const getDashboardSummary = async (req, res) => {
    try {
        const [pendingOrders, totalUsers, dailySales] = await Promise.all([
            Pedido.count({ where: { estado: { [Op.in]: ['pendiente', 'en_preparacion'] } } }),
            // Usuario.count(),
            Usuario.count({
                where: {is_deleted: 0}
            }),
            Factura.sum('total', {
                where: {
                    fecha_factura: {
                        [Op.gte]: new Date(new Date().setHours(0, 0, 0, 0)),
                        [Op.lt]: new Date(new Date().setHours(23, 59, 59, 999))
                    }
                }
            })
        ]);
        res.status(200).send({
            pendingOrdersCount: pendingOrders || 0,
            registeredUsersCount: totalUsers || 0,
            dailySalesAmount: parseFloat(dailySales || 0).toFixed(2)
        });
    } catch (error) {
        res.status(500).send({ message: "Error al procesar las estadísticas del dashboard." });
    }
};

/**
 * Endpoint para obtener la actividad reciente para el Dashboard.
 */
export const getRecentActivity = async (req, res) => {
    try {
        const recentOrders = await Pedido.findAll({ limit: 5, order: [['fecha_creacion', 'DESC']], attributes: ['pedido_id', 'fecha_creacion'] });
        const recentInvoices = await Factura.findAll({ limit: 5, order: [['fecha_factura', 'DESC']], attributes: ['factura_id', 'pedido_id', 'fecha_factura'] });
        const activities = [
            ...recentOrders.map(order => ({ type: 'pedido', date: order.fecha_creacion, description: `Nuevo pedido #${order.pedido_id} fue creado.` })),
            ...recentInvoices.map(invoice => ({ type: 'factura', date: invoice.fecha_factura, description: `Se generó la factura #${invoice.factura_id} para el pedido #${invoice.pedido_id}.` }))
        ];
        const sortedActivities = activities.sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 5);
        res.status(200).send(sortedActivities);
    } catch (error) {
        res.status(500).send({ message: "Error interno al procesar la actividad." });
    }
};

/**
 * Función auxiliar para enviar un correo con un archivo adjunto.
 */
async function sendEmailWithAttachment(recipientEmail, pdfBuffer, startDate, endDate) {
    const transporter = nodemailer.createTransport({
        service: process.env.EMAIL_SERVICE,
        auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASSWORD }
    });
    await transporter.sendMail({
        from: `"Reporte ventas y estadísticas Sushi Burrito" <${process.env.EMAIL_USER}>`,
        to: recipientEmail,
        subject: `Reporte de (${startDate} a ${endDate})`,
        text: 'Adjunto encontrarás el reporte de estadísticas de ventas generado para el periodo seleccionado.',
        attachments: [{
            filename: `reporte_${startDate}_${endDate}.pdf`,
            content: pdfBuffer,
            contentType: 'application/pdf'
        }]
    });
}

