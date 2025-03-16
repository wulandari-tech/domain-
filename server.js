const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');
const { Server } = require('socket.io');
const bcrypt = require('bcrypt');

//const hostname = '127.0.0.1';
const port = 3000;
const tld = 'wanzofc.us.kg'; // Ganti dengan TLD Anda
const adminPasswordHash = bcrypt.hashSync('admin123', 10); // Ganti 'admin123' dan hash dengan password yang kuat!
const saltRounds = 10;


// "Database" (dalam memori - Cukup untuk contoh sederhana)
const tempEmails = {}; // email -> { expiresAt }
const chats = {};      // chatId -> { messages: [{sender, text}], participants: [userEmail, 'admin'] }
const users = {};     // email -> { type: 'temp' | 'admin', socketId }

let adminSocket = null; // Socket.IO socket admin
let adminOnline = false;

function generateRandomString(length) {
    let result = '';
    const characters = 'abcdefghijklmnopqrstuvwxyz0123456789';
    for (let i = 0; i < length; i++) {
        result += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return result;
}

const server = http.createServer((req, res) => {
    const reqUrl = url.parse(req.url, true);
    const pathname = reqUrl.pathname;

    if (pathname === '/' && req.method === 'GET') {
        // Layani index.html
        fs.readFile('index.html', (err, data) => {
            if (err) { send500(res); return; }
            sendHtml(res, data);
        });
    } else if (pathname === '/admin' && req.method === 'GET') {
        // Layani admin.html
        fs.readFile('admin.html', (err, data) => {
            if (err) { send500(res); return; }
             sendHtml(res, data);
        });
    } else if (pathname === '/create-email' && req.method === 'GET') {
        // Buat email sementara
        const randomPrefix = generateRandomString(8);
        const emailAddress = `${randomPrefix}@${tld}`;
        const expiresAt = Date.now() + (24 * 60 * 60 * 1000); // 24 jam

        tempEmails[emailAddress] = { expiresAt };
        users[emailAddress] = { type: 'temp' }; // Tambahkan ke users

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ email: emailAddress, expiresAt }));

    } else if(pathname === '/emails' && req.method === 'GET'){
        //Ambil daftar email untuk alamat
        const address = reqUrl.query.address;
        if(!address){
            res.writeHead(400, {'Content-Type': 'application/json'});
            res.end(JSON.stringify({message: 'Alamat email diperlukan'}));
            return;
        }

        //Karena ini simulasi, kita buat dummy data
        const emailList = [
            { id: 1, from: 'sender1@example.com', subject: 'Contoh Email 1', body: 'Ini adalah contoh email pertama.' },
            { id: 2, from: 'sender2@example.com', subject: 'Contoh Email 2', body: 'Ini adalah contoh email kedua.' },
          ];

          res.writeHead(200, {'Content-Type': 'application/json'});
          res.end(JSON.stringify(emailList));

    }

    else {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('Not Found');
    }
});

const io = new Server(server);

io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    socket.on('register', (email) => {
      //Dafrtarkan user dengan socket ID
      if(users[email]){
        users[email].socketId = socket.id;
        console.log(`User registered: ${email} with socket ID: ${socket.id}`);
      } else {
         console.warn(`User ${email} not found in users, but registered with socket ${socket.id}`);
      }
    });

    socket.on('admin-login', async (password) => {

        // Verifikasi password admin (gunakan bcrypt)
        if (bcrypt.compareSync(password, adminPasswordHash)) {
            adminOnline = true;
            adminSocket = socket;
            socket.emit('admin-login-success');
            console.log('Admin logged in:', socket.id);

            // Beritahu semua user bahwa admin online
            socket.broadcast.emit('admin-status-change', { online: true });
        } else {
             socket.emit('admin-login-failure'); // Kirim event kegagalan
            console.log('Admin login failed');
        }
    });

    socket.on('start-chat', (userEmail) => {
        // Periksa apakah admin online
        if (!adminOnline) {
            socket.emit('chat-error', { message: 'Admin sedang offline.' });
            return;
        }
        // Buat atau gabung ke chat
        const existingChat = Object.values(chats).find(chat =>
            chat.participants.includes(userEmail) && chat.participants.includes('admin')
        );

        if (existingChat) {
            socket.emit('chat-started', { chatId: existingChat.chatId });
        } else {
            const chatId = generateRandomString(10);
            chats[chatId] = { messages: [], participants: [userEmail, 'admin'] };
            socket.emit('chat-started', { chatId });
             if (adminSocket) {
                adminSocket.emit('new-chat', { chatId, userEmail });
            }
        }
    });

    socket.on('chat-message', ({ chatId, text }) => {
      if (!chats[chatId]) {
          console.warn('Chat not found:', chatId);
          return;
      }

      const sender = users[socket.id]?.type === 'admin' ? 'admin' : 'user';

      //Validasi pengirim
      if(!chats[chatId].participants.includes(sender === 'admin' ? 'admin' : Object.keys(users).find(email => users[email].socketId === socket.id))){
          console.warn('Invalid sender for chat:', chatId, sender);
          return;
      }


      const message = { sender, text, timestamp: Date.now() };
      chats[chatId].messages.push(message);


      // Kirim pesan ke semua partisipan, termasuk pengirim
      chats[chatId].participants.forEach(participant => {
        const participantEmail = participant === 'admin' ? 'admin' : participant;
        const participantSocketId = users[participantEmail] ? users[participantEmail].socketId : null;

        if(participantSocketId){
          io.to(participantSocketId).emit('chat-message', { chatId, message });
        } else {
          console.warn(`Participant ${participantEmail} not found or not online.`);
        }

      });

    });


    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
        //Hapus socketId dari user.
        for(const email in users){
            if(users[email].socketId === socket.id){
                users[email].socketId = null;
                break;
            }
        }

        if (socket.id === adminSocket?.id) {
            adminOnline = false;
            adminSocket = null;
             // Beritahu semua user bahwa admin offline
            socket.broadcast.emit('admin-status-change', { online: false });
        }
    });
});

server.listen(port, () => {
  console.log(`Server berjalan di port ${port}`);
});

// Helper functions
function sendHtml(res, data) {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(data);
}

function send500(res) {
    res.writeHead(500, { 'Content-Type': 'text/plain' });
    res.end('Internal Server Error');
}
