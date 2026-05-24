# Strict Credit Debit Validation

## How It Works

The system now ensures **EXACT** credit debits and credits - no more, no less.

### 1. Strict Integer Validation

All credit amounts must be:
- ✅ **Integer** (no decimals: 100 ✓, 100.5 ✗)
- ✅ **Positive** (> 0)
- ✅ **Safe integer** (JavaScript limit: 2^53 - 1)

**Code:**
```javascript
const validateCreditAmount = (amount, operationName) => {
  if (!Number.isInteger(amount)) {
    throw new Error(`Amount must be integer, got ${amount} (decimals not allowed)`);
  }
  if (amount <= 0) {
    throw new Error(`Amount must be positive, got ${amount}`);
  }
  if (!Number.isSafeInteger(amount)) {
    throw new Error(`Amount exceeds safe range: ${amount}`);
  }
};
```

### 2. Mathematical Verification

Every operation is verified: **before + change = after**

**For Adding Credits:**
```javascript
verifyAddition(balanceBefore, validatedAmount, balanceAfter)
// MUST be: balanceAfter === balanceBefore + amount
// Error if math doesn't add up!
```

**Example:**
```
Before: 500 credits
Add: 100 credits
After: 600 credits
✓ 500 + 100 = 600 ✓ Verified!

Before: 500 credits
Add: 100 credits
After: 601 credits  // ← Wrong!
✗ 500 + 100 ≠ 601 ✗ REJECTED!
```

**For Deducting Credits:**
```javascript
verifyDeduction(balanceBefore, amount, balanceAfter)
// MUST be: balanceAfter === balanceBefore - amount
// Error if math doesn't subtract correctly!
```

**Example:**
```
Before: 500 credits
Deduct: 100 credits
After: 400 credits
✓ 500 - 100 = 400 ✓ Verified!

Before: 500 credits
Deduct: 100 credits
After: 401 credits  // ← Wrong!
✗ 500 - 100 ≠ 401 ✗ REJECTED!
```

### 3. Campaign Cost Calculation

Cost = targetCount × 1 credit per target

- ✅ If targetCount = 50 → cost = 50 credits (exact)
- ✗ If targetCount = 50.5 → error (must be integer)
- ✗ If targetCount = 0 → error (must be positive)

### 4. Task & Reward Validation

Every reward must be:
- ✅ Integer (100 ✓, 100.5 ✗)
- ✅ Non-negative (0 or positive)
- ✅ Exact amount awarded

### 5. Payment Credit Conversion

**INR Amounts:**
| Amount | Credits | Formula |
|--------|---------|---------|
| 10 | 100 | Exact |
| 50 | 500 | Exact |
| 100 | 1000 | Exact |
| 20 | 200 | 20 × 10 |
| 30 | 300 | 30 × 10 |
| Any (multiple of 10) | amount × 10 | Calculated |

- ✅ 10 INR → 100 credits (exact)
- ✗ 15 INR → error (not multiple of 10)
- ✗ 10.5 INR → error (must be integer)

**USD Amounts:**
| Amount | Credits |
|--------|---------|
| 1 | 100 |
| 15 | 500 |
| 50 | 1000 |

- ✅ Only exact amounts allowed
- ✗ Any other amount rejected

### 6. Audit Trail Verification

Every credit change is logged with verification:
```javascript
{
  user: userId,
  type: 'earn' | 'spend' | 'purchase' | 'refund',
  amount: 100,                  // Exact amount
  balanceBefore: 500,           // Snapshot
  balanceAfter: 600,            // Snapshot
  status: 'completed',          // Success
  
  // Verification: 500 + 100 = 600 ✓
}
```

---

## Error Examples

### ❌ Decimal Credits
```
POST /api/users/earn
{
  "reward": 100.5
}

Response 400:
{
  "message": "Reward must be a non-negative integer (no decimals). Got: 100.5"
}
```

### ❌ Invalid Campaign Target
```
POST /api/campaigns/create
{
  "targetCount": 50.7
}

Response 400:
{
  "message": "Missing required fields or invalid targetCount (must be positive integer)"
}
```

### ❌ Invalid INR Amount
```
POST /api/users/payment/create-order
{
  "amount": 15,
  "currency": "INR"
}

Response 400:
{
  "message": "Invalid amount: 15 INR. Must be a multiple of 10. Valid amounts: 10, 50, 100, or multiples of 10."
}
```

### ❌ Invalid USD Amount
```
POST /api/users/payment/create-order
{
  "amount": 25,
  "currency": "USD"
}

Response 400:
{
  "message": "Invalid USD amount: 25. Valid amounts: 1, 15, 50 USD."
}
```

### ❌ Insufficient Balance
```
POST /api/campaigns/create
{
  "targetCount": 100,  // Costs 100 credits
  "type": "subscribers"
}

User has: 50 credits

Response 400:
{
  "message": "Insufficient credits: have 50, need 100. Cannot deduct."
}
```

---

## Complete Validation Flow

### Creating Campaign (Spending Credits)

```
1. Input: targetCount = 50 (integer)
   ✓ Validated: Number.isInteger(50) = true

2. Cost Calculation: 50 × 1 = 50 credits
   ✓ Result is integer: 50

3. Balance Check:
   User has: 500 credits
   ✓ 500 >= 50: allowed

4. Deduction:
   Before: 500
   Amount: 50
   After: 450
   ✓ Verified: 500 - 50 = 450

5. Transaction Logged:
   {
     type: 'spend',
     amount: 50,
     balanceBefore: 500,
     balanceAfter: 450,
     description: 'Campaign: 50 subscribers'
   }
   ✓ Verified: 500 - 50 = 450

6. Response: { credits: 450 }
```

### Verifying Task (Earning Credits)

```
1. Task Reward: 100 (from database)
   ✓ Validated: Number.isInteger(100) = true, 100 >= 0

2. Idempotency Check:
   ✓ Task not already verified
   ✓ User hasn't completed this task

3. Addition:
   Before: 400
   Amount: 100
   After: 500
   ✓ Verified: 400 + 100 = 500

4. Transaction Logged:
   {
     type: 'earn',
     amount: 100,
     balanceBefore: 400,
     balanceAfter: 500,
     description: 'Task verified: Subscribe task'
   }
   ✓ Verified: 400 + 100 = 500

5. Response: { credits: 500, creditsAwarded: 100 }
```

---

## Verification Commands

### Check for Decimal Credits in Database
```javascript
// MongoDB - find any transactions with non-integer amounts
db.credittransactions.find({
  $or: [
    { amount: { $not: { $type: 'int' } } },
    { amount: { $mod: [1, 0] } }
  ]
});
// Should return: empty array (no decimals!)
```

### Verify Math for Campaign Costs
```javascript
// Check last 100 campaigns
db.campaigns.aggregate([
  { $limit: 100 },
  { $project: {
    cost: 1,
    targetCount: 1,
    calculatedCost: { $multiply: ['$targetCount', 1] },
    match: { $eq: ['$cost', { $multiply: ['$targetCount', 1] }] }
  }}
]).pretty();
// All documents should show: match = true
```

### Audit Trail Verification
```javascript
// Verify all deductions: before - amount = after
db.credittransactions.find({ type: 'spend' }).forEach(tx => {
  const expected = tx.balanceBefore - tx.amount;
  if (tx.balanceAfter !== expected) {
    print(`MISMATCH: ${tx.balanceBefore} - ${tx.amount} ≠ ${tx.balanceAfter}`);
  }
});
// Should print nothing (no mismatches!)
```

---

## Summary

| Aspect | Status |
|--------|--------|
| **Decimals** | ❌ Rejected |
| **Floating Point** | ❌ Rejected |
| **Math** | ✅ Verified (before ± amount = after) |
| **Rounding** | ❌ Not allowed (must be exact) |
| **Debit Accuracy** | ✅ Exact amount, every time |
| **Credit Accuracy** | ✅ Exact amount, every time |
| **Audit Trail** | ✅ Every change verified |
| **Duplicates** | ❌ Prevented |

**Status:** ✅ Robust credit system with strict validation
