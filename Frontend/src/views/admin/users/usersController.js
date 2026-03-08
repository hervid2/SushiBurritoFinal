import { showAlert } from '../../../helpers/alerts.js';
import { showConfirmModal } from '../../../helpers/modalHelper.js';
import { api } from '../../../helpers/solicitudes.js';

export const usersController = () => {
    const userFormSection = document.getElementById('user-form-section');
    const userForm = document.getElementById('user-form');
    const tableBody = document.querySelector('#users-table tbody');
    const usersTable = document.getElementById('users-table');
    
    const userIdInput = document.getElementById('user-id');
    const nameInput = document.getElementById('name');
    const emailInput = document.getElementById('email');
    const roleSelect = document.getElementById('role');

    let isTrashMode = false;
    let currentUsers = [];

    // --- CARGAR DATOS ---
    const loadUsers = async (showDeleted = false) => {
        try {
            isTrashMode = showDeleted;
            const endpoint = showDeleted ? 'usuarios/eliminados' : 'usuarios';
            currentUsers = await api.get(endpoint);
            renderTable(currentUsers);

            const viewBtn = document.getElementById('view-deleted-btn');
            if (viewBtn) {
                viewBtn.innerHTML = showDeleted 
                    ? '<i class="fas fa-users"></i> Ver Activos' 
                    : '<i class="fas fa-trash"></i> Ver Papelera';
            }
        } catch (error) {
            showAlert(error.message, 'error');
        }
    };

    const renderTable = (users) => {
    const tableBody = document.querySelector('#users-table tbody');
    tableBody.innerHTML = '';

    if (!users || users.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="5" class="text-center">No hay registros.</td></tr>`;
        return;
    }

    tableBody.innerHTML = users.map(user => {
        // 1. DETERMINAR COLOR POR ROL
        let roleClass = 'role-default';
        const rolNombre = (user.rol || '').toLowerCase();

        if (rolNombre.includes('admin')) {
            roleClass = 'role-admin';
        } else if (rolNombre.includes('mesero')) {
            roleClass = 'role-mesero';
        } else if (rolNombre.includes('cocinero')) {
            roleClass = 'role-cocinero';
        }

        // 2. DETERMINAR BOTONES (Activos vs Papelera)
        const actionButtons = !isTrashMode 
            ? `<button class="btn btn--info btn--small edit-btn" data-id="${user.usuario_id}">Editar</button>
               <button class="btn btn--danger btn--small delete-btn" data-id="${user.usuario_id}" data-name="${user.nombre}">Eliminar</button>`
            : `<button class="btn btn--success btn--small restore-btn" data-id="${user.usuario_id}" data-name="${user.nombre}">Restaurar</button>
               <button class="btn btn--danger btn--small permanent-btn" data-id="${user.usuario_id}">Eliminar Permanente</button>`;

        return `
            <tr>
                <td>${user.usuario_id}</td>
                <td>${user.nombre}</td>
                <td>${user.correo}</td>
                <td><span class="role-badge ${roleClass}">${user.rol || 'Sin Rol'}</span></td>
                <td class="table-actions">${actionButtons}</td>
            </tr>`;
    }).join('');
};

    // --- LÓGICA DE EVENTOS ---
    const init = () => {
        // Delegación: un solo listener para todos los botones de la tabla
        usersTable.addEventListener('click', async (e) => {
            const target = e.target;
            const id = target.dataset.id;
            const name = target.dataset.name;

            if (target.classList.contains('edit-btn')) {
                const user = currentUsers.find(u => u.usuario_id == id);
                if (user) {
                    userForm.reset();
                    document.getElementById('form-title').textContent = 'Editar Usuario';
                    userIdInput.value = user.usuario_id;
                    nameInput.value = user.nombre;
                    emailInput.value = user.correo;
                    const roleMap = { 'Administrador': '1', 'Mesero': '2', 'Cocinero': '3' };
                    roleSelect.value = roleMap[user.rol] || "";
                    roleSelect.disabled = false; // Habilitado para permitir cambios
                    userFormSection.style.display = 'block';
                }
            }

            if (target.classList.contains('delete-btn')) {
                if (await showConfirmModal('Eliminar', `¿Enviar a ${name} a la papelera?`)) {
                    await api.delete(`usuarios/${id}`);
                    loadUsers(false);
                }
            }

            if (target.classList.contains('restore-btn')) {
                await api.put(`usuarios/restaurar/${id}`);
                showAlert('Restaurado', 'success');
                loadUsers(true);
            }
        });

        document.getElementById('add-user-btn').onclick = () => {
            userForm.reset();
            document.getElementById('form-title').textContent = 'Nuevo Usuario';
            userIdInput.value = '';
            roleSelect.disabled = false;
            userFormSection.style.display = 'block';
        };

        document.getElementById('cancel-user-form-btn').onclick = () => userFormSection.style.display = 'none';

        document.getElementById('view-deleted-btn').onclick = () => loadUsers(!isTrashMode);

        userForm.onsubmit = async (e) => {
            e.preventDefault();
            const id = userIdInput.value;
            const payload = { 
                nombre: nameInput.value, 
                correo: emailInput.value,
                rol_id: parseInt(roleSelect.value) 
            };

            try {
                if (id) {
                    await api.put(`usuarios/${id}`, payload);
                    showAlert('Actualizado con éxito', 'success');
                } else {
                    await api.post('usuarios', payload);
                    showAlert('Creado con éxito', 'success');
                }
                userFormSection.style.display = 'none';
                loadUsers(isTrashMode);
            } catch (error) {
                showAlert(error.message, 'error');
            }
        };

        loadUsers();
    };

    init();
};