const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

// រក្សាទុកទិន្នន័យគ្រុប និង លេខកូដសម្ងាត់
const groups = {};

app.use(express.static(__dirname));

io.on('connection', (socket) => {
    // ចូលរួម ឬ បង្កើតគ្រុប
    socket.on('join-group', ({ groupName, password }, callback) => {
        // ប្រសិនបើមិនទាន់មានគ្រុបនេះទេ ត្រូវបង្កើតថ្មី
        if (!groups[groupName]) {
            groups[groupName] = { password: password, users: [] };
        }

        // ផ្ទៀងផ្ទាត់ពាក្យសម្ងាត់
        if (groups[groupName].password !== password) {
            return callback({ success: false, message: 'ពាក្យសម្ងាត់គ្រុបមិនត្រឹមត្រូវទេ!' });
        }

        socket.join(groupName);
        socket.groupName = groupName;
        groups[groupName].users.push(socket.id);

        callback({ success: true, message: 'បានចូលគ្រុបជោគជ័យ!' });
        io.to(groupName).emit('user-joined', { userId: socket.id, totalUsers: groups[groupName].users.length });
    });

    // បញ្ជូនទិន្នន័យសំឡេងទៅកាន់អ្នកផ្សេងទៀតក្នុងគ្រុបតែមួយ
    socket.on('audio-stream', (audioData) => {
        if (socket.groupName) {
            socket.to(socket.groupName).emit('receive-audio', {
                senderId: socket.id,
                audioData: audioData
            });
        }
    });

    // ពេលចាកចេញ ឬ ដាច់សេវា
    socket.on('disconnect', () => {
        const groupName = socket.groupName;
        if (groupName && groups[groupName]) {
            groups[groupName].users = groups[groupName].users.filter(id => id !== socket.id);
            io.to(groupName).emit('user-left', { userId: socket.id, totalUsers: groups[groupName].users.length });

            if (groups[groupName].users.length === 0) {
                delete groups[groupName];
            }
        }
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`ICOM Server ដំណើរការលើ: http://localhost:${PORT}`);
});