const OpenAI = require("openai");

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

async function generateContent(hotel) {
  try {
    const prompt = `
      Buat artikel travel blog pendek (2-3 kalimat) yang sangat menarik untuk:
      Hotel: ${hotel.name}
      Harga: ${hotel.price}
      Rating: ${hotel.rating}/10
      Gunakan gaya bahasa influencer travel yang mengajak orang menginap di sini.
    `;

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 300,
    });

    return response.choices[0].message.content;
  } catch (err) {
    console.error("❌ OPENAI ERROR:", err.message);
    return "Hotel impian yang wajib kamu kunjungi segera! Hubungi kami untuk info lebih lanjut.";
  }
}

module.exports = generateContent;
