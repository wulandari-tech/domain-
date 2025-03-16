const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');
const port = 3000;
const tld = 'wanzofc.us.kg'; // Ganti dengan TLD Anda
const apiToken = 'jsC-4c5SlT1GKESV7qzVf4sSYYgV9g-HrQvaNoHg'; // API Token
const zoneId = '8986c21d4df43f0d1708b8f9f6ab4dcd';     // Zone ID


// "Database" dalam memori (semua data di sini)
const emails = {};
const emailAuth = {}; // email -> {apiKey, apiToken, zoneId, expiresAt}


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

    if (reqUrl.pathname === '/' && req.method === 'GET') {
        // Tampilkan index.html
        fs.readFile(path.join(__dirname, 'index.html'), (err, data) => {
            if (err) {
                res.writeHead(500, { 'Content-Type': 'text/plain' });
                res.end('Internal Server Error');
                return;
            }
            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.end(data);
        });

    } else if (reqUrl.pathname === '/create-email' && req.method === 'GET') {
      // Buat alamat email acak
      const randomPrefix = generateRandomString(8);
      const emailAddress = `${randomPrefix}@${tld}`;

      // Hitung waktu kedaluwarsa (24 jam dari sekarang)
      const expiresAt = Date.now() + (24 * 60 * 60 * 1000);

      //Simpan API token, zone ID, dan waktu kedaluwarsa.
      emailAuth[emailAddress] = { apiToken, zoneId, expiresAt };


      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ email: emailAddress, expiresAt }));

    } else if (reqUrl.pathname === '/emails' && req.method === 'GET') {
        // Ambil email untuk alamat
        const address = reqUrl.query.address;

        if (!address) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ message: 'Alamat email diperlukan.' }));
            return;
        }

        const emailList = emails[address] || [];
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(emailList));

    } else if (reqUrl.pathname === '/receive' && req.method === 'POST') {
      //Simulasi menerima email.
      let body = '';
        req.on('data', chunk => {
            body += chunk.toString();
        });

        req.on('end', () => {
            try {
                const { to, from, subject, body: emailBody } = JSON.parse(body);

                if (!to || !from || !subject || !emailBody) {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ message: 'Data email tidak lengkap.' }));
                    return;
                }
                //Periksa apakah alamat tujuan ada dan belum kedaluwarsa.
                const emailData = emailAuth[to];

                if (!emailData) {
                    res.writeHead(403, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ message: 'Alamat email tidak valid atau sudah kedaluwarsa.'}));
                    return;
                }

                //Cek Kedaluwarsa
                if(Date.now() > emailData.expiresAt){
                  delete emails[to]; //Hapus email yang masuk
                  delete emailAuth[to]; //Hapus data autentikasi
                  res.writeHead(403, {'Content-Type': 'application/json'});
                  res.end(JSON.stringify({message: 'Alamat email sudah kedaluwarsa.'}));
                  return;
                }

                if (!emails[to]) {
                    emails[to] = [];
                }

                const newEmail = {
                    id: Date.now(),
                    from,
                    subject,
                    body: emailBody,
                };
                emails[to].push(newEmail);

                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: true }));
            } catch (error) {
                console.error('Error parsing JSON:', error);
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ message: 'Invalid request data.' }));
            }
        });
    }else {
        // 404 Not Found
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('Not Found');
    }
});

server.listen(port, hostname, () => {
    console.log(`Server running at http://${port}/`);
});
