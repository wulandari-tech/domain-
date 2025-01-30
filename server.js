const express = require('express');
const path = require('path');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 3000;

// Konfigurasi Cloudflare (Hardcoded - NOT RECOMMENDED FOR PRODUCTION)
const CLOUDFLARE_ZONE = "8986c21d4df43f0d1708b8f9f6ab4dcd";
const CLOUDFLARE_API_TOKEN = "FUKXUphvvUDKUQW8v8JIWXBQekynFNOV1ltmT4eE";
const CLOUDFLARE_TLD = "wanzofc.us.kg";

// Middleware untuk memparsing body permintaan JSON
app.use(express.json());

// Fungsi untuk membuat DNS Record (A atau CNAME) di Cloudflare
async function createDnsRecord(type, name, content, proxied = false) {
    const recordType = type.toUpperCase();

    if (!['A', 'CNAME'].includes(recordType)) {
       throw new Error("Tipe DNS record tidak valid. Harus 'A' atau 'CNAME'.");
    }

     const recordName = `${name.replace(/[^a-z0-9.-]/gi, "")}.${CLOUDFLARE_TLD}`;

    try {
        const response = await axios.post(
            `https://api.cloudflare.com/client/v4/zones/${CLOUDFLARE_ZONE}/dns_records`,
            {
                type: recordType,
                name: recordName,
                content: content,
                ttl: 3600,
                proxied: proxied,
            },
            {
                headers: {
                    Authorization: `Bearer ${CLOUDFLARE_API_TOKEN}`,
                    "Content-Type": "application/json",
                },
            }
        );

        if (response.data.success) {
            const result = response.data.result;
            return {
                success: true,
                zone: result.zone_name,
                name: result.name,
                type: result.type,
                content: result.content,
            };
        } else {
            let error = response.data?.errors?.[0]?.message || response.data?.errors || "Unknown Cloudflare API error";
           throw new Error(error);
        }

    } catch (error) {
        let errorMessage = error.response?.data?.errors?.[0]?.message || error.response?.data?.errors || error.message || error.response?.data || error.response || error;
        throw new Error(`Cloudflare API error: ${String(errorMessage)}`);
    }
}


// Endpoint untuk membuat subdomain A record
app.post('/create-a-record', async (req, res) => {
    const { host, ip } = req.body;

    if (!host || !ip) {
        return res.status(400).json({ success: false, error: "Host dan IP wajib diisi." });
    }

    try {
        const result = await createDnsRecord('A', host, ip);
        res.json({ success: true, message: 'A record berhasil dibuat', data: result });
    } catch (error) {
        console.error("Error saat membuat A record:", error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Endpoint untuk membuat subdomain CNAME record
app.post('/create-cname-record', async (req, res) => {
    const { host, target } = req.body;

     if (!host || !target) {
         return res.status(400).json({ success: false, error: "Host dan Target wajib diisi." });
     }

    try {
        const result = await createDnsRecord('CNAME', host, target, true);
        res.json({ success: true, message: 'CNAME record berhasil dibuat', data: result });
    } catch (error) {
        console.error("Error saat membuat CNAME record:", error);
        res.status(500).json({ success: false, error: error.message });
    }
});


// Endpoint utama untuk mengirim index.html
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Jalankan server
app.listen(PORT, () => {
    console.log(`Server berjalan di http://localhost:${PORT}`);
});
