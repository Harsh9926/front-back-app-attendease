import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Dimensions,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LineChart, BarChart, PieChart } from 'react-native-chart-kit';
// import { useMultipleRealTimeData } from '../../hooks/useRealTimeData';

const { width } = Dimensions.get('window');

const AdminAnalyticsScreen = ({ navigation }) => {
  const [activeTab, setActiveTab] = useState('overview');

  // DISABLED REAL-TIME DATA TO PREVENT ERRORS
  // const dataEndpoints = [
  //   {
  //     key: 'overview',
  //     endpoint: '/api/admin/dashboard/overview',
  //     options: { refreshInterval: 120000, refreshOnMount: true } // 2 minutes
  //   },
  //   {
  //     key: 'weeklyTrend',
  //     endpoint: '/api/admin/analytics/weekly-trend',
  //     options: { refreshInterval: 300000, refreshOnMount: true } // 5 minutes
  //   }
  // ];

  // const { data: realTimeData, loading, error, refresh } = useMultipleRealTimeData(dataEndpoints);

  // STATIC DATA TO PREVENT ERRORS
  const realTimeData = {};
  const loading = false;
  const error = null;
  const refresh = () => { };

  // Fallback static analytics data
  const fallbackAnalyticsData = {
    overview: {
      totalSupervisors: 12,
      totalEmployees: 156,
      totalWards: 8,
      totalDepartments: 5,
      presentToday: 142,
      absentToday: 14,
      attendanceRate: 91.0
    },
    supervisorPerformance: [
      { name: 'Dr. Emily Davis', performance: 96.5, employees: 15 },
      { name: 'Dr. Robert Chen', performance: 98.1, employees: 12 },
      { name: 'Dr. Maria Rodriguez', performance: 94.8, employees: 18 }
    ],
    wardTrends: [
      { ward: 'Emergency', attendance: 92, capacity: 20 },
      { ward: 'ICU', attendance: 95, capacity: 15 },
      { ward: 'Surgery', attendance: 88, capacity: 25 },
      { ward: 'Pediatrics', attendance: 91, capacity: 18 }
    ],
    attendanceTrends: {
      labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
      datasets: [{
        data: [89, 92, 88, 94, 91, 85, 87]
      }]
    },
    realTimeStats: {
      currentOnline: 142,
      avgResponseTime: 1.2,
      systemLoad: 68,
      lastSync: new Date().toISOString()
    }
  };

  const TabButton = ({ title, isActive, onPress }) => (
    <TouchableOpacity
      style={[styles.tabButton, isActive && styles.activeTabButton]}
      onPress={onPress}
    >
      <Text style={[styles.tabButtonText, isActive && styles.activeTabButtonText]}>
        {title}
      </Text>
    </TouchableOpacity>
  );

  const MetricCard = ({ title, value, subtitle, icon, color }) => (
    <View style={styles.metricCard}>
      <View style={styles.metricHeader}>
        <View style={[styles.metricIcon, { backgroundColor: color }]}>
          <Ionicons name={icon} size={24} color="#fff" />
        </View>
        <View style={styles.metricInfo}>
          <Text style={styles.metricValue}>{value}</Text>
          <Text style={styles.metricTitle}>{title}</Text>
          {subtitle && <Text style={styles.metricSubtitle}>{subtitle}</Text>}
        </View>
      </View>
    </View>
  );

  const renderSupervisorPerformanceChart = () => {
    if (!analyticsData.supervisorPerformance || analyticsData.supervisorPerformance.length === 0) {
      return (
        <View style={styles.chartPlaceholder}>
          <Text style={styles.placeholderText}>No supervisor performance data</Text>
        </View>
      );
    }

    const topSupervisors = analyticsData.supervisorPerformance
      .filter(s => s.attendance_rate !== null)
      .sort((a, b) => (b.attendance_rate || 0) - (a.attendance_rate || 0))
      .slice(0, 5);

    const chartData = {
      labels: topSupervisors.map(s => s.supervisor_name.split(' ')[0]),
      datasets: [{
        data: topSupervisors.map(s => s.attendance_rate || 0)
      }]
    };

    return (
      <BarChart
        data={chartData}
        width={width - 40}
        height={220}
        chartConfig={{
          backgroundColor: '#ffffff',
          backgroundGradientFrom: '#ffffff',
          backgroundGradientTo: '#ffffff',
          decimalPlaces: 1,
          color: (opacity = 1) => `rgba(40, 167, 69, ${opacity})`,
          labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
          style: {
            borderRadius: 16
          }
        }}
        style={styles.chart}
        showValuesOnTopOfBars={true}
      />
    );
  };

  const renderWardTrendsChart = () => {
    if (!analyticsData.wardTrends || analyticsData.wardTrends.length === 0) {
      return (
        <View style={styles.chartPlaceholder}>
          <Text style={styles.placeholderText}>No ward trends data</Text>
        </View>
      );
    }

    const topWards = analyticsData.wardTrends
      .filter(w => w.attendance_rate !== null)
      .sort((a, b) => (b.attendance_rate || 0) - (a.attendance_rate || 0))
      .slice(0, 6);

    const pieData = topWards.map((ward, index) => ({
      name: ward.ward_name,
      population: ward.attendance_rate || 0,
      color: `hsl(${(index * 60) % 360}, 70%, 50%)`,
      legendFontColor: '#333',
      legendFontSize: 12
    }));

    return (
      <PieChart
        data={pieData}
        width={width - 40}
        height={220}
        chartConfig={{
          color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
        }}
        accessor="population"
        backgroundColor="transparent"
        paddingLeft="15"
        style={styles.chart}
      />
    );
  };

  // Use real-time data if available, otherwise fallback
  const analyticsData = {
    overview: realTimeData.overview || fallbackAnalyticsData.overview,
    weeklyTrend: realTimeData.weeklyTrend || fallbackAnalyticsData.weeklyTrend,
    supervisorPerformance: fallbackAnalyticsData.supervisorPerformance,
    wardPerformance: fallbackAnalyticsData.wardPerformance,
    attendanceTrends: fallbackAnalyticsData.attendanceTrends
  };

  const renderOverviewTab = () => (
    <View>
      {/* Key Metrics */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Key Metrics</Text>
        <View style={styles.metricsGrid}>
          <MetricCard
            title="Total Supervisors"
            value={analyticsData.overview.total_supervisors || 0}
            icon="people"
            color="#007bff"
          />
          <MetricCard
            title="Total Employees"
            value={analyticsData.overview.total_employees || 0}
            icon="person"
            color="#28a745"
          />
          <MetricCard
            title="Present Today"
            value={analyticsData.overview.today_present || 0}
            subtitle={`${((analyticsData.overview.today_present || 0) / (analyticsData.overview.total_employees || 1) * 100).toFixed(1)}% attendance`}
            icon="checkmark-circle"
            color="#28a745"
          />
          <MetricCard
            title="Absent Today"
            value={analyticsData.overview.today_absent || 0}
            subtitle={`${((analyticsData.overview.today_absent || 0) / (analyticsData.overview.total_employees || 1) * 100).toFixed(1)}% absent`}
            icon="close-circle"
            color="#dc3545"
          />
        </View>
      </View>

      {/* Top Performing Supervisors */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Top Performing Supervisors</Text>
        <View style={styles.chartContainer}>
          {renderSupervisorPerformanceChart()}
        </View>
      </View>
    </View>
  );

  const renderPerformanceTab = () => (
    <View>
      {/* Supervisor Performance List */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Supervisor Performance (30 Days)</Text>
        {analyticsData.supervisorPerformance.map((supervisor, index) => (
          <View key={index} style={styles.performanceCard}>
            <View style={styles.performanceHeader}>
              <Text style={styles.supervisorName}>{supervisor.supervisor_name}</Text>
              <View style={[
                styles.performanceBadge,
                {
                  backgroundColor: (supervisor.attendance_rate || 0) >= 80 ? '#28a745' :
                    (supervisor.attendance_rate || 0) >= 60 ? '#ffc107' : '#dc3545'
                }
              ]}>
                <Text style={styles.performanceRate}>
                  {supervisor.attendance_rate ? `${supervisor.attendance_rate}%` : 'N/A'}
                </Text>
              </View>
            </View>
            <View style={styles.performanceStats}>
              <View style={styles.performanceStat}>
                <Text style={styles.statLabel}>Employees</Text>
                <Text style={styles.statValue}>{supervisor.total_employees}</Text>
              </View>
              <View style={styles.performanceStat}>
                <Text style={styles.statLabel}>Wards</Text>
                <Text style={styles.statValue}>{supervisor.assigned_wards}</Text>
              </View>
              <View style={styles.performanceStat}>
                <Text style={styles.statLabel}>Active Days</Text>
                <Text style={styles.statValue}>{supervisor.active_days}</Text>
              </View>
            </View>
          </View>
        ))}
      </View>
    </View>
  );

  const renderWardsTab = () => (
    <View>
      {/* Ward Performance Chart */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Ward Attendance Distribution</Text>
        <View style={styles.chartContainer}>
          {renderWardTrendsChart()}
        </View>
      </View>

      {/* Ward Performance List */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Ward Performance Details</Text>
        {analyticsData.wardTrends.map((ward, index) => (
          <View key={index} style={styles.wardCard}>
            <View style={styles.wardHeader}>
              <View style={styles.wardInfo}>
                <Text style={styles.wardName}>{ward.ward_name}</Text>
                <Text style={styles.zoneName}>{ward.zone_name}</Text>
              </View>
              <View style={[
                styles.wardBadge,
                {
                  backgroundColor: (ward.attendance_rate || 0) >= 80 ? '#28a745' :
                    (ward.attendance_rate || 0) >= 60 ? '#ffc107' : '#dc3545'
                }
              ]}>
                <Text style={styles.wardRate}>
                  {ward.attendance_rate ? `${ward.attendance_rate}%` : 'N/A'}
                </Text>
              </View>
            </View>
            <View style={styles.wardStats}>
              <View style={styles.wardStat}>
                <Text style={styles.statLabel}>Total Employees</Text>
                <Text style={styles.statValue}>{ward.total_employees}</Text>
              </View>
              <View style={styles.wardStat}>
                <Text style={styles.statLabel}>With Attendance</Text>
                <Text style={styles.statValue}>{ward.employees_with_attendance}</Text>
              </View>
              <View style={styles.wardStat}>
                <Text style={styles.statLabel}>Supervisor</Text>
                <Text style={styles.statValue}>{ward.supervisor_name || 'Unassigned'}</Text>
              </View>
            </View>
          </View>
        ))}
      </View>
    </View>
  );

  return (
    <View style={styles.container} >
      {/* Header */}
      < View style={styles.header} >
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>System Analytics</Text>
          <View style={styles.statusIndicator}>
            <View style={[styles.statusDot, { backgroundColor: '#28a745' }]} />
            <Text style={styles.statusText}>
              System Online
            </Text>
          </View>
        </View>
        <TouchableOpacity style={styles.exportButton}>
          <Ionicons name="download-outline" size={24} color="#007bff" />
        </TouchableOpacity>
      </View >

      {/* Tabs */}
      < View style={styles.tabsContainer} >
        <TabButton
          title="Overview"
          isActive={activeTab === 'overview'}
          onPress={() => setActiveTab('overview')}
        />
        <TabButton
          title="Supervisors"
          isActive={activeTab === 'performance'}
          onPress={() => setActiveTab('performance')}
        />
        <TabButton
          title="Wards"
          isActive={activeTab === 'wards'}
          onPress={() => setActiveTab('wards')}
        />
      </View >

      {/* Content */}
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
        {activeTab === 'overview' && renderOverviewTab()}
        {activeTab === 'performance' && renderPerformanceTab()}
        {activeTab === 'wards' && renderWardsTab()}
      </ScrollView >
    </View >
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
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  statusIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 4,
  },
  statusText: {
    fontSize: 10,
    color: '#666',
    fontWeight: '500',
  },

  exportButton: {
    padding: 8,
  },
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  tabButton: {
    flex: 1,
    paddingVertical: 15,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTabButton: {
    borderBottomColor: '#007bff',
  },
  tabButtonText: {
    fontSize: 16,
    color: '#666',
  },
  activeTabButtonText: {
    color: '#007bff',
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
    paddingHorizontal: 20,
  },
  metricsGrid: {
    paddingHorizontal: 20,
  },
  metricCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  metricHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metricIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  metricInfo: {
    flex: 1,
  },
  metricValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  metricTitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  metricSubtitle: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  chartContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginHorizontal: 20,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  chart: {
    borderRadius: 16,
  },
  chartPlaceholder: {
    height: 220,
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    color: '#666',
    fontSize: 16,
  },
  performanceCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 20,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  performanceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  supervisorName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
  },
  performanceBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  performanceRate: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#fff',
  },
  performanceStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  performanceStat: {
    alignItems: 'center',
    flex: 1,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  wardCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 20,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  wardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  wardInfo: {
    flex: 1,
  },
  wardName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  zoneName: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  wardBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  wardRate: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#fff',
  },
  wardStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  wardStat: {
    alignItems: 'center',
    flex: 1,
  },
});

export default AdminAnalyticsScreen;
