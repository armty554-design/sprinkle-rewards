import React, { useState, useMemo, useEffect } from 'react';
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
import UserApprovalModal from './components/UserApprovalModal';
import AdminDataManagerModal from './components/AdminDataManagerModal';
import { useIsMobile } from './hooks/useIsMobile';
import { parseCSVData } from './utils/parser';
import { 
  getAllMonths, 
  getMonthData, 
  saveNewMonth, 
  mergeBranchIntoMonth,
  getSelectedMonthKey, 
  setSelectedMonthKey,
  initStorage
} from './utils/monthStorage';
import { getPendingUsersCount } from './utils/userManagement';
import { AlertCircle, CheckCircle2, LogOut, User, ShieldCheck, Database, Building2 } from 'lucide-react';

const STORAGE_AUTH_USER = 'sprinkle_auth_user';

export default function App() {
  const isMobile = useIsMobile(768);

  // Authentication State
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_AUTH_USER);
      return saved ? JSON.parse(saved) : null;
    } catch (err) {
      return null;
    }
  });

  // Current selected month
  const [selectedMonthKey, setSelectedMonthState] = useState(() => getSelectedMonthKey());
  const [allMonthsList, setAllMonthsList] = useState(() => getAllMonths());

  // Active view tab (Desktop)
  const [activeTab, setActiveTab] = useState('single'); // 'single', 'vehicles', 'analytics'
  const [viewMode, setViewMode] = useState('grid'); // 'grid', 'table'

  // Current Month Data
  const currentMonthObj = useMemo(() => {
    return getMonthData(selectedMonthKey) || allMonthsList[0];
  }, [selectedMonthKey, allMonthsList]);

  // Parse CSV for current month
  const data = useMemo(() => {
    try {
      return parseCSVData(currentMonthObj.csv);
    } catch (err) {
      console.error('Parse error:', err);
      return parseCSVData(allMonthsList[0].csv);
    }
  }, [currentMonthObj, allMonthsList]);

  // Selected vehicle for Single Vehicle View
  const [singleViewCarId, setSingleViewCarId] = useState(() => {
    return data.vehicles[0]?.id || null;
  });

  // When driver logs in or data changes, select their vehicle
  useEffect(() => {
    if (currentUser?.role === 'driver') {
      const myVehicle = data.vehicles.find(v => 
        v.general.empId === currentUser.empId || 
        v.general.carCode === currentUser.carCode
      );
      if (myVehicle) {
        setSingleViewCarId(myVehicle.id);
        return;
      }
    }
    if (!singleViewCarId && data.vehicles.length > 0) {
      setSingleViewCarId(data.vehicles[0].id);
    }
  }, [data, currentUser]);

  // Current selected vehicle object
  const currentSelectedVehicle = useMemo(() => {
    return data.vehicles.find(v => v.id === singleViewCarId) || data.vehicles[0];
  }, [data, singleViewCarId]);

  // Filters for All Vehicles Overview
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBranch, setSelectedBranch] = useState('all');
  const [selectedZone, setSelectedZone] = useState('all');
  const [selectedType, setSelectedType] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [sortBy, setSortBy] = useState('reward_desc');

  // Modals
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [printVehicle, setPrintVehicle] = useState(null);
  const [isUploadNewMonthOpen, setIsUploadNewMonthOpen] = useState(false);
  const [isApprovalModalOpen, setIsApprovalModalOpen] = useState(false);
  const [isDataManagerOpen, setIsDataManagerOpen] = useState(false);
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

  // Initialize persistent storage (IndexedDB + seed all 18 branches)
  useEffect(() => {
    initStorage().then(() => {
      setAllMonthsList(getAllMonths());
    });
  }, []);

  // Sync months on custom months update
  useEffect(() => {
    const handleMonthsUpdate = () => {
      setAllMonthsList(getAllMonths());
    };
    window.addEventListener('sprinkle_months_updated', handleMonthsUpdate);
    return () => window.removeEventListener('sprinkle_months_updated', handleMonthsUpdate);
  }, []);

  // Login handler
  const handleLogin = (user) => {
    setCurrentUser(user);
    localStorage.setItem(STORAGE_AUTH_USER, JSON.stringify(user));
    showNotification(`ยินดีต้อนรับ ${user.name}`, 'success');
  };

  // Logout handler
  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem(STORAGE_AUTH_USER);
    showNotification('ออกจากระบบเรียบร้อยแล้ว', 'info');
  };

  // Month select handler
  const handleSelectMonth = (key) => {
    setSelectedMonthState(key);
    setSelectedMonthKey(key);
    showNotification(`สลับข้อมูลเป็นเดือน: ${getMonthData(key)?.label || key}`, 'info');
  };

  // New month added handler supporting merge and replace modes
  const handleMonthAdded = (key, label, csvText, note, importMode = 'merge') => {
    let saved = null;
    if (importMode === 'merge') {
      saved = mergeBranchIntoMonth(key, csvText, label, note);
    } else {
      saved = saveNewMonth(key, label, csvText, note);
    }

    if (saved) {
      const updatedList = getAllMonths();
      setAllMonthsList(updatedList);
      setSelectedMonthState(key);
      showNotification(`นำเข้าข้อมูลเดือน ${label} เรียบร้อยแล้ว`, 'success');
    }
  };

  // Sync current month from Google Sheet if it has a gid
  const handleRefreshCurrentMonth = async () => {
    if (!currentMonthObj?.gid) {
      showNotification('เดือนนี้เป็นไฟล์ที่อัปโหลดโดยผู้ใช้ ไม่ได้เชื่อมกับ Google Sheet', 'info');
      return;
    }
    setIsRefreshing(true);
    try {
      const sheetId = '1iRRkVS5mc9BfuKvEIsWN6l946zE7HKMEmmun0iIdXFs';
      const exportUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${currentMonthObj.gid}`;
      const res = await fetch(exportUrl);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const text = await res.text();

      saveNewMonth(currentMonthObj.key, currentMonthObj.label, text, 'ซิงค์จาก Google Sheet');
      setAllMonthsList(getAllMonths());
      setSelectedMonthState(currentMonthObj.key);
      showNotification(`ซิงค์ข้อมูลล่าสุดเดือน ${currentMonthObj.label} สำเร็จแล้ว!`, 'success');
    } catch (err) {
      showNotification('ไม่สามารถซิงค์ได้: ' + err.message, 'error');
    } finally {
      setIsRefreshing(false);
    }
  };

  const showNotification = (msg, type = 'info') => {
    setNotification({ msg, type });
    setTimeout(() => {
      setNotification(null);
    }, 4000);
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
          allVehicles={data.vehicles}
          currentMonthData={data}
          onSelectVehicle={(v) => setSingleViewCarId(v.id)}
          currentUser={currentUser}
          onLogout={handleLogout}
          currentMonthLabel={currentMonthObj.label}
          allMonths={allMonthsList}
          selectedMonthKey={selectedMonthKey}
          onSelectMonth={handleSelectMonth}
          onPrint={(v) => setPrintVehicle(v)}
          onOpenApprovalModal={() => setIsApprovalModalOpen(true)}
          pendingUsersCount={pendingUsersCount}
          onOpenDataManager={() => setIsDataManagerOpen(true)}
          onOpenUploadModal={() => setIsUploadNewMonthOpen(true)}
        />

        {printVehicle && (
          <VehiclePrintSlip
            vehicle={printVehicle}
            onClose={() => setPrintVehicle(null)}
          />
        )}

        {isUploadNewMonthOpen && (
          <UploadNewMonthModal
            onClose={() => setIsUploadNewMonthOpen(false)}
            onMonthAdded={handleMonthAdded}
            currentUser={currentUser}
          />
        )}

        {isApprovalModalOpen && (
          <UserApprovalModal
            isOpen={isApprovalModalOpen}
            onClose={() => setIsApprovalModalOpen(false)}
            currentAdminName={currentUser?.name}
            onUsersChanged={() => setPendingUsersCount(getPendingUsersCount())}
          />
        )}

        {isDataManagerOpen && (
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
          viewMode={viewMode}
          setViewMode={setViewMode}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          onRefreshFromSheet={handleRefreshCurrentMonth}
          isRefreshing={isRefreshing}
          onOpenUploadNewMonth={() => setIsUploadNewMonthOpen(true)}
          currentUser={currentUser}
          onOpenApprovalModal={() => setIsApprovalModalOpen(true)}
          pendingUsersCount={pendingUsersCount}
          onOpenDataManager={() => setIsDataManagerOpen(true)}
          selectedBranch={selectedBranch}
          branches={branches}
        />

        {/* Current User Session Bar on Desktop */}
        <div className="bg-slate-900 text-white text-xs px-4 py-1.5 flex items-center justify-between no-print">
          <div className="max-w-7xl mx-auto w-full flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-sky-400" />
              <span>เข้าสู่ระบบโดย: <strong>{currentUser.name}</strong> ({currentUser.role === 'driver' ? `เบอร์รถ ${currentUser.carCode}` : currentUser.title || 'หัวหน้างาน'})</span>
            </span>
            <div className="flex items-center gap-2.5">
              {(currentUser.role === 'admin' || currentUser.role === 'supervisor' || currentUser.role === 'office') && (
                <>
                  <button
                    onClick={() => setIsDataManagerOpen(true)}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-sky-500/20 hover:bg-sky-500/30 text-sky-300 font-bold transition-colors text-xs cursor-pointer"
                  >
                    <Database className="w-3.5 h-3.5 text-sky-400" />
                    <span>จัดการข้อมูลและสาขา</span>
                  </button>

                  <button
                    onClick={() => setIsApprovalModalOpen(true)}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold transition-colors text-xs cursor-pointer"
                  >
                    <ShieldCheck className="w-3.5 h-3.5 text-sky-400" />
                    <span>จัดการอนุมัติพนักงาน</span>
                    {pendingUsersCount > 0 && (
                      <span className="bg-amber-400 text-slate-950 font-black text-[10px] px-1.5 py-0.2 rounded-full animate-pulse">
                        {pendingUsersCount}
                      </span>
                    )}
                  </button>
                </>
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
        
        {/* KPI Stat Cards for Current Month (ซ่อนเมื่ออยู่แท็บผู้บริหารหรือแท็บตรวจบันทึกเพื่อความกระชับ) */}
        {activeTab !== 'executive' && activeTab !== 'audit' && (
          <DashboardStats 
            summary={activeSummary} 
            onFilterChange={(key, val) => {
              if (key === 'status') setSelectedStatus(val);
            }}
            currentStatusFilter={selectedStatus}
          />
        )}

        {/* TAB 1: SINGLE VEHICLE DRILLDOWN (กางทุกข้อ) */}
        {activeTab === 'single' && (
          <SingleVehicleView
            vehicles={data.vehicles}
            selectedVehicleId={singleViewCarId}
            onSelectVehicle={(v) => setSingleViewCarId(v.id)}
            onPrint={(v) => setPrintVehicle(v)}
            currentMonthLabel={currentMonthObj.label}
          />
        )}

        {/* TAB 2: ALL VEHICLES OVERVIEW */}
        {activeTab === 'vehicles' && (
          <div>
            <FilterBar
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              selectedBranch={selectedBranch}
              setSelectedBranch={setSelectedBranch}
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
                    onSelect={(v) => {
                      setSingleViewCarId(v.id);
                      setActiveTab('single');
                    }}
                    onPrint={setPrintVehicle}
                  />
                ))}
              </div>
            ) : (
              <VehicleTable
                vehicles={filteredVehicles}
                onSelect={(v) => {
                  setSingleViewCarId(v.id);
                  setActiveTab('single');
                }}
                onPrint={setPrintVehicle}
              />
            )}
          </div>
        )}

        {/* TAB 3: BRANCH ANALYTICS OVERVIEW */}
        {activeTab === 'analytics' && (
          <BranchAnalytics
            data={data}
            onSelectVehicle={(v) => {
              setSingleViewCarId(v.id);
              setActiveTab('single');
            }}
            onFilterByDefect={(code) => {
              setActiveTab('single');
              setSearchQuery(code);
            }}
          />
        )}

        {/* TAB 4: EXECUTIVE COMPARISON VIEW */}
        {activeTab === 'executive' && (
          <ExecutiveComparisonView
            data={data}
            allMonthsList={allMonthsList}
            selectedMonthKey={selectedMonthKey}
            onSelectMonth={handleSelectMonth}
            currentUser={currentUser}
            onOpenUploadModal={() => setIsUploadNewMonthOpen(true)}
            onOpenDataManager={() => setIsDataManagerOpen(true)}
          />
        )}

        {/* TAB 5: BRANCH SUBMISSION AUDIT VIEW */}
        {activeTab === 'audit' && (
          <BranchSubmissionAuditView
            data={data}
            allMonthsList={allMonthsList}
            selectedMonthKey={selectedMonthKey}
            onSelectMonth={handleSelectMonth}
            currentUser={currentUser}
            onOpenUploadModal={() => setIsUploadNewMonthOpen(true)}
            onFilterBranchAndNavigate={(branchName) => {
              setSelectedBranch(branchName);
              setActiveTab('vehicles');
            }}
          />
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

      {isUploadNewMonthOpen && (
        <UploadNewMonthModal
          onClose={() => setIsUploadNewMonthOpen(false)}
          onMonthAdded={handleMonthAdded}
          currentUser={currentUser}
        />
      )}

      {isApprovalModalOpen && (
        <UserApprovalModal
          isOpen={isApprovalModalOpen}
          onClose={() => setIsApprovalModalOpen(false)}
          currentAdminName={currentUser?.name}
          onUsersChanged={() => setPendingUsersCount(getPendingUsersCount())}
        />
      )}

      {isDataManagerOpen && (
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
        />
      )}

    </div>
  );
}
