/**
 * Middleware to validate registration input
 */
function validateRegister(req, res, next) {
  const {
    fullName,
    name,
    phone,
    email,
    password,
    confirmPassword,
    agreedToTerms,
    terms,
    authProvider
  } = req.body || {};

  const customerName = (fullName || name || "").trim();
  const customerPhone = (phone || "").trim();
  const customerEmail = email ? email.trim().toLowerCase() : null;
  const hasAgreed = agreedToTerms ?? terms ?? false;

  // 1. Full name validation
  if (!customerName) {
    return res.status(400).json({
      success: false,
      message: "Full name is required.",
      field: "fullName",
    });
  }

  if (customerName.length < 2 || customerName.length > 100) {
    return res.status(400).json({
      success: false,
      message: "Full name must be between 2 and 100 characters.",
      field: "fullName",
    });
  }

  // 2. Phone number validation (required, used for delivery communication)
  if (!customerPhone) {
    return res.status(400).json({
      success: false,
      message: "Phone number is required.",
      field: "phone",
    });
  }

  const phoneRegex = /^\+?[0-9\s\-()]{7,20}$/;
  if (!phoneRegex.test(customerPhone)) {
    return res.status(400).json({
      success: false,
      message: "Please provide a valid phone number (e.g. +8801700000000).",
      field: "phone",
    });
  }

  // 3. Email address validation (optional contact information)
  if (customerEmail) {
    if (/^www\./i.test(customerEmail)) {
      return res.status(400).json({
        success: false,
        message: "Email address cannot start with 'www.'. Please remove 'www.' from the beginning.",
        field: "email",
      });
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(customerEmail)) {
      return res.status(400).json({
        success: false,
        message: "Please provide a valid email address.",
        field: "email",
      });
    }
  }

  // 4. Password validation
  if (!password) {
    return res.status(400).json({
      success: false,
      message: "Password is required.",
      field: "password",
    });
  }

  if (password.length < 8) {
    return res.status(400).json({
      success: false,
      message: "Password must be at least 8 characters long.",
      field: "password",
    });
  }

  // 5. Confirm password check (if provided in the payload)
  if (confirmPassword !== undefined && password !== confirmPassword) {
    return res.status(400).json({
      success: false,
      message: "Passwords do not match.",
      field: "confirmPassword",
    });
  }

  // 6. Terms and conditions validation
  if (!hasAgreed) {
    return res.status(400).json({
      success: false,
      message: "You must agree to the Terms of Service and Privacy Policy.",
      field: "terms",
    });
  }

  // Sanitize values for downstream processing
  req.sanitizedData = {
    name: customerName,
    phone: customerPhone,
    email: customerEmail,
    password,
    agreedToTerms: Boolean(hasAgreed),
    profilePictureLink: req.body.profile_picture_link || req.body.avatar || null,
    profilePicturePublicId: req.body.profile_picture_public_id || null,
    authProvider: authProvider || "local"
  };

  next();
}

module.exports = {
  validateRegister,
};

