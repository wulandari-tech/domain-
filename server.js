const express = require('express');
const path = require('path');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 8080;

// Konfigurasi Cloudflare (Hardcoded - NOT RECOMMENDED FOR PRODUCTION)
const CLOUDFLARE_ZONE = "8986c21d4df43f0d1708b8f9f6ab4dcd";
const CLOUDFLARE_API_TOKEN = "FUKXUphvvUDKUQW8v8JIWXBQekynFNOV1ltmT4eE";
const CLOUDFLARE_TLD = "wanzofc.us.kg";

// Middleware untuk memparsing body permintaan JSON
app.use(express.json());

// Fungsi untuk membuat subdomain di Cloudflare
async function subDomain1(host, ip) {
    try {
        const response = await axios.post(
            `https://api.cloudflare.com/client/v4/zones/${CLOUDFLARE_ZONE}/dns_records`,
            {
                type: "A",
                name: `${host.replace(/[^a-z0-9.-]/gi, "")}.${CLOUDFLARE_TLD}`,
                content: ip.replace(/[^0-9.]/gi, ""),
                ttl: 3600,
                priority: 10,
                proxied: false,
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
                ip: result.content
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

// Endpoint untuk membuat subdomain
app.post('/create-subdomain', async (req, res) => {
    const { host, ip } = req.body;

    if (!host || !ip) {
        return res.status(400).json({ success: false, error: "Host dan IP wajib diisi." });
    }

    try {
        const result = await subDomain1(host, ip);
        res.json({ success: true, message: 'Subdomain berhasil dibuat', data: result });
    } catch (error) {
        console.error("Error saat membuat subdomain:", error);
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
