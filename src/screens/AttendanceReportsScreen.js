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

const AttendanceReportsScreen = ({ navigation }) => {
  const { user } = useAuth();
  const [reportData, setReportData] = useState({
    todayStats: { present: 0, absent: 0, total: 0 },
    weeklyStats: [],
    monthlyStats: { totalWorkingDays: 0, avgAttendance: 0 },
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchReportData();
  }, [user?.user_id, user?.id, user?.userId]);

  const fetchReportData = async () => {
    try {
      setLoading(true);
      const supervisorId = user?.user_id ?? user?.id ?? user?.userId ?? null;
      const { success, data, message, raw } = await apiService.getSupervisorEmployees(supervisorId);
      
      if (success) {
        const wardsData = data || [];
        calculateStats(wardsData);
      } else {
        console.error('Attendance reports API returned success: false', raw);
        if (message) {
          Alert.alert('Error', message);
        }
      }
    } catch (error) {
      console.error('Error fetching report data:', error);
      Alert.alert('Error', 'Failed to fetch attendance reports');
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (wardsData) => {
    let totalEmployees = 0;
    let presentToday = 0;
    
    wardsData.forEach(ward => {
      totalEmployees += ward.employees?.length || 0;
      presentToday += ward.employees?.filter(emp => emp.attendance_status === 'Present').length || 0;
    });

    const absentToday = totalEmployees - presentToday;
    const attendancePercentage = totalEmployees > 0 ? ((presentToday / totalEmployees) * 100).toFixed(1) : 0;

    setReportData({
      todayStats: {
        present: presentToday,
        absent: absentToday,
        total: totalEmployees,
        percentage: attendancePercentage,
      },
      weeklyStats: generateWeeklyData(),
      monthlyStats: {
        totalWorkingDays: 22,
        avgAttendance: attendancePercentage,
      },
    });
  };

  const generateWeeklyData = () => {
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    return days.map(day => ({
      day,
      percentage: Math.floor(Math.random() * 30) + 70, // Mock data for demo
    }));
  };

  const StatCard = ({ title, value, subtitle, color, icon }) => (
    <View style={[styles.statCard, { borderLeftColor: color }]}>
      <View style={styles.statHeader}>
        <Ionicons name={icon} size={24} color={color} />
        <Text style={styles.statTitle}>{title}</Text>
      </View>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      {subtitle && <Text style={styles.statSubtitle}>{subtitle}</Text>}
    </View>
  );

  const WeeklyChart = ({ data }) => (
    <View style={styles.chartContainer}>
      <Text style={styles.chartTitle}>Weekly Attendance Trend</Text>
      <View style={styles.chart}>
        {data.map((item, index) => (
          <View key={index} style={styles.chartBar}>
            <View 
              style={[
                styles.bar, 
                { height: `${item.percentage}%`, backgroundColor: getBarColor(item.percentage) }
              ]} 
            />
            <Text style={styles.chartLabel}>{item.day}</Text>
            <Text style={styles.chartValue}>{item.percentage}%</Text>
          </View>
        ))}
      </View>
    </View>
  );

  const getBarColor = (percentage) => {
    if (percentage >= 90) return '#28a745';
    if (percentage >= 75) return '#ffc107';
    return '#dc3545';
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007bff" />
        <Text style={styles.loadingText}>Loading reports...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.title}>Attendance Reports</Text>
      </View>

      <View style={styles.content}>
        {/* Today's Stats */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Today's Overview</Text>
          <View style={styles.statsGrid}>
            <StatCard
              title="Present"
              value={reportData.todayStats.present}
              subtitle={`${reportData.todayStats.percentage}%`}
              color="#28a745"
              icon="checkmark-circle"
            />
            <StatCard
              title="Absent"
              value={reportData.todayStats.absent}
              subtitle={`${(100 - reportData.todayStats.percentage).toFixed(1)}%`}
              color="#dc3545"
              icon="close-circle"
            />
            <StatCard
              title="Total"
              value={reportData.todayStats.total}
              subtitle="Employees"
              color="#007bff"
              icon="people"
            />
          </View>
        </View>

        {/* Weekly Trend */}
        <View style={styles.section}>
          <WeeklyChart data={reportData.weeklyStats} />
        </View>

        {/* Monthly Summary */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Monthly Summary</Text>
          <View style={styles.monthlyCard}>
            <View style={styles.monthlyRow}>
              <Text style={styles.monthlyLabel}>Working Days</Text>
              <Text style={styles.monthlyValue}>{reportData.monthlyStats.totalWorkingDays}</Text>
            </View>
            <View style={styles.monthlyRow}>
              <Text style={styles.monthlyLabel}>Average Attendance</Text>
              <Text style={styles.monthlyValue}>{reportData.monthlyStats.avgAttendance}%</Text>
            </View>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.section}>
          <TouchableOpacity style={styles.actionButton}>
            <Ionicons name="download" size={20} color="#fff" />
            <Text style={styles.actionButtonText}>Export Report</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={[styles.actionButton, styles.secondaryButton]}>
            <Ionicons name="calendar" size={20} color="#007bff" />
            <Text style={[styles.actionButtonText, styles.secondaryButtonText]}>Custom Date Range</Text>
          </TouchableOpacity>
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
  section: {
    marginBottom: 25,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
    flex: 1,
    marginHorizontal: 5,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  statHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  statTitle: {
    fontSize: 12,
    color: '#666',
    marginLeft: 8,
    fontWeight: '500',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  statSubtitle: {
    fontSize: 12,
    color: '#666',
  },
  chartContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 20,
    textAlign: 'center',
  },
  chart: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'flex-end',
    height: 120,
  },
  chartBar: {
    alignItems: 'center',
    flex: 1,
  },
  bar: {
    width: 20,
    borderRadius: 10,
    marginBottom: 5,
  },
  chartLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 5,
  },
  chartValue: {
    fontSize: 10,
    color: '#333',
    fontWeight: 'bold',
  },
  monthlyCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  monthlyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  monthlyLabel: {
    fontSize: 16,
    color: '#333',
  },
  monthlyValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#007bff',
  },
  actionButton: {
    backgroundColor: '#007bff',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
  },
  secondaryButton: {
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#007bff',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 10,
  },
  secondaryButtonText: {
    color: '#007bff',
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

export default AttendanceReportsScreen;
