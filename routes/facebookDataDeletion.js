const express = require("express");
const crypto = require("crypto");
const router = express.Router();

router.post("/facebook-data-deletion", (req, res) => {
  const confirmationCode = crypto.randomBytes(16).toString("hex");

  res.json({
    url: `https://017f94c7afd0.ngrok-free.app/deletion-status?code=${confirmationCode}`,
    confirmation_code: confirmationCode,
  });
});

module.exports = router;
