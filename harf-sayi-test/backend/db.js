// backend/db.js
const { Pool } = require('pg');

// 🔹 PostgreSQL ayarların
const pool = new Pool({
  host: 'localhost',
  port: 5432,
  user: 'postgres',          // kendi kullanıcı adın
  password: 'beste123',  // kendi şifren
  database: 'test',
});

// Genel query helper
async function query(text, params) {
  return pool.query(text, params);
}

async function queryOne(text, params) {
  const { rows } = await pool.query(text, params);
  return rows[0] || null;
}

/* ------------------------------------------------------------------ */
/*  KULLANICI İŞLEMLERİ                                               */
/* ------------------------------------------------------------------ */

// Uygulama ilk açıldığında default admin + demo user oluştur
async function ensureDefaultUsers() {
  // admin
  let admin = await queryOne('SELECT * FROM users WHERE username = $1', ['admin']);
  if (!admin) {
    const { rows } = await query(
      `INSERT INTO users (username, password, role)
       VALUES ($1, $2, $3)
       RETURNING *`,
      ['admin', 'admin123', 'admin']
    );
    admin = rows[0];
    console.log('👑 Admin kullanıcı oluşturuldu: admin / admin123');
  }

  // demo öğrenci (id=1 olması şart değil ama eskiden kullandığımız için dursun)
  let demo = await queryOne('SELECT * FROM users WHERE username = $1', ['demo_ogrenci']);
  if (!demo) {
    const { rows } = await query(
      `INSERT INTO users (username, password, role)
       VALUES ($1, $2, $3)
       RETURNING *`,
      ['demo_ogrenci', '123456', 'user']
    );
    demo = rows[0];
    console.log('🧪 Demo kullanıcı oluşturuldu: demo_ogrenci / 123456');
  }

  return { admin, demo };
}

// username ile kullanıcı bul
async function findUserByUsername(username) {
  return queryOne('SELECT * FROM users WHERE username = $1', [username]);
}

// login için kullanıcı bul (username + password)
async function findUserByCredentials(username, password) {
  return queryOne(
    'SELECT * FROM users WHERE username = $1 AND password = $2',
    [username, password]
  );
}

// yeni kullanıcı oluştur (register)
async function createUser({ username, password, role = 'user' }) {
  const { rows } = await query(
    `INSERT INTO users (username, password, role)
     VALUES ($1, $2, $3)
     RETURNING *`,
    [username, password, role]
  );
  return rows[0];
}

// tüm kullanıcıları getir (admin paneli için)
async function getAllUsers() {
  const { rows } = await query(
    `SELECT id, username, role, created_at
     FROM users
     ORDER BY created_at DESC`
  );
  return rows;
}

/* ------------------------------------------------------------------ */
/*  TEST SONUÇLARI                                                    */
/* ------------------------------------------------------------------ */

async function addTestResult(userId, payload) {
  const sql = `
    INSERT INTO test_results (
      user_id,
      test_name,
      score,
      hits,
      misses,
      false_alarms,
      extra
    ) VALUES ($1,$2,$3,$4,$5,$6,$7)
    RETURNING *;
  `;

  const params = [
    userId,
    payload.testName,
    payload.score,
    payload.hits ?? null,
    payload.misses ?? null,
    payload.falseAlarms ?? null,
    payload.extra ?? null,
  ];

  const { rows } = await query(sql, params);
  return rows[0];
}

async function getResultsByUser(userId) {
  const sql = `
    SELECT
      id,
      user_id,
      test_name,
      score,
      hits,
      misses,
      false_alarms,
      extra,
      created_at
    FROM test_results
    WHERE user_id = $1
    ORDER BY created_at DESC;
  `;
  const { rows } = await query(sql, [userId]);
  return rows;
}

// admin için: tüm sonuçlar + kullanıcı adı
async function getAllResultsWithUser() {
  const sql = `
    SELECT
      tr.*,
      u.username
    FROM test_results tr
    JOIN users u ON u.id = tr.user_id
    ORDER BY tr.created_at DESC;
  `;
  const { rows } = await query(sql);
  return rows;
}

module.exports = {
  // auth
  ensureDefaultUsers,
  findUserByUsername,
  findUserByCredentials,
  createUser,
  getAllUsers,
  // tests
  addTestResult,
  getResultsByUser,
  getAllResultsWithUser,
};
