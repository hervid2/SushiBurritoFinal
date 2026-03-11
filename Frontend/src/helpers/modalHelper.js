import Swal from 'sweetalert2';

// FUNCIÓN PARA CONFIRMAR (Eliminar/Restaurar)
export const showConfirmModal = async (title, message) => {
    const result = await Swal.fire({
        title: title,
        html: message,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#4CAF50',
        cancelButtonColor: '#6c757d',
        confirmButtonText: 'Sí, confirmar',
        cancelButtonText: 'Cancelar'
    });

    if (result.isConfirmed) return;
    return Promise.reject();
};

// FUNCIÓN PARA SELECCIONAR ROL (Con estilos profesionales)
export const showRoleSelectModal = async (title, currentRolId) => {
    const { value: nuevoRol } = await Swal.fire({
        title: title,
        input: 'select',
        inputOptions: {
            '1': 'Administrador',
            '2': 'Mesero',
            '3': 'Cocinero'
        },
        inputValue: currentRolId,
        showCancelButton: true,
        confirmButtonText: 'Guardar',
        cancelButtonText: 'Cancelar',
        confirmButtonColor: '#4CAF50'
    });

    return nuevoRol;
};