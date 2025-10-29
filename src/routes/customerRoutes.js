const express = require('express');
const router = express.Router();

const {
    getCustomers,
    getCustomer,
    getCustomerByName,
    createCustomerHandler,
    updateCustomerHandler,
    markCustomer,
    removeCustomer
} = require('../controllers/customerController');

// Open endpoints similar to orders (no auth enforced here)
router.get('/', getCustomers);
router.get('/by-username/:username', getCustomerByName);
router.get('/:id', getCustomer);
router.post('/', createCustomerHandler);
router.put('/:id', updateCustomerHandler);
router.patch('/:id/mark', markCustomer);
router.delete('/:id', removeCustomer);

module.exports = router;


