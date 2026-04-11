require("dotenv").config();
const axios = require("axios");
const fs = require("fs");

async function scrapeHotels() {
  const DATA_FILE = "./automated_posts.json";

  try {
    const options = {
      method: "GET",
      url: `https://${process.env.RAPIDAPI_HOST}/api/v1/hotels/searchHotels`,
      params: {
        dest_id: "-2092174", // Mumbai
        search_type: "CITY",
        arrival_date: "2026-05-01",
        departure_date: "2026-05-05",
        adults: "2",
        room_qty: "1",
        units: "metric",
        languagecode: "id",
        currency_code: "IDR",
      },
      headers: {
        "x-rapidapi-key": process.env.RAPIDAPI_KEY,
        "x-rapidapi-host": process.env.RAPIDAPI_HOST,
        "Content-Type": "application/json",
      },
    };

    const response = await axios.request(options);
    const rawHotels = response.data?.data?.hotels || [];

    if (rawHotels.length === 0) {
      throw new Error("API mengembalikan data kosong");
    }

    // Mapping data hasil scrape
    const hotels = rawHotels.slice(0, 6).map((hotel) => {
      const p = hotel.property;
      return {
        name: p?.name || "Hotel Tanpa Nama",
        price: p?.priceBreakdown?.grossPrice?.value ? `Rp ${Math.round(p.priceBreakdown.grossPrice.value).toLocaleString("id-ID")}` : "Harga Hubungi Hotel",
        rating: p?.reviewScore || "N/A",
        image: p?.photoUrls?.[0] || "https://images.unsplash.com/photo-1566073771259-6a8506099945",
        link: p?.id ? `https://www.booking.com/hotel/id/${p.id}.html` : "#",
      };
    });

    console.log(`🏨 Scraper: Berhasil mengambil ${hotels.length} hotel segar.`);
    return hotels;
  } catch (err) {
    console.error("❌ SCRAPER ERROR:", err.message);

    // --- LOGIKA CADANGAN ---
    if (fs.existsSync(DATA_FILE)) {
      console.log("🔄 Scraper: Menggunakan data cadangan dari database lokal...");
      const backupData = JSON.parse(fs.readFileSync(DATA_FILE));

      // Mengembalikan data apa adanya agar server.js tidak bingung
      return backupData;
    }

    return [];
  }
}

module.exports = scrapeHotels;
