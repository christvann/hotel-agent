require("dotenv").config();
const express = require("express");
const cors = require("cors");
const fs = require("fs");
const cron = require("node-cron");
const scrapeHotels = require("./scraper");
const generateContent = require("./generator");
const OpenAI = require("openai");

const app = express();
app.use(cors());
app.use(express.json());

const DATA_FILE = "./automated_posts.json";
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// --- ROUTE UNTUK CHATBOT ---
app.post("/api/chat", async (req, res) => {
  try {
    const { message } = req.body;
    const msg = message.toLowerCase();

    if (!fs.existsSync(DATA_FILE)) {
      return res.json({ reply: "Sabar ya, saya sedang menyiapkan daftar hotel terbaru untukmu." });
    }
    const hotels = JSON.parse(fs.readFileSync(DATA_FILE));

    // --- LOGIKA BERDASARKAN KEYWORD ---

    // 1. Tanya Lokasi (Mumbai)
    if (msg.includes("dimana") || msg.includes("lokasi") || msg.includes("daerah")) {
      return res.json({
        reply: "Semua hotel yang saya temukan saat ini berlokasi di Mumbai, India. Kamu mau cari yang spesifik di area tertentu?",
      });
    }

    // 2. Tanya Murah
    if (msg.includes("murah") || msg.includes("hemat") || msg.includes("terjangkau")) {
      const cheap = [...hotels].sort((a, b) => {
        return parseInt(a.price.replace(/\D/g, "")) - parseInt(b.price.replace(/\D/g, ""));
      })[0];
      return res.json({ reply: `Paling hemat kantong itu ${cheap.name}. Harganya cuma ${cheap.price} per malam!` });
    }

    // 3. Tanya Bagus/Rekomendasi
    if (msg.includes("bagus") || msg.includes("rating") || msg.includes("rekomendasi") || msg.includes("terbaik")) {
      const best = [...hotels].sort((a, b) => b.rating - a.rating)[0];
      return res.json({ reply: `Rekomendasi juara saya adalah ${best.name} dengan rating ${best.rating}/10. Dijamin puas menginap di sana!` });
    }

    // 4. Tanya Jumlah Hotel
    if (msg.includes("berapa") && (msg.includes("hotel") || msg.includes("pilihan"))) {
      return res.json({ reply: `Saat ini saya punya ${hotels.length} pilihan hotel menarik di Mumbai yang siap kamu pilih.` });
    }

    // 5. Salam / Greetings
    if (msg.includes("halo") || msg.includes("hi") || msg.includes("hai") || msg.includes("pagi") || msg.includes("siang") || msg.includes("malam")) {
      return res.json({ reply: "Halo! Saya asisten AI Hotel Explorer. Mau cari hotel yang paling murah atau yang ratingnya paling tinggi hari ini?" });
    }

    // 6. Terima Kasih
    if (msg.includes("terima kasih") || msg.includes("terimakasih") || msg.includes("makasih") || msg.includes("thanks") || msg.includes("thank you") || msg.includes("oke")) {
      return res.json({ reply: "Sama-sama! Semoga liburanmu di Mumbai menyenangkan. Ada lagi yang bisa saya bantu?" });
    }

    // DEFAULT JIKA OPENAI LIMIT (Fallback Akhir)
    res.json({
      reply: "Hmm, saya kurang mengerti maksudmu. Tapi saya bisa carikan hotel termurah, lokasi hotel, atau rekomendasi terbaik. Mau coba?",
    });
  } catch (err) {
    console.error("❌ Error Chat:", err.message);
    res.json({ reply: "Maaf, sistem saya sedang sinkronisasi data. Tanya lagi sebentar lagi ya!" });
  }
});

// --- LOGIKA OTOMATISASI ---
const runAiAgentTask = async () => {
  console.log("\n🤖 AI Agent memulai tugas otomatis...");
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
    console.log("✅ Data dipublish.");
  } catch (err) {
    console.error("❌ Agent Error:", err.message);
  }
};

cron.schedule("0 */2 * * *", runAiAgentTask);
runAiAgentTask();

app.get("/api/hotels", (req, res) => {
  if (fs.existsSync(DATA_FILE)) {
    res.json(JSON.parse(fs.readFileSync(DATA_FILE)));
  } else {
    res.status(404).json({ message: "Data kosong." });
  }
});

const PORT = 3005;
app.listen(PORT, () => {
  console.log(`🌐 Server jalan di http://localhost:${PORT}`);
});
