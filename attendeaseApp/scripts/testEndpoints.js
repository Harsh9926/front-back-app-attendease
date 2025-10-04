#!/usr/bin/env node

/**
 * Lightweight CLI harness that pings every published AttendEase endpoint.
 *
 * Configure credentials and sample IDs via environment variables:
 *   API_BASE_URL              (defaults to http://localhost:5003/api)
 *   API_TEST_EMAIL            (required for login-dependent checks)
 *   API_TEST_PASSWORD         (required for login-dependent checks)
 *   API_TEST_SUPERVISOR_ID
 *   API_TEST_EMP_ID
 *   API_TEST_WARD_ID
 *   API_TEST_ATTENDANCE_ID
 *
 * Example:
 *   API_TEST_EMAIL=user@example.com API_TEST_PASSWORD=secret node scripts/testEndpoints.js
 */

const path = require('path');
const fs = require('fs');
const axios = require('axios');
const FormData = require('form-data');
const dotenv = require('dotenv');

// Load .env if present
dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

const BASE_URL = process.env.API_BASE_URL || process.env.EXPO_PUBLIC_API_BASE_URL || 'http://localhost:5003/api';
const TEST_EMAIL = process.env.API_TEST_EMAIL || '';
const TEST_PASSWORD = process.env.API_TEST_PASSWORD || '';
const SUPERVISOR_ID = process.env.API_TEST_SUPERVISOR_ID || '1';
const EMP_ID = process.env.API_TEST_EMP_ID || 'EMP001';
const WARD_ID = process.env.API_TEST_WARD_ID || 'WARD001';
const ATTENDANCE_ID = process.env.API_TEST_ATTENDANCE_ID || '1';

const client = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
});

const results = [];

const log = (message, level = 'info') => {
  const prefix = level === 'error' ? '\u274c' : level === 'warn' ? '\u26a0\ufe0f' : '\u2705';
  console.log(`${prefix} ${message}`);
};

const recordResult = (name, success, payload = null, error = null) => {
  results.push({
    name,
    success,
    timestamp: new Date().toISOString(),
    payload,
    error: error ? {
      message: error.message,
      status: error.response?.status,
      data: error.response?.data,
    } : null,
  });

  if (success) {
    log(`${name} — OK`);
  } else {
    log(`${name} — FAILED (${error?.response?.status || error?.message || 'unknown'})`, 'error');
  }
};

const smallPngBuffer = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/pkB9jwAAAABJRU5ErkJggg==',
  'base64'
);

const buildImageFormField = (filename = 'sample.png') => ({
  value: smallPngBuffer,
  options: {
    filename,
    contentType: 'image/png',
  },
});

async function testLogin() {
  if (!TEST_EMAIL || !TEST_PASSWORD) {
    log('Login skipped — set API_TEST_EMAIL/API_TEST_PASSWORD to exercise auth endpoints', 'warn');
    return false;
  }

  try {
    const response = await client.post('/auth/login', {
      email: TEST_EMAIL,
      password: TEST_PASSWORD,
    });
    const token = response.data?.token;
    if (token) {
      client.defaults.headers.common.Authorization = `Bearer ${token}`;
    }
    recordResult('POST /auth/login', !!token, response.data);
    return !!token;
  } catch (error) {
    recordResult('POST /auth/login', false, null, error);
    return false;
  }
}

async function testLogout() {
  if (!client.defaults.headers.common.Authorization) {
    log('Logout skipped — no auth token present', 'warn');
    return;
  }
  try {
    const response = await client.post('/auth/logout');
    recordResult('POST /auth/logout', true, response.data);
  } catch (error) {
    recordResult('POST /auth/logout', false, null, error);
  } finally {
    delete client.defaults.headers.common.Authorization;
  }
}

async function testGetCities() {
  try {
    const response = await client.get('/cities');
    recordResult('GET /cities', true, response.data);
  } catch (error) {
    recordResult('GET /cities', false, null, error);
  }
}

async function testSupervisorWards() {
  try {
    const response = await client.post('/app/supervisor/wards', { user_id: SUPERVISOR_ID });
    recordResult('POST /app/supervisor/wards', true, response.data);
  } catch (error) {
    recordResult('POST /app/supervisor/wards', false, null, error);
  }
}

async function testEmployeeAttendance() {
  try {
    const response = await client.post('/app/attendance/employee', {
      emp_id: EMP_ID,
      ward_id: WARD_ID,
      date: new Date().toISOString().split('T')[0],
    });
    recordResult('POST /app/attendance/employee (fetch)', true, response.data);
  } catch (error) {
    recordResult('POST /app/attendance/employee (fetch)', false, null, error);
  }
}

async function testAttendanceRecord() {
  try {
    const response = await client.post('/attendance', {
      emp_id: EMP_ID,
      ward_id: WARD_ID,
      date: new Date().toISOString().split('T')[0],
    });
    recordResult('POST /attendance', true, response.data);
  } catch (error) {
    recordResult('POST /attendance', false, null, error);
  }
}

async function testEmployeeDetail() {
  try {
    const response = await client.get('/app/attendance/employee/detail', {
      params: {
        empId: EMP_ID,
        month: new Date().toISOString().slice(0, 7),
      },
    });
    recordResult('GET /app/attendance/employee/detail', true, response.data);
  } catch (error) {
    recordResult('GET /app/attendance/employee/detail', false, null, error);
  }
}

async function testFetchImage() {
  try {
    const response = await client.get('/app/attendance/employee/image', {
      params: {
        attendance_id: ATTENDANCE_ID,
        punch_type: 'in',
      },
    });
    recordResult('GET /app/attendance/employee/image', true, response.data);
  } catch (error) {
    recordResult('GET /app/attendance/employee/image', false, null, error);
  }
}

const appendMultipartFields = (form, entries) => {
  Object.entries(entries).forEach(([key, value]) => {
    if (value === undefined || value === null) {
      return;
    }
    if (value && value.value && value.options) {
      form.append(key, value.value, value.options);
    } else {
      form.append(key, value);
    }
  });
};

async function postMultipart(url, payload) {
  const form = new FormData();
  appendMultipartFields(form, payload);
  const headers = form.getHeaders();
  if (client.defaults.headers.common.Authorization) {
    headers.Authorization = client.defaults.headers.common.Authorization;
  }
  return client.post(url, form, { headers });
}

async function testPunchInOut() {
  try {
    const response = await postMultipart('/app/attendance/employee', {
      attendance_id: ATTENDANCE_ID,
      punch_type: 'in',
      latitude: '22.7196',
      longitude: '75.8577',
      address: 'Test Location',
      userId: SUPERVISOR_ID,
      emp_id: EMP_ID,
      ward_id: WARD_ID,
      date: new Date().toISOString().split('T')[0],
      image: buildImageFormField('punch.png'),
    });
    recordResult('PUT /app/attendance/employee (punch)', true, response.data);
  } catch (error) {
    recordResult('PUT /app/attendance/employee (punch)', false, null, error);
  }
}

async function testFaceAttendance() {
  try {
    const response = await postMultipart('/app/attendance/employee/face-attendance', {
      punch_type: 'in',
      latitude: '22.7196',
      longitude: '75.8577',
      address: 'Test Location',
      userId: EMP_ID,
      emp_id: EMP_ID,
      ward_id: WARD_ID,
      date: new Date().toISOString().split('T')[0],
      image: buildImageFormField('face.png'),
    });
    recordResult('POST /app/attendance/employee/face-attendance', true, response.data);
  } catch (error) {
    recordResult('POST /app/attendance/employee/face-attendance', false, null, error);
  }
}

async function testStoreFace() {
  try {
    const response = await postMultipart('/app/attendance/employee/faceRoutes/store-face', {
      userId: EMP_ID,
      image: buildImageFormField('enroll.png'),
    });
    recordResult('POST /app/attendance/employee/faceRoutes/store-face', true, response.data);
  } catch (error) {
    recordResult('POST /app/attendance/employee/faceRoutes/store-face', false, null, error);
  }
}

async function run() {
  console.log('\n\u2728 AttendEase API smoke test');
  console.log(`Base URL: ${BASE_URL}\n`);

  await testGetCities();

  const loggedIn = await testLogin();

  await testSupervisorWards();
  await testEmployeeAttendance();
  await testAttendanceRecord();
  await testEmployeeDetail();
  await testFetchImage();
  await testStoreFace();
  await testFaceAttendance();
  await testPunchInOut();

  if (loggedIn) {
    await testLogout();
  }

  console.log('\n\uD83D\uDCCA Summary');
  results.forEach(({ name, success, error }) => {
    console.log(`${success ? '  \u2705' : '  \u274c'} ${name}${!success && error ? ` — ${error.message || error.status}` : ''}`);
  });

  const failures = results.filter(result => !result.success);
  if (failures.length > 0) {
    console.log(`\n${failures.length} endpoint(s) failed. Inspect logs above for details.`);
    process.exitCode = 1;
  } else {
    console.log('\nAll endpoints responded successfully.');
  }
}

run().catch(error => {
  console.error('Unhandled error while running tests:', error);
  process.exitCode = 1;
});
