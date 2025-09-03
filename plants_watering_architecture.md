# 🌱 Plants Watering Web App - Architecture Documentation

## 1. Overview
The **Plants Watering Web App** is a client-server application designed to remotely monitor and manage automated plant watering systems. It enables users to:
- Monitor soil moisture levels in real-time.
- Schedule or trigger watering remotely.
- Receive notifications for watering events or plant health issues.

The system consists of three main parts:
- **Client (Web/Mobile App)**
- **Server (Backend API)**
- **IoT Device (Plant Watering Controller)**

---

## 2. High-Level Architecture Diagram
```
   +-------------+          +---------------------+          +--------------------+
   |  Web Client | <------> |  Backend Server API | <------> | IoT Watering Device|
   | (React/Vue) |   HTTPS  | (Node.js/Express)   |   MQTT   |  (ESP32/Raspberry) |
   +-------------+          +---------------------+          +--------------------+
          |                         |                             |
          |                         | WebSocket/MQTT              |
          |                         v                             |
          |                 +------------------+                  |
          |                 |  Database        |                  |
          |                 | (PostgreSQL/     |                  |
          |                 |  TimescaleDB)    |                  |
          |                 +------------------+                  |
```

---

## 3. Components Description
### **3.1 Client Application**
- **Framework:** React or Vue.js
- **Features:**
  - User authentication and profile management
  - Dashboard for moisture levels & watering status
  - Scheduling interface for automated watering
  - Notifications panel
- **Communication Protocols:**
  - HTTPS REST API calls to backend
  - WebSocket for real-time updates

### **3.2 Server (Backend API)**
- **Tech Stack:** Node.js, Express.js
- **Responsibilities:**
  - API endpoints for CRUD operations on plants, schedules, and sensor data
  - Authentication & Authorization (JWT-based)
  - Integration with IoT devices via MQTT broker
  - Real-time communication with clients via WebSocket
  - Business logic for watering rules
- **Security:**
  - HTTPS encryption
  - Input validation & sanitization
  - Role-based access control

### **3.3 IoT Watering Device**
- **Hardware:** ESP32 or Raspberry Pi
- **Peripherals:**
  - Soil moisture sensors
  - Water pump controller
  - WiFi module
- **Responsibilities:**
  - Measure soil moisture levels at set intervals
  - Send readings to backend via MQTT
  - Receive watering commands from backend
  - Locally trigger pump action

---

## 4. Data Flow
### **Example: Automated Watering Trigger**
1. IoT device measures moisture level.
2. Data sent via MQTT to backend.
3. Backend stores data in database.
4. Backend checks watering threshold.
5. If below threshold, backend sends MQTT command to IoT device to start pump.
6. Device waters plants, sends status update.
7. Backend updates database & notifies user via WebSocket push.

---

## 5. Database Models (Example)
**User**
- id
- email
- password_hash
- role

**Plant**
- id
- user_id
- name
- species

**SensorData**
- id
- plant_id
- moisture_level
- timestamp

**WateringSchedule**
- id
- plant_id
- start_time
- duration
- repetition_pattern

**WateringEvent**
- id
- plant_id
- start_time
- end_time
- status

---

## 6. Tech Stack Summary
- **Client:** React/Vue.js, WebSocket, Axios
- **Backend:** Node.js, Express.js, MQTT.js, WebSocket
- **Database:** PostgreSQL or TimescaleDB (for time-series data)
- **IoT Device:** ESP32 / Raspberry Pi, Arduino firmware, MQTT
- **Hosting:** AWS / GCP
- **MQTT Broker:** Mosquitto / EMQX
- **Notifications:** Firebase Cloud Messaging (FCM) / Web Push API

---

## 7. Scalability & Reliability Considerations
- Horizontal scaling of backend instances behind load balancer
- MQTT broker cluster for handling thousands of devices
- Caching frequently accessed data using Redis
- Database read replicas for load distribution

---

## 8. Security Measures
- TLS/SSL for all communications
- JWT authentication
- SQL injection prevention with parameterized queries
- Secure firmware updates (OTA)

---

## 9. Future Enhancements
- AI-based watering predictions using weather forecasts
- Integration with smart home assistants
- Plant health image recognition
- Mobile app for offline control
