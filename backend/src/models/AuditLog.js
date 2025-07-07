const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  username: {
    type: String,
    required: true
  },
  action: {
    type: String,
    enum: ['CREATE_PROXY', 'UPDATE_PROXY', 'DELETE_PROXY', 'ASSIGN_PROXY', 'LOGIN', 'LOGOUT'],
    required: true
  },
  targetId: {
    type: mongoose.Schema.Types.ObjectId
  },
  details: {
    before: mongoose.Schema.Types.Mixed,
    after: mongoose.Schema.Types.Mixed
  },
  ipAddress: String,
  userAgent: String
}, {
  timestamps: true
});

module.exports = mongoose.model('AuditLog', auditLogSchema);