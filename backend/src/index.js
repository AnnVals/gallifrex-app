require('dotenv').config();

const express = require('express');
const cors    = require('cors');
const helmet  = require('helmet');
const morgan  = require('morgan');

const authRoutes      = require('./routes/auth.routes');
const expenseRoutes   = require('./routes/expense.routes');
const categoryRoutes  = require('./routes/category.routes');
const budgetRoutes    = require('./routes/budget.routes');
const dashboardRoutes = require('./routes/dashboard.routes');

const app = express();

app.use(helmet());
app.use(cors({
  origin:      process.env.FRONTEND_URL || 'http://localhost:4200',
  credentials: true,
}));
app.use(morgan('dev'));
app.use(express.json());

app.use('/api/auth',       authRoutes);
app.use('/api/expenses',   expenseRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/budgets',    budgetRoutes);
app.use('/api/dashboard',  dashboardRoutes);

app.get('/api/health', function(req, res) {
  res.json({ status: 'ok', time: new Date() });
});

app.use(function(err, req, res, next) {
  console.error(err.stack);

  const status  = err.status || 500;
  const message = err.message || 'Internal Server Error';

  res.status(status).json({ error: message });
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, function() {
  console.log('Finance API → http://localhost:' + PORT);
});