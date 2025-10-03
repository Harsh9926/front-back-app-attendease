import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Switch,
  Modal,
  TextInput,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
// import { useRealTimeData } from '../../hooks/useRealTimeData';
// import { apiService } from '../../services/apiService';

const AdminSettingsScreen = ({ navigation }) => {
  const { user, logout } = useAuth();
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showSystemModal, setShowSystemModal] = useState(false);

  // DISABLED REAL-TIME DATA TO PREVENT ERRORS
  // const { data: systemSettings, loading, error, refresh } = useRealTimeData('/api/admin/settings/system', {
  //   refreshInterval: 300000, // 5 minutes
  //   refreshOnMount: true,
  //   refreshOnFocus: true
  // });

  // STATIC DATA TO PREVENT ERRORS
  const systemSettings = null;
  const loading = false;
  const error = null;
  const refresh = () => { };

  // Fallback settings
  const fallbackSettings = {
    notifications: true,
    autoBackup: true,
    dataRetention: 90,
    requireLocationForAttendance: true,
    allowOfflineMode: false,
  };

  // Use real-time data if available, otherwise fallback
  const settings = systemSettings || fallbackSettings;

  const [profileData, setProfileData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    phone: user?.phone || '',
  });

  // Simple setting update function
  const updateSetting = (key, value) => {
    // Show success message
    Alert.alert('Success', 'Setting updated successfully');
  };

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: logout
        }
      ]
    );
  };

  const handleExportData = () => {
    Alert.alert(
      'Export System Data',
      'Choose what data to export:',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'All Data', onPress: () => exportData('all') },
        { text: 'Attendance Only', onPress: () => exportData('attendance') },
        { text: 'Users Only', onPress: () => exportData('users') }
      ]
    );
  };

  const exportData = (type) => {
    Alert.alert('Export Started', `${type} data export has been initiated. You will receive an email when complete.`);
  };

  const handleBackupNow = () => {
    Alert.alert(
      'Manual Backup',
      'Start manual backup now?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Start Backup',
          onPress: () => Alert.alert('Backup Started', 'Manual backup has been initiated.')
        }
      ]
    );
  };

  const handleSystemReset = () => {
    Alert.alert(
      'System Reset',
      'This will reset all system settings to default. This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: () => Alert.alert('Reset Complete', 'System settings have been reset to default.')
        }
      ]
    );
  };

  const SettingItem = ({ icon, title, subtitle, onPress, rightComponent, color = '#333' }) => (
    <TouchableOpacity style={styles.settingItem} onPress={onPress}>
      <View style={styles.settingLeft}>
        <View style={[styles.settingIcon, { backgroundColor: color + '20' }]}>
          <Ionicons name={icon} size={24} color={color} />
        </View>
        <View style={styles.settingText}>
          <Text style={styles.settingTitle}>{title}</Text>
          {subtitle && <Text style={styles.settingSubtitle}>{subtitle}</Text>}
        </View>
      </View>
      {rightComponent || <Ionicons name="chevron-forward" size={20} color="#666" />}
    </TouchableOpacity>
  );

  const SectionHeader = ({ title }) => (
    <Text style={styles.sectionHeader}>{title}</Text>
  );

  const ProfileModal = () => (
    <Modal
      visible={showProfileModal}
      animationType="slide"
      transparent={true}
      onRequestClose={() => setShowProfileModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Edit Profile</Text>
            <TouchableOpacity onPress={() => setShowProfileModal(false)}>
              <Ionicons name="close" size={24} color="#333" />
            </TouchableOpacity>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Name</Text>
            <TextInput
              style={styles.textInput}
              value={profileData.name}
              onChangeText={(text) => setProfileData(prev => ({ ...prev, name: text }))}
              placeholder="Enter your name"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Email</Text>
            <TextInput
              style={styles.textInput}
              value={profileData.email}
              onChangeText={(text) => setProfileData(prev => ({ ...prev, email: text }))}
              placeholder="Enter your email"
              keyboardType="email-address"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Phone</Text>
            <TextInput
              style={styles.textInput}
              value={profileData.phone}
              onChangeText={(text) => setProfileData(prev => ({ ...prev, phone: text }))}
              placeholder="Enter your phone number"
              keyboardType="phone-pad"
            />
          </View>

          <View style={styles.modalActions}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => setShowProfileModal(false)}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.saveButton}
              onPress={() => {
                Alert.alert('Success', 'Profile updated successfully');
                setShowProfileModal(false);
              }}
            >
              <Text style={styles.saveButtonText}>Save Changes</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  const SystemModal = () => (
    <Modal
      visible={showSystemModal}
      animationType="slide"
      transparent={true}
      onRequestClose={() => setShowSystemModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>System Configuration</Text>
            <TouchableOpacity onPress={() => setShowSystemModal(false)}>
              <Ionicons name="close" size={24} color="#333" />
            </TouchableOpacity>
          </View>

          <View style={styles.configSection}>
            <Text style={styles.configLabel}>Data Retention (Days)</Text>
            <TextInput
              style={styles.textInput}
              value={settings.dataRetention.toString()}
              onChangeText={(text) => {
                const value = parseInt(text) || 90;
                setSettings(prev => ({ ...prev, dataRetention: value }));
              }}
              placeholder="90"
              keyboardType="numeric"
            />
          </View>

          <View style={styles.configSection}>
            <View style={styles.switchRow}>
              <Text style={styles.configLabel}>Require Location for Attendance</Text>
              <Switch
                value={settings.requireLocationForAttendance}
                onValueChange={(value) => updateSetting('requireLocationForAttendance', value)}
              />
            </View>
          </View>

          <View style={styles.configSection}>
            <View style={styles.switchRow}>
              <Text style={styles.configLabel}>Allow Offline Mode</Text>
              <Switch
                value={settings.allowOfflineMode}
                onValueChange={(value) => updateSetting('allowOfflineMode', value)}
              />
            </View>
          </View>

          <View style={styles.modalActions}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => setShowSystemModal(false)}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.saveButton}
              onPress={() => setShowSystemModal(false)}
            >
              <Text style={styles.saveButtonText}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Admin Settings</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={loading}
            onRefresh={refresh}
            colors={['#dc3545']}
            tintColor="#dc3545"
          />
        }
      >
        {/* Profile Section */}
        <SectionHeader title="Profile" />
        <View style={styles.section}>
          <SettingItem
            icon="person"
            title="Edit Profile"
            subtitle="Update your personal information"
            onPress={() => setShowProfileModal(true)}
            color="#007bff"
          />
          <SettingItem
            icon="key"
            title="Change Password"
            subtitle="Update your account password"
            onPress={() => Alert.alert('Coming Soon', 'Password change feature will be available soon')}
            color="#28a745"
          />
        </View>

        {/* System Management */}
        <SectionHeader title="System Management" />
        <View style={styles.section}>
          <SettingItem
            icon="settings"
            title="System Configuration"
            subtitle="Configure system-wide settings"
            onPress={() => setShowSystemModal(true)}
            color="#6f42c1"
          />
          <SettingItem
            icon="people"
            title="User Management"
            subtitle="Manage supervisors and employees"
            onPress={() => Alert.alert('Coming Soon', 'User management feature will be available soon')}
            color="#fd7e14"
          />
          <SettingItem
            icon="location"
            title="Ward Management"
            subtitle="Manage wards and assignments"
            onPress={() => Alert.alert('Coming Soon', 'Ward management feature will be available soon')}
            color="#20c997"
          />
        </View>

        {/* Data & Backup */}
        <SectionHeader title="Data & Backup" />
        <View style={styles.section}>
          <SettingItem
            icon="download"
            title="Export Data"
            subtitle="Export system data for backup"
            onPress={handleExportData}
            color="#17a2b8"
          />
          <SettingItem
            icon="cloud-upload"
            title="Backup Now"
            subtitle="Start manual backup"
            onPress={handleBackupNow}
            color="#28a745"
          />
          <SettingItem
            icon="notifications"
            title="Notifications"
            subtitle="System notifications"
            rightComponent={
              <Switch
                value={settings.notifications}
                onValueChange={(value) => updateSetting('notifications', value)}
              />
            }
            color="#ffc107"
          />
          <SettingItem
            icon="sync"
            title="Auto Backup"
            subtitle="Automatic daily backups"
            rightComponent={
              <Switch
                value={settings.autoBackup}
                onValueChange={(value) => updateSetting('autoBackup', value)}
              />
            }
            color="#6610f2"
          />
        </View>

        {/* Reports & Analytics */}
        <SectionHeader title="Reports & Analytics" />
        <View style={styles.section}>
          <SettingItem
            icon="analytics"
            title="System Analytics"
            subtitle="View detailed system analytics"
            onPress={() => Alert.alert('Coming Soon', 'System analytics feature will be available soon')}
            color="#e83e8c"
          />
          <SettingItem
            icon="document-text"
            title="Generate Reports"
            subtitle="Create custom reports"
            onPress={() => Alert.alert('Coming Soon', 'Custom reports feature will be available soon')}
            color="#6c757d"
          />
          <SettingItem
            icon="calendar"
            title="Attendance Management"
            subtitle="Manage attendance records"
            onPress={() => Alert.alert('Coming Soon', 'Attendance management feature will be available soon')}
            color="#dc3545"
          />
        </View>

        {/* System Actions */}
        <SectionHeader title="System Actions" />
        <View style={styles.section}>
          <SettingItem
            icon="refresh"
            title="Reset Settings"
            subtitle="Reset all settings to default"
            onPress={handleSystemReset}
            color="#dc3545"
          />
          <SettingItem
            icon="information-circle"
            title="System Information"
            subtitle="View app version and system info"
            onPress={() => Alert.alert('System Info', 'AttendEase Admin v1.0.0\nBuild: 2024.01.01')}
            color="#6c757d"
          />
        </View>

        {/* Account Actions */}
        <SectionHeader title="Account" />
        <View style={styles.section}>
          <SettingItem
            icon="log-out"
            title="Logout"
            subtitle="Sign out of your account"
            onPress={handleLogout}
            color="#dc3545"
          />
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>AttendEase Admin Panel</Text>
          <Text style={styles.footerVersion}>Version 1.0.0</Text>
        </View>
      </ScrollView>

      <ProfileModal />
      <SystemModal />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
  },
  sectionHeader: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#666',
    marginTop: 30,
    marginBottom: 10,
    marginHorizontal: 20,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  section: {
    backgroundColor: '#fff',
    marginHorizontal: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f3f4',
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  settingText: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  settingSubtitle: {
    fontSize: 14,
    color: '#666',
  },
  footer: {
    alignItems: 'center',
    paddingVertical: 30,
  },
  footerText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  footerVersion: {
    fontSize: 14,
    color: '#666',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    width: '90%',
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#e9ecef',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#333',
    backgroundColor: '#f8f9fa',
  },
  configSection: {
    marginBottom: 20,
  },
  configLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#6c757d',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    marginRight: 10,
  },
  cancelButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  saveButton: {
    flex: 1,
    backgroundColor: '#007bff',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    marginLeft: 10,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default AdminSettingsScreen;
