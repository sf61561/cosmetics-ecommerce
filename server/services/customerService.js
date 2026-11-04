const customerRepository = require("../repositories/customerRepository");
const userRepository = require("../repositories/userRepository");
const { getClient } = require("../config/db");
const auditService = require("./auditService");

class CustomerService {
  /**
   * List customers with pagination, filters, and dynamic summary KPIs
   */
  async getCustomers(params = {}) {
    const listResult = await customerRepository.findCustomers(params);
    const summary = await customerRepository.getSummaryCounts();
    return {
      customers: listResult.customers,
      pagination: listResult.pagination,
      summary,
    };
  }

  /**
   * Get single customer by ID
   */
  async getCustomerById(id) {
    if (!id) {
      const error = new Error("Customer ID is required.");
      error.status = 400;
      throw error;
    }

    const customer = await customerRepository.findById(id);
    if (!customer) {
      const error = new Error("Customer not found.");
      error.status = 404;
      throw error;
    }
    return customer;
  }

  /**
   * Update permitted customer profile fields (name, phone)
   * Strictly rejects unauthorized fields (role, password, email_verified_at, etc.)
   */
  async updateCustomerProfile(id, data, adminUser, request = null) {
    if (!id) {
      const error = new Error("Customer ID is required.");
      error.status = 400;
      throw error;
    }

    // Verify customer exists
    const existing = await customerRepository.findById(id);
    if (!existing) {
      const error = new Error("Customer not found.");
      error.status = 404;
      throw error;
    }

    // Detect illegal unauthorized field injections
    const unauthorizedFields = [
      "role",
      "password",
      "password_hash",
      "passwordHash",
      "email_verified_at",
      "emailVerifiedAt",
      "refresh_token",
      "refreshToken",
      "oauth_id",
      "oauthId",
      "authprovider",
      "authProvider",
      "status",
    ];

    for (const key of unauthorizedFields) {
      if (data[key] !== undefined) {
        const error = new Error(`Modification of field '${key}' is unauthorized.`);
        error.status = 400;
        throw error;
      }
    }

    // Validate phone uniqueness if changed
    if (data.phone && data.phone.trim()) {
      const trimmedPhone = data.phone.trim();
      const existingPhoneUser = await userRepository.findByPhone(trimmedPhone);
      if (existingPhoneUser && existingPhoneUser.id !== id) {
        const error = new Error("An account with this phone number already exists.");
        error.status = 409;
        error.field = "phone";
        throw error;
      }
    }

    const client = await getClient();
    try {
      await client.query("BEGIN");
      const locked = await client.query("SELECT id FROM users WHERE id = $1 AND role = 'CUSTOMER' FOR UPDATE", [id]);
      if (!locked.rows[0]) {
        const error = new Error("Customer not found.");
        error.status = 404;
        throw error;
      }
      const changedFields = ["name", "phone"].filter((field) => data[field] !== undefined);
      const updated = await customerRepository.updateProfile(id, { name: data.name, phone: data.phone }, client);
      if (changedFields.length) {
        await auditService.record({
          actor: adminUser,
          action: "CUSTOMER_PROFILE_UPDATED",
          entityType: "USER",
          entityId: id,
          previousValues: { changedFields: [] },
          newValues: { changedFields },
          metadata: { changedFields },
        }, { client, request });
      }
      await client.query("COMMIT");
      return updated;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Update customer account status (ACTIVE / BLOCKED)
   * Enforces self-blocking and admin-privilege protection guards
   */
  async updateCustomerStatus(id, status, adminUser, request = null) {
    if (!id) {
      const error = new Error("Customer ID is required.");
      error.status = 400;
      throw error;
    }

    const upperStatus = status ? status.toUpperCase() : "";
    if (!["ACTIVE", "BLOCKED"].includes(upperStatus)) {
      const error = new Error(`Invalid status '${status}'. Must be ACTIVE or BLOCKED.`);
      error.status = 400;
      throw error;
    }

    const targetUser = await customerRepository.findAnyUserById(id);
    if (!targetUser) {
      const error = new Error("User not found.");
      error.status = 404;
      throw error;
    }

    // Prevent self-blocking
    if (adminUser && adminUser.id === id) {
      const error = new Error("You cannot change the status of your own administrative account.");
      error.status = 400;
      throw error;
    }

    // Prevent modifying ADMIN accounts through customer endpoints
    if (targetUser.role === "ADMIN") {
      const error = new Error("Administrative accounts cannot be modified through customer management.");
      error.status = 403;
      throw error;
    }

    const client = await getClient();
    try {
      await client.query("BEGIN");
      const locked = await client.query("SELECT status FROM users WHERE id = $1 AND role = 'CUSTOMER' FOR UPDATE", [id]);
      if (!locked.rows[0]) {
        const error = new Error("Customer not found.");
        error.status = 404;
        throw error;
      }
      const previousStatus = locked.rows[0].status;
      const updated = await customerRepository.updateStatus(id, upperStatus, client);
      if (previousStatus !== upperStatus) {
        await auditService.record({
          actor: adminUser,
          action: "CUSTOMER_STATUS_CHANGED",
          entityType: "USER",
          entityId: id,
          previousValues: { status: previousStatus },
          newValues: { status: upperStatus },
        }, { client, request });
      }
      await client.query("COMMIT");
      return updated;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get customer orders
   */
  async getCustomerOrders(id, params) {
    await this.getCustomerById(id);
    return customerRepository.getCustomerOrders(id, params);
  }

  /**
   * Get customer wishlist items
   */
  async getCustomerWishlist(id, params) {
    await this.getCustomerById(id);
    return customerRepository.getCustomerWishlist(id, params);
  }

  /**
   * Get customer recent activity
   */
  async getCustomerActivity(id, params) {
    await this.getCustomerById(id);
    return customerRepository.getCustomerActivity(id, params);
  }

  /**
   * Get customer saved delivery addresses
   */
  async getCustomerAddresses(id) {
    await this.getCustomerById(id);
    return customerRepository.getCustomerAddresses(id);
  }

  /**
   * Generate sanitized CSV export with formula injection mitigation
   */
  async generateCustomerCsv(params = {}) {
    const customers = await customerRepository.exportCustomers(params);

    const headers = [
      "Customer ID",
      "Full Name",
      "Email Address",
      "Phone Number",
      "Account Status",
      "Email Verified",
      "Joined Date",
      "Total Qualifying Orders",
      "Total Spent (BDT)",
    ];

    // CSV Formula injection protection helper
    const escapeCsvValue = (val) => {
      if (val === null || val === undefined) return '""';
      let str = String(val);

      // Prepend single quote if formula trigger character detected
      if (/^[=+\-@\t\r]/.test(str)) {
        str = `'${str}`;
      }

      // Escape quotes by doubling them
      str = str.replace(/"/g, '""');
      return `"${str}"`;
    };

    const rows = customers.map((c) => [
      escapeCsvValue(c.id),
      escapeCsvValue(c.name),
      escapeCsvValue(c.email || "N/A"),
      escapeCsvValue(c.phone || "N/A"),
      escapeCsvValue(c.status),
      escapeCsvValue(c.emailVerified ? "Yes" : "No"),
      escapeCsvValue(c.createdAt ? new Date(c.createdAt).toISOString().split("T")[0] : ""),
      escapeCsvValue(c.orderCount),
      escapeCsvValue(c.totalSpent.toFixed(2)),
    ]);

    const csvContent = [
      headers.map((h) => `"${h}"`).join(","),
      ...rows.map((r) => r.join(",")),
    ].join("\r\n");

    return csvContent;
  }
}

module.exports = new CustomerService();

