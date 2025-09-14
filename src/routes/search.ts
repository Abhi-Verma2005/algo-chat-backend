import express, { Router } from 'express';

const router: Router = express.Router();

// Basic search endpoint - placeholder for now
router.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Search functionality coming soon'
  });
});

export default router; 