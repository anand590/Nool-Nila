# Nool & Nila — REST API Documentation

**Base URL**: `http://localhost:5000/api/v1` (or your deployed production API URL)  
**Protocol**: HTTPS (in production)  
**Response Format**: `application/json`  
**Authentication**: HTTP-only session cookie (`token`) or `Authorization: Bearer <token>` header.

---

## 1. Standard Response Formats

### Success Response
```json
{
  "success": true,
  "data": { ... },
  "message": "Optional descriptive message"
}
```

### Error Response
```json
{
  "success": false,
  "error": "Human-readable error message",
  "details": [ ... ]
}
```

---

## 2. Health Check

### `GET /health`
Returns the status of the API server and database connection.

- **Access**: Public
- **Response**:
```json
{
  "success": true,
  "status": "healthy",
  "service": "Nool & Nila API",
  "version": "1.0.0",
  "timestamp": "2026-10-21T12:00:00.000Z"
}
```

---

## 3. Authentication (`/auth`)

### `POST /auth/register`
Registers a new customer account.

- **Access**: Public
- **Request Body**:
```json
{
  "name": "Ananya Krishnan",
  "email": "ananya@example.com",
  "password": "SecurePassword123!",
  "phone": "9876543210"
}
```
- **Response**: `201 Created` with User object and HTTP-only cookie set.

### `POST /auth/login`
Authenticates an existing customer or administrator.

- **Access**: Public
- **Request Body**:
```json
{
  "email": "ananya@example.com",
  "password": "SecurePassword123!"
}
```
- **Response**: `200 OK` with User details and JWT cookie.

### `POST /auth/logout`
Clears the authentication cookie and ends the session.

- **Access**: Public / Authenticated
- **Response**: `200 OK`

### `GET /auth/me`
Retrieves profile information for the currently authenticated user.

- **Access**: Authenticated (`User` or `Admin`)
- **Response**: `200 OK` with user profile object.

### `POST /auth/forgot-password`
Generates a password reset token. (Sends reset email if SMTP provider is configured, or logs in development).

- **Access**: Public
- **Request Body**:
```json
{
  "email": "ananya@example.com"
}
```

### `POST /auth/reset-password`
Resets the user's password using the verified reset token.

- **Access**: Public
- **Request Body**:
```json
{
  "token": "reset-token-uuid",
  "newPassword": "NewSecurePassword123!"
}
```

---

## 4. Catalogue & Products (`/products`, `/categories`)

### `GET /products`
Retrieves a paginated list of active sarees with advanced filtering and sorting.

- **Access**: Public
- **Query Parameters**:
  - `page` *(number, default: 1)*
  - `limit` *(number, default: 12)*
  - `search` *(string, matches name, SKU, weave, or description)*
  - `category` *(string, category slug e.g. "silk-sarees")*
  - `fabric` *(string e.g. "Kanjivaram Silk", "Banarasi Silk")*
  - `minPrice` *(number, in INR)*
  - `maxPrice` *(number, in INR)*
  - `inStock` *(boolean)*
  - `sort` *(string: `newest`, `price-asc`, `price-desc`, `featured`)*
- **Response**: `200 OK`
```json
{
  "success": true,
  "data": {
    "products": [ ... ],
    "pagination": {
      "page": 1,
      "limit": 12,
      "total": 8,
      "totalPages": 1
    }
  }
}
```

### `GET /products/:slug`
Retrieves full details for an individual saree by its URL slug.

- **Access**: Public
- **Response**: `200 OK` includes product images, categories, and inventory status.

### `GET /categories`
Lists all active saree categories with product counts.

- **Access**: Public
- **Response**: `200 OK`

### `GET /categories/:slug`
Retrieves an individual category's details along with its products.

- **Access**: Public
- **Response**: `200 OK`

---

## 5. Shopping Bag / Cart (`/cart`)

The shopping bag supports both anonymous guest sessions (`x-session-id` header) and authenticated accounts. When a guest logs in, their cart is seamlessly merged.

### `GET /cart`
Fetches the current user's or guest's cart with recalculation of prices from the active database.

- **Headers**: `x-session-id: <uuid>` (for guests)
- **Response**: `200 OK` with cart items, subtotal in paise, and item count.

### `POST /cart/items`
Adds a product to the cart with strict stock availability validation.

- **Request Body**:
```json
{
  "productId": "prod_cm1...",
  "quantity": 1
}
```
- **Response**: `200 OK`

### `PATCH /cart/items/:id`
Updates the quantity of an item in the cart.

- **Request Body**:
```json
{
  "quantity": 2
}
```

### `DELETE /cart/items/:id`
Removes an item from the cart.

- **Response**: `200 OK`

---

## 6. Wishlist (`/wishlist`)

### `GET /wishlist`
Returns saved wishlist products for the authenticated user.

- **Access**: Authenticated

### `POST /wishlist/items`
Saves a product to the user's wishlist.

- **Request Body**:
```json
{
  "productId": "prod_cm1..."
}
```

### `DELETE /wishlist/items/:id`
Removes a saved product from the wishlist.

---

## 7. Customer Orders (`/orders`)

*Notice: Online payment processing is intentionally excluded in Phase 1. Submitting an order creates an order request in `PENDING_CONFIRMATION` status.*

### `POST /orders/request`
Submits a manual order request. Atomically reserves stock, snapshots item prices, and generates a unique order reference (`NN-YYYY-XXXX`).

- **Access**: Public (Guests provide guest contact details; authenticated users link to their account)
- **Request Body**:
```json
{
  "customerName": "Sunita Rao",
  "customerEmail": "sunita.rao@example.com",
  "customerPhone": "9845012345",
  "shippingAddress": {
    "addressLine1": "Flat 402, Lotus Grandeur, 12th Main",
    "addressLine2": "Indiranagar",
    "city": "Bengaluru",
    "state": "Karnataka",
    "postalCode": "560038",
    "country": "India"
  },
  "customerNotes": "Please pack with extra tissue for gifting."
}
```
- **Response**: `201 Created`
```json
{
  "success": true,
  "data": {
    "order": {
      "id": "ord_...",
      "orderNumber": "NN-2026-9508",
      "status": "PENDING_CONFIRMATION",
      "paymentStatus": "NOT_APPLICABLE",
      "totalAmount": 4200000,
      "items": [ ... ]
    },
    "whatsAppUrl": "https://wa.me/919876543210?text=..."
  }
}
```

### `GET /orders`
Lists the authenticated user's order history.

- **Access**: Authenticated

### `GET /orders/:id`
Retrieves detailed information for a specific order request.

- **Access**: Authenticated (Owner or Admin)

---

## 8. Admin Management (`/admin`)

*All `/admin` endpoints require authentication with role `ADMIN`.*

### `GET /admin/dashboard`
Calculates real database metrics: total orders, pending confirmations, confirmed orders, active catalogue count, low stock warnings, and recent order submissions.

### `GET /admin/products`
Lists all products including drafts and out-of-stock items with inventory levels.

### `POST /admin/products`
Creates a new saree listing with weave details, zari type, saree length, blouse piece details, and images.

### `PATCH /admin/products/:id`
Updates an existing product's pricing, images, attributes, or active status.

### `DELETE /admin/products/:id`
Deactivates or soft-deletes a product.

### `GET /admin/orders`
Retrieves all customer order requests with filtering by order status (`PENDING_CONFIRMATION`, `CONFIRMED`, `SHIPPED`, etc.).

### `PATCH /admin/orders/:id/status`
Updates an order request's status along with fulfillment notes and shipping courier tracking numbers.
- **Request Body**:
```json
{
  "status": "CONFIRMED",
  "fulfillmentNotes": "Customer verified via phone. Offline payment confirmed via NEFT.",
  "trackingNumber": "DELHIVERY98765432"
}
```

### `GET /admin/inventory`
Lists all sarees with current stock, low stock thresholds, and recent audit inventory movements.

### `POST /admin/inventory/adjustments`
Performs a manual stock adjustment with an immutable reason (e.g. "Weaver shipment received", "Display piece damage").

### `POST /admin/upload`
Uploads a high-resolution saree photograph to Cloudinary (or stores locally if Cloudinary credentials are not configured).

### `GET /admin/settings` & `PATCH /admin/settings`
Reads and updates boutique store configuration, free shipping threshold, and WhatsApp business contact number.
