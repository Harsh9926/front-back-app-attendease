#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🔍 Testing AdminSettingsScreen for errors...\n');

// Check if file exists and is readable
const settingsPath = 'attendeaseApp/src/screens/admin/AdminSettingsScreen.js';
if (!fs.existsSync(settingsPath)) {
  console.log('❌ AdminSettingsScreen.js not found');
  process.exit(1);
}

console.log('✅ AdminSettingsScreen.js exists');

// Read and analyze the file
try {
  const content = fs.readFileSync(settingsPath, 'utf8');
  
  // Check imports
  console.log('\n📦 Checking imports:');
  const imports = [
    'React',
    'useState',
    'View',
    'Text',
    'StyleSheet',
    'ScrollView',
    'TouchableOpacity',
    'Alert',
    'Switch',
    'Modal',
    'TextInput',
    'Ionicons',
    'useAuth'
  ];
  
  imports.forEach(imp => {
    const hasImport = content.includes(imp);
    console.log(`${hasImport ? '✅' : '❌'} ${imp}`);
  });
  
  // Check for problematic patterns
  console.log('\n🔍 Checking for potential issues:');
  
  const issues = [
    { pattern: /useRealTimeData/, name: 'useRealTimeData hook (removed)' },
    { pattern: /apiService/, name: 'apiService import (removed)' },
    { pattern: /LoadingSwitch/, name: 'LoadingSwitch component (removed)' },
    { pattern: /RefreshControl/, name: 'RefreshControl import (removed)' },
    { pattern: /ActivityIndicator/, name: 'ActivityIndicator import (removed)' },
    { pattern: /navigation\.navigate/, name: 'navigation.navigate calls (should be alerts)' }
  ];
  
  issues.forEach(issue => {
    const hasIssue = issue.pattern.test(content);
    console.log(`${hasIssue ? '❌' : '✅'} ${issue.name}`);
  });
  
  // Check component structure
  console.log('\n🏗️ Checking component structure:');
  
  const components = [
    'AdminSettingsScreen',
    'SettingItem',
    'SectionHeader',
    'ProfileModal',
    'SystemModal'
  ];
  
  components.forEach(comp => {
    const hasComponent = content.includes(`const ${comp}`);
    console.log(`${hasComponent ? '✅' : '❌'} ${comp} component`);
  });
  
  // Check for syntax issues
  console.log('\n🔧 Basic syntax check:');
  
  const syntaxChecks = [
    { pattern: /export default AdminSettingsScreen/, name: 'Default export' },
    { pattern: /const styles = StyleSheet\.create/, name: 'StyleSheet definition' },
    { pattern: /}\);$/, name: 'Proper closing' }
  ];
  
  syntaxChecks.forEach(check => {
    const isValid = check.pattern.test(content);
    console.log(`${isValid ? '✅' : '❌'} ${check.name}`);
  });
  
  console.log('\n✅ AdminSettingsScreen analysis complete!');
  
} catch (error) {
  console.log('❌ Error reading file:', error.message);
  process.exit(1);
}
