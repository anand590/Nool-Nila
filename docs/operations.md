# Nool & Nila — Operations & Administration Guide

This standard operating procedure (SOP) outlines operational workflows for the boutique owner, store managers, and system administrators running **Nool & Nila**.

---

## 1. Initial Admin Bootstrap & Credential Rotation

### Default Seed Administrator
During initial database setup or local development, the seed script provisions a root administrator:
- **Email**: `admin@noolandnila.com`
- **Password**: `AdminPassword123!`

### Production Password Rotation Procedure
Before taking the boutique live:
1. Log in to the storefront at `/login`.
2. Open the Admin Dashboard at `/admin`.
3. In production, change the administrator password immediately or create a dedicated owner account via the database seed script with strong bcrypt-hashed credentials.
4. Never share root admin credentials via unencrypted messaging apps.

---

## 2. Order Workflow & Fulfillment SOP

Because online payment processing is intentionally deferred to Phase 2, Nool & Nila operates on an authentic luxury concierge model:

```
[ Customer Submits Order Request ]
                 │
                 ▼
     [ PENDING_CONFIRMATION ]
  (Stock reserved, ref: NN-YYYY-XXXX)
                 │
                 ├───────────────────────────────┐
                 ▼                               ▼
    [ Admin Contacts Customer ]         [ Stock Unavailable ]
      (WhatsApp / Phone Call)                    │
      - Confirm delivery address                 ▼
      - Share offline payment info          [ REJECTED ]
        (Bank NEFT / UPI ID)             (Stock auto-released)
                 │
                 ▼
       [ Customer Remits Payment ]
                 │
                 ▼
           [ CONFIRMED ]
                 │
                 ▼
           [ PROCESSING ]
   (Handloom inspection & gift packaging)
                 │
                 ▼
             [ SHIPPED ]
  (Courier dispatch + tracking number recorded)
                 │
                 ▼
           [ DELIVERED ]
```

### Step-by-Step Order Management:
1. **Review Pending Requests**:
   - Navigate to `/admin/orders`.
   - Filter by status: `PENDING_CONFIRMATION`.
2. **Inspect Saree Stock & Address**:
   - Verify the requested saree's physical condition in the boutique inventory.
   - Click "Inspect Order" to review delivery address and customer notes.
3. **Engage Customer via WhatsApp**:
   - Use the pre-filled WhatsApp click-to-chat link with the order reference.
   - Example message:
     > *"Namaste [Customer Name], thank you for your order request [Order Number] for the [Saree Name]. We have reserved your piece. To confirm, please transfer ₹[Amount] to our boutique bank account [Account/UPI Details]."*
4. **Update Status to `CONFIRMED`**:
   - Once payment is verified offline, click **Confirm Order**.
   - Input fulfillment notes (e.g., *"NEFT Ref #123456 verified by Anand"*).
5. **Dispatch & Tracking**:
   - Package saree with silk care card and authentication certificate.
   - Hand over to courier (Blue Dart, Delhivery, or Speed Post).
   - In `/admin/orders`, update status to `SHIPPED` and enter the **Courier Name & Tracking Number**.
   - The customer can view their tracking number directly on `/account/orders`.

---

## 3. Inventory Reconciliation & Audits

Handloom sarees are often unique single weaves or limited artisanal productions. Accurate stock tracking is critical.

### Viewing Inventory
- Navigate to `/admin/inventory`.
- Low-stock warnings are highlighted automatically when inventory falls below the threshold (default: 2 pieces).

### Manual Stock Adjustments
When new handloom lots arrive from master weavers:
1. Navigate to `/admin/inventory`.
2. Click **Adjust Stock** on the respective saree.
3. Select operation: `ADD` or `SUBTRACT`.
4. Enter quantity and a mandatory **Audit Reason** (e.g. *"Consignment #402 received from Kanchipuram master weavers"*).
5. Submit to append an immutable record to the `InventoryMovement` audit log.

---

## 4. Database Backup & Disaster Recovery

### Managed PostgreSQL Backups
For production deployments (Supabase, Neon, AWS RDS):
- **Automated Daily Backups**: Ensure automated Point-In-Time Recovery (PITR) is enabled in your cloud database provider console.
- **Manual Database Dump**:
  ```bash
  # Create a timestamped SQL dump
  pg_dump "$DATABASE_URL" -F c -b -v -f "nool_and_nila_backup_$(date +%Y%m%d_%H%M%S).dump"
  ```
- **Database Restore**:
  ```bash
  pg_restore -d "$DATABASE_URL" -v "nool_and_nila_backup_YYYYMMDD_HHMMSS.dump"
  ```

### Local Development SQLite Backup
For local development or testing:
```powershell
# Copy the SQLite database file
Copy-Item "apps\api\dev.db" "apps\api\dev_backup_$(Get-Date -Format 'yyyyMMdd_HHmmss').db"
```

---

## 5. Security & Audit Procedures

1. **Session Invalidation**:
   - Logging out invalidates the HTTP-only cookie immediately.
   - Administrators can force token revocation by updating the `SESSION_SECRET` environment variable in production.
2. **Access Control Verification**:
   - Non-admin customers attempting to hit `/admin` or `/api/v1/admin/*` are automatically rejected with `403 Forbidden`.
3. **No Payment Secrets Stored**:
   - Since Phase 1 uses manual offline verification, no customer credit card numbers, CVVs, or UPI PINs are ever transmitted or stored in the database.
