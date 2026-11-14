const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });
const { pool, query } = require("../config/db");
const returnRepository = require("../repositories/returnRepository");
const adminReturnRepository = require("../repositories/adminReturnRepository");

async function runTests() {
  console.log("=== Starting Sales Returns & Refunds Automated Verification Suite ===");
  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`✓ PASS: ${message}`);
      passed++;
    } else {
      console.error(`✗ FAIL: ${message}`);
      failed++;
    }
  }

  try {
    // 1. Verify Database Schema
    const tablesRes = await query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name IN ('sales_returns', 'sales_return_items', 'sales_return_images', 'sales_return_status_history')
    `);
    const existingTables = tablesRes.rows.map((r) => r.table_name);
    assert(existingTables.includes("sales_returns"), "sales_returns table exists");
    assert(existingTables.includes("sales_return_items"), "sales_return_items table exists");
    assert(existingTables.includes("sales_return_images"), "sales_return_images table exists");
    assert(existingTables.includes("sales_return_status_history"), "sales_return_status_history table exists");

    // 2. Fetch a seeded customer and order or create a mock delivered order for testing
    let userRes = await query("SELECT id, name, email FROM users WHERE role = 'CUSTOMER' LIMIT 1");
    if (!userRes.rows.length) {
      userRes = await query("SELECT id, name, email FROM users LIMIT 1");
    }
    const testUser = userRes.rows[0];
    assert(!!testUser, "Found test user: " + testUser?.email);

    let productRes = await query("SELECT id, name, price, cost_price FROM products LIMIT 1");
    const testProduct = productRes.rows[0];
    assert(!!testProduct, "Found test product: " + testProduct?.name);

    // Create a delivered order for testing return lifecycle
    const orderNumber = `TEST-RET-${Date.now().toString().slice(-6)}`;
    const orderRes = await query(
      `INSERT INTO orders (
        order_number, user_id, total_amount, grand_total, subtotal, shipping_fee, discount_total,
        status, payment_status, payment_method, shipping_address, delivered_at
      ) VALUES ($1, $2, $3, $3, $3, 0, 0, 'delivered', 'paid', 'cod', 'Test Address', NOW() - INTERVAL '2 days')
      RETURNING id, order_number`,
      [orderNumber, testUser.id, Number(testProduct.price || 1200) * 2]
    );
    const testOrder = orderRes.rows[0];
    assert(!!testOrder, `Created test delivered order: ${testOrder.order_number}`);

    const payRes = await query(
      `INSERT INTO payments (
        order_id, payment_method, provider, amount, currency, status
      ) VALUES ($1, 'cod', 'cod', $2, 'BDT', 'SUCCEEDED')
      RETURNING id`,
      [testOrder.id, Number(testProduct.price || 1200) * 2]
    );
    assert(!!payRes.rows[0]?.id, "Created test payment record");

    const itemRes = await query(
      `INSERT INTO order_items (
        order_id, product_id, product_name, quantity, unit_price, line_total, cost_price
      ) VALUES ($1, $2, $3, 2, $4, $5, $6)
      RETURNING id, product_name, quantity, unit_price, cost_price`,
      [
        testOrder.id,
        testProduct.id,
        testProduct.name,
        Number(testProduct.price || 1200),
        Number(testProduct.price || 1200) * 2,
        Number(testProduct.cost_price || 700),
      ]
    );
    const testOrderItem = itemRes.rows[0];
    assert(!!testOrderItem, `Created test order item with quantity 2`);

    // 3. Test Customer Eligibility
    const eligibility = await returnRepository.getOrderForReturn(testOrder.id, testUser.id);
    assert(eligibility.isWithinPolicy === true, "Order is eligible within 7-day delivery window");
    assert(eligibility.items.length === 1, "Eligibility lists 1 returnable item");
    assert(eligibility.items[0].returnableQty === 2, "Available to return is 2 units");

    // 4. Test Customer Return Creation with MFS
    const createdReturn = await returnRepository.createReturn({
      orderId: testOrder.id,
      customerId: testUser.id,
      reason: "DEFECTIVE_DAMAGED",
      customerNote: "Bottle pump was cracked and leaked during shipment",
      refundMethod: "MFS",
      refundAccountDetails: {
        provider: "bkash",
        account_number: "01712345678",
        account_type: "Personal",
      },
      items: [
        {
          orderItemId: testOrderItem.id,
          quantity: 1,
        },
      ],
      images: [
        {
          url: "https://res.cloudinary.com/eloura/image/upload/v1/evidence1.jpg",
          public_id: "eloura/returns/evidence1",
          file_hash: "abcd1234efgh5678",
        },
      ],
    });
    assert(!!createdReturn?.id, `Return created successfully with # ${createdReturn?.return_number}`);
    assert(createdReturn.status === "REQUESTED", "Initial status is REQUESTED");
    assert(Number(createdReturn.refund_amount) === Number(testOrderItem.unit_price), "Refund amount equals 1 unit price");

    // 5. Test Customer Privacy Guard
    const customerView = await returnRepository.getByIdForCustomer(createdReturn.id, testUser.id);
    assert(!("admin_note" in customerView), "Customer view strictly omits admin_note");
    assert(customerView.items.every((it) => !("unit_cost_price" in it)), "Customer items strictly omit unit_cost_price");
    assert(customerView.items.every((it) => !("cost_recovered_amount" in it)), "Customer items strictly omit cost_recovered_amount");

    // 6. Test Admin Flow: Request More Photos (INFO_NEEDED)
    await adminReturnRepository.updateStatus(
      createdReturn.id,
      "INFO_NEEDED",
      {
        infoNeededPrompt: "Please upload a clearer picture of the leaking seal and package box",
        note: "Additional photos requested by admin",
      }
    );
    let current = await adminReturnRepository.getById(createdReturn.id);
    assert(current.status === "INFO_NEEDED", "Status updated to INFO_NEEDED");
    assert(current.info_needed_prompt.includes("leaking seal"), "Info needed prompt recorded");

    // 7. Customer Uploads Additional Photos (shifts status back to REQUESTED)
    await returnRepository.addCustomerPhotos(createdReturn.id, testUser.id, [
      {
        url: "https://res.cloudinary.com/eloura/image/upload/v1/evidence2.jpg",
        public_id: "eloura/returns/evidence2",
        file_hash: "9876zyxw5432vuts",
      },
    ]);
    current = await adminReturnRepository.getById(createdReturn.id);
    assert(current.status === "REQUESTED", "Customer uploading extra photos resets status to REQUESTED");
    assert(current.images.length === 2, "Return now has 2 evidence photos");

    // 8. Admin Approves Return
    await adminReturnRepository.updateStatus(createdReturn.id, "APPROVED", {
      adminNote: "Claim approved under policy rule for damaged pump",
    });
    current = await adminReturnRepository.getById(createdReturn.id);
    assert(current.status === "APPROVED", "Status updated to APPROVED");

    // 9. Admin Progression: Pickup Scheduled -> In Transit -> Received
    await adminReturnRepository.updateStatus(createdReturn.id, "PICKUP_SCHEDULED");
    await adminReturnRepository.updateStatus(createdReturn.id, "IN_TRANSIT");
    await adminReturnRepository.updateStatus(createdReturn.id, "RECEIVED");
    current = await adminReturnRepository.getById(createdReturn.id);
    assert(current.status === "RECEIVED", "Status updated to RECEIVED at warehouse");
    assert(!!current.received_at, "received_at timestamp recorded");

    // 10. Warehouse Inspection: Condition DAMAGED with 0 Cost Recovery
    const returnItemId = current.items[0].id;
    await adminReturnRepository.saveInspection(createdReturn.id, {
      itemConditions: [
        {
          returnItemId,
          condition: "DAMAGED",
          costRecoveredAmount: 0,
        },
      ],
      adminNote: "Warehouse confirmed bottle is leaking, discarded per bio-safety policy",
      inspectionImages: [
        {
          image_url: "https://res.cloudinary.com/eloura/image/upload/v1/inspection1.jpg",
          public_id: "eloura/returns/inspections/insp1",
        },
      ],
    });
    current = await adminReturnRepository.getById(createdReturn.id);
    assert(current.status === "INSPECTED", "Status updated to INSPECTED");
    assert(current.items[0].item_condition === "DAMAGED", "Item condition marked as DAMAGED");
    assert(Number(current.items[0].cost_recovered_amount) === 0, "Cost recovered amount is 0");

    // 11. Process Refund Disbursement
    const refundResult = await adminReturnRepository.processRefund(createdReturn.id, {
      refundMethod: "MFS",
      refundAccountDetails: {
        provider: "bkash",
        account_number: "01712345678",
        trx_id: "BL9A7K8J299",
      },
      returnShippingFee: 60,
      returnShippingPayer: "STORE",
      adminNote: "Disbursed ৳" + current.refund_amount + " via bKash Merchant TrxID BL9A7K8J299",
    });
    assert(refundResult.status === "REFUNDED", "Return status transitioned to REFUNDED");

    // 12. Check payment_refunds and order_other_costs insertion
    const refundRecordRes = await query("SELECT * FROM payment_refunds WHERE reason LIKE $1", [
      `%${createdReturn.return_number}%`,
    ]);
    assert(refundRecordRes.rows.length >= 1, "Refund entry recorded in payment_refunds table");

    const otherCostRes = await query("SELECT * FROM order_other_costs WHERE order_id = $1 AND header = 'Return Shipping'", [
      testOrder.id,
    ]);
    assert(otherCostRes.rows.length >= 1, "Return Shipping recorded in order_other_costs table");

    // 13. Complete Return
    await adminReturnRepository.updateStatus(createdReturn.id, "COMPLETED");
    current = await adminReturnRepository.getById(createdReturn.id);
    assert(current.status === "COMPLETED", "Return marked as COMPLETED");
    assert(!!current.completed_at, "completed_at timestamp recorded");

    // 14. Verify Audit History
    assert(current.history.length >= 7, `Audit history tracked ${current.history.length} lifecycle transitions`);

    // Cleanup test order & return
    await query("DELETE FROM payment_refunds WHERE reason LIKE $1", [`%${createdReturn.return_number}%`]);
    await query("DELETE FROM payments WHERE order_id = $1", [testOrder.id]);
    await query("DELETE FROM sales_returns WHERE id = $1", [createdReturn.id]);
    await query("DELETE FROM order_items WHERE order_id = $1", [testOrder.id]);
    await query("DELETE FROM order_other_costs WHERE order_id = $1", [testOrder.id]);
    await query("DELETE FROM orders WHERE id = $1", [testOrder.id]);
    console.log("Cleaned up test data.");

    console.log(`\n========================================`);
    console.log(`Total Checks: ${passed + failed} | Passed: ${passed} | Failed: ${failed}`);
    console.log(`========================================\n`);

    if (failed > 0) {
      process.exit(1);
    }
  } catch (err) {
    console.error("Test execution failed:", err);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runTests();
