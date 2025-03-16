const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');
const { Server } = require('socket.io'); // Tambahkan Socket.IO
const bcrypt = require('bcrypt'); //Untuk hashing password, install dengan: npm install bcrypt
const port = 3000;
const tld = 'wanzofc.us.kg';
const apiToken = 'jsC-4c5SlT1GKESV7qzVf4sSYYgV9g-HrQvaNoHg';
const zoneId = '8986c21d4df43f0d1708b8f9f6ab4dcd';
const saltRounds = 10; //Untuk bcrypt

// "Database" (dalam memori - STRUKTUR YANG LEBIH BAIK)
const tempEmails = {}; // email -> { expiresAt }
const customEmails = {}; // username -> { hashedPassword, emailAddress, targetUser: tempEmailAddress }
const chats = {}; // chatId -> { messages: [{sender, text, timestamp}], participants: [userEmail, adminEmail] }
const users = {}; // email -> {type: 'temp' | 'custom' | 'admin',  socketId: (untuk WebSocket)}
const adminOnline = false; //Status admin online/offline.
let adminSocket = null; // Socket.IO socket untuk admin


const server = http.createServer((req, res) => {
    const reqUrl = url.parse(req.url, true);
    const pathname = reqUrl.pathname;

    if (pathname === '/' && req.method === 'GET') {
        fs.readFile('index.html', (err, data) => {
            if (err) {
                res.writeHead(500, { 'Content-Type': 'text/plain' }); res.end('Internal Server Error'); return;
            }
            res.writeHead(200, { 'Content-Type': 'text/html' }); res.end(data);
        });
    } else if (pathname === '/admin' && req.method === 'GET') {
        fs.readFile('admin.html', (err, data) => {
            if (err) {
                res.writeHead(500, { 'Content-Type': 'text/plain' }); res.end('Internal Server Error'); return;}
            res.writeHead(200, { 'Content-Type': 'text/html' }); res.end(data);
        });

    } else if (pathname === '/create-email' && req.method === 'GET') {
        // Buat email sementara (seperti sebelumnya)
        const randomPrefix = generateRandomString(8);
        const emailAddress = `${randomPrefix}@${tld}`;
        const expiresAt = Date.now() + (24 * 60 * 60 * 1000);
        tempEmails[emailAddress] = {  expiresAt };
        users[emailAddress] = { type: 'temp' }; // Tambahkan ke users
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ email: emailAddress, expiresAt }));

    } else if (pathname === '/emails' && req.method === 'GET') {
      //Ambil daftar email untuk alamat tertentu.
        const address = reqUrl.query.address;
          if (!address) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ message: 'Alamat email diperlukan.' }));
            return;
        }

        //Periksa apakah email ada di tempEmails atau customEmails
        const isTemp = tempEmails[address] !== undefined;
        const isCustom = Object.values(customEmails).find(data => data.emailAddress === address) !== undefined;


        if(!isTemp && !isCustom){
            res.writeHead(404, {'Content-Type': 'application/json'});
            res.end(JSON.stringify({message: 'Alamat email tidak ditemukan.'}));
            return;
        }

        //Karena ini simulasi, kita buat email dummy.  Dalam kasus nyata, ini akan diambil dari database.
        const emailList = [
          { id: 1, from: 'sender1@example.com', subject: 'Contoh Email 1', body: 'Ini adalah contoh email pertama.' },
          { id: 2, from: 'sender2@example.com', subject: 'Contoh Email 2', body: 'Ini adalah contoh email kedua.' },
        ];

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(emailList));


    } else if (pathname === '/create-custom-email' && req.method === 'POST') {
        // Buat email custom (DARI ADMIN)
        let body = '';
        req.on('data', chunk => { body += chunk.toString(); });
        req.on('end', async () => { // Tambahkan async
            try {
                const { username, password, targetUser } = JSON.parse(body);
                const emailAddress = `${username}@${tld}`;

                if (customEmails[username]) {
                    res.writeHead(409, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ message: 'Nama pengguna sudah ada.' }));
                    return;
                }

                // HASH PASSWORD (PENTING!)
                const hashedPassword = await bcrypt.hash(password, saltRounds);

                // Simpan data email custom
                customEmails[username] = { hashedPassword, emailAddress, targetUser };
                users[emailAddress] = {type: 'custom'}

                //Kirim informasi bahwa email custom berhasil di buat
                const targetUserData = users[targetUser];
                if(targetUserData && targetUserData.socketId){
                   io.to(targetUserData.socketId).emit('custom-email-created', {email: emailAddress});
                }

                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: true, email: emailAddress }));

            } catch (error) {
                console.error('Error:', error);
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ message: 'Invalid request data.' }));
            }
        });
    } else if (pathname === '/custom-emails' && req.method === 'GET') {
      // Ambil daftar email custom
      const emailList = Object.values(customEmails).map(data => data.emailAddress);
      res.writeHead(200, {'Content-Type': 'application/json'});
      res.end(JSON.stringify(emailList));

    }

     else {
        // 404 Not Found
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('Not Found');
    }
});

const io = new Server(server); // Buat instance Socket.IO

io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

     socket.on('register', (email) => {
      // Daftarkan pengguna (temp atau custom) dengan socket ID
      if (users[email]) {
          users[email].socketId = socket.id;
        } else {
            // Ini bisa terjadi jika pengguna merefresh halaman.
            // Dalam kasus nyata, Anda mungkin perlu memuat data pengguna dari database.
            console.warn(`User ${email} not found in users, but registered with socket ${socket.id}`);

        }

    });


    socket.on('admin-login', async (password) => {

      if(password === "admin123"){ //Ganti dengan password admin, dan seharusnya di hash juga
        adminOnline = true;
        adminSocket = socket;
        socket.emit('admin-login-success');
        console.log('Admin logged in:', socket.id);

        //Beritahu semua user bahwa admin online
        socket.broadcast.emit('admin-status-change', {online: true});

      } else {
        socket.emit('admin-login-failure');
        console.log("Admin login failed");
      }

    });


    socket.on('start-chat', (userEmail) => {
        // Buat chat baru (jika belum ada)
        if(!adminOnline){
          socket.emit('chat-error', {message: 'Admin sedang offline.'});
          return
        }

        const existingChat = Object.values(chats).find(chat => chat.participants.includes(userEmail) && chat.participants.includes('admin'));
        if(existingChat){
          //Jika chat sudah ada, gabungkan user ke chat tersebut.
          socket.emit('chat-started', {chatId: existingChat.chatId});

        } else {
          //Buat chat baru.
          const chatId = generateRandomString(10); // Buat ID unik
          chats[chatId] = { messages: [], participants: [userEmail, 'admin'] };
          socket.emit('chat-started', { chatId });

          // Beritahu admin tentang chat baru
          if (adminSocket) {
              adminSocket.emit('new-chat', { chatId, userEmail });
          }
        }
    });

    socket.on('chat-message', ({ chatId, text }) => {
        // Tangani pesan chat
        if (!chats[chatId]) {
          console.warn("Chat not found", chatId);
            return;
        }
        const sender = users[socket.id] === 'admin' ? 'admin' : 'user';
        const message = { sender, text, timestamp: Date.now() };
        chats[chatId].messages.push(message);

        // Kirim pesan ke semua partisipan dalam chat
        const participants = chats[chatId].participants;

        participants.forEach((participantEmail) => {
          const participantSocketId = users[participantEmail] ? users[participantEmail].socketId : null;

          if(participantSocketId){
             io.to(participantSocketId).emit('chat-message', {chatId, message});
          } else {
            console.warn("Participant not found or not online: ", participantEmail)
          }
       });

    });

     socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
        // Hapus socketId dari users
        for (const email in users) {
            if (users[email].socketId === socket.id) {
                users[email].socketId = null; // Atau hapus seluruh entri user
                break;
            }
        }

        //Jika admin disconnect
        if(socket.id === adminSocket?.id){
          adminOnline = false;
          adminSocket = null;
          //Beritahu semua user bahwa admin offline
          socket.broadcast.emit('admin-status-change', {online: false});
        }

    });
});


server.listen(port, () => {
  console.log(`Server berjalan di port ${port}`);
});

function generateRandomString(length) {
  let result = '';
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const charactersLength = characters.length;
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
  }
  return result;
}
