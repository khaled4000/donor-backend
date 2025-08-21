// backend/config/frontend.js
module.exports = {
  // Frontend URL for email verification links
  // Use environment variable for production, fallback to localhost for development
  FRONTEND_URL: process.env.FRONTEND_URL || "http://localhost:5173",
  // Available environments
  ENVIRONMENTS: {
    development: "http://localhost:5173", // Use localhost for development
    production: process.env.FRONTEND_URL || "https://yourdomain.com",
  },
};
