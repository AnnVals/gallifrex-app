const router = require('express').Router();
const auth   = require('../middleware/auth.middleware');
const pool   = require('../db/pool');

router.get('/', auth, async function(req, res) {
  try {
    const type   = req.query.type;
    const params = [req.user.id];

    let sql = 'SELECT * FROM categories WHERE user_id = $1';

    if (type) {
      sql += ' AND type = $2';
      params.push(type);
    }

    sql += ' ORDER BY is_default DESC, name ASC';

    const { rows } = await pool.query(sql, params);
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/', auth, async function(req, res) {
  const name  = req.body.name;
  const icon  = req.body.icon  || '📁';
  const color = req.body.color || '#7c6cf8';
  const type  = req.body.type  || 'expense';

  if (!name) {
    return res.status(400).json({ error: 'Name is required' });
  }

  try {
    const { rows } = await pool.query(
      'INSERT INTO categories(user_id, name, icon, color, type) VALUES($1, $2, $3, $4, $5) RETURNING *',
      [req.user.id, name, icon, color, type],
    );
    res.status(201).json(rows[0]);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.put('/:id', auth, async function(req, res) {
  const name  = req.body.name;
  const icon  = req.body.icon;
  const color = req.body.color;
  const type  = req.body.type;

  try {
    const { rows } = await pool.query(
      `UPDATE categories
       SET name  = COALESCE($1, name),
           icon  = COALESCE($2, icon),
           color = COALESCE($3, color),
           type  = COALESCE($4, type)
       WHERE id = $5 AND user_id = $6
       RETURNING *`,
      [name, icon, color, type, req.params.id, req.user.id],
    );

    if (!rows[0]) {
      return res.status(404).json({ error: 'Not found' });
    }

    res.json(rows[0]);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.delete('/:id', auth, async function(req, res) {
  try {
    const { rowCount } = await pool.query(
      'DELETE FROM categories WHERE id = $1 AND user_id = $2 AND is_default = false',
      [req.params.id, req.user.id],
    );

    if (!rowCount) {
      return res.status(400).json({ error: 'No se pueden borrar categorías por defecto' });
    }

    res.json({ message: 'Eliminada' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;