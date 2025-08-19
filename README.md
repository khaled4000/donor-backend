# Donor Project Backend

Express.js server with MongoDB database for the Donor Project.

## Setup Instructions

### Prerequisites
- Node.js (v14 or higher)
- MongoDB (local installation or MongoDB Atlas)

### Installation

1. Install dependencies:
```bash
npm install
```

2. Create a `.env` file in the root directory with the following variables:
```
MONGODB_URI=mongodb://localhost:27017/donor-project
JWT_SECRET=your_jwt_secret_key_here
PORT=5000
```

3. Start MongoDB (if using local installation):
```bash
# Windows
mongod

# macOS/Linux
sudo systemctl start mongod
```

### Running the Server

Development mode (with auto-restart):
```bash
npm run dev
```

Production mode:
```bash
npm start
```

The server will start on port 5000 (or the port specified in your .env file).

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register a new user
- `POST /api/auth/login` - Login user

### Request Examples

#### Register
```json
POST /api/auth/register
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "password123",
  "role": "donor",
  "phone": "1234567890",
  "address": "123 Main St"
}
```

#### Login
```json
POST /api/auth/login
{
  "email": "john@example.com",
  "password": "password123"
}
```

## Project Structure

```
backend/
├── models/
│   └── User.js          # User model
├── routes/
│   └── auth.js          # Authentication routes
├── middleware/
│   └── auth.js          # Authentication middleware
├── server.js            # Main server file
├── package.json
└── README.md
```

## Database Models

### User
- name (String, required)
- email (String, required, unique)
- password (String, required)
- role (String, enum: ['donor', 'family'])
- phone (String)
- address (String)
- createdAt (Date)

## Security Features

- Password hashing with bcryptjs
- JWT token authentication
- CORS enabled
- Input validation
- Error handling middleware # donor-backend
