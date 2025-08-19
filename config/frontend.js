module.exports = {
  // Frontend URL for email verification links
  // Use local IP address so mobile devices can access it
  FRONTEND_URL: process.env.FRONTEND_URL || "http://192.168.56.1:5173",
  // Available environments
  ENVIRONMENTS: {
    development: "http://192.168.56.1:5173", // Use local IP for mobile access
    production: process.env.FRONTEND_URL || "https://yourdomain.com",
  },
};
