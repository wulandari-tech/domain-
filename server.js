const express = require('express');
const path = require('path');
const axios = require('axios');
const app = express();
const PORT = process.env.PORT || 3000;

const cloudflare = [
    {
        name: "domain1",
        zone: "8986c21d4df43f0d1708b8f9f6ab4dcd",
        api: "FUKXUphvvUDKUQW8v8JIWXBQekynFNOV1ltmT4eE",
        tld: "wanzofc.us.kg"
    },
    {
       name: "domain2",
       zone: "919ace9dbff7b1dd9aa5dcbb64decf88",
       api: "PsjHd9TnTQRDEG9HY9t9QBDCdJIAvEeSYV-bIDdA",
       tld: "awan-attack.my.id"
    },
    {
       name: "domain3",
       zone: "59a8c57e050d9fe494a0185d22b3ce8f",
       api: "3V4JjD7Q8Up4ks-wxVux27fZa2d4_w30gz8gkQ2c",
       tld: "awanbrayy.web.id"
   },
    {
       name: "domain4",
       zone: "6828ba3637863e29913b862d3b2864ed",
        api: "aodh20-nYjvNtK0LcroxLBYj9j6Brv4WHM8WRQHQ",
       tld: "behind-the-scenes.xyz"
    },
    {
        name: "domain5",
        zone: "f48125e204c58478e901b44591a8aaa1",
        api: "XiCX9FdqvuzTfrzohsIWKXs_grVujKdjyRaPdyB2",
        tld: "wanzofc.xyz"
    },
    {
        name: "domain6",
       zone: "4a077141990a60819c8a7e3ad006104c",
        api: "bAJeTExSyN5EZPxRkLgLGMRwdzpijxugZBS3WCXz",
       tld: "alfiansyah.xyz"
    },
];

app.use(express.json());

async function createDnsRecord(type, name, content, proxied, domainName) {
    const recordType = type.toUpperCase();
    if (!['A', 'CNAME'].includes(recordType)) {
        throw new Error("Tipe DNS record tidak valid. Harus 'A' atau 'CNAME'.");
    }
    const selectedDomain = cloudflare.find(domain => domain.name === domainName);
    if (!selectedDomain) {
        throw new Error(`Domain dengan nama ${domainName} tidak ditemukan`);
    }
    const recordName = `${name.replace(/[^a-z0-9.-]/gi, "")}.${selectedDomain.tld}`;
    try {
        const response = await axios.post(
            `https://api.cloudflare.com/client/v4/zones/${selectedDomain.zone}/dns_records`,
            {
                type: recordType,
                name: recordName,
                content: content,
                ttl: 3600,
                proxied: proxied === 'true',
            },
            {
                headers: {
                    Authorization: `Bearer ${selectedDomain.api}`,
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
                proxied: result.proxied,
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

app.post('/create-a-record', async (req, res) => {
    const { host, ip, domainName, proxied } = req.body;

    if (!host || !ip || !domainName) {
        return res.status(400).json({ success: false, error: "Host, IP, dan Domain wajib diisi." });
    }

    try {
        const result = await createDnsRecord('A', host, ip, proxied, domainName);
        res.json({ success: true, message: 'A record berhasil dibuat', data: result });
    } catch (error) {
        console.error("Error saat membuat A record:", error);
        res.status(500).json({ success: false, error: error.message });
    }
});

app.post('/create-cname-record', async (req, res) => {
    const { host, target, domainName, proxied } = req.body;

    if (!host || !target || !domainName) {
        return res.status(400).json({ success: false, error: "Host, Target, dan Domain wajib diisi." });
    }

    try {
        const result = await createDnsRecord('CNAME', host, target, proxied, domainName);
        res.json({ success: true, message: 'CNAME record berhasil dibuat', data: result });
    } catch (error) {
        console.error("Error saat membuat CNAME record:", error);
        res.status(500).json({ success: false, error: error.message });
    }
});

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});


// Endpoint API Dukun
app.get('/dukun', async (req, res) => {
    const text = req.query.content;

    if (!text || text.trim() === "") {
        return res.status(400).json({
            creator: "TANIA X WANZOFC",
            result: false,
            message: "Tolong tambahkan pertanyaan setelah parameter 'content'.",
            data: null
        });
    }

    try {
        const apiUrl = `https://api.siputzx.my.id/api/ai/dukun?content=${encodeURIComponent(text)}`;
        const apiResponse = await axios.get(apiUrl);
        const botResponse = apiResponse.data?.data || "Maaf, saya tidak bisa menjawab saat ini.";
         res.json({
             creator: "WANZOFC X TANIA",
             result: true,
             message: "sebut nama kamu",
             data: botResponse
         });
    } catch (error) {
        console.error("Error wanz:", error.message);
        res.status(500).json({
            creator: "WANZOFC X TANIA",
            result: false,
            message: "Maaf, dukun sedang bermeditasi. Coba lagi nanti.",
            data: null
        });
    }
});

// Endpoint untuk Meta AI (kontol)
app.get('/metaai', async (req, res) => {
    const query = req.query.query;

     if (!query || query.trim() === "") {
        return res.status(400).json({
            creator: "TANIA X WANZOFC",
            result: false,
            message: "Tolong tambahkan pertanyaan setelah parameter 'query'.",
            data: null
        });
    }
    try {
        const apiUrl = `https://api.siputzx.my.id/api/ai/metaai?query=${encodeURIComponent(query)}`;
        const apiResponse = await axios.get(apiUrl);
        const botResponse = apiResponse.data?.result || "Maaf, saya tidak bisa menjawab saat ini.";
        res.json({
            creator: "WANZOFC X TANIA",
            result: true,
            message: "metaai",
            data: botResponse
        });
    } catch (error) {
        console.error("Error metaai:", error.message);
       res.status(500).json({
           creator: "WANZOFC X TANIA",
            result: false,
            message: "Maaf, Meta AI sedang bermasalah. Coba lagi nanti.",
            data: null
        });
    }
});

// Endpoint untuk VCC Generator
app.get('/vcc-generator', async (req, res) => {
    const type = req.query.type;
    const count = req.query.count;

     if (!type || !count || type.trim() === "" || count.trim() === "") {
        return res.status(400).json({
            creator: "TANIA X WANZOFC",
            result: false,
            message: "Tolong tambahkan parameter 'type' dan 'count'.",
            data: null
        });
    }

    try {
        const apiUrl = `https://api.siputzx.my.id/api/tools/vcc-generator?type=${encodeURIComponent(type)}&count=${encodeURIComponent(count)}`;
         const apiResponse = await axios.get(apiUrl);
        const vccData = apiResponse.data?.data || [];
        res.json({
            creator: "WANZOFC X TANIA",
            result: true,
            message: "berikut adalah data vcc anda",
           data: vccData
        });
    } catch (error) {
        console.error("Error VCC Generator:", error.message);
         res.status(500).json({
            creator: "WANZOFC X TANIA",
            result: false,
            message: "Maaf, VCC generator sedang bermasalah. Coba lagi nanti.",
           data: null
        });
    }
});


// Endpoint untuk TikTok Downloader
app.get('/tiktok', async (req, res) => {
    const url = req.query.url;

    if (!url || url.trim() === "") {
        return res.status(400).json({
            creator: "TANIA X WANZOFC",
            result: false,
            message: "Tolong tambahkan parameter 'url'.",
            data: null
        });
    }

    try {
        const apiUrl = `https://api.siputzx.my.id/api/tiktok?url=${encodeURIComponent(url)}`;
        const apiResponse = await axios.get(apiUrl);
        const tiktokData = apiResponse.data || {};
         res.json({
            creator: "WANZOFC X TANIA",
            result: true,
            message: "berikut adalah data tiktok anda",
            data: tiktokData
         });
    } catch (error) {
        console.error("Error TikTok Downloader:", error.message);
        res.status(500).json({
            creator: "WANZOFC X TANIA",
            result: false,
            message: "Maaf, TikTok downloader sedang bermasalah. Coba lagi nanti.",
            data: null
        });
    }
});

// Endpoint untuk Instagram Downloader
app.get('/igdl', async (req, res) => {
  const url = req.query.url;

  if (!url || url.trim() === "") {
    return res.status(400).json({
      creator: "TANIA X WANZOFC",
      result: false,
      message: "Tolong tambahkan parameter 'url'.",
      data: null,
    });
  }

  try {
    const apiUrl = `https://api.siputzx.my.id/api/d/igdl?url=${encodeURIComponent(
      url
    )}`;
    const apiResponse = await axios.get(apiUrl);
    const igData = apiResponse.data || {};
    res.json({
      creator: "WANZOFC X TANIA",
      result: true,
      message: "berikut adalah data instagram anda",
      data: igData,
    });
  } catch (error) {
    console.error("Error Instagram Downloader:", error.message);
    res.status(500).json({
      creator: "WANZOFC X TANIA",
      result: false,
      message: "Maaf, Instagram downloader sedang bermasalah. Coba lagi nanti.",
      data: null,
    });
  }
});


// Endpoint untuk Search TikTok
app.get('/s/tiktok', async (req, res) => {
    const query = req.query.query;

    if (!query || query.trim() === "") {
        return res.status(400).json({
            creator: "TANIA X WANZOFC",
            result: false,
            message: "Tolong tambahkan parameter 'query'.",
            data: null
        });
    }

    try {
        const apiUrl = `https://api.siputzx.my.id/api/s/tiktok?query=${encodeURIComponent(query)}`;
        const apiResponse = await axios.get(apiUrl);
          const searchData = apiResponse.data || {};
        res.json({
             creator: "WANZOFC X TANIA",
            result: true,
            message: "berikut adalah data pencarian tiktok anda",
            data: searchData
        });
    } catch (error) {
        console.error("Error Search TikTok:", error.message);
        res.status(500).json({
            creator: "WANZOFC X TANIA",
            result: false,
            message: "Maaf, pencarian tiktok sedang bermasalah. Coba lagi nanti.",
           data: null
        });
    }
});

app.listen(PORT, () => {
    console.log(`Server berjalan di http://localhost:${PORT}`);
});
