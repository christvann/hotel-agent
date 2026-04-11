require("dotenv").config();
const express = require("express");
const cors = require("cors");
const fs = require("fs");
const cron = require("node-cron");
const axios = require("axios");
const scrapeHotels = require("./scraper");
const generateContent = require("./generator");
const { GoogleGenerativeAI } = require("@google/generative-ai");

const app = express();
app.use(cors());
app.use(express.json());

const DATA_FILE = "./automated_posts.json";
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// --- FUNGSI SHARE KE SOSIAL MEDIA ---
const shareToSocialMedia = async (hotel) => {
  try {
    const frontendLink = process.env.FRONTEND_URL || "https://hotel-agent-pi.vercel.app";
    const caption = `🌟 *AI HOTEL DISCOVERY: ${hotel.name}* 🌟\n\n📍 Lokasi: Mumbai\n💰 Harga: ${hotel.price}\n⭐ Rating: ${hotel.rating}/10\n\n📝 " ${hotel.content} "\n\n🔗 Lihat selengkapnya di: ${frontendLink}`;

    // Share ke Telegram
    if (process.env.TELEGRAM_TOKEN && process.env.TELEGRAM_CHAT_ID) {
      await axios.post(`https://api.telegram.org/bot${process.env.TELEGRAM_TOKEN}/sendPhoto`, {
        chat_id: process.env.TELEGRAM_CHAT_ID,
        photo: hotel.image || "https://images.unsplash.com/photo-1566073771259-6a8506099945",
        caption: caption,
        parse_mode: "Markdown",
      });
      console.log("📤 Telegram: OK");
    }

    // Share ke Discord
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
              { name: "Link", value: frontendLink },
            ],
            image: { url: hotel.image || "" },
          },
        ],
      });
      console.log("📤 Discord: OK");
    }
  } catch (error) {
    console.error("❌ Social Media Error:", error.message);
  }
};

// --- ROUTE UNTUK CHATBOT (TRIPLE LAYER: GEMINI -> KEYWORD -> FALLBACK) ---
app.post("/api/chat", async (req, res) => {
  try {
    const { message } = req.body;
    const msg = message.toLowerCase();

    if (!fs.existsSync(DATA_FILE)) {
      return res.json({ reply: "Sabar ya, data hotel sedang disiapkan." });
    }
    const hotels = JSON.parse(fs.readFileSync(DATA_FILE));

    // LAYER 1: Mencoba Menggunakan Gemini (AI Chat)
    try {
      if (!process.env.GEMINI_API_KEY) throw new Error("No Gemini Key");

      const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
      const prompt = `Anda adalah asisten AI Christ Vann. Jawab pertanyaan user: "${message}" berdasarkan data hotel Mumbai ini: ${JSON.stringify(hotels)}. 
      ATURAN PENTING:
      1. Jawab dengan singkat, padat, dan ramah (maksimal 3 kalimat).
      2. Gunakan emoji secukupnya.
      3. DILARANG menggunakan format link Markdown seperti [Teks](URL). Jika harus mengirim link, ketikkan saja URL aslinya.
      4. Jika ditanya harga termurah, urutkan dari yang termurah.`;

      const result = await model.generateContent(prompt);
      const response = await result.response;
      return res.json({ reply: response.text() });
    } catch (aiError) {
      console.log("⚠️ Chatbot: Gemini Error/Limit, Menggunakan Manual Keyword...");

      // LAYER 2: Manual Keyword (Logika Internal)
      if (msg.includes("dimana") || msg.includes("lokasi")) {
        return res.json({ reply: "Semua hotel yang saya pantau berlokasi di Mumbai, India." });
      }
      if (msg.includes("murah") || msg.includes("hemat") || msg.includes("budget")) {
        const cheap = [...hotels].sort((a, b) => parseInt(a.price.replace(/\D/g, "")) - parseInt(b.price.replace(/\D/g, "")))[0];
        return res.json({ reply: `Paling hemat kantong itu ${cheap.name}. Harganya cuma ${cheap.price} per malam!` });
      }
      if (msg.includes("bagus") || msg.includes("rekomendasi") || msg.includes("terbaik")) {
        const best = [...hotels].sort((a, b) => b.rating - a.rating)[0];
        return res.json({ reply: `Rekomendasi juara saya adalah ${best.name} dengan rating ${best.rating}/10.` });
      }
      if (msg.includes("halo") || msg.includes("hai") || msg.includes("pagi")) {
        return res.json({ reply: "Halo! Saya Christ Vann AI. Mau cari hotel murah atau rating tertinggi di Mumbai?" });
      }

      // LAYER 3: Fallback (Jika keyword tidak cocok)
      return res.json({ reply: "Saya bisa bantu carikan hotel termurah atau rekomendasi terbaik di Mumbai. Mau coba?" });
    }
  } catch (err) {
    res.json({ reply: "Maaf, sistem sedang sinkronisasi data. Tanya lagi sebentar lagi ya!" });
  }
});

// --- LOGIKA OTOMATISASI ---
const runAiAgentTask = async () => {
  console.log("\n🤖 AI Agent memulai tugas otomatis...");
  try {
    const hotels = await scrapeHotels();
    if (!hotels || hotels.length === 0) return;

    // Generator di generator.js sudah menangani OpenAI -> Gemini -> Manual
    const results = await Promise.all(
      hotels.map(async (hotel) => {
        const content = await generateContent(hotel);
        return { ...hotel, content, publishedAt: new Date().toISOString() };
      }),
    );

    fs.writeFileSync(DATA_FILE, JSON.stringify(results, null, 2));

    const randomHotel = results[Math.floor(Math.random() * results.length)];
    await shareToSocialMedia(randomHotel);
  } catch (err) {
    console.error("❌ Agent Task Error:", err.message);
  }
};

// --- START SERVER (DENGAN SAFE BOOTING) ---
const PORT = process.env.PORT || 3005;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`🌐 Server jalan di port ${PORT}`);

  // Jalankan tugas pertama kali saat server nyala
  runAiAgentTask().catch((err) => console.error("Initial task failed:", err.message));
});

// Jadwal: Setiap 2 jam
cron.schedule("0 */2 * * *", runAiAgentTask);

// API untuk Frontend
app.get("/api/hotels", (req, res) => {
  if (fs.existsSync(DATA_FILE)) {
    res.json(JSON.parse(fs.readFileSync(DATA_FILE)));
  } else {
    res.status(404).json({ message: "Data belum tersedia." });
  }
});
