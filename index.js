// ----- IMPORT --------

import express from 'express';
import { createServer } from 'node:http';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { Server } from 'socket.io';
import moment from 'moment'; // Make sure to install moment with 'npm install moment'
import mongoose from 'mongoose';

// ----- CONST --------

const app = express();
const server = createServer(app);
const io = new Server(server);

// ----- BASIC FUNCTION (HTML, MONGODB....) --------

// intergrade js and static css files into the chat app.
app.use('/static', express.static('static'));
app.use('/js', express.static('js'));

// get the html index.html file
const __dirname = dirname(fileURLToPath(import.meta.url));
app.get('/', (req, res) => {
  res.sendFile(join(__dirname, 'index.html'));
});

// mongoose connect with mongodb
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost/fary-chat')
  .then(() => console.log('Fary chat running'))
  .catch(err => console.error('Fary chat connection error: ', err));


// ----- MONGO SCHEMAS --------

// Users
const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true}
});

const User = mongoose.model('User', userSchema);


// Messages
const MessageSchema = new mongoose.Schema({
  room: String,
  userName: String,
  message: String,
  time: String
});

const Message = mongoose.model('Message', MessageSchema);

// Rooms
const RoomSchema = new mongoose.Schema({
  name: { type: String, unique: true, required: true },
  users:[ String ],
});

const Room = mongoose.model('Room', RoomSchema);
const rooms = { roomName: { users: [] }} ; // Initialize with the "Everyone" room
const defaultRoom = "Main";

// ----- ON CONNECT CHAT --------

// chat on connect - when chat is activated / open for use
io.on('connection', (socket) => {


  // Show the list of rooms available upon entering chat
  Room.find().distinct('name').then(rooms => {
    socket.emit('update room list', rooms);
  }).catch(err => {
    console.error('Error fetching rooms:', err);
  });


  // Choose a name
  socket.emit('chooseName'); // Prompt the client to choose a name

  socket.on('chooseName', (userName) => {
    // Username
    socket.userName = userName;
    // The first room upon entering chat
    socket.currentRoom = defaultRoom;
    socket.join(defaultRoom);
    io.to(defaultRoom).emit('update current room', defaultRoom);
    // initial message of user has joined the room
    io.to(defaultRoom).emit('chat message', `${userName} has joined the room.`);
    // update room user list
    Room.findOne({name: defaultRoom}).then(room => {
      if (!room.users.includes(socket.userName)) {
          room.users.push(socket.userName);
          room.save();
        }
        io.to(defaultRoom).emit('updateUserList', room.users);
      }).catch(err => {
        console.error('Error updating user list:', err);
      });
  });

  // ------ ROOOMS ------
  
  // Joining a room
  socket.on('join room', (roomName) => {
    Room.findOne({name: roomName}).then(room => {
      if (!Room) {
        console.error(`Room ${roomName} does not exist.`);
        return; // Exit early if room doesn't exist
      }
      socket.leave(socket.currentRoom); // Leave the current room
      socket.join(roomName);
      socket.currentRoom = roomName;
      if (!room.users.includes(socket.userName)) {
        room.users.push(socket.userName);
        room.save();
      }
      socket.emit('update current room', roomName);
      io.to(roomName).emit('updateUserList', room.users);
      io.to(roomName).emit('chat message', `${socket.userName} has joined the room.`);
    }).catch(err => {
      console.error('Error joining room:', err);
    });
  });





  // Create a new room
  socket.on('create room', (roomName) => {
    Room.findOne({ name: roomName }).then(room => {
      if (!room) {
        const newRoom = new Room({ name: roomName, users: [] });
        newRoom.save().then(() => {
          // Fetch updated room list after creating a new room and emit to all clients
          Room.find().distinct('name').then(rooms => {
            io.emit('update room list', rooms);
          }).catch(err => {
            console.error('Error fetching rooms after creating new room:', err);
          });
        });
      }
    }).catch(err => {
      console.error('Error creating room:', err);
    });
  });



  // Chat messages
  socket.on('chat message', (msg) => {
    const formattedTime = moment().format('HH:mm');
    const messageWithTimestamp = `${formattedTime} - ${socket.userName}: ${msg}`;
   
    console.log(`Message sent to room '${socket.currentRoom}': ${messageWithTimestamp}`);

   
    const newMessage = new Message({
      room: socket.currentRoom,
      userName: socket.userName,
      message: msg,
      time: formattedTime
    });
    newMessage.save().then(() => {
      io.to(socket.currentRoom).emit('chat message', messageWithTimestamp);
    }).catch(err => {
      console.error('Error saving message:', err);
    });
  });

  // Disconnect 
  socket.on('disconnect', () => {
    if (socket.currentRoom) {
      Room.findOne({name: socket.currentRoom}).then(room => {
        if (room) {
          const index = room.users.indexOf(socket.userName);
          if (index !== -1) {
            room.users.splice(index, 1);
            room.save();
          }
        }
        socket.to(socket.currentRoom).emit('chat message', `${socket.userName} has left the room.`);
      }).catch(err => {
        console.error('Error on disconnect:', err);
      });
    }
  });


  // ----- TESTING AND ERROR HANDLING -----

  // just to see if user is connected or not
  console.log('a user connected');
  socket.on('disconnect', () => {
      console.log('user disconnected');
  });


// !!!! end of connect!!!!!
});


// ----- SERVER LISTENER - LOCAL HOST --------

// server listener local host 3000

server.listen(3000, () => {
  console.log('server running at http://localhost:3000');
});