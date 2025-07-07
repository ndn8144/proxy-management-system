const Proxy = require('../models/Proxy');
const Department = require('../models/Department');

// Auto-assign proxy to department based on rules
const autoAssignProxy = async (proxy) => {
  // Example rules - you can make this more sophisticated
  const rules = [
    {
      condition: (p) => p.location && p.location.includes('Germany') && p.protocol === 'SOCKS5',
      departmentName: 'Sales'
    },
    {
      condition: (p) => p.protocol === 'HTTP' && p.speed > 100,
      departmentName: 'Marketing'
    }
  ];
  
  for (const rule of rules) {
    if (rule.condition(proxy)) {
      const department = await Department.findOne({ name: rule.departmentName });
      if (department) {
        return department._id;
      }
    }
  }
  
  return null;
};

// Check for expiring proxies (can be used in a cron job)
const checkExpiringProxies = async () => {
  const sevenDaysFromNow = new Date();
  sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);
  
  const expiringProxies = await Proxy.find({
    expirationDate: { $lte: sevenDaysFromNow },
    status: 'Active'
  }).populate('departmentId', 'name');
  
  // Here you would send notifications to department managers
  // For now, just log them
  console.log(`Found ${expiringProxies.length} expiring proxies:`, 
    expiringProxies.map(p => `${p.ipAddress}:${p.port} (expires: ${p.expirationDate})`));
  
  return expiringProxies;
};

module.exports = {
  autoAssignProxy,
  checkExpiringProxies
};