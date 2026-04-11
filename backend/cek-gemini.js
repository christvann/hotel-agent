require("dotenv").config();

async function cekModel() {
  console.log("🔍 Mengecek model yang tersedia untuk API Key Anda...");
  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${process.env.GEMINI_API_KEY}`);
    const data = await response.json();

    if (data.error) {
      console.error("❌ ERROR DARI GOOGLE:", data.error.message);
    } else {
      console.log("✅ MODEL YANG BISA ANDA PAKAI:");
      data.models.forEach((m) => console.log("- " + m.name.replace("models/", "")));
    }
  } catch (err) {
    console.error("Gagal mengecek:", err.message);
  }
}

cekModel();
