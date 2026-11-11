// employee 관련 경로를 묶어 관리한다.

const express = require('express');
const router = express.Router();

const employeeController = require('../controllers/employeeController');

router.get('/', employeeController.getAllEmployees);

module.exports = router;