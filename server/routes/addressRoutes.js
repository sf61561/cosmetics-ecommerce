const express = require("express");
const { authenticate } = require("../middlewares/authMiddleware");
const { query } = require("../config/db");

const router = express.Router();
router.use(authenticate);

router.get("/", async (req, res, next) => {
  try {
    const result = await query(
      `SELECT id, label, recipient_name, phone, division, district, area, street_address,
              postal_code, is_default
       FROM addresses WHERE user_id = $1 ORDER BY is_default DESC, created_at DESC`,
      [req.user.id]
    );
    res.json({ success: true, data: result.rows });
  } catch (error) {
    next(error);
  }
});

router.post("/", async (req, res, next) => {
  try {
    const { label = "Home", recipientName, phone, division, district, area, streetAddress, postalCode, isDefault = true } = req.body;
    if (![recipientName, phone, division, district, area, streetAddress].every((value) => typeof value === "string" && value.trim())) {
      const error = new Error("Recipient, phone, division, district, area, and street address are required.");
      error.status = 400;
      return next(error);
    }
    const client = await require("../config/db").getClient();
    try {
      await client.query("BEGIN");
      if (isDefault) await client.query("UPDATE addresses SET is_default = false WHERE user_id = $1", [req.user.id]);
      const result = await client.query(
        `INSERT INTO addresses
         (user_id, label, recipient_name, phone, division, district, area, street_address, postal_code, is_default)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
         RETURNING id, label, recipient_name, phone, division, district, area, street_address, postal_code, is_default`,
        [req.user.id, label.trim(), recipientName.trim(), phone.trim(), division.trim(), district.trim(), area.trim(), streetAddress.trim(), postalCode?.trim() || null, Boolean(isDefault)]
      );
      await client.query("COMMIT");
      res.status(201).json({ success: true, data: result.rows[0] });
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    next(error);
  }
});

router.patch("/:id", async (req, res, next) => {
  try {
    const { label = "Home", recipientName, phone, division, district, area, streetAddress, postalCode, isDefault = false } = req.body;
    if (![recipientName, phone, division, district, area, streetAddress].every((value) => typeof value === "string" && value.trim())) {
      const error = new Error("Recipient, phone, division, district, area, and street address are required.");
      error.status = 400;
      throw error;
    }
    const client = await require("../config/db").getClient();
    try {
      await client.query("BEGIN");
      if (isDefault) await client.query("UPDATE addresses SET is_default = false WHERE user_id = $1", [req.user.id]);
      const result = await client.query(
        `UPDATE addresses SET label=$1, recipient_name=$2, phone=$3, division=$4, district=$5,
         area=$6, street_address=$7, postal_code=$8, is_default=$9, updated_at=NOW()
         WHERE id=$10 AND user_id=$11
         RETURNING id, label, recipient_name, phone, division, district, area, street_address, postal_code, is_default`,
        [label.trim(), recipientName.trim(), phone.trim(), division.trim(), district.trim(), area.trim(), streetAddress.trim(), postalCode?.trim() || null, Boolean(isDefault), req.params.id, req.user.id]
      );
      if (!result.rows[0]) {
        const error = new Error("Address not found.");
        error.status = 404;
        throw error;
      }
      await client.query("COMMIT");
      res.json({ success: true, data: result.rows[0] });
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    next(error);
  }
});

router.delete("/:id", async (req, res, next) => {
  try {
    const result = await require("../config/db").query(
      "DELETE FROM addresses WHERE id = $1 AND user_id = $2 RETURNING id",
      [req.params.id, req.user.id]
    );
    if (!result.rows[0]) return res.status(404).json({ success: false, message: "Address not found." });
    res.json({ success: true, message: "Address deleted." });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
