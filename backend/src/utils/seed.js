import bcrypt from 'bcryptjs';
import db from '../models/index.js';

const BASE_ROLES = ['administrador', 'mesero', 'cocinero'];

// Usuarios que el seed puede crear/reparar, cada uno con su prefijo de variables de entorno.
const SEEDED_USERS = [
  { envPrefix: 'SEED_ADMIN', roleName: 'administrador' },
  { envPrefix: 'SEED_WAITER', roleName: 'mesero' },
  { envPrefix: 'SEED_COOK', roleName: 'cocinero' }
];

const asBoolean = (value, fallback = false) => {
  if (value === undefined || value === null || value === '') return fallback;
  return String(value).toLowerCase() === 'true';
};

const getTrimmedEnv = (name) => String(process.env[name] || '').trim();

const seedBaseRoles = async () => {
  const roleByName = new Map();

  for (const roleName of BASE_ROLES) {
    const [role, created] = await db.Rol.findOrCreate({
      where: { nombre_rol: roleName },
      defaults: { nombre_rol: roleName }
    });

    roleByName.set(roleName, role);
    console.log(created ? `Rol "${roleName}" creado.` : `Rol "${roleName}" ya existía.`);
  }

  return roleByName;
};

/**
 * Crea o repara un usuario del seed a partir de sus variables de entorno.
 * @param {string} envPrefix - Prefijo de las variables (ej. 'SEED_WAITER').
 * @param {string} roleName - Nombre del rol que debe tener el usuario.
 * @param {number} rolId - Identificador del rol ya persistido.
 */
const seedUser = async (envPrefix, roleName, rolId) => {
  const nombre = getTrimmedEnv(`${envPrefix}_NAME`);
  const correo = getTrimmedEnv(`${envPrefix}_EMAIL`);
  const password = getTrimmedEnv(`${envPrefix}_PASSWORD`);

  // La bandera específica del usuario tiene prioridad sobre la global.
  const updateExisting = asBoolean(
    process.env[`${envPrefix}_UPDATE_EXISTING`],
    asBoolean(process.env.SEED_UPDATE_EXISTING, false)
  );

  if (!nombre || !correo || !password) {
    console.log(
      `Seed de "${roleName}" omitido: define ${envPrefix}_NAME, ${envPrefix}_EMAIL y ${envPrefix}_PASSWORD para crear/actualizar este usuario.`
    );
    return;
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  // paranoid: false permite recuperar usuarios que quedaron en la papelera (deleted_at con fecha).
  const existente = await db.Usuario.findOne({ where: { correo }, paranoid: false });

  if (!existente) {
    await db.Usuario.create({
      nombre,
      correo,
      contraseña: hashedPassword,
      rol_id: rolId,
      must_change_password: false,
      is_deleted: 0,
      deleted_at: null
    });

    console.log(`Usuario "${roleName}" creado: ${correo}`);
    return;
  }

  if (!updateExisting) {
    console.log(
      `Usuario "${roleName}" ya existe y no se modificó: ${correo} (usa ${envPrefix}_UPDATE_EXISTING=true o SEED_UPDATE_EXISTING=true para reescribirlo).`
    );
    return;
  }

  await existente.update({
    nombre,
    contraseña: hashedPassword,
    rol_id: rolId,
    // Sin esto el login responde mustChangePassword y nunca entrega sesión.
    must_change_password: false,
    is_deleted: 0,
    deleted_at: null
  });

  console.log(`Usuario "${roleName}" actualizado: ${correo}`);
};

const createInitialData = async () => {
  try {
    await db.sequelize.authenticate();
    console.log('Conexión a base de datos OK.');

    const roles = await seedBaseRoles();

    for (const { envPrefix, roleName } of SEEDED_USERS) {
      const role = roles.get(roleName);

      if (!role) {
        throw new Error(`No fue posible obtener el rol "${roleName}" después del seed.`);
      }

      await seedUser(envPrefix, roleName, role.rol_id);
    }

    console.log('Seed completado correctamente.');
  } catch (error) {
    console.error('Error al ejecutar seed:', error.message);
    process.exitCode = 1;
  } finally {
    await db.sequelize.close();
    console.log('Conexión con la base de datos cerrada.');
  }
};

createInitialData();
