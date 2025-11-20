const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const userRoutes = require('./src/routes/userRoutes');
const ipdRoutes = require('./src/routes/ipdRoutes');
const financeRoutes = require('./src/routes/financeRoutes');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/users', userRoutes);
app.use('/api/ipd', ipdRoutes);
app.use('/api/finance', financeRoutes);

// Database connection
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
