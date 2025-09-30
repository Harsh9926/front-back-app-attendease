import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { apiService } from '../services/apiService';
import { useAuth } from '../context/AuthContext';

const QuickActionsScreen = ({ navigation }) => {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    totalEmployees: 0,
    presentToday: 0,
    absentToday: 0,
    totalWards: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, [user?.user_id, user?.id, user?.userId]);

  const fetchStats = async () => {
    try {
      const supervisorId = user?.user_id ?? user?.id ?? user?.userId ?? null;
      const { success, data, message, raw } = await apiService.getSupervisorEmployees(supervisorId);
      if (success) {
        const wardsData = data || [];
        let totalEmployees = 0;
        let presentToday = 0;
        
        wardsData.forEach(ward => {
          totalEmployees += ward.employees?.length || 0;
          presentToday += ward.employees?.filter(emp => emp.attendance_status === 'Present').length || 0;
        });

        setStats({
          totalEmployees,
          presentToday,
          absentToday: totalEmployees - presentToday,
          totalWards: wardsData.length,
        });
      } else {
        console.error('Quick actions API returned success: false', raw);
        if (message) {
          Alert.alert('Quick Actions', message);
        }
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const quickActions = [
    {
      id: 'attendance-reports',
      title: 'Attendance Reports',
      subtitle: 'View detailed attendance analytics',
      icon: 'bar-chart',
      color: '#007bff',
      onPress: () => navigation.navigate('AttendanceReports'),
    },
    {
      id: 'today-attendance',
      title: 'Today\'s Attendance',
      subtitle: 'Check who\'s present today',
      icon: 'calendar',
      color: '#28a745',
      onPress: () => navigation.navigate('TodayAttendance'),
    },
    {
      id: 'notifications',
      title: 'Notifications',
      subtitle: 'View alerts and updates',
      icon: 'notifications',
      color: '#ffc107',
      onPress: () => navigation.navigate('Notifications'),
    },
    {
      id: 'face-gallery',
      title: 'Face Gallery',
      subtitle: 'Review uploaded face photos',
      icon: 'image',
      color: '#3f51b5',
      onPress: () => navigation.navigate('FaceGallery'),
    },
    {
      id: 'attendance-images',
      title: 'Attendance Images',
      subtitle: 'Fetch punch-in/out photos',
      icon: 'image-outline',
      color: '#20c997',
      onPress: () => navigation.navigate('AttendanceImages'),
    },
    {
      id: 'employee-search',
      title: 'Employee Search',
      subtitle: 'Find specific employees',
      icon: 'search',
      color: '#6f42c1',
      onPress: () => handleEmployeeSearch(),
    },
    {
      id: 'ward-overview',
      title: 'Ward Overview',
      subtitle: 'Manage your assigned wards',
      icon: 'location',
      color: '#fd7e14',
      onPress: () => handleWardOverview(),
    },
    {
      id: 'export-data',
      title: 'Export Data',
      subtitle: 'Download attendance reports',
      icon: 'download',
      color: '#20c997',
      onPress: () => handleExportData(),
    },
    {
      id: 'emergency-contact',
      title: 'Emergency Contacts',
      subtitle: 'Quick access to important numbers',
      icon: 'call',
      color: '#dc3545',
      onPress: () => handleEmergencyContacts(),
    },
    {
      id: 'feedback',
      title: 'Send Feedback',
      subtitle: 'Report issues or suggestions',
      icon: 'chatbubble',
      color: '#6c757d',
      onPress: () => handleFeedback(),
    },
  ];

  const handleEmployeeSearch = () => {
    Alert.alert(
      'Employee Search',
      'This feature allows you to quickly find employees across all your wards.',
      [{ text: 'OK' }]
    );
  };

  const handleWardOverview = () => {
    Alert.alert(
      'Ward Overview',
      'View detailed information about each ward under your supervision.',
      [{ text: 'OK' }]
    );
  };

  const handleExportData = () => {
    Alert.alert(
      'Export Data',
      'Export attendance data to Excel or PDF format for reporting.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Export Excel', onPress: () => console.log('Exporting Excel...') },
        { text: 'Export PDF', onPress: () => console.log('Exporting PDF...') },
      ]
    );
  };

  const handleEmergencyContacts = () => {
    Alert.alert(
      'Emergency Contacts',
      'Admin: +91 98765 43210\nHR Department: +91 98765 43211\nIT Support: +91 98765 43212',
      [{ text: 'OK' }]
    );
  };

  const handleFeedback = () => {
    Alert.alert(
      'Send Feedback',
      'Your feedback helps us improve the app. Please contact support@attendease.com',
      [{ text: 'OK' }]
    );
  };

  const ActionCard = ({ action }) => (
    <TouchableOpacity style={styles.actionCard} onPress={action.onPress}>
      <View style={[styles.iconContainer, { backgroundColor: `${action.color}20` }]}>
        <Ionicons name={action.icon} size={28} color={action.color} />
      </View>
      <View style={styles.actionContent}>
        <Text style={styles.actionTitle}>{action.title}</Text>
        <Text style={styles.actionSubtitle}>{action.subtitle}</Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color="#ccc" />
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007bff" />
        <Text style={styles.loadingText}>Loading quick actions...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.title}>Quick Actions</Text>
      </View>

      <View style={styles.content}>
        {/* Quick Stats */}
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{stats.totalEmployees}</Text>
            <Text style={styles.statLabel}>Total Employees</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statNumber, { color: '#28a745' }]}>{stats.presentToday}</Text>
            <Text style={styles.statLabel}>Present Today</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statNumber, { color: '#dc3545' }]}>{stats.absentToday}</Text>
            <Text style={styles.statLabel}>Absent Today</Text>
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.actionsContainer}>
          <Text style={styles.sectionTitle}>Available Actions</Text>
          {quickActions.map((action) => (
            <ActionCard key={action.id} action={action} />
          ))}
        </View>

        {/* Additional Info */}
        <View style={styles.infoContainer}>
          <Text style={styles.infoTitle}>Supervisor Tools</Text>
          <Text style={styles.infoText}>
            Access powerful tools to manage your team effectively. Monitor attendance, 
            generate reports, and stay connected with your employees.
          </Text>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#007bff',
    padding: 20,
    paddingTop: 60,
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    marginRight: 15,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  content: {
    padding: 20,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 30,
  },
  statCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
    alignItems: 'center',
    flex: 1,
    marginHorizontal: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#007bff',
    marginBottom: 5,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  actionsContainer: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  actionCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 15,
  },
  actionContent: {
    flex: 1,
  },
  actionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 3,
  },
  actionSubtitle: {
    fontSize: 14,
    color: '#666',
  },
  infoContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  infoText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
});

export default QuickActionsScreen;
