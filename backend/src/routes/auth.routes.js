const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt    = require('jsonwebtoken');
const pool   = require('../db/pool');
const auth   = require('../middleware/auth.middleware');

const { body, validationResult } = require('express-validator');

const DEFAULT_CATEGORIES = [
  { name: 'Alimentación',  icon: '🛒', color: '#7c6cf8', type: 'expense' },
  { name: 'Transporte',    icon: '🚗', color: '#12c2e9', type: 'expense' },
  { name: 'Hogar',         icon: '🏠', color: '#f857a6', type: 'expense' },
  { name: 'Ocio',          icon: '🎉', color: '#0de7a8', type: 'expense' },
  { name: 'Salud',         icon: '💊', color: '#ffd166', type: 'expense' },
  { name: 'Ropa',          icon: '👗', color: '#ef476f', type: 'expense' },
  { name: 'Suscripciones', icon: '📱', color: '#7c6cf8', type: 'expense' },
  { name: 'Restaurantes',  icon: '🍽️', color: '#f857a6', type: 'expense' },
  { name: 'Nómina',        icon: '💼', color: '#0de7a8', type: 'income'  },
  { name: 'Inversiones',   icon: '📈', color: '#12c2e9', type: 'income'  },
  { name: 'Otros',         icon: '📁', color: '#aaaaaa', type: 'expense' },
];

router.post('/register',
  body('email').isEmail(),
  body('password').isLength({ min: 6 }),
  body('name').notEmpty(),
  async function(req, res) {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const name     = req.body.name;
    const email    = req.body.email;
    const password = req.body.password;
    const currency = req.body.currency || 'EUR';

    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      const exists = await client.query(
        'SELECT id FROM users WHERE email = $1',
        [email],
      );

      if (exists.rows.length) {
        return res.status(409).json({ error: 'Email ya registrado' });
      }

      const hash    = await bcrypt.hash(password, 12);
      const result  = await client.query(
        'INSERT INTO users(name, email, password, currency) VALUES($1, $2, $3, $4) RETURNING id, name, email, currency',
        [name, email, hash, currency],
      );
      const user = result.rows[0];

      for (const cat of DEFAULT_CATEGORIES) {
        await client.query(
          'INSERT INTO categories(user_id, name, icon, color, type, is_default) VALUES($1, $2, $3, $4, $5, true)',
          [user.id, cat.name, cat.icon, cat.color, cat.type],
        );
      }

      await client.query('COMMIT');

      const token = jwt.sign(
        { id: user.id, email: user.email },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN },
      );

      res.status(201).json({ token, user });
    } catch (err) {
      await client.query('ROLLBACK');
      res.status(500).json({ error: err.message });
    } finally {
      client.release();
    }
  },
);

router.post('/login',
  body('email').isEmail(),
  body('password').notEmpty(),
  async function(req, res) {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const email    = req.body.email;
    const password = req.body.password;

    try {
      const { rows } = await pool.query(
        'SELECT * FROM users WHERE email = $1',
        [email],
      );

      const user        = rows[0];
      const validPass   = user && await bcrypt.compare(password, user.password);

      if (!user || !validPass) {
        return res.status(401).json({ error: 'Credenciales incorrectas' });
      }

      const token = jwt.sign(
        { id: user.id, email: user.email },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN },
      );

      const safeUser = Object.assign({}, user);
      delete safeUser.password;

      res.json({ token, user: safeUser });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  },
);

router.get('/me', auth, async function(req, res) {
  const { rows } = await pool.query(
    'SELECT id, name, email, currency, created_at FROM users WHERE id = $1',
    [req.user.id],
  );
  res.json(rows[0]);
});

router.put('/profile', auth, async function(req, res) {
  const name     = req.body.name;
  const currency = req.body.currency;

  const { rows } = await pool.query(
    `UPDATE users
     SET name     = COALESCE($1, name),
         currency = COALESCE($2, currency)
     WHERE id = $3
     RETURNING id, name, email, currency`,
    [name, currency, req.user.id],
  );

  res.json(rows[0]);
});

module.exports = router;