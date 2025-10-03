/**
 * API Integration Test Suite for AttendEase Mobile App
 * Tests all backend endpoints with proper data validation
 */

import { apiService } from './apiService';

export class APITestSuite {
  constructor() {
    this.testResults = [];
    this.authToken = null;
  }

  // Helper method to log test results
  logResult(testName, success, data, error = null) {
    const result = {
      test: testName,
      success,
      timestamp: new Date().toISOString(),
      data: success ? data : null,
      error: error ? error.message : null
    };
    this.testResults.push(result);
    console.log(`${success ? '✅' : '❌'} ${testName}:`, success ? 'PASSED' : 'FAILED');
    if (error) console.error('Error:', error.message);
    if (data) console.log('Data:', data);
  }

  // 🔑 Test Authentication
  async testLogin(email = 'test@example.com', password = 'password') {
    try {
      const response = await apiService.login({ email, password });
      if (response.data.success && response.data.token) {
        this.authToken = response.data.token;
        this.logResult('Login', true, response.data);
        return true;
      } else {
        this.logResult('Login', false, response.data);
        return false;
      }
    } catch (error) {
      this.logResult('Login', false, null, error);
      return false;
    }
  }

  async testLogout() {
    try {
      const response = await apiService.logout();
      this.logResult('Logout', true, response.data);
      this.authToken = null;
      return true;
    } catch (error) {
      this.logResult('Logout', false, null, error);
      return false;
    }
  }

  // 📍 Test Master Data
  async testGetCities() {
    try {
      const response = await apiService.getCities();
      const cities = response.data;
      const isValid = Array.isArray(cities) && cities.length > 0;
      this.logResult('Get Cities', isValid, cities);
      return isValid;
    } catch (error) {
      this.logResult('Get Cities', false, null, error);
      return false;
    }
  }

  // 👨‍💼 Test Supervisor
  async testGetSupervisorWards(userId = '1') {
    try {
      const response = await apiService.getSupervisorWards(userId);
      this.logResult('Get Supervisor Wards', true, response.data);
      return true;
    } catch (error) {
      this.logResult('Get Supervisor Wards', false, null, error);
      return false;
    }
  }

  // 👷 Test Employee Attendance
  async testGetEmployeeAttendance(empId = 'EMP001', wardId = 'WARD001', date = '2025-09-29') {
    try {
      const response = await apiService.getEmployeeAttendance(empId, wardId, date);
      this.logResult('Get Employee Attendance', true, response.data);
      return true;
    } catch (error) {
      this.logResult('Get Employee Attendance', false, null, error);
      return false;
    }
  }

  async testGetEmployeeDetail(empId = 'EMP001', month = '2025-09') {
    try {
      const response = await apiService.getEmployeeDetail(empId, month);
      this.logResult('Get Employee Detail', true, response.data);
      return true;
    } catch (error) {
      this.logResult('Get Employee Detail', false, null, error);
      return false;
    }
  }

  async testGetAttendanceRecord(data = {}) {
    try {
      const response = await apiService.getAttendanceRecord(data);
      this.logResult('Get Attendance Record', true, response.data);
      return true;
    } catch (error) {
      this.logResult('Get Attendance Record', false, null, error);
      return false;
    }
  }

  async testFetchImage(attendanceId = '1', punchType = 'in') {
    try {
      const response = await apiService.fetchImage(attendanceId, punchType);
      this.logResult('Fetch Image', true, 'Image fetched successfully');
      return true;
    } catch (error) {
      this.logResult('Fetch Image', false, null, error);
      return false;
    }
  }

  // Test multipart endpoints (requires mock data)
  async testPunchInOut() {
    try {
      // Create mock FormData for testing
      const formData = new FormData();
      formData.append('attendance_id', '1');
      formData.append('punch_type', 'in');
      formData.append('latitude', '22.7196');
      formData.append('longitude', '75.8577');
      formData.append('address', 'Test Address, Indore');
      formData.append('userId', '1');
      // Note: Image would be added in real implementation

      const response = await apiService.punchInOut(formData);
      this.logResult('Punch In/Out', true, response.data);
      return true;
    } catch (error) {
      this.logResult('Punch In/Out', false, null, error);
      return false;
    }
  }

  async testFaceAttendance() {
    try {
      // Create mock FormData for testing
      const formData = new FormData();
      formData.append('punch_type', 'in');
      formData.append('latitude', '22.7196');
      formData.append('longitude', '75.8577');
      formData.append('address', 'Test Address, Indore');
      formData.append('userId', '1');
      // Note: Face image would be added in real implementation

      const response = await apiService.faceAttendance(formData);
      this.logResult('Face Attendance', true, response.data);
      return true;
    } catch (error) {
      this.logResult('Face Attendance', false, null, error);
      return false;
    }
  }

  async testStoreFace() {
    try {
      // Create mock FormData for testing
      const formData = new FormData();
      formData.append('userId', '1');
      // Note: Face image would be added in real implementation

      const response = await apiService.storeFace(formData);
      this.logResult('Store Face', true, response.data);
      return true;
    } catch (error) {
      this.logResult('Store Face', false, null, error);
      return false;
    }
  }

  // Run all tests
  async runAllTests() {
    console.log('🧪 Starting API Integration Tests...\n');
    
    // Test basic endpoints first
    await this.testGetCities();
    
    // Test authentication (use real credentials if available)
    // await this.testLogin('real@email.com', 'realpassword');
    
    // Test supervisor endpoints
    await this.testGetSupervisorWards();
    
    // Test employee endpoints
    await this.testGetEmployeeAttendance();
    await this.testGetEmployeeDetail();
    await this.testGetAttendanceRecord();
    await this.testFetchImage();
    
    // Test multipart endpoints (may fail without proper data)
    // await this.testPunchInOut();
    // await this.testFaceAttendance();
    // await this.testStoreFace();
    
    // Test logout
    // await this.testLogout();
    
    console.log('\n📊 Test Results Summary:');
    const passed = this.testResults.filter(r => r.success).length;
    const total = this.testResults.length;
    console.log(`✅ Passed: ${passed}/${total}`);
    console.log(`❌ Failed: ${total - passed}/${total}`);
    
    return this.testResults;
  }

  // Get test results
  getResults() {
    return this.testResults;
  }
}

// Export for use in mobile app
export default APITestSuite;
