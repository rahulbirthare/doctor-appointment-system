const express = require('express');
const { register, login, doctorLogin } = require('../controllers/authController');
const router = express.Router();

router.post('/signup', register);
router.post('/login', login);
router.post('/doctor-login', doctorLogin);

module.exports = router;
