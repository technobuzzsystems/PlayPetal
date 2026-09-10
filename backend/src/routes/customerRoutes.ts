import { Router, Request, Response } from 'express';
import fs from 'fs';
import path from 'path';

const router = Router();

const DATA_DIR = path.join(__dirname, '../../data');
const CUSTOMERS_FILE = path.join(DATA_DIR, 'customers.json');

// Ensure data dir exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Ensure customers file exists
if (!fs.existsSync(CUSTOMERS_FILE)) {
  fs.writeFileSync(CUSTOMERS_FILE, JSON.stringify([]));
}

const getCustomers = () => {
  try {
    const data = fs.readFileSync(CUSTOMERS_FILE, 'utf-8');
    return JSON.parse(data);
  } catch (err) {
    return [];
  }
};

const saveCustomers = (customers: any[]) => {
  fs.writeFileSync(CUSTOMERS_FILE, JSON.stringify(customers, null, 2));
};

// POST Register
router.post('/register', (req: Request, res: Response) => {
  try {
    const { name, email, password } = req.body;
    
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email, and password are required.' });
    }

    const customers = getCustomers();
    
    if (customers.find((c: any) => c.email.toLowerCase() === email.toLowerCase())) {
      return res.status(400).json({ error: 'Email is already registered.' });
    }

    const newCustomer = {
      id: `cst-${Date.now()}`,
      name,
      email: email.toLowerCase(),
      password, // Intentionally plain for this simple mock
      playPoints: 50, // bonus for signing up
      createdAt: new Date().toISOString()
    };

    customers.push(newCustomer);
    saveCustomers(customers);

    res.status(201).json({
      success: true,
      message: 'Account created successfully!',
      customer: { id: newCustomer.id, name: newCustomer.name, email: newCustomer.email, playPoints: newCustomer.playPoints }
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create account.' });
  }
});

// POST Login
router.post('/login', (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    const customers = getCustomers();
    const customer = customers.find((c: any) => c.email === email.toLowerCase() && c.password === password);

    if (!customer) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    res.json({
      success: true,
      message: 'Login successful!',
      customer: { id: customer.id, name: customer.name, email: customer.email, playPoints: customer.playPoints }
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to login.' });
  }
});

// GET all customers for Admin Panel
router.get('/', (req: Request, res: Response) => {
  try {
    res.json(getCustomers());
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch customers.' });
  }
});

export default router;
