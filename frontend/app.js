// 1. CONFIGURACIÓN GLOBAL (Apunta a tu servidor nativo)
const API_URL = 'http://localhost:3000/tasks';

// Intentamos leer si ya existe un nombre guardado en el disco del navegador
let AUTHOR = localStorage.getItem('todo_author_session');

// 2. CAPTURA CENTRALIZADA DE ELEMENTOS DEL DOM
const currentUserText = document.getElementById('currentUser');
const logoutBtn = document.getElementById('logoutBtn');
const taskForm = document.getElementById('taskForm');
const taskTitle = document.getElementById('taskTitle');
const taskDescription = document.getElementById('taskDescription');
const tasksContainer = document.getElementById('tasksContainer');

// 2.1 SELECTORES DE MODALES PERSONALIZADOS
const customModal = document.getElementById('customModal');
const modalTitle = document.getElementById('modalTitle');
const modalMessage = document.getElementById('modalMessage');
const modalCancelBtn = document.getElementById('modalCancelBtn');
const modalConfirmBtn = document.getElementById('modalConfirmBtn');

const loginModal = document.getElementById('loginModal');
const loginForm = document.getElementById('loginForm');
const loginInput = document.getElementById('loginInput');

// 2.2 CONTROLADOR ASÍNCRONO DEL MODAL DE NOTIFICACIONES
function openCustomModal(title, message, isConfirm = false, onConfirmCallback = null) {
    modalTitle.textContent = title;
    modalMessage.textContent = message;

    modalCancelBtn.style.display = isConfirm ? 'block' : 'none';
    customModal.classList.add('active');

    const nuevoConfirmBtn = modalConfirmBtn.cloneNode(true);
    const nuevoCancelBtn = modalCancelBtn.cloneNode(true);
    modalConfirmBtn.parentNode.replaceChild(nuevoConfirmBtn, modalConfirmBtn);
    modalCancelBtn.parentNode.replaceChild(nuevoCancelBtn, modalCancelBtn);

    nuevoConfirmBtn.addEventListener('click', () => {
        customModal.classList.remove('active');
        if (onConfirmCallback) onConfirmCallback();
    });

    nuevoCancelBtn.addEventListener('click', () => {
        customModal.classList.remove('active');
    });
}

// 3. CONTROL DE SESIÓN Y AUTENTICACIÓN DEL USUARIO
function checkSession() {
    if (!AUTHOR) {
        loginModal.classList.add('active');
    } else {
        loginModal.classList.remove('active');
        currentUserText.textContent = AUTHOR;
        cargarTareas();
    }
}

loginForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const nombre = loginInput.value.trim();

    if (nombre) {
        AUTHOR = nombre;
        localStorage.setItem('todo_author_session', AUTHOR);
        checkSession();
    }
});

logoutBtn.addEventListener('click', () => {
    localStorage.removeItem('todo_author_session');
    AUTHOR = null;
    checkSession();
});

// 4. CONSUMO DE API - OBTENER TAREAS (GET /tasks)
async function cargarTareas() {

    try {
        const res = await fetch(API_URL);
        const respuesta = await res.json();

        if (respuesta.status === 'success') {
            renderizarTareas(respuesta.data.tasks);
        } else {
            openCustomModal('Error', respuesta.message);
        }
    } catch (error) {
        openCustomModal(
            'Error de Conexión', 
            'No se pudo conectar con el servidor Backend.'
        );
    }
}

// 4.1 RENDERIZADO DINÁMICO DE TARJETAS EN LA INTERFAZ
function renderizarTareas(tasks) {
    tasksContainer.innerHTML = '';

    if (tasks.length === 0) {
        tasksContainer.innerHTML = 
            '<p style="text-align: center; color: #666;">No hay tareas registradas.</p>';
        return;
    }

    tasks.forEach(task => {
        const card = document.createElement('div');
        card.className = 'task-card';

        if (task.is_completed) {
            card.style.borderLeftColor = '#10b981';
        }

        const titleStyle = task.is_completed 
            ? 'text-decoration: line-through; color: #888;' 
            : '';

        card.innerHTML = `
            <div>
                <h3 style="${titleStyle}">${task.title}</h3>
                <p>${task.description || ''}</p>
                <span class="author">Creado por: ${task.author}</span>
            </div>
            <div style="display: flex; gap: 8px; align-items: center;">
                <input type="checkbox" ${task.is_completed ? 'checked' : ''} 
                       onchange="toggleTask(${task.id}, ${!task.is_completed}, '${task.title}', '${task.description || ''}')">
                <button class="btn-delete" onclick="eliminarTarea(${task.id})">
                    Eliminar
                </button>
            </div>
        `;

        tasksContainer.appendChild(card);
    });
}

// 5. CONSUMO DE API - CREAR NUEVA TAREA (POST /tasks)
taskForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const title = taskTitle.value.trim();
    const description = taskDescription.value.trim();

    if (!title) {
        openCustomModal('Atención', 'El título es obligatorio.');
        return;
    }

    try {
        const res = await fetch(API_URL, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json' 
            },
            body: JSON.stringify({
                title,
                description,
                author: AUTHOR
            })

        });

        const respuesta = await res.json();

        if (respuesta.status === 'success') {
            taskForm.reset();
            cargarTareas();
        } else {
            openCustomModal('Acceso Restringido', respuesta.message);
        }
    } catch (error) {
        openCustomModal('Error', 'Fallo al agregar la tarea.');
    }
});

// 6. CONSUMO DE API - ACTUALIZAR ESTADO (PUT /tasks/:id)
async function toggleTask(id, is_completed, title, description) {
    try {
        const res = await fetch(`${API_URL}/${id}`, {
            method: 'PUT',
            headers: { 
                'Content-Type': 'application/json' 
            },
            body: JSON.stringify({
                title,
                description,
                is_completed: is_completed ? 1 : 0,
                author: AUTHOR
            })
        });

        const respuesta = await res.json();

        if (respuesta.status === 'success') {
            cargarTareas();
        } else {
            openCustomModal('No Autorizado', respuesta.message);
            cargarTareas();
        }
    } catch (error) {
        openCustomModal('Error', 'No se pudo actualizar el estado.');
    }
}

// 7. CONSUMO DE API - ELIMINAR TAREA (DELETE /tasks/:id)
function eliminarTarea(id) {
    openCustomModal(
        'Confirmar Eliminación',
        '¿Estás seguro de que deseas eliminar esta tarea?',
        true,
        async () => {
            try {
                const res = await fetch(`${API_URL}/${id}`, {
                    method: 'DELETE',
                    headers: { 
                        'Content-Type': 'application/json' 
                    },
                    body: JSON.stringify({ 
                        author: AUTHOR 
                    })
                });

                const respuesta = await res.json();

                if (respuesta.status === 'success') {
                    cargarTareas();
                } else {
                    openCustomModal(
                        'Acceso Restringido', 
                        respuesta.message
                    );
                }
            } catch (error) {
                openCustomModal(
                    'Error', 
                    'No se pudo eliminar la tarea.'
                );
            }
        }
    );
}


// 8. INICIALIZACIÓN DE LA APLICACIÓN AL CARGAR LA PÁGINA
checkSession();