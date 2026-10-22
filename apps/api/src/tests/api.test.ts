import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../app.js';
import { prisma } from '../config/prisma.js';
import {
  buildWhatsAppLink,
  buildProductEnquiryMessage,
  buildCartEnquiryMessage,
  formatInr,
  STORE_DEFAULTS,
  ORDER_STATUS,
} from '@nool-and-nila/shared';
import bcrypt from 'bcryptjs';

describe('Nool & Nila Full Stack Integration & Logic Tests', () => {
  const app = createApp();
  let server: any;
  let baseUrl: string;

  before(async () => {
    await new Promise<void>((resolve) => {
      server = app.listen(0, () => {
        const address = server.address();
        baseUrl = `http://localhost:${address.port}`;
        resolve();
      });
    });
  });

  after(async () => {
    if (server) {
      server.close();
    }
  });

  describe('1. WhatsApp Service & Link Generator', () => {
    test('Correctly encodes WhatsApp click-to-chat URL with standard message', () => {
      const number = '919876543210';
      const message = 'Hello Nool & Nila! I am interested in Rukmani Kanjivaram.';
      const link = buildWhatsAppLink(number, message);

      assert.ok(link.startsWith('https://wa.me/919876543210?text='));
      assert.ok(link.includes(encodeURIComponent('Hello Nool & Nila!')));
    });

    test('Generates standard product enquiry message with SKU and URL', () => {
      const msg = buildProductEnquiryMessage({
        name: 'Varanasi Emerald Jaal Banarasi',
        sku: 'NN-BAN-02',
        productUrl: 'https://noolandnila.com/products/varanasi-emerald-jaal',
      });

      assert.ok(msg.includes('Varanasi Emerald Jaal Banarasi'));
      assert.ok(msg.includes('SKU: NN-BAN-02'));
      assert.ok(msg.includes('Product link: https://noolandnila.com/products/varanasi-emerald-jaal'));
    });

    test('Generates standard cart enquiry message with itemized summary and formatted INR subtotal', () => {
      const items = [
        { name: 'Kanjivaram Saree', sku: 'NN-KAN-01', quantity: 1 },
        { name: 'Chanderi Saree', sku: 'NN-CHA-03', quantity: 2 },
      ];
      const subtotalPaise = 4210000; // ₹42,100
      const msg = buildCartEnquiryMessage(items, subtotalPaise);

      assert.ok(msg.includes('Kanjivaram Saree (SKU: NN-KAN-01, Qty: 1)'));
      assert.ok(msg.includes('Chanderi Saree (SKU: NN-CHA-03, Qty: 2)'));
      assert.ok(msg.includes('₹42,100'));
    });
  });

  describe('2. Health & Core Configuration Endpoints', () => {
    test('GET /api/v1/health returns operational status', async () => {
      const res = await fetch(`${baseUrl}/api/v1/health`);
      const data = await res.json();

      assert.equal(res.status, 200);
      assert.equal(data.success, true);
      assert.equal(data.service, 'Nool & Nila API');
      assert.equal(data.status, 'operational');
    });
  });

  describe('3. Catalogue & Product Filtering', () => {
    test('GET /api/v1/products returns seeded sarees from SQLite database', async () => {
      const res = await fetch(`${baseUrl}/api/v1/products`);
      const body = await res.json();

      assert.equal(res.status, 200);
      assert.equal(body.success, true);
      assert.ok(body.data.items.length >= 8, 'Should return at least 8 seeded sarees');
      assert.ok(body.data.total >= 8);
    });

    test('GET /api/v1/products with category filter returns matching sarees', async () => {
      const res = await fetch(`${baseUrl}/api/v1/products?category=silk-sarees`);
      const body = await res.json();

      assert.equal(res.status, 200);
      assert.ok(body.data.items.length > 0);
      for (const item of body.data.items) {
        assert.equal(item.category.slug, 'silk-sarees');
      }
    });

    test('GET /api/v1/products with price filter applies correct paise range', async () => {
      // Filter sarees <= ₹10,000 (1000000 paise)
      const res = await fetch(`${baseUrl}/api/v1/products?maxPrice=10000`);
      const body = await res.json();

      assert.equal(res.status, 200);
      for (const item of body.data.items) {
        assert.ok(item.pricePaise <= 1000000, `Item price ${item.pricePaise} must be <= 1000000`);
      }
    });

    test('GET /api/v1/products/:slug returns full details, images and related products', async () => {
      const res = await fetch(`${baseUrl}/api/v1/products/rukmani-crimson-temple-kanjivaram-pure-silk`);
      const body = await res.json();

      assert.equal(res.status, 200);
      assert.equal(body.data.product.sku, 'NN-KAN-01');
      assert.ok(body.data.product.images.length > 0);
      assert.ok(body.data.relatedProducts.length > 0);
    });

    test('GET /api/v1/products/:slug returns 404 for nonexistent saree', async () => {
      const res = await fetch(`${baseUrl}/api/v1/products/non-existent-saree-xyz`);
      const body = await res.json();

      assert.equal(res.status, 404);
      assert.equal(body.success, false);
    });
  });

  describe('4. Shopping Cart Lifecycle & Subtotal Recalculation', () => {
    const testSessionId = `test-session-${Date.now()}`;

    test('Add item to cart and calculate accurate INR subtotal on server', async () => {
      // Find a product
      const product = await prisma.product.findFirst({ where: { sku: 'NN-KAN-01' } });
      assert.ok(product);

      const addRes = await fetch(`${baseUrl}/api/v1/cart/items`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-session-id': testSessionId,
        },
        body: JSON.stringify({
          productId: product.id,
          quantity: 2,
        }),
      });

      const body = await addRes.json();
      assert.equal(addRes.status, 200);
      assert.equal(body.success, true);
      assert.equal(body.data.items.length, 1);
      assert.equal(body.data.itemCount, 2);
      assert.equal(body.data.subtotalPaise, product.pricePaise * 2);
    });

    test('Rejects adding more quantity than available stock in database', async () => {
      // Find a saree with stock < 10
      const product = await prisma.product.findFirst({ where: { sku: 'NN-BRI-07' } }); // Stock is 2
      assert.ok(product);

      const res = await fetch(`${baseUrl}/api/v1/cart/items`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-session-id': `stock-test-${Date.now()}`,
        },
        body: JSON.stringify({
          productId: product.id,
          quantity: product.stockQuantity + 2, // 4 items (exceeds stock 2, but within max 10)
        }),
      });

      const body = await res.json();
      assert.equal(res.status, 400);
      assert.equal(body.success, false);
      assert.ok(body.message.includes('available in stock'));
    });
  });

  describe('5. Manual Order Request Workflow (Pathway B)', () => {
    test('Creates order request with unique reference, reserves stock, and sets PENDING_CONFIRMATION', async () => {
      const orderSessionId = `order-sess-${Date.now()}`;
      await prisma.product.update({
        where: { sku: 'NN-CHA-03' },
        data: { stockQuantity: 5 },
      });
      const product = await prisma.product.findUnique({
        where: { sku: 'NN-CHA-03' },
      });
      assert.ok(product);
      const initialStock = product.stockQuantity;

      // 1. Add 1 item to cart
      await fetch(`${baseUrl}/api/v1/cart/items`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-session-id': orderSessionId,
        },
        body: JSON.stringify({
          productId: product.id,
          quantity: 1,
        }),
      });

      // 2. Submit order request
      const orderRes = await fetch(`${baseUrl}/api/v1/orders/request`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-session-id': orderSessionId,
        },
        body: JSON.stringify({
          customerName: 'Ananya Deshmukh',
          customerEmail: 'ananya.deshmukh@example.com',
          customerPhone: '9820112233',
          streetAddress: '15, Prabhat Road, Lane 4',
          landmark: 'Opposite Kamala Nehru Park',
          city: 'Pune',
          state: 'Maharashtra',
          postalCode: '411004',
          customerNotes: 'Please gift wrap with handwritten note.',
        }),
      });

      const orderBody = await orderRes.json();
      assert.equal(orderRes.status, 201);
      assert.equal(orderBody.success, true);
      assert.ok(orderBody.data.order.orderNumber.startsWith('NN-'));
      assert.equal(orderBody.data.order.status, ORDER_STATUS.PENDING_CONFIRMATION);
      assert.equal(orderBody.data.order.paymentStatus, 'NOT_APPLICABLE');
      assert.equal(orderBody.data.order.customerName, 'Ananya Deshmukh');

      // Verify stock was decremented by 1
      const updatedProduct = await prisma.product.findUnique({ where: { id: product.id } });
      assert.equal(updatedProduct?.stockQuantity, initialStock - 1);

      // Verify cart was emptied
      const cartRes = await fetch(`${baseUrl}/api/v1/cart`, {
        headers: { 'x-session-id': orderSessionId },
      });
      const cartBody = await cartRes.json();
      assert.equal(cartBody.data.items.length, 0);
    });
  });

  describe('6. Security & Admin Authorization Safeguards', () => {
    test('Unauthorized requests to /admin are rejected with 401', async () => {
      const res = await fetch(`${baseUrl}/api/v1/admin/dashboard`);
      const body = await res.json();

      assert.equal(res.status, 401);
      assert.equal(body.success, false);
    });

    test('Admin login succeeds and returns valid JWT token and role', async () => {
      const res = await fetch(`${baseUrl}/api/v1/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'admin@noolandnila.com',
          password: 'AdminPassword123!',
        }),
      });

      const body = await res.json();
      assert.equal(res.status, 200);
      assert.equal(body.data.user.role, 'ADMIN');
      assert.ok(body.data.token);

      // Access admin dashboard with token
      const dashRes = await fetch(`${baseUrl}/api/v1/admin/dashboard`, {
        headers: {
          Authorization: `Bearer ${body.data.token}`,
        },
      });

      const dashBody = await dashRes.json();
      assert.equal(dashRes.status, 200);
      assert.equal(dashBody.success, true);
      assert.ok(dashBody.data.totalProducts >= 8);
      assert.ok(dashBody.data.totalOrders >= 1);
    });
  });

  describe('7. Admin Saree Catalogue Management (Add, Edit, Inventory Flow)', () => {
    test('Admin successfully creates a new saree with full specifications and inventory movement', async () => {
      // 1. Login as Admin
      const loginRes = await fetch(`${baseUrl}/api/v1/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'admin@noolandnila.com',
          password: 'AdminPassword123!',
        }),
      });
      const loginData = await loginRes.json();
      const token = loginData.data.token;
      assert.ok(token);

      // 2. Fetch categories
      const catRes = await fetch(`${baseUrl}/api/v1/categories`);
      const catData = await catRes.json();
      const categoryId = catData.data[0].id;

      // 3. Post new saree
      const newSku = `NN-TEST-NEW-${Date.now()}`;
      const newSlug = `madhubani-handpainted-tussar-silk-${Date.now()}`;
      const createRes = await fetch(`${baseUrl}/api/v1/admin/products`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: 'Madhubani Handpainted Mulberry Tussar Silk Saree',
          slug: newSlug,
          sku: newSku,
          shortDescription: 'Exquisite hand-painted artisanal saree from master craftswomen.',
          description: 'A masterpiece created on pure handspun Tussar silk featuring intricate mythological folklore motifs.',
          fabric: 'Tussar Silk',
          weave: 'Tribal Handloom Weave',
          zariType: 'Antique Copper Zari',
          lengthMeters: 5.5,
          blouseIncluded: true,
          blouseDetails: 'Matching unstitched blouse piece (80cm) with border art included.',
          washCare: 'Dry clean only. Store wrapped in soft mulmul muslin cloth.',
          color: 'Ochre Mustard & Ink Blue',
          colorHex: '#C59A45',
          occasion: 'Festive & Art Gatherings',
          pricePaise: 2450000,
          mrpPaise: 2800000,
          stockQuantity: 4,
          isFeatured: true,
          isNewArrival: true,
          isActive: true,
          categoryId,
          images: [
            {
              url: '/images/sarees/mustard-tussar-silk.jpg',
              altText: 'Madhubani Handpainted Mulberry Tussar Silk Saree',
              displayOrder: 0,
            },
          ],
        }),
      });

      const createData = await createRes.json();
      assert.equal(createRes.status, 201, `Failed to create product: ${JSON.stringify(createData)}`);
      assert.equal(createData.success, true);
      assert.equal(createData.data.name, 'Madhubani Handpainted Mulberry Tussar Silk Saree');
      assert.equal(createData.data.sku, newSku);
      assert.equal(createData.data.stockQuantity, 4);
      assert.equal(createData.data.pricePaise, 2450000);

      const createdProductId = createData.data.id;

      // 4. Verify initial inventory movement was recorded
      const movement = await prisma.inventoryMovement.findFirst({
        where: { productId: createdProductId, reason: 'INITIAL_CREATION' },
      });
      assert.ok(movement);
      assert.equal(movement.quantityChange, 4);
      assert.equal(movement.newStock, 4);

      // 5. Verify customer storefront can view the newly added saree
      const customerViewRes = await fetch(`${baseUrl}/api/v1/products/${newSlug}`);
      const customerViewData = await customerViewRes.json();
      assert.equal(customerViewRes.status, 200);
      assert.equal(customerViewData.success, true);
      assert.equal(customerViewData.data.product.id, createdProductId);
      assert.equal(customerViewData.data.product.images.length, 1);

      // 6. Verify admin can update the saree (e.g. adjust price)
      const updateRes = await fetch(`${baseUrl}/api/v1/admin/products/${createdProductId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          pricePaise: 2550000,
        }),
      });
      const updateData = await updateRes.json();
      assert.equal(updateRes.status, 200);
      assert.equal(updateData.data.pricePaise, 2550000);
    });
  });

  describe('8. Admin Store Settings Persistence Across Refreshes', () => {
    test('Settings saved via PATCH /admin/settings persist in StoreSetting database table and reload on GET', async () => {
      // 1. Login as Admin
      const loginRes = await fetch(`${baseUrl}/api/v1/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'admin@noolandnila.com',
          password: 'AdminPassword123!',
        }),
      });
      const loginData = await loginRes.json();
      const token = loginData.data.token;
      assert.ok(token);

      // 2. Save custom store settings
      const updatedConfig = {
        storeName: 'Nool & Nila — Royal Silk Boutique',
        tagline: 'Timeless Weaves of Kanchipuram & Varanasi',
        whatsappNumber: '919876543210',
        supportEmail: 'contact@noolandnila.com',
        supportPhone: '+91 98450 11223',
        freeShippingThresholdPaise: 800000, // ₹8,000
        standardShippingFeePaise: 35000,    // ₹350
        lowStockThreshold: 4,
      };

      const patchRes = await fetch(`${baseUrl}/api/v1/admin/settings`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(updatedConfig),
      });

      const patchData = await patchRes.json();
      assert.equal(patchRes.status, 200);
      assert.equal(patchData.success, true);

      // 3. GET /admin/settings (simulating page reload) and verify persisted values
      const getRes = await fetch(`${baseUrl}/api/v1/admin/settings`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const getData = await getRes.json();
      assert.equal(getRes.status, 200);
      assert.equal(getData.success, true);
      assert.equal(getData.data.storeName, 'Nool & Nila — Royal Silk Boutique');
      assert.equal(getData.data.tagline, 'Timeless Weaves of Kanchipuram & Varanasi');
      assert.equal(getData.data.freeShippingThresholdPaise, 800000);
      assert.equal(getData.data.standardShippingFeePaise, 35000);
      assert.equal(getData.data.lowStockThreshold, 4);
    });
  });
});
