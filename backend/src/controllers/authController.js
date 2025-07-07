const jwt = require('jsonwebtoken');
const User = require('../models/User');
const AuditLog = require('../models/AuditLog');

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE,
  });
};

const login = async (req, res) => {
  try {
    const { username, password } = req.body;

    // Validate input
    if (!username || !password) {
      return res.status(400).json({ message: 'Please provide username and password' });
    }

    // Check if user exists
    const user = await User.findOne({ username }).populate('departmentId');
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Generate token
    const token = generateToken(user._id);

    // Log the login
    await AuditLog.create({
      userId: user._id,
      username: user.username,
      action: 'LOGIN',
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    res.json({
      token,
      user: {
        id: user._id,
        username: user.username,
        role: user.role,
        departmentId: user.departmentId?._id,
        departmentName: user.departmentId?.name
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const logout = async (req, res) => {
  try {
    // Log the logout
    await AuditLog.create({
      userId: req.user._id,
      username: req.user.username,
      action: 'LOGOUT',
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { login, logout };