const cron = require('node-cron');
const { checkExpiringProxies } = require('../controllers/proxyController');

// Run every day at 9 AM
const startCronJobs = () => {
  cron.schedule('0 9 * * *', async () => {
    console.log('Running daily proxy expiration check...');
    try {
      await checkExpiringProxies();
    } catch (error) {
      console.error('Error in proxy expiration check:', error);
    }
  });
  
  console.log('Cron jobs started');
};

module.exports = { startCronJobs };