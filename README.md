# LuxeSpace - Modern Furniture E-Commerce 🛋️

> A full-stack e-commerce platform built with Node.js, Express, and PostgreSQL, featuring an immersive "Art Gallery" UI and AI-powered assistance.

![LuxeSpace Preview](https://images.unsplash.com/photo-1618220179428-22790b461013?auto=format&fit=crop&q=80&w=1000)
*(Note: Replace this image link with your actual project screenshot)*

## ✨ Key Features

### 🛍️ User Experience (The "Art Gallery" Feel)
- **Cinematic UI:** Asymmetrical layout, masonry grids, and glassmorphism design using Tailwind CSS.
- **Dynamic Interactions:** Flying cart animations, AJAX cart updates, and interactive navigation.
- **Smart Checkout:** Secure checkout flow with stock validation and payment method simulation.
- **My Orders:** Real-time order tracking status (Pending/Shipped/Cancelled).

### 🧠 Intelligent System
- **AI Assistant:** Integrated chatbot (Gemini/OpenAI) for personalized furniture recommendations.
- **Role-Based Access Control:** Secure authentication for Customers and Admins.

### 🛡️ Admin Dashboard (The Control Room)
- **Product Management:** CRUD operations with multi-image upload support.
- **Order Fulfillment:** Real-time order processing workflow (Process/Cancel orders).
- **Financial Overview:** Dashboard stats for revenue, total orders, and active users.

## 🛠️ Tech Stack

- **Backend:** Node.js, Express.js
- **Database:** PostgreSQL (implemented with ACID Transactions)
- **Frontend:** EJS Templating, Tailwind CSS
- **Authentication:** BCrypt, Express-Session
- **Tools:** Multer (File Upload), Dotenv

## 🚀 Getting Started

### Prerequisites
- Node.js installed (v14+)
- PostgreSQL installed

### Installation

1. **Clone the repository**
   ```bash
   git clone [https://github.com/USERNAME_LO/luxspace-furniture.git](https://github.com/USERNAME_LO/luxspace-furniture.git)
   cd luxspace-
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```
3. **Setup Database**
   - Create a PostgreSQL database named luxspace_db.
   - Import the schema (create tables for users, products, carts, orders). 

4. **Environment Variables Create a .env file in the root directory:**
   ```bash
   DB_USER=your_db_user
   DB_HOST=localhost
   DB_NAME=luxspace_db
   DB_PASSWORD=your_db_password
   DB_PORT=5432
   PORT=3000
   SESSION_SECRET=your_secret_key
   ```

5. **Run the Project**
   ```bash
   npm start
   ```
   Visit http://localhost:3000
   
## 👤 Author

**[INDRA DWI ANANDA](https://#)**
- GitHub: [@evelotion](https://github.com/evelotion)
- LinkedIn: [INDRA DWI ANANDA](https://linkedin.com/in/username-lo)