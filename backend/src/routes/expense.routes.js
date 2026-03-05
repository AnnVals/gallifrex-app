const router = require('express').Router();
const auth   = require('../middleware/auth.middleware');
const pool   = require('../db/pool');

const { body, validationResult } = require('express-validator');

const validate = [
  body('amount').isFloat({ min: 0.01 }),
  body('type').isIn(['expense', 'income']),
  body('date').isDate({ format: 'YYYY-MM-DD', strictMode: true }),
];

router.get('/', auth, async function(req, res) {
  const month       = req.query.month;
  const year        = req.query.year;
  const type        = req.query.type;
  const category_id = req.query.category_id;
  const search      = req.query.search;
  const limit       = req.query.limit  || 20;
  const offset      = req.query.offset || 0;

  const where  = ['e.user_id = $1'];
  const params = [req.user.id];
  let i = 2;

  if (month) {
    where.push('EXTRACT(MONTH FROM e.date) = $' + i);
    params.push(month);
    i++;
  }
  if (year) {
    where.push('EXTRACT(YEAR FROM e.date) = $' + i);
    params.push(year);
    i++;
  }
  if (type) {
    where.push('e.type = $' + i);
    params.push(type);
    i++;
  }
  if (category_id) {
    where.push('e.category_id = $' + i);
    params.push(category_id);
    i++;
  }
  if (search) {
    where.push('e.description ILIKE $' + i);
    params.push('%' + search + '%');
    i++;
  }

  const sql = `
    SELECT e.*, c.name AS category_name, c.icon AS category_icon, c.color AS category_color
    FROM expenses e
    LEFT JOIN categories c ON c.id = e.category_id
    WHERE ` + where.join(' AND ') + `
    ORDER BY e.date DESC, e.created_at DESC
    LIMIT $` + i + ` OFFSET $` + (i + 1);

  params.push(limit, offset);

  const countParams = params.slice(0, -2);
  const countSql    = 'SELECT COUNT(*) FROM expenses e WHERE ' + where.join(' AND ');

  try {
    const [data, count] = await Promise.all([
      pool.query(sql, params),
      pool.query(countSql, countParams),
    ]);

    res.json({
      data:   data.rows,
      total:  parseInt(count.rows[0].count),
      limit:  +limit,
      offset: +offset,
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get('/:id', auth, async function(req, res) {
  try {
    const { rows } = await pool.query(
      `SELECT e.*, c.name AS category_name, c.icon AS category_icon
       FROM expenses e
       LEFT JOIN categories c ON c.id = e.category_id
       WHERE e.id = $1 AND e.user_id = $2`,
      [req.params.id, req.user.id],
    );

    if (!rows[0]) {
      return res.status(404).json({ error: 'Not found' });
    }

    res.json(rows[0]);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/', auth, validate, async function(req, res) {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const amount      = req.body.amount;
  const description = req.body.description || null;
  const type        = req.body.type;
  const date        = req.body.date;
  const category_id = req.body.category_id || null;

  try {
    const { rows } = await pool.query(
      `INSERT INTO expenses(user_id, category_id, amount, description, type, date)
       VALUES($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [req.user.id, category_id, amount, description, type, date],
    );

    res.status(201).json(rows[0]);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.put('/:id', auth, validate, async function(req, res) {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const amount      = req.body.amount;
  const description = req.body.description || null;
  const type        = req.body.type;
  const date        = req.body.date;
  const category_id = req.body.category_id || null;

  try {
    const { rows } = await pool.query(
      `UPDATE expenses
       SET amount      = $1,
           description = $2,
           type        = $3,
           date        = $4,
           category_id = $5,
           updated_at  = NOW()
       WHERE id = $6 AND user_id = $7
       RETURNING *`,
      [amount, description, type, date, category_id, req.params.id, req.user.id],
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
      'DELETE FROM expenses WHERE id = $1 AND user_id = $2',
      [req.params.id, req.user.id],
    );

    if (!rowCount) {
      return res.status(404).json({ error: 'Not found' });
    }

    res.json({ message: 'Eliminado correctamente' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;