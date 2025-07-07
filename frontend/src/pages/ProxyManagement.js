import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  TextField,
  Grid,
  MenuItem,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Alert,
  Chip,
  IconButton,
  Tooltip
} from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Download as DownloadIcon
} from '@mui/icons-material';
import api from '../services/api';

const ProxyManagement = () => {
  const [proxies, setProxies] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [editingProxy, setEditingProxy] = useState(null);
  const [filters, setFilters] = useState({
    status: '',
    protocol: '',
    departmentId: ''
  });
  const [proxyForm, setProxyForm] = useState({
    ipAddress: '',
    port: '',
    protocol: 'HTTP',
    username: '',
    password: '',
    location: '',
    speed: '',
    status: 'Active',
    departmentId: '',
    expirationDate: ''
  });
  const [error, setError] = useState('');

  const user = JSON.parse(localStorage.getItem('user') || '{}');

  useEffect(() => {
    fetchProxies();
    if (user.role === 'SuperAdmin') {
      fetchDepartments();
    }
  }, [filters]);

  const fetchProxies = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value) params.append(key, value);
      });
      
      const response = await api.get(`/proxies?${params}`);
      setProxies(response.data.data || []);
    } catch (error) {
      setError('Failed to fetch proxies');
    } finally {
      setLoading(false);
    }
  };

  const fetchDepartments = async () => {
    try {
      const response = await api.get('/departments');
      setDepartments(response.data.data || []);
    } catch (error) {
      console.error('Failed to fetch departments');
    }
  };

  const handleSubmit = async () => {
    try {
      if (editingProxy) {
        await api.put(`/proxies/${editingProxy._id}`, proxyForm);
      } else {
        await api.post('/proxies', proxyForm);
      }
      
      setOpen(false);
      setEditingProxy(null);
      resetForm();
      fetchProxies();
    } catch (error) {
      setError(error.response?.data?.message || 'Operation failed');
    }
  };

  const handleEdit = (proxy) => {
    setEditingProxy(proxy);
    setProxyForm({
      ...proxy,
      departmentId: proxy.departmentId._id || proxy.departmentId,
      expirationDate: proxy.expirationDate ? proxy.expirationDate.split('T')[0] : ''
    });
    setOpen(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this proxy?')) {
      try {
        await api.delete(`/proxies/${id}`);
        fetchProxies();
      } catch (error) {
        setError('Failed to delete proxy');
      }
    }
  };

  const resetForm = () => {
    setProxyForm({
      ipAddress: '',
      port: '',
      protocol: 'HTTP',
      username: '',
      password: '',
      location: '',
      speed: '',
      status: 'Active',
      departmentId: user.role === 'DepartmentManager' ? user.departmentId : '',
      expirationDate: ''
    });
  };

  const columns = [
    { field: 'ipAddress', headerName: 'IP Address', width: 130 },
    { field: 'port', headerName: 'Port', width: 80 },
    { field: 'protocol', headerName: 'Protocol', width: 100 },
    { field: 'location', headerName: 'Location', width: 150 },
    { field: 'speed', headerName: 'Speed (Mbps)', width: 120 },
    {
      field: 'status',
      headerName: 'Status',
      width: 100,
      renderCell: (params) => (
        <Chip
          label={params.value}
          color={
            params.value === 'Active' ? 'success' :
            params.value === 'Inactive' ? 'warning' : 'error'
          }
          size="small"
        />
      )
    },
    {
      field: 'departmentId',
      headerName: 'Department',
      width: 150,
      valueGetter: (params) => params.row.departmentId?.name || 'N/A'
    },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 150,
      renderCell: (params) => (
        <Box>
          <Tooltip title="Edit">
            <IconButton size="small" onClick={() => handleEdit(params.row)}>
              <EditIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="Delete">
            <IconButton 
              size="small" 
              color="error"
              onClick={() => handleDelete(params.row._id)}
            >
              <DeleteIcon />
            </IconButton>
          </Tooltip>
        </Box>
      )
    }
  ];

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Proxy Management
      </Typography>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {/* Filters */}
      <Paper sx={{ p: 2, mb: 2 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} sm={3}>
            <TextField
              select
              fullWidth
              label="Status"
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
            >
              <MenuItem value="">All</MenuItem>
              <MenuItem value="Active">Active</MenuItem>
              <MenuItem value="Inactive">Inactive</MenuItem>
              <MenuItem value="Banned">Banned</MenuItem>
            </TextField>
          </Grid>
          <Grid item xs={12} sm={3}>
            <TextField
              select
              fullWidth
              label="Protocol"
              value={filters.protocol}
              onChange={(e) => setFilters({ ...filters, protocol: e.target.value })}
            >
              <MenuItem value="">All</MenuItem>
              <MenuItem value="HTTP">HTTP</MenuItem>
              <MenuItem value="HTTPS">HTTPS</MenuItem>
              <MenuItem value="SOCKS4">SOCKS4</MenuItem>
              <MenuItem value="SOCKS5">SOCKS5</MenuItem>
            </TextField>
          </Grid>
          {user.role === 'SuperAdmin' && (
            <Grid item xs={12} sm={3}>
              <TextField
                select
                fullWidth
                label="Department"
                value={filters.departmentId}
                onChange={(e) => setFilters({ ...filters, departmentId: e.target.value })}
              >
                <MenuItem value="">All</MenuItem>
                {departments.map((dept) => (
                  <MenuItem key={dept._id} value={dept._id}>
                    {dept.name}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
          )}
          <Grid item xs={12} sm={3}>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => {
                resetForm();
                setOpen(true);
              }}
              sx={{ mr: 1 }}
            >
              Add Proxy
            </Button>
            <Button
              variant="outlined"
              startIcon={<DownloadIcon />}
              onClick={() => window.open(`${api.defaults.baseURL}/proxies/export`, '_blank')}
            >
              Export
            </Button>
          </Grid>
        </Grid>
      </Paper>

      {/* Data Grid */}
      <Paper sx={{ height: 600 }}>
        <DataGrid
          rows={proxies}
          columns={columns}
          pageSize={10}
          rowsPerPageOptions={[10, 25, 50]}
          loading={loading}
          getRowId={(row) => row._id}
          disableSelectionOnClick
        />
      </Paper>

      {/* Add/Edit Dialog */}
      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          {editingProxy ? 'Edit Proxy' : 'Add New Proxy'}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="IP Address"
                value={proxyForm.ipAddress}
                onChange={(e) => setProxyForm({ ...proxyForm, ipAddress: e.target.value })}
                required
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Port"
                type="number"
                value={proxyForm.port}
                onChange={(e) => setProxyForm({ ...proxyForm, port: e.target.value })}
                required
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                select
                fullWidth
                label="Protocol"
                value={proxyForm.protocol}
                onChange={(e) => setProxyForm({ ...proxyForm, protocol: e.target.value })}
                required
              >
                <MenuItem value="HTTP">HTTP</MenuItem>
                <MenuItem value="HTTPS">HTTPS</MenuItem>
                <MenuItem value="SOCKS4">SOCKS4</MenuItem>
                <MenuItem value="SOCKS5">SOCKS5</MenuItem>
              </TextField>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                select
                fullWidth
                label="Status"
                value={proxyForm.status}
                onChange={(e) => setProxyForm({ ...proxyForm, status: e.target.value })}
                required
              >
                <MenuItem value="Active">Active</MenuItem>
                <MenuItem value="Inactive">Inactive</MenuItem>
                <MenuItem value="Banned">Banned</MenuItem>
              </TextField>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Username"
                value={proxyForm.username}
                onChange={(e) => setProxyForm({ ...proxyForm, username: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Password"
                type="password"
                value={proxyForm.password}
                onChange={(e) => setProxyForm({ ...proxyForm, password: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Location"
                value={proxyForm.location}
                onChange={(e) => setProxyForm({ ...proxyForm, location: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Speed (Mbps)"
                type="number"
                value={proxyForm.speed}
                onChange={(e) => setProxyForm({ ...proxyForm, speed: e.target.value })}
              />
            </Grid>
            {user.role === 'SuperAdmin' && (
              <Grid item xs={12} sm={6}>
                <TextField
                  select
                  fullWidth
                  label="Department"
                  value={proxyForm.departmentId}
                  onChange={(e) => setProxyForm({ ...proxyForm, departmentId: e.target.value })}
                  required
                >
                  {departments.map((dept) => (
                    <MenuItem key={dept._id} value={dept._id}>
                      {dept.name}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
            )}
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Expiration Date"
                type="date"
                value={proxyForm.expirationDate}
                onChange={(e) => setProxyForm({ ...proxyForm, expirationDate: e.target.value })}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={handleSubmit} variant="contained">
            {editingProxy ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ProxyManagement;