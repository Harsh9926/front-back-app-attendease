/**
 * Attendance Service for AttendEase Mobile App
 * Handles attendance-related operations with location and camera integration
 */

import * as Location from 'expo-location';
import * as ImagePicker from 'expo-image-picker';
import { apiService } from './apiService';

export class AttendanceService {
  constructor() {
    this.currentLocation = null;
  }

  // 📍 Location Services
  async requestLocationPermission() {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        throw new Error('Location permission not granted');
      }
      return true;
    } catch (error) {
      console.error('Location permission error:', error);
      return false;
    }
  }

  async getCurrentLocation() {
    try {
      const hasPermission = await this.requestLocationPermission();
      if (!hasPermission) {
        throw new Error('Location permission required');
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      this.currentLocation = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        accuracy: location.coords.accuracy,
      };

      // Get address from coordinates
      const address = await this.getAddressFromCoordinates(
        location.coords.latitude,
        location.coords.longitude
      );

      return {
        ...this.currentLocation,
        address,
      };
    } catch (error) {
      console.error('Get location error:', error);
      throw error;
    }
  }

  async getAddressFromCoordinates(latitude, longitude) {
    try {
      const addresses = await Location.reverseGeocodeAsync({
        latitude,
        longitude,
      });

      if (addresses.length > 0) {
        const address = addresses[0];
        return `${address.street || ''} ${address.city || ''} ${address.region || ''} ${address.postalCode || ''}`.trim();
      }
      return `${latitude}, ${longitude}`;
    } catch (error) {
      console.error('Reverse geocoding error:', error);
      return `${latitude}, ${longitude}`;
    }
  }

  // 📷 Camera Services
  async requestCameraPermission() {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        throw new Error('Camera permission not granted');
      }
      return true;
    } catch (error) {
      console.error('Camera permission error:', error);
      return false;
    }
  }

  async capturePhoto(options = {}) {
    try {
      const hasPermission = await this.requestCameraPermission();
      if (!hasPermission) {
        throw new Error('Camera permission required');
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
        ...options,
      });

      if (!result.canceled && result.assets[0]) {
        return result.assets[0];
      }
      return null;
    } catch (error) {
      console.error('Capture photo error:', error);
      throw error;
    }
  }

  // 👷 Attendance Operations
  async punchIn(userId, attendanceId = null) {
    try {
      // Get current location
      const locationData = await this.getCurrentLocation();
      
      // Capture photo
      const photo = await this.capturePhoto();
      if (!photo) {
        throw new Error('Photo is required for punch in');
      }

      // Prepare form data
      const formData = new FormData();
      if (attendanceId) formData.append('attendance_id', attendanceId);
      formData.append('punch_type', 'IN');
      formData.append('latitude', locationData.latitude.toString());
      formData.append('longitude', locationData.longitude.toString());
      formData.append('address', locationData.address);
      formData.append('userId', userId.toString());
      
      // Add image
      formData.append('image', {
        uri: photo.uri,
        type: 'image/jpeg',
        name: 'punch_in.jpg',
      });

      // Submit to API
      const response = await apiService.punchInOut(formData);
      return {
        success: true,
        data: response.data,
        location: locationData,
        photo: photo.uri,
      };
    } catch (error) {
      console.error('Punch in error:', error);
      throw error;
    }
  }

  async punchOut(userId, attendanceId) {
    try {
      // Get current location
      const locationData = await this.getCurrentLocation();
      
      // Capture photo
      const photo = await this.capturePhoto();
      if (!photo) {
        throw new Error('Photo is required for punch out');
      }

      // Prepare form data
      const formData = new FormData();
      formData.append('attendance_id', attendanceId);
      formData.append('punch_type', 'OUT');
      formData.append('latitude', locationData.latitude.toString());
      formData.append('longitude', locationData.longitude.toString());
      formData.append('address', locationData.address);
      formData.append('userId', userId.toString());
      
      // Add image
      formData.append('image', {
        uri: photo.uri,
        type: 'image/jpeg',
        name: 'punch_out.jpg',
      });

      // Submit to API
      const response = await apiService.punchInOut(formData);
      return {
        success: true,
        data: response.data,
        location: locationData,
        photo: photo.uri,
      };
    } catch (error) {
      console.error('Punch out error:', error);
      throw error;
    }
  }

  // 🖼 Face Recognition Attendance
  async faceAttendance(userId, punchType = 'in') {
    try {
      // Get current location
      const locationData = await this.getCurrentLocation();
      
      // Capture face photo
      const photo = await this.capturePhoto({
        allowsEditing: false, // Don't allow editing for face recognition
        aspect: [1, 1],
        quality: 0.9, // Higher quality for face recognition
      });
      
      if (!photo) {
        throw new Error('Face photo is required');
      }

      // Prepare form data
      const formData = new FormData();
      formData.append('punch_type', punchType?.toUpperCase?.() ?? 'IN');
      formData.append('latitude', locationData.latitude.toString());
      formData.append('longitude', locationData.longitude.toString());
      formData.append('address', locationData.address);
      formData.append('userId', userId.toString());
      
      // Add face image
      formData.append('image', {
        uri: photo.uri,
        type: 'image/jpeg',
        name: 'face_attendance.jpg',
      });

      // Submit to API
      const response = await apiService.faceAttendance(formData);
      return {
        success: true,
        data: response.data,
        location: locationData,
        photo: photo.uri,
      };
    } catch (error) {
      console.error('Face attendance error:', error);
      throw error;
    }
  }

  async storeFaceData(userId) {
    try {
      // Capture face photo for enrollment
      const photo = await this.capturePhoto({
        allowsEditing: false,
        aspect: [1, 1],
        quality: 0.9,
      });
      
      if (!photo) {
        throw new Error('Face photo is required for enrollment');
      }

      // Prepare form data
      const formData = new FormData();
      formData.append('userId', userId.toString());
      
      // Add face image
      formData.append('image', {
        uri: photo.uri,
        type: 'image/jpeg',
        name: 'face_enrollment.jpg',
      });

      // Submit to API
      const response = await apiService.storeFace(formData);
      return {
        success: true,
        data: response.data,
        photo: photo.uri,
      };
    } catch (error) {
      console.error('Store face error:', error);
      throw error;
    }
  }

  // 📊 Data Retrieval
  async getEmployeeAttendance(empId, wardId, date) {
    try {
      const response = await apiService.getEmployeeAttendance(empId, wardId, date);
      return response.data;
    } catch (error) {
      console.error('Get employee attendance error:', error);
      throw error;
    }
  }

  async getEmployeeDetail(empId, month) {
    try {
      const response = await apiService.getEmployeeDetail(empId, month);
      return response.data;
    } catch (error) {
      console.error('Get employee detail error:', error);
      throw error;
    }
  }

  async getAttendanceImage(attendanceId, punchType) {
    try {
      const response = await apiService.fetchImage(attendanceId, punchType);
      return response.data;
    } catch (error) {
      console.error('Get attendance image error:', error);
      throw error;
    }
  }
}

export default new AttendanceService();
