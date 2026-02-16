const jwt = require('jsonwebtoken');
const User = require('../models/User');

const register = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      return res.status(400).json({ error: 'Email already registered.' });
    }

    const user = await User.create({ email: email.toLowerCase(), password });
    const token = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET || 'hirerank-secret',
      { expiresIn: '7d' }
    );

    res.status(201).json({
      user: { id: user._id, email: user.email },
      token,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    const user = await User.findOne({ email: email.toLowerCase() }).select('+password');
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials.' });
    }

    const valid = await user.comparePassword(password);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid credentials.' });
    }

    const token = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET || 'hirerank-secret',
      { expiresIn: '7d' }
    );

    res.json({
      user: { id: user._id, email: user.email },
      token,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const me = async (req, res) => {
  try {
    res.json({ user: req.user });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = { register, login, me };
