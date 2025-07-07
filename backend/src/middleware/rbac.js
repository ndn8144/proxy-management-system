const checkRole = (roles) => {
    return (req, res, next) => {
      if (!req.user) {
        return res.status(401).json({ message: 'Authentication required' });
      }
  
      if (!roles.includes(req.user.role)) {
        return res.status(403).json({ message: 'Access denied' });
      }
  
      next();
    };
  };
  
  const checkDepartmentAccess = async (req, res, next) => {
    try {
      if (req.user.role === 'SuperAdmin') {
        return next();
      }
  
      // For department managers, check if they're accessing their own department's data
      const resourceId = req.params.id;
      if (resourceId) {
        const Proxy = require('../models/Proxy');
        const proxy = await Proxy.findById(resourceId);
        
        if (proxy && proxy.departmentId.toString() !== req.user.departmentId.toString()) {
          return res.status(403).json({ message: 'Access denied to this department resource' });
        }
      }
  
      next();
    } catch (error) {
      res.status(500).json({ message: 'Server error during access check' });
    }
  };
  
  module.exports = { checkRole, checkDepartmentAccess };