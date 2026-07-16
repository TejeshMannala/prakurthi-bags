const express = require('express');
const router = express.Router();
const { getReturnPolicy, getExchangePolicy } = require('../controllers/policyController');

router.get('/return', getReturnPolicy);
router.get('/exchange', getExchangePolicy);

module.exports = router;
