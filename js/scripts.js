const socket = io()
const appState = {
    currentRoom: 'defaultRoom',
    userName: 'Guest'
};
const roomMessages = {};  // Stores messages for each room
const form = document.getElementById('form');
const input = document.getElementById('input');
const messages = document.getElementById('messages');


function displayMessagesForRoom(messages) {
    messages.forEach(msg => {
        const messageElement = document.createElement('li');
        messageElement.textContent = `${msg.time} - ${msg.userName}: ${msg.text}`;
        messages.appendChild(messageElement);
    });
    window.scrollTo(0, document.body.scrollHeight);
}

function clearChatWindow() {
    messages.innerHTML = '';
}


// Submitting the chat message
form.addEventListener('submit', (e) => {
    e.preventDefault();
    if (input.value) {
      socket.emit('chat message', input.value);
      input.value = '';
    }
});



// ----- USERS ------- 

// Handle user name choice and initial join
socket.on('chooseName', () => {
    let userName = prompt('Pick a user name');
    if (userName) {
        socket.emit('chooseName', userName); // Send the chosen name back to the server
    } else {
        userName = 'Guest'; // Default name if none provided
        socket.emit('chooseName', userName);
    }
});

// Update user list in the sidebar
socket.on('updateUserList', userList => {
    const sidebar = document.querySelector('.current-users');
    sidebar.innerHTML = userList.map(user => `<li>${user}</li>`).join('');
});


// ----- ROOMS ------- 


// Listen for room updates and update the UI
socket.on('update current room', (roomName) => {
    currentRoom = roomName; // Update the current room
    const currentRoomDisplay = document.querySelector('.current-room');
    currentRoomDisplay.textContent = `Current Room: ${roomName}`;
    displayMessagesForRoom(roomName);
});

// Update available rooms
// Update available rooms
socket.on('update room list', (rooms) => {
    const roomList = document.querySelector('.available-rooms');
    roomList.innerHTML = ''; // Clear existing rooms
    rooms.forEach(roomName => {
        const listItem = document.createElement('li');
        const roomButton = document.createElement('button');
        roomButton.textContent = roomName;
        roomButton.classList.add('room-name');
        roomButton.onclick = function() {
            socket.emit('join room', roomName);
        };
        listItem.appendChild(roomButton);
        roomList.appendChild(listItem);
    });
});



// Creating a new room
document.getElementById('createRoom').addEventListener('click', function() {
    const roomName = document.getElementById('newRoomName').value;
    if (roomName) {
        socket.emit('create room', roomName);
        document.getElementById('newRoomName').value = ''; // Clear the input after sending
    }
});


// ----- MESSAGES --------



// Handle incoming chat messages
// Client-side JavaScript
socket.on('chat history', data => {
    const { room, messages } = data;
    if (currentRoom === room) {
        clearChatWindow();
        displayMessagesForRoom(messages);
    }
});



socket.on('chat message', function(message) {
    const messagesElement = document.getElementById('messages');
    let messageElement = document.createElement('li');
    messageElement.textContent = message;
    messagesElement.appendChild(messageElement);
});



socket.on('error', (error) => {
    console.error('Socket encountered error: ', error);
    alert('An error occurred with the connection!');
});
