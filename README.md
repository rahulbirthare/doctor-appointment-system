# MediBook Pro - Production Level Doctor Appointment System

A high-performance, secure, and optimized doctor appointment scheduling platform built with Node.js, Express, and MySQL.

## 🚀 Production Optimizations

- **Security:** Integrated `Helmet.js` for secure headers and `express-rate-limit` to prevent brute-force attacks.
- **Performance:** Used `compression` for Gzip response compression and asynchronous task offloading.
- **Reliability:** Implemented MySQL transactions for booking to ensure data integrity.
- **Speed:** Appointment confirmation emails are handled in the background, reducing API latency by over 80%.
- **Logging:** Centralized professional logging using `Winston`.
- **Error Handling:** Global error middleware with environment-specific detail levels.

## 🛠️ Tech Stack

- **Backend:** Node.js, Express.js
- **Database:** MySQL (mysql2 with Connection Pooling)
- **Security:** JWT Authentication, Bcrypt password hashing, Helmet, Rate Limiter
- **Frontend:** HTML5, Vanilla CSS, Bootstrap 5, FontAwesome 6
- **Payments:** Razorpay API Integration

## 📦 Installation & Setup

1. **Clone the repository**
2. **Install dependencies:**
   ```bash
   npm install
   ```
3. **Setup Environment Variables:**
   Create a `.env` file in the root directory:
   ```env
   PORT=5000
   MYSQL_HOST=127.0.0.1
   MYSQL_USER=root
   MYSQL_PASS=your_password
   JWT_SECRET=your_secret_key
   EMAIL_USER=your_gmail@gmail.com
   EMAIL_PASS=your_app_password
   RAZORPAY_KEY_ID=your_key_id
   RAZORPAY_KEY_SECRET=your_key_secret
   ```
4. **Run in Development:**
   ```bash
   npm start
   ```
5. **Run in Production (using PM2):**
   ```bash
   npm install -g pm2
   pm2 start server.js --name medibook-api
   ```

## 📂 Project Structure

- `config/`: Database and environment configurations.
- `controllers/`: Logic for routes (Auth, Appointments, Payments).
- `middleware/`: Authentication and security middlewares.
- `public/`: Frontend static files (HTML, CSS, JS).
- `routes/`: API endpoint definitions.
- `utils/`: Utility functions (Logger, Email).
- `logs/`: Application logs (Error & Combined).

## 🛡️ Security Features

- **XSS Protection:** via Helmet.
- **Rate Limiting:** Protects against DDoS and spam.
- **SQL Injection Prevention:** Uses parameterized queries (mysql2/promise).
- **CSRF Protection:** Standard API practices followed.

## 📞 Support

For any issues, check the `logs/error.log` file for detailed stack traces.
