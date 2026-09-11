import { Router, Request, Response } from 'express';
import { dbStore } from '../data/dbStore';

const router = Router();

// GET all orders
router.get('/', (req: Request, res: Response) => {
  try {
    const orders = dbStore.getOrders();
    res.json(orders);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
});

// POST new order (checkout from website)
router.post('/', (req: Request, res: Response) => {
  try {
    const order = dbStore.createOrder(req.body);
    res.status(201).json(order);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create order' });
  }
});

// PATCH or PUT order status (Accept/Reject or Status Update)
const updateStatusHandler = (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);
    const { status } = req.body;
    const updated = dbStore.updateOrderStatus(id, status);
    if (!updated) return res.status(404).json({ error: 'Order not found' });
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update order status' });
  }
};

router.patch('/:id/status', updateStatusHandler);
router.put('/:id/status', updateStatusHandler);

export default router;
