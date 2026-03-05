const router = require('express').Router();
const auth   = require('../middleware/auth.middleware');
const pool   = require('../db/pool');

router.get('/summary', auth, async function(req, res) {
  const now   = new Date();
  const month = req.query.month || now.getMonth() + 1;
  const year  = req.query.year  || now.getFullYear();
  const uid   = req.user.id;

  try {
    const [kpi, byCategory, monthly, recentTx, allTime, daily30] = await Promise.all([
      pool.query(`
        SELECT
          COALESCE(SUM(CASE WHEN type='income'  THEN amount ELSE 0    END), 0) AS total_income,
          COALESCE(SUM(CASE WHEN type='expense' THEN amount ELSE 0    END), 0) AS total_expenses,
          COALESCE(SUM(CASE WHEN type='income'  THEN amount ELSE -amount END), 0) AS balance
        FROM expenses
        WHERE user_id = $1
          AND EXTRACT(MONTH FROM date) = $2
          AND EXTRACT(YEAR  FROM date) = $3
      `, [uid, month, year]),

      pool.query(`
        SELECT c.name, c.icon, c.color, SUM(e.amount)::numeric AS total
        FROM expenses e
        JOIN categories c ON c.id = e.category_id
        WHERE e.user_id = $1
          AND e.type = 'expense'
          AND EXTRACT(MONTH FROM e.date) = $2
          AND EXTRACT(YEAR  FROM e.date) = $3
        GROUP BY c.id
        ORDER BY total DESC
        LIMIT 6
      `, [uid, month, year]),

      pool.query(`
        SELECT
          TO_CHAR(date, 'YYYY-MM') AS period,
          SUM(CASE WHEN type='income'  THEN amount ELSE 0 END)::numeric AS income,
          SUM(CASE WHEN type='expense' THEN amount ELSE 0 END)::numeric AS expenses
        FROM expenses
        WHERE user_id = $1
          AND date >= NOW() - INTERVAL '7 months'
        GROUP BY period
        ORDER BY period ASC
      `, [uid]),

      pool.query(`
        SELECT e.*, c.name AS category_name, c.icon AS category_icon, c.color AS category_color
        FROM expenses e
        LEFT JOIN categories c ON c.id = e.category_id
        WHERE e.user_id = $1
        ORDER BY e.date DESC, e.created_at DESC
        LIMIT 5
      `, [uid]),

      pool.query(`
        SELECT COALESCE(SUM(CASE WHEN type='income' THEN amount ELSE -amount END), 0)::numeric AS total_balance
        FROM expenses
        WHERE user_id = $1
      `, [uid]),

      pool.query(`
        SELECT
          TO_CHAR(d.day, 'YYYY-MM-DD') AS day,
          COALESCE(SUM(CASE WHEN e.type='income'  THEN e.amount ELSE 0 END), 0)::numeric AS income,
          COALESCE(SUM(CASE WHEN e.type='expense' THEN e.amount ELSE 0 END), 0)::numeric AS expenses
        FROM generate_series(
          CURRENT_DATE - INTERVAL '29 days',
          CURRENT_DATE,
          INTERVAL '1 day'
        ) AS d(day)
        LEFT JOIN expenses e ON e.date = d.day AND e.user_id = $1
        GROUP BY d.day
        ORDER BY d.day ASC
      `, [uid]),
    ]);

    res.json({
      kpi:                { ...kpi.rows[0], total_balance: allTime.rows[0].total_balance },
      byCategory:         byCategory.rows,
      monthly:            monthly.rows,
      daily30:            daily30.rows,
      recentTransactions: recentTx.rows,
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;