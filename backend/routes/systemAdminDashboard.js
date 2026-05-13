const express = require('express');
const path = require('path');
const { authenticateSystemAdmin, authorizeSystemAdmin } = require('../modules/systemAdmin/auth/middleware');

const router = express.Router();

// Redirect base system-admin path to login page
router.get('/', (req, res) => {
  res.redirect('/system-admin/login');
});

// Serve the login page (unprotected)
router.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/system-admin/login.html'));
});

// Serve the main dashboard HTML page and any dashboard sub-route for SPA navigation
router.get(/^\/dashboard(?:\/.*)?$/, (req, res) => {
  res.sendFile(path.join(__dirname, '../public/system-admin/index.html'));
});

// Serve static assets (CSS, JS) - no auth needed as they are public
router.use('/css', express.static(path.join(__dirname, '../public/system-admin/css')));
router.use('/js', express.static(path.join(__dirname, '../public/system-admin/js')));

module.exports = router;