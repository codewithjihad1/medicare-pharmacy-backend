# 🏥 MediCare Pharmacy Backend - Medicine E-commerce API

A robust Node.js backend API for the MediCare Pharmacy e-commerce platform, featuring user authentication, payment processing, and comprehensive medicine inventory management.

## 🌟 Live API

-   **API Base URL**: [https://medistore-ecommerce-api.vercel.app/](https://medistore-ecommerce-api.vercel.app/)

## 📋 Table of Contents

-   [Features](#-features)
-   [Technology Stack](#-technology-stack)
-   [API Routes](#-api-routes)
-   [Installation](#-installation)
-   [Environment Variables](#-environment-variables)
-   [Database Schema](#-database-schema)
-   [Authentication](#-authentication)
-   [Payment Integration](#-payment-integration)
-   [Deployment](#-deployment)
-   [API Documentation](#-api-documentation)
-   [Error Handling](#-error-handling)
-   [License](#-license)

## ✨ Features

### 🔐 Authentication & Authorization

-   **Firebase Admin SDK** integration for secure token verification
-   **JWT token validation** for protected routes
-   **Role-based access control** (Customer, Seller, Admin)
-   **Email verification** and user management
-   **Middleware protection** for sensitive endpoints

### 💊 Medicine Management

-   **CRUD operations** for medicine inventory
-   **Category-based organization** with dynamic filtering
-   **Stock management** with automatic updates
-   **Seller-specific** medicine management
-   **Banner/featured** medicine highlighting
-   **Discount and pricing** calculations

### 👥 User Management

-   **User registration and profile management**
-   **Role assignment** and permission control
-   **User statistics** and analytics
-   **Admin user management** with bulk operations
-   **Seller verification** and approval system

### 🛒 Order Processing

-   **Order creation** and management
-   **Payment processing** with Stripe integration
-   **Order status tracking** and updates
-   **Inventory synchronization** with stock deduction
-   **Order history** and customer analytics

### 💳 Payment System

-   **Stripe payment integration** with secure processing
-   **Payment intent creation** and confirmation
-   **Payment status tracking** and management
-   **Revenue analytics** and reporting
-   **Multi-currency support** preparation

### 📊 Analytics & Reporting

-   **Admin dashboard statistics** with comprehensive metrics
-   **Seller performance analytics** and revenue tracking
-   **Sales reporting** with date filtering
-   **User activity monitoring** and insights
-   **Real-time data** aggregation and visualization

### 🎯 Advertisement Management

-   **Advertisement request system** for featured listings
-   **Admin approval workflow** for advertisements
-   **Active banner management** with rotation
-   **Seller advertisement analytics** and performance

## 🛠 Technology Stack

### Core Technologies

-   **Node.js** - JavaScript runtime environment
-   **Express.js 5.1.0** - Fast, unopinionated web framework
-   **MongoDB 6.17.0** - NoSQL database for flexible data storage
-   **Mongoose/Native Driver** - MongoDB object modeling

### Authentication & Security

-   **Firebase Admin SDK 13.4.0** - Authentication and user management
-   **JWT** - JSON Web Token for secure API access
-   **CORS** - Cross-origin resource sharing configuration
-   **Environment Variables** - Secure configuration management

### Payment Processing

-   **Stripe 18.3.0** - Payment processing and financial transactions
-   **Webhook Support** - Real-time payment event handling
-   **PCI Compliance** - Secure payment data handling

### Development Tools

-   **dotenv 16.5.0** - Environment variable management
-   **Nodemon** - Development server with auto-restart
-   **Vercel** - Serverless deployment platform

## 🛣 API Routes

### Authentication Routes (`/api/users`)

```
POST   /api/users                    # Create new user
GET    /api/users                    # Get all users (admin)
GET    /api/users/:email             # Get user by email
GET    /api/users/profile/:email     # Get user profile
PUT    /api/users/profile            # Update user profile
GET    /api/users/role/:email        # Get user role
GET    /api/users/stats/:email       # Get user statistics
PATCH  /api/users/:id/role           # Update user role (admin)
DELETE /api/users/:id                # Delete user (admin)
```

### Medicine Routes (`/api/medicines`)

```
GET    /api/medicines                # Get all medicines
POST   /api/medicines                # Create medicine
PUT    /api/medicines/:id            # Update medicine
DELETE /api/medicines/:id            # Delete medicine
GET    /api/medicines/banner         # Get banner medicines
GET    /api/medicines/discount-products # Get discount products
GET    /api/medicines/category/:category # Get by category
GET    /api/medicines/seller/:email  # Get seller medicines
```

### Category Routes (`/api/categories`)

```
GET    /api/categories               # Get all categories
POST   /api/categories               # Create category (admin)
PUT    /api/categories/:id           # Update category (admin)
DELETE /api/categories/:id           # Delete category (admin)
GET    /api/categories/:categoryName # Get category by name
```

### Order Routes (`/api/orders`)

```
GET    /api/orders                   # Get all orders (admin)
GET    /api/orders/:email            # Get user orders
```

### Payment Routes (`/api`)

```
POST   /api/create-payment-intent    # Create Stripe payment intent
POST   /api/confirm-payment          # Confirm payment and create order
```

### Admin Routes (`/api/admin`)

```
GET    /api/admin/stats              # Get admin statistics
GET    /api/admin/payment-stats      # Get payment statistics
GET    /api/admin/sales-stats        # Get sales statistics
GET    /api/admin/sales-report       # Get detailed sales report
GET    /api/admin/payments           # Get all payments
PATCH  /api/admin/payments/:id/accept # Accept payment
```

### Seller Routes (`/api/seller`)

```
GET    /api/seller/stats/:email      # Get seller statistics
GET    /api/seller/payments/:email   # Get seller payment history
GET    /api/seller/payment-stats/:email # Get seller payment stats
```

### Advertisement Routes (`/api/advertise-requests`)

```
GET    /api/advertise-requests       # Get all ad requests
POST   /api/advertise-requests       # Create ad request
PUT    /api/advertise-requests/:id   # Update ad request
DELETE /api/advertise-requests/:id   # Delete ad request
PATCH  /api/advertise-requests/:id/status # Update ad status
GET    /api/advertise-requests/active/slider # Get active ads
GET    /api/advertise-requests/seller/:email # Get seller ads
```

## 🚀 Installation

### Prerequisites

-   **Node.js** (v18 or higher)
-   **npm** or **yarn**
-   **MongoDB** database (local or MongoDB Atlas)
-   **Firebase** project with Admin SDK
-   **Stripe** account for payment processing

### Setup Steps

1. **Clone the repository**

```bash
git clone https://github.com/codewithjihad1/medicine-store-ecommerce-backend.git
cd medicare-pharmacy-backend
```

2. **Install dependencies**

```bash
npm install
```

3. **Environment setup**

```bash
cp .env.example .env
```

4. **Configure environment variables** (see [Environment Variables](#-environment-variables))

5. **Add Firebase service account**

-   Download your Firebase Admin SDK service account key
-   Save as `firebase-adminsdk.json` in the project root

6. **Start the development server**

```bash
npm start
```

The server will start on `http://localhost:5000`

## 🔧 Environment Variables

Create a `.env` file in the root directory with the following variables:

```env
# MongoDB Configuration
MONGODB_USER=your_mongodb_username
MONGODB_PASS=your_mongodb_password

# Stripe Configuration
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key

# Server Configuration
PORT=5000
NODE_ENV=development

# Firebase Admin SDK (automatically loaded from firebase-adminsdk.json)
# FIREBASE_PROJECT_ID=your_project_id
# FIREBASE_PRIVATE_KEY=your_private_key
# FIREBASE_CLIENT_EMAIL=your_client_email
```

### Required Services Setup

**MongoDB Atlas Setup:**

1. Create a MongoDB Atlas account
2. Create a new cluster
3. Create database user credentials
4. Whitelist your IP address or use 0.0.0.0/0 for development
5. Get the connection string and update `MONGODB_USER` and `MONGODB_PASS`

**Firebase Admin SDK Setup:**

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Navigate to Project Settings > Service Accounts
3. Generate a new private key
4. Download the JSON file and rename to `firebase-adminsdk.json`
5. Place in the project root directory

**Stripe Setup:**

1. Create a [Stripe](https://stripe.com) account
2. Get your secret key from the Stripe Dashboard
3. Use test keys for development (`sk_test_...`)
4. Add the secret key to your `.env` file

## 🗄 Database Schema

### Collections Overview

**Users Collection (`users`)**

```javascript
{
  _id: ObjectId,
  email: String,
  displayName: String,
  photoURL: String,
  role: String, // "customer", "seller", "admin"
  createAt: String (ISO Date),
  // Additional profile fields
}
```

**Medicines Collection (`medicines`)**

```javascript
{
  _id: ObjectId,
  name: String,
  genericName: String,
  category: String,
  company: String,
  pricePerUnit: Number,
  discount: Number,
  discountPrice: Number,
  stockQuantity: Number,
  inStock: Boolean,
  description: String,
  imageUrl: String,
  isInBanner: Boolean,
  seller: {
    name: String,
    email: String
  },
  reviews: Number,
  rating: Number,
  createAt: String (ISO Date)
}
```

**Orders Collection (`orders`)**

```javascript
{
  _id: ObjectId,
  paymentIntentId: String,
  customerInfo: {
    fullName: String,
    email: String,
    phone: String,
    address: String
  },
  items: Array,
  orderTotal: Number,
  paymentStatus: String, // "paid", "pending"
  orderStatus: String, // "confirmed", "processing", "delivered"
  createdAt: String (ISO Date),
  updatedAt: String (ISO Date)
}
```

**Categories Collection (`categories`)**

```javascript
{
  _id: ObjectId,
  name: String,
  slug: String,
  description: String,
  imageUrl: String,
  medicineCount: Number
}
```

**Advertisement Requests Collection (`advertise-requests`)**

```javascript
{
  _id: ObjectId,
  medicineId: ObjectId,
  sellerEmail: String,
  status: String, // "pending", "approved", "rejected"
  requestedAt: String (ISO Date),
  // Additional advertisement fields
}
```

## 🔐 Authentication

### Firebase Admin SDK Integration

The API uses Firebase Admin SDK for secure authentication:

**Token Verification Middleware:**

```javascript
// All protected routes require Bearer token
Authorization: Bearer <firebase_id_token>
```

**Role-Based Access Control:**

-   **Customer**: Basic user access, can place orders
-   **Seller**: Can manage their medicine inventory
-   **Admin**: Full system access, user management

**Protected Route Example:**

```javascript
// Protected route with role verification
app.get(
    "/api/admin/stats",
    verifyFirebaseToken,
    verifyAdmin,
    adminController.getAdminStats
);
```

### Middleware Chain

1. **verifyFirebaseToken**: Validates Firebase ID token
2. **verifyTokenEmail**: Ensures email matches token
3. **verifyAdmin**: Checks for admin role privileges

## 💳 Payment Integration

### Stripe Integration

**Payment Flow:**

1. **Create Payment Intent**: Generate secure payment intent
2. **Client Payment**: Frontend handles card processing
3. **Confirm Payment**: Verify and create order
4. **Update Inventory**: Automatically adjust stock levels

**Payment Intent Creation:**

```javascript
POST /api/create-payment-intent
{
  "amount": 99.99,
  "currency": "usd",
  "customerInfo": {...},
  "cartItems": [...]
}
```

**Payment Confirmation:**

```javascript
POST /api/confirm-payment
{
  "paymentIntentId": "pi_...",
  "customerInfo": {...},
  "cartItems": [...],
  "orderTotal": 99.99
}
```

**Security Features:**

-   **PCI DSS Compliance** through Stripe
-   **Webhook verification** for payment events
-   **Automatic inventory** synchronization
-   **Fraud detection** and prevention

## 🚀 Deployment

### Vercel Deployment

The API is configured for Vercel serverless deployment:

**vercel.json Configuration:**

```json
{
    "version": 2,
    "builds": [
        {
            "src": "index.js",
            "use": "@vercel/node"
        }
    ],
    "routes": [
        {
            "src": "/(.*)",
            "dest": "/index.js"
        }
    ]
}
```

**Deployment Steps:**

1. Install Vercel CLI: `npm i -g vercel`
2. Login to Vercel: `vercel login`
3. Deploy: `vercel --prod`
4. Configure environment variables in Vercel dashboard

**Environment Variables on Vercel:**

-   Add all `.env` variables to Vercel project settings
-   Upload `firebase-adminsdk.json` content as environment variable
-   Configure domain and CORS settings

### Alternative Deployment Options

**Docker Deployment:**

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
EXPOSE 5000
CMD ["npm", "start"]
```

**Traditional Server Deployment:**

1. Set up Node.js environment
2. Install dependencies: `npm install`
3. Configure environment variables
4. Start with PM2: `pm2 start index.js`

## 📚 API Documentation

### Response Format

**Success Response:**

```javascript
{
  "data": [...], // or {...}
  "message": "Success message"
}
```

**Error Response:**

```javascript
{
  "message": "Error description",
  "error": "Detailed error (development only)"
}
```

### Status Codes

-   **200**: OK - Request successful
-   **201**: Created - Resource created successfully
-   **400**: Bad Request - Invalid request data
-   **401**: Unauthorized - Invalid or missing token
-   **403**: Forbidden - Insufficient permissions
-   **404**: Not Found - Resource not found
-   **409**: Conflict - Resource already exists
-   **500**: Internal Server Error - Server error

### Pagination

Many endpoints support pagination:

```javascript
GET /api/admin/payments?page=1&limit=10&status=paid
```

**Pagination Response:**

```javascript
{
  "data": [...],
  "pagination": {
    "currentPage": 1,
    "totalPages": 5,
    "totalCount": 50,
    "hasNext": true,
    "hasPrev": false
  }
}
```

## 🔧 Error Handling

### Global Error Handler

The API includes comprehensive error handling:

```javascript
// Global error middleware
app.use((error, req, res, next) => {
    console.error("Global error handler:", error);
    res.status(500).send({
        message: "Internal server error",
        error:
            process.env.NODE_ENV === "development"
                ? error.message
                : "Something went wrong",
    });
});
```

### Process Error Handling

```javascript
// Graceful shutdown handling
process.on("SIGINT", () => {
    console.log("🛑 Received SIGINT. Graceful shutdown initiated...");
    process.exit(0);
});

process.on("unhandledRejection", (err) => {
    console.error("Unhandled Promise Rejection:", err);
    process.exit(1);
});
```

## 🧪 Testing

### API Testing

**Manual Testing:**

-   Use Postman or Insomnia for API testing
-   Import the provided collection (if available)
-   Test with different user roles and scenarios

**Test User Creation:**

```javascript
POST /api/users
{
  "email": "test@example.com",
  "displayName": "Test User",
  "role": "customer"
}
```

**Authentication Testing:**

```bash
# Get Firebase ID token from frontend
# Use in subsequent requests
curl -H "Authorization: Bearer <token>" \
  http://localhost:5000/api/users/test@example.com
```

## 📊 Performance Considerations

### Database Optimization

-   **Indexing**: Key fields indexed for faster queries
-   **Aggregation**: Complex analytics using MongoDB pipelines
-   **Connection Pooling**: Efficient database connections

### Caching Strategy

-   **Memory Caching**: Frequently accessed data
-   **Response Caching**: Static content caching
-   **Database Query Optimization**: Optimized aggregation pipelines

### Monitoring

-   **Error Logging**: Comprehensive error tracking
-   **Performance Metrics**: Response time monitoring
-   **Health Checks**: Server status endpoints

## 🔒 Security Features

### Data Protection

-   **Input Validation**: Request data sanitization
-   **SQL Injection Prevention**: MongoDB native driver protection
-   **XSS Protection**: Output sanitization
-   **CORS Configuration**: Controlled cross-origin access

### Authentication Security

-   **Token Expiration**: Firebase token validation
-   **Role Verification**: Multi-level permission checks
-   **Email Verification**: Firebase Auth integration

## 🤝 Contributing

### Development Guidelines

1. **Follow REST conventions** for API design
2. **Use async/await** for asynchronous operations
3. **Implement proper error handling** in all controllers
4. **Add JSDoc comments** for complex functions
5. **Test all endpoints** before committing

### Code Structure

```
backend/
├── controllers/          # Route handlers and business logic
├── middlewares/         # Authentication and validation
├── routes/             # API route definitions
├── mongodb/            # Database configuration
├── index.js           # Main application file
└── package.json       # Dependencies and scripts
```

### Pull Request Process

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

## 📞 Support

For API support and questions:

-   **GitHub Issues**: [Create an issue](https://github.com/codewithjihad1/medicine-store-ecommerce-backend/issues)
-   **API Documentation**: Contact for detailed API docs
-   **Email Support**: backend-support@medicare-pharmacy.com

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

-   **Express.js** for the robust web framework
-   **MongoDB** for flexible data storage
-   **Firebase** for authentication services
-   **Stripe** for secure payment processing
-   **Vercel** for seamless deployment

---

**API Version**: 2.0.0  
**Last Updated**: July 2025  
**Maintained by**: [MD JIHAD HOSSAIN](https://github.com/codewithjihad1)

> **⚠️ Note**: This is a demo API for educational purposes. Not intended for production medical use without proper regulatory compliance.
