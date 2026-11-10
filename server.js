const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Database SQLite lokal
const db = new sqlite3.Database('./chat.db', (err) => {
    if (err) console.error('Gagal buka database', err.message);
});

db.run(`CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sender TEXT,
    receiver TEXT,
    text TEXT,
    time TEXT
)`);

app.use(express.static(path.join(__dirname, 'public')));

// Routing khusus halaman owner
app.get('/owner-secret-room', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'owner.html'));
});

io.on('connection', (socket) => {
    // Kirim riwayat chat saat user/owner terhubung
    db.all(`SELECT sender, receiver, text, time FROM messages ORDER BY id ASC`, [], (err, rows) => {
        if (!err) socket.emit('load_history', rows);
    });

    // Event saat pesan dikirim dari User ke Owner
    socket.on('send_to_owner', (data) => {
        const timeNow = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const messageData = { 
            sender: data.sender, 
            receiver: 'Owner', 
            text: data.text, 
            time: timeNow 
        };

        db.run(`INSERT INTO messages (sender, receiver, text, time) VALUES (?, ?, ?, ?)`, 
            [messageData.sender, messageData.receiver, messageData.text, messageData.time], 
            (err) => {
                if (!err) io.emit('receive_message', messageData);
            }
        );
    });

    // Event saat Owner membalas chat
    socket.on('owner_reply', (data) => {
        const timeNow = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const messageData = { 
            sender: 'Owner', 
            receiver: data.targetUser, 
            text: data.text, 
            time: timeNow 
        };

        db.run(`INSERT INTO messages (sender, receiver, text, time) VALUES (?, ?, ?, ?)`, 
            [messageData.sender, messageData.receiver, messageData.text, messageData.time], 
            (err) => {
                if (!err) io.emit('receive_message', messageData);
            }
        );
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
    console.log(`Server berjalan di port ${PORT}`);
});
