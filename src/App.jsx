import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import Navbar from './components/Navbar';
import DashboardStats from './components/DashboardStats';
import FilterBar from './components/FilterBar';
import VehicleCard from './components/VehicleCard';
import VehicleTable from './components/VehicleTable';
import SingleVehicleView from './components/SingleVehicleView';
import MobileVehicleView from './components/MobileVehicleView';
import LoginScreen from './components/LoginScreen';
import UploadNewMonthModal from './components/UploadNewMonthModal';
import VehicleDetailModal from './components/VehicleDetailModal';
import VehiclePrintSlip from './components/VehiclePrintSlip';
import BranchAnalytics from './components/BranchAnalytics';
import ExecutiveComparisonView from './components/ExecutiveComparisonView';
import BranchSubmissionAuditView from './components/BranchSubmissionAuditView';
import AnnualExcellenceView from './components/AnnualExcellenceView';
import LookerScoresView from './components/LookerScoresView';
import UserApprovalModal from './components/UserApprovalModal';
import AdminDataManagerModal from './components/AdminDataManagerModal';
import { MASTER_XLSX_URL } from './utils/sheetWorkbookSync';
import { useIsMobile } from './hooks/useIsMobile';
import { parseCSVData } from './utils/parser';
import { 
  getAllMonths, 
  getMonthData, 
  saveNewMonth, 
  mergeBranchIntoMonth,
  syncLookerMonthsToStorage,
  syncWorkbookMonthsToStorage,
  syncMasterWorkbookFromRemote,
  getLastAutoSyncTime,
  clearAndResetToLookerMonths,
  getSelectedMonthKey, 
  setSelectedMonthKey,
  initStorage
} from './utils/monthStorage';
import { getPendingUsersCount } from './utils/userManagement';
import {
  isSelfOnlyRole,
  isManagementRole,
  isValidSessionUser,
  filterVehiclesForUser,
  canAccessTab,
} from './utils/authHelpers';
import {
  parseUrlState,
  sanitizeUrlStateForUser,
  buildCanonicalUrl,
  normalizeBasePath,
} from './utils/urlState';
import {
  AlertCircle,
  CheckCircle2,
  LogOut,
  User,
  ShieldCheck,
  Database,
  Settings,
  ClipboardCheck,
  ChevronDown,
  ArrowLeft,
  Link2,
  Check
} from 'lucide-react';

const STORAGE_AUTH_USER = 'sprinkle_auth_user';

export default function App() {
  const isMobile = useIsMobile(768);

  // Authentication State (invalidate legacy or malformed sessions cleanly)
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_AUTH_USER);
      if (!saved) return null;
      const parsed = JSON.parse(saved);
      if (!isValidSessionUser(parsed)) {
        localStorage.removeItem(STORAGE_AUTH_USER);
        return null;
      }
      return parsed;
    } catch {
      return null;
    }
  });

  const isSelfOnly = isSelfOnlyRole(currentUser);
  const canManage = isManagementRole(currentUser);

  // Initial Deep-Link URL parsing (preserved across LoginScreen until authenticated)
  const initialUrl = useMemo(() => {
    if (typeof window === 'undefined') {
      return { tab: null, month: null, car: null, branch: null, subtab: null, mtab: null, hasParams: false };
    }
    return parseUrlState(window.location.search, window.location.pathname);
  }, []);
  const hasUrlMonthOverrideRef = useRef(Boolean(initialUrl.month));
  const historyPushPendingRef = useRef(false);

  // Current selected month (URL ?month= takes precedence over localStorage fallback)
  const [selectedMonthKey, setSelectedMonthState] = useState(() => {
    const months = getAllMonths();
    if (initialUrl.month && months.some((m) => m.key === initialUrl.month)) {
      return initialUrl.month;
    }
    const k = getSelectedMonthKey();
    if (!k || String(k).startsWith('sprinkle_') || String(k).includes('sync_time')) {
      const fallbackKey = months[0]?.key || '2569-09';
      setSelectedMonthKey(fallbackKey);
      return fallbackKey;
    }
    return k;
  });
  const [allMonthsList, setAllMonthsList] = useState(() => getAllMonths());
  const [lastSyncTime, setLastSyncTime] = useState(() => getLastAutoSyncTime());

  // Active view tab & deep-linked sub-states
  const [activeTab, setActiveTab] = useState(() => initialUrl.tab || 'single'); // 'single', 'vehicles', 'analytics', ...
  const [viewMode, setViewMode] = useState('grid'); // 'grid', 'table'
  const [execSubTab, setExecSubTab] = useState(() => initialUrl.subtab || 'branches');
  const [mobileTab, setMobileTab] = useState(() => {
    if (initialUrl.tab === 'executive') return 'executive';
    if (initialUrl.tab === 'audit') return 'audit';
    return initialUrl.mtab || 'summary';
  });

  // Current Month Data (guaranteed to always return valid object with csv)
  const currentMonthObj = useMemo(() => {
    const found = getMonthData(selectedMonthKey);
    if (found && found.csv) return found;
    const fallback = allMonthsList.find(m => m && m.csv) || allMonthsList[0] || { key: '2569-09', csv: '' };
    return fallback;
  }, [selectedMonthKey, allMonthsList]);

  // Parse CSV for current month safely without breaking
  const data = useMemo(() => {
    try {
      if (currentMonthObj && currentMonthObj.csv) {
        return parseCSVData(currentMonthObj.csv);
      }
      const fallback = allMonthsList.find(m => m && m.csv);
      return fallback ? parseCSVData(fallback.csv) : parseCSVData('');
    } catch (err) {
      console.error('Parse error:', err);
      const fallback = allMonthsList.find(m => m && m.csv);
      return fallback ? parseCSVData(fallback.csv) : parseCSVData('');
    }
  }, [currentMonthObj, allMonthsList]);

  // Scoped vehicles strictly isolated by user role (self-only users never receive other employees' vehicles)
  const visibleVehicles = useMemo(() => {
    return filterVehiclesForUser(data.vehicles, currentUser);
  }, [data.vehicles, currentUser]);

  // Selected vehicle for Single Vehicle View (carCode kept stable across month switches & URL deep links)
  const [selectedCarCode, setSelectedCarCode] = useState(() => initialUrl.car || null);
  const [singleViewCarId, setSingleViewCarId] = useState(null);

  // Enforce tab guard if user role restricts navigation
  useEffect(() => {
    if (currentUser && !canAccessTab(currentUser, activeTab)) {
      setActiveTab('single');
    }
  }, [currentUser, activeTab]);

  // Current selected vehicle object (strictly from scoped visibleVehicles; resolves selectedCarCode synchronously)
  const currentSelectedVehicle = useMemo(() => {
    if (visibleVehicles.length === 0) return null;
    if (selectedCarCode) {
      const byCode = visibleVehicles.find(
        (v) =>
          String(v?.general?.carCode || '').trim() === selectedCarCode ||
          v.id === selectedCarCode
      );
      if (byCode) return byCode;
    }
    if (singleViewCarId) {
      const byId = visibleVehicles.find((v) => v.id === singleViewCarId);
      if (byId) return byId;
    }
    return visibleVehicles[0] || null;
  }, [visibleVehicles, selectedCarCode, singleViewCarId]);

  // Keep selected vehicle ID & carCode strictly aligned with user's scoped visibleVehicles
  useEffect(() => {
    if (!currentUser) return;
    if (!currentSelectedVehicle) {
      if (singleViewCarId !== null) setSingleViewCarId(null);
      return;
    }
    if (singleViewCarId !== currentSelectedVehicle.id) {
      setSingleViewCarId(currentSelectedVehicle.id);
    }
    const resolvedCarCode = String(currentSelectedVehicle?.general?.carCode || '').trim() || null;
    if (isSelfOnly && selectedCarCode && selectedCarCode !== resolvedCarCode) {
      setSelectedCarCode(resolvedCarCode);
    }
  }, [currentUser, isSelfOnly, currentSelectedVehicle, singleViewCarId, selectedCarCode]);

  const safeActiveTab = canAccessTab(currentUser, activeTab) ? activeTab : 'single';

  // Filters for All Vehicles Overview / Shared Branch filter
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBranch, setSelectedBranch] = useState(() => initialUrl.branch || 'all');
  const [selectedZone, setSelectedZone] = useState('all');
  const [selectedType, setSelectedType] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [sortBy, setSortBy] = useState('reward_desc');
  const [linkCopied, setLinkCopied] = useState(false);

  // Modals & Settings Popover
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [printVehicle, setPrintVehicle] = useState(null);
  const [isUploadNewMonthOpen, setIsUploadNewMonthOpen] = useState(false);
  const [isApprovalModalOpen, setIsApprovalModalOpen] = useState(false);
  const [isDataManagerOpen, setIsDataManagerOpen] = useState(false);
  const [isSettingsMenuOpen, setIsSettingsMenuOpen] = useState(false);
  const [pendingUsersCount, setPendingUsersCount] = useState(() => getPendingUsersCount());
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [notification, setNotification] = useState(null);

  // Sync pending approval count on user updates
  useEffect(() => {
    const handleUsersUpdate = () => {
      setPendingUsersCount(getPendingUsersCount());
    };
    window.addEventListener('sprinkle_users_updated', handleUsersUpdate);
    return () => window.removeEventListener('sprinkle_users_updated', handleUsersUpdate);
  }, []);

  const showNotification = useCallback((msg, type = 'info') => {
    setNotification({ msg, type });
    setTimeout(() => {
      setNotification(null);
    }, 4000);
  }, []);

  // Initialize persistent storage & automatically check Google Sheet for new/updated months (e.g. 10-2569..12-2569)
  useEffect(() => {
    let cancelled = false;
    initStorage().then(() => {
      if (cancelled) return;
      const list = getAllMonths();
      setAllMonthsList(list);
      if (
        hasUrlMonthOverrideRef.current &&
        initialUrl.month &&
        list.some((m) => m.key === initialUrl.month)
      ) {
        setSelectedMonthState(initialUrl.month);
        setSelectedMonthKey(initialUrl.month);
      } else {
        setSelectedMonthState(getSelectedMonthKey());
      }
      runMasterSync({ silent: true, force: false });
    });

    const handleVisibilityOrFocus = () => {
      if (!document.hidden) {
        runMasterSync({ silent: true, force: false });
      }
    };
    window.addEventListener('focus', handleVisibilityOrFocus);
    document.addEventListener('visibilitychange', handleVisibilityOrFocus);

    return () => {
      cancelled = true;
      window.removeEventListener('focus', handleVisibilityOrFocus);
      document.removeEventListener('visibilitychange', handleVisibilityOrFocus);
    };
  }, [initialUrl.month]);

  // Sync months on custom months update
  useEffect(() => {
    const handleMonthsUpdate = () => {
      const updated = getAllMonths();
      setAllMonthsList(updated);
      if (!hasUrlMonthOverrideRef.current) {
        setSelectedMonthState(getSelectedMonthKey());
      }
    };
    window.addEventListener('sprinkle_months_updated', handleMonthsUpdate);
    return () => window.removeEventListener('sprinkle_months_updated', handleMonthsUpdate);
  }, []);

  // Browser Back / Forward navigation sync
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handlePopState = () => {
      const parsed = parseUrlState(window.location.search, window.location.pathname);
      historyPushPendingRef.current = false;
      const monthKeys = getAllMonths().map((m) => m.key);
      const sanitized = sanitizeUrlStateForUser(parsed, currentUser, {
        visibleVehicles,
        availableMonthKeys: monthKeys,
      });
      if (sanitized.month) {
        hasUrlMonthOverrideRef.current = true;
        setSelectedMonthState(sanitized.month);
        setSelectedMonthKey(sanitized.month);
      }
      setActiveTab(sanitized.tab || 'single');
      setSelectedCarCode(sanitized.car || null);
      setSelectedBranch(sanitized.branch || 'all');
      setExecSubTab(sanitized.subtab || 'branches');
      setMobileTab(sanitized.mtab || 'summary');
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [currentUser, visibleVehicles]);

  // Keep browser address bar synchronized with authenticated + RBAC-sanitized state
  useEffect(() => {
    if (!currentUser || typeof window === 'undefined') return;
    const monthKeys = allMonthsList.map((m) => m.key);
    const currentRawState = {
      tab: safeActiveTab,
      month: selectedMonthKey,
      car: currentSelectedVehicle?.general?.carCode || null,
      branch: selectedBranch !== 'all' ? selectedBranch : null,
      subtab: execSubTab,
      mtab: mobileTab,
    };
    const sanitized = sanitizeUrlStateForUser(currentRawState, currentUser, {
      visibleVehicles,
      availableMonthKeys: monthKeys,
    });
    const targetUrl = buildCanonicalUrl(sanitized, currentUser);
    const base = normalizeBasePath();
    const normPath =
      base !== '/' && window.location.pathname === base.slice(0, -1)
        ? base
        : window.location.pathname || '/';
    const currentUrl = `${normPath}${window.location.search}` || base;

    if (currentUrl !== targetUrl) {
      if (historyPushPendingRef.current) {
        window.history.pushState(null, '', targetUrl);
      } else {
        window.history.replaceState(null, '', targetUrl);
      }
    }
    historyPushPendingRef.current = false;
  }, [
    currentUser,
    safeActiveTab,
    selectedMonthKey,
    currentSelectedVehicle,
    selectedBranch,
    execSubTab,
    mobileTab,
    allMonthsList,
    visibleVehicles,
  ]);

  // Login handler (honors incoming deep-link URL after RBAC sanitization)
  const handleLogin = (user) => {
    if (typeof window !== 'undefined') {
      const parsed = parseUrlState(window.location.search, window.location.pathname);
      const monthKeys = allMonthsList.map((m) => m.key);
      if (parsed.month && monthKeys.includes(parsed.month)) {
        hasUrlMonthOverrideRef.current = true;
        setSelectedMonthState(parsed.month);
        setSelectedMonthKey(parsed.month);
      }
      if (parsed.tab && canAccessTab(user, parsed.tab)) {
        setActiveTab(parsed.tab);
      } else {
        setActiveTab('single');
      }
      if (isManagementRole(user)) {
        if (parsed.car) setSelectedCarCode(parsed.car);
        if (parsed.branch) setSelectedBranch(parsed.branch);
        if (parsed.subtab) setExecSubTab(parsed.subtab);
        if (parsed.tab === 'executive') setMobileTab('executive');
        else if (parsed.tab === 'audit') setMobileTab('audit');
        else if (parsed.mtab) setMobileTab(parsed.mtab);
      } else {
        setSelectedBranch('all');
        setExecSubTab('branches');
        setMobileTab(
          parsed.mtab && parsed.mtab !== 'executive' && parsed.mtab !== 'audit'
            ? parsed.mtab
            : 'summary'
        );
      }
    }
    setCurrentUser(user);
    localStorage.setItem(STORAGE_AUTH_USER, JSON.stringify(user));
    showNotification(`ยินดีต้อนรับ ${user.name}`, 'success');
  };

  // Logout handler (resets view state and clears URL params for next user)
  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem(STORAGE_AUTH_USER);
    setActiveTab('single');
    setMobileTab('summary');
    setSelectedBranch('all');
    setExecSubTab('branches');
    setSelectedCarCode(null);
    setSingleViewCarId(null);
    hasUrlMonthOverrideRef.current = false;
    if (typeof window !== 'undefined') {
      window.history.replaceState(null, '', normalizeBasePath());
    }
    showNotification('ออกจากระบบเรียบร้อยแล้ว', 'info');
  };

  // Navigation helpers (push clean browser history entries)
  const navigateTab = useCallback(
    (tab) => {
      if (!canAccessTab(currentUser, tab)) return;
      historyPushPendingRef.current = true;
      setActiveTab(tab);
      if (tab === 'executive') setMobileTab('executive');
      else if (tab === 'audit') setMobileTab('audit');
      else if (tab === 'single' && (mobileTab === 'executive' || mobileTab === 'audit')) {
        setMobileTab('summary');
      }
    },
    [currentUser, mobileTab]
  );

  const handleSelectVehicle = useCallback(
    (v, targetTab = null) => {
      if (!v) return;
      historyPushPendingRef.current = true;
      setSingleViewCarId(v.id);
      setSelectedCarCode(String(v?.general?.carCode || '').trim() || null);
      if (targetTab && canAccessTab(currentUser, targetTab)) {
        setActiveTab(targetTab);
      }
    },
    [currentUser]
  );

  const handleSelectBranchState = useCallback(
    (branchVal) => {
      if (!isManagementRole(currentUser)) return;
      historyPushPendingRef.current = true;
      const norm =
        !branchVal || String(branchVal).toLowerCase() === 'all' ? 'all' : branchVal;
      setSelectedBranch(norm);
    },
    [currentUser]
  );

  const handleSelectExecSubTab = useCallback(
    (subtab) => {
      if (!isManagementRole(currentUser)) return;
      historyPushPendingRef.current = true;
      setExecSubTab(subtab || 'branches');
    },
    [currentUser]
  );

  const handleChangeMobileTab = useCallback(
    (nextMtab) => {
      if (!isManagementRole(currentUser) && (nextMtab === 'executive' || nextMtab === 'audit')) {
        return;
      }
      historyPushPendingRef.current = true;
      setMobileTab(nextMtab);
      if (nextMtab === 'executive') setActiveTab('executive');
      else if (nextMtab === 'audit') setActiveTab('audit');
      else setActiveTab('single');
    },
    [currentUser]
  );

  const handleCopyPageLink = useCallback(async () => {
    if (!currentUser || typeof window === 'undefined') return;
    const monthKeys = allMonthsList.map((m) => m.key);
    const sanitized = sanitizeUrlStateForUser(
      {
        tab: safeActiveTab,
        month: selectedMonthKey,
        car: currentSelectedVehicle?.general?.carCode || null,
        branch: selectedBranch !== 'all' ? selectedBranch : null,
        subtab: execSubTab,
        mtab: mobileTab,
      },
      currentUser,
      { visibleVehicles, availableMonthKeys: monthKeys }
    );
    const shareUrl = `${window.location.origin}${buildCanonicalUrl(sanitized, currentUser)}`;
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(shareUrl);
      } else {
        const ta = document.createElement('textarea');
        ta.value = shareUrl;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
      }
      setLinkCopied(true);
      showNotification('คัดลอกลิงค์หน้านี้เรียบร้อยแล้ว', 'success');
      setTimeout(() => setLinkCopied(false), 2500);
    } catch {
      showNotification('ไม่สามารถคัดลอกลิงค์อัตโนมัติได้ กรุณาคัดลอกจากแถบที่อยู่', 'error');
    }
  }, [
    currentUser,
    allMonthsList,
    safeActiveTab,
    selectedMonthKey,
    currentSelectedVehicle,
    selectedBranch,
    execSubTab,
    mobileTab,
    visibleVehicles,
    showNotification,
  ]);

  // Month select handler
  const handleSelectMonth = (key) => {
    if (!key || String(key).startsWith('sprinkle_') || String(key).includes('sync_time')) {
      return;
    }
    hasUrlMonthOverrideRef.current = false;
    historyPushPendingRef.current = true;
    setSelectedMonthState(key);
    setSelectedMonthKey(key);
    showNotification(`สลับข้อมูลเป็นเดือน: ${getMonthData(key)?.label || key}`, 'info');
  };

  // New month added handler supporting merge, replace, and multi-month Looker CSV modes
  const handleMonthAdded = async (key, label, csvText, note, importMode = 'merge') => {
    if (importMode === 'looker_multi') {
      const { syncedKeys } = await syncLookerMonthsToStorage(csvText);
      if (syncedKeys.length > 0) {
        setAllMonthsList(getAllMonths());
        const latest = syncedKeys[syncedKeys.length - 1];
        setSelectedMonthState(latest);
        showNotification(`ซิงค์ข้อมูล Looker ครบ ${syncedKeys.length} เดือน (${syncedKeys[0]} – ${latest}) เรียบร้อยแล้ว`, 'success');
      } else {
        showNotification('ไม่พบข้อมูลเดือนที่นำเข้าได้ในไฟล์ Looker', 'error');
      }
      return;
    }

    let saved = null;
    if (importMode === 'merge') {
      saved = mergeBranchIntoMonth(key, csvText, label, note);
    } else {
      saved = saveNewMonth(key, label, csvText, note);
    }

    if (saved) {
      const updatedList = getAllMonths();
      setAllMonthsList(updatedList);
      setSelectedMonthState(saved.key || key);
      showNotification(`นำเข้าข้อมูลเดือน ${saved.label || label} เรียบร้อยแล้ว`, 'success');
    } else {
      showNotification('ไม่สามารถรวมข้อมูลรูปแบบต่างกันได้ กรุณาเลือกนำเข้าแบบแทนที่ทั้งเดือน', 'error');
    }
  };

  // Automatic + manual sync of all detailed monthly sheets (`01-2569` .. `12-2569`+) from Google Sheet
  const runMasterSync = async ({ silent = false, force = false } = {}) => {
    if (!silent) setIsRefreshing(true);
    try {
      const result = await syncMasterWorkbookFromRemote({
        force,
        autoSelectNew: force || !hasUrlMonthOverrideRef.current,
      });
      if (result.syncedAt) setLastSyncTime(result.syncedAt);
      if (result.skipped) return;

      if (!result.syncedKeys || result.syncedKeys.length === 0) {
        throw new Error('ไม่พบแผ่นงานรายเดือน (เช่น 01-2569 – 12-2569) ในไฟล์ Google Sheet');
      }

      setAllMonthsList(getAllMonths());
      if (force || !hasUrlMonthOverrideRef.current) {
        setSelectedMonthState(getSelectedMonthKey());
      }

      const latest = result.syncedKeys[result.syncedKeys.length - 1];
      if (result.addedKeys.length > 0) {
        const addedText = result.addedKeys.join(', ');
        showNotification(`อัปเดตเดือนใหม่อัตโนมัติ (${addedText}) ครบ ${result.syncedKeys.length} เดือนจาก Google Sheet แล้ว!`, 'success');
      } else if (result.updatedKeys.length > 0) {
        showNotification(`ซิงค์และอัปเดตข้อมูลล่าสุด ${result.updatedKeys.length} เดือน (${result.syncedKeys[0]} – ${latest}) สำเร็จแล้ว!`, 'success');
      } else if (!silent) {
        showNotification(`ข้อมูลเป็นปัจจุบันแล้ว (ครบ ${result.syncedKeys.length} เดือน: ${result.syncedKeys[0]} – ${latest})`, 'info');
      }
    } catch (err) {
      if (!silent) {
        showNotification('ไม่สามารถซิงค์จาก Google Sheet ได้: ' + err.message, 'error');
      } else {
        console.info('Auto-sync deferred (offline/network):', err.message);
      }
    } finally {
      if (!silent) setIsRefreshing(false);
    }
  };

  const handleRefreshCurrentMonth = async () => {
    await runMasterSync({ silent: false, force: true });
  };

  const handleResetToLooker = async () => {
    setIsRefreshing(true);
    try {
      hasUrlMonthOverrideRef.current = false;
      const latestKey = await clearAndResetToLookerMonths({ dispatch: true });
      setAllMonthsList(getAllMonths());
      setSelectedMonthState(latestKey);
      setLastSyncTime(0);
      showNotification('ล้างแคชข้อมูลเก่าทั้งหมด และรีเซ็ตเป็นชุดข้อมูลรายเดือนหลักเรียบร้อยแล้ว', 'success');
    } finally {
      setIsRefreshing(false);
    }
  };

  const branches = useMemo(() => {
    return Array.from(new Set(data.vehicles.map(v => v.general.branch).filter(Boolean))).sort();
  }, [data]);

  const zones = useMemo(() => {
    return Array.from(new Set(data.vehicles.map(v => v.general.zone).filter(Boolean))).sort();
  }, [data]);

  const types = useMemo(() => {
    return Array.from(new Set(data.vehicles.map(v => v.general.carType).filter(Boolean))).sort();
  }, [data]);

  const activeSummary = useMemo(() => {
    if (selectedBranch === 'all') return data.summary;
    const branchVehicles = data.vehicles.filter(v => v.general.branch === selectedBranch);
    const totalVehicles = branchVehicles.length;
    const totalRewards = branchVehicles.reduce((sum, v) => sum + v.totals.totalReward, 0);
    const avgReward = totalVehicles > 0 ? Math.round(totalRewards / totalVehicles) : 0;
    const qualifiedCount = branchVehicles.filter(v => v.general.qualified).length;
    const withRewardCount = branchVehicles.filter(v => v.totals.totalReward > 0).length;
    const vehiclesWithDefects = branchVehicles.filter(v => v.defects.length > 0).length;
    const totalPendingDeductions = branchVehicles.reduce((sum, v) => sum + v.totals.pendingDeduction, 0);
    return {
      totalVehicles,
      totalRewards,
      avgReward,
      qualifiedCount,
      withRewardCount,
      vehiclesWithDefects,
      totalPendingDeductions
    };
  }, [data, selectedBranch]);

  const filteredVehicles = useMemo(() => {
    return data.vehicles.filter(v => {
      if (searchQuery) {
        const q = searchQuery.toLowerCase().trim();
        const car = v.general.carCode.toLowerCase();
        const name = v.general.fullName.toLowerCase();
        const empId = v.general.empId.toLowerCase();
        if (!car.includes(q) && !name.includes(q) && !empId.includes(q)) return false;
      }
      if (selectedBranch !== 'all' && v.general.branch !== selectedBranch) return false;
      if (selectedZone !== 'all' && v.general.zone !== selectedZone) return false;
      if (selectedType !== 'all' && v.general.carType !== selectedType) return false;
      if (selectedStatus === 'has_reward' && v.totals.totalReward <= 0) return false;
      if (selectedStatus === 'no_reward' && v.totals.totalReward > 0) return false;
      if (selectedStatus === 'with_defects' && v.defects.length === 0) return false;
      if (selectedStatus === 'clean' && v.defects.length > 0) return false;
      if (selectedStatus === 'pending_deduction' && v.totals.pendingDeduction <= 0) return false;
      return true;
    }).sort((a, b) => {
      if (sortBy === 'reward_desc') return b.totals.totalReward - a.totals.totalReward;
      if (sortBy === 'reward_asc') return a.totals.totalReward - b.totals.totalReward;
      if (sortBy === 'score_desc') return b.totals.totalScore - a.totals.totalScore;
      if (sortBy === 'car_asc') return a.general.carCode.localeCompare(b.general.carCode, undefined, { numeric: true });
      if (sortBy === 'defects_desc') return b.defects.length - a.defects.length;
      return 0;
    });
  }, [data, searchQuery, selectedBranch, selectedZone, selectedType, selectedStatus, sortBy]);

  const handleResetFilters = () => {
    setSearchQuery('');
    setSelectedBranch('all');
    setSelectedZone('all');
    setSelectedType('all');
    setSelectedStatus('all');
    setSortBy('reward_desc');
  };

  // 1. IF NOT LOGGED IN, SHOW LOGIN SCREEN
  if (!currentUser) {
    return (
      <LoginScreen
        vehicles={data.vehicles}
        allMonths={allMonthsList}
        onLogin={handleLogin}
        currentMonthLabel={currentMonthObj.label}
      />
    );
  }

  // 2. IF MOBILE DEVICE, RENDER MOBILE-OPTIMIZED UI
  if (isMobile) {
    return (
      <>
        <MobileVehicleView
          vehicle={currentSelectedVehicle}
          allVehicles={visibleVehicles}
          currentMonthData={data}
          onSelectVehicle={(v) => handleSelectVehicle(v)}
          currentUser={currentUser}
          onLogout={handleLogout}
          currentMonthLabel={currentMonthObj.label}
          allMonths={allMonthsList}
          selectedMonthKey={selectedMonthKey}
          onSelectMonth={handleSelectMonth}
          onPrint={(v) => setPrintVehicle(v)}
          onOpenApprovalModal={() => canManage && setIsApprovalModalOpen(true)}
          pendingUsersCount={canManage ? pendingUsersCount : 0}
          onOpenDataManager={() => canManage && setIsDataManagerOpen(true)}
          onOpenUploadModal={() => canManage && setIsUploadNewMonthOpen(true)}
          activeTab={mobileTab}
          onChangeTab={handleChangeMobileTab}
          onCopyLink={handleCopyPageLink}
          linkCopied={linkCopied}
          execSubTab={execSubTab}
          onSelectExecSubTab={handleSelectExecSubTab}
          trendBranchFilter={selectedBranch}
          onSelectTrendBranch={handleSelectBranchState}
        />

        {printVehicle && (
          <VehiclePrintSlip
            vehicle={printVehicle}
            onClose={() => setPrintVehicle(null)}
          />
        )}

        {canManage && isUploadNewMonthOpen && (
          <UploadNewMonthModal
            onClose={() => setIsUploadNewMonthOpen(false)}
            onMonthAdded={handleMonthAdded}
            currentUser={currentUser}
          />
        )}

        {canManage && isApprovalModalOpen && (
          <UserApprovalModal
            isOpen={isApprovalModalOpen}
            onClose={() => setIsApprovalModalOpen(false)}
            currentAdminName={currentUser?.name}
            onUsersChanged={() => setPendingUsersCount(getPendingUsersCount())}
          />
        )}

        {canManage && isDataManagerOpen && (
          <AdminDataManagerModal
            isOpen={isDataManagerOpen}
            onClose={() => setIsDataManagerOpen(false)}
            currentMonthKey={selectedMonthKey}
            onSelectMonth={handleSelectMonth}
            onOpenUploadModal={() => setIsUploadNewMonthOpen(true)}
            currentUser={currentUser}
            currentMonthData={data}
            onDataChanged={(newKey) => {
              setAllMonthsList(getAllMonths());
              if (newKey) {
                setSelectedMonthState(newKey);
                setSelectedMonthKey(newKey);
              }
            }}
            onSyncAllFromLooker={handleRefreshCurrentMonth}
            onResetToLooker={handleResetToLooker}
            isSyncingLooker={isRefreshing}
            lastSyncTime={lastSyncTime}
          />
        )}
      </>
    );
  }

  // 3. IF DESKTOP COMPUTER, RENDER FULL DESKTOP UI
  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 font-sans">
      
      {/* Navbar with Month Selector & User session */}
      <div className="relative">
        <Navbar
          meta={data.meta}
          allMonths={allMonthsList}
          selectedMonthKey={selectedMonthKey}
          onSelectMonth={handleSelectMonth}
          activeTab={safeActiveTab}
          setActiveTab={navigateTab}
          onRefreshFromSheet={handleRefreshCurrentMonth}
          isRefreshing={isRefreshing}
          onOpenUploadNewMonth={() => canManage && setIsUploadNewMonthOpen(true)}
          currentUser={currentUser}
          selectedBranch={selectedBranch}
          branches={branches}
        />

        {/* Current User Session Bar on Desktop */}
        <div className="bg-slate-900 text-white text-xs px-4 py-1.5 flex items-center justify-between no-print relative">
          <div className="max-w-7xl mx-auto w-full flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-sky-400" />
              <span>
                เข้าสู่ระบบโดย: <strong>{currentUser.name}</strong> (
                {isSelfOnly
                  ? `รหัสพนักงาน ${currentUser.empId} • ${currentUser.roleLabel || (currentUser.role === 'contractor' ? 'ผู้ประกอบการ (ผปก.)' : 'พนักงานขับรถ')}`
                  : currentUser.title || 'หัวหน้างาน'}
                )
              </span>
            </span>
            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={handleCopyPageLink}
                title="คัดลอกลิงค์หน้านี้เพื่อส่งต่อ"
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-bold transition-colors text-xs cursor-pointer border ${
                  linkCopied
                    ? 'bg-emerald-600/20 text-emerald-300 border-emerald-500/40'
                    : 'bg-slate-800 hover:bg-slate-700 text-sky-300 border-slate-700'
                }`}
              >
                {linkCopied ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>คัดลอกลิงค์แล้ว</span>
                  </>
                ) : (
                  <>
                    <Link2 className="w-3.5 h-3.5" />
                    <span>คัดลอกลิงค์</span>
                  </>
                )}
              </button>
              {canManage && (
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setIsSettingsMenuOpen((prev) => !prev)}
                    className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-100 font-bold transition-colors text-xs cursor-pointer border border-slate-700"
                  >
                    <Settings className="w-3.5 h-3.5 text-sky-400" />
                    <span>ตั้งค่า</span>
                    {pendingUsersCount > 0 && (
                      <span className="bg-amber-400 text-slate-950 font-black text-[10px] px-1.5 py-0.2 rounded-full">
                        {pendingUsersCount}
                      </span>
                    )}
                    <ChevronDown className="w-3 h-3 text-slate-400" />
                  </button>

                  {isSettingsMenuOpen && (
                    <>
                      <div
                        className="fixed inset-0 z-40"
                        onClick={() => setIsSettingsMenuOpen(false)}
                      />
                      <div className="absolute right-0 mt-1.5 w-60 bg-white rounded-2xl shadow-xl border border-slate-200 py-1.5 z-50 text-slate-800">
                        <div className="px-3.5 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                          การตรวจสอบและจัดการระบบ
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setIsSettingsMenuOpen(false);
                            navigateTab('audit');
                          }}
                          className={`w-full px-3.5 py-2.5 text-left text-xs font-semibold hover:bg-sky-50 flex items-center justify-between cursor-pointer ${
                            safeActiveTab === 'audit' ? 'bg-sky-50 text-sky-700 font-bold' : ''
                          }`}
                        >
                          <span className="flex items-center gap-2.5">
                            <ClipboardCheck className="w-4 h-4 text-sky-600 shrink-0" />
                            <span>ตรวจบันทึกข้อมูล</span>
                          </span>
                          {safeActiveTab === 'audit' && (
                            <span className="text-[10px] text-sky-600 font-bold">กำลังเปิด</span>
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setIsSettingsMenuOpen(false);
                            setIsDataManagerOpen(true);
                          }}
                          className="w-full px-3.5 py-2.5 text-left text-xs font-semibold hover:bg-slate-50 flex items-center gap-2.5 cursor-pointer"
                        >
                          <Database className="w-4 h-4 text-slate-600 shrink-0" />
                          <span>จัดการข้อมูลและสาขา</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setIsSettingsMenuOpen(false);
                            setIsApprovalModalOpen(true);
                          }}
                          className="w-full px-3.5 py-2.5 text-left text-xs font-semibold hover:bg-slate-50 flex items-center justify-between cursor-pointer"
                        >
                          <span className="flex items-center gap-2.5">
                            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                            <span>จัดการอนุมัติพนักงาน</span>
                          </span>
                          {pendingUsersCount > 0 && (
                            <span className="bg-amber-400 text-slate-950 font-black text-[10px] px-1.5 rounded-full">
                              {pendingUsersCount}
                            </span>
                          )}
                        </button>
                      </div>
                    </>
                  )}
                </div>
              )}
              <button
                onClick={handleLogout}
                className="text-slate-300 hover:text-white flex items-center gap-1 transition-colors cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>ออกจากระบบ</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Floating Notification */}
      {notification && (
        <div className="fixed bottom-4 right-4 z-50 animate-in slide-in-from-bottom duration-300">
          <div className={`p-4 rounded-xl shadow-lg border flex items-center space-x-3 ${
            notification.type === 'success' 
              ? 'bg-emerald-900 text-white border-emerald-700' 
              : notification.type === 'error'
              ? 'bg-rose-900 text-white border-rose-700'
              : 'bg-slate-900 text-white border-slate-700'
          }`}>
            {notification.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
            )}
            <span className="text-xs sm:text-sm font-medium">{notification.msg}</span>
          </div>
        </div>
      )}

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        
        {/* KPI Stat Cards for Current Month (เฉพาะสิทธิ์ผู้บริหาร/เจ้าหน้าที่ และซ่อนในหน้าวิเคราะห์/รายงานพิเศษเพื่อความกระชับ) */}
        {canManage && safeActiveTab !== 'analytics' && safeActiveTab !== 'executive' && safeActiveTab !== 'audit' && safeActiveTab !== 'excellence_annual' && safeActiveTab !== 'looker_scores' && (
          <DashboardStats 
            summary={activeSummary} 
            onFilterChange={(key, val) => {
              if (key === 'status') setSelectedStatus(val);
            }}
            currentStatusFilter={selectedStatus}
          />
        )}

        {/* TAB 1: SINGLE VEHICLE DRILLDOWN (ใช้ร่วมกันทั้งเจ้าหน้าที่และโหมดดูของตนเองสำหรับ ผปก./พนักงาน) */}
        {safeActiveTab === 'single' && (
          <SingleVehicleView
            vehicles={visibleVehicles}
            selectedVehicleId={currentSelectedVehicle?.id || singleViewCarId}
            onSelectVehicle={(v) => handleSelectVehicle(v)}
            onPrint={(v) => setPrintVehicle(v)}
            currentMonthLabel={currentMonthObj.label}
            isSelfOnly={isSelfOnly}
            currentUserEmpId={currentUser?.empId}
          />
        )}

        {/* TAB 2: ALL VEHICLES OVERVIEW (MANAGEMENT ONLY) */}
        {canManage && safeActiveTab === 'vehicles' && (
          <div>
            <FilterBar
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              selectedBranch={selectedBranch}
              setSelectedBranch={handleSelectBranchState}
              branches={branches}
              selectedZone={selectedZone}
              setSelectedZone={setSelectedZone}
              selectedType={selectedType}
              setSelectedType={setSelectedType}
              selectedStatus={selectedStatus}
              setSelectedStatus={setSelectedStatus}
              sortBy={sortBy}
              setSortBy={setSortBy}
              zones={zones}
              types={types}
              totalFiltered={filteredVehicles.length}
              totalAll={data.vehicles.length}
              onReset={handleResetFilters}
            />

            {filteredVehicles.length === 0 ? (
              <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center my-6">
                <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto text-slate-400 mb-3">
                  <AlertCircle className="w-8 h-8" />
                </div>
                <h3 className="font-bold text-slate-900 text-lg">ไม่พบข้อมูลเบอร์รถตามเงื่อนไขที่ค้นหา</h3>
                <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-md mx-auto">
                  กรุณาตรวจสอบคำค้นหา หรือกดปุ่ม "ล้างตัวกรอง" เพื่อแสดงรถทั้งหมด
                </p>
                <button
                  onClick={handleResetFilters}
                  className="mt-4 px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-medium transition-colors"
                >
                  ล้างตัวกรองทั้งหมด
                </button>
              </div>
            ) : viewMode === 'grid' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                {filteredVehicles.map(vehicle => (
                  <VehicleCard
                    key={vehicle.id}
                    vehicle={vehicle}
                    onSelect={(v) => handleSelectVehicle(v, 'single')}
                    onPrint={setPrintVehicle}
                  />
                ))}
              </div>
            ) : (
              <VehicleTable
                vehicles={filteredVehicles}
                onSelect={(v) => handleSelectVehicle(v, 'single')}
                onPrint={setPrintVehicle}
              />
            )}
          </div>
        )}

        {/* TAB 3: BRANCH ANALYTICS OVERVIEW (MANAGEMENT ONLY) */}
        {canManage && safeActiveTab === 'analytics' && (
          <BranchAnalytics
            data={data}
            selectedBranch={selectedBranch}
            onSelectBranch={handleSelectBranchState}
            onSelectVehicle={(v) => handleSelectVehicle(v, 'single')}
          />
        )}

        {/* TAB 4: EXECUTIVE COMPARISON VIEW (MANAGEMENT ONLY) */}
        {canManage && safeActiveTab === 'executive' && (
          <ExecutiveComparisonView
            data={data}
            allMonthsList={allMonthsList}
            selectedMonthKey={selectedMonthKey}
            onSelectMonth={handleSelectMonth}
            currentUser={currentUser}
            onOpenUploadModal={() => setIsUploadNewMonthOpen(true)}
            onOpenDataManager={() => setIsDataManagerOpen(true)}
            subTab={execSubTab}
            onSelectSubTab={handleSelectExecSubTab}
            trendBranchFilter={selectedBranch}
            onSelectTrendBranch={handleSelectBranchState}
          />
        )}

        {/* TAB 5: BRANCH SUBMISSION AUDIT VIEW (MOVED UNDER SETTINGS ⚙️ — MANAGEMENT ONLY) */}
        {canManage && safeActiveTab === 'audit' && (
          <div className="space-y-4">
            <div className="bg-white rounded-2xl border border-slate-200 px-4 py-3 flex items-center justify-between text-xs shadow-2xs">
              <div className="flex items-center gap-2 text-slate-600 font-semibold">
                <Settings className="w-4 h-4 text-sky-600" />
                <span>ตั้งค่า &gt; <strong className="text-slate-900">ตรวจบันทึกข้อมูล</strong></span>
              </div>
              <button
                type="button"
                onClick={() => navigateTab('single')}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold transition-colors cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>กลับหน้าหลัก</span>
              </button>
            </div>
            <BranchSubmissionAuditView
              data={data}
              allMonthsList={allMonthsList}
              selectedMonthKey={selectedMonthKey}
              onSelectMonth={handleSelectMonth}
              currentUser={currentUser}
              onOpenUploadModal={() => setIsUploadNewMonthOpen(true)}
              onFilterBranchAndNavigate={(branchName) => {
                handleSelectBranchState(branchName);
                navigateTab('vehicles');
              }}
            />
          </div>
        )}

        {/* TAB 6: ANNUAL EXCELLENCE 2569 VIEW (MANAGEMENT ONLY) */}
        {canManage && safeActiveTab === 'excellence_annual' && (
          <AnnualExcellenceView />
        )}

        {/* TAB 7: LOOKER SCORES 2569 VIEW (MANAGEMENT ONLY) */}
        {canManage && safeActiveTab === 'looker_scores' && (
          <LookerScoresView />
        )}

      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-6 text-center text-xs text-slate-500 no-print">
        <div className="max-w-7xl mx-auto px-4">
          <p>© {new Date().getFullYear()} ระบบตรวจสอบผลคะแนนและรางวัลมาตรฐานจัดส่ง Sprinkle</p>
          <p className="mt-1 text-slate-400">ตรวจสอบเงินรางวัลและวิเคราะห์หัวข้อที่ตกเกณฑ์รายเบอร์รถได้อย่างรวดเร็วและแม่นยำ</p>
        </div>
      </footer>

      {/* Modals */}
      {selectedVehicle && (
        <VehicleDetailModal
          vehicle={selectedVehicle}
          onClose={() => setSelectedVehicle(null)}
          onPrint={(v) => setPrintVehicle(v)}
        />
      )}

      {printVehicle && (
        <VehiclePrintSlip
          vehicle={printVehicle}
          onClose={() => setPrintVehicle(null)}
        />
      )}

      {canManage && isUploadNewMonthOpen && (
        <UploadNewMonthModal
          onClose={() => setIsUploadNewMonthOpen(false)}
          onMonthAdded={handleMonthAdded}
          currentUser={currentUser}
        />
      )}

      {canManage && isApprovalModalOpen && (
        <UserApprovalModal
          isOpen={isApprovalModalOpen}
          onClose={() => setIsApprovalModalOpen(false)}
          currentAdminName={currentUser?.name}
          onUsersChanged={() => setPendingUsersCount(getPendingUsersCount())}
        />
      )}

      {canManage && isDataManagerOpen && (
        <AdminDataManagerModal
          isOpen={isDataManagerOpen}
          onClose={() => setIsDataManagerOpen(false)}
          currentMonthKey={selectedMonthKey}
          onSelectMonth={handleSelectMonth}
          onOpenUploadModal={() => setIsUploadNewMonthOpen(true)}
          currentUser={currentUser}
          currentMonthData={data}
          onDataChanged={(newKey) => {
            setAllMonthsList(getAllMonths());
            if (newKey) {
              setSelectedMonthState(newKey);
              setSelectedMonthKey(newKey);
            }
          }}
          onSyncAllFromLooker={handleRefreshCurrentMonth}
          onResetToLooker={handleResetToLooker}
          isSyncingLooker={isRefreshing}
          lastSyncTime={lastSyncTime}
        />
      )}

    </div>
  );
}
