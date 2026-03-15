// =================================================================
// ARCHIVO: src/controllers/factura.controller.js
// ROL: Controlador que maneja la lógica de negocio para la
//      creación, anulación, consulta y envío de facturas.
// =================================================================

import db from '../models/index.js';
import nodemailer from 'nodemailer';
import PDFDocument from 'pdfkit';
import fs from 'fs'; // Se importa el módulo 'fs' para interactuar con el sistema de archivos.

const { Pedido, Factura, Producto, MetodoPago, DetallePedido, TransaccionPago, sequelize } = db;

/**
 * Crea una nueva factura, su transacción de pago asociada, y actualiza el estado del pedido.
 * Toda la operación se ejecuta dentro de una transacción de base de datos para garantizar la integridad.
 * @param {object} req - El objeto de la petición de Express.
 * @param {object} res - El objeto de la respuesta de Express.
 */
export const createInvoice = async (req, res) => {
    const { pedido_id, metodo_pago_id, propina } = req.body;

    if (!pedido_id || !metodo_pago_id) {
        return res.status(400).send({ message: "El ID del pedido y el método de pago son requeridos." });
    }

    // Se inicia una transacción de Sequelize.
    const t = await sequelize.transaction();
    try {
        // Se busca el pedido y se incluyen sus productos para el cálculo.
        const pedido = await Pedido.findByPk(pedido_id, {
            include: [{ model: Producto, through: { attributes: ['cantidad'] } }],
            transaction: t
        });

        if (!pedido) {
            await t.rollback();
            return res.status(404).send({ message: "Pedido no encontrado." });
        }
        // Se valida que el pedido esté en el estado correcto para ser facturado.
        if (pedido.estado !== 'entregado') {
             await t.rollback();
             return res.status(400).send({ message: `El pedido no se puede facturar en estado: ${pedido.estado}` });
        }

        // Se calculan los montos de la factura.
        let subtotal = 0;
        pedido.Productos.forEach(producto => {
            const cantidad = producto.DetallePedido.cantidad;
            subtotal += cantidad * parseFloat(producto.valor_neto);
        });
        
        const impuesto_total = subtotal * 0.08;
        const propina_valor = parseFloat(propina) || 0;
        const total = subtotal + impuesto_total + propina_valor;

        // 1. Se crea el registro de la factura.
        const nuevaFactura = await Factura.create({
            pedido_id, metodo_pago_id, subtotal, impuesto_total,
            propina: propina_valor, total
        }, { transaction: t });

        // 2. Se crea el registro de la transacción de pago.
        await TransaccionPago.create({
            factura_id: nuevaFactura.factura_id,
            metodo_pago_id: metodo_pago_id,
            monto_pagado: total 
        }, { transaction: t });
        
        // 3. Se actualiza el estado del pedido a 'pagado'.
        await pedido.update({ estado: 'pagado' }, { transaction: t });
        
        // Si todas las operaciones son exitosas, se confirman los cambios en la base de datos.
        await t.commit();
        res.status(201).send({ message: "Factura creada exitosamente.", factura: nuevaFactura });

    } catch (error) {
        // Si alguna operación falla, se revierten todos los cambios.
        await t.rollback();
        res.status(500).send({ message: "Error al crear la factura: " + error.message });
    }
};

/**
 * Anula una factura existente y revierte el estado del pedido asociado.
 * @param {object} req - El objeto de la petición de Express.
 * @param {object} res - El objeto de la respuesta de Express.
 */
export const voidInvoice = async (req, res) => {
    const { id } = req.params; 

    const t = await sequelize.transaction();
    try {
        const factura = await Factura.findByPk(id, { transaction: t });
        if (!factura) {
            await t.rollback();
            return res.status(404).send({ message: "Factura no encontrada para anular." });
        }

        const pedido = await Pedido.findByPk(factura.pedido_id, { transaction: t });
        if (!pedido) {
            await t.rollback();
            return res.status(404).send({ message: "Pedido asociado no encontrado." });
        }

        // Se eliminan en orden: transacciones, factura y luego se actualiza el pedido.
        await TransaccionPago.destroy({ where: { factura_id: id }, transaction: t });
        await Factura.destroy({ where: { factura_id: id }, transaction: t });
        await pedido.update({ estado: 'entregado' }, { transaction: t });

        await t.commit();
        res.status(200).send({ message: `Factura #${id} anulada correctamente. El pedido está listo para ser corregido y refacturado.` });

    } catch (error) {
        await t.rollback();
        console.error("Error al anular la factura:", error);
        res.status(500).send({ message: "Error interno al anular la factura." });
    }
};

/**
 * Obtiene los detalles de una factura específica por su ID.
 * @param {object} req - El objeto de la petición de Express.
 * @param {object} res - El objeto de la respuesta de Express.
 */
export const getInvoiceById = async (req, res) => {
    try {
        const { id } = req.params;
        const factura = await Factura.findByPk(id, {
            include: [
                { model: Pedido },
                { model: MetodoPago }
            ]
        });

        if (factura) {
            res.status(200).send(factura);
        } else {
            res.status(404).send({ message: `Factura con id=${id} no encontrada.` });
        }
    } catch (error) {
        res.status(500).send({ message: "Error al obtener la factura: " + error.message });
    }
};

/**
 * Envía una factura en formato PDF al correo electrónico de un cliente.
 * @param {object} req - El objeto de la petición de Express.
 * @param {object} res - El objeto de la respuesta de Express.
 */
export const sendInvoiceByEmail = async (req, res) => {
    const { id } = req.params;
    const { email } = req.body;

    if (!email) {
        return res.status(400).send({ message: "La dirección de correo es requerida." });
    }

    try {
        // Se obtienen todos los datos necesarios para construir el PDF.
        const factura = await Factura.findByPk(id, {
            include: [
                {
                    model: Pedido,
                    include: [{
                        model: Producto,
                        through: { attributes: ['cantidad', 'notas'] }
                    }]
                },
                { model: MetodoPago }
            ]
        });

        if (!factura) {
            return res.status(404).send({ message: "Factura no encontrada." });
        }

        // Se generan el PDF y el correo de forma secuencial.
        const pdfBuffer = await createInvoicePdfBuffer(factura);
        await sendEmailWithAttachment(email, pdfBuffer, factura.factura_id);

        res.status(200).send({ message: `Factura enviada exitosamente a ${email}` });

    } catch (error) {
        console.error("Error al enviar la factura por correo:", error);
        res.status(500).send({ message: "Error interno al procesar el envío de la factura." });
    }
};

/**
 * Función auxiliar para generar un PDF en memoria usando pdfkit.
 * @param {object} factura - El objeto de la factura de Sequelize.
 * @returns {Promise<Buffer>} - Una promesa que se resuelve con el buffer del PDF.
 */
async function createInvoicePdfBuffer(factura) {
    return new Promise((resolve) => {
        const doc = new PDFDocument({ size: 'A4', margin: 50 });
        const buffers = [];
        doc.on('data', buffers.push.bind(buffers));
        doc.on('end', () => resolve(Buffer.concat(buffers)));

        // Se añade el logo si el archivo existe.
        if (fs.existsSync('assets/logo.jpg')) {
            doc.image('assets/logo.jpg', {
                fit: [60, 60],
                x: 50,
                y: 45
            });
        }

        // Se construye el contenido del PDF.
        doc.fontSize(20).font('Helvetica-Bold').text(`Factura #${factura.factura_id}`, { align: 'center' });
        doc.moveDown(2);
        doc.fontSize(12).font('Helvetica').text(`Fecha: ${new Date(factura.fecha_factura).toLocaleString()}`);
        doc.text(`Pedido: #${factura.pedido_id}`);
        doc.text(`Método de Pago: ${factura.MetodoPago.nombre_metodo}`);
        doc.moveDown(2);

        const tableTop = doc.y;
        doc.font('Helvetica-Bold');
        doc.text('Producto', 50, tableTop).text('Cant.', 300, tableTop).text('P. Unit.', 370, tableTop, {width: 60, align: 'right'}).text('Subtotal', 450, tableTop, {width: 60, align: 'right'});
        doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke().moveDown();
        doc.font('Helvetica');

        factura.Pedido.Productos.forEach(item => {
            const y = doc.y;
            const subtotalItem = item.DetallePedido.cantidad * parseFloat(item.valor_neto);
            doc.text(item.nombre_producto, 50, y, {width: 250});
            doc.text(item.DetallePedido.cantidad, 300, y);
            doc.text(`$${parseFloat(item.valor_neto).toFixed(2)}`, 370, y, {width: 60, align: 'right'});
            doc.text(`$${subtotalItem.toFixed(2)}`, 450, y, {width: 60, align: 'right'});
            doc.moveDown();
        });
        
        const totalsY = doc.y + 20;
        doc.font('Helvetica-Bold').text('Subtotal:', 370, totalsY).text(`$${factura.subtotal}`, 450, totalsY, {width: 60, align: 'right'});
        doc.font('Helvetica').text('Impuesto (8%):', 370, totalsY + 15).text(`$${factura.impuesto_total}`, 450, totalsY + 15, {width: 60, align: 'right'});
        doc.text('Propina:', 370, totalsY + 30).text(`$${factura.propina}`, 450, totalsY + 30, {width: 60, align: 'right'});
        doc.font('Helvetica-Bold').text('TOTAL:', 370, totalsY + 45).text(`$${factura.total}`, 450, totalsY + 45, {width: 60, align: 'right'});

        doc.end();
    });
}

/**
 * Función auxiliar para enviar un correo con un archivo adjunto usando nodemailer.
 * @param {string} recipientEmail - El correo del destinatario.
 * @param {Buffer} pdfBuffer - El buffer del PDF a adjuntar.
 * @param {number} invoiceId - El ID de la factura para el asunto y nombre del archivo.
 */
async function sendEmailWithAttachment(recipientEmail, pdfBuffer, invoiceId) {
    const mailProvider = String(process.env.MAIL_PROVIDER || 'smtp').toLowerCase();
    const emailService = process.env.EMAIL_SERVICE || 'gmail';
    const emailUser = process.env.EMAIL_USER;
    const emailPassword = process.env.EMAIL_PASSWORD || process.env.EMAIL_PASS;
    const emailHost = process.env.EMAIL_HOST || 'smtp.gmail.com';
    const emailPort = Number(process.env.EMAIL_PORT || 465);
    const emailSecure = String(process.env.EMAIL_SECURE || 'true').toLowerCase() === 'true';
    const resendApiKey = process.env.RESEND_API_KEY;
    const emailFrom = process.env.EMAIL_FROM || emailUser;

    const subject = `Tu Factura #${invoiceId} de Sushi Burrito`;
    const text = '¡Gracias por tu compra! Adjunto encontrarás tu factura en formato PDF.';
    const filename = `factura_${invoiceId}.pdf`;

    if (mailProvider === 'resend') {
        if (!resendApiKey || !emailFrom) {
            throw new Error('Configuración Resend incompleta: define RESEND_API_KEY y EMAIL_FROM en backend/.env');
        }

        const resendResponse = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${resendApiKey}`
            },
            body: JSON.stringify({
                from: emailFrom,
                to: [recipientEmail],
                subject,
                text,
                attachments: [{
                    filename,
                    content: pdfBuffer.toString('base64'),
                    content_type: 'application/pdf'
                }]
            })
        });

        const resendBody = await resendResponse.json().catch(() => ({}));
        if (!resendResponse.ok) {
            throw new Error(`Resend ${resendResponse.status}: ${resendBody.message || resendBody.error || 'No fue posible enviar la factura.'}`);
        }

        return;
    }

    if (!emailUser || !emailPassword) {
        throw new Error('Configuración SMTP incompleta: define EMAIL_USER y EMAIL_PASSWORD en backend/.env');
    }

    const baseTransport = {
        auth: {
            user: emailUser,
            pass: emailPassword
        },
        connectionTimeout: 10000,
        greetingTimeout: 10000,
        socketTimeout: 15000
    };

    const transporter = nodemailer.createTransport(
        process.env.EMAIL_HOST || process.env.EMAIL_PORT || process.env.EMAIL_SECURE
            ? {
                ...baseTransport,
                host: emailHost,
                port: emailPort,
                secure: emailSecure
            }
            : {
                ...baseTransport,
                service: emailService
            }
    );

    await transporter.sendMail({
        from: `"Facturación Sushi Burrito" <${emailFrom}>`,
        to: recipientEmail,
        subject,
        text,
        attachments: [{
            filename,
            content: pdfBuffer,
            contentType: 'application/pdf'
        }]
    });
}