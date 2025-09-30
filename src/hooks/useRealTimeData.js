import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { AppState } from 'react-native';
import { apiService } from '../services/apiService';

/**
 * Stable real-time data hook that prevents infinite re-renders
 * @param {string} endpoint - API endpoint to fetch data from
 * @param {Object} options - Configuration options
 * @param {number} options.refreshInterval - Auto refresh interval in milliseconds (default: 60000)
 * @param {boolean} options.refreshOnFocus - Refresh when app comes to foreground (default: true)
 * @param {boolean} options.refreshOnMount - Refresh on component mount (default: true)
 * @param {Function} options.onError - Error callback function
 * @param {Function} options.transform - Data transformation function
 * @returns {Object} - { data, loading, error, refresh, lastUpdated }
 */
export const useRealTimeData = (endpoint, options = {}) => {
  const {
    refreshInterval = 60000, // 60 seconds - longer interval to prevent spam
    refreshOnFocus = true,
    refreshOnMount = true,
    onError,
    transform
  } = options;

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);

  const intervalRef = useRef(null);
  const mountedRef = useRef(true);
  const isLoadingRef = useRef(false);

  // Stable fetch function with proper error handling
  const fetchData = useCallback(async (showLoading = true) => {
    if (!endpoint || isLoadingRef.current) return;

    try {
      isLoadingRef.current = true;
      if (showLoading && mountedRef.current) setLoading(true);
      if (mountedRef.current) setError(null);

      const response = await apiService.get(endpoint);

      if (!mountedRef.current) return;

      let responseData = response.data;

      // Apply transformation if provided
      if (transform && typeof transform === 'function') {
        responseData = transform(responseData);
      }

      setData(responseData);
      setLastUpdated(new Date());
    } catch (err) {
      if (!mountedRef.current) return;

      console.error(`Real-time data fetch error for ${endpoint}:`, err);
      setError(err);

      if (onError && typeof onError === 'function') {
        onError(err);
      }
    } finally {
      isLoadingRef.current = false;
      if (mountedRef.current && showLoading) {
        setLoading(false);
      }
    }
  }, [endpoint]); // Removed transform and onError from dependencies to prevent infinite loops

  // Manual refresh function
  const refresh = useCallback(() => {
    fetchData(true);
  }, [fetchData]);

  // Background refresh function (without loading state)
  const backgroundRefresh = useCallback(() => {
    fetchData(false);
  }, [fetchData]);

  // Setup auto refresh interval - stable implementation
  useEffect(() => {
    if (refreshInterval > 0 && endpoint) {
      intervalRef.current = setInterval(() => {
        if (mountedRef.current && !isLoadingRef.current) {
          fetchData(false);
        }
      }, refreshInterval);

      return () => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
      };
    }
  }, [refreshInterval, endpoint]); // Only depend on stable values

  // Handle app state changes - stable implementation
  useEffect(() => {
    if (!refreshOnFocus || !endpoint) return;

    const handleAppStateChange = (nextAppState) => {
      if (nextAppState === 'active' && mountedRef.current && !isLoadingRef.current) {
        fetchData(false);
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      subscription?.remove();
    };
  }, [refreshOnFocus, endpoint]); // Only depend on stable values

  // Initial data fetch - stable implementation
  useEffect(() => {
    if (refreshOnMount && endpoint) {
      fetchData(true);
    }

    return () => {
      mountedRef.current = false;
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [endpoint]); // Only depend on endpoint

  return {
    data,
    loading,
    error,
    refresh,
    lastUpdated,
    isStale: lastUpdated ? (Date.now() - lastUpdated.getTime()) > refreshInterval : false
  };
};

/**
 * Stable hook for managing multiple real-time data sources
 * @param {Array} endpoints - Array of endpoint configurations
 * @returns {Object} - Combined data state
 */
export const useMultipleRealTimeData = (endpoints) => {
  const [combinedData, setCombinedData] = useState({});
  const [combinedLoading, setCombinedLoading] = useState(false);
  const [combinedError, setCombinedError] = useState(null);

  const endpointsRef = useRef(endpoints);
  const mountedRef = useRef(true);

  // Create stable endpoint configurations
  const stableEndpoints = useMemo(() => {
    return endpoints.map(config => ({
      key: config.key,
      endpoint: config.endpoint,
      options: config.options || {}
    }));
  }, [endpoints]);

  const dataHooks = stableEndpoints.map(config =>
    useRealTimeData(config.endpoint, config.options)
  );

  // Stable effect for combining data
  useEffect(() => {
    if (!mountedRef.current) return;

    const newCombinedData = {};
    let hasLoading = false;
    let hasError = null;

    stableEndpoints.forEach((config, index) => {
      const hook = dataHooks[index];
      newCombinedData[config.key] = hook.data;

      if (hook.loading) hasLoading = true;
      if (hook.error && !hasError) hasError = hook.error;
    });

    setCombinedData(newCombinedData);
    setCombinedLoading(hasLoading);
    setCombinedError(hasError);
  }, [dataHooks.map(h => h.data), dataHooks.map(h => h.loading), dataHooks.map(h => h.error)]);

  const refreshAll = useCallback(() => {
    dataHooks.forEach(hook => {
      if (hook.refresh) hook.refresh();
    });
  }, [dataHooks]);

  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  return {
    data: combinedData,
    loading: combinedLoading,
    error: combinedError,
    refresh: refreshAll,
    hooks: dataHooks
  };
};

export default useRealTimeData;
