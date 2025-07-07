const express = require('express');
const auth = require('../middleware/auth');
const { checkRole } = require('../middleware/rbac');
const Department = require('../models/Department');
const User = require('../models/User');
const Proxy = require('../models/Proxy');

const router = express.Router();

// GET /api/departments - Get all departments
router.get('/', auth, checkRole(['SuperAdmin']), async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const skip = (page - 1) * limit;
    
    const [departments, total] = await Promise.all([
      Department.find()
        .skip(skip)
        .limit(parseInt(limit))
        .sort({ createdAt: -1 }),
      Department.countDocuments()
    ]);
    
    // Add user and proxy counts
    const departmentsWithCounts = await Promise.all(
      departments.map(async (dept) => {
        const [userCount, proxyCount] = await Promise.all([
          User.countDocuments({ departmentId: dept._id }),
          Proxy.countDocuments({ departmentId: dept._id })
        ]);
        
        return {
          ...dept.toObject(),
          userCount,
          proxyCount
        };
      })
    );
    
    res.json({
      data: departmentsWithCounts,
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

// GET /api/departments/:id - Get single department
router.get('/:id', auth, checkRole(['SuperAdmin']), async (req, res) => {
  try {
    const department = await Department.findById(req.params.id);
    if (!department) {
      return res.status(404).json({ message: 'Department not found' });
    }
    
    // Get department statistics
    const [userCount, proxyCount, users, proxies] = await Promise.all([
      User.countDocuments({ departmentId: department._id }),
      Proxy.countDocuments({ departmentId: department._id }),
      User.find({ departmentId: department._id }).select('username role'),
      Proxy.find({ departmentId: department._id }).select('ipAddress port status')
    ]);
    
    res.json({
      data: {
        ...department.toObject(),
        userCount,
        proxyCount,
        users,
        proxies
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// POST /api/departments - Create new department
router.post('/', auth, checkRole(['SuperAdmin']), async (req, res) => {
  try {
    const { name, description } = req.body;
    
    if (!name) {
      return res.status(400).json({ message: 'Department name is required' });
    }
    
    // Check if department name already exists
    const existingDept = await Department.findOne({ name });
    if (existingDept) {
      return res.status(400).json({ message: 'Department name already exists' });
    }
    
    const department = new Department({ name, description });
    await department.save();
    
    res.status(201).json({ data: department });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// PUT /api/departments/:id - Update department
router.put('/:id', auth, checkRole(['SuperAdmin']), async (req, res) => {
  try {
    const department = await Department.findById(req.params.id);
    if (!department) {
      return res.status(404).json({ message: 'Department not found' });
    }
    
    // Check if new name conflicts with existing department
    if (req.body.name && req.body.name !== department.name) {
      const existingDept = await Department.findOne({ name: req.body.name });
      if (existingDept) {
        return res.status(400).json({ message: 'Department name already exists' });
      }
    }
    
    Object.assign(department, req.body);
    await department.save();
    
    res.json({ data: department });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// DELETE /api/departments/:id - Delete department
router.delete('/:id', auth, checkRole(['SuperAdmin']), async (req, res) => {
  try {
    const department = await Department.findById(req.params.id);
    if (!department) {
      return res.status(404).json({ message: 'Department not found' });
    }
    
    // Check if department has users or proxies
    const [userCount, proxyCount] = await Promise.all([
      User.countDocuments({ departmentId: department._id }),
      Proxy.countDocuments({ departmentId: department._id })
    ]);
    
    if (userCount > 0 || proxyCount > 0) {
      return res.status(400).json({ 
        message: `Cannot delete department. It has ${userCount} users and ${proxyCount} proxies assigned.`
      });
    }
    
    await Department.findByIdAndDelete(req.params.id);
    res.json({ message: 'Department deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;