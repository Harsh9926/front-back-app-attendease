# 📌 AttendEase Mobile App - API Documentation

**Base URL:** `http://13.202.210.74:5000/api`
---

## 🔑 Authentication

### 1. Login
- **Endpoint:** `POST /auth/login`
- **Description:** Authenticate user and get access token
- **Request Body:**
  ```json
  {
    "email": "user@example.com",
    "password": "password123"
  }
  ```
- **Response:**
  ```json
  {
    "success": true,
    "token": "jwt_token_here",
    "user": {
      "user_id": 1,
      "email": "user@example.com",
      "role": "supervisor"
    }
  }
  ```
- **Mobile Implementation:**
  ```javascript
  const result = await apiService.login({ email, password });
  ```

### 2. Logout
- **Endpoint:** `POST /auth/logout`
- **Description:** Logout user and invalidate token
- **Headers:** `Authorization: Bearer <token>`
- **Mobile Implementation:**
  ```javascript
  await apiService.logout();
  ```

---

## 📍 Master Data

### 3. Cities
- **Endpoint:** `GET /cities`
- **Description:** Get list of all cities
- **Response:**
  ```json
  [
    {
      "city_id": 1,
      "city_name": "Indore",
      "state": "Madhya Pradesh"
    }
  ]
  ```
- **Mobile Implementation:**
  ```javascript
  const cities = await apiService.getCities();
  ```

---

## 👨‍💼 Supervisor

### 4. Supervisor Wards
- **Endpoint:** `POST /app/supervisor/wards`
- **Description:** Get wards assigned to a supervisor
- **Request Body:**
  ```json
  {
    "user_id": "123"
  }
  ```
- **Mobile Implementation:**
  ```javascript
  const wards = await apiService.getSupervisorWards(userId);
  ```

---

## 👷 Employee Attendance

### 5. Employee Attendance
- **Endpoint:** `POST /app/attendance/employee`
- **Description:** Get employee attendance for specific date
- **Request Body:**
  ```json
  {
    "emp_id": "EMP001",
    "ward_id": "WARD001",
    "date": "2025-09-29"
  }
  ```
- **Mobile Implementation:**
  ```javascript
  const attendance = await apiService.getEmployeeAttendance(empId, wardId, date);
  ```

### 6. Punch In/Out
- **Endpoint:** `PUT /app/attendance/employee`
- **Description:** Record punch in/out with location and image
- **Request Body (Multipart):**
  - `attendance_id`: Attendance record ID
  - `punch_type`: "in" or "out"
  - `latitude`: GPS latitude
  - `longitude`: GPS longitude
  - `address`: Location address
  - `image`: Photo file
  - `userId`: User ID
- **Mobile Implementation:**
  ```javascript
  const formData = new FormData();
  formData.append('attendance_id', attendanceId);
  formData.append('punch_type', punchType);
  formData.append('latitude', latitude);
  formData.append('longitude', longitude);
  formData.append('address', address);
  formData.append('image', imageFile);
  formData.append('userId', userId);
  
  const result = await apiService.punchInOut(formData);
  ```

### 7. Attendance Record
- **Endpoint:** `POST /attendance`
- **Description:** Create or update attendance record
- **Mobile Implementation:**
  ```javascript
  const record = await apiService.getAttendanceRecord(data);
  ```

### 8. Employee Detail
- **Endpoint:** `GET /app/attendance/employee/detail`
- **Description:** Get employee details for specific month
- **Query Parameters:**
  - `empId`: Employee ID
  - `month`: Month (YYYY-MM format)
- **Mobile Implementation:**
  ```javascript
  const details = await apiService.getEmployeeDetail(empId, month);
  ```

### 9. Fetch Image
- **Endpoint:** `GET /app/attendance/employee/image`
- **Description:** Get attendance image
- **Query Parameters:**
  - `attendance_id`: Attendance record ID
  - `punch_type`: "in" or "out"
- **Mobile Implementation:**
  ```javascript
  const image = await apiService.fetchImage(attendanceId, punchType);
  ```

---

## 🖼 Face Recognition

### 10. Face Attendance
- **Endpoint:** `POST /app/attendance/employee/face-attendance`
- **Description:** Mark attendance using face recognition
- **Request Body (Multipart):**
  - `punch_type`: "in" or "out"
  - `latitude`: GPS latitude
  - `longitude`: GPS longitude
  - `address`: Location address
  - `image`: Face photo file
  - `userId`: User ID

- **Mobile Implementation:**
  ```javascript
  const formData = new FormData();
  formData.append('punch_type', punchType);
  formData.append('latitude', latitude);
  formData.append('longitude', longitude);
  formData.append('address', address);
  formData.append('image', faceImage);
  formData.append('userId', userId);
  
  const result = await apiService.faceAttendance(formData);
  ```

### 11. Store Face
- **Endpoint:** `POST /app/attendance/employee/faceRoutes/store-face`
- **Description:** Store face data for employee
- **Request Body (Multipart):**
  - `userId`: User ID
  - `image`: Face photo file
- **Mobile Implementation:**
  ```javascript
  const formData = new FormData();
  formData.append('userId', userId);
  formData.append('image', faceImage);
  
  const result = await apiService.storeFace(formData);
  ```

---

## 🔧 Error Handling

All API responses should be handled with proper error checking:

```javascript
try {
  const result = await apiService.login(credentials);
  if (result.data.success) {
    // Handle success
  } else {
    // Handle API error
    console.error('API Error:', result.data.message);
  }
} catch (error) {
  // Handle network/connection error
  console.error('Network Error:', error.message);
}
```

---

## 📱 Mobile App Integration Status

✅ **Configured Endpoints:** All 11 endpoints integrated
✅ **Authentication:** Login/logout with token management
✅ **File Upload:** Multipart form data for images
✅ **Error Handling:** Comprehensive error management
✅ **Base URL:** Configured for production API

---

## 🧪 Testing Endpoints

Use the test script to verify API connectivity:

```bash
cd attendeases
node test-public-api.js
```

Individual endpoint testing:
```bash
# Test login
curl -X POST -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password"}' \
  http://13.202.210.74:5000/api/auth/login

# Test cities
curl -X GET http://13.202.210.74:5000/api/cities
```
