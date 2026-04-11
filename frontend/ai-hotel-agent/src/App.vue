<script setup>
import { ref, onMounted } from "vue";

const hotels = ref([]);
const loading = ref(true);

// Share Button
const shareToSocial = (hotel) => {
  const frontendLink = "https://hotel-agent-pi.vercel.app";
  const imageUrl = hotel.image || "https://images.unsplash.com/photo-1566073771259-6a8506099945";
  const text = `*Cek hotel keren ini: ${hotel.name}!*\n\n---\n> Lokasi: Mumbai\n> Harga: ${hotel.price}\n\n"${hotel.content}"\n---\n\n*Lihat Gambar Hotel:*\n${imageUrl}\n\n*Lihat selengkapnya di web kami:*\n${frontendLink}`;
  // Encode teks agar aman dijadikan link URL
  const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
  // Buka WhatsApp di tab baru
  window.open(url, "_blank");
};

// --- CHATBOT LOGIC ---
const chatOpen = ref(false);
const chatInput = ref("");
const chatMessages = ref([{ role: "bot", text: "Halo! Saya asisten AI. Ada yang bisa saya bantu?" }]);

const sendMessage = async () => {
  if (!chatInput.value.trim()) return;

  const userMsg = chatInput.value;
  chatMessages.value.push({ role: "user", text: userMsg });
  chatInput.value = "";

  try {
    const res = await fetch("https://hotel-agent-production-334a.up.railway.app/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: userMsg }),
    });
    const data = await res.json();
    chatMessages.value.push({ role: "bot", text: data.reply });
  } catch {
    chatMessages.value.push({ role: "bot", text: "Maaf, saya gagal terhubung ke server backend." });
  }
};

onMounted(async () => {
  try {
    const res = await fetch("https://hotel-agent-production-334a.up.railway.app/api/hotels");
    if (!res.ok) throw new Error("Gagal mengambil data dari server");
    const data = await res.json();
    hotels.value = data;
    console.log("🏨 Data berhasil dimuat ke UI:", data);
  } catch (error) {
    console.error("Gagal sinkronisasi data:", error);
  } finally {
    setTimeout(() => {
      loading.value = false;
    }, 500);
  }
});
</script>

<template>
  <div class="bg-gray-950 min-h-screen text-white p-6 font-sans relative">
    <div class="mb-10 text-center">
      <h1 class="text-4xl md:text-5xl font-extrabold bg-gradient-to-r from-purple-400 via-pink-500 to-red-500 bg-clip-text text-transparent italic">🏨 AI Hotel Explorer</h1>
      <p class="text-gray-400 mt-3 tracking-widest uppercase text-sm font-medium">Discover & generate hotel insights with AI</p>
    </div>

    <div v-if="loading" class="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
      <div v-for="i in 6" :key="i" class="animate-pulse bg-white/5 border border-white/10 h-[450px] rounded-2xl"></div>
    </div>

    <div v-else-if="hotels.length === 0" class="text-center py-20">
      <p class="text-gray-500 text-xl">Tidak ada hotel yang ditemukan. Coba cek server backend Anda.</p>
    </div>

    <div v-else class="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
      <div
        v-for="hotel in hotels"
        :key="hotel.name"
        class="group bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden hover:border-purple-500/50 transition-all duration-500 flex flex-col shadow-2xl shadow-purple-500/5"
      >
        <div class="relative overflow-hidden h-52">
          <img :src="hotel.image || 'https://images.unsplash.com/photo-1566073771259-6a8506099945?q=80&w=1000'" class="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" alt="Hotel Image" />
          <div class="absolute top-4 right-4">
            <span class="bg-black/60 backdrop-blur-md text-[10px] font-bold px-3 py-1 rounded-full border border-white/20 tracking-tighter uppercase"> ✨ AI Drafted </span>
          </div>
        </div>

        <div class="p-6 flex flex-col flex-grow">
          <div class="mb-4">
            <h2 class="text-xl font-bold line-clamp-1 group-hover:text-purple-400 transition-colors">
              {{ hotel.name }}
            </h2>
            <div class="flex items-center gap-2 mt-1">
              <span class="text-yellow-400 text-xs">⭐⭐⭐⭐⭐</span>
              <span class="text-gray-500 text-[10px] font-bold">({{ hotel.rating }})</span>
            </div>
          </div>

          <p class="text-2xl font-black text-transparent bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text mb-4">
            {{ hotel.price }}
          </p>

          <div class="bg-white/5 rounded-xl p-4 mb-6 border border-white/5 flex-grow">
            <p class="text-gray-300 text-xs leading-relaxed italic line-clamp-4">"{{ hotel.content }}"</p>
          </div>

          <button
            @click="shareToSocial(hotel)"
            class="mt-auto w-full group/btn relative flex items-center justify-center gap-2 bg-white/5 border border-white/10 py-3 rounded-xl font-bold text-sm transition-all duration-300 hover:bg-green-500/10 hover:border-green-500/50 hover:text-green-400 shadow-lg active:scale-95"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5 fill-current transition-transform group-hover/btn:scale-110" viewBox="0 0 24 24">
              <path
                d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.588-5.946 0-6.556 5.332-11.888 11.888-11.888 3.176 0 6.164 1.236 8.407 3.483 2.245 2.247 3.48 5.234 3.48 8.405 0 6.556-5.331 11.888-11.888 11.888-2.01 0-3.989-.511-5.741-1.482l-6.245 1.638zm6.204-3.407l.345.205c1.42.842 3.064 1.286 4.755 1.286 5.257 0 9.531-4.275 9.531-9.531 0-2.545-1.002-4.938-2.822-6.756-1.819-1.82-4.212-2.821-6.754-2.821-5.257 0-9.531 4.274-9.531 9.53 0 1.761.488 3.483 1.412 4.978l.225.362-1.003 3.666 3.754-.985zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"
              />
            </svg>
            Bagikan via WhatsApp
          </button>
        </div>
      </div>
    </div>

    <div class="mt-20 text-center border-t border-white/5 pt-10 pb-10">
      <p class="text-gray-600 text-[10px] font-mono tracking-widest uppercase">CREATED BY CHRIST</p>
    </div>

    <div class="fixed bottom-6 right-6 z-50">
      <button @click="chatOpen = !chatOpen" class="bg-gradient-to-br from-purple-600 to-pink-600 hover:scale-110 active:scale-90 p-4 rounded-full shadow-2xl transition-all duration-300 text-xl">
        <span v-if="!chatOpen">💬</span>
        <span v-else>✕</span>
      </button>

      <transition name="fade">
        <div v-if="chatOpen" class="absolute bottom-20 right-0 w-80 h-[450px] bg-gray-900/95 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom-5 duration-300">
          <div class="bg-white/5 p-4 border-b border-white/10 flex items-center justify-between">
            <div class="flex items-center gap-2">
              <div class="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span class="text-xs font-bold uppercase tracking-widest text-purple-400">AI Assistant</span>
            </div>
          </div>

          <div class="flex-grow p-4 overflow-y-auto flex flex-col gap-3 custom-scrollbar">
            <div
              v-for="(msg, idx) in chatMessages"
              :key="idx"
              :class="msg.role === 'user' ? 'self-end bg-purple-600 text-white' : 'self-start bg-white/10 text-gray-200'"
              class="max-w-[85%] p-3 rounded-2xl text-[13px] leading-relaxed shadow-sm whitespace-pre-wrap break-words"
            >
              {{ msg.text }}
            </div>
          </div>

          <div class="p-4 bg-white/5 border-t border-white/10 flex gap-2">
            <input v-model="chatInput" @keyup.enter="sendMessage" placeholder="Tanya soal hotel..." class="bg-black/20 border border-white/10 rounded-xl flex-grow px-4 py-2 text-xs outline-none focus:border-purple-500 transition-colors" />
            <button @click="sendMessage" class="bg-purple-600 p-2 px-4 rounded-xl text-xs font-bold hover:bg-purple-500 transition-colors">Kirim</button>
          </div>
        </div>
      </transition>
    </div>
  </div>
</template>

<style>
/* Smooth scroll behavior */
html {
  scroll-behavior: smooth;
}

/* Custom scrollbar untuk tampilan dark mode */
::-webkit-scrollbar {
  width: 6px;
}
::-webkit-scrollbar-track {
  background: #0a0a0a;
}
::-webkit-scrollbar-thumb {
  background: #333;
  border-radius: 10px;
}
::-webkit-scrollbar-thumb:hover {
  background: #444;
}

/* Chat Messages Scrollbar */
.custom-scrollbar::-webkit-scrollbar {
  width: 4px;
}

/* Animation Fade */
.fade-enter-active,
.fade-leave-active {
  transition:
    opacity 0.3s ease,
    transform 0.3s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
  transform: translateY(20px);
}
</style>
