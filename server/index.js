const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(path.join(__dirname, '../public')));

const rooms = {}; // { roomName: { admin: socket.id, users: Map<socket.id, username>, admins: Set<socket.id> } }

const arrayInsults = ["idiota", "imbècil", "tonto", "tonta", "merda", 
                       "cacaxúrria", "carallot", "abraçafaroles", "mocós", "pelacanyes",
                       "botifler", "estaquirot", "baliga-balaga", "brètol", "llepaculs"];

function censurarMissatge(text) {
  return text.split(' ').map(paraula => {
    return arrayInsults.includes(paraula.toLowerCase()) 
      ? '*'.repeat(paraula.length) 
      : paraula;
  }).join(' ');
}

io.on('connection', (socket) => {
  console.log('Nou usuari connectat');

  socket.on('join room', ({ username, room }) => {
    socket.username = username;
    socket.room = room;
    socket.join(room);

    if (!rooms[room]) {
      rooms[room] = {
        admin: socket.id,
        users: new Map(),
        admins: new Set([socket.id]),
      };
      socket.emit('system message', 'Ets l\'administrador d\'aquesta sala.');
    } else {
      socket.to(room).emit('system message', `${username} s'ha unit a la sala.`);
    }

    rooms[room].users.set(socket.id, username);

    // Envia informació de permisos al client
    socket.emit('admin status', rooms[room].admins.has(socket.id));
    socket.emit('your id', socket.id);
  });

  socket.on('chat message', ({ text, room }) => {
    if (socket.room === room) {
      const textCensurat = censurarMissatge(text); // Apliquem la censura
      const msg = {
        username: socket.username || 'Anònim',
        text: textCensurat,
        id: Date.now() + '-' + socket.id,
      };
      io.to(room).emit('chat message', msg);
    }
  });

  socket.on('delete message', ({ messageId, room }) => {
    if (rooms[room]?.admins.has(socket.id)) {
      io.to(room).emit('delete message', messageId);
    }
  });

  socket.on('add admin', ({ targetUsername, room }) => {
    if (rooms[room]?.admin === socket.id) {
      let newAdminSocketId = null;
      for (const [id, name] of rooms[room].users.entries()) {
        if (name === targetUsername) {
          newAdminSocketId = id;
          break;
        }
      }
      if (newAdminSocketId) {
        // Revoca el rol al socket actual
        rooms[room].admins.delete(socket.id);
        io.to(socket.id).emit('admin status', false);
        io.to(socket.id).emit('system message', 'Ja no ets administrador de la sala.');

        // Dona permisos al nou admin
        rooms[room].admins.add(newAdminSocketId);
        rooms[room].admin = newAdminSocketId;
        io.to(newAdminSocketId).emit('admin status', true);
        io.to(newAdminSocketId).emit('system message', 'Ara ets administrador de la sala.');

        // Actualitza visibilitat dels formularis i botons a tots els usuaris
        io.to(room).emit('update admin ui', {
          newAdminId: newAdminSocketId,
          oldAdminId: socket.id
        });
      } else {
        io.to(socket.id).emit('system message', `Usuari \"${targetUsername}\" no trobat a la sala.`);
      }
    }
  });

  socket.on('disconnect', () => {
    if (socket.room && rooms[socket.room]) {
      rooms[socket.room].users.delete(socket.id);
      rooms[socket.room].admins.delete(socket.id);
      socket.to(socket.room).emit('system message', `${socket.username} ha sortit de la sala.`);

      if (rooms[socket.room].users.size === 0) {
        delete rooms[socket.room];
      }
    }
    console.log('Usuari desconnectat');
  });

  // Nivell 6
  socket.on('leave room', ({ username, room }) => {
    socket.leave(room);
    console.log(`${username} ha sortit de la sala ${room}`);
  });
});

const PORT = 3000;
server.listen(PORT, () => {
  console.log(`Servidor escoltant a http://localhost:${PORT}`);
});

