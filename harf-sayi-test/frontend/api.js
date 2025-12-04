// api.js

// api.js

// 🔹 Frontend lokalden açılsa bile backend hep sunucudaki olsun
const isLocal =
  location.hostname === 'localhost' ||
  location.hostname === '127.0.0.1';

const API_BASE = isLocal
  ? 'http://sscsl.xyz:4000/api' // Lokal frontend → uzak backend
  : '/api';                     // sscsl.xyz üzerindeyken → nginx /api proxy

// Aktif kullanıcı
function getCurrentUser() {
  try {
    const raw = localStorage.getItem('currentUser');
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (err) {
    console.error('currentUser parse edilemedi:', err);
    return null;
  }
}

// Küçük helper
async function fetchJson(path, options = {}) {
  const res = await fetch(API_BASE + path, {
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    ...options,
  });

  if (!res.ok) {
    const txt = await res.text();
    console.error('API hata:', res.status, txt);
    throw new Error(txt || 'API error');
  }

  return res.json();
}

/* ------------------------------------------------------------------ */
/*  TEST SONUCU KAYDET                                                */
/* ------------------------------------------------------------------ */

async function saveTestResult(testName, payload) {
  try {
    const user = getCurrentUser();
    const userId = user?.id ?? null;

    const body = {
      userId,
      testName,
      ...payload,
    };

    // score'u sayı tipine çevir
    if (body.score != null) {
      body.score = Number(body.score);
    }

    const data = await fetchJson('/test/save', {
      method: 'POST',
      body: JSON.stringify(body),
    });

    console.log('Test sonucu kaydedildi:', data);
    return data;
  } catch (err) {
    console.error('Test sonucu kaydedilemedi:', err);
    return null;
  }
}

/* ------------------------------------------------------------------ */
/*  KULLANICI VE ADMIN SONUÇLARI                                      */
/* ------------------------------------------------------------------ */

// Kullanıcının kendi sonuçları
async function getMyResults() {
  const user = getCurrentUser();
  const userId = user?.id ?? null;
  const q = userId ? `?userId=${userId}` : '';
  return fetchJson(`/test/my-results${q}`);
}

// Admin: tüm sonuçlar
async function getAdminResults() {
  return fetchJson('/admin/all-results');
}

// Admin: kullanıcı listesi
async function getAllUsers() {
  return fetchJson('/admin/users');
}

// ⬇️ Test sayfaları ve admin dashboard buradan kullanacak
window.TestApi = {
  saveTestResult,
  getMyResults,
  getAdminResults,
  getAllUsers,
};
