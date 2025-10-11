import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  RefreshControl,
  Dimensions,
  Platform,
  Modal,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { PieChart, BarChart } from 'react-native-chart-kit';
import { apiService } from '../services/apiService';
import { useAuth } from '../context/AuthContext';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

const INITIAL_REPORT = {
  todaySummary: {
    totalEmployees: 0,
    marked: 0,
    inProgress: 0,
    notMarked: 0,
    attendanceRate: 0,
  },
  weeklyStats: [],
  monthlySummary: {
    attendanceRate: 0,
    totalEmployees: 0,
    marked: 0,
    inProgress: 0,
    notMarked: 0,
    workingDays: 0,
    rangeLabel: '',
  },
  statusBreakdown: {
    marked: 0,
    inProgress: 0,
    notMarked: 0,
  },
};

const AttendanceReportsScreen = ({ navigation }) => {
  const { user } = useAuth();
  const [reportData, setReportData] = useState(INITIAL_REPORT);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [startDate, setStartDate] = useState(() => {
    const base = new Date();
    base.setHours(0, 0, 0, 0);
    base.setDate(base.getDate() - 6);
    return base;
  });
  const [endDate, setEndDate] = useState(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return today;
  });
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState(null);
  const [employeePickerVisible, setEmployeePickerVisible] = useState(false);
  const [employeeSearch, setEmployeeSearch] = useState('');
  const [employees, setEmployees] = useState([]);

  const screenWidth = Dimensions.get('window').width || 360;

  const toISODate = useCallback((input) => {
    if (!input) {
      return '';
    }

    const date = input instanceof Date ? new Date(input.getTime()) : new Date(input);
    if (Number.isNaN(date.getTime())) {
      return '';
    }
    date.setHours(0, 0, 0, 0);
    const offsetMs = date.getTimezoneOffset() * 60 * 1000;
    const adjusted = new Date(date.getTime() - offsetMs);
    return adjusted.toISOString().split('T')[0];
  }, []);

  const formatDisplayDate = useCallback((date) => {
    try {
      return new Intl.DateTimeFormat(undefined, { day: '2-digit', month: 'short' }).format(date);
    } catch (_error) {
      return '';
    }
  }, []);

  const buildWeeklyDates = useCallback(
    (endDateValue, totalDays = 7) => {
      const days = [];
      const end = endDateValue ? new Date(endDateValue.getTime()) : new Date();
      end.setHours(0, 0, 0, 0);

      for (let offset = totalDays - 1; offset >= 0; offset -= 1) {
        const current = new Date(end.getTime());
        current.setDate(current.getDate() - offset);
        days.push({
          date: current,
          iso: toISODate(current),
          label: current.toLocaleDateString(undefined, { weekday: 'short' }),
        });
      }
      return days;
    },
    [toISODate]
  );

  const fetchReportData = useCallback(
    async ({ rangeStartDate, rangeEndDate, silently = false } = {}) => {
      const supervisorId = user?.user_id ?? user?.id ?? user?.userId ?? null;

      if (!supervisorId) {
        setReportData(INITIAL_REPORT);
        setLoading(false);
        setRefreshing(false);
        return;
      }

      if (silently) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      try {
        const startSource = rangeStartDate ?? startDate;
        const endSource = rangeEndDate ?? endDate;

        const rangeStart = new Date(startSource.getTime());
        rangeStart.setHours(0, 0, 0, 0);
        const rangeEnd = new Date(endSource.getTime());
        rangeEnd.setHours(0, 0, 0, 0);

        if (rangeStart > rangeEnd) {
          Alert.alert('Date Range', 'Start date cannot be after end date.');
          setLoading(false);
          setRefreshing(false);
          return;
        }

        const rangeStartIso = toISODate(rangeStart);
        const rangeEndIso = toISODate(rangeEnd);
        const diffMillis = rangeEnd.getTime() - rangeStart.getTime();
        const diffDays = Math.max(0, Math.round(diffMillis / (1000 * 60 * 60 * 24)));
        const weeklyDaysCount = Math.min(diffDays + 1, 7);
        const weeklyDates = buildWeeklyDates(rangeEnd, Math.max(weeklyDaysCount, 1));

        const [todaySummaryRes, monthlySummaryRes, employeesRes] = await Promise.all([
          apiService
            .getSupervisorSummary({
              userId: supervisorId,
              startDate: rangeStartIso,
              endDate: rangeEndIso,
            })
            .catch((error) => {
              console.error('Attendance reports: today summary failed', error);
              return null;
            }),
          apiService
            .getSupervisorSummary({
              userId: supervisorId,
              startDate: rangeStartIso,
              endDate: rangeEndIso,
            })
            .catch((error) => {
              console.error('Attendance reports: monthly summary failed', error);
              return null;
            }),
          apiService
            .getSupervisorEmployees(supervisorId, {
              startDate: rangeStartIso,
              endDate: rangeEndIso,
            })
            .catch((error) => {
              console.error('Attendance reports: employees fetch failed', error);
              return { success: false, data: [] };
            }),
        ]);

        const weeklySummaries = await Promise.all(
          weeklyDates.map((entry) =>
            apiService
              .getSupervisorSummary({
                userId: supervisorId,
                startDate: entry.iso,
                endDate: entry.iso,
              })
              .catch((error) => {
                console.error('Attendance reports: weekly summary failed', entry.iso, error);
                return null;
              })
          )
        );

        const todaySummaryData = todaySummaryRes?.data ?? INITIAL_REPORT.todaySummary;
        const monthlySummaryData = monthlySummaryRes?.data ?? INITIAL_REPORT.monthlySummary;
        const wards = employeesRes?.success ? employeesRes.data || [] : [];

        const flattenedEmployees = [];
        wards.forEach((ward) => {
          (ward?.employees || []).forEach((employee) => {
            flattenedEmployees.push(employee);
          });
        });

        const statusBreakdown = flattenedEmployees.reduce(
          (acc, employee) => {
            const status = (employee?.attendance_status || '').toString().trim().toLowerCase();
            if (status.includes('marked')) {
              acc.marked += 1;
            } else if (status.includes('progress')) {
              acc.inProgress += 1;
            } else {
              acc.notMarked += 1;
            }
            return acc;
          },
          { marked: 0, inProgress: 0, notMarked: 0 }
        );

        const rangeSummary = {
          totalEmployees: todaySummaryData.totalEmployees ?? 0,
          marked: todaySummaryData.marked ?? 0,
          inProgress: todaySummaryData.inProgress ?? 0,
          notMarked: todaySummaryData.notMarked ?? 0,
          attendanceRate: todaySummaryData.attendanceRate ?? 0,
        };

        const weeklyStats = weeklyDates.map((entry, index) => {
          const summary = weeklySummaries[index]?.data ?? null;
          const totalEmployees = summary?.totalEmployees ?? rangeSummary.totalEmployees ?? 0;
          const marked = summary?.marked ?? 0;
          const inProgress = summary?.inProgress ?? 0;
          const notMarked = summary?.notMarked ?? Math.max(totalEmployees - (marked + inProgress), 0);
          const present = marked + inProgress;
          const attendanceRate =
            totalEmployees > 0 ? Number(((present / totalEmployees) * 100).toFixed(1)) : 0;

          return {
            label: entry.label,
            iso: entry.iso,
            totalEmployees,
            marked,
            inProgress,
            notMarked,
            present,
            attendanceRate: summary?.attendanceRate ?? attendanceRate,
          };
        });

        const daysDiff =
          rangeStartIso && rangeEndIso
            ? Math.abs(
                Math.round(
                  (new Date(rangeEndIso).getTime() - new Date(rangeStartIso).getTime()) /
                    (1000 * 60 * 60 * 24)
                )
              ) + 1
            : 0;

        const rangeLabelStart = formatDisplayDate(rangeStart);
        const rangeLabelEnd = formatDisplayDate(rangeEnd);
        const monthlySummary = {
          attendanceRate: monthlySummaryData.attendanceRate ?? 0,
          totalEmployees: monthlySummaryData.totalEmployees ?? rangeSummary.totalEmployees ?? 0,
          marked: monthlySummaryData.marked ?? 0,
          inProgress: monthlySummaryData.inProgress ?? 0,
          notMarked: monthlySummaryData.notMarked ?? 0,
          workingDays: daysDiff,
          rangeLabel:
            rangeLabelStart && rangeLabelEnd
              ? `${rangeLabelStart} - ${rangeLabelEnd}`
              : `${rangeStartIso} - ${rangeEndIso}`,
        };

        setReportData({
          todaySummary: rangeSummary,
          weeklyStats,
          monthlySummary,
          statusBreakdown,
        });
        setLastUpdated(new Date());
        setEmployees(flattenedEmployees);
        if (selectedEmployeeId && !flattenedEmployees.some(emp => emp.emp_id === selectedEmployeeId)) {
          setSelectedEmployeeId(null);
        }
      } catch (error) {
        console.error('Attendance reports: fetch failed', error);
        Alert.alert('Attendance Reports', 'Unable to load reports right now. Please try again.');
        setReportData(INITIAL_REPORT);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [user, toISODate, buildWeeklyDates, formatDisplayDate, startDate, endDate, selectedEmployeeId]
  );

  const onRefresh = useCallback(() => {
    fetchReportData({ rangeStartDate: startDate, rangeEndDate: endDate, silently: true });
  }, [fetchReportData, startDate, endDate]);

  const handleApplyRange = useCallback(() => {
    fetchReportData({ rangeStartDate: startDate, rangeEndDate: endDate });
  }, [fetchReportData, startDate, endDate]);

  const handleResetRange = useCallback(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const defaultStart = new Date(today.getTime());
    defaultStart.setDate(defaultStart.getDate() - 6);

    setStartDate(defaultStart);
    setEndDate(today);
    setSelectedEmployeeId(null);
    fetchReportData({ rangeStartDate: defaultStart, rangeEndDate: today });
  }, [fetchReportData]);

  const handleStartDateChange = useCallback(
    (event, selectedDate) => {
      if (Platform.OS === 'android') {
        setShowStartPicker(false);
      }

      const eventType = event?.type ?? 'set';
      if (eventType === 'dismissed') {
        return;
      }

      const picked = selectedDate ? new Date(selectedDate) : startDate;
      picked.setHours(0, 0, 0, 0);

      setStartDate(picked);
      if (picked > endDate) {
        setEndDate(picked);
      }

      if (Platform.OS === 'ios') {
        setShowStartPicker(false);
      }
    },
    [startDate, endDate]
  );

  const handleEndDateChange = useCallback(
    (event, selectedDate) => {
      if (Platform.OS === 'android') {
        setShowEndPicker(false);
      }

      const eventType = event?.type ?? 'set';
      if (eventType === 'dismissed') {
        return;
      }

      const picked = selectedDate ? new Date(selectedDate) : endDate;
      picked.setHours(0, 0, 0, 0);

      setEndDate(picked);
      if (picked < startDate) {
        setStartDate(picked);
      }

      if (Platform.OS === 'ios') {
        setShowEndPicker(false);
      }
    },
    [startDate, endDate]
  );

  const handleExportReport = useCallback(async () => {
    try {
      const rangeLabel = reportData.monthlySummary.rangeLabel || 'Selected Range';
      const stats = reportData.todaySummary;
      const status = reportData.statusBreakdown;

      const employeesRows = employees
        .map((employee) => {
          const presentDays = Number(employee.days_present ?? 0);
          const markedDays = Number(employee.days_marked ?? 0);
          const inProgressDays = Math.max(presentDays - markedDays, 0);
          const notMarkedDays = Math.max(reportData.monthlySummary.workingDays - presentDays, 0);

          return `
            <tr>
              <td>${employee.emp_name || 'N/A'}</td>
              <td>${employee.emp_code || '-'}</td>
              <td>${presentDays}</td>
              <td>${markedDays}</td>
              <td>${inProgressDays}</td>
              <td>${notMarkedDays}</td>
            </tr>
          `;
        })
        .join('');

      const htmlContent = `
        <html>
          <head>
            <meta name="viewport" content="width=device-width, initial-scale=1" />
            <style>
              body { font-family: Arial, sans-serif; padding: 24px; color: #1f2933; }
              h1 { font-size: 20px; margin-bottom: 8px; }
              h2 { font-size: 16px; margin-top: 24px; margin-bottom: 8px; }
              table { width: 100%; border-collapse: collapse; margin-top: 12px; }
              th, td { border: 1px solid #d1d5db; padding: 8px; font-size: 12px; text-align: left; }
              th { background: #f3f4f6; }
              .summary-grid { display: flex; flex-wrap: wrap; gap: 12px; }
              .summary-card { flex: 1 1 140px; border: 1px solid #d1d5db; border-radius: 8px; padding: 12px; }
              .summary-card h3 { margin: 0 0 6px; font-size: 14px; }
              .summary-card p { margin: 0; font-size: 12px; }
            </style>
          </head>
          <body>
            <h1>Attendance Report</h1>
            <p><strong>Range:</strong> ${rangeLabel}</p>
            <p><strong>Generated:</strong> ${new Date().toLocaleString()}</p>

            <h2>Range Overview</h2>
            <div class="summary-grid">
              <div class="summary-card">
                <h3>Total Employees</h3>
                <p>${stats.totalEmployees}</p>
              </div>
              <div class="summary-card">
                <h3>Marked</h3>
                <p>${stats.marked}</p>
              </div>
              <div class="summary-card">
                <h3>In Progress</h3>
                <p>${stats.inProgress}</p>
              </div>
              <div class="summary-card">
                <h3>Not Marked</h3>
                <p>${stats.notMarked}</p>
              </div>
              <div class="summary-card">
                <h3>Attendance Rate</h3>
                <p>${Number(stats.attendanceRate ?? 0).toFixed(1)}%</p>
              </div>
            </div>

            <h2>Status Breakdown</h2>
            <div class="summary-grid">
              <div class="summary-card">
                <h3>Marked</h3>
                <p>${status.marked}</p>
              </div>
              <div class="summary-card">
                <h3>In Progress</h3>
                <p>${status.inProgress}</p>
              </div>
              <div class="summary-card">
                <h3>Not Marked</h3>
                <p>${status.notMarked}</p>
              </div>
            </div>

            <h2>Employee Punch Summary</h2>
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Code</th>
                  <th>Punched In</th>
                  <th>Punched Out</th>
                  <th>In Progress</th>
                  <th>Not Marked</th>
                </tr>
              </thead>
              <tbody>
                ${employeesRows || '<tr><td colspan="6">No employee data available for this range.</td></tr>'}
              </tbody>
            </table>
          </body>
        </html>
      `;

      const { uri } = await Print.printToFileAsync({ html: htmlContent });

      const shareableUri = uri;

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(shareableUri, {
          mimeType: 'application/pdf',
          UTI: 'com.adobe.pdf',
          dialogTitle: 'Share Attendance Report',
        });
      } else {
        Alert.alert('Export Complete', `Report saved to:\n${shareableUri}`);
      }
    } catch (error) {
      console.error('Attendance reports: export failed', error);
      Alert.alert('Export Report', 'Unable to export the report. Please try again.');
    }
  }, [reportData, employees]);

  const filteredEmployees = useMemo(() => {
    const query = employeeSearch.trim().toLowerCase();
    if (!query) {
      return employees;
    }
    return employees.filter((employee) => {
      const name = (employee.emp_name || '').toLowerCase();
      const code = (employee.emp_code || '').toLowerCase();
      return name.includes(query) || code.includes(query);
    });
  }, [employees, employeeSearch]);

  const selectedEmployee = useMemo(
    () => employees.find((employee) => employee.emp_id === selectedEmployeeId) ?? null,
    [employees, selectedEmployeeId]
  );

  const selectedEmployeeSummary = useMemo(() => {
    if (!selectedEmployee) {
      return null;
    }

    const presentDays = Number(selectedEmployee.days_present ?? 0);
    const markedDays = Number(selectedEmployee.days_marked ?? 0);
    const inProgressDays = Math.max(presentDays - markedDays, 0);
    const workingDays = reportData.monthlySummary.workingDays || 0;
    const notMarkedDays = Math.max(workingDays - presentDays, 0);
    const attendanceRate =
      workingDays > 0 ? Number(((markedDays / workingDays) * 100).toFixed(1)) : 0;

    return {
      presentDays,
      markedDays,
      inProgressDays,
      notMarkedDays,
      attendanceRate,
      lastPunch: selectedEmployee.last_punch_display || 'N/A',
      lastPunchEpoch: selectedEmployee.last_punch_epoch || null,
    };
  }, [selectedEmployee, reportData.monthlySummary.workingDays]);

  const clearEmployeeSelection = useCallback(() => {
    setSelectedEmployeeId(null);
    setEmployeeSearch('');
  }, []);
  useFocusEffect(
    useCallback(() => {
      fetchReportData({ rangeStartDate: startDate, rangeEndDate: endDate });
    }, [fetchReportData, startDate, endDate])
  );

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

  const { todaySummary, weeklyStats, monthlySummary, statusBreakdown } = reportData;

  const totalEmployeesToday = todaySummary.totalEmployees || 0;
  const presentCount = todaySummary.marked + todaySummary.inProgress;
  const absentCount = todaySummary.notMarked;
  const presentPercentage =
    totalEmployeesToday > 0 ? ((presentCount / totalEmployeesToday) * 100).toFixed(1) : '0.0';
  const absentPercentage =
    totalEmployeesToday > 0 ? ((absentCount / totalEmployeesToday) * 100).toFixed(1) : '0.0';
  const attendanceRateDisplay = Number.isFinite(todaySummary.attendanceRate)
    ? todaySummary.attendanceRate.toFixed(1)
    : '0.0';
  const monthlyAttendanceRateDisplay = Number.isFinite(monthlySummary.attendanceRate)
    ? Number(monthlySummary.attendanceRate).toFixed(1)
    : '0.0';
  const rangeLabel = reportData.monthlySummary.rangeLabel || 'Selected Range';

  const pieChartData = useMemo(() => {
    return [
      {
        name: 'Marked',
        population: todaySummary.marked,
        color: '#2dce89',
        legendFontColor: '#2dce89',
        legendFontSize: 12,
      },
      {
        name: 'In Progress',
        population: todaySummary.inProgress,
        color: '#ffc107',
        legendFontColor: '#ffc107',
        legendFontSize: 12,
      },
      {
        name: 'Not Marked',
        population: todaySummary.notMarked,
        color: '#ff5a5f',
        legendFontColor: '#ff5a5f',
        legendFontSize: 12,
      },
    ].filter((entry) => entry.population > 0);
  }, [todaySummary]);

  const pieChartTotal = pieChartData.reduce((sum, entry) => sum + entry.population, 0);

  const barChartData = useMemo(() => {
    if (!weeklyStats.length) {
      return null;
    }

    return {
      labels: weeklyStats.map((entry) => entry.label),
      datasets: [
        {
          data: weeklyStats.map((entry) =>
            Number.isFinite(entry.attendanceRate) ? entry.attendanceRate : 0
          ),
        },
      ],
    };
  }, [weeklyStats]);

  const chartConfig = useMemo(
    () => ({
      backgroundColor: '#ffffff',
      backgroundGradientFrom: '#ffffff',
      backgroundGradientTo: '#ffffff',
      decimalPlaces: 0,
      color: (opacity = 1) => `rgba(0, 123, 255, ${opacity})`,
      labelColor: (opacity = 1) => `rgba(51, 51, 51, ${opacity})`,
      propsForDots: {
        r: '4',
        strokeWidth: '2',
        stroke: '#3f51b5',
      },
    }),
    []
  );

  const pieChartWidth = Math.min(screenWidth - 40, 360);
  const barChartWidth = Math.max(Math.min(screenWidth - 32, 600), 320);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007bff" />
        <Text style={styles.loadingText}>Loading reports...</Text>
      </View>
    );
  }

  return (
    <>
      <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#007bff" />
      }
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.title}>Attendance Reports</Text>
      </View>

      <View style={styles.content}>
        {lastUpdated && (
          <Text style={styles.lastUpdatedText}>
            Updated{' '}
            {`${lastUpdated.toLocaleDateString(undefined, {
              month: 'short',
              day: 'numeric',
            })} at ${lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`}
          </Text>
        )}

        <View style={styles.filterCard}>
          <View style={styles.filterHeader}>
            <Text style={styles.sectionTitle}>Filters</Text>
            <TouchableOpacity
              style={styles.filterResetButton}
              onPress={handleResetRange}
              accessibilityRole="button"
              accessibilityLabel="Reset filters"
            >
              <Ionicons name="refresh" size={16} color="#3f51b5" />
              <Text style={styles.filterResetText}>Reset</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.dateRow}>
            <TouchableOpacity
              style={styles.dateButton}
              onPress={() => setShowStartPicker(true)}
              accessibilityRole="button"
              accessibilityLabel="Select start date"
            >
              <Ionicons name="calendar-outline" size={18} color="#3f51b5" />
              <View style={styles.dateButtonContent}>
                <Text style={styles.dateButtonLabel}>Start</Text>
                <Text style={styles.dateButtonValue}>{formatDisplayDate(startDate)}</Text>
              </View>
            </TouchableOpacity>
            <Ionicons name="arrow-forward" size={16} color="#6b778d" style={styles.dateArrow} />
            <TouchableOpacity
              style={styles.dateButton}
              onPress={() => setShowEndPicker(true)}
              accessibilityRole="button"
              accessibilityLabel="Select end date"
            >
              <Ionicons name="calendar-clear-outline" size={18} color="#3f51b5" />
              <View style={styles.dateButtonContent}>
                <Text style={styles.dateButtonLabel}>End</Text>
                <Text style={styles.dateButtonValue}>{formatDisplayDate(endDate)}</Text>
              </View>
            </TouchableOpacity>
          </View>
          <View style={styles.filterActions}>
            <TouchableOpacity
              style={styles.filterButtonOutline}
              onPress={() => setEmployeePickerVisible(true)}
              accessibilityRole="button"
              accessibilityLabel="Select employee filter"
            >
              <Ionicons name="person-circle-outline" size={18} color="#3f51b5" />
              <Text style={styles.filterButtonOutlineText}>
                {selectedEmployee ? selectedEmployee.emp_name || 'Selected Employee' : 'Filter by Employee'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.filterApplyButton}
              onPress={handleApplyRange}
              accessibilityRole="button"
              accessibilityLabel="Apply date range"
            >
              <Ionicons name="checkmark-circle" size={18} color="#fff" />
              <Text style={styles.filterApplyText}>Apply</Text>
            </TouchableOpacity>
          </View>
          {selectedEmployeeId && (
            <TouchableOpacity
              style={styles.clearEmployeeButton}
              onPress={clearEmployeeSelection}
              accessibilityRole="button"
              accessibilityLabel="Clear employee filter"
            >
              <Ionicons name="close-circle" size={16} color="#ff5a5f" />
              <Text style={styles.clearEmployeeText}>Clear employee filter</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Range Overview</Text>
            <Text style={styles.sectionSubtitle}>{rangeLabel}</Text>
          </View>
          <View style={styles.statsGrid}>
            <StatCard
              title="Present"
              value={presentCount}
              subtitle={`${presentPercentage}% of team`}
              color="#2dce89"
              icon="checkmark-circle"
            />
            <StatCard
              title="Marked"
              value={todaySummary.marked}
              subtitle="Completed punch in/out"
              color="#3f51b5"
              icon="clipboard"
            />
            <StatCard
              title="In Progress"
              value={todaySummary.inProgress}
              subtitle="Punched in, pending out"
              color="#ffc107"
              icon="time"
            />
            <StatCard
              title="Not Marked"
              value={absentCount}
              subtitle={`${absentPercentage}% pending`}
              color="#ff5a5f"
              icon="alert-circle"
            />
            <StatCard
              title="Total Employees"
              value={totalEmployeesToday}
              subtitle="Assigned to you"
              color="#20a4f3"
              icon="people"
            />
            <StatCard
              title="Attendance Rate"
              value={`${attendanceRateDisplay}%`}
              subtitle="Marked + In Progress"
              color="#28a745"
              icon="speedometer"
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Status Snapshot</Text>
          <View style={styles.statusSummaryCard}>
            <View style={styles.statusRow}>
              <View style={[styles.statusIndicator, { backgroundColor: '#2dce89' }]} />
              <Text style={styles.statusLabel}>Marked</Text>
              <Text style={styles.statusValue}>{statusBreakdown.marked}</Text>
            </View>
            <View style={styles.statusRow}>
              <View style={[styles.statusIndicator, { backgroundColor: '#ffc107' }]} />
              <Text style={styles.statusLabel}>In Progress</Text>
              <Text style={styles.statusValue}>{statusBreakdown.inProgress}</Text>
            </View>
            <View style={styles.statusRow}>
              <View style={[styles.statusIndicator, { backgroundColor: '#ff5a5f' }]} />
              <Text style={styles.statusLabel}>Not Marked</Text>
              <Text style={styles.statusValue}>{statusBreakdown.notMarked}</Text>
            </View>
          </View>
        </View>

        {selectedEmployee && selectedEmployeeSummary && (
          <View style={styles.section}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>Employee Detail</Text>
              <Text style={styles.sectionSubtitle}>{selectedEmployee.emp_name}</Text>
            </View>
            <View style={styles.employeeDetailCard}>
              <View style={styles.employeeDetailRow}>
                <Text style={styles.employeeDetailLabel}>Employee Code</Text>
                <Text style={styles.employeeDetailValue}>{selectedEmployee.emp_code || '-'}</Text>
              </View>
              <View style={styles.employeeDetailRow}>
                <Text style={styles.employeeDetailLabel}>Punched In</Text>
                <Text style={styles.employeeDetailValue}>{selectedEmployeeSummary.presentDays}</Text>
              </View>
              <View style={styles.employeeDetailRow}>
                <Text style={styles.employeeDetailLabel}>Punched Out</Text>
                <Text style={styles.employeeDetailValue}>{selectedEmployeeSummary.markedDays}</Text>
              </View>
              <View style={styles.employeeDetailRow}>
                <Text style={styles.employeeDetailLabel}>In Progress</Text>
                <Text style={styles.employeeDetailValue}>{selectedEmployeeSummary.inProgressDays}</Text>
              </View>
              <View style={styles.employeeDetailRow}>
                <Text style={styles.employeeDetailLabel}>Not Marked</Text>
                <Text style={styles.employeeDetailValue}>{selectedEmployeeSummary.notMarkedDays}</Text>
              </View>
              <View style={styles.employeeDetailRow}>
                <Text style={styles.employeeDetailLabel}>Attendance Rate</Text>
                <Text style={styles.employeeDetailValue}>
                  {selectedEmployeeSummary.attendanceRate.toFixed(1)}%
                </Text>
              </View>
              <View style={[styles.employeeDetailRow, styles.employeeDetailRowLast]}>
                <Text style={styles.employeeDetailLabel}>Last Punch</Text>
                <Text style={styles.employeeDetailValue}>{selectedEmployeeSummary.lastPunch}</Text>
              </View>
            </View>
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Status Breakdown</Text>
          <View style={styles.chartContainer}>
            {pieChartTotal > 0 ? (
              <PieChart
                data={pieChartData}
                width={pieChartWidth}
                height={220}
                accessor="population"
                chartConfig={chartConfig}
                backgroundColor="transparent"
                paddingLeft="16"
                hasLegend
                absolute
              />
            ) : (
              <Text style={styles.noChartDataText}>
                No attendance data recorded yet today.
              </Text>
            )}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Daily Attendance Trend</Text>
          <View style={styles.chartContainer}>
            {barChartData ? (
              <BarChart
                data={barChartData}
                width={barChartWidth}
                height={220}
                chartConfig={chartConfig}
                fromZero
                showValuesOnTopOfBars
                yAxisSuffix="%"
                style={styles.barChartStyle}
              />
            ) : (
              <Text style={styles.noChartDataText}>
                Weekly attendance data is not available yet.
              </Text>
            )}
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Range Summary</Text>
            <Text style={styles.sectionSubtitle}>{rangeLabel}</Text>
          </View>
          <View style={styles.monthlyCard}>
            <View style={styles.monthlyRow}>
              <Text style={styles.monthlyLabel}>Period</Text>
              <Text style={styles.monthlyValue}>{monthlySummary.rangeLabel}</Text>
            </View>
            <View style={styles.monthlyRow}>
              <Text style={styles.monthlyLabel}>Working Days</Text>
              <Text style={styles.monthlyValue}>{monthlySummary.workingDays}</Text>
            </View>
            <View style={styles.monthlyRow}>
              <Text style={styles.monthlyLabel}>Attendance Rate</Text>
              <Text style={styles.monthlyValue}>{monthlyAttendanceRateDisplay}%</Text>
            </View>
            <View style={styles.monthlyRow}>
              <Text style={styles.monthlyLabel}>Marked</Text>
              <Text style={styles.monthlyValue}>{monthlySummary.marked}</Text>
            </View>
            <View style={styles.monthlyRow}>
              <Text style={styles.monthlyLabel}>In Progress</Text>
              <Text style={styles.monthlyValue}>{monthlySummary.inProgress}</Text>
            </View>
            <View style={[styles.monthlyRow, styles.monthlyRowLast]}>
              <Text style={styles.monthlyLabel}>Not Marked</Text>
              <Text style={styles.monthlyValue}>{monthlySummary.notMarked}</Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={handleExportReport}
            accessibilityRole="button"
            accessibilityLabel="Export report as PDF"
          >
            <Ionicons name="download" size={20} color="#fff" />
            <Text style={styles.actionButtonText}>Export Report</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, styles.secondaryButton]}
            onPress={handleResetRange}
            accessibilityRole="button"
            accessibilityLabel="Reset filters"
          >
            <Ionicons name="refresh" size={20} color="#007bff" />
            <Text style={[styles.actionButtonText, styles.secondaryButtonText]}>
              Reset Filters
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {showStartPicker && (
        <DateTimePicker
          value={startDate}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          maximumDate={endDate}
          onChange={handleStartDateChange}
        />
      )}

      {showEndPicker && (
        <DateTimePicker
          value={endDate}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          minimumDate={startDate}
          onChange={handleEndDateChange}
        />
      )}
      </ScrollView>

      <Modal
      visible={employeePickerVisible}
      animationType="slide"
      transparent
      onRequestClose={() => setEmployeePickerVisible(false)}
    >
      <View style={styles.employeeModalOverlay}>
        <View style={styles.employeeModalContent}>
          <View style={styles.employeeModalHeader}>
            <Text style={styles.employeeModalTitle}>Select Employee</Text>
            <TouchableOpacity
              onPress={() => setEmployeePickerVisible(false)}
              accessibilityRole="button"
              accessibilityLabel="Close employee selector"
            >
              <Ionicons name="close" size={22} color="#1f2933" />
            </TouchableOpacity>
          </View>
          <View style={styles.employeeSearchRow}>
            <Ionicons name="search" size={16} color="#6b778d" />
            <TextInput
              value={employeeSearch}
              onChangeText={setEmployeeSearch}
              placeholder="Search employee..."
              placeholderTextColor="#9aa1b1"
              style={styles.employeeSearchInput}
              autoCorrect={false}
              autoCapitalize="none"
            />
          </View>
          <ScrollView style={styles.employeeList} keyboardShouldPersistTaps="handled">
            {filteredEmployees.length ? (
              filteredEmployees.map((employee) => (
                <TouchableOpacity
                  key={employee.emp_id}
                  style={styles.employeeListItem}
                  onPress={() => {
                    setSelectedEmployeeId(employee.emp_id);
                    setEmployeeSearch('');
                    setEmployeePickerVisible(false);
                  }}
                >
                  <View style={styles.employeeListContent}>
                    <Text style={styles.employeeListName}>{employee.emp_name || 'Employee'}</Text>
                    <Text style={styles.employeeListMeta}>
                      Code: {employee.emp_code || '-'}
                    </Text>
                    <Text style={styles.employeeListMeta}>
                      Punched In {employee.days_present ?? 0} • Out {employee.days_marked ?? 0}
                    </Text>
                  </View>
                  {selectedEmployeeId === employee.emp_id && (
                    <Ionicons name="checkmark-circle" size={20} color="#2dce89" />
                  )}
                </TouchableOpacity>
              ))
            ) : (
              <View style={styles.employeeListEmpty}>
                <Ionicons name="people-circle-outline" size={36} color="#cbd5e1" />
                <Text style={styles.employeeListEmptyText}>No employees found</Text>
              </View>
            )}
          </ScrollView>
          <TouchableOpacity
            style={styles.employeeModalSecondary}
            onPress={clearEmployeeSelection}
            accessibilityRole="button"
            accessibilityLabel="Clear employee selection"
          >
            <Ionicons name="close-circle" size={18} color="#ff5a5f" />
            <Text style={styles.employeeModalSecondaryText}>Clear Selection</Text>
          </TouchableOpacity>
        </View>
      </View>
      </Modal>
    </>
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
    paddingBottom: 40,
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
  lastUpdatedText: {
    fontSize: 12,
    color: '#6b778d',
    marginBottom: 12,
  },
  filterCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e3e7ef',
    padding: 16,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 3,
  },
  filterHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  filterResetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#eef2ff',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  filterResetText: {
    marginLeft: 4,
    fontSize: 12,
    fontWeight: '600',
    color: '#3f51b5',
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  dateButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f6f7ff',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#d9def0',
  },
  dateButtonContent: {
    marginLeft: 8,
  },
  dateButtonLabel: {
    fontSize: 11,
    color: '#6b778d',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  dateButtonValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1f2933',
  },
  dateArrow: {
    marginHorizontal: 6,
  },
  filterActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
    gap: 10,
  },
  filterButtonOutline: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#bfc8f7',
    backgroundColor: '#f8f9ff',
  },
  filterButtonOutlineText: {
    marginLeft: 8,
    fontSize: 13,
    fontWeight: '600',
    color: '#3f51b5',
  },
  filterApplyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2dce89',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
  },
  filterApplyText: {
    marginLeft: 6,
    fontSize: 13,
    fontWeight: '700',
    color: '#ffffff',
  },
  clearEmployeeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
  },
  clearEmployeeText: {
    marginLeft: 6,
    fontSize: 12,
    color: '#ff5a5f',
    fontWeight: '600',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionSubtitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6b778d',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -6,
  },
  statCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    width: '48%',
    marginHorizontal: 6,
    marginBottom: 12,
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
  statusSummaryCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 3.84,
    elevation: 3,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  statusIndicator: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 12,
  },
  statusLabel: {
    flex: 1,
    fontSize: 14,
    color: '#333',
  },
  statusValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1f2933',
  },
  employeeDetailCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e3e7ef',
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 3.84,
    elevation: 3,
  },
  employeeDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f1f5',
  },
  employeeDetailRowLast: {
    borderBottomWidth: 0,
    paddingBottom: 0,
  },
  employeeDetailLabel: {
    fontSize: 13,
    color: '#6b778d',
  },
  employeeDetailValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2933',
  },
  chartContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  noChartDataText: {
    fontSize: 13,
    color: '#6b778d',
    textAlign: 'center',
  },
  barChartStyle: {
    marginTop: 12,
    alignSelf: 'center',
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
  monthlyRowLast: {
    borderBottomWidth: 0,
    paddingBottom: 0,
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
  employeeModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  employeeModalContent: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 12,
    elevation: 6,
  },
  employeeModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  employeeModalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1f2933',
  },
  employeeSearchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f6f7ff',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#d9def0',
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 12,
  },
  employeeSearchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 13,
    color: '#1f2933',
  },
  employeeList: {
    maxHeight: 320,
    marginBottom: 12,
  },
  employeeListItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#edf0fb',
  },
  employeeListContent: {
    flex: 1,
    marginRight: 12,
  },
  employeeListName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1f2933',
  },
  employeeListMeta: {
    fontSize: 12,
    color: '#6b778d',
  },
  employeeListEmpty: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    gap: 8,
  },
  employeeListEmptyText: {
    fontSize: 13,
    color: '#6b778d',
  },
  employeeModalSecondary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
  },
  employeeModalSecondaryText: {
    marginLeft: 6,
    fontSize: 13,
    fontWeight: '600',
    color: '#ff5a5f',
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
