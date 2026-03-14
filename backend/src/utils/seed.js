import bcrypt from 'bcryptjs';
import db from '../models/index.js';

const BASE_ROLES = ['administrador', 'mesero', 'cocinero'];

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

const seedAdminUser = async (adminRoleId) => {
  const adminName = getTrimmedEnv('SEED_ADMIN_NAME');
  const adminEmail = getTrimmedEnv('SEED_ADMIN_EMAIL');
  const adminPassword = getTrimmedEnv('SEED_ADMIN_PASSWORD');
  const updateExisting = asBoolean(process.env.SEED_ADMIN_UPDATE_EXISTING, false);

  if (!adminName || !adminEmail || !adminPassword) {
    console.log(
      'Seed de admin omitido: define SEED_ADMIN_NAME, SEED_ADMIN_EMAIL y SEED_ADMIN_PASSWORD para crear/actualizar el usuario administrador.'
    );
    return;
  }

  const hashedPassword = await bcrypt.hash(adminPassword, 10);

  const [adminUser, adminCreated] = await db.Usuario.findOrCreate({
    where: { correo: adminEmail },
    defaults: {
      nombre: adminName,
      correo: adminEmail,
      contraseña: hashedPassword,
      rol_id: adminRoleId,
      must_change_password: false,
      is_deleted: 0,
      deleted_at: null
    }
  });

  if (adminCreated) {
    console.log(`Usuario administrador creado: ${adminEmail}`);
    return;
  }

  if (updateExisting) {
    await adminUser.update({
      nombre: adminName,
      contraseña: hashedPassword,
      rol_id: adminRoleId,
      must_change_password: false,
      is_deleted: 0,
      deleted_at: null
    });

    console.log(`Usuario administrador actualizado: ${adminEmail}`);
    return;
  }

  console.log(`Usuario administrador ya existe y no se modificó: ${adminEmail}`);
};

const createInitialData = async () => {
  try {
    await db.sequelize.authenticate();
    console.log('Conexión a base de datos OK.');

    const roles = await seedBaseRoles();
    const adminRole = roles.get('administrador');

    if (!adminRole) {
      throw new Error('No fue posible obtener el rol "administrador" después del seed.');
    }

    await seedAdminUser(adminRole.rol_id);
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