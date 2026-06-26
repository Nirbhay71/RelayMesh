# RelayMesh 🚀

**RelayMesh** is a high-performance, horizontally scalable, real-time messaging application built on the MERN stack. Designed with production-grade architecture in mind, it supports seamless real-time communication, status tracking, and offline message synchronization while gracefully handling massive concurrent traffic.

## 🌟 Key Features

*   **Real-Time 1-on-1 Messaging**: Instant messaging powered by WebSockets (Socket.IO).
*   **Horizontal Scalability**: Fully distributed architecture using the `@socket.io/redis-adapter`. Messages are seamlessly routed across multiple backend nodes via Redis Pub/Sub.
*   **Delivery & Read Receipts**: WhatsApp-style message statuses (Sent ✔, Delivered ✔✔, Read 🔵✔✔).
*   **Typing Indicators**: Real-time awareness when a contact is typing a message.
*   **Online/Offline Presence**: Dynamic user status tracking synchronized across all connected client sessions.
*   **Offline Message Synchronization**: Automatic, paginated delivery of missed messages when a user reconnects, ensuring no data loss while preventing memory exhaustion.
*   **Secure Authentication**: Comprehensive auth flow using JWT and Google OAuth 2.0 (via Passport.js).
*   **High Concurrency Ready**: Load-tested using Artillery to handle 25,000+ simultaneous virtual users without performance degradation.

## 🏗️ Technology Stack

*   **Frontend**: React (Vite), Vanilla CSS (Responsive & Modern UI).
*   **Backend**: Node.js, Express.js.
*   **Database**: MongoDB (Mongoose ORM).
*   **Real-Time Engine**: Socket.IO.
*   **Caching & Message Broker**: Redis (ioredis).
*   **Load Testing**: Artillery.

## 📂 Project Structure

```text
RelayMesh/
├── backend/            # Express server, Socket.IO logic, DB models, and Load tests
│   ├── src/            # Core backend source code (controllers, routes, sockets, utils)
│   ├── load-test/      # Artillery configuration and custom report generation scripts
│   └── package.json    # Backend dependencies
├── frontend/           # React application
│   ├── src/            # Core frontend source code (components, contexts, UI)
│   └── package.json    # Frontend dependencies
└── README.md           # Project documentation
```

## 🚀 Getting Started

### Prerequisites
*   [Node.js](https://nodejs.org/) (v18 or higher recommended)
*   [MongoDB](https://www.mongodb.com/) (Running locally or via MongoDB Atlas)
*   [Redis](https://redis.io/) (Running locally or via a cloud provider)

### Installation

1. **Clone the repository:**
   ```bash
   git clone <repository-url>
   cd RelayMesh
   ```

2. **Setup Backend:**
   ```bash
   cd backend
   npm install
   ```
   Create a `.env` file in the `backend` directory with the required variables (e.g., `PORT`, `MONGODB_URI`, `REDIS_URI`, `JWT_SECRET`, `GOOGLE_CLIENT_ID`, etc.).

3. **Setup Frontend:**
   ```bash
   cd ../frontend
   npm install
   ```
   Create a `.env` file in the `frontend` directory with your API base URLs (e.g., `VITE_API_URL`).

### Running the Application

1. **Start MongoDB and Redis instances** (Ensure Redis is running for Socket.IO horizontal scaling).
   *Note: If using Docker for MongoDB, ensure it's exposed on port 27017.*

2. **Start the Backend:**
   ```bash
   cd backend
   npm run run
   ```

3. **Start the Frontend:**
   ```bash
   cd frontend
   npm run dev
   ```

## 🧪 Load Testing (Artillery)

RelayMesh is built to scale. You can simulate high-concurrency traffic using the built-in Artillery load tests.

```bash
cd backend
npm run load-test:report
```
This command runs the load test defined in `load-test.yml` and generates a detailed HTML report (`load-test/report.html`) containing throughput, latency, and system stability metrics.

## 🔮 Future Scope

*   **Group Chat System**: Implement multi-user groups with message history available to late-joining members.
*   **Media Sharing**: Support for image, document, and voice note sharing.
*   **End-to-End Encryption (E2EE)**: Enhancing privacy by encrypting payloads on the client-side.

---
*Built with ❤️ and designed to scale.*
