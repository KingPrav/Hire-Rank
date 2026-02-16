const express = require('express');
const router = express.Router();
const auth = require('../middlewares/auth');
const { createJob, getJobs, getJobById, getRank } = require('../controllers/jobController');

router.use(auth);

router.post('/', createJob);
router.get('/', getJobs);
router.get('/:id', getJobById);
router.get('/:id/rank', getRank);

module.exports = router;
