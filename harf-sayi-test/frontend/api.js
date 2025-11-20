// api.js

const API_BASE = 'http://localhost:4000';

// localStorage'dan aktif kullanıcıyı oku
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

// Test sonucu kaydet
async function saveTestResult(testName, payload) {
  try {
    const user = getCurrentUser();
    const userId = user?.id; // giriş yaptıysa backend'e gönder

    const res = await fetch(`${API_BASE}/api/test/save`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, testName, ...payload })
    });

    if (!res.ok) {
      console.error('Test kaydı hatası:', await res.text());
      return null;
    }
    const data = await res.json();
    console.log('✅ Test kaydedildi:', data);
    return data;
  } catch (err) {
    console.error('Sunucuya bağlanırken hata (saveTestResult):', err);
    return null;
  }
}

// Aktif kullanıcının tüm sonuçları
async function getMyResults() {
  try {
    const user = getCurrentUser();
    const userId = user?.id;

    const url = userId
      ? `${API_BASE}/api/test/my-results?userId=${encodeURIComponent(userId)}`
      : `${API_BASE}/api/test/my-results`;

    const res = await fetch(url);
    if (!res.ok) {
      console.error('Sonuçları çekerken hata:', await res.text());
      return [];
    }
    const data = await res.json();
    return data.results ?? [];
  } catch (err) {
    console.error('Sunucuya bağlanırken hata (getMyResults):', err);
    return [];
  }
}

window.TestApi = { saveTestResult, getMyResults, getCurrentUser };
