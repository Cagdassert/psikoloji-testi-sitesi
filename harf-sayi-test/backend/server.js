// backend/server.js
const express = require('express');
const cors = require('cors');
const {
  ensureDefaultUsers,
  findUserByUsername,
  findUserByCredentials,
  createUser,
  getAllUsers,
  addTestResult,
  getResultsByUser,
  getAllResultsWithUser,
} = require('./db');

const DEMO_USER_ID = 1; // eski sistem kırılmasın diye fallback
const PORT = 4000;

async function main() {
  await ensureDefaultUsers(); // admin + demo yarat

  const app = express();
  app.use(cors());
  app.use(express.json());

  // Küçük helper:
  // Hem /path hem /api/path için aynı handler'ı kaydediyoruz.
  function dualRoute(method, path, handler) {
    app[method](path, handler);          // örn: /auth/login
    app[method]('/api' + path, handler); // örn: /api/auth/login
  }

  /* ------------------------------------------------------------------ */
  /*  HEALTH CHECK                                                      */
  /* ------------------------------------------------------------------ */

  dualRoute('get', '/health', (req, res) => {
    res.json({
      status: 'ok',
      message: 'Backend (PostgreSQL + Auth) çalışıyor 🚀',
    });
  });

  /* ------------------------------------------------------------------ */
  /*  AUTH ENDPOINTLERİ                                                 */
  /* ------------------------------------------------------------------ */

  async function handleRegister(req, res) {
    try {
      const { username, password } = req.body;

      if (!username || !password) {
        return res
          .status(400)
          .json({ error: 'username ve password zorunlu' });
      }

      const existing = await findUserByUsername(username);
      if (existing) {
        return res
          .status(409)
          .json({ error: 'Bu kullanıcı adı zaten kayıtlı' });
      }

      const user = await createUser({
        username,
        password,
        role: 'user',
      });

      res.json({
        id: user.id,
        username: user.username,
        role: user.role,
      });
    } catch (err) {
      console.error('Register hatası:', err);
      res.status(500).json({ error: 'Sunucu hatası' });
    }
  }

  async function handleLogin(req, res) {
    try {
      const { username, password } = req.body;

      if (!username || !password) {
        return res
          .status(400)
          .json({ error: 'username ve password zorunlu' });
      }

      const user = await findUserByCredentials(username, password);
      if (!user) {
        return res
          .status(401)
          .json({ error: 'Kullanıcı adı veya şifre hatalı' });
      }

      res.json({
        id: user.id,
        username: user.username,
        role: user.role,
      });
    } catch (err) {
      console.error('Login hatası:', err);
      res.status(500).json({ error: 'Sunucu hatası' });
    }
  }

  dualRoute('post', '/auth/register', handleRegister);
  dualRoute('post', '/auth/login', handleLogin);

  /* ------------------------------------------------------------------ */
  /*  ADMIN: KULLANICI LİSTESİ                                          */
  /* ------------------------------------------------------------------ */

  async function handleGetUsers(req, res) {
    try {
      const users = await getAllUsers();
      res.json({ users });
    } catch (err) {
      console.error('Kullanıcı listesi hatası:', err);
      res.status(500).json({ error: 'Sunucu hatası' });
    }
  }

  dualRoute('get', '/admin/users', handleGetUsers);

  /* ------------------------------------------------------------------ */
  /*  TEST ENDPOINTLERİ                                                 */
  /* ------------------------------------------------------------------ */

  async function handleSaveTest(req, res) {
    try {
      const {
        userId,      // 👈 frontend’den gelecek
        testName,
        score,
        hits,
        misses,
        falseAlarms,
        ...rest
      } = req.body;

      // userId yoksa eski sistem için demo kullanıcıya yaz (geçiş dönemi)
      const finalUserId = Number(userId || DEMO_USER_ID);

      if (!testName || typeof score !== 'number') {
        return res
          .status(400)
          .json({ error: 'testName ve score zorunlu.' });
      }

      const saved = await addTestResult(finalUserId, {
        testName,
        score,
        hits,
        misses,
        falseAlarms,
        extra: Object.keys(rest).length ? rest : null,
      });

      res.json({ ok: true, result: saved });
    } catch (err) {
      console.error('Test kaydederken hata:', err);
      res.status(500).json({ error: 'Sunucu hatası' });
    }
  }

  async function handleMyResults(req, res) {
    try {
      const userId = Number(req.query.userId || DEMO_USER_ID);
      const results = await getResultsByUser(userId);
      res.json({ results });
    } catch (err) {
      console.error('Sonuçları çekerken hata:', err);
      res.status(500).json({ error: 'Sunucu hatası' });
    }
  }

  async function handleAdminAllResults(req, res) {
    try {
      const results = await getAllResultsWithUser();
      res.json({ results });
    } catch (err) {
      console.error('Admin sonuç listesi hatası:', err);
      res.status(500).json({ error: 'Sunucu hatası' });
    }
  }

  dualRoute('post', '/test/save', handleSaveTest);
  dualRoute('get', '/test/my-results', handleMyResults);
  dualRoute('get', '/admin/all-results', handleAdminAllResults);

  /* ------------------------------------------------------------------ */
  /*  SERVER START                                                      */
  /* ------------------------------------------------------------------ */

  app.listen(PORT, () => {
    console.log(
      `✅ Server http://localhost:${PORT} adresinde çalışıyor (PostgreSQL + Auth)`
    );
  });
}

// Sunucuyu başlat
main().catch((err) => {
  console.error('Sunucu başlatılamadı:', err);
  process.exit(1);
});
