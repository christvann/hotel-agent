require("dotenv").config();
const express = require("express");
const cors = require("cors");
const fs = require("fs");
const cron = require("node-cron");
const axios = require("axios"); // Tambahkan axios untuk kirim pesan
const scrapeHotels = require("./scraper");
const generateContent = require("./generator");
const OpenAI = require("openai");

const app = express();
app.use(cors());
app.use(express.json());

const DATA_FILE = "./automated_posts.json";
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// --- FUNGSI SHARE KE SOSIAL MEDIA ---
const shareToSocialMedia = async (hotel) => {
  try {
    const message = `🌟 *AI HOTEL DISCOVERY: ${hotel.name}* 🌟\n\n📍 Lokasi: Mumbai\n💰 Harga: ${hotel.price}\n⭐ Rating: ${hotel.rating}/10\n\n📝 " ${hotel.content} "\n\n🔗 Lihat selengkapnya di: ${process.env.FRONTEND_URL}`;

    // 1. Share ke Telegram
    if (process.env.TELEGRAM_TOKEN && process.env.TELEGRAM_CHAT_ID) {
      await axios.post(`https://api.telegram.org/bot${process.env.TELEGRAM_TOKEN}/sendMessage`, {
        chat_id: process.env.TELEGRAM_CHAT_ID,
        text: message,
        parse_mode: "Markdown",
      });
      console.log("📤 Berhasil share ke Telegram.");
    }

    // 2. Share ke Discord
    if (process.env.DISCORD_WEBHOOK_URL) {
      await axios.post(process.env.DISCORD_WEBHOOK_URL, {
        content: "📢 **New AI Hotel Content Published!**",
        embeds: [
          {
            title: hotel.name,
            description: hotel.content,
            color: 10181046,
            fields: [
              { name: "Price", value: hotel.price, inline: true },
              { name: "Rating", value: hotel.rating.toString(), inline: true },
            ],
            image: { url: hotel.image || "" },
            url: process.env.FRONTEND_URL,
          },
        ],
      });
      console.log("📤 Berhasil share ke Discord.");
    }
  } catch (error) {
    console.error("❌ Gagal sharing ke sosmed:", error.message);
  }
};

// --- ROUTE UNTUK CHATBOT ---
app.post("/api/chat", async (req, res) => {
  try {
    const { message } = req.body;
    const msg = message.toLowerCase();

    if (!fs.existsSync(DATA_FILE)) {
      return res.json({ reply: "Sabar ya, saya sedang menyiapkan daftar hotel terbaru untukmu." });
    }
    const hotels = JSON.parse(fs.readFileSync(DATA_FILE));

    if (msg.includes("dimana") || msg.includes("lokasi")) {
      return res.json({ reply: "Semua hotel berlokasi di Mumbai, India." });
    }
    if (msg.includes("murah") || msg.includes("hemat")) {
      const cheap = [...hotels].sort((a, b) => parseInt(a.price.replace(/\D/g, "")) - parseInt(b.price.replace(/\D/g, "")))[0];
      return res.json({ reply: `Paling hemat kantong itu ${cheap.name}. Harganya cuma ${cheap.price} per malam!` });
    }
    if (msg.includes("bagus") || msg.includes("rekomendasi")) {
      const best = [...hotels].sort((a, b) => b.rating - a.rating)[0];
      return res.json({ reply: `Rekomendasi juara saya adalah ${best.name} dengan rating ${best.rating}/10.` });
    }
    if (msg.includes("halo") || msg.includes("hi")) {
      return res.json({ reply: "Halo! Saya asisten AI Hotel Explorer. Cari hotel murah atau rating tinggi?" });
    }

    res.json({ reply: "Saya bisa carikan hotel termurah atau rekomendasi terbaik di Mumbai. Mau coba?" });
  } catch (err) {
    res.json({ reply: "Maaf, sistem sedang sinkronisasi data." });
  }
});

// --- LOGIKA OTOMATISASI ---
const runAiAgentTask = async () => {
  console.log("\n🤖 AI Agent memulai tugas otomatis (Scrape + Generate + Share)...");
  try {
    const hotels = await scrapeHotels();
    if (!hotels || hotels.length === 0) return;

    const results = await Promise.all(
      hotels.map(async (hotel) => {
        const content = await generateContent(hotel);
        return { ...hotel, content, publishedAt: new Date().toISOString() };
      })
    );

    fs.writeFileSync(DATA_FILE, JSON.stringify(results, null, 2));
    console.log("✅ Data berhasil disimpan di database lokal.");

    // Ambil 1 hotel secara acak untuk dipublish ke sosmed
    const randomHotel = results[Math.floor(Math.random() * results.length)];
    await shareToSocialMedia(randomHotel);
  } catch (err) {
    console.error("❌ Agent Error:", err.message);
  }
};

// Jadwal: Setiap 2 jam
cron.schedule("0 */2 * * *", runAiAgentTask);
runAiAgentTask();

app.get("/api/hotels", (req, res) => {
  if (fs.existsSync(DATA_FILE)) {
    res.json(JSON.parse(fs.readFileSync(DATA_FILE)));
  } else {
    res.status(404).json({ message: "Data kosong." });
  }
});

const PORT = process.env.PORT || 3005;
app.listen(PORT, () => {
  console.log(`🌐 Server jalan di port ${PORT}`);
});
