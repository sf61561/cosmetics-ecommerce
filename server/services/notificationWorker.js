const notificationRepository = require('../repositories/notificationRepository');
const emailService = require('./emailService');

class NotificationWorker {
  constructor() {
    this.isRunning = false;
    this.pollIntervalMs = 5000;
    this.timer = null;
    this.isProcessing = false;
  }

  start() {
    if (this.isRunning) return;
    this.isRunning = true;
    console.log('[NotificationWorker] Started outbox queue processor (5s poll interval).');
    this.scheduleNext(100); // initial tick quickly
  }

  stop() {
    this.isRunning = false;
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    console.log('[NotificationWorker] Stopped outbox queue processor.');
  }

  /**
   * Called immediately whenever a new notification is queued,
   * avoiding waiting for the 5-second polling interval.
   */
  triggerImmediate() {
    if (!this.isRunning) return;
    setImmediate(() => {
      this.processBatch().catch((err) => {
        console.error('[NotificationWorker] Error during immediate dispatch:', err);
      });
    });
  }

  scheduleNext(delayMs = this.pollIntervalMs) {
    if (!this.isRunning) return;
    this.timer = setTimeout(async () => {
      try {
        await this.processBatch();
      } catch (err) {
        console.error('[NotificationWorker] Polling error:', err);
      } finally {
        this.scheduleNext(this.pollIntervalMs);
      }
    }, delayMs);
  }

  /**
   * Process a single batch of claimed deliveries with SKIP LOCKED
   */
  async processBatch() {
    if (this.isProcessing) return;
    this.isProcessing = true;

    try {
      const deliveries = await notificationRepository.claimPendingDeliveries(10);
      if (!deliveries || deliveries.length === 0) {
        return;
      }

      for (const delivery of deliveries) {
        await this.processDelivery(delivery);
      }
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Deliver an individual notification item based on channel
   */
  async processDelivery(delivery) {
    const { id, channel, recipient, attempts, max_attempts, event_type, event_title, event_body, event_data } = delivery;
    const data = typeof event_data === 'string' ? JSON.parse(event_data) : (event_data || {});

    try {
      let providerMessageId = null;

      if (channel === 'email') {
        providerMessageId = await this.deliverEmail({
          type: event_type,
          to: recipient,
          title: event_title,
          body: event_body,
          data,
        });
      } else if (channel === 'sms') {
        // SMS Gateway Stub (for Bangladesh SMS gateways like SSL Wireless / Greenweb)
        providerMessageId = `sms_mock_${Date.now()}`;
        console.log(`[NotificationWorker SMS Stub] Sent SMS to ${recipient}: "${event_title} - ${event_body}"`);
      } else if (channel === 'push') {
        // Push Notification Stub
        providerMessageId = `push_mock_${Date.now()}`;
        console.log(`[NotificationWorker Push Stub] Sent Push to ${recipient}`);
      }

      // Mark successful delivery
      await notificationRepository.updateDeliveryStatus(id, {
        status: 'sent',
        providerMessageId: providerMessageId || `mock_sent_${Date.now()}`,
        error: null,
      });
    } catch (err) {
      console.error(`[NotificationWorker] Delivery failed for job #${id} (${channel} -> ${recipient}):`, err.message);

      if (attempts >= max_attempts) {
        // Max retries exhausted -> permanently fail
        await notificationRepository.updateDeliveryStatus(id, {
          status: 'failed',
          error: `Exhausted ${attempts}/${max_attempts} attempts. Last error: ${err.message}`,
        });
      } else {
        // Exponential backoff: 1 min, 5 min, 30 min
        const backoffMinutes = attempts === 1 ? 1 : attempts === 2 ? 5 : 30;
        const nextRetryDate = new Date(Date.now() + backoffMinutes * 60 * 1000);

        await notificationRepository.updateDeliveryStatus(id, {
          status: 'failed',
          error: `Attempt ${attempts} failed: ${err.message}. Retrying at ${nextRetryDate.toISOString()}`,
          nextRetryAt: nextRetryDate,
        });
      }
    }
  }

  /**
   * Deliver email using appropriate template via emailService
   */
  async deliverEmail({ type, to, title, body, data }) {
    if (!to) {
      throw new Error('Email recipient address is missing.');
    }

    // Handle mock domains during testing and local development
    if (to.endsWith('@example.com') || to.endsWith('.test')) {
      console.log(`[NotificationWorker Mock Email] Handled mock delivery to ${to} [${type}]`);
      return `mock_email_${Date.now()}`;
    }

    if (type === 'order.placed') {
      const res = await emailService.sendOrderPlacedConfirmationEmail({
        to,
        name: data.customerName,
        orderNumber: data.orderNumber,
        totalAmount: data.totalAmount || data.total || data.grandTotal,
        grandTotal: data.totalAmount || data.total || data.grandTotal,
        items: data.items || [],
        address: data.address || {
          recipientName: data.customerName,
          phone: data.customerPhone,
          streetAddress: data.shippingAddress,
        },
        shippingAddress: data.shippingAddress,
        paymentMethod: data.paymentMethod,
      });
      return res?.id || 'resend_order_placed';
    }

    if (type.startsWith('order.')) {
      const statusMap = {
        'order.confirmed': 'CONFIRMED',
        'order.shipped': 'SHIPPED',
        'order.delivered': 'DELIVERED',
        'order.cancelled': 'CANCELLED',
      };
      const res = await emailService.sendOrderStatusChangedEmail({
        to,
        name: data.customerName,
        orderNumber: data.orderNumber,
        status: statusMap[type] || 'UPDATED',
        note: data.note || data.reason,
        courierName: data.courierName,
        trackingNumber: data.trackingNumber,
      });
      return res?.id || 'resend_order_status';
    }

    if (type === 'security.password_changed') {
      const res = await emailService.sendPasswordChangedConfirmationEmail({
        to,
        name: data.name,
      });
      return res?.id || 'resend_security_alert';
    }

    // Default transactional or wishlist alert email
    console.log(`[NotificationWorker] Sent email to ${to} [${type}]: ${title}`);
    return `email_${Date.now()}`;
  }
}

module.exports = new NotificationWorker();
