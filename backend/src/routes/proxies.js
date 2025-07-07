const express = require('express');
const auth = require('../middleware/auth');
const { checkRole, checkDepartmentAccess } = require('../middleware/rbac');
const Proxy = require('../models/Proxy');
const AuditLog = require('../models/AuditLog');

const router = express.Router();

// GET /api/proxies - Get all proxies with filtering
router.get('/', auth, async (req, res) => {
  try {
    const { page = 1, limit = 10, status, protocol, departmentId, location } = req.query;
    
    // Build query object
    let query = {};
    
    // Department access control
    if (req.user.role === 'DepartmentManager') {
      query.departmentId = req.user.departmentId;
    } else if (departmentId) {
      query.departmentId = departmentId;
    }
    
    // Apply filters
    if (status) query.status = status;
    if (protocol) query.protocol = protocol;
    if (location) query.location = new RegExp(location, 'i');
    
    const skip = (page - 1) * limit;
    
    const [proxies, total] = await Promise.all([
      Proxy.find(query)
        .populate('departmentId', 'name')
        .select('-password') // Don't return password field
        .skip(skip)
        .limit(parseInt(limit))
        .sort({ createdAt: -1 }),
      Proxy.countDocuments(query)
    ]);
    
    res.json({
      data: proxies,
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

// GET /api/proxies/:id - Get single proxy
router.get('/:id', auth, checkDepartmentAccess, async (req, res) => {
  try {
    const proxy = await Proxy.findById(req.params.id)
      .populate('departmentId', 'name')
      .select('-password');
    
    if (!proxy) {
      return res.status(404).json({ message: 'Proxy not found' });
    }
    
    res.json({ data: proxy });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// POST /api/proxies - Create new proxy
router.post('/', auth, async (req, res) => {
  try {
    const proxyData = { ...req.body };
    
    // Set department for Department Managers
    if (req.user.role === 'DepartmentManager') {
      proxyData.departmentId = req.user.departmentId;
    }
    
    // Validate required fields
    if (!proxyData.departmentId) {
      return res.status(400).json({ message: 'Department is required' });
    }
    
    const proxy = new Proxy(proxyData);
    await proxy.save();
    
    // Log the action
    await AuditLog.create({
      userId: req.user._id,
      username: req.user.username,
      action: 'CREATE_PROXY',
      targetId: proxy._id,
      details: { after: proxy.toObject() },
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });
    
    await proxy.populate('departmentId', 'name');
    res.status(201).json({ data: proxy });
  } catch (error) {
    if (error.code === 11000) {
      res.status(400).json({ message: 'Proxy with this IP and port already exists' });
    } else {
      res.status(400).json({ message: error.message });
    }
  }
});

// PUT /api/proxies/:id - Update proxy
router.put('/:id', auth, checkDepartmentAccess, async (req, res) => {
  try {
    const proxy = await Proxy.findById(req.params.id);
    if (!proxy) {
      return res.status(404).json({ message: 'Proxy not found' });
    }
    
    const oldProxy = proxy.toObject();
    
    // Update proxy
    Object.assign(proxy, req.body);
    await proxy.save();
    
    // Log the action
    await AuditLog.create({
      userId: req.user._id,
      username: req.user.username,
      action: 'UPDATE_PROXY',
      targetId: proxy._id,
      details: { 
        before: oldProxy,
        after: proxy.toObject()
      },
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });
    
    await proxy.populate('departmentId', 'name');
    res.json({ data: proxy });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// DELETE /api/proxies/:id - Delete proxy
router.delete('/:id', auth, checkDepartmentAccess, async (req, res) => {
  try {
    const proxy = await Proxy.findById(req.params.id);
    if (!proxy) {
      return res.status(404).json({ message: 'Proxy not found' });
    }
    
    const deletedProxy = proxy.toObject();
    await Proxy.findByIdAndDelete(req.params.id);
    
    // Log the action
    await AuditLog.create({
      userId: req.user._id,
      username: req.user.username,
      action: 'DELETE_PROXY',
      targetId: req.params.id,
      details: { before: deletedProxy },
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });
    
    res.json({ message: 'Proxy deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// GET /api/proxies/export - Export proxies to CSV
router.get('/export', auth, async (req, res) => {
  try {
    let query = {};
    
    // Apply department filter for Department Managers
    if (req.user.role === 'DepartmentManager') {
      query.departmentId = req.user.departmentId;
    }
    
    const proxies = await Proxy.find(query)
      .populate('departmentId', 'name')
      .select('-password');
    
    // Convert to CSV format
    const csvHeader = 'IP Address,Port,Protocol,Location,Speed,Status,Department,Created At\n';
    const csvData = proxies.map(proxy => 
      `${proxy.ipAddress},${proxy.port},${proxy.protocol},${proxy.location || ''},${proxy.speed || ''},${proxy.status},${proxy.departmentId?.name || ''},${proxy.createdAt}`
    ).join('\n');
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="proxies.csv"');
    res.send(csvHeader + csvData);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;