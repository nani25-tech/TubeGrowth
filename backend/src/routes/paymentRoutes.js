import express from 'express';
import Razorpay from 'razorpay';
import crypto from 'crypto';

const router = express.Router();

function getRazorpayClient() {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;

  if (!keyId || !keySecret) {
    throw new Error('Razorpay keys are not configured');
  }

  return new Razorpay({
    key_id: keyId,
    key_secret: keySecret,
  });
}

// Create an order
router.post('/create-order', async (req, res) => {
  try {
    console.log('POST /api/payments/create-order called, body=', req.body);
    const rawAmount = Number(req.body?.amountINR ?? req.body?.amount ?? 0);
    if (isNaN(rawAmount) || rawAmount <= 0) {
      return res.status(400).json({ success: false, message: 'Amount is required (in INR)' });
    }

    const amount = Math.round(rawAmount * 100);
    const currency = req.body?.currency || 'INR';
    const receipt = req.body?.receipt;

    const options = {
      amount,
      currency,
      receipt: receipt || `rcpt_${Date.now()}`,
      payment_capture: 1,
    };

    const razorpay = getRazorpayClient();
    const order = await razorpay.orders.create(options);
    res.json({
      success: true,
      keyId: process.env.RAZORPAY_KEY_ID,
      order,
    });
  } catch (err) {
    console.error('create-order error', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Diagnostic ping to verify router is mounted
router.get('/ping', (req, res) => {
  res.json({ ok: true, route: '/api/payments/ping' });
});

// Verify payment signature (called by frontend after payment)
router.post('/verify', (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({ success: false, message: 'Missing fields' });
    }

    const body = `${razorpay_order_id}|${razorpay_payment_id}`;
    const expected = crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET).update(body).digest('hex');

    if (expected !== razorpay_signature) {
      return res.status(400).json({ success: false, message: 'Invalid signature' });
    }

    // TODO: persist payment, update user credits or order status

    res.json({ success: true });
  } catch (err) {
    console.error('verify error', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Webhook handler (use express.raw when registering this route in app.js)
export const paymentWebhookHandler = (req, res) => {
  try {
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
    const signature = req.headers['x-razorpay-signature'];
    const expected = crypto.createHmac('sha256', secret).update(req.body).digest('hex');
    if (signature !== expected) {
      console.warn('Invalid webhook signature');
      return res.status(400).send('invalid signature');
    }

    const payload = JSON.parse(req.body.toString());
    // handle events e.g., payment.captured
    console.log('webhook event:', payload.event);

    // TODO: process event and persist

    res.status(200).send('ok');
  } catch (err) {
    console.error('webhook error', err);
    res.status(500).send('error');
  }
};

export default router;
