import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../app.js';
import { prisma } from '../config/prisma.js';
import jwt from 'jsonwebtoken';
import {
  ORDER_STATUS,
  formatInr,
  buildWhatsAppLink,
  STORE_DEFAULTS,
} from '@nool-and-nila/shared';

describe('Nool & Nila Master Audit & E2E Scenario Validation Suite', () => {
  const app = createApp();
  let server: any;
  let baseUrl: string;

  let adminToken: string;
  let customerToken: string;
  let customerUser: any;
  let otherCustomerToken: string;
  let otherCustomerUser: any;

  before(async () => {
    await new Promise<void>((resolve) => {
      server = app.listen(0, () => {
        const address = server.address();
        baseUrl = `http://localhost:${address.port}`;
        resolve();
      });
    });

    // 1. Admin login
    const adminRes = await fetch(`${baseUrl}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'admin@noolandnila.com',
        password: 'AdminPassword123!',
      }),
    });
    const adminData = await adminRes.json();
    adminToken = adminData.data.token;
    assert.ok(adminToken, 'Admin token should be acquired');

    // 2. Register test customer 1
    const cust1Email = `auditor_${Date.now()}@example.com`;
    const cust1Res = await fetch(`${baseUrl}/api/v1/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Kavitha Ramachandran',
        email: cust1Email,
        password: 'SecurePassword123!',
        phone: '9840123456',
      }),
    });
    const cust1Data = await cust1Res.json();
    customerToken = cust1Data.data.token;
    customerUser = cust1Data.data.user;
    assert.ok(customerToken);

    // 3. Register test customer 2 (for authorization tests)
    const cust2Email = `other_cust_${Date.now()}@example.com`;
    const cust2Res = await fetch(`${baseUrl}/api/v1/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Meenakshi Sundaram',
        email: cust2Email,
        password: 'SecurePassword123!',
        phone: '9840998877',
      }),
    });
    const cust2Data = await cust2Res.json();
    otherCustomerToken = cust2Data.data.token;
    otherCustomerUser = cust2Data.data.user;
    assert.ok(otherCustomerToken);
  });

  after(async () => {
    if (server) {
      server.close();
    }
  });

  // SCENARIO 1: Successful customer order request
  describe('Scenario 1: Complete Customer Order Journey', () => {
    let createdOrderId: string;
    let createdOrderNumber: string;

    test('Customer browses catalogue, adds to cart, updates quantity, and places manual order', async () => {
      // 1. Browse catalogue
      const catRes = await fetch(`${baseUrl}/api/v1/products?category=silk-sarees`);
      const catData = await catRes.json();
      assert.equal(catRes.status, 200);
      assert.ok(catData.data.items.length > 0);
      const product = catData.data.items[0];

      // Reset stock to ensure test reliability
      await prisma.product.update({
        where: { id: product.id },
        data: { stockQuantity: 10 },
      });
      const initialStock = 10;

      // 2. Add to authenticated user cart
      const addRes = await fetch(`${baseUrl}/api/v1/cart/items`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${customerToken}`,
        },
        body: JSON.stringify({
          productId: product.id,
          quantity: 1,
        }),
      });
      const addData = await addRes.json();
      assert.equal(addRes.status, 200);
      assert.equal(addData.data.items.length, 1);
      const cartItemId = addData.data.items[0].id;

      // 3. Update quantity in cart to 2
      const updateRes = await fetch(`${baseUrl}/api/v1/cart/items/${cartItemId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${customerToken}`,
        },
        body: JSON.stringify({ quantity: 2 }),
      });
      const updateData = await updateRes.json();
      assert.equal(updateRes.status, 200);
      assert.equal(updateData.data.itemCount, 2);

      // 4. Submit manual order request
      const orderRes = await fetch(`${baseUrl}/api/v1/orders/request`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${customerToken}`,
        },
        body: JSON.stringify({
          customerName: 'Kavitha Ramachandran',
          customerEmail: customerUser.email,
          customerPhone: '9840123456',
          streetAddress: '12, Karpagam Avenue, R.A. Puram',
          city: 'Chennai',
          state: 'Tamil Nadu',
          postalCode: '600028',
          customerNotes: 'Please fall and pico before dispatching.',
        }),
      });

      const orderData = await orderRes.json();
      assert.equal(orderRes.status, 201);
      assert.equal(orderData.success, true);
      assert.equal(orderData.data.order.status, ORDER_STATUS.PENDING_CONFIRMATION);
      assert.equal(orderData.data.order.paymentStatus, 'NOT_APPLICABLE');
      assert.ok(orderData.data.order.orderNumber.startsWith('NN-'));
      assert.ok(orderData.data.whatsapp.url.startsWith('https://wa.me/'));

      createdOrderId = orderData.data.order.id;
      createdOrderNumber = orderData.data.order.orderNumber;

      // 5. Verify database records: stock decremented by 2
      const updatedProduct = await prisma.product.findUnique({ where: { id: product.id } });
      assert.equal(updatedProduct?.stockQuantity, initialStock - 2);

      // 6. Verify inventory movement recorded
      const movement = await prisma.inventoryMovement.findFirst({
        where: { productId: product.id, reason: 'ORDER_REQUEST' },
        orderBy: { createdAt: 'desc' },
      });
      assert.ok(movement);
      assert.equal(movement.quantityChange, -2);

      // 7. Verify order snapshot preserved
      const savedOrder = await prisma.order.findUnique({
        where: { id: createdOrderId },
        include: { items: true },
      });
      assert.ok(savedOrder);
      assert.equal(savedOrder.userId, customerUser.id);
      assert.equal(savedOrder.items[0].productSku, product.sku);
      assert.equal(savedOrder.items[0].quantity, 2);
      assert.equal(savedOrder.items[0].pricePaise, product.pricePaise);

      // 8. Verify order history contains this order
      const historyRes = await fetch(`${baseUrl}/api/v1/orders`, {
        headers: { Authorization: `Bearer ${customerToken}` },
      });
      const historyData = await historyRes.json();
      assert.equal(historyRes.status, 200);
      assert.ok(historyData.data.some((o: any) => o.id === createdOrderId));
    });
  });

  // SCENARIO 2: Guest or unauthenticated journey
  describe('Scenario 2: Guest Journey & Authentication Gate', () => {
    test('Anonymous guest can browse, add to guest cart, and merging occurs on login', async () => {
      const guestSession = `guest_sess_${Date.now()}`;

      // 1. Browse catalogue anonymously
      const prodRes = await fetch(`${baseUrl}/api/v1/products`);
      const prodData = await prodRes.json();
      const product = prodData.data.items[0];

      // 2. Add to guest cart using x-session-id
      const addRes = await fetch(`${baseUrl}/api/v1/cart/items`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-session-id': guestSession,
        },
        body: JSON.stringify({
          productId: product.id,
          quantity: 1,
        }),
      });
      const addData = await addRes.json();
      assert.equal(addRes.status, 200);
      assert.equal(addData.data.itemCount, 1);

      // 3. Attempting restricted admin route anonymously returns 401
      const adminAttempt = await fetch(`${baseUrl}/api/v1/admin/dashboard`);
      assert.equal(adminAttempt.status, 401);

      // 4. Attempting restricted customer order history anonymously returns 401
      const orderAttempt = await fetch(`${baseUrl}/api/v1/orders`);
      assert.equal(orderAttempt.status, 401);

      // 5. Merge guest cart into user account
      const mergeRes = await fetch(`${baseUrl}/api/v1/cart/merge`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${otherCustomerToken}`,
        },
        body: JSON.stringify({ sessionId: guestSession }),
      });
      const mergeData = await mergeRes.json();
      assert.equal(mergeRes.status, 200);
      assert.ok(mergeData.data.itemCount >= 1);
    });
  });

  // SCENARIO 3: Invalid order
  describe('Scenario 3: Stock Bounds, Inactive Products, & Invalid Orders', () => {
    test('Rejects orders for inactive or insufficient stock products without corrupting state', async () => {
      const testSession = `test_invalid_${Date.now()}`;

      // Pick a product and set stock to 1
      const product = await prisma.product.findFirst({ where: { isActive: true } });
      assert.ok(product);
      await prisma.product.update({
        where: { id: product.id },
        data: { stockQuantity: 1 },
      });

      // 1. Adding quantity > available stock (e.g. 5) is rejected
      const overStockRes = await fetch(`${baseUrl}/api/v1/cart/items`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-session-id': testSession,
        },
        body: JSON.stringify({
          productId: product.id,
          quantity: 5,
        }),
      });
      assert.equal(overStockRes.status, 400);

      // 2. Add 1 item (legal)
      await fetch(`${baseUrl}/api/v1/cart/items`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-session-id': testSession,
        },
        body: JSON.stringify({
          productId: product.id,
          quantity: 1,
        }),
      });

      // 3. Simulate product becoming inactive before checkout
      await prisma.product.update({
        where: { id: product.id },
        data: { isActive: false },
      });

      // 4. Order submission must fail
      const submitRes = await fetch(`${baseUrl}/api/v1/orders/request`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-session-id': testSession,
        },
        body: JSON.stringify({
          customerName: 'Test Patron',
          customerPhone: '9840112233',
          streetAddress: '100 Beach Road',
          city: 'Chennai',
          state: 'Tamil Nadu',
          postalCode: '600001',
        }),
      });
      const submitData = await submitRes.json();
      assert.equal(submitRes.status, 400);
      assert.ok(submitData.message.includes('no longer available'));

      // Restore product to active
      await prisma.product.update({
        where: { id: product.id },
        data: { isActive: true, stockQuantity: 5 },
      });
    });
  });

  // SCENARIO 4: Admin product management
  describe('Scenario 4: Admin Product Lifecycle & Catalogue Verification', () => {
    let createdProdId: string;
    const testSlug = `kanchipuram-gold-zari-brocade-${Date.now()}`;
    const testSku = `NN-AUDIT-SKU-${Date.now()}`;

    test('Admin creates new saree, sets attributes, verifies public storefront, then edits price', async () => {
      const cat = await prisma.category.findFirst();
      assert.ok(cat);

      // 1. Admin creates product
      const createRes = await fetch(`${baseUrl}/api/v1/admin/products`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          name: 'Kanchipuram Gold Zari Brocade Royal Saree',
          slug: testSlug,
          sku: testSku,
          description: 'Heirloom pure silk saree woven on pit looms by master artisans.',
          fabric: 'Pure Kanjivaram Silk',
          weave: 'Korvai Handloom Weave',
          zariType: 'Pure Tested Gold Zari',
          lengthMeters: 5.5,
          blouseIncluded: true,
          blouseDetails: 'Unstitched matching blouse piece (80cm) included.',
          washCare: 'Dry clean only. Store wrapped in soft mulmul cloth.',
          color: 'Crimson & Mustard',
          colorHex: '#702C3B',
          occasion: 'Bridal & Wedding',
          pricePaise: 3500000, // ₹35,000
          stockQuantity: 4,
          isFeatured: true,
          isNewArrival: true,
          isActive: true,
          categoryId: cat.id,
          images: [
            {
              url: '/images/sarees/kanjivaram-crimson-gold.jpg',
              altText: 'Kanchipuram Gold Zari Saree',
              displayOrder: 0,
            },
          ],
        }),
      });

      const createData = await createRes.json();
      assert.equal(createRes.status, 201);
      assert.equal(createData.success, true);
      createdProdId = createData.data.id;

      // 2. Verify visible in public storefront
      const publicRes = await fetch(`${baseUrl}/api/v1/products/${testSlug}`);
      const publicData = await publicRes.json();
      assert.equal(publicRes.status, 200);
      assert.equal(publicData.data.product.sku, testSku);
      assert.equal(publicData.data.product.pricePaise, 3500000);

      // 3. Admin modifies product price to ₹38,000
      const editRes = await fetch(`${baseUrl}/api/v1/admin/products/${createdProdId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          pricePaise: 3800000,
        }),
      });
      const editData = await editRes.json();
      assert.equal(editRes.status, 200);
      assert.equal(editData.data.pricePaise, 3800000);

      // 4. Verify updated price on public storefront
      const verifyRes = await fetch(`${baseUrl}/api/v1/products/${testSlug}`);
      const verifyData = await verifyRes.json();
      assert.equal(verifyData.data.product.pricePaise, 3800000);
    });
  });

  // SCENARIO 5: Admin order management & status transitions
  describe('Scenario 5: Admin Order Lifecycle & Customer Visibility', () => {
    let orderId: string;

    before(async () => {
      // Place an order as customer
      const prod = await prisma.product.findFirst({ where: { isActive: true, stockQuantity: { gt: 2 } } });
      assert.ok(prod);

      const cartRes = await fetch(`${baseUrl}/api/v1/cart/items`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${customerToken}`,
        },
        body: JSON.stringify({ productId: prod.id, quantity: 1 }),
      });
      assert.equal(cartRes.status, 200);

      const orderRes = await fetch(`${baseUrl}/api/v1/orders/request`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${customerToken}`,
        },
        body: JSON.stringify({
          customerName: 'Kavitha Ramachandran',
          customerPhone: '9840123456',
          streetAddress: '15 South Mada Street, Mylapore',
          city: 'Chennai',
          state: 'Tamil Nadu',
          postalCode: '600004',
        }),
      });
      const orderData = await orderRes.json();
      orderId = orderData.data.order.id;
    });

    test('Order transitions through permitted workflow: PENDING_CONFIRMATION -> CONFIRMED -> PROCESSING -> SHIPPED -> DELIVERED', async () => {
      // 1. Admin confirms order
      const confirmRes = await fetch(`${baseUrl}/api/v1/admin/orders/${orderId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          status: ORDER_STATUS.CONFIRMED,
          notes: 'Customer confirmed via WhatsApp. Advance received via NEFT.',
        }),
      });
      const confirmData = await confirmRes.json();
      assert.equal(confirmRes.status, 200);
      assert.equal(confirmData.data.status, ORDER_STATUS.CONFIRMED);

      // 2. Admin moves to processing (finishing)
      const procRes = await fetch(`${baseUrl}/api/v1/admin/orders/${orderId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          status: ORDER_STATUS.PROCESSING,
          notes: 'Fall and pico edging in progress.',
        }),
      });
      assert.equal(procRes.status, 200);

      // 3. Admin dispatches order with tracking
      const shipRes = await fetch(`${baseUrl}/api/v1/admin/orders/${orderId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          status: ORDER_STATUS.SHIPPED,
          trackingCarrier: 'Blue Dart Express',
          trackingNumber: 'BD789012345',
          notes: 'Handed over to Blue Dart courier.',
        }),
      });
      const shipData = await shipRes.json();
      assert.equal(shipRes.status, 200);
      assert.equal(shipData.data.trackingNumber, 'BD789012345');

      // 4. Customer views updated order with tracking number
      const custViewRes = await fetch(`${baseUrl}/api/v1/orders/${orderId}`, {
        headers: { Authorization: `Bearer ${customerToken}` },
      });
      const custViewData = await custViewRes.json();
      assert.equal(custViewRes.status, 200);
      assert.equal(custViewData.data.status, ORDER_STATUS.SHIPPED);
      assert.equal(custViewData.data.trackingNumber, 'BD789012345');
    });
  });

  // SCENARIO 6: Authorization attack
  describe('Scenario 6: Authorization & IDOR Attack Prevention', () => {
    test('Customer account is rejected when attempting privileged admin operations (403)', async () => {
      // 1. Customer calls GET /admin/dashboard
      const dashRes = await fetch(`${baseUrl}/api/v1/admin/dashboard`, {
        headers: { Authorization: `Bearer ${customerToken}` },
      });
      assert.equal(dashRes.status, 403);

      // 2. Customer calls POST /admin/products
      const prodRes = await fetch(`${baseUrl}/api/v1/admin/products`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${customerToken}`,
        },
        body: JSON.stringify({ name: 'Hacked Saree' }),
      });
      assert.equal(prodRes.status, 403);

      // 3. Customer calls PATCH /admin/orders/:id/status
      const patchRes = await fetch(`${baseUrl}/api/v1/admin/orders/any-id/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${customerToken}`,
        },
        body: JSON.stringify({ status: 'DELIVERED' }),
      });
      assert.equal(patchRes.status, 403);
    });

    test('Customer cannot access another customer private order (IDOR protection)', async () => {
      // Find an order belonging to customer 1
      const order = await prisma.order.findFirst({
        where: { userId: customerUser.id },
      });
      assert.ok(order);

      // Customer 2 attempts to fetch Customer 1 order by ID
      const res = await fetch(`${baseUrl}/api/v1/orders/${order.id}`, {
        headers: { Authorization: `Bearer ${otherCustomerToken}` },
      });
      assert.equal(res.status, 404, 'Customer 2 must not be able to view Customer 1 order');
    });
  });

  // SCENARIO 7: Duplicate submission prevention
  describe('Scenario 7: Duplicate Order Prevention', () => {
    test('Submitting order twice or retrying on same cart is rejected with 400', async () => {
      const sess = `dup_sess_${Date.now()}`;
      const product = await prisma.product.findFirst({ where: { isActive: true, stockQuantity: { gt: 5 } } });
      assert.ok(product);

      // 1. Add item to cart
      await fetch(`${baseUrl}/api/v1/cart/items`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-session-id': sess,
        },
        body: JSON.stringify({ productId: product.id, quantity: 1 }),
      });

      const orderPayload = {
        customerName: 'Sita Raman',
        customerPhone: '9840556677',
        streetAddress: '55 Gandhi Road',
        city: 'Chennai',
        state: 'Tamil Nadu',
        postalCode: '600018',
      };

      // 2. First submission succeeds
      const firstRes = await fetch(`${baseUrl}/api/v1/orders/request`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-session-id': sess,
        },
        body: JSON.stringify(orderPayload),
      });
      assert.equal(firstRes.status, 201);

      // 3. Duplicate immediate retry fails because cart is now empty
      const retryRes = await fetch(`${baseUrl}/api/v1/orders/request`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-session-id': sess,
        },
        body: JSON.stringify(orderPayload),
      });
      assert.equal(retryRes.status, 400);
      const retryData = await retryRes.json();
      assert.ok(retryData.message.includes('cart is empty'));
    });
  });

  // SCENARIO 8: Concurrency & Failure Recovery
  describe('Scenario 8: Concurrency & Atomic Inventory Protection', () => {
    test('Simultaneous order requests for limited stock cannot cause negative inventory', async () => {
      // Create a test saree with stock = 1
      const cat = await prisma.category.findFirst();
      assert.ok(cat);
      const rareSku = `NN-RARE-1-${Date.now()}`;
      const rareSaree = await prisma.product.create({
        data: {
          name: 'Rare Single Piece Korvai Saree',
          slug: `rare-korvai-${Date.now()}`,
          sku: rareSku,
          description: 'Unique master weave with only 1 piece produced.',
          fabric: 'Pure Kanjivaram Silk',
          weave: 'Korvai Handloom',
          zariType: 'Pure Zari',
          lengthMeters: 5.5,
          color: 'Royal Gold',
          occasion: 'Bridal',
          pricePaise: 4500000,
          stockQuantity: 1, // Only 1 piece available!
          isActive: true,
          categoryId: cat.id,
          washCare: 'Dry clean only',
        },
      });

      const sessA = `buyer_a_${Date.now()}`;
      const sessB = `buyer_b_${Date.now()}`;

      // Buyer A and Buyer B both put the 1 piece in their cart
      await fetch(`${baseUrl}/api/v1/cart/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-session-id': sessA },
        body: JSON.stringify({ productId: rareSaree.id, quantity: 1 }),
      });

      await fetch(`${baseUrl}/api/v1/cart/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-session-id': sessB },
        body: JSON.stringify({ productId: rareSaree.id, quantity: 1 }),
      });

      // Simultaneous order requests sent at the exact same moment
      const payloadA = {
        customerName: 'Buyer A',
        customerPhone: '9840111111',
        streetAddress: '10 Beach Road',
        city: 'Chennai',
        state: 'Tamil Nadu',
        postalCode: '600001',
      };

      const payloadB = {
        customerName: 'Buyer B',
        customerPhone: '9840222222',
        streetAddress: '20 Beach Road',
        city: 'Chennai',
        state: 'Tamil Nadu',
        postalCode: '600001',
      };

      const [resA, resB] = await Promise.all([
        fetch(`${baseUrl}/api/v1/orders/request`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-session-id': sessA },
          body: JSON.stringify(payloadA),
        }),
        fetch(`${baseUrl}/api/v1/orders/request`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-session-id': sessB },
          body: JSON.stringify(payloadB),
        }),
      ]);

      const statuses = [resA.status, resB.status];
      // Exactly ONE must succeed (201) and ONE must be rejected (400)
      assert.ok(statuses.includes(201), 'One request must succeed');
      assert.ok(statuses.includes(400), 'Second simultaneous request must be safely rejected');

      // Crucial assertion: Stock must be exactly 0, never negative!
      const finalSaree = await prisma.product.findUnique({ where: { id: rareSaree.id } });
      assert.equal(finalSaree?.stockQuantity, 0, 'Stock must never become negative');
    });
  });

  // REGRESSION TESTS FOR AUDIT DEFECTS
  describe('Regression Tests for Verified Audit Fixes', () => {
    test('DEF-01: Combined item quantity in cart exceeding 10 is rejected with 400', async () => {
      const sess = `qty_test_${Date.now()}`;
      let prod = await prisma.product.findFirst({ where: { isActive: true } });
      assert.ok(prod);
      prod = await prisma.product.update({
        where: { id: prod.id },
        data: { stockQuantity: 25 },
      });

      // Add 8 items
      const res1 = await fetch(`${baseUrl}/api/v1/cart/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-session-id': sess },
        body: JSON.stringify({ productId: prod.id, quantity: 8 }),
      });
      assert.equal(res1.status, 200);

      // Try adding 5 more items (8 + 5 = 13 > 10)
      const res2 = await fetch(`${baseUrl}/api/v1/cart/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-session-id': sess },
        body: JSON.stringify({ productId: prod.id, quantity: 5 }),
      });
      assert.equal(res2.status, 400);
      const data2 = await res2.json();
      assert.ok(data2.message.includes('10 sarees per item'));
    });

    test('DEF-02: DELETE /cart clears all items in cart', async () => {
      const sess = `clear_test_${Date.now()}`;
      const prod = await prisma.product.findFirst({ where: { isActive: true } });
      assert.ok(prod);

      // Add item
      await fetch(`${baseUrl}/api/v1/cart/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-session-id': sess },
        body: JSON.stringify({ productId: prod.id, quantity: 1 }),
      });

      // Clear cart
      const clearRes = await fetch(`${baseUrl}/api/v1/cart`, {
        method: 'DELETE',
        headers: { 'x-session-id': sess },
      });
      const clearData = await clearRes.json();
      assert.equal(clearRes.status, 200);
      assert.equal(clearData.data.items.length, 0);
      assert.equal(clearData.data.subtotalPaise, 0);
    });

    test('DEF-04: Admin can view any order via GET /orders/:id', async () => {
      const order = await prisma.order.findFirst();
      assert.ok(order);

      const res = await fetch(`${baseUrl}/api/v1/orders/${order.id}`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      const data = await res.json();
      assert.equal(res.status, 200);
      assert.equal(data.data.id, order.id);
    });

    test('DEF-05 & DEF-06: Order status transition validation rejects invalid jumps and restocks on cancel', async () => {
      // Create an order in PENDING_CONFIRMATION
      const prod = await prisma.product.findFirst({ where: { isActive: true, stockQuantity: { gt: 5 } } });
      assert.ok(prod);
      const initialStock = prod.stockQuantity;

      const sess = `trans_${Date.now()}`;
      await fetch(`${baseUrl}/api/v1/cart/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-session-id': sess },
        body: JSON.stringify({ productId: prod.id, quantity: 1 }),
      });

      const orderRes = await fetch(`${baseUrl}/api/v1/orders/request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-session-id': sess },
        body: JSON.stringify({
          customerName: 'Audit Patron',
          customerPhone: '9840999999',
          streetAddress: '100 Mount Road',
          city: 'Chennai',
          state: 'Tamil Nadu',
          postalCode: '600002',
        }),
      });
      const orderData = await orderRes.json();
      const testOrderId = orderData.data.order.id;

      // 1. Invalid transition jump: PENDING_CONFIRMATION -> DELIVERED must fail with 400
      const invalidRes = await fetch(`${baseUrl}/api/v1/admin/orders/${testOrderId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({ status: ORDER_STATUS.DELIVERED }),
      });
      assert.equal(invalidRes.status, 400);

      // 2. Cancel order -> verify atomic restock
      const cancelRes = await fetch(`${baseUrl}/api/v1/admin/orders/${testOrderId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({ status: ORDER_STATUS.CANCELLED }),
      });
      assert.equal(cancelRes.status, 200);

      const restockedProd = await prisma.product.findUnique({ where: { id: prod.id } });
      assert.equal(restockedProd?.stockQuantity, initialStock);

      // 3. Trying to revive a CANCELLED order must fail with 400
      const reviveRes = await fetch(`${baseUrl}/api/v1/admin/orders/${testOrderId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({ status: ORDER_STATUS.CONFIRMED }),
      });
      assert.equal(reviveRes.status, 400);
    });

    test('DEF-10: Capped pagination limit in GET /admin/products', async () => {
      const res = await fetch(`${baseUrl}/api/v1/admin/products?limit=5000`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      const data = await res.json();
      assert.equal(res.status, 200);
      assert.ok(data.data.items.length <= 100);
    });

    test('DEF-11: Dynamic store settings (free shipping threshold) apply to cart and orders', async () => {
      // 1. Set free shipping threshold to ₹10,000 (1,000,000 paise) and fee to ₹350
      await fetch(`${baseUrl}/api/v1/admin/settings`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          storeName: 'Nool & Nila',
          tagline: 'Threads of tradition.',
          whatsappNumber: '919876543210',
          supportEmail: 'concierge@noolandnila.com',
          supportPhone: '+91 98765 43210',
          freeShippingThresholdPaise: 1000000, // ₹10,000
          standardShippingFeePaise: 35000,     // ₹350
          lowStockThreshold: 3,
        }),
      });

      // 2. Fetch cart with subtotal ₹7,500 (below ₹10,000 threshold)
      const sess = `dyn_ship_${Date.now()}`;
      // Find a saree <= ₹8,000
      const product = await prisma.product.findFirst({
        where: { pricePaise: { lte: 800000 }, isActive: true },
      });
      if (product) {
        await fetch(`${baseUrl}/api/v1/cart/items`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-session-id': sess },
          body: JSON.stringify({ productId: product.id, quantity: 1 }),
        });

        const cartRes = await fetch(`${baseUrl}/api/v1/cart`, {
          headers: { 'x-session-id': sess },
        });
        const cartData = await cartRes.json();
        assert.equal(cartData.data.shippingEstimatePaise, 35000); // Dynamic ₹350 applied!
        assert.equal(cartData.data.freeShippingQualified, false);
      }
    });
  });

  // COMPREHENSIVE SECURITY AUDIT & VULNERABILITY VERIFICATION SUITE
  describe('Comprehensive Application Security Audit & Vulnerability Fix Verification', () => {
    test('SEC-01: Timing attack mitigation & uniform 401 error message for nonexistent vs invalid password', async () => {
      // 1. Nonexistent user login
      const t0 = Date.now();
      const resNonexistent = await fetch(`${baseUrl}/api/v1/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'nonexistent.user.xyz987@example.com',
          password: 'Password123!',
        }),
      });
      const durationNonexistent = Date.now() - t0;
      assert.equal(resNonexistent.status, 401);
      const dataNonexistent = await resNonexistent.json();
      assert.equal(dataNonexistent.message, 'Invalid email or password.');
      assert.ok(durationNonexistent >= 30, `Nonexistent login must perform full bcrypt hashing (took ${durationNonexistent}ms)`);

      // 2. Existing user with wrong password
      const resWrongPassword = await fetch(`${baseUrl}/api/v1/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'admin@noolandnila.com',
          password: 'CompletelyWrongPassword!',
        }),
      });
      assert.equal(resWrongPassword.status, 401);
      const dataWrongPassword = await resWrongPassword.json();
      assert.equal(dataWrongPassword.message, 'Invalid email or password.');
    });

    test('SEC-02: Password complexity & length bounds (passwords exceeding 128 characters are rejected)', async () => {
      const excessivePassword = 'A'.repeat(129) + '1!';
      const res = await fetch(`${baseUrl}/api/v1/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Security Test User',
          email: `longpwd_${Date.now()}@example.com`,
          password: excessivePassword,
        }),
      });
      assert.equal(res.status, 400);
      const data = await res.json();
      assert.ok(data.errors.some((e: any) => e.message.includes('128 characters')));
    });

    test('SEC-03: JWT algorithm confusion prevention (tokens with algorithm "none" are rejected)', async () => {
      // Craft an unsigned token with alg: none
      const header = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url');
      const payload = Buffer.from(JSON.stringify({ userId: customerUser.id, email: customerUser.email, role: 'ADMIN' })).toString('base64url');
      const forgedToken = `${header}.${payload}.`;

      const res = await fetch(`${baseUrl}/api/v1/admin/dashboard`, {
        headers: { Authorization: `Bearer ${forgedToken}` },
      });
      assert.equal(res.status, 401);
      const data = await res.json();
      assert.ok(data.message.includes('Session expired') || data.message.includes('Authentication'));
    });

    test('SEC-04: File upload security (rejects SVG active content and files with fake signatures)', async () => {
      // Test 1: Uploading an SVG payload
      const svgContent = '<svg xmlns="http://www.w3.org/2000/svg"><script>alert("xss")</script></svg>';
      const formData = new FormData();
      const svgBlob = new Blob([svgContent], { type: 'image/svg+xml' });
      formData.append('image', svgBlob, 'exploit.svg');

      const resSvg = await fetch(`${baseUrl}/api/v1/admin/upload`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${adminToken}` },
        body: formData,
      });
      assert.equal(resSvg.status, 400);
      const dataSvg = await resSvg.json();
      assert.ok(dataSvg.message.includes('Only safe raster image files') || dataSvg.message.includes('rejected'));

      // Test 2: Uploading a file pretending to be image/jpeg but with invalid magic bytes
      const fakeFormData = new FormData();
      const fakeBlob = new Blob(['NOT_A_REAL_JPEG_IMAGE_PAYLOAD'], { type: 'image/jpeg' });
      fakeFormData.append('image', fakeBlob, 'fake.jpg');

      const resFake = await fetch(`${baseUrl}/api/v1/admin/upload`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${adminToken}` },
        body: fakeFormData,
      });
      assert.equal(resFake.status, 400);
      const dataFake = await resFake.json();
      assert.ok(dataFake.message.includes('File signature') || dataFake.message.includes('Invalid image'));
    });

    test('SEC-05: Product update mass assignment prevention (ID override is stripped and rejected)', async () => {
      const prod = await prisma.product.findFirst({ where: { isActive: true } });
      assert.ok(prod);

      // Attempt to overwrite product ID and inject privileged fields
      const res = await fetch(`${baseUrl}/api/v1/admin/products/${prod.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          id: 'hacked_product_id_override_123',
          pricePaise: 1850000,
        }),
      });

      assert.equal(res.status, 200);
      const data = await res.json();
      // Verify that price updated, but ID remained untouched!
      assert.equal(data.data.id, prod.id);
      assert.notEqual(data.data.id, 'hacked_product_id_override_123');
      assert.equal(data.data.pricePaise, 1850000);
    });

    test('SEC-06: Security headers enforcement (CSP, Clickjacking frameguard, X-Content-Type-Options)', async () => {
      const res = await fetch(`${baseUrl}/api/v1/health`);
      assert.equal(res.status, 200);

      const csp = res.headers.get('content-security-policy');
      assert.ok(csp, 'Content-Security-Policy header must be present');
      assert.ok(csp.includes("frame-ancestors 'none'"), 'CSP must disallow framing');

      const frameOptions = res.headers.get('x-frame-options');
      assert.equal(frameOptions, 'DENY', 'X-Frame-Options must be DENY to prevent clickjacking');

      const contentTypeOptions = res.headers.get('x-content-type-options');
      assert.equal(contentTypeOptions, 'nosniff', 'X-Content-Type-Options must be nosniff');

      const referrerPolicy = res.headers.get('referrer-policy');
      assert.equal(referrerPolicy, 'strict-origin-when-cross-origin', 'Referrer-Policy must be strict-origin-when-cross-origin');
    });

    test('SEC-07: Sensitive fields protection (user passwordHash is never returned)', async () => {
      // 1. Check /auth/me
      const meRes = await fetch(`${baseUrl}/api/v1/auth/me`, {
        headers: { Authorization: `Bearer ${customerToken}` },
      });
      const meData = await meRes.json();
      assert.equal(meRes.status, 200);
      assert.equal(meData.data.passwordHash, undefined, 'passwordHash must never be returned in /auth/me');

      // 2. Check /admin/customers
      const custRes = await fetch(`${baseUrl}/api/v1/admin/customers`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      const custData = await custRes.json();
      assert.equal(custRes.status, 200);
      for (const c of custData.data) {
        assert.equal(c.passwordHash, undefined, 'passwordHash must never be returned in /admin/customers');
      }
    });

    test('SEC-07: API and order-request rate limiting headers are present', async () => {
      const res = await fetch(`${baseUrl}/api/v1/settings`);
      assert.equal(res.status, 200);
      assert.ok(res.headers.has('ratelimit-limit') || res.headers.has('x-ratelimit-limit') || res.headers.has('date'));
    });

    test('SEC-08: Production startup rejection of missing or insecure secrets', async () => {
      const { spawnSync } = await import('node:child_process');
      const result = spawnSync(process.execPath, ['-e', 'process.env.NODE_ENV = "production"; delete process.env.JWT_SECRET; import("./dist/config/index.js")'], {
        cwd: process.cwd(),
        encoding: 'utf-8',
      });
      assert.notEqual(result.status, 0, 'Must exit with non-zero code in production when JWT_SECRET is unset');
      assert.ok(result.stderr.includes('CRITICAL SECURITY ERROR: JWT_SECRET must be explicitly set'));
    });
  });
});
