const mongoose = require('mongoose');

const proxySchema = new mongoose.Schema({
  ipAddress: {
    type: String,
    required: true,
    trim: true
  },
  port: {
    type: Number,
    required: true,
    min: 1,
    max: 65535
  },
  protocol: {
    type: String,
    enum: ['HTTP', 'HTTPS', 'SOCKS4', 'SOCKS5'],
    required: true
  },
  username: {
    type: String,
    trim: true
  },
  password: {
    type: String,
    trim: true
  },
  location: {
    type: String,
    trim: true
  },
  speed: {
    type: Number,
    min: 0
  },
  status: {
    type: String,
    enum: ['Active', 'Inactive', 'Banned'],
    default: 'Active'
  },
  departmentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Department',
    required: true
  },
  expirationDate: {
    type: Date
  }
}, {
  timestamps: true
});

// Compound index for IP and Port (unique combination)
proxySchema.index({ ipAddress: 1, port: 1 }, { unique: true });

module.exports = mongoose.model('Proxy', proxySchema);