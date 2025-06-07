const socket = io();

const loginDiv = document.getElementById('login');
const chatDiv = document.getElementById('chat');
const form = document.getElementById('form');
const input = document.getElementById('input');
const messages = document.getElementById('messages');
const joinBtn = document.getElementById('join');
const usernameInput = document.getElementById('username');
const roomInput = document.getElementById('room');
const adminForm = document.getElementById('admin-form');
const newAdminInput = document.getElementById('new-admin');

let mySocketId = null;
let isAdmin = false;

joinBtn.addEventListener('click', () => {
  const username = usernameInput.value.trim();
  const room = roomInput.value.trim();
  if (!username || !room) return;

  loginDiv.style.display = 'none';
  chatDiv.style.display = 'block';

  // Nivell 6
  messages.innerHTML = '';
  loadMessages(room);
  // -

  socket.emit('join room', { username, room });
});

form.addEventListener('submit', (e) => {
  e.preventDefault();
  if (input.value) {
    socket.emit('chat message', {
      text: input.value,
      room: roomInput.value
    });
    input.value = '';
  }
});

adminForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const targetUsername = newAdminInput.value.trim();
  if (targetUsername) {
    socket.emit('add admin', {
      targetUsername,
      room: roomInput.value
    });
    newAdminInput.value = '';
  }
});

socket.on('your id', (id) => {
  mySocketId = id;
});

socket.on('admin status', (status) => {
  isAdmin = status;
  adminForm.style.display = isAdmin ? 'block' : 'none';
  updateDeleteButtons();
});

socket.on('chat message', (msg) => {
  const li = document.createElement('li');
  li.textContent = `${msg.username}: ${msg.text}`;
  li.id = msg.id;
  if (isAdmin) addDeleteButton(li, msg.id);
  messages.appendChild(li);
});

socket.on('delete message', (messageId) => {
  const msgEl = document.getElementById(messageId);
  if (msgEl) msgEl.remove();
});

socket.on('system message', (text) => {
  const li = document.createElement('li');
  li.textContent = `[Sistema] ${text}`;
  li.style.fontStyle = 'italic';
  messages.appendChild(li);
});

socket.on('update admin ui', ({ newAdminId, oldAdminId }) => {
  if (mySocketId === oldAdminId) {
    isAdmin = false;
    adminForm.style.display = 'none';
    updateDeleteButtons();
  } else if (mySocketId === newAdminId) {
    isAdmin = true;
    adminForm.style.display = 'block';
    updateDeleteButtons();
  }
});

socket.on('admin error', (message) => {
  const li = document.createElement('li');
  li.textContent = `[Error] ${message}`;
  li.style.color = 'red';
  messages.appendChild(li);
});

function addDeleteButton(li, messageId) {
  const btn = document.createElement('button');
  btn.textContent = '✕';
  btn.title = 'Eliminar missatge';
  btn.addEventListener('click', () => {
    socket.emit('delete message', {
      messageId,
      room: roomInput.value
    });
  });
  li.appendChild(btn);
}

function updateDeleteButtons() {
  const allMessages = document.querySelectorAll('#messages li');
  allMessages.forEach((li) => {
    const btn = li.querySelector('button');
    if (btn) btn.remove();
    if (isAdmin && li.id) addDeleteButton(li, li.id);
  });
}

// NIVELL 6
const leaveBtn = document.getElementById('leave-room');

leaveBtn.addEventListener('click', () => {
  const username = usernameInput.value.trim();
  const room = roomInput.value.trim();

  if (username && room) {
    saveMessages(room); // Guarda els missatges de la sala actual
    socket.emit('leave room', { username, room });
    messages.innerHTML = '';
    chatDiv.style.display = 'none';
    loginDiv.style.display = 'block';
  }
});

function saveMessages(room) {
  const allMessages = Array.from(messages.children).map(li => li.textContent);
  localStorage.setItem(`chat_${room}`, JSON.stringify(allMessages));
}

function loadMessages(room) {
  const saved = localStorage.getItem(`chat_${room}`);
  if (saved) {
    const messagesList = JSON.parse(saved);
    messagesList.forEach(text => {
      const li = document.createElement('li');
      li.textContent = text;
      messages.appendChild(li);
    });
  }
}
