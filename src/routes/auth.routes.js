const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { body, validationResult } = require("express-validator");
const db = require("../db");
const { requireAuth } = require("../middleware/auth.middleware");

const router = express.Router();

function signToken(user) {
  return jwt.sign(
    { sub: user.id, email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || "7d" }
  );
}

function toPublicUser(user) {
  return {
    id: user.id,
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    phoneCountryCode: user.phoneCountryCode,
    phoneNumber: user.phoneNumber,
  };
}

router.post(
  "/signup",
  [
    body("firstName").trim().notEmpty().withMessage("First name is required"),
    body("lastName").trim().notEmpty().withMessage("Last name is required"),
    body("email").trim().isEmail().withMessage("A valid email is required"),
    body("phoneCountryCode")
      .trim()
      .notEmpty()
      .withMessage("Phone country code is required"),
    body("phoneNumber").trim().notEmpty().withMessage("Phone number is required"),
    body("password")
      .isLength({ min: 6 })
      .withMessage("Password must be at least 6 characters"),
  ],
  (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: errors.array()[0].msg, errors: errors.array() });
    }

    const { firstName, lastName, email, phoneCountryCode, phoneNumber, password } = req.body;
    const normalizedEmail = email.toLowerCase().trim();

    const existing = db.prepare("SELECT id FROM users WHERE email = ?").get(normalizedEmail);
    if (existing) {
      return res.status(409).json({ message: "An account with this email already exists" });
    }

    const hashedPassword = bcrypt.hashSync(password, 10);

    const result = db
      .prepare(
        `INSERT INTO users (firstName, lastName, email, phoneCountryCode, phoneNumber, password)
         VALUES (?, ?, ?, ?, ?, ?)`
      )
      .run(firstName.trim(), lastName.trim(), normalizedEmail, phoneCountryCode.trim(), phoneNumber.trim(), hashedPassword);

    const user = db.prepare("SELECT * FROM users WHERE id = ?").get(result.lastInsertRowid);
    const token = signToken(user);

    return res.status(201).json({ token, user: toPublicUser(user) });
  }
);

router.post(
  "/login",
  [
    body("email").trim().isEmail().withMessage("A valid email is required"),
    body("password").notEmpty().withMessage("Password is required"),
  ],
  (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: errors.array()[0].msg, errors: errors.array() });
    }

    const { email, password } = req.body;
    const normalizedEmail = email.toLowerCase().trim();

    const user = db.prepare("SELECT * FROM users WHERE email = ?").get(normalizedEmail);
    if (!user) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const passwordMatches = bcrypt.compareSync(password, user.password);
    if (!passwordMatches) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const token = signToken(user);
    return res.json({ token, user: toPublicUser(user) });
  }
);

router.get("/me", requireAuth, (req, res) => {
  const user = db.prepare("SELECT * FROM users WHERE id = ?").get(req.user.sub);
  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }
  return res.json({ user: toPublicUser(user) });
});

module.exports = router;
