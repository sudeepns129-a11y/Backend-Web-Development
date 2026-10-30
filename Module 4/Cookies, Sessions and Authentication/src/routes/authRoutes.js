const express = require('express');
const authController = require('../controllers/authController');

const router = express.Router();

router.post('/register', authController.register);
router.post('/login', authController.login);

router.get('/me', async (req, res, next) => {
  res.status(501).json({ error: { code: 'NOT_IMPLEMENTED', message: 'Not implemented' } });
});

router.post('/logout', async (req, res, next) => {
  res.status(501).json({ error: { code: 'NOT_IMPLEMENTED', message: 'Not implemented' } });
});

module.exports = router;
