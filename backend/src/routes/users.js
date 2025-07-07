const express = require('express');
const bcrypt = require('bcryptjs');
const auth = require('../middleware/auth');
const { checkRole } = require('../middleware/rbac');
const User = require('../models/User');

const router = express.Router();

// GET /api/users - Get all users (Super Admin only)
router.get('/', auth, checkRole(['SuperAdmin']), async (req, res) => {
  try {
    const { page = 1, limit = 10, role, departmentId } = req.query;
    
    let query = {};
    if (role) query.role = role;
    if (departmentId) query.departmentId = departmentId;
    
    const skip = (page - 1) * limit;
    
    const [users, total] = await Promise.all([
      User.find(query)
        .populate('departmentId', 'name')
        .select('-password')
        .skip(skip)
        .limit(parseInt(limit))
        .sort({ createdAt: -1 }),
      User.countDocuments(query)
    ]);
    
    res.json({
      data: users,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// GET /api/users/:id - Get single user
router.get('/:id', auth, checkRole(['SuperAdmin']), async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .populate('departmentId', 'name')
      .select('-password');
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    res.json({ data: user });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// POST /api/users - Create new user
router.post('/', auth, checkRole(['SuperAdmin']), async (req, res) => {
  try {
    const { username, password, role, departmentId } = req.body;
    
    // Validate required fields
    if (!username || !password || !role) {
      return res.status(400).json({ message: 'Username, password, and role are required' });
    }
    
    if (role === 'DepartmentManager' && !departmentId) {
      return res.status(400).json({ message: 'Department is required for Department Manager' });
    }
    
    // Check if username already exists
    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res.status(400).json({ message: 'Username already exists' });
    }
    
    const user = new User({
      username,
      password,
      role,
      departmentId: role === 'DepartmentManager' ? departmentId : undefined
    });
    
    await user.save();
    await user.populate('departmentId', 'name');
    
    // Don't return password
    const userResponse = user.toObject();
    delete userResponse.password;
    
    res.status(201).json({ data: userResponse });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// PUT /api/users/:id - Update user
router.put('/:id', auth, checkRole(['SuperAdmin']), async (req, res) => {
  try {
    const { password, ...updateData } = req.body;
    
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Update user data
    Object.assign(user, updateData);
    
    // Update password if provided
    if (password) {
      user.password = password; // Will be hashed by pre-save middleware
    }
    
    await user.save();
    await user.populate('departmentId', 'name');
    
    // Don't return password
    const userResponse = user.toObject();
    delete userResponse.password;
    
    res.json({ data: userResponse });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// DELETE /api/users/:id - Delete user
router.delete('/:id', auth, checkRole(['SuperAdmin']), async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Prevent deleting yourself
    if (user._id.toString() === req.user._id.toString()) {
      return res.status(400).json({ message: 'Cannot delete your own account' });
    }
    
    await User.findByIdAndDelete(req.params.id);
    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;