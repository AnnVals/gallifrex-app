const router = require('express').Router();
const auth   = require('../middleware/auth.middleware');
const pool   = require('../db/pool');

router.get('/', auth, async function(req, res) {
  const now   = new Date();
  const month = req.query.month || now.getMonth() + 1;
  const year  = req.query.year  || now.getFullYear();

  try {
    const { rows } = await pool.query(`
      SELECT
        b.*,
        c.name AS category_name,
        c.icon,
        c.color,
        COALESCE(SUM(e.amount), 0) AS spent
      FROM budgets b
      JOIN categories c ON c.id = b.category_id
      LEFT JOIN expenses e
        ON  e.category_id = b.category_id
        AND e.user_id     = b.user_id
        AND e.type        = 'expense'
        AND EXTRACT(MONTH FROM e.date) = b.month
        AND EXTRACT(YEAR  FROM e.date) = b.year
      WHERE b.user_id = $1
        AND b.month   = $2
        AND b.year    = $3
      GROUP BY b.id, c.name, c.icon, c.color
      ORDER BY c.name
    `, [req.user.id, month, year]);

    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/', auth, async function(req, res) {
  const now         = new Date();
  const category_id = req.body.category_id;
  const amount      = req.body.amount;
  const month       = req.body.month || now.getMonth() + 1;
  const year        = req.body.year  || now.getFullYear();

  if (!category_id || !amount) {
    return res.status(400).json({ error: 'category_id y amount son requeridos' });
  }

  try {
    const { rows } = await pool.query(`
      INSERT INTO budgets(user_id, category_id, amount, month, year)
      VALUES($1, $2, $3, $4, $5)
      ON CONFLICT(user_id, category_id, month, year)
      DO UPDATE SET amount = EXCLUDED.amount
      RETURNING *
    `, [req.user.id, category_id, amount, month, year]);

    res.status(201).json(rows[0]);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.delete('/:id', auth, async function(req, res) {
  try {
    const { rowCount } = await pool.query(
      'DELETE FROM budgets WHERE id = $1 AND user_id = $2',
      [req.params.id, req.user.id],
    );

    if (!rowCount) {
      return res.status(404).json({ error: 'Not found' });
    }

    res.json({ message: 'Eliminado' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;