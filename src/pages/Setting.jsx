import { authFetch } from "../utils/authFetch";
import React, { useEffect, useState, useMemo, useRef, useCallback } from 'react';
// import { Plus, User, Building, X, Save, Edit, Trash2, Settings, Search, ChevronDown, Calendar, RefreshCw } from 'lucide-react';
import { Plus, User, Building, X, Save, Edit, Trash2, Settings, Search, ChevronDown, Calendar, RefreshCw, Eye, EyeOff, Upload, Image as ImageIcon, Copy, MessageSquare } from 'lucide-react';
import AdminLayout from '../components/layout/AdminLayout';
import { useDispatch, useSelector } from 'react-redux';
import { departmentDetails, departmentOnlyDetails, extendUserDetails, givenByDetails, leaveUserDetails, machineDetails, resetExtendUserData, resetLeaveUserData, resetUserData, userDetails, createDepartment, createUser, deleteUser, updateDepartment, updateUser, createMachineThunk, updateMachineThunk, deleteMachineThunk } from '../redux/slice/settingSlice';
import { updateLoginUserData } from '../redux/slice/loginSlice';
import { extendTaskApi } from '../redux/api/settingApi';
import { uniqueDoerNameData } from '../redux/slice/assignTaskSlice';
import { hasPageAccess, hasModifyAccess } from '../utils/permissionUtils';
import Toast from '../components/Toast';
// import supabase from '../SupabaseClient';
import { SYSTEM_PERMISSIONS, PAGE_PERMISSIONS, PAGE_PERMISSION_GROUPS, PAGE_SYSTEM_MAP, DOC_SYSTEMS, DOC_PAGES, DOC_PAGE_MAP } from '../constants/permissions';
import { buildUnifiedPermissions, splitUnifiedPermissions, hasPermission } from '../utils/permissionAdapter';



// Reusable Chips + Overflow component for table columns
const ChipsOverflow = ({ items, title }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 640);
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const partList = Array.isArray(items) ? items.filter(p => p && p.trim() !== '') : (items ? items.split(',').map(p => p.trim()).filter(p => p !== '') : []);
  if (partList.length === 0) return <span className="text-gray-400">—</span>;

  const maxVisible = isMobile ? 2 : 3;
  const visibleItems = partList.slice(0, maxVisible);
  const overflowCount = partList.length - maxVisible;

  return (
    <div className="flex flex-wrap gap-1.5 items-center">
      {visibleItems.map((item, idx) => (
        <span 
          key={idx} 
          className="px-2 py-0.5 bg-purple-50 text-purple-700 rounded-md text-[11px] font-medium border border-purple-100 truncate max-w-[120px]"
          title={item}
        >
          {item}
        </span>
      ))}
      
      {overflowCount > 0 && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            setIsOpen(true);
          }}
          className="px-2 py-0.5 bg-purple-600 text-white rounded-md text-[11px] font-bold hover:bg-purple-700 transition-colors shadow-sm whitespace-nowrap"
          title={`View all ${partList.length} parts`}
          aria-label={`View all ${partList.length} parts for ${title}`}
        >
          +{overflowCount} more
        </button>
      )}

      {/* Overflow Modal/Popover Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={() => setIsOpen(false)}
        >
          <div 
            className={`bg-white rounded-xl shadow-2xl w-full max-w-sm overflow-hidden flex flex-col transform transition-all animate-in zoom-in-95 duration-200 ${isMobile ? 'translate-y-0 mt-auto rounded-b-none' : ''}`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-purple-100 text-purple-600 rounded-lg">
                  <ImageIcon size={18} />
                </div>
                <h3 className="font-bold text-gray-900 truncate">Parts: {title}</h3>
              </div>
              <button 
                onClick={() => setIsOpen(false)}
                className="p-1 hover:bg-gray-200 rounded-full transition-colors text-gray-500"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="p-4 overflow-y-auto max-h-[60vh] space-y-2 custom-scrollbar">
              {partList.map((item, idx) => (
                <div key={idx} className="flex items-center gap-3 p-2.5 bg-white border border-gray-100 rounded-lg hover:border-purple-200 hover:bg-purple-50/30 transition-all group">
                  <div className="h-2 w-2 rounded-full bg-purple-300 group-hover:bg-purple-500 transition-colors"></div>
                  <span className="text-sm text-gray-700 font-medium">{item}</span>
                </div>
              ))}
            </div>
            
            <div className="p-4 border-t border-gray-100 bg-white">
              <button 
                onClick={() => setIsOpen(false)}
                className="w-full py-2.5 bg-gray-900 hover:bg-black text-white font-bold rounded-lg transition-all shadow-md active:scale-[0.98]"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const Setting = () => {
  const [activeTab, setActiveTab] = useState('users');
  const [showUserModal, setShowUserModal] = useState(false);
  const [showDeptModal, setShowDeptModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [toast, setToast] = useState({ show: false, message: "", type: "success" });
  const [isEditing, setIsEditing] = useState(false);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [currentDeptId, setCurrentDeptId] = useState(null);
  const [usernameFilter, setUsernameFilter] = useState('');
  const [usernameDropdownOpen, setUsernameDropdownOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const [activeDeptSubTab, setActiveDeptSubTab] = useState('departments');
  // Leave Management State
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [leaveStartDate, setLeaveStartDate] = useState('');
  const [leaveEndDate, setLeaveEndDate] = useState('');
  const [remark, setRemark] = useState('');
  const [leaveUsernameFilter, setLeaveUsernameFilter] = useState('');
  const [extendUsernameFilter, setExtendUsernameFilter] = useState('');
  const [showPasswords, setShowPasswords] = useState({}); // Track which passwords are visible
  const [showModalPassword, setShowModalPassword] = useState(false);
  const [showDeptDropdown, setShowDeptDropdown] = useState(false);
  const [showGivenByModal, setShowGivenByModal] = useState(false);
  const [givenByInput, setGivenByInput] = useState('');
  const [isEditingGivenBy, setIsEditingGivenBy] = useState(false);
  const [currentGivenById, setCurrentGivenById] = useState(null);
  const [givenByDeptData, setGivenByDeptData] = useState({});
  
  // Task Delegation Modal State
  const [showDelegationModal, setShowDelegationModal] = useState(false);
  const [selectedDoer, setSelectedDoer] = useState('');
  
  // Leave Transfer Popup State
  const [showLeavePopup, setShowLeavePopup] = useState(false);
  const [currentLeaveUser, setCurrentLeaveUser] = useState(null);
  const [popupLeaveStartDate, setPopupLeaveStartDate] = useState('');
  const [popupLeaveEndDate, setPopupLeaveEndDate] = useState('');
  const [popupDoer, setPopupDoer] = useState('');
  const [popupRemarks, setPopupRemarks] = useState('');

  // Extend Task State
  const [showExtendTaskPopup, setShowExtendTaskPopup] = useState(false);
  const [currentExtendUser, setCurrentExtendUser] = useState(null);
  const [extendStartDate, setExtendStartDate] = useState('');
  const [extendEndDate, setExtendEndDate] = useState('');
  const [extendUserTasks, setExtendUserTasks] = useState([]);
  const [extendLoading, setExtendLoading] = useState(false);
  const [newStartDates, setNewStartDates] = useState({});
  
  // Category selection for Leave Transfer
  const [popupLeaveCategory, setPopupLeaveCategory] = useState('Checklist');
  const [bulkLeaveCategory, setBulkLeaveCategory] = useState('Checklist');
  
  // Individual Task Assignment State
  const [userTasks, setUserTasks] = useState([]);
  const [taskAssignments, setTaskAssignments] = useState({});
  const [isLoadingTasks, setIsLoadingTasks] = useState(false);
  const [fetchError, setFetchError] = useState('');
  const [taskToDelete, setTaskToDelete] = useState(null);
  const [tasksToBulkDelete, setTasksToBulkDelete] = useState([]); // For bulk deletion modal
  const [selectedTasksToDelete, setSelectedTasksToDelete] = useState([]); // Checked tasks
  const [isDeletingTask, setIsDeletingTask] = useState(false);
  const [bulkPopupDoer, setBulkPopupDoer] = useState(''); // Bulk assignment for individual popup

  const [isSendingAlerts, setIsSendingAlerts] = useState(false);
  // Machine Management State
  const [showMachineModal, setShowMachineModal] = useState(false);
  const [machineForm, setMachineForm] = useState({
    machine_name: '',
    part_name: [],
    part_images: [], // Added for part images
    machine_area: '',
    machine_department: '',
    machine_division: ''
  });

  const [isEditingMachine, setIsEditingMachine] = useState(false);
  const [currentMachineId, setCurrentMachineId] = useState(null);
  const [partInput, setPartInput] = useState('');
  const [machineSearch, setMachineSearch] = useState('');
  
  // Handlers for Machine Part Management
  const handlePartPaste = (e) => {
    e.preventDefault();
    const paste = e.clipboardData.getData('text');
    if (!paste) return;

    // Split by comma, trim, filter out empty strings
    const newParts = paste.split(',')
      .map(p => p.trim())
      .filter(p => p.length > 0);

    if (newParts.length > 0) {
      setMachineForm(prev => {
        const existingParts = prev.part_name || [];
        const uniqueNewParts = newParts.filter(p => !existingParts.includes(p));
        
        if (uniqueNewParts.length === 0) return prev;

        return {
          ...prev,
          part_name: [...existingParts, ...uniqueNewParts],
          part_images: [...(prev.part_images || []), ...new Array(uniqueNewParts.length).fill(null)]
        };
      });
    }
  };

  const handleCopyAllParts = () => {
    if (machineForm.part_name.length === 0) return;
    const text = machineForm.part_name.join(', ');
    navigator.clipboard.writeText(text);
    alert('All part names copied to clipboard!');
  };

  const handleRemoveAllParts = () => {
    if (machineForm.part_name.length === 0) return;
    if (window.confirm('Are you sure you want to remove all parts?')) {
      setMachineForm(prev => ({
        ...prev,
        part_name: [],
        part_images: []
      }));
    }
  };
  
  // Permission State (Unified Model)
  const [unifiedPermissions, setUnifiedPermissions] = useState({});

  const normalizeKey = (key) => {
    if (!key) return '';
    return key.toLowerCase().replace(/[\/\s-]+/g, '_');
  };

  const togglePermission = (module, page, action) => {
    const normalizedPage = normalizeKey(page);
    setUnifiedPermissions(prev => {
      const next = { ...prev };
      
      if (!next[module]) next[module] = {};
      
      const currentAction = next[module][normalizedPage];
      let newAction = currentAction;
      
      if (action === 'view') {
        if (currentAction === 'view' || currentAction === 'modify') {
          newAction = null;
        } else {
          newAction = 'view';
        }
      } else if (action === 'modify') {
        if (currentAction === 'modify') {
          newAction = 'view';
        } else {
          newAction = 'modify';
        }
      }

      if (newAction) {
        next[module][normalizedPage] = newAction;
      } else {
        delete next[module][normalizedPage];
      }

      // Forward Cascading logic for specialized documentation pages
      if (newAction) {
        let parentKey = null;
        let parentModule = module;

        if (page.startsWith('Subscription/')) {
          parentKey = 'subscription';
          parentModule = 'subscription';
        } else if (page.startsWith('Document/')) {
          parentKey = 'documentation';
          parentModule = 'documentation';
        } else if (page.startsWith('Loan/')) {
          parentKey = 'loan';
          parentModule = 'loan';
        } else if (page === 'Master') {
          parentKey = 'master';
          parentModule = 'master';
        } else if (page === 'Settings') {
          parentKey = 'settings';
          parentModule = 'settings';
        } else if (page === 'Resource Manager') {
          parentKey = 'resource_manager';
          parentModule = 'documentation';
        }

        // Apply cascading permission to parent if applicable
        if (parentKey && (page !== parentKey || module !== parentModule)) {
          const parentNormalized = normalizeKey(parentKey);
          if (!next[parentModule]) next[parentModule] = {};
          
          const parentCurrentAction = next[parentModule][parentNormalized];
          
          // Ensure parent has at least the same level of access as the sub-page
          if (newAction === 'modify' && parentCurrentAction !== 'modify') {
            next[parentModule][parentNormalized] = 'modify';
          } else if (newAction === 'view' && !parentCurrentAction) {
            next[parentModule][parentNormalized] = 'view';
          }
        }
      }

      // Reverse Cascading logic (Uncheck parent OR Uncheck Modify -> Update all sub-pages)
      const parentKeys = ['subscription', 'documentation', 'loan', 'master', 'settings', 'resource_manager'];
      if (parentKeys.includes(page) && (!newAction || newAction === 'view')) {
        const targetModuleMap = {
          'subscription': 'subscription',
          'documentation': 'documentation',
          'loan': 'loan',
          'master': 'master',
          'settings': 'settings',
          'resource_manager': 'documentation'
        };

        const targetModule = targetModuleMap[page];
        if (targetModule && next[targetModule]) {
          Object.keys(next[targetModule]).forEach(p => {
            let belongsToParent = false;
            // Map sub-pages to their corresponding parent keys for unchecking
            if (page === 'subscription') belongsToParent = p.startsWith('subscription_');
            else if (page === 'documentation') belongsToParent = (p.startsWith('document_') || p === 'dashboard' || p === 'resource_manager');
            else if (page === 'loan') belongsToParent = p.startsWith('loan_');
            else if (page === 'master') belongsToParent = (p === 'master');
            else if (page === 'settings') belongsToParent = (p === 'settings');
            else if (page === 'resource_manager') belongsToParent = (p === 'resource_manager');

            if (belongsToParent) {
              if (!newAction) {
                // Parent is fully unchecked -> Uncheck sub-page
                delete next[targetModule][p];
              } else if (newAction === 'view' && next[targetModule][p] === 'modify') {
                // Parent Modify unchecked -> Sub-page Modify unchecked (downgrade to View)
                next[targetModule][p] = 'view';
              }
            }
          });
        }
      }
      
      if (next[module] && Object.keys(next[module]).length === 0) {
        delete next[module];
      }
      
      return next;
    });
  };

  const toggleSystemAccess = (system) => {
    setUnifiedPermissions(prev => {
      const next = { ...prev };
      if (next[system]) {
        delete next[system];
      } else {
        next[system] = { 'dashboard': 'view' };
      }
      return next;
    });
  };

  // Derived checks for UI
  const isSystemActive = (system) => !!unifiedPermissions[system];
  const getPageAction = (module, page) => {
    const normalizedPage = normalizeKey(page);
    return unifiedPermissions[module]?.[normalizedPage] || null;
  };

  // Derived: does user have modify access to Settings (for gating UI buttons)
  const canModifySettings = hasModifyAccess('settings');
  const userListRef = useRef(null);
  const { 
    userData, 
    leaveUsers, 
    extendUsers, 
    department, 
    departmentsOnly, 
    givenBy, 
    machines, 
    loading, 
    error, 
    pagination, 
    leavePagination, 
    extendPagination 
  } = useSelector((state) => state.setting);

  // Filtered Machines Logic
  const filteredMachines = useMemo(() => {
    if (!machineSearch || !machines) return machines;
    const query = machineSearch.toLowerCase();
    return machines.filter(m => 
      (m.machine_name || '').toLowerCase().includes(query) ||
      (m.machine_area || '').toLowerCase().includes(query) ||
      (m.machine_department || '').toLowerCase().includes(query) ||
      (m.machine_division || '').toLowerCase().includes(query) ||
      (Array.isArray(m.part_name) ? m.part_name.join(' ') : (m.part_name || '')).toLowerCase().includes(query)
    );
  }, [machines, machineSearch]);
  const { doerName } = useSelector((state) => state.assignTask);
  // Get current logged-in user to check for super_admin role
  const { userData: currentUser } = useSelector((state) => state.login);
  
  // Memoize currentUserRole and loginUserData to prevent infinite render loops
  const currentUserRole = useMemo(() => {
    return (currentUser && !Array.isArray(currentUser))
      ? currentUser.role
      : localStorage.getItem('role');
  }, [currentUser]);

  const dispatch = useDispatch();
  const canManageSettings = hasPageAccess('settings');

  const loginUserData = useMemo(() => {
    if (currentUser && !Array.isArray(currentUser) && Object.keys(currentUser).length > 0) {
      return currentUser;
    }
    return {
      user_name: localStorage.getItem('user-name'),
      role: localStorage.getItem('role'),
      email_id: localStorage.getItem('email_id'),
      number: localStorage.getItem('number'),
      unit: localStorage.getItem('unit'),
      division: localStorage.getItem('division'),
      department: localStorage.getItem('department'),
      user_access: localStorage.getItem('user_access'),
      designation: localStorage.getItem('designation')
    };
  }, [currentUser]);

  const getRequesterContext = useCallback(() => {
    return {
      requesterRole: currentUserRole,
      requesterUnit: loginUserData?.unit,
      requesterDivision: loginUserData?.division,
      requesterDepartment: loginUserData?.user_access || loginUserData?.department,
      username: loginUserData?.user_name || localStorage.getItem('user-name')
    };
  }, [currentUserRole, loginUserData]);

  const loggedInUserId = Array.isArray(userData) ? userData.find(u => u.user_name === (loginUserData?.user_name || localStorage.getItem('user-name')))?.id : null;

  // Memoized available doers for leave transfer/delegation
  const availableDoersForLeave = useMemo(() => {
    if (!userData || userData.length === 0) return [];
    
    const userRole = localStorage.getItem('role')?.toLowerCase();
    const userUnit = localStorage.getItem('unit');
    const userDivision = localStorage.getItem('division');
    const userAccess = localStorage.getItem('user_access') || '';
    const userDepartments = userAccess ? userAccess.split(',').map(d => d.trim().toLowerCase()) : [];

    return userData.filter(u => {
      // Exclude users already selected for leave if necessary, but usually we just filter by scope
      if (userRole === 'div_admin') {
        return u.unit === userUnit && u.division === userDivision;
      }
      if (userRole === 'admin' && userDepartments.length > 0) {
        const uDept = (u.user_access || u.department || '').split(',')[0].trim().toLowerCase();
        return u.unit === userUnit && u.division === userDivision && userDepartments.includes(uDept);
      }
      return true; // super_admin
    }).map(u => u.user_name).sort();
  }, [userData]);

  // Memoized available doers for popup leave transfer (filtered by leave user's division and department)
  const popupAvailableDoers = useMemo(() => {
    if (!currentLeaveUser || !userData || userData.length === 0) return [];

    const leaveUserDepts = (currentLeaveUser.user_access || currentLeaveUser.department || '')
      .split(',')
      .map(d => d.trim().toLowerCase())
      .filter(Boolean);
    const leaveUserDiv = (currentLeaveUser.division || '').trim().toLowerCase();

    return userData.filter(u => {
      // Don't delegate to the leave user themselves
      if (u.user_name === currentLeaveUser.user_name) return false;

      const uDepts = (u.user_access || u.department || '')
        .split(',')
        .map(d => d.trim().toLowerCase())
        .filter(Boolean);
      const uDiv = (u.division || '').trim().toLowerCase();

      // Check division match
      if (uDiv !== leaveUserDiv) return false;

      // Check department intersection (at least one matching department)
      return uDepts.some(d => leaveUserDepts.includes(d));
    }).map(u => u.user_name).sort();
  }, [currentLeaveUser, userData]);

  const togglePasswordVisibility = (userId) => {
  setShowPasswords(prev => ({
    ...prev,
    [userId]: !prev[userId]
  }));
};


  // Populate user form if it's a regular user
  useEffect(() => {
    if (currentUserRole?.toLowerCase() === 'user' && loginUserData?.user_name && !isEditing) {
      // Find the user data in the list to get all details
      const userFullData = Array.isArray(userData) ? userData.find(u => u.user_name === loginUserData.user_name) : null;
      
      if (!userFullData && loading) return;

      const dataToUse = userFullData || loginUserData;
      
      const deptName = (dataToUse?.user_access || dataToUse?.department)?.split(',')[0]?.trim();
      const deptRecord = department?.find(d => d.department?.toLowerCase() === deptName?.toLowerCase());

      // Set isEditing immediately to prevent subsequent effect runs in this render cycle
      if (dataToUse.id) {
        setIsEditing(true);
        setCurrentUserId(dataToUse.id);
      }

      setUserForm({
        username: dataToUse.user_name || '',
        email: dataToUse.email_id || '',
        password: '', // Don't fetch password for display
        phone: dataToUse.number || '',
        unit: dataToUse?.unit || deptRecord?.unit || '',
        division: dataToUse?.division || deptRecord?.division || '',
        department: dataToUse?.department || dataToUse?.user_access || '',
        role: dataToUse.role || 'user',
        designation: dataToUse.designation || ''
      });
      
      setUnifiedPermissions(buildUnifiedPermissions(dataToUse));
    }
  }, [loginUserData, currentUserRole, userData, department, loading, isEditing]);

  const fetchDeviceLogsAndUpdateStatus = async () => {
    try {
      setIsRefreshing(true);
      
      // Re-fetch data based on active tab
      if (activeTab === 'users') {
        dispatch(resetUserData());
        await dispatch(userDetails({ page: 1, limit: 50, search: usernameFilter, requesterContext: getRequesterContext() })).unwrap();
      } else if (activeTab === 'departments') {
        await dispatch(departmentDetails()).unwrap();
        await dispatch(departmentOnlyDetails()).unwrap();
        await dispatch(givenByDetails()).unwrap();
      } else if (activeTab === 'machines') {
        await dispatch(machineDetails()).unwrap();
      } else if (activeTab === 'leave' || activeTab === 'extendTask') {
        dispatch(resetUserData());
        await dispatch(userDetails({ page: 1, limit: 50, requesterContext: getRequesterContext() })).unwrap();
      }
      
    } catch (error) {
      console.error('Error refreshing data:', error);
    } finally {
      setIsRefreshing(false);
    }
  };


  // Add real-time subscription - DISABLED AS PER USER REQUEST (Manual Refresh only)
  // useEffect(() => {
  //   // Subscribe to users table changes
  //   const subscription = supabase
  //     .channel('users-changes')
  //     .on(
  //       'postgres_changes',
  //       {
  //         event: '*',
  //         schema: 'public',
  //         table: 'users'
  //       },
  //       (payload) => {
  //         // console.log('Real-time update received:', payload);
  //         // Refresh user data when any change occurs
  //         dispatch(userDetails());
  //       }
  //     )
  //     .subscribe();

  //   // Set up interval to check device logs every 30 seconds
  //   const intervalId = setInterval(fetchDeviceLogsAndUpdateStatus, 30000);

  //   // Initial fetch of device logs
  //   fetchDeviceLogsAndUpdateStatus();

  //   return () => {
  //     subscription.unsubscribe();
  //     clearInterval(intervalId);
  //   };
  // }, [dispatch]);

  // Add this function to debug a specific user
const debugUserStatus = async () => {
  try {
    const { data: users, error } = await supabase
      .from('users')
      .select('*')
      .eq('user_name', 'Hem Kumar Jagat');
    
    if (error) {
      console.error('Error fetching user:', error);
      return;
    }
    
    if (users && users.length > 0) {
      const user = users[0];
      // console.log('🔍 DEBUG - Hem Kumar Jagat:', {
      //   id: user.id,
      //   username: user.user_name,
      //   employee_id: user.employee_id,
      //   current_status: user.status,
      //   last_punch_time: user.last_punch_time,
      //   last_punch_device: user.last_punch_device
      // });
    } else {
      console.log('User "Hem Kumar Jagat" not found');
    }
  } catch (error) {
    console.error('Error in debug:', error);
  }
};

// Call this to check the current status
// debugUserStatus();

  // Add manual refresh button handler
  // const handleManualRefresh = () => {
  //   fetchDeviceLogsAndUpdateStatus();
  // };

  // Your existing functions remain the same...
  const handleLeaveUsernameFilter = (username) => {
    setLeaveUsernameFilter(username);
  };

  const clearLeaveUsernameFilter = () => setLeaveUsernameFilter('');
  const clearExtendUsernameFilter = () => setExtendUsernameFilter('');

  const handleUsernameFilterSelect = (username) => {
    setUsernameFilter(username);
    setUsernameDropdownOpen(false);
  };

  const clearUsernameFilter = () => {
    setUsernameFilter('');
    setUsernameDropdownOpen(false);
  };

  const toggleUsernameDropdown = () => {
    setUsernameDropdownOpen(!usernameDropdownOpen);
  };


  const handleAddButtonClick = () => {
    if (activeTab === 'users') {
      resetUserForm();
      setShowUserModal(true);
    } else if (activeTab === 'departments') {
      resetDeptForm();
      setShowDeptModal(true);
    } else if (activeTab === 'machines') {
      resetMachineForm();
      setShowMachineModal(true);
    }
    // No action for leave tab
  };



  const handleUserSelection = (userId, isSelected) => {
    if (isSelected) {
      setSelectedUsers(prev => [...prev, userId]);
    } else {
      setSelectedUsers(prev => prev.filter(id => id !== userId));
    }
  };

  const handleOpenIndividualLeave = (user) => {
    setCurrentLeaveUser(user);
    setShowLeavePopup(true);
    
    // Pre-fill with existing leave data if available, otherwise use defaults
    const today = new Date().toLocaleDateString('en-CA');
    setPopupLeaveStartDate(user.leave_date ? new Date(user.leave_date).toLocaleDateString('en-CA') : today);
    setPopupLeaveEndDate(user.leave_end_date ? new Date(user.leave_end_date).toLocaleDateString('en-CA') : today);
    setPopupRemarks(user.remark || '');
    setPopupDoer(''); 
  };

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedUsers(userData.map(user => user.id));
    } else {
      setSelectedUsers([]);
    }
  };

const handleSubmitLeave = async () => {
  if (selectedUsers.length === 0) {
    alert('Please select at least one user');
    return;
  }

  // Pre-fill dates if exactly one user is selected
  if (selectedUsers.length === 1) {
    const user = userData.find(u => u.id === selectedUsers[0]);
    if (user) {
      const today = new Date().toLocaleDateString('en-CA');
      setLeaveStartDate(user.leave_date ? new Date(user.leave_date).toLocaleDateString('en-CA') : today);
      setLeaveEndDate(user.leave_end_date ? new Date(user.leave_end_date).toLocaleDateString('en-CA') : today);
      setRemark(user.remark || '');
    }
  } else {
    // Reset for bulk selection
    const today = new Date().toLocaleDateString('en-CA');
    setLeaveStartDate(today);
    setLeaveEndDate(today);
    setRemark('');
  }

  // Show delegation modal instead of directly submitting
  setShowDelegationModal(true);
};

// New function to handle actual delegation after doer selection
const handleConfirmDelegation = async () => {
  if (!selectedDoer || !leaveStartDate || !leaveEndDate) {
    alert('Please select a doer and provide both start and end dates');
    return;
  }

  // Validate date range
  const startDate = new Date(leaveStartDate);
  const endDate = new Date(leaveEndDate);
  
  if (startDate > endDate) {
    alert('End date cannot be before start date');
    return;
  }

  // Capture current form values for database update before state might change
  const finalStartDate = leaveStartDate;
  const finalEndDate = leaveEndDate;
  const finalRemark = remark;

  let totalTasksTransferred = 0;

  try {
    // Call API to transfer tasks
    const transferPromises = selectedUsers.map(async (userId) => {
      const user = userData.find(u => u.id === userId);
      if (user && user.user_name) {
        try {
          const response = await authFetch(`${import.meta.env.VITE_API_BASE_URL}/leave/transfer-tasks`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              username: user.user_name,
              delegateTo: selectedDoer,
              startDate: finalStartDate,
              endDate: finalEndDate,
              category: bulkLeaveCategory
            })
          });

          const result = await response.json();
          
          if (!response.ok) {
            console.error('Error transferring tasks:', result.message);
          } else {
            console.log(`Transferred ${result.tasksTransferred} tasks from ${user.user_name} to ${selectedDoer}`);
            totalTasksTransferred += (result.tasksTransferred || 0);
          }
        } catch (error) {
          console.error('Error in task transfer:', error);
        }
      }
    });

    await Promise.all(transferPromises);

    if (totalTasksTransferred === 0) {
      setToast({ show: true, message: "There is no tasks in these dates", type: "info" });
    } else {
      setToast({ show: true, message: `Successfully transferred ${totalTasksTransferred} tasks!`, type: "success" });
    }

    // Update user records with leave dates
    const updatePromises = selectedUsers.map(async (userId) => {
      const user = userData.find(u => u.id === userId);
      if (user) {
        try {
          await dispatch(updateUser({
            id: user.id,
            updatedUser: {
              ...user,
              leave_date: finalStartDate,
              leave_end_date: finalEndDate,
              remark: finalRemark
            }
          })).unwrap();
        } catch (error) {
          console.error(`Error updating leave for user ${user.user_name}:`, error);
        }
      }
    });

    await Promise.all(updatePromises);

    // Close modal and reset form AFTER all updates are done
    setShowDelegationModal(false);
    setSelectedDoer('');
    setSelectedUsers([]);
    setLeaveStartDate('');
    setLeaveEndDate('');
    setRemark('');
    setBulkLeaveCategory('Checklist');

    // Refresh data
    // setTimeout(() => window.location.reload(), 1000);
    alert('Tasks transferred successfully to delegation');
  } catch (error) {
    console.error('Error submitting delegation:', error);
    alert('Error submitting delegation');
  }
};

const handleTriggerOverdueAlerts = async () => {
  if (!window.confirm('Are you sure you want to send WhatsApp reminders to all employees with overdue tasks?')) return;
  
  try {
    setIsSendingAlerts(true);
    const response = await authFetch(`${import.meta.env.VITE_API_BASE_URL}/settings/whatsapp/trigger-overdue`, {
      method: "POST"
    });
    
    const data = await response.json();
    if (response.ok) {
      setToast({ show: true, message: data.message || "Alerts sent successfully!", type: "success" });
    } else {
      setToast({ show: true, message: data.error || "Failed to send alerts", type: "error" });
    }
  } catch (error) {
    console.error('Error triggering alerts:', error);
    setToast({ show: true, message: "Network error occurred", type: "error" });
  } finally {
    setIsSendingAlerts(false);
  }
};

  // Fetch user tasks when dates are selected
  useEffect(() => {
    const fetchUserTasks = async () => {
      if (!currentLeaveUser || !popupLeaveStartDate || !popupLeaveEndDate) {
        setUserTasks([]);
        setTaskAssignments({});
        return;
      }

      // Validate date range
      const startDate = new Date(popupLeaveStartDate);
      const endDate = new Date(popupLeaveEndDate);
      
      if (startDate > endDate) {
        setFetchError('End date cannot be before start date');
        setUserTasks([]);
        return;
      }

      setIsLoadingTasks(true);
      setFetchError('');

      try {
        const response = await authFetch(
          `${import.meta.env.VITE_API_BASE_URL}/leave/user-tasks?username=${encodeURIComponent(currentLeaveUser.user_name)}&startDate=${popupLeaveStartDate}&endDate=${popupLeaveEndDate}&category=${popupLeaveCategory}`
        );

        const result = await response.json();
        
        if (!response.ok) {
          throw new Error(result.message || 'Failed to fetch tasks');
        }

        setUserTasks(result.tasks || []);
        // Initialize task assignments with empty values
        const initialAssignments = {};
        (result.tasks || []).forEach(task => {
          initialAssignments[task.task_id] = '';
        });
        setTaskAssignments(initialAssignments);
      } catch (error) {
        console.error('Error fetching tasks:', error);
        setFetchError(error.message);
        setUserTasks([]);
      } finally {
        setIsLoadingTasks(false);
      }
    };

    fetchUserTasks();
  }, [currentLeaveUser, popupLeaveStartDate, popupLeaveEndDate, popupLeaveCategory]);

  // Handler for individual task assignment
  const handleTaskAssignment = (taskId, assignedUser) => {
    setTaskAssignments(prev => ({
      ...prev,
      [taskId]: assignedUser
    }));
  };

  // Handler for bulk assignment within the individual popup
  const handleBulkPopupAssignment = (doerName) => {
    setBulkPopupDoer(doerName);
    if (doerName) {
      setTaskAssignments(prev => {
        const newAssignments = { ...prev };
        userTasks.forEach(task => {
          newAssignments[task.task_id] = doerName;
        });
        return newAssignments;
      });
    }
  };

  // Handler for Leave Transfer Popup submission
  const handleLeaveTransferSubmit = async () => {
    if (!popupLeaveStartDate || !popupLeaveEndDate) {
      alert('Please fill in all required fields');
      return;
    }

    // Validate date range
    const startDate = new Date(popupLeaveStartDate);
    const endDate = new Date(popupLeaveEndDate);
    
    if (startDate > endDate) {
      alert('End date cannot be before start date');
      return;
    }

    // If there are tasks to assign individually
    if (userTasks.length > 0) {
      // Validate all tasks have assigned users
      const unassignedTasks = userTasks.filter(task => !taskAssignments[task.task_id]);
      
      // If there are unassigned tasks, ask for confirmation
      if (unassignedTasks.length > 0) {
        const confirmDelete = window.confirm(`${unassignedTasks.length} tasks are unassigned and will be PERMANENTLY DELETED from the checklist. Are you sure you want to continue?`);
        if (!confirmDelete) {
          return;
        }
      }

      // Build assignments array
      const assignments = userTasks.map(task => ({
        task_id: task.task_id,
        username: task.name,
        delegateTo: taskAssignments[task.task_id],
        task_description: task.task_description,
        department: task.department,
        division: task.division,
        unit: task.unit,
        given_by: task.given_by,
        frequency: task.frequency,
        task_start_date: task.task_start_date,
        planned_date: task.planned_date
      }));

      // Capture current form values for database update
      const finalStartDate = popupLeaveStartDate;
      const finalEndDate = popupLeaveEndDate;
      const finalRemarks = popupRemarks;
      const finalUser = currentLeaveUser;

      try {
        const response = await authFetch(`${import.meta.env.VITE_API_BASE_URL}/leave/assign-individual-tasks`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ assignments, category: popupLeaveCategory })
        });

        const result = await response.json();
        
        if (!response.ok) {
          throw new Error(result.message || 'Failed to assign tasks');
        }

        // Update user record with leave dates using CAPTURED values
        if (finalUser) {
          try {
            await dispatch(updateUser({
              id: finalUser.id,
              updatedUser: {
                ...finalUser,
                leave_date: finalStartDate,
                leave_end_date: finalEndDate,
                remark: finalRemarks
              }
            })).unwrap();
          } catch (error) {
            console.error(`Error updating leave for user ${finalUser.user_name}:`, error);
          }
        }

        // Close popup and reset form ONLY after database update is handled
        setShowLeavePopup(false);
        setCurrentLeaveUser(null);
        setPopupLeaveStartDate('');
        setPopupLeaveEndDate('');
        setPopupDoer('');
        setPopupRemarks('');
        setPopupLeaveCategory('Checklist');
        setUserTasks([]);
        setTaskAssignments({});
        setSelectedUsers([]);

        // toast message handled below
        
        if ((result.tasksTransferred || 0) === 0) {
          setToast({ show: true, message: "There is no tasks in these dates", type: "info" });
        } else {
          setToast({ show: true, message: `Successfully transferred ${result.tasksTransferred} tasks!`, type: "success" });
        }
        
        // Refresh data
        // setTimeout(() => window.location.reload(), 1000);
      } catch (error) {
        console.error('Error assigning tasks:', error);
        alert(`Error: ${error.message}`);
      }
    } else {
      alert('No tasks found in the selected date range');
    }
  };

  // EXTEND TASK HANDLERS
  
  const handleExtendUserSelection = (userId, isSelected) => {
    if (isSelected) {
      // Open popup form when checkbox is checked
      const user = userData.find(u => u.id === userId);
      setCurrentExtendUser(user);
      setShowExtendTaskPopup(true);
      // Set today's date as default
      const today = new Date().toLocaleDateString('en-CA');
      setExtendStartDate(today);
      setExtendEndDate(today);
    } else {
      // Close popup and clear selection when unchecked
      setShowExtendTaskPopup(false);
      setCurrentExtendUser(null);
      setExtendStartDate('');
      setExtendEndDate('');
      setExtendUserTasks([]);
      setNewStartDates({});
      setSelectedUsers(prev => prev.filter(id => id !== userId));
    }
  };

  // Fetch tasks for Extend Task Popup
  useEffect(() => {
    const fetchExtendTasks = async () => {
      if (!currentExtendUser || !extendStartDate || !extendEndDate) {
        setExtendUserTasks([]);
        return;
      }

      // Validate date range
      const startDate = new Date(extendStartDate);
      const endDate = new Date(extendEndDate);
      
      if (startDate > endDate) {
        // Just return, don't show error yet or show in UI
        setExtendUserTasks([]);
        return;
      }

      setExtendLoading(true);

      try {
        const response = await authFetch(
          `${import.meta.env.VITE_API_BASE_URL}/leave/user-tasks?username=${encodeURIComponent(currentExtendUser.user_name)}&startDate=${extendStartDate}&endDate=${extendEndDate}`
        );

        const result = await response.json();
        
        if (!response.ok) {
          throw new Error(result.message || 'Failed to fetch tasks');
        }

        setExtendUserTasks(result.tasks || []);
      } catch (error) {
        console.error('Error fetching tasks for extend:', error);
        setExtendUserTasks([]);
      } finally {
        setExtendLoading(false);
      }
    };

    fetchExtendTasks();
  }, [currentExtendUser, extendStartDate, extendEndDate]);

  const handleUpdateTaskDate = async (taskId) => {
    const newDate = newStartDates[taskId];
    if (!newDate) {
      alert('Please select a new start date');
      return;
    }

    try {
      // Use the direct import extendTaskApi since it might not be in the slice
      // Importing manually at top of file or use fetch directly if needed
      // Assuming extendTaskApi calls the backend endpoint we created
      const result = await extendTaskApi(taskId, newDate);
      
      if (result && result.success) {
        alert('Task extended successfully!');
        // Refresh the list
        const updatedTasks = extendUserTasks.map(task => 
          task.task_id === taskId 
            ? { ...task, task_start_date: newDate, planned_date: newDate } // Update local state to reflect change
            : task
        );
        setExtendUserTasks(updatedTasks);
        // Clear the input
        setNewStartDates(prev => {
          const newState = { ...prev };
          delete newState[taskId];
          return newState;
        });
      } else {
        alert('Failed to extend task: ' + (result?.message || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error updating task date:', error);
      alert('Error updating task date');
    }
  };

  // Add to your existing handleTabChange function
  // Handle tab change
  const handleTabChange = (tab) => {
    setActiveTab(tab);
    if (tab === 'users') {
      if (userData.length === 0) dispatch(userDetails({ page: 1, limit: 50, requesterContext: getRequesterContext() }));
    } else if (tab === 'departments') {
      if (department.length === 0) dispatch(departmentDetails());
    } else if (tab === 'leave') {
      if (userData.length === 0) dispatch(userDetails({ page: 1, limit: 50, requesterContext: getRequesterContext() }));
      dispatch(uniqueDoerNameData());
    } else if (tab === 'extendTask') {
      if (userData.length === 0) dispatch(userDetails({ page: 1, limit: 50, requesterContext: getRequesterContext() }));
    } else if (tab === 'machines') {
      if (machines.length === 0) dispatch(machineDetails());
    }
  };

  // Add to your handleAddButtonClick function

  // Handle Add Given By submission
  // Modified handleAddGivenBy to support both Add and Update
  const handleAddGivenBy = async (e) => {
    e.preventDefault();
    if (!givenByInput.trim()) {
      alert('Please enter a Given By value');
      return;
    }
    try {
      if (isEditingGivenBy) {
        // Update existing Given By
        const updatedDept = {
          ...givenByDeptData,
          given_by: givenByInput.trim()
        };
        await dispatch(updateDepartment({ id: currentGivenById, updatedDept })).unwrap();
      } else {
        // Create new Given By
        const newEntry = { given_by: givenByInput.trim() };
        await dispatch(createDepartment(newEntry)).unwrap();
      }
      
      setGivenByInput('');
      setIsEditingGivenBy(false);
      setCurrentGivenById(null);
      setShowGivenByModal(false);
      dispatch(departmentDetails());
    } catch (error) {
      console.error('Error saving given by:', error);
    }
  };

  const handleEditGivenBy = (deptId) => {
    const dept = department.find(d => d.id === deptId);
    if (dept) {
      setGivenByInput(dept.given_by || '');
      setGivenByDeptData({
        department: dept.department || '',
        unit: dept.unit || '',
        division: dept.division || ''
      });
      setCurrentGivenById(deptId);
      setIsEditingGivenBy(true);
      setShowGivenByModal(true);
    }
  };





  // Sample data
  // const [users, setUsers] = useState([
  //   {
  //     id: '1',
  //     username: 'john_doe',
  //     email: 'john@example.com',
  //     password: '********',
  //     department: 'IT',
  //     givenBy: 'admin',
  //     phone: '1234567890',
  //     role: 'user',
  //     status: 'active'
  //   },
  //   {
  //     id: '2',
  //     username: 'jane_smith',
  //     email: 'jane@example.com',
  //     password: '********',
  //     department: 'HR',
  //     givenBy: 'admin',
  //     phone: '0987654321',
  //     role: 'admin',
  //     status: 'active'
  //   }
  // ]);

  // const [departments, setDepartments] = useState([
  //   { id: '1', name: 'IT', givenBy: 'super_admin' },
  //   { id: '2', name: 'HR', givenBy: 'super_admin' },
  //   { id: '3', name: 'Finance', givenBy: 'admin' }
  // ]);

  // Form states
const [userForm, setUserForm] = useState({
  username: '',
  email: '',
  password: '',
  phone: '',
  designation: '',
  unit: '',
  division: '',
  department: '',
  givenBy: '',
  role: 'user',
  status: 'active'
});

  const [deptForm, setDeptForm] = useState({
    department: '',
    given_by: '',
    unit: '',
    division: ''
  });

  // Multi-row department form state for Create New Department
  const [deptRows, setDeptRows] = useState([
    { unit: '', division: '', department: '' }
  ]);

  // Initial and debounced search fetch
  useEffect(() => {
    const handler = setTimeout(() => {
      if (activeTab === 'users') {
        dispatch(userDetails({ page: 1, limit: 50, search: usernameFilter, requesterContext: getRequesterContext() }));
      } else if (activeTab === 'leave') {
        dispatch(leaveUserDetails({ page: 1, limit: 50, search: leaveUsernameFilter, requesterContext: getRequesterContext() }));
      } else if (activeTab === 'extendTask') {
        dispatch(extendUserDetails({ page: 1, limit: 50, search: extendUsernameFilter, requesterContext: getRequesterContext() }));
      }
    }, 500);
    return () => clearTimeout(handler);
  }, [usernameFilter, leaveUsernameFilter, extendUsernameFilter, dispatch, activeTab, getRequesterContext]);

  // Initial data fetch for dropdowns
  useEffect(() => {
    if (department.length === 0) dispatch(departmentDetails());
    if (departmentsOnly.length === 0) dispatch(departmentOnlyDetails());
    if (givenBy.length === 0) dispatch(givenByDetails());
    if (machines.length === 0) dispatch(machineDetails());
  }, [dispatch]);

  const handleScroll = (e) => {
    const { scrollTop, scrollHeight, clientHeight } = e.target;
    // Load more if scrolled to 90%
    if (scrollTop + clientHeight >= scrollHeight * 0.9) {
      if (activeTab === 'users' && !pagination.loadingMore && pagination.hasMore) {
        dispatch(userDetails({ page: pagination.currentPage + 1, search: pagination.searchQuery, requesterContext: getRequesterContext() }));
      } else if (activeTab === 'leave' && !leavePagination.loadingMore && leavePagination.hasMore) {
        dispatch(leaveUserDetails({ page: leavePagination.currentPage + 1, search: leavePagination.searchQuery, requesterContext: getRequesterContext() }));
      } else if (activeTab === 'extendTask' && !extendPagination.loadingMore && extendPagination.hasMore) {
        dispatch(extendUserDetails({ page: extendPagination.currentPage + 1, search: extendPagination.searchQuery, requesterContext: getRequesterContext() }));
      }
    }
  };

  // In your handleAddUser function:
  // Modified handleAddUser
const handleAddUser = async (e) => {
  e.preventDefault();
  const isSuperAdminRole = userForm.role === 'super_admin';
  const { system_access, page_access, subscription_access_system } = splitUnifiedPermissions(unifiedPermissions);

  const newUser = {
    ...userForm,
    user_access: isSuperAdminRole ? userForm.department : (Object.keys(unifiedPermissions).length > 0 ? userForm.department : null),
    department: userForm.department,
    unit: userForm.unit,
    division: userForm.division,
    system_access: isSuperAdminRole ? ["*"] : system_access,
    page_access: isSuperAdminRole ? ["*"] : page_access,
    subscription_access_system: isSuperAdminRole ? { systems: ["*"], pages: ["*"] } : subscription_access_system
  };

  try {
    await dispatch(createUser(newUser)).unwrap();
    resetUserForm();
    setShowUserModal(false);
    // setTimeout(() => window.location.reload(), 1000);
  } catch (error) {
    console.error('Error adding user:', error);
  }
};

  // Modified handleUpdateUser
const handleUpdateUser = async (e) => {
  e.preventDefault();
  
  const isSuperAdminRole = userForm.role === 'super_admin';
  // Prepare updated user data
  const { system_access, page_access, subscription_access_system } = splitUnifiedPermissions(unifiedPermissions);

  const updatedUser = {
    user_name: userForm.username,
    email_id: userForm.email,
    number: userForm.phone,
    designation: userForm.designation,
    role: userForm.role,
    status: userForm.status,
    user_access: isSuperAdminRole ? userForm.department : (Object.keys(unifiedPermissions).length > 0 ? userForm.department : null),
    department: userForm.department,
    unit: userForm.unit,
    division: userForm.division,
    system_access: isSuperAdminRole ? ["*"] : system_access,
    page_access: isSuperAdminRole ? ["*"] : page_access,
    subscription_access_system: isSuperAdminRole ? { systems: ["*"], pages: ["*"] } : subscription_access_system,
    requesterRole: currentUserRole // Pass requester role for backend check
  };




  // Only include password if it's not empty
  if (userForm.password.trim() !== '') {
    updatedUser.password = userForm.password;
  }

  try {
    const userId = currentUserId || loggedInUserId || localStorage.getItem('user_id');
    if (!userId) {
      setToast({ show: true, message: 'Unable to identify user. Please log out and log back in.', type: 'error' });
      return;
    }
    const result = await dispatch(updateUser({ id: userId, updatedUser })).unwrap();
    
    // If the updated user is the currently logged-in user, refresh localStorage
    const currentLoggedInUsername = localStorage.getItem('user-name');
    if (result && result.user_name === currentLoggedInUsername) {
      console.log('🔄 Updating local permissions for current user');
      localStorage.setItem('role', (result.role || "").toLowerCase());
      localStorage.setItem('user_access', result.user_access || "");
      localStorage.setItem('system_access', JSON.stringify(result.system_access || []));
      localStorage.setItem('page_access', JSON.stringify(result.page_access || []));
      localStorage.setItem('user-name', result.user_name || "");
      localStorage.setItem('email_id', result.email_id || "");
      localStorage.setItem('unit', result.unit || "");
      localStorage.setItem('division', result.division || "");
      localStorage.setItem('department', result.department || "");
      
      // Update Redux state for login user data so the UI doesn't revert
      dispatch(updateLoginUserData(result));
      setToast({ show: true, message: 'Profile updated successfully!', type: 'success' });
    } else {
      setToast({ show: true, message: 'User updated successfully!', type: 'success' });
    }

    // Force re-fetch user details to ensure paginated lists are up to date
    dispatch(userDetails({ page: 1, limit: 50, requesterContext: getRequesterContext() }));

    resetUserForm();
    setShowUserModal(false);
    // setTimeout(() => window.location.reload(), 1000);
  } catch (error) {
    console.error('Error updating user:', error);
  }
};

  // Modified handleAddDepartment - now handles multiple rows
  const handleAddDepartment = async (e) => {
    e.preventDefault();
    
    // Filter out empty rows (all 3 fields empty)
    const validRows = deptRows.filter(row => 
      row.unit.trim() !== '' || row.division.trim() !== '' || row.department.trim() !== ''
    );

    if (validRows.length === 0) {
      alert('Please fill in at least one row');
      return;
    }

    try {
      // Submit each row as a separate department entry
      for (const row of validRows) {
        const newDept = {
          department: row.department,
          unit: row.unit,
          division: row.division,
          given_by: '' 
        };
        await dispatch(createDepartment(newDept)).unwrap();
      }
      resetDeptForm();
      setShowDeptModal(false);
      // setTimeout(() => window.location.reload(), 1000);
    } catch (error) {
      console.error('Error adding department:', error);
    }
  };

  // Modified handleUpdateDepartment
  const handleUpdateDepartment = async (e) => {
    e.preventDefault();
    const updatedDept = {
      department: deptForm.department,
      given_by: deptForm.given_by,
      unit: deptForm.unit,
      division: deptForm.division
    };

    try {
      await dispatch(updateDepartment({ id: currentDeptId, updatedDept })).unwrap();
      dispatch(departmentDetails());
      resetDeptForm();
      setShowDeptModal(false);
      // setTimeout(() => window.location.reload(), 1000);
    } catch (error) {
      console.error('Error updating department:', error);
    }
  };

  // Modified handleDeleteUser
  const handleDeleteUser = async (userId) => {
    if (!window.confirm("Do you want to delete this user?")) {
      return;
    }
    
    try {
      await dispatch(deleteUser(userId)).unwrap();
      // setTimeout(() => window.location.reload(), 1000);
    } catch (error) {
      console.error('Error deleting user:', error);
    }
  };


  // User form handlers
const handleUserInputChange = (e) => {
  const { name, value } = e.target;
  setUserForm(prev => ({ ...prev, [name]: value }));
};

// Cascading dropdown handlers for Unit → Division → Department
const handleUnitChange = (value) => {
  setUserForm(prev => ({ ...prev, unit: value, division: '', department: '' }));
};

const handleDivisionChange = (value) => {
  setUserForm(prev => ({ ...prev, division: value, department: '' }));
};

const handleDepartmentChange = (value) => {
  setUserForm(prev => ({ ...prev, department: value }));
};

// Get unique units from department data
const availableUnits = React.useMemo(() => {
  if (department && department.length > 0) {
    return [...new Set(department.map(dept => dept.unit).filter(u => u && u.trim() !== ''))].sort();
  }
  return [];
}, [department]);


// Get divisions filtered by selected unit
const availableDivisions = React.useMemo(() => {
  if (department && department.length > 0 && userForm.unit) {
    return [...new Set(
      department
        .filter(dept => dept.unit === userForm.unit)
        .map(dept => dept.division)
        .filter(d => d && d.trim() !== '')
    )].sort();
  }
  return [];
}, [department, userForm.unit]);

// Get departments filtered by selected unit and division
const availableDepartments = React.useMemo(() => {
  if (department && department.length > 0) {
    let filtered = department;
    if (userForm.unit) {
      filtered = filtered.filter(dept => dept.unit === userForm.unit);
    }
    if (userForm.division) {
      filtered = filtered.filter(dept => dept.division === userForm.division);
    }
    return [...new Set(filtered.map(dept => dept.department).filter(d => d && d.trim() !== ''))].sort();
  }
  return [];
}, [department, userForm.unit, userForm.division]);

useEffect(() => {
  const handleClickOutside = (event) => {
    if (showDeptDropdown && !event.target.closest('.relative')) {
      setShowDeptDropdown(false);
    }
  };

  document.addEventListener('mousedown', handleClickOutside);
  return () => {
    document.removeEventListener('mousedown', handleClickOutside);
  };
}, [showDeptDropdown]);

  // const handleAddUser = (e) => {
  //   e.preventDefault();
  //   const newUser = {
  //     ...userForm,
  //     id: (users.length + 1).toString(),
  //     password: '********'
  //   };
  //   setUsers([...users, newUser]);
  //   resetUserForm();
  //   setShowUserModal(false);
  // };
const handleEditUser = (userId) => {
  const user = userData.find(u => u.id === userId);
  if (!user) return;

  // Ensure department data is available for the fallback logic
  if (!department || department.length === 0) {
    dispatch(departmentDetails());
  }

  const deptName = (user?.user_access || user?.department)?.split(',')[0]?.trim();
  const deptRecord = department?.find(d => d.department?.toLowerCase() === deptName?.toLowerCase());
  
  setUserForm({
    username: user.user_name || '',
    email: user.email_id || '',
    password: user.password || '',
    phone: user.number || '',
    designation: user.designation || '',
    unit: user?.unit || deptRecord?.unit || '',
    division: user?.division || deptRecord?.division || '',
    department: user?.department || user?.user_access || '',
    role: user.role || 'user',
    status: user.status || 'active'
  });
  
  // Load unified permissions
  const unified = buildUnifiedPermissions(user);
  setUnifiedPermissions(unified);

  setCurrentUserId(userId);
  setIsEditing(true);
  setShowUserModal(true);
};

  const handleEditDepartment = (deptId) => {
    const dept = department.find(d => d.id === deptId);
    setDeptForm({
      department: dept.department,  // Match your API response field names
      given_by: dept.given_by,
      unit: dept.unit || '',
      division: dept.division || ''
    });
    setCurrentDeptId(deptId);
    setShowDeptModal(true);
  };
  // const handleUpdateUser = (e) => {
  //   e.preventDefault();
  //   setUsers(users.map(user => 
  //     user.id === currentUserId ? { ...userForm, id: currentUserId } : user
  //   ));
  //   resetUserForm();
  //   setShowUserModal(false);
  // };



const resetUserForm = () => {
  setUserForm({
    username: '',
    email: '',
    password: '',
    phone: '',
    designation: '',
    unit: '',
    division: '',
    department: '',
    givenBy: '',
    role: 'user',
    status: 'active'
  });
  setUnifiedPermissions({});
  setIsEditing(false);

  setCurrentUserId(null);
};

  // Department form handlers
  const handleDeptInputChange = (e) => {
    const { name, value } = e.target;
    setDeptForm(prev => ({ ...prev, [name]: value }));
  };

  // Multi-row department form handlers
  const handleDeptRowChange = (index, field, value) => {
    setDeptRows(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const addDeptRow = () => {
    setDeptRows(prev => [...prev, { unit: '', division: '', department: '' }]);
  };

  const removeDeptRow = (index) => {
    if (deptRows.length === 1) return; // Keep at least one row
    setDeptRows(prev => prev.filter((_, i) => i !== index));
  };

  // const handleAddDepartment = (e) => {
  //   e.preventDefault();
  //   const newDept = {
  //     ...deptForm,
  //     id: (departments.length + 1).toString()
  //   };
  //   setDepartments([...departments, newDept]);
  //   resetDeptForm();
  //   setShowDeptModal(false);
  // };


  //   const handleUpdateDepartment = (e) => {
  //     e.preventDefault();
  //     setDepartments(departments.map(dept => 
  //       dept.id === currentDeptId ? { ...deptForm, id: currentDeptId } : dept
  //     ));
  //     resetDeptForm();
  //     setShowDeptModal(false);
  //   };


  // const handleDeleteDepartment = (deptId) => {
  //   setDepartments(department.filter(dept => dept.id !== deptId));
  // };

  const resetDeptForm = () => {
    setDeptForm({
      name: '',
      givenBy: '',
      unit: '',
      division: ''
    });
    setDeptRows([{ unit: '', division: '', department: '' }]);
    setCurrentDeptId(null);
    setGivenByInput('');
    setIsEditingGivenBy(false);
    setCurrentGivenById(null);
  };

  // Machine form handlers
  const handleMachineInputChange = (e) => {
    const { name, value } = e.target;
    setMachineForm(prev => ({ ...prev, [name]: value }));
  };



  const handleAddMachine = async (e) => {
    e.preventDefault();
    try {
      let finalPartNames = [...machineForm.part_name];
      let finalPartImages = [...(machineForm.part_images || [])];
      
      if (partInput.trim() && !finalPartNames.includes(partInput.trim())) {
        finalPartNames.push(partInput.trim());
        finalPartImages.push(null); // Ensure arrays stay in sync
      }
      
      const submitData = {
        ...machineForm,
        part_name: finalPartNames,
        part_images: finalPartImages
      };

      await dispatch(createMachineThunk(submitData)).unwrap();
      resetMachineForm();
      setShowMachineModal(false);
      dispatch(machineDetails());
    } catch (error) {
      console.error('Error adding machine:', error);
    }
  };

  const handleEditMachine = (machineId) => {
    const machine = machines.find(m => m.id === machineId);
    if (machine) {
      const partNames = Array.isArray(machine.part_name) ? machine.part_name : (machine.part_name ? [machine.part_name] : []);
      const partImages = Array.isArray(machine.part_images) ? machine.part_images : (machine.part_images ? [machine.part_images] : []);
      
      // Synchronize arrays if they are different lengths
      const maxLen = Math.max(partNames.length, partImages.length);
      const synchronizedNames = [...partNames];
      const synchronizedImages = [...partImages];
      
      while (synchronizedNames.length < maxLen) synchronizedNames.push('');
      while (synchronizedImages.length < maxLen) synchronizedImages.push(null);

      setMachineForm({
        machine_name: machine.machine_name || '',
        part_name: synchronizedNames,
        part_images: synchronizedImages,
        machine_area: machine.machine_area || '',
        machine_department: machine.machine_department || '',
        machine_division: machine.machine_division || ''
      });

      setCurrentMachineId(machineId);
      setIsEditingMachine(true);
      setShowMachineModal(true);
    }
  };

  const handleUpdateMachine = async (e) => {
    e.preventDefault();
    try {
      let finalPartNames = [...machineForm.part_name];
      let finalPartImages = [...(machineForm.part_images || [])];

      if (partInput.trim() && !finalPartNames.includes(partInput.trim())) {
        finalPartNames.push(partInput.trim());
        finalPartImages.push(null);
      }
      
      const submitData = {
        ...machineForm,
        part_name: finalPartNames,
        part_images: finalPartImages
      };

      await dispatch(updateMachineThunk({ id: currentMachineId, updatedMachine: submitData })).unwrap();
      resetMachineForm();
      setShowMachineModal(false);
      dispatch(machineDetails());
    } catch (error) {
      console.error('Error updating machine:', error);
    }
  };

  const handlePartImageUpload = async (index, file) => {
    if (!file) return;

    const formData = new FormData();
    formData.append('image', file);

    try {
      const response = await authFetch(`${import.meta.env.VITE_API_BASE_URL}/settings/upload-part-image`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Upload failed');
      }

      const data = await response.json();
      const imageUrl = data.imageUrl;

      setMachineForm(prev => {
        const newImages = [...prev.part_images];
        // Ensure array is large enough
        while (newImages.length <= index) newImages.push(null);
        newImages[index] = imageUrl;
        return { ...prev, part_images: newImages };
      });
    } catch (error) {
      console.error('Error uploading part image:', error);
      alert('Failed to upload image. Please try again.');
    }
  };

  const handleDirectPartImageUpload = async (file) => {
    if (!file) return;

    // Use filename as part name (strip extension)
    const partName = file.name.replace(/\.[^/.]+$/, "");
    
    const formData = new FormData();
    formData.append('image', file);

    try {
      const response = await authFetch(`${import.meta.env.VITE_API_BASE_URL}/settings/upload-part-image`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Upload failed');
      }

      const data = await response.json();
      const imageUrl = data.imageUrl;

      setMachineForm(prev => ({
        ...prev,
        part_name: [...prev.part_name, partName],
        part_images: [...(prev.part_images || []), imageUrl]
      }));
    } catch (error) {
      console.error('Error in direct part image upload:', error);
      alert('Failed to upload image. Please try again.');
    }
  };

  const handleDeleteMachine = async (machineId) => {
    if (!window.confirm('Are you sure you want to delete this machine?')) return;
    try {
      await dispatch(deleteMachineThunk(machineId)).unwrap();
      dispatch(machineDetails());
    } catch (error) {
      console.error('Error deleting machine:', error);
    }
  };

  const resetMachineForm = () => {
    setMachineForm({
      machine_name: '',
      part_name: [],
      part_images: [],
      machine_area: '',
      machine_department: '',
      machine_division: ''
    });
    setPartInput('');
    setIsEditingMachine(false);
    setCurrentMachineId(null);
    setShowMachineModal(false);
  };

  // Add this filtered users calculation for leave tab
  const filteredLeaveUsers = leaveUsers?.filter(user => {
    const matchesSearch = !leaveUsernameFilter || user.user_name.toLowerCase().includes(leaveUsernameFilter.toLowerCase());
    
    // Admin department filtering
    const userRole = localStorage.getItem('role')?.toLowerCase();
    const userUnit = localStorage.getItem('unit');
    const userDivision = localStorage.getItem('division');
    const userAccess = localStorage.getItem('user_access') || '';
    const userDepartments = userAccess ? userAccess.split(',').map(d => d.trim().toLowerCase()) : [];
    
    if (userRole === 'div_admin') {
      const isSameDivision = user.unit === userUnit && user.division === userDivision;
      return matchesSearch && isSameDivision;
    }
    
    if (userRole === 'admin' && userDepartments.length > 0) {
      const uDept = (user.user_access || user.department || '').split(',')[0].trim().toLowerCase();
      const isSameDeptScope = user.unit === userUnit && user.division === userDivision && userDepartments.includes(uDept);
      return matchesSearch && isSameDeptScope;
    }
    
    return matchesSearch;
  });


  const getStatusColor = (status) => {
    return status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800';
  };

  const getRoleColor = (role) => {
    switch (role?.toLowerCase()) {
      case 'super_admin': return 'bg-red-100 text-red-800';
      case 'div_admin': return 'bg-indigo-100 text-indigo-800';
      case 'admin': return 'bg-blue-100 text-blue-800';
      case 'manager': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };
  
  return (
    <AdminLayout>
      <div className="space-y-2">
        {/* Header Section */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-2">
          {/* Top Row: Title and Action Buttons */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-2">
            <div>
              {currentUserRole?.toLowerCase() === 'user' ? (
                <h1 className="text-xl font-bold text-purple-700">
                  {activeTab === 'machines' ? 'Machine Management' : 'My Profile'}
                </h1>
              ) : (
                <>
                  <h1 className="text-lg font-bold text-gray-800">Global Settings Hub</h1>
                  <p className="text-xs text-gray-500">Manage users, permissions, and system configurations across all modules</p>
                </>
              )}
            </div>
            
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={fetchDeviceLogsAndUpdateStatus}
                disabled={isRefreshing}
                className="flex items-center gap-2 px-3 py-2 text-sm rounded-md bg-green-600 text-white hover:bg-green-700 disabled:opacity-50"
              >
                <RefreshCw size={16} className={isRefreshing ? 'animate-spin' : ''} />
                <span className="hidden sm:inline">{isRefreshing ? 'Refreshing...' : 'Refresh'}</span>
              </button>
              
              {(activeTab === 'users' || activeTab === 'departments' || activeTab === 'machines') && 
              (activeTab === 'users' ? currentUserRole?.toLowerCase() === 'super_admin' : (canManageSettings && canModifySettings)) && (
                <>
                  <button
                    onClick={handleAddButtonClick}
                    className="flex items-center gap-2 px-3 py-2 text-sm rounded-md bg-purple-600 text-white hover:bg-purple-700"
                  >
                    <Plus size={16} />
                    <span>{activeTab === 'users' ? 'Add User' : activeTab === 'machines' ? 'Add Machine' : 'Add Department'}</span>
                  </button>
                  {activeTab === 'departments' && (
                    <button
                      onClick={() => { setGivenByInput(''); setShowGivenByModal(true); }}
                      className="flex items-center gap-2 px-3 py-2 text-sm rounded-md bg-purple-600 text-white hover:bg-indigo-700"
                    >
                      <Plus size={16} />
                      <span>Add Given By</span>
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
          
          {/* Bottom Row: Tabs */}
          {(currentUserRole?.toLowerCase() !== 'user' || canManageSettings) && (
            <div className="w-full max-w-full flex border-b border-gray-200 overflow-x-auto flex-nowrap scrollbar-hide custom-scrollbar-horizontal">
              <button
                className={`flex flex-col items-center gap-1 px-2 sm:px-4 py-3 text-xs font-semibold border-b-2 transition-all flex-1 sm:flex-none min-w-[80px] sm:min-w-[100px] whitespace-nowrap ${
                  activeTab === 'users' 
                    ? 'border-purple-600 text-purple-600 bg-purple-50' 
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                }`}
                onClick={() => {
                  handleTabChange('users');
                  dispatch(userDetails({ page: 1, limit: 50, requesterContext: getRequesterContext() }));
                }}
              >
                <User size={20} />
                <span>{currentUserRole?.toLowerCase() === 'user' ? 'My Profile' : 'Users'}</span>
              </button>

              {canManageSettings && (
                <button
                  className={`flex flex-col items-center gap-1 px-2 sm:px-4 py-3 text-xs font-semibold border-b-2 transition-all flex-1 sm:flex-none min-w-[80px] sm:min-w-[100px] whitespace-nowrap ${
                    activeTab === 'machines' 
                      ? 'border-purple-600 text-purple-600 bg-purple-50' 
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                  }`}
                  onClick={() => {
                    handleTabChange('machines');
                  }}
                >
                  <Settings size={20} />
                  <span>Machines</span>
                </button>
              )}

              {currentUserRole?.toLowerCase() !== 'user' && (
                <>
                  <button
                    className={`flex flex-col items-center gap-1 px-2 sm:px-4 py-3 text-xs font-semibold border-b-2 transition-all flex-1 sm:flex-none min-w-[80px] sm:min-w-[100px] whitespace-nowrap ${
                      activeTab === 'departments' 
                        ? 'border-purple-600 text-purple-600 bg-purple-50' 
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                    }`}
                    onClick={() => {
                      handleTabChange('departments');
                      dispatch(departmentOnlyDetails());
                      dispatch(givenByDetails());
                    }}
                  >
                    <Building size={20} />
                    <span>Departments</span>
                  </button>
                  <button
                    className={`flex flex-col items-center gap-1 px-2 sm:px-4 py-3 text-xs font-semibold border-b-2 transition-all flex-1 sm:flex-none min-w-[80px] sm:min-w-[100px] whitespace-nowrap ${
                      activeTab === 'leave' 
                        ? 'border-purple-600 text-purple-600 bg-purple-50' 
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                    }`}
                    onClick={() => {
                      handleTabChange('leave');
                      dispatch(leaveUserDetails());
                    }}
                  >
                    <Calendar size={20} />
                    <span>Leave</span>
                  </button>
                  <button
                    className={`flex flex-col items-center gap-1 px-2 sm:px-4 py-3 text-xs font-semibold border-b-2 transition-all flex-1 sm:flex-none min-w-[80px] sm:min-w-[100px] whitespace-nowrap ${
                      activeTab === 'extendTask' 
                        ? 'border-purple-600 text-purple-600 bg-purple-50' 
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                    }`}
                    onClick={() => {
                      handleTabChange('extendTask');
                      dispatch(extendUserDetails());
                    }}
                  >
                    <Calendar size={20} />
                    <span>Extend Task</span>
                  </button>
                  {currentUserRole?.toLowerCase() === 'super_admin' && (
                    <button
                      className={`flex flex-col items-center gap-1 px-2 sm:px-4 py-3 text-xs font-semibold border-b-2 transition-all flex-1 sm:flex-none min-w-[80px] sm:min-w-[100px] whitespace-nowrap ${
                        activeTab === 'whatsapp' 
                          ? 'border-purple-600 text-purple-600 bg-purple-50' 
                          : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                      }`}
                      onClick={() => setActiveTab('whatsapp')}
                    >
                      <MessageSquare size={20} />
                      <span>WhatsApp</span>
                    </button>
                  )}
                </>
              )}
            </div>
          )}
        </div>
{/* <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-md">
        <h3 className="text-sm font-medium text-yellow-800">Debug Info</h3>
        <p className="text-xs text-yellow-700">
          Total Users: {userData?.length || 0} | 
          Active: {userData?.filter(u => u.status === 'active').length || 0} | 
          Inactive: {userData?.filter(u => u.status === 'inactive').length || 0}
        </p>
        <p className="text-xs text-yellow-700">
          Employee IDs in DB: {userData?.map(u => u.employee_id).filter(Boolean).join(', ') || 'None'}
        </p>
      </div> */}
        

        {/* Leave Management Tab */}
        {activeTab === 'leave' && (
          <div className="bg-white shadow rounded-lg overflow-hidden border border-purple-200">
            <div className="bg-gradient-to-r from-purple-50 to-pink-50 border-b border-gray-200 px-4 sm:px-6 py-3 sm:py-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4">
              <h2 className="text-lg font-bold text-purple-700">Leave Management</h2>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto">
                {/* Username Search Filter for Leave Tab */}
                <div className="relative flex-grow sm:flex-grow-0">
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Search className="text-gray-400" size={16} />
                    </div>
                    <input
                      type="text"
                      list="leaveUsernameOptions"
                      placeholder="Filter by username..."
                      value={leaveUsernameFilter}
                      onChange={(e) => setLeaveUsernameFilter(e.target.value)}
                      className="w-full sm:w-64 pl-10 pr-8 py-2 border border-purple-200 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm shadow-sm"
                    />
                    <datalist id="leaveUsernameOptions">
                      {leaveUsers?.map(user => (
                        <option key={user.id} value={user.user_name} />
                      ))}
                    </datalist>

                    {/* Clear button for input */}
                    {leaveUsernameFilter && (
                      <div className="absolute inset-y-0 right-0 pr-2 flex items-center">
                        <button
                          onClick={clearLeaveUsernameFilter}
                          className="text-gray-400 hover:text-gray-600 transition-colors"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Submit Button */}
                {canManageSettings && (
                  <button
                    onClick={handleSubmitLeave}
                    title="Select the users who will be on leave"
                    className="flex-shrink-0 rounded-md bg-green-600 py-2 px-4 text-white font-semibold hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-all shadow-sm active:scale-95"
                  >
                    Bulk Leave
                  </button>
                )}
              </div>
            </div>


            {/* Users List for Leave Selection */}
            <div 
              className="h-[calc(100vh-320px)] overflow-auto custom-scrollbar"
              onScroll={handleScroll}
            >
  {/* Mobile Card View */}
  <div className="sm:hidden space-y-3 p-3">
    {filteredLeaveUsers?.map((user) => (
      <div key={user.id} className="bg-white border border-gray-200 rounded-lg p-3 shadow-sm">
        <div className="flex justify-between items-start mb-2">
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={selectedUsers.includes(user.id)}
              onChange={(e) => handleUserSelection(user.id, e.target.checked)}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <button 
              onClick={() => handleOpenIndividualLeave(user)}
              className="text-sm font-medium text-purple-700 hover:text-purple-900 hover:underline cursor-pointer text-left"
              title="Click to process individual leave"
            >
              {user.user_name}
            </button>
          </div>
          {canManageSettings && !['admin', 'div_admin'].includes(currentUserRole?.toLowerCase()) && (
            <button
              onClick={() => {
                if(window.confirm(`Are you sure you want to clear leave for ${user.user_name}?`)) {
                  dispatch(updateUser({
                    id: user.id,
                    updatedUser: { 
                      ...user,
                      status: 'active',
                      leave_date: null, 
                      leave_end_date: null, 
                      remark: null 
                    }
                  }));
                }
              }}
              className="text-red-600" title="Clear Leave"
            >
              <Trash2 size={16} />
            </button>
          )}
        </div>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div><span className="text-gray-500">Leave Start:</span> <span className="font-medium">{user.leave_date ? new Date(user.leave_date).toLocaleDateString() : 'No leave set'}</span></div>
          <div><span className="text-gray-500">Leave End:</span> <span className="font-medium">{user.leave_end_date ? new Date(user.leave_end_date).toLocaleDateString() : 'No end date'}</span></div>
          <div className="col-span-2"><span className="text-gray-500">Remarks:</span> <span className="font-medium">{user.remark || 'No remarks'}</span></div>
        </div>
      </div>
    ))}
  </div>

  {/* Desktop Table View */}
  <table className="min-w-full divide-y divide-gray-200 hidden sm:table">
    <thead className="bg-gray-50">
      <tr>
        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
          <input
            type="checkbox"
            onChange={handleSelectAll}
            checked={selectedUsers.length === filteredLeaveUsers?.length && filteredLeaveUsers?.length > 0}
            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
        </th>
        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Username</th>
        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Current Leave Start Date</th>
        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Current Leave End Date</th>
        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Current Remarks</th>
        <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
      </tr>
    </thead>
    <tbody className="bg-white divide-y divide-gray-200">
      {filteredLeaveUsers?.map((user) => (
        <tr key={user.id} className="hover:bg-gray-50">
          <td className="px-6 py-4 whitespace-nowrap">
            <input
              type="checkbox"
              checked={selectedUsers.includes(user.id)}
              onChange={(e) => handleUserSelection(user.id, e.target.checked)}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
          </td>
          <td className="px-6 py-4 whitespace-nowrap">
            <button 
              onClick={() => handleOpenIndividualLeave(user)}
              className="text-sm font-medium text-purple-700 hover:text-purple-900 hover:underline cursor-pointer text-left"
              title="Click to process individual leave"
            >
              {user.user_name}
            </button>
          </td>
          <td className="px-6 py-4 whitespace-nowrap">
            <div className="text-sm text-gray-900">
              {user.leave_date ? new Date(user.leave_date).toLocaleDateString() : 'No leave set'}
            </div>
          </td>
          <td className="px-6 py-4 whitespace-nowrap">
            <div className="text-sm text-gray-900">
              {user.leave_end_date ? new Date(user.leave_end_date).toLocaleDateString() : 'No end date set'}
            </div>
          </td>
          <td className="px-6 py-4 whitespace-nowrap">
            <div className="text-sm text-gray-900">{user.remark || 'No remarks'}</div>
          </td>
          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
            {canManageSettings && !['admin', 'div_admin'].includes(currentUserRole?.toLowerCase()) && (
              <button
                onClick={() => {
                  if(window.confirm(`Are you sure you want to clear leave for ${user.user_name}?`)) {
                     dispatch(updateUser({
                      id: user.id,
                      updatedUser: {
                        ...user,
                        status: 'active',
                        leave_date: null,
                        leave_end_date: null,
                        remark: null
                      }
                    })).then(() => {
                      // setTimeout(() => window.location.reload(), 500);
                    });
                  }
                }}
                className="text-red-600 hover:text-red-900"
                title="Clear Leave (Does NOT delete user)"
              >
                <Trash2 size={18} />
              </button>
            )}
          </td>
        </tr>
      ))}
    </tbody>
  </table>
  {/* Infinite Scroll Loading Indicator for Leave Tab */}
  {leavePagination.loadingMore && leavePagination.hasMore && (
    <div className="text-center py-4 bg-white border-t border-gray-100">
      <div className="inline-block animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-purple-500"></div>
      <p className="text-purple-600 text-sm mt-1">Loading more users...</p>
    </div>
  )}
    </div>
  </div>
)}

        {/* Users Tab */}
        {activeTab === 'users' && (
  <div className="bg-white shadow rounded-lg overflow-hidden border border-purple-200">
    <div className={`${currentUserRole?.toLowerCase() === 'user' ? 'hidden' : 'bg-gradient-to-r from-purple-50 to-pink-50 border-b border-purple px-4 sm:px-6 py-3 sm:py-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3'}`}>
      <h2 className="text-lg font-medium text-purple-700">User List</h2>

      {/* Username Filter container */}
      <div className="relative w-full sm:w-auto">
        <div className="flex items-center gap-2 w-full">
          {/* Input with datalist for autocomplete */}
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="text-gray-400" size={16} />
            </div>
            <input
              type="text"
              list="usernameOptions"
              placeholder="Filter by username..."
              value={usernameFilter}
              onChange={(e) => setUsernameFilter(e.target.value)}
              className="w-full sm:w-64 pl-10 pr-8 py-2 border border-purple-200 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm shadow-sm"
            />
            <datalist id="usernameOptions">
              {userData?.map((user, idx) => (
                <option key={`${user.id}-${idx}`} value={user.user_name} />
              ))}
            </datalist>

            {/* Clear button for input */}
            {usernameFilter && (
              <div className="absolute inset-y-0 right-0 pr-2 flex items-center">
                <button
                  onClick={clearUsernameFilter}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X size={16} />
                </button>
              </div>
            )}
          </div>

          {/* Dropdown button */}
          <button
            onClick={toggleUsernameDropdown}
            className="flex items-center gap-1 px-3 py-2 border border-purple-200 rounded-md bg-white text-sm text-gray-700 hover:bg-gray-50"
          >
            <ChevronDown size={16} className={`transition-transform ${usernameDropdownOpen ? 'rotate-180' : ''}`} />
          </button>
        </div>

        {/* Dropdown menu */}
        {usernameDropdownOpen && (
          <div className="absolute z-50 mt-1 w-56 rounded-md bg-white shadow-lg border border-gray-200 max-h-60 overflow-auto top-full right-0">
            <div className="py-1">
              <button
                onClick={clearUsernameFilter}
                className={`block w-full text-left px-4 py-2 text-sm ${!usernameFilter ? 'bg-purple-100 text-purple-900' : 'text-gray-700 hover:bg-gray-100'}`}
              >
                All Usernames
              </button>
              {userData?.map(user => (
                <button
                  key={user.id}
                  onClick={() => handleUsernameFilterSelect(user.user_name)}
                  className={`block w-full text-left px-4 py-2 text-sm ${usernameFilter === user.user_name ? 'bg-purple-100 text-purple-900' : 'text-gray-700 hover:bg-gray-100'}`}
                >
                  {user.user_name}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>

    <div 
      className={`h-[calc(100vh-320px)] ${currentUserRole?.toLowerCase() === 'user' ? 'overflow-hidden' : 'overflow-auto custom-scrollbar'}`}
      style={{ maxHeight: 'calc(100vh - 300px)' }}
      onScroll={handleScroll}
    >
      {currentUserRole?.toLowerCase() === 'user' ? (
        <div className="p-4 bg-white h-full">
          <div className="max-w-6xl mx-auto">
            <div className="flex items-center gap-2 mb-4 border-b border-gray-100 pb-2">
              <div className="bg-purple-100 p-2 rounded-full text-purple-600">
                <User size={20} />
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-800 leading-tight">My Profile</h2>
                <p className="text-xs text-gray-500">Update your personal information</p>
              </div>
            </div>
            
            <form onSubmit={handleUpdateUser} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-0.5">Username</label>
                  <input
                    type="text"
                    name="username"
                    value={userForm.username}
                    onChange={handleUserInputChange}
                    className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-0.5">Email Address</label>
                  <input
                    type="email"
                    name="email"
                    value={userForm.email}
                    onChange={handleUserInputChange}
                    placeholder={userForm.email ? "" : "Enter email"}
                    className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all"
                  />
                </div>
                <div className="relative">
                  <label className="block text-xs font-semibold text-gray-600 mb-0.5">Password</label>
                  <div className="relative">
                    <input
                      type={showModalPassword ? "text" : "password"}
                      name="password"
                      value={userForm.password}
                      onChange={handleUserInputChange}
                      placeholder={userForm.password ? "••••••••" : "New password"}
                      className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all pr-8"
                    />
                    <button
                      type="button"
                      onClick={() => setShowModalPassword(!showModalPassword)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showModalPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-0.5">Phone Number</label>
                  <input
                    type="tel"
                    name="phone"
                    value={userForm.phone}
                    onChange={handleUserInputChange}
                    placeholder={userForm.phone ? "" : "Phone"}
                    className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-0.5">Designation</label>
                  <input
                    type="text"
                    name="designation"
                    value={userForm.designation}
                    onChange={handleUserInputChange}
                    placeholder="Enter designation"
                    className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all"
                  />
                </div>

                {/* Read-only fields for regular users */}
                <div className="space-y-0.5 opacity-80">
                  <label className="block text-xs font-semibold text-gray-600">Unit</label>
                  <div className="px-3 py-1.5 bg-gray-50 border border-gray-200 rounded text-gray-600 text-sm truncate">
                    {userForm.unit || 'N/A'}
                  </div>
                </div>
                <div className="space-y-0.5 opacity-80">
                  <label className="block text-xs font-semibold text-gray-600">Division</label>
                  <div className="px-3 py-1.5 bg-gray-50 border border-gray-200 rounded text-gray-600 text-sm truncate">
                    {userForm.division || 'N/A'}
                  </div>
                </div>
                <div className="space-y-0.5 opacity-80">
                  <label className="block text-xs font-semibold text-gray-600">Department</label>
                  <div className="px-3 py-1.5 bg-gray-50 border border-gray-200 rounded text-gray-600 text-sm truncate">
                    {userForm.department || 'N/A'}
                  </div>
                </div>
                <div className="space-y-0.5 opacity-80">
                  <label className="block text-xs font-semibold text-gray-600">Role</label>
                  <div className="px-3 py-1.5 bg-gray-50 border border-gray-200 rounded text-gray-600 text-sm capitalize truncate">
                    {userForm.role || 'user'}
                  </div>
                </div>

              </div>

              <div className="flex justify-end pt-2 border-t border-gray-100">
                <button
                  type="submit"
                  className="flex items-center gap-2 px-4 py-1.5 bg-purple-600 text-white text-sm font-semibold rounded hover:bg-purple-700 shadow transition-all active:scale-95"
                >
                  <Save size={14} />
                  Update Profile
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : (
        <>
          {/* Mobile Card View */}
      <div className="sm:hidden space-y-3 p-3">
        {(() => {
          const userRole = localStorage.getItem('role')?.toLowerCase();
          const userUnit = localStorage.getItem('unit');
          const userDivision = localStorage.getItem('division');
          const userAccess = localStorage.getItem('user_access') || '';
          const userDepartments = userAccess ? userAccess.split(',').map(d => d.trim().toLowerCase()) : [];
          
          let displayedUsers = userData;
          if (userRole === 'div_admin') {
            displayedUsers = userData?.filter(u => 
              u.unit === userUnit && u.division === userDivision
            );
          } else if (userRole === 'admin' && userDepartments.length > 0) {
            displayedUsers = userData?.filter(u => {
              const uDept = (u.user_access || u.department || '').split(',')[0].trim().toLowerCase();
              return u.unit === userUnit && u.division === userDivision && userDepartments.includes(uDept);
            });
          }
          
          return displayedUsers
            // Server-side search handles identifying names, 
            // but we keep a loose client filter for immediate feedback on the current page
            ?.filter(user => !usernameFilter || user.user_name.toLowerCase().includes(usernameFilter.toLowerCase()))
            .map((user, index) => (
            <div key={index} className="bg-white border border-gray-200 rounded-lg p-3 shadow-sm">
              <div className="flex justify-between items-start mb-2">
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(user?.status)}`}>
                    {user?.status}
                  </span>
                  <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getRoleColor(user?.role)}`}>
                    {user?.role}
                  </span>
                </div>
                <div className="flex space-x-2">
                  {((user?.id === loggedInUserId) || (canManageSettings && !['admin', 'div_admin'].includes(currentUserRole?.toLowerCase()))) && (
                    <>
                      <button onClick={() => handleEditUser(user?.id)} className="text-blue-600" title="Edit">
                        <Edit size={16} />
                      </button>
                      {canManageSettings && user?.id !== loggedInUserId && !['admin', 'div_admin'].includes(currentUserRole?.toLowerCase()) && (
                        <button onClick={() => handleDeleteUser(user?.id)} className="text-red-600" title="Delete">
                          <Trash2 size={16} />
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>
              <p className="text-sm font-medium text-gray-900 mb-2">{user?.user_name}</p>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div><span className="text-gray-500">Email:</span> <span className="font-medium">{user?.email_id || "—"}</span></div>
                <div><span className="text-gray-500">Phone:</span> <span className="font-medium">{user?.number || "—"}</span></div>
                <div><span className="text-gray-500">Designation:</span> <span className="font-medium">{user?.designation || "—"}</span></div>
                <div><span className="text-gray-500">Dept:</span> <span className="font-medium">{user?.user_access || user?.department || "N/A"}</span></div>
                <div><span className="text-gray-500">Unit:</span> <span className="font-medium">{(() => {
                  if (user?.unit) return user.unit;
                  const deptName = (user?.user_access || user?.department)?.split(',')[0]?.trim();
                  const match = department?.find(d => d.department?.toLowerCase() === deptName?.toLowerCase());
                  return match?.unit || "—";
                })()}</span></div>
                <div><span className="text-gray-500">Division:</span> <span className="font-medium">{(() => {
                  if (user?.division) return user.division;
                  const deptName = (user?.user_access || user?.department)?.split(',')[0]?.trim();
                  const match = department?.find(d => d.department?.toLowerCase() === deptName?.toLowerCase());
                  return match?.division || "—";
                })()}</span></div>
              </div>
            </div>
          ));
        })()}
      </div>

      {/* Desktop Table View */}
      <table className="min-w-full divide-y divide-gray-200 hidden sm:table">
        <thead className="bg-gray-50">
          <tr>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Username
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Password
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Email
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Phone No.
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Designation
            </th>

            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Department
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Unit
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Division
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Status
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Role
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
             {(() => {
                const userRole = localStorage.getItem('role')?.toLowerCase();
                const userUnit = localStorage.getItem('unit');
                const userDivision = localStorage.getItem('division');
                const userAccess = localStorage.getItem('user_access') || '';
                const userDepartments = userAccess ? userAccess.split(',').map(d => d.trim().toLowerCase()) : [];
                
                let displayedUsers = userData;
                if (userRole === 'div_admin') {
                  displayedUsers = userData?.filter(u => 
                    u.unit === userUnit && u.division === userDivision
                  );
                } else if (userRole === 'admin' && userDepartments.length > 0) {
                  displayedUsers = userData?.filter(u => {
                    const uDept = (u.user_access || u.department || '').split(',')[0].trim().toLowerCase();
                    return u.unit === userUnit && u.division === userDivision && userDepartments.includes(uDept);
                  });
                }
                
                return displayedUsers
                  ?.filter(user => !usernameFilter || user.user_name.toLowerCase().includes(usernameFilter.toLowerCase()))
                  .map((user, index) => (
              <tr key={index} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div className="text-sm font-medium text-gray-900">{user?.user_name}</div>
                  </div>
                </td>
               <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">
                    <div className="flex items-center space-x-2">
                      <span className="font-mono">
                        {showPasswords[user.id] ? user?.password : '••••••••'}
                      </span>
                      <button
                        onClick={() => togglePasswordVisibility(user.id)}
                        className="text-gray-500 hover:text-blue-600 text-xs"
                        title={showPasswords[user.id] ? "Hide Password" : "Show Password"}
                      >
                        {showPasswords[user.id] ? '👁️‍🗨️' : '👁️'}
                      </button>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(user?.password || '');
                          alert('Password copied to clipboard!');
                        }}
                        className="text-blue-600 hover:text-blue-800 text-xs bg-blue-50 px-2 py-1 rounded"
                        title="Copy Password"
                      >
                        Copy
                      </button>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">{user?.email_id}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">{user?.number}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">{user?.designation || "—"}</div>
                </td>
                

                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">{user?.user_access || user?.department || 'N/A'}</div>
                </td>

                {/* Unit Cell */}
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">{(() => {
                    if (user?.unit) return user.unit;
                    const deptName = (user?.user_access || user?.department)?.split(',')[0]?.trim();
                    const match = department?.find(d => d.department?.toLowerCase() === deptName?.toLowerCase());
                    return match?.unit || '—';
                  })()}</div>
                </td>

                {/* Division Cell */}
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">{(() => {
                    if (user?.division) return user.division;
                    const deptName = (user?.user_access || user?.department)?.split(',')[0]?.trim();
                    const match = department?.find(d => d.department?.toLowerCase() === deptName?.toLowerCase());
                    return match?.division || '—';
                  })()}</div>
                </td>
                
                {/* Status Cell */}
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(user?.status || 'active')}`}>
                      {user?.status ? user.status.charAt(0).toUpperCase() + user.status.slice(1) : 'Active'}
                    </span>
                    {(user?.status === 'active' || !user?.status) && (
                      <span className="ml-2 w-2 h-2 bg-green-500 rounded-full animate-pulse" title="Live Status"></span>
                    )}
                  </div>
                </td>
                
                {/* Role Cell */}
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getRoleColor(user?.role)}`}>
                    {user?.role}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  {((user?.id === loggedInUserId) || (canManageSettings && !['admin', 'div_admin'].includes(currentUserRole?.toLowerCase()))) && (
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleEditUser(user?.id)}
                        className="text-blue-600 hover:text-blue-900"
                        title="Edit User"
                      >
                        <Edit size={18} />
                      </button>
                      {canManageSettings && user?.id !== loggedInUserId && !['admin', 'div_admin'].includes(currentUserRole?.toLowerCase()) && (
                        <button
                          onClick={() => handleDeleteUser(user?.id)}
                          className="text-red-600 hover:text-red-900"
                          title="Delete User"
                        >
                          <Trash2 size={18} />
                        </button>
                      )}
                    </div>
                  )}
                </td>
              </tr>
            ));
        })()}
        </tbody>
      </table>
      </>
      )}
      
      {/* Infinite Scroll Loading Indicator */}
      {pagination.loadingMore && pagination.hasMore && (
        <div className="text-center py-6 bg-white border-t border-gray-100">
          <div className="inline-block animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-purple-500"></div>
          <p className="text-purple-600 text-sm font-medium mt-2">Loading more users...</p>
        </div>
      )}
    </div>
  </div>
)}

        {/* Departments Tab */}
       {/* Departments Tab */}
{/* Departments Tab */}
{activeTab === 'departments' && (
  <div className="bg-white shadow rounded-lg overflow-hidden border border-purple-200">
    <div className="bg-gradient-to-r from-purple-50 to-pink-50 border-b border-purple px-4 sm:px-6 py-4 border-gray-200">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
        <h2 className="text-lg font-medium text-purple-700">Department Management</h2>
        
        {/* Sub-tabs for Departments and Given By */}
        <div className="flex border border-purple-200 rounded-md overflow-hidden w-full sm:w-auto">
          <button
            className={`flex-1 sm:flex-none px-3 sm:px-4 py-2 text-sm font-medium ${activeDeptSubTab === 'departments' ? 'bg-purple-600 text-white' : 'bg-white text-purple-600 hover:bg-purple-50'}`}
            onClick={() => setActiveDeptSubTab('departments')}
          >
            Departments
          </button>
          <button
            className={`flex-1 sm:flex-none px-3 sm:px-4 py-2 text-sm font-medium ${activeDeptSubTab === 'givenBy' ? 'bg-purple-600 text-white' : 'bg-white text-purple-600 hover:bg-purple-50'}`}
            onClick={() => setActiveDeptSubTab('givenBy')}
          >
            Given By
          </button>
        </div>
      </div>
    </div>

    {/* Loading State */}
    {loading && (
      <div className="p-8 text-center">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
        <p className="mt-2 text-gray-600">Loading...</p>
      </div>
    )}

    {/* Error State */}
    {error && (
      <div className="p-4 bg-red-50 border border-red-200 rounded-md m-4">
        <p className="text-red-600">Error: {error}</p>
      </div>
    )}

    {/* Departments Sub-tab - Show only department names */}
    {activeDeptSubTab === 'departments' && !loading && (
      <div className="h-[calc(100vh-320px)] overflow-auto custom-scrollbar" style={{ maxHeight: 'calc(100vh - 300px)' }}>
        {/* Mobile Card View */}
        <div className="sm:hidden space-y-3 p-3">
          {department && department.length > 0 ? (
            Array.from(new Map(department.map(dept => [dept.department, dept])).values())
              .filter(dept => dept?.department && dept.department.trim() !== '')
              .map((dept, index) => (
                <div key={dept.id} className="bg-white border border-gray-200 rounded-lg p-3 shadow-sm">
                  <div className="flex justify-between items-start mb-2">
                    <p className="text-sm font-medium text-gray-900">#{index + 1} {dept.department}</p>
                    {canManageSettings && (
                      <button onClick={() => handleEditDepartment(dept.id)} className="text-blue-600" title="Edit">
                        <Edit size={16} />
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div><span className="text-gray-500">Unit:</span> <span className="font-medium">{dept.unit || '—'}</span></div>
                    <div><span className="text-gray-500">Division:</span> <span className="font-medium">{dept.division || '—'}</span></div>
                  </div>
                </div>
              ))
          ) : (
            <div className="text-center py-6 text-gray-500 text-sm">No departments found</div>
          )}
        </div>

        {/* Desktop Table View */}
        <table className="min-w-full divide-y divide-gray-200 hidden sm:table">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Department Name</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Unit</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Division</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {department && department.length > 0 ? (
              Array.from(new Map(department.map(dept => [dept.department, dept])).values())
                .filter(dept => dept?.department && dept.department.trim() !== '')
                .map((dept, index) => (
                  <tr key={dept.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{index + 1}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{dept.department}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{dept.unit || '—'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{dept.division || '—'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex space-x-2">
                        {canManageSettings && (
                        <button onClick={() => handleEditDepartment(dept.id)} className="text-blue-600 hover:text-blue-900">
                          <Edit size={18} />
                        </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
            ) : (
              <tr>
                <td colSpan="5" className="px-6 py-4 text-center text-sm text-gray-500">No departments found</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    )}

    {/* Given By Sub-tab - Show only given_by values */}
    {activeDeptSubTab === 'givenBy' && !loading && (
      <div className="h-[calc(100vh-320px)] overflow-auto custom-scrollbar" style={{ maxHeight: 'calc(100vh - 300px)' }}>
        {/* Mobile Card View */}
        <div className="sm:hidden space-y-3 p-3">
          {department && department.length > 0 ? (
            Array.from(new Map(department.map(dept => [dept.given_by, dept])).values())
              .filter(dept => dept?.given_by && dept.given_by.trim() !== '')
              .map((dept, index) => (
                <div key={dept.id} className="bg-white border border-gray-200 rounded-lg p-3 shadow-sm">
                  <div className="flex justify-between items-center">
                    <p className="text-sm font-medium text-gray-900">#{index + 1} {dept.given_by}</p>
                    {canManageSettings && (
                      <button onClick={() => handleEditGivenBy(dept.id)} className="text-blue-600" title="Edit">
                        <Edit size={16} />
                      </button>
                    )}
                  </div>
                </div>
              ))
          ) : (
            <div className="text-center py-6 text-gray-500 text-sm">No given by data found</div>
          )}
        </div>

        {/* Desktop Table View */}
        <table className="min-w-full divide-y divide-gray-200 hidden sm:table">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Given By</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {department && department.length > 0 ? (
              Array.from(new Map(department.map(dept => [dept.given_by, dept])).values())
                .filter(dept => dept?.given_by && dept.given_by.trim() !== '')
                .map((dept, index) => (
                  <tr key={dept.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{index + 1}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{dept.given_by}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex space-x-2">
                        {canManageSettings && (
                        <button onClick={() => handleEditGivenBy(dept.id)} className="text-blue-600 hover:text-blue-900">
                          <Edit size={18} />
                        </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
            ) : (
              <tr>
                <td colSpan="3" className="px-6 py-4 text-center text-sm text-gray-500">No given by data found</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    )}
  </div>
)}

        {/* Given By Modal */}
        {showGivenByModal && (
          <div className="fixed z-10 inset-0 overflow-y-auto">
            <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
              <div className="fixed inset-0 transition-opacity" aria-hidden="true">
                <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
              </div>
              <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
              <div className="inline-block align-bottom bg-white rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-md sm:w-full sm:p-6">
                <div>
                  <div className="flex justify-between items-center">
                    <h3 className="text-lg leading-6 font-medium text-gray-900">
                      {isEditingGivenBy ? 'Edit Given By' : 'Add Given By'}
                    </h3>
                    <button
                      onClick={() => { setShowGivenByModal(false); setGivenByInput(''); }}
                      className="text-gray-400 hover:text-gray-500"
                    >
                      <X size={24} />
                    </button>
                  </div>
                  <div className="mt-6">
                    <form onSubmit={handleAddGivenBy}>
                      <div>
                        <label htmlFor="givenByInput" className="block text-sm font-medium text-gray-700">
                          Given By
                        </label>
                        <input
                          type="text"
                          id="givenByInput"
                          value={givenByInput}
                          onChange={(e) => setGivenByInput(e.target.value)}
                          className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                          placeholder="Enter Given By name"
                          autoFocus
                        />
                      </div>

                      <div className="mt-6 flex justify-end space-x-3">
                        <button
                          type="button"
                          onClick={() => { setShowGivenByModal(false); setGivenByInput(''); }}
                          className="bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                        >
                          <Save size={18} className="mr-2" />
                          {isEditingGivenBy ? 'Update' : 'Save'}
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Extend Task Tab */}
        {activeTab === 'extendTask' && (
          <div className="bg-white shadow rounded-lg overflow-hidden border border-purple-200">
            <div className="bg-gradient-to-r from-purple-50 to-pink-50 border-b border-purple px-4 sm:px-6 py-3 sm:py-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <h2 className="text-lg font-medium text-purple-700">Extend Task Management</h2>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                {/* Username Search Filter */}
                <div className="relative">
                  <div className="flex items-center gap-2">
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Search className="text-gray-400" size={16} />
                      </div>
                      <input
                        type="text"
                        list="extendUsernameOptions"
                        placeholder="Filter by username..."
                        value={extendUsernameFilter}
                        onChange={(e) => setExtendUsernameFilter(e.target.value)}
                        className="w-full sm:w-64 pl-10 pr-8 py-2 border border-purple-200 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm shadow-sm"
                      />
                      <datalist id="extendUsernameOptions">
                        {extendUsers?.map(user => (
                          <option key={user.id} value={user.user_name} />
                        ))}
                      </datalist>

                      {extendUsernameFilter && (
                        <div className="absolute inset-y-0 right-0 pr-2 flex items-center">
                          <button
                            onClick={clearExtendUsernameFilter}
                            className="text-gray-400 hover:text-gray-600"
                          >
                            <X size={16} />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Users List for Extend Task Selection */}
            <div 
              className="h-[calc(100vh-320px)] overflow-auto custom-scrollbar"
              onScroll={handleScroll}
            >
              {/* Mobile Card View */}
              <div className="sm:hidden space-y-3 p-3">
                {extendUsers?.map((user) => (
                  <div key={user.id} className="bg-white border border-gray-200 rounded-lg p-3 shadow-sm">
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={selectedUsers.includes(user.id)}
                        onChange={(e) => handleExtendUserSelection(user.id, e.target.checked)}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <div>
                        <p className="text-sm font-medium text-gray-900">{user.user_name}</p>
                        <p className="text-xs text-gray-500">Pending Tasks: -</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop Table View */}
              <table className="min-w-full divide-y divide-gray-200 hidden sm:table">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      <input
                        type="checkbox"
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        checked={selectedUsers.length === extendUsers.length && extendUsers.length > 0}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedUsers(extendUsers.map(u => u.id));
                          } else {
                            setSelectedUsers([]);
                          }
                        }}
                      />
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Username</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Pending Tasks</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {extendUsers?.map((user) => (
                    <tr key={user.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <input
                          type="checkbox"
                          checked={selectedUsers.includes(user.id)}
                          onChange={(e) => handleExtendUserSelection(user.id, e.target.checked)}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{user.user_name}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">-</div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {/* Infinite Scroll Loading Indicator for Extend Task Tab */}
              {extendPagination.loadingMore && extendPagination.hasMore && (
                <div className="text-center py-4 bg-white border-t border-gray-100">
                  <div className="inline-block animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-purple-500"></div>
                  <p className="text-purple-600 text-sm mt-1">Loading more users...</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Machines Tab */}
        {activeTab === 'machines' && (
          <div className="bg-white shadow rounded-lg overflow-hidden border border-purple-200">
            <div className="bg-gradient-to-r from-purple-50 to-pink-50 border-b border-purple px-6 py-4 border-gray-200 flex flex-col sm:flex-row justify-between items-center gap-3">
              <h2 className="text-lg font-medium text-purple-700">Machine Management</h2>
              
              <div className="relative w-full sm:w-auto">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="text-gray-400" size={16} />
                </div>
                <input
                  type="text"
                  placeholder="Search machines..."
                  value={machineSearch}
                  onChange={(e) => setMachineSearch(e.target.value)}
                  className="w-full sm:w-64 pl-10 pr-4 py-2 border border-purple-200 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm transition-all"
                />
              </div>
            </div>

            {loading && (
              <div className="p-8 text-center">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
                <p className="mt-2 text-gray-600">Loading...</p>
              </div>
            )}

            {!loading && (
              <div className="h-[calc(100vh-320px)] overflow-auto custom-scrollbar" style={{ maxHeight: 'calc(100vh - 300px)' }}>
                {/* Mobile Card View */}
                <div className="sm:hidden space-y-3 p-3">
                  {filteredMachines && filteredMachines.length > 0 ? (
                    filteredMachines.map((machine, index) => (
                      <div key={machine.id} className="bg-white border border-gray-200 rounded-lg p-3 shadow-sm">
                        <div className="flex justify-between items-start mb-2">
                          <p className="text-sm font-medium text-gray-900">#{index + 1} {machine.machine_name || '—'}</p>
                          {canModifySettings && (
                            <div className="flex gap-2">
                              <button onClick={() => handleEditMachine(machine.id)} className="text-blue-600" title="Edit">
                                <Edit size={16} />
                              </button>
                              {currentUserRole?.toLowerCase() !== 'user' && (
                                <button onClick={() => handleDeleteMachine(machine.id)} className="text-red-600" title="Delete">
                                  <Trash2 size={16} />
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                        <div className="grid grid-cols-1 gap-2 text-xs">
                          <div className="flex flex-col gap-1">
                            <span className="text-gray-500">Part:</span> 
                            <ChipsOverflow items={machine.part_name} title={machine.machine_name} />
                          </div>
                          <div><span className="text-gray-500">Area:</span> <span className="font-medium">{machine.machine_area || '—'}</span></div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-6 text-gray-500 text-sm">No machines found</div>
                  )}
                </div>

                {/* Desktop Table View */}
                <table className="min-w-full divide-y divide-gray-200 hidden sm:table">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Machine Name</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Machine Area</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Part Name</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Department</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Division</th>
                      <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredMachines && filteredMachines.length > 0 ? (
                      filteredMachines.map((machine, index) => (
                        <tr key={machine.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="text-sm font-medium text-gray-900">{machine.machine_name || '—'}</span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="text-sm text-gray-600">{machine.machine_area || '—'}</span>
                          </td>
                          <td className="px-6 py-4 max-w-[450px]">
                            <ChipsOverflow items={machine.part_name} title={machine.machine_name} />
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="text-sm text-gray-600">{machine.machine_department || '—'}</span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="text-sm text-gray-600">{machine.machine_division || '—'}</span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            {canModifySettings && (
                              <div className="flex justify-end gap-3 text-gray-400">
                                <button 
                                  onClick={() => handleEditMachine(machine.id)} 
                                  className="hover:text-blue-600 transition-colors"
                                >
                                  <Edit size={18} />
                                </button>
                                {currentUserRole?.toLowerCase() !== 'user' && (
                                  <button 
                                    onClick={() => handleDeleteMachine(machine.id)} 
                                    className="hover:text-red-600 transition-colors"
                                  >
                                    <Trash2 size={18} />
                                  </button>
                                )}
                              </div>
                            )}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="6" className="px-6 py-10 text-center text-gray-500">
                          <Settings className="mx-auto h-8 w-8 text-gray-400 mb-2 opacity-50" />
                          <p className="text-sm">{machineSearch ? 'No matching machines found.' : 'No machines found.'}</p>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* WhatsApp Tab */}
        {activeTab === 'whatsapp' && (
          <div className="bg-white shadow rounded-lg overflow-hidden border border-purple-200">
            <div className="bg-gradient-to-r from-purple-50 to-pink-50 border-b border-purple px-6 py-4 flex items-center gap-3">
              <MessageSquare className="text-purple-600" size={24} />
              <h2 className="text-lg font-medium text-purple-700">WhatsApp Automation</h2>
            </div>
            
            <div className="p-8">
              <div className="max-w-2xl mx-auto space-y-6">
                <div className="bg-purple-50 rounded-xl p-6 border border-purple-100">
                  <h3 className="text-lg font-bold text-purple-800 mb-2">Overdue Task Reminders</h3>
                  <p className="text-sm text-purple-600 mb-6">
                    Manually trigger a bulk WhatsApp broadcast to all employees who have tasks marked as OVERDUE. 
                    The system will group multiple tasks for each employee to prevent spamming.
                  </p>
                  
                  <div className="bg-white p-4 rounded-lg border border-purple-100 mb-6">
                    <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Preview of Notification:</p>
                    <div className="bg-gray-50 p-3 rounded text-sm italic text-gray-600 font-serif border-l-4 border-purple-400">
                      ⚠️ Hello [Name],<br/><br/>
                      This is a reminder that you currently have *[X] overdue task(s)* pending in the system.<br/><br/>
                      📋 *Pending Tasks:*<br/>
                      • #101: Task Description...<br/><br/>
                      🔗 Please review and update here: [Link]
                    </div>
                  </div>

                  <button
                    onClick={handleTriggerOverdueAlerts}
                    disabled={isSendingAlerts}
                    className="w-full flex items-center justify-center gap-2 py-4 px-6 bg-purple-600 text-white rounded-xl font-bold text-lg hover:bg-purple-700 disabled:bg-purple-300 transition-all shadow-lg active:scale-[0.98]"
                  >
                    {isSendingAlerts ? (
                      <>
                        <RefreshCw className="animate-spin" size={24} />
                        Sending Broadcast...
                      </>
                    ) : (
                      <>
                        <MessageSquare size={24} />
                        Send Overdue Alerts Now
                      </>
                    )}
                  </button>
                </div>
                
                <div className="flex items-start gap-3 p-4 bg-yellow-50 rounded-lg border border-yellow-100">
                  <div className="mt-1 text-yellow-600">
                    <Settings size={18} />
                  </div>
                  <p className="text-xs text-yellow-700">
                    <strong>Note:</strong> Automated reminders are scheduled to run daily at 9:00 AM. 
                    Use this manual trigger if you need to send reminders immediately outside the schedule.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Machine Modal */}
        {showMachineModal && (
          <div className="fixed z-10 inset-0 overflow-y-auto">
            <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
              <div className="fixed inset-0 transition-opacity" aria-hidden="true">
                <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
              </div>
              <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
              <div className={`inline-block align-middle bg-white rounded-lg px-4 pt-5 pb-4 text-left shadow-xl transform transition-all sm:my-8 sm:align-middle ${isEditingMachine ? 'sm:max-w-md' : 'sm:max-w-2xl'} sm:w-full sm:p-6`}>
                <div className="max-h-[80vh] overflow-y-auto pr-2">
                  <div className="flex justify-between items-center">
                    <h3 className="text-lg leading-6 font-medium text-gray-900">
                      {isEditingMachine ? 'Edit Machine' : 'Add New Machine'}
                    </h3>
                    <button
                      onClick={() => { setShowMachineModal(false); resetMachineForm(); }}
                      className="text-gray-400 hover:text-gray-500"
                    >
                      <X size={24} />
                    </button>
                  </div>
                  <div className="mt-6">
                    <form onSubmit={isEditingMachine ? handleUpdateMachine : handleAddMachine}>
                      {isEditingMachine ? (
                        <div className="space-y-4">
                          <div>
                            <label htmlFor="machine_name" className="block text-sm font-medium text-gray-700">Machine Name</label>
                            <input
                              type="text"
                              id="machine_name"
                              value={machineForm.machine_name}
                              onChange={(e) => setMachineForm({ ...machineForm, machine_name: e.target.value })}
                              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-purple-500 focus:border-purple-500 sm:text-sm"
                              required
                            />
                          </div>
                          <div>
                            <label htmlFor="machine_area" className="block text-sm font-medium text-gray-700">Machine Area</label>
                            <input
                              type="text"
                              id="machine_area"
                              value={machineForm.machine_area}
                              onChange={(e) => setMachineForm({ ...machineForm, machine_area: e.target.value })}
                              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-purple-500 focus:border-purple-500 sm:text-sm"
                              required
                            />
                          </div>
                          <div>
                            <div className="flex items-center justify-between mb-1">
                              <label htmlFor="part_name_edit" className="block text-sm font-medium text-gray-700">Part Names & Images</label>
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={handleCopyAllParts}
                                  className="p-1 text-gray-500 hover:text-purple-600 hover:bg-purple-50 rounded transition-colors"
                                  title="Copy All Parts"
                                >
                                  <Copy size={16} />
                                </button>
                                <button
                                  type="button"
                                  onClick={handleRemoveAllParts}
                                  className="p-1 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                                  title="Remove All Parts"
                                >
                                  <Trash2 size={16} />
                                </button>
                              </div>
                            </div>
                            <div className="mt-1 space-y-2">
                              <div className="flex flex-wrap gap-1 p-2 border border-gray-300 rounded-md min-h-[42px] bg-white">
                                {machineForm.part_name.map((part, idx) => (
                                  <span key={idx} className="inline-flex items-center gap-1 px-2 py-1 bg-purple-100 text-purple-800 rounded-full text-sm cursor-pointer select-text">
                                    {part}
                                    <button type="button" onClick={() => {
                                      const newNames = machineForm.part_name.filter((_, i) => i !== idx);
                                      const newImages = machineForm.part_images.filter((_, i) => i !== idx);
                                      setMachineForm(prev => ({ ...prev, part_name: newNames, part_images: newImages }));
                                    }} className="text-purple-600 hover:text-purple-900 select-none">&times;</button>
                                  </span>
                                ))}
                                <input
                                  type="text"
                                  id="part_name_edit"
                                  value={partInput}
                                  onChange={(e) => setPartInput(e.target.value)}
                                  onPaste={handlePartPaste}
                                  onKeyDown={(e) => {
                                    if ((e.key === 'Enter' || e.key === ',') && partInput.trim()) {
                                      e.preventDefault();
                                      const trimmedInput = partInput.trim();
                                      if (!machineForm.part_name.includes(trimmedInput)) {
                                        setMachineForm(prev => ({ 
                                          ...prev, 
                                          part_name: [...prev.part_name, trimmedInput],
                                          part_images: [...(prev.part_images || []), null]
                                        }));
                                      }
                                      setPartInput('');
                                    }
                                  }}
                                  placeholder={machineForm.part_name.length === 0 ? "Type part name, press Enter" : "Add more..."}
                                  className="flex-1 min-w-[120px] outline-none text-sm py-1"
                                />
                                <div className="flex items-center gap-1 border-l border-gray-200 pl-1">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      if (partInput.trim() && !machineForm.part_name.includes(partInput.trim())) {
                                        setMachineForm(prev => ({ 
                                          ...prev, 
                                          part_name: [...prev.part_name, partInput.trim()],
                                          part_images: [...(prev.part_images || []), null]
                                        }));
                                        setPartInput('');
                                      }
                                    }}
                                    className="p-1 hover:bg-purple-100 text-purple-600 rounded transition-colors"
                                    title="Add Part"
                                  >
                                    <Plus size={16} />
                                  </button>
                                  <label className="cursor-pointer p-1 hover:bg-purple-100 text-purple-600 rounded transition-colors" title="Direct Upload (New Part)">
                                    <ImageIcon size={16} />
                                    <input 
                                      type="file" 
                                      className="hidden" 
                                      accept="image/*"
                                      onChange={(e) => handleDirectPartImageUpload(e.target.files[0])}
                                    />
                                  </label>
                                </div>
                              </div>
                              
                              {/* Part Images List */}
                              {machineForm.part_name.length > 0 && (
                                <div className="border border-gray-200 rounded-md p-2 bg-gray-50 max-h-40 overflow-y-auto">
                                  <p className="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wider">Upload Part Images (Optional)</p>
                                  <div className="space-y-2">
                                    {machineForm.part_name.map((part, idx) => (
                                      <div key={idx} className="flex items-center justify-between gap-2 p-1.5 bg-white border border-gray-100 rounded shadow-sm">
                                        <span className="text-xs font-medium text-gray-700 truncate max-w-[150px]">{part}</span>
                                        <div className="flex items-center gap-2">
                                          {machineForm.part_images?.[idx] && (
                                            <div className="relative h-8 w-8 hover:h-20 hover:w-20 hover:z-10 transition-all border border-gray-200 rounded overflow-hidden shadow-sm">
                                              <img src={machineForm.part_images[idx]} alt={part} className="h-full w-full object-cover" />
                                            </div>
                                          )}
                                          <label className="cursor-pointer p-1.5 hover:bg-purple-100 text-purple-600 rounded-full transition-colors" title="Upload Image">
                                            <Upload size={14} />
                                            <input 
                                              type="file" 
                                              className="hidden" 
                                              accept="image/*"
                                              onChange={(e) => handlePartImageUpload(idx, e.target.files[0])}
                                            />
                                          </label>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                            <p className="mt-1 text-xs text-gray-500">Press Enter/comma to add part name, then click upload icon</p>
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label htmlFor="machine_department" className="block text-sm font-medium text-gray-700">Department</label>
                              <input
                                type="text"
                                id="machine_department"
                                name="machine_department"
                                value={machineForm.machine_department}
                                onChange={handleMachineInputChange}
                                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-purple-500 focus:border-purple-500 sm:text-sm"
                              />
                            </div>
                            <div>
                              <label htmlFor="machine_division" className="block text-sm font-medium text-gray-700">Division</label>
                              <input
                                type="text"
                                id="machine_division"
                                name="machine_division"
                                value={machineForm.machine_division}
                                onChange={handleMachineInputChange}
                                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-purple-500 focus:border-purple-500 sm:text-sm"
                              />
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          <div>
                            <label htmlFor="machine_name" className="block text-sm font-medium text-gray-700">Machine Name</label>
                            <input
                              type="text"
                              id="machine_name"
                              value={machineForm.machine_name}
                              onChange={(e) => setMachineForm({ ...machineForm, machine_name: e.target.value })}
                              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-purple-500 focus:border-purple-500 sm:text-sm"
                              required
                            />
                          </div>
                          <div>
                            <label htmlFor="machine_area" className="block text-sm font-medium text-gray-700">Machine Area</label>
                            <input
                              type="text"
                              id="machine_area"
                              value={machineForm.machine_area}
                              onChange={(e) => setMachineForm({ ...machineForm, machine_area: e.target.value })}
                              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-purple-500 focus:border-purple-500 sm:text-sm"
                              required
                            />
                          </div>
                          <div>
                            <div className="flex items-center justify-between mb-1">
                              <label htmlFor="part_name_add" className="block text-sm font-medium text-gray-700">Part Names & Images</label>
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={handleCopyAllParts}
                                  className="p-1 text-gray-500 hover:text-purple-600 hover:bg-purple-50 rounded transition-colors"
                                  title="Copy All Parts"
                                >
                                  <Copy size={16} />
                                </button>
                                <button
                                  type="button"
                                  onClick={handleRemoveAllParts}
                                  className="p-1 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                                  title="Remove All Parts"
                                >
                                  <Trash2 size={16} />
                                </button>
                              </div>
                            </div>
                            <div className="mt-1 space-y-2">
                              <div className="flex flex-wrap gap-1 p-2 border border-gray-300 rounded-md min-h-[42px] bg-white">
                                {machineForm.part_name.map((part, idx) => (
                                  <span key={idx} className="inline-flex items-center gap-1 px-2 py-1 bg-purple-100 text-purple-800 rounded-full text-sm cursor-pointer select-text">
                                    {part}
                                    <button type="button" onClick={() => {
                                      const newNames = machineForm.part_name.filter((_, i) => i !== idx);
                                      const newImages = machineForm.part_images.filter((_, i) => i !== idx);
                                      setMachineForm(prev => ({ ...prev, part_name: newNames, part_images: newImages }));
                                    }} className="text-purple-600 hover:text-purple-900 select-none">&times;</button>
                                  </span>
                                ))}
                                <input
                                  type="text"
                                  id="part_name_add"
                                  value={partInput}
                                  onChange={(e) => setPartInput(e.target.value)}
                                  onPaste={handlePartPaste}
                                  onKeyDown={(e) => {
                                    if ((e.key === 'Enter' || e.key === ',') && partInput.trim()) {
                                      e.preventDefault();
                                      const trimmedInput = partInput.trim();
                                      if (!machineForm.part_name.includes(trimmedInput)) {
                                        setMachineForm(prev => ({ 
                                          ...prev, 
                                          part_name: [...prev.part_name, trimmedInput],
                                          part_images: [...(prev.part_images || []), null]
                                        }));
                                      }
                                      setPartInput('');
                                    }
                                  }}
                                  placeholder={machineForm.part_name.length === 0 ? "Type part name, press Enter" : "Add more..."}
                                  className="flex-1 min-w-[120px] outline-none text-sm py-1"
                                />
                                <div className="flex items-center gap-1 border-l border-gray-200 pl-1">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      if (partInput.trim() && !machineForm.part_name.includes(partInput.trim())) {
                                        setMachineForm(prev => ({ 
                                          ...prev, 
                                          part_name: [...prev.part_name, partInput.trim()],
                                          part_images: [...(prev.part_images || []), null]
                                        }));
                                        setPartInput('');
                                      }
                                    }}
                                    className="p-1 hover:bg-purple-100 text-purple-600 rounded transition-colors"
                                    title="Add Part"
                                  >
                                    <Plus size={16} />
                                  </button>
                                  <label className="cursor-pointer p-1 hover:bg-purple-100 text-purple-600 rounded transition-colors" title="Direct Upload (New Part)">
                                    <ImageIcon size={16} />
                                    <input 
                                      type="file" 
                                      className="hidden" 
                                      accept="image/*"
                                      onChange={(e) => handleDirectPartImageUpload(e.target.files[0])}
                                    />
                                  </label>
                                </div>
                              </div>

                              {/* Part Images List */}
                              {machineForm.part_name.length > 0 && (
                                <div className="border border-gray-200 rounded-md p-2 bg-gray-50 max-h-40 overflow-y-auto">
                                  <p className="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wider">Upload Part Images (Optional)</p>
                                  <div className="space-y-2">
                                    {machineForm.part_name.map((part, idx) => (
                                      <div key={idx} className="flex items-center justify-between gap-2 p-1.5 bg-white border border-gray-100 rounded shadow-sm">
                                        <span className="text-xs font-medium text-gray-700 truncate max-w-[150px]">{part}</span>
                                        <div className="flex items-center gap-2">
                                          {machineForm.part_images?.[idx] && (
                                            <div className="relative h-8 w-8 hover:h-20 hover:w-20 hover:z-10 transition-all border border-gray-200 rounded overflow-hidden shadow-sm">
                                              <img src={machineForm.part_images[idx]} alt={part} className="h-full w-full object-cover" />
                                            </div>
                                          )}
                                          <label className="cursor-pointer p-1.5 hover:bg-purple-100 text-purple-600 rounded-full transition-colors" title="Upload Image">
                                            <Upload size={14} />
                                            <input 
                                              type="file" 
                                              className="hidden" 
                                              accept="image/*"
                                              onChange={(e) => handlePartImageUpload(idx, e.target.files[0])}
                                            />
                                          </label>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                            <p className="mt-1 text-xs text-gray-500">Press Enter/comma to add part name, then click upload icon</p>
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label htmlFor="machine_department_add" className="block text-sm font-medium text-gray-700">Department</label>
                              <input
                                type="text"
                                id="machine_department_add"
                                name="machine_department"
                                value={machineForm.machine_department}
                                onChange={handleMachineInputChange}
                                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-purple-500 focus:border-purple-500 sm:text-sm"
                              />
                            </div>
                            <div>
                              <label htmlFor="machine_division_add" className="block text-sm font-medium text-gray-700">Division</label>
                              <input
                                type="text"
                                id="machine_division_add"
                                name="machine_division"
                                value={machineForm.machine_division}
                                onChange={handleMachineInputChange}
                                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-purple-500 focus:border-purple-500 sm:text-sm"
                              />
                            </div>
                          </div>
                        </div>
                      )}
                      
                      <div className="mt-6 flex justify-end space-x-3">
                        <button
                          type="button"
                          onClick={() => { setShowMachineModal(false); resetMachineForm(); }}
                          className="bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
                        >
                          {isEditingMachine ? 'Update' : 'Submit'}
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Extend Task Modal Popup */}
        {showExtendTaskPopup && currentExtendUser && (
          <div className="fixed z-20 inset-0 overflow-y-auto">
            <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
              <div className="fixed inset-0 transition-opacity" aria-hidden="true" onClick={() => setShowExtendTaskPopup(false)}>
                <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
              </div>
              <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
              <div className="inline-block align-bottom bg-white rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full sm:p-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg leading-6 font-medium text-gray-900">
                    Extend Tasks for: <span className="text-purple-600">{currentExtendUser.user_name}</span>
                  </h3>
                  <button
                    onClick={() => setShowExtendTaskPopup(false)}
                    className="text-gray-400 hover:text-gray-500"
                  >
                    <X size={24} />
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Start Date</label>
                    <input
                      type="date"
                      value={extendStartDate}
                      onChange={(e) => setExtendStartDate(e.target.value)}
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:ring-purple-500 focus:border-purple-500 sm:text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">End Date</label>
                    <input
                      type="date"
                      value={extendEndDate}
                      onChange={(e) => setExtendEndDate(e.target.value)}
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:ring-purple-500 focus:border-purple-500 sm:text-sm"
                    />
                  </div>
                </div>

                <div className="overflow-auto max-h-[60vh]">
                  {extendLoading ? (
                    <div className="text-center py-4">Loading tasks...</div>
                  ) : extendUserTasks.length === 0 ? (
                    <div className="text-center py-4 text-gray-500">No tasks found for selected date range.</div>
                  ) : (
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50 sticky top-0">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Task</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Current Start Date</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">New Start Date</th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {extendUserTasks.map((task) => (
                          <tr key={task.task_id}>
                            <td className="px-4 py-2 text-sm text-gray-900 max-w-xs truncate" title={task.task_description}>
                              {task.task_description}
                            </td>
                            <td className="px-4 py-2 text-sm text-gray-500">
                              {new Date(task.task_start_date).toLocaleDateString()}
                            </td>
                            <td className="px-4 py-2 whitespace-nowrap">
                              <input
                                type="date"
                                value={newStartDates[task.task_id] || ''}
                                onChange={(e) => setNewStartDates(prev => ({ ...prev, [task.task_id]: e.target.value }))}
                                className="block w-full border border-gray-300 rounded-md shadow-sm py-1 px-2 text-xs focus:ring-purple-500 focus:border-purple-500"
                                min={new Date().toLocaleDateString('en-CA')}
                              />
                            </td>
                            <td className="px-4 py-2 whitespace-nowrap text-right">
                              <button
                                onClick={() => handleUpdateTaskDate(task.task_id)}
                                disabled={!newStartDates[task.task_id]}
                                className="inline-flex items-center px-2.5 py-1.5 border border-transparent text-xs font-medium rounded text-blue-700 bg-blue-100 hover:bg-blue-200 disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                Update
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* User Modal */}
        {showUserModal && (
          <div className="fixed z-10 inset-0 overflow-y-auto">
            <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
              <div className="fixed inset-0 transition-opacity" aria-hidden="true">
                <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
              </div>
              <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
              <div className="inline-block align-bottom bg-white rounded-lg px-4 pt-5 pb-4 text-left shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-5xl sm:w-full sm:p-6">
                <div>
                  <div className="flex justify-between items-center">
                    <h3 className="text-lg leading-6 font-medium text-gray-900">
                      {isEditing 
                        ? (currentUserId === loggedInUserId ? 'My Profile' : 'Edit User') 
                        : 'Create New User'}
                    </h3>
                    <button
                      onClick={() => setShowUserModal(false)}
                      className="text-gray-400 hover:text-gray-500"
                    >
                      <X size={24} />
                    </button>
                  </div>
                  <div className="mt-6 max-h-[70vh] overflow-y-auto">
                    <form onSubmit={isEditing ? handleUpdateUser : handleAddUser}>
                      <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
                        <div className="sm:col-span-3">
                          <label htmlFor="username" className="block text-sm font-medium text-gray-700">
                            Username
                          </label>
                          <input
                            type="text"
                            name="username"
                            id="username"
                            value={userForm.username}

                            onChange={handleUserInputChange}
                            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                          />
                        </div>

  {/* In the User Modal form */}
<div className="sm:col-span-3">
  <label htmlFor="password" className="block text-sm font-medium text-gray-700">
    Password
  </label>
  <div className="relative mt-1">
    <input
      type={showModalPassword ? "text" : "password"}
      name="password"
      id="password"
      value={userForm.password}

      onChange={handleUserInputChange}
      className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm pr-10"
      placeholder={isEditing ? "Leave empty to keep current password" : "Enter password"}
    />
    <button
      type="button"
      onClick={() => setShowModalPassword(!showModalPassword)}
      className="absolute inset-y-0 right-0 pr-3 flex items-center"
    >
      {showModalPassword ? (
        <EyeOff size={18} className="text-gray-400 hover:text-gray-600" />
      ) : (
        <Eye size={18} className="text-gray-400 hover:text-gray-600" />
      )}
    </button>
  </div>
  {isEditing && (
    <p className="mt-1 text-xs text-gray-500">
      Leave empty to keep current password
    </p>
  )}
</div>

                        <div className="sm:col-span-3">
                          <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                            Email
                          </label>
                          <input
                            type="email"
                            name="email"
                            id="email"
                            value={userForm.email}

                            onChange={handleUserInputChange}
                            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                          />
                        </div>

                        {!isEditing && (
                          <div className="sm:col-span-3">
                            <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                              Password
                            </label>
                            <input
                              type="password"
                              name="password"
                              id="password"
                              value={userForm.password}

                              onChange={handleUserInputChange}
                              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                            />
                          </div>
                        )}

                        <div className="sm:col-span-3">
                          <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
                            Phone
                          </label>
                           <input
                            type="tel"
                            name="phone"
                            id="phone"
                             value={userForm.phone}
                            onChange={handleUserInputChange}
                            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                          />
                        </div>


                        <div className="sm:col-span-3">
                          <label htmlFor="designation" className="block text-sm font-medium text-gray-700">
                            Designation
                          </label>
                          <input
                            type="text"
                            name="designation"
                            id="designation"
                            value={userForm.designation}
                            onChange={handleUserInputChange}
                            placeholder="Enter designation"
                            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                          />
                        </div>





                        <div className="sm:col-span-3">
                          <label htmlFor="role" className="block text-sm font-medium text-gray-700">
                            Role
                          </label>
                          <select
                            id="role"
                            name="role"
                            value={userForm.role}
                            disabled={isEditing && currentUserId === loggedInUserId && currentUserRole?.toLowerCase() !== 'super_admin'}
                            onChange={handleUserInputChange}
                            className={`mt-1 block w-full bg-white border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm ${isEditing && currentUserId === loggedInUserId && currentUserRole?.toLowerCase() !== 'super_admin' ? 'bg-gray-50 opacity-70' : ''}`}
                          >
                            <option value="user">User</option>
                            <option value="admin">Admin</option>
                            <option value="div_admin">Division Admin</option>
                            {/* Only show/allow super_admin option if current user is super_admin (or you can decide policy) */}
                            {currentUserRole?.toLowerCase() === 'super_admin' && <option value="super_admin">Super Admin</option>}
                          </select>
                        </div>

                      {/* Cascading Unit → Division → Department fields */}
                        <div className="sm:col-span-2">
                          <label className="block text-sm font-medium text-gray-700">
                            Unit
                          </label>
                          <select
                             value={userForm.unit}
                             disabled={isEditing && currentUserId === loggedInUserId && currentUserRole?.toLowerCase() !== 'super_admin'}
                            onChange={(e) => handleUnitChange(e.target.value)}
                            className={`mt-1 block w-full bg-white border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm ${isEditing && currentUserId === loggedInUserId && currentUserRole?.toLowerCase() !== 'super_admin' ? 'bg-gray-50 opacity-70' : ''}`}
                          >
                            <option value="">Select Unit</option>
                            {availableUnits.map((unit, idx) => (
                              <option key={idx} value={unit}>{unit}</option>
                            ))}
                          </select>
                        </div>

                        <div className="sm:col-span-2">
                          <label className="block text-sm font-medium text-gray-700">
                            Division
                          </label>
                          <select
                             value={userForm.division}
                             disabled={isEditing && currentUserId === loggedInUserId && currentUserRole?.toLowerCase() !== 'super_admin'}
                            onChange={(e) => handleDivisionChange(e.target.value)}
                            className={`mt-1 block w-full bg-white border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm ${isEditing && currentUserId === loggedInUserId && currentUserRole?.toLowerCase() !== 'super_admin' ? 'bg-gray-50 opacity-70' : ''}`}
                          >
                            <option value="">Select Division</option>
                            {availableDivisions.map((div, idx) => (
                              <option key={idx} value={div}>{div}</option>
                            ))}
                          </select>
                        </div>

                        <div className="sm:col-span-2">
                          <label className="block text-sm font-medium text-gray-700">
                            Department
                          </label>
                          <select
                             value={userForm.department}
                             disabled={isEditing && currentUserId === loggedInUserId && currentUserRole?.toLowerCase() !== 'super_admin'}
                            onChange={(e) => handleDepartmentChange(e.target.value)}
                            className={`mt-1 block w-full bg-white border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm ${isEditing && currentUserId === loggedInUserId && currentUserRole?.toLowerCase() !== 'super_admin' ? 'bg-gray-50 opacity-70' : ''}`}
                          >
                            <option value="">Select Department</option>
                            {availableDepartments.map((dept, idx) => (
                              <option key={idx} value={dept}>{dept}</option>
                            ))}
                          </select>
                        </div>

                        <div className="sm:col-span-3">
                          <label htmlFor="status" className="block text-sm font-medium text-gray-700">
                            Status
                          </label>
                          <select
                            id="status"
                            name="status"
                             value={userForm.status}
                             disabled={isEditing && currentUserId === loggedInUserId && currentUserRole?.toLowerCase() !== 'super_admin'}
                            onChange={handleUserInputChange}
                            className={`mt-1 block w-full bg-white border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm ${isEditing && currentUserId === loggedInUserId && currentUserRole?.toLowerCase() !== 'super_admin' ? 'bg-gray-50 opacity-70' : ''}`}
                          >
                            <option value="active">Active</option>
                            <option value="inactive">Inactive</option>
                          </select>
                        </div>

                        {/* Manual Permission Selection for non-super_admin roles */}
                        {currentUserRole === 'super_admin' && userForm.role !== 'super_admin' && (
                          <div className="sm:col-span-6 mt-4 pt-4 border-t border-gray-200">
                            <h4 className="text-sm font-bold text-gray-800 mb-1">Manual Permission Selection</h4>
                            <p className="text-xs text-gray-500 italic mb-4">
                              If no manual permissions are selected, role-based defaults apply automatically.
                            </p>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                              {/* System Access Column */}
                              <div className="space-y-3">
                                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                  System Access
                                </label>
                                <div className="space-y-2 bg-gray-50 p-3 rounded-md border border-gray-200">
                                  {SYSTEM_PERMISSIONS.filter(system => {
                                    if (['subscription', 'loan', 'master'].includes(system)) return false;
                                    if (userForm.role === 'user') {
                                      return !['documentation', 'assets'].includes(system);
                                    }
                                    return true;
                                  }).map(system => (
                                    <label key={system} className="flex items-center gap-2 cursor-pointer group">
                                      <input
                                        type="checkbox"
                                        checked={isSystemActive(system)}
                                        onChange={() => toggleSystemAccess(system)}
                                        className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                                      />
                                      <span className="text-sm text-gray-700 group-hover:text-indigo-700 transition-colors">
                                        {system.charAt(0).toUpperCase() + system.slice(1).replace('_', ' ')}
                                      </span>
                                    </label>
                                  ))}
                                </div>
                              </div>

                              {/* Page Access & Actions Column (Combined) */}
                              <div className="sm:col-span-2 space-y-3">
                                <div className="flex items-center justify-between">
                                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                    Page Permissions (View / Modify)
                                  </label>
                                  <div className="flex gap-4 text-xs font-semibold text-gray-400 uppercase mr-1">
                                    <span className="w-12 text-center">View</span>
                                    <span className="w-14 text-center">Modify</span>
                                  </div>
                                </div>
                                <div className="space-y-1 bg-gray-50 p-3 rounded-md border border-gray-200 overflow-y-auto max-h-96 custom-scrollbar">
                                  {/* Render Standard Pages */}
                                  {PAGE_PERMISSION_GROUPS.filter(group => {
                                    if (userForm.role === 'user') {
                                      if (['documentation', 'subscription', 'loan', 'master', 'asset_dashboard', 'all_products'].includes(group.key)) return false;
                                    }
                                    const allowedSystems = PAGE_SYSTEM_MAP[group.key] || [];
                                    return allowedSystems.some(sys => {
                                      if (isSystemActive('documentation') && ['documentation', 'subscription', 'loan', 'master'].includes(sys)) return true;
                                      return isSystemActive(sys);
                                    });
                                  }).map(({ key, label }) => {
                                    const action = getPageAction(PAGE_SYSTEM_MAP[key]?.[0] || 'checklist', key);
                                    const hasView = action === 'view' || action === 'modify';
                                    const hasModify = action === 'modify';
                                    const module = PAGE_SYSTEM_MAP[key]?.[0] || 'checklist';

                                    return (
                                      <div key={key} className="flex items-center justify-between py-1 group border-b border-gray-100 last:border-0">
                                        <div className="flex flex-col">
                                          <span className="text-sm text-gray-700 group-hover:text-indigo-700 transition-colors font-medium">
                                            {label}
                                          </span>
                                          <span className="text-[10px] text-gray-400 uppercase">{module}</span>
                                        </div>
                                        <div className="flex gap-4 mr-1">
                                          <div className="w-12 flex justify-center">
                                            <input
                                              type="checkbox"
                                              checked={hasView}
                                              onChange={() => togglePermission(module, key, 'view')}
                                              className="rounded border-gray-300 text-blue-500 focus:ring-blue-400 h-4 w-4 cursor-pointer"
                                            />
                                          </div>
                                          <div className="w-14 flex justify-center">
                                            <input
                                              type="checkbox"
                                              checked={hasModify}
                                              onChange={() => togglePermission(module, key, 'modify')}
                                              className="rounded border-gray-300 text-purple-600 focus:ring-purple-500 h-4 w-4 cursor-pointer"
                                            />
                                          </div>
                                        </div>
                                      </div>
                                    );
                                  })}

                                  {/* Render Documentation Specific Sub-pages (Cascade) */}
                                  {userForm.role !== 'user' && isSystemActive('documentation') && (
                                    <div className="mt-4 pt-4 border-t border-gray-200">
                                      <label className="block text-[10px] font-bold text-gray-400 uppercase mb-2">
                                        Specialized Documentation Pages
                                      </label>
                                      {DOC_PAGES.map(page => {
                                        // Determine module (crude check)
                                        let module = 'documentation';
                                        if (page.startsWith('Subscription/')) module = 'subscription';
                                        if (page.startsWith('Loan/')) module = 'loan';
                                        if (page === 'Master') module = 'master';
                                        if (page === 'Settings') module = 'settings';
                                        
                                        if (module === 'settings') {
                                          if (!isSystemActive('settings')) return null;
                                        } else {
                                          const parentAction = getPageAction(module, module);
                                          if (!parentAction) return null;
                                        }

                                        const action = getPageAction(module, page);
                                        const hasView = action === 'view' || action === 'modify';
                                        const hasModify = action === 'modify';

                                        return (
                                          <div key={page} className="flex items-center justify-between py-1 group">
                                            <span className="text-sm text-gray-600 group-hover:text-indigo-700 transition-colors italic">
                                              {page}
                                            </span>
                                            <div className="flex gap-4 mr-1">
                                              <div className="w-12 flex justify-center">
                                                <input
                                                  type="checkbox"
                                                  checked={hasView}
                                                  onChange={() => togglePermission(module, page, 'view')}
                                                  className="rounded border-gray-300 text-blue-400 focus:ring-blue-300 h-4 w-4 cursor-pointer"
                                                />
                                              </div>
                                              <div className="w-14 flex justify-center">
                                                <input
                                                  type="checkbox"
                                                  checked={hasModify}
                                                  onChange={() => togglePermission(module, page, 'modify')}
                                                  className="rounded border-gray-300 text-purple-400 focus:ring-purple-300 h-4 w-4 cursor-pointer"
                                                />
                                              </div>
                                            </div>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  )}
                                </div>
                                <p className="text-xs text-gray-400">
                                  Select a system on the left to manage its pages. <span className="text-blue-500 font-semibold">View</span> only vs <span className="text-purple-600 font-semibold">Modify</span> access.
                                </p>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>


                      <div className="mt-6 flex justify-end space-x-3">
                        <button
                          type="button"
                          onClick={() => setShowUserModal(false)}
                          className="bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                        >
                          <Save size={18} className="mr-2" />
                          {isEditing ? 'Update User' : 'Save User'}
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Department Modal */}
        {showDeptModal && (
          <div className="fixed z-10 inset-0 overflow-y-auto">
            <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
              <div className="fixed inset-0 transition-opacity" aria-hidden="true">
                <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
              </div>
              <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
              <div className="inline-block align-bottom bg-white rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-3xl sm:w-full sm:p-6">
                <div>
                  <div className="flex justify-between items-center">
                    <h3 className="text-lg leading-6 font-medium text-gray-900">
                      {currentDeptId ? 'Edit Department' : 'Create New Department'}
                    </h3>
                    <button
                      onClick={() => setShowDeptModal(false)}
                      className="text-gray-400 hover:text-gray-500"
                    >
                      <X size={24} />
                    </button>
                  </div>

                  {/* Edit mode - single row form (existing behavior) */}
                  {currentDeptId ? (
                    <div className="mt-6">
                      <form onSubmit={handleUpdateDepartment}>
                        <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
                          <div className="sm:col-span-6">
                            <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                              Department Name
                            </label>
                            <input
                              type="text"
                              name="department"
                              id="department"
                              value={deptForm.department}
                              onChange={handleDeptInputChange}
                              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                            />
                          </div>
                          
                          <div className="sm:col-span-3">
                            <label htmlFor="unit" className="block text-sm font-medium text-gray-700">
                              Unit
                            </label>
                            <input
                              type="text"
                              name="unit"
                              id="unit"
                              value={deptForm.unit || ''}
                              onChange={handleDeptInputChange}
                              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                            />
                          </div>

                          <div className="sm:col-span-3">
                            <label htmlFor="division" className="block text-sm font-medium text-gray-700">
                              Division
                            </label>
                            <input
                              type="text"
                              name="division"
                              id="division"
                              value={deptForm.division || ''}
                              onChange={handleDeptInputChange}
                              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                            />
                          </div>

                          {/* Given By - Commented out for now, will be separated into its own button later */}
                          {/* <div className="sm:col-span-6">
                            <label htmlFor="givenBy" className="block text-sm font-medium text-gray-700">
                              Given By
                            </label>
                            <input
                              type="text"
                              id="givenBy"
                              name="givenBy"
                              value={deptForm.givenBy}
                              onChange={handleDeptInputChange}
                              className="mt-1 block w-full bg-white border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                              placeholder="Enter Given By"
                            />
                          </div> */}
                        </div>

                        <div className="mt-6 flex justify-end space-x-3">
                          <button
                            type="button"
                            onClick={() => setShowDeptModal(false)}
                            className="bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                          >
                            Cancel
                          </button>
                          <button
                            type="submit"
                            className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                          >
                            <Save size={18} className="mr-2" />
                            Update Department
                          </button>
                        </div>
                      </form>
                    </div>
                  ) : (
                    /* Create mode - multi-row form with Unit, Division, Department */
                    <div className="mt-6">
                      <form onSubmit={handleAddDepartment}>
                        {/* Column Headers */}
                        <div className="grid grid-cols-12 gap-3 mb-2">
                          <div className="col-span-1">
                            <span className="block text-xs font-semibold text-gray-500 uppercase">#</span>
                          </div>
                          <div className="col-span-3">
                            <span className="block text-xs font-semibold text-gray-500 uppercase">Unit</span>
                          </div>
                          <div className="col-span-3">
                            <span className="block text-xs font-semibold text-gray-500 uppercase">Division</span>
                          </div>
                          <div className="col-span-4">
                            <span className="block text-xs font-semibold text-gray-500 uppercase">Department</span>
                          </div>
                          <div className="col-span-1">
                            <span className="block text-xs font-semibold text-gray-500 uppercase"></span>
                          </div>
                        </div>

                        {/* Dynamic Rows */}
                        <div className="max-h-[50vh] overflow-y-auto space-y-3">
                          {deptRows.map((row, index) => (
                            <div key={index} className="grid grid-cols-12 gap-3 items-center bg-gray-50 p-3 rounded-lg border border-gray-200">
                              {/* Row Number */}
                              <div className="col-span-1 flex items-center justify-center">
                                <span className="text-sm font-medium text-gray-500 bg-white w-7 h-7 rounded-full flex items-center justify-center border border-gray-300">
                                  {index + 1}
                                </span>
                              </div>

                              {/* Unit */}
                              <div className="col-span-3">
                                <input
                                  type="text"
                                  value={row.unit}
                                  onChange={(e) => handleDeptRowChange(index, 'unit', e.target.value)}
                                  placeholder="Enter Unit"
                                  className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                />
                              </div>

                              {/* Division */}
                              <div className="col-span-3">
                                <input
                                  type="text"
                                  value={row.division}
                                  onChange={(e) => handleDeptRowChange(index, 'division', e.target.value)}
                                  placeholder="Enter Division"
                                  className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                />
                              </div>

                              {/* Department */}
                              <div className="col-span-4">
                                <input
                                  type="text"
                                  value={row.department}
                                  onChange={(e) => handleDeptRowChange(index, 'department', e.target.value)}
                                  placeholder="Enter Department"
                                  className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                />
                              </div>

                              {/* Remove Row Button */}
                              <div className="col-span-1 flex items-center justify-center">
                                {deptRows.length > 1 && (
                                  <button
                                    type="button"
                                    onClick={() => removeDeptRow(index)}
                                    className="text-red-400 hover:text-red-600 transition-colors"
                                    title="Remove this row"
                                  >
                                    <X size={18} />
                                  </button>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* Add Row Button */}
                        <div className="mt-3">
                          <button
                            type="button"
                            onClick={addDeptRow}
                            className="inline-flex items-center gap-1 px-3 py-2 text-sm font-medium text-purple-600 bg-purple-50 border border-purple-200 rounded-md hover:bg-purple-100 transition-colors"
                          >
                            <Plus size={16} />
                            Add Another Row
                          </button>
                        </div>

                        {/* Given By - Commented out for now, will be separated into its own button later */}
                        {/* <div className="mt-4">
                          <label htmlFor="givenBy" className="block text-sm font-medium text-gray-700">
                            Given By
                          </label>
                          <input
                            type="text"
                            id="givenBy"
                            name="givenBy"
                            value={deptForm.givenBy}
                            onChange={handleDeptInputChange}
                            className="mt-1 block w-full bg-white border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                            placeholder="Enter Given By"
                          />
                        </div> */}

                        {/* Submit / Cancel Buttons */}
                        <div className="mt-6 flex justify-end space-x-3">
                          <button
                            type="button"
                            onClick={() => setShowDeptModal(false)}
                            className="bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                          >
                            Cancel
                          </button>
                          <button
                            type="submit"
                            className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                          >
                            <Save size={18} className="mr-2" />
                            Submit
                          </button>
                        </div>
                      </form>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Task Delegation Modal */}
        {showDelegationModal && (
          <div className="fixed z-10 inset-0 overflow-y-auto">
            <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
              <div className="fixed inset-0 transition-opacity" aria-hidden="true">
                <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
              </div>
              <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
              <div className="inline-block align-bottom bg-white rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full sm:p-6">
                <div>
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg leading-6 font-medium text-gray-900">
                      Delegate Tasks
                    </h3>
                    <button
                      onClick={() => {
                        setShowDelegationModal(false);
                        setSelectedDoer('');
                      }}
                      className="text-gray-400 hover:text-gray-500"
                    >
                      <X size={24} />
                    </button>
                  </div>
                  <div className="mt-4">
                    <div className="space-y-4">
                      {/* Task Category Selection */}
                      <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Task Category <span className="text-red-500">*</span>
                        </label>
                        <div className="flex gap-4">
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="radio"
                              name="bulkLeaveCategory"
                              value="Checklist"
                              checked={bulkLeaveCategory === 'Checklist'}
                              onChange={(e) => setBulkLeaveCategory(e.target.value)}
                              className="text-purple-600 focus:ring-purple-500"
                            />
                            <span className="text-sm text-gray-700">Checklist</span>
                          </label>
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="radio"
                              name="bulkLeaveCategory"
                              value="Maintenance"
                              checked={bulkLeaveCategory === 'Maintenance'}
                              onChange={(e) => setBulkLeaveCategory(e.target.value)}
                              className="text-purple-600 focus:ring-purple-500"
                            />
                            <span className="text-sm text-gray-700">Maintenance</span>
                          </label>
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Leave Start Date <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="date"
                          value={leaveStartDate}
                          onChange={(e) => setLeaveStartDate(e.target.value)}
                          className="w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-purple-500 focus:border-purple-500 text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Leave End Date <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="date"
                          value={leaveEndDate}
                          onChange={(e) => setLeaveEndDate(e.target.value)}
                          className="w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-purple-500 focus:border-purple-500 text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Delegate To (Doer Name) <span className="text-red-500">*</span>
                        </label>
                        <div className="relative">
                          <input
                            type="text"
                            list="bulkDoerOptions"
                            placeholder="Search or select a doer..."
                            value={selectedDoer}
                            onChange={(e) => setSelectedDoer(e.target.value)}
                            className="w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-purple-500 focus:border-purple-500 text-sm"
                          />
                          <datalist id="bulkDoerOptions">
                            {availableDoersForLeave.map((name, index) => (
                              <option key={index} value={name} />
                            ))}
                          </datalist>
                        </div>
                      </div>
                      <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
                        <p className="text-xs text-blue-800">
                          <strong>Note:</strong> Tasks from the selected date range will be transferred to the delegation system and assigned to the selected doer.
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="mt-5 sm:mt-6 flex gap-3 justify-end">
                    <button
                      type="button"
                      onClick={() => {
                        setShowDelegationModal(false);
                        setSelectedDoer('');
                      }}
                      className="inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 sm:text-sm"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleConfirmDelegation}
                      className="inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-purple-600 text-base font-medium text-white hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 sm:text-sm"
                    >
                      Submit Delegation
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Leave Transfer Popup Modal */}
        {showLeavePopup && currentLeaveUser && (
          <div className="fixed z-10 inset-0 overflow-y-auto" aria-labelledby="leave-transfer-modal" role="dialog" aria-modal="true">
            <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
              <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" aria-hidden="true" onClick={() => {
                setShowLeavePopup(false);
                setCurrentLeaveUser(null);
                setSelectedUsers([]);
              }}></div>
              
              <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
              
              <div className="inline-block align-bottom bg-white rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full sm:p-6">
                <div>
                  <div className="flex justify-between items-center">
                    <h3 className="text-lg leading-6 font-medium text-gray-900">
                      Transfer Tasks for {currentLeaveUser.user_name}
                    </h3>
                    <button
                      onClick={() => {
                        setShowLeavePopup(false);
                        setCurrentLeaveUser(null);
                        setSelectedUsers([]);
                      }}
                      className="text-gray-400 hover:text-gray-500"
                    >
                      <X size={24} />
                    </button>
                  </div>
                  <div className="mt-4">
                    <div className="space-y-4">
                      {/* Task Category Selection */}
                      <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Task Category <span className="text-red-500">*</span>
                        </label>
                        <div className="flex gap-4">
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="radio"
                              name="popupLeaveCategory"
                              value="Checklist"
                              checked={popupLeaveCategory === 'Checklist'}
                              onChange={(e) => setPopupLeaveCategory(e.target.value)}
                              className="text-purple-600 focus:ring-purple-500"
                            />
                            <span className="text-sm text-gray-700">Checklist</span>
                          </label>
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="radio"
                              name="popupLeaveCategory"
                              value="Maintenance"
                              checked={popupLeaveCategory === 'Maintenance'}
                              onChange={(e) => setPopupLeaveCategory(e.target.value)}
                              className="text-purple-600 focus:ring-purple-500"
                            />
                            <span className="text-sm text-gray-700">Maintenance</span>
                          </label>
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Leave Start Date <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="date"
                          value={popupLeaveStartDate}
                          onChange={(e) => setPopupLeaveStartDate(e.target.value)}
                          className="w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-purple-500 focus:border-purple-500 sm:text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Leave End Date <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="date"
                          value={popupLeaveEndDate}
                          onChange={(e) => setPopupLeaveEndDate(e.target.value)}
                          className="w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-purple-500 focus:border-purple-500 sm:text-sm"
                        />
                      </div>
                      
                      {/* Tasks Table Section */}
                      {popupLeaveStartDate && popupLeaveEndDate && (
                        <div className="mt-4">
                          {isLoadingTasks ? (
                            <div className="text-center py-4">
                              <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-purple-500 mb-2"></div>
                              <p className="text-sm text-gray-600">Loading tasks...</p>
                            </div>
                          ) : fetchError ? (
                            <div className="bg-red-50 border border-red-200 rounded-md p-3">
                              <p className="text-sm text-red-800">{fetchError}</p>
                            </div>
                          ) : userTasks.length === 0 ? (
                            <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3">
                              <p className="text-sm text-yellow-800">No tasks found for {currentLeaveUser.user_name} in the selected date range.</p>
                            </div>
                          ) : (
                            <div>
                              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4 bg-purple-50 p-3 rounded-lg border border-purple-100">
                                <h4 className="text-sm font-bold text-purple-800">
                                  Tasks to Assign ({userTasks.length})
                                </h4>
                                
                                <div className="flex items-center gap-2 w-full sm:w-auto">
                                  <label className="text-xs font-semibold text-purple-700 whitespace-nowrap">Bulk Assign To:</label>
                                  <div className="relative flex-1 sm:w-48">
                                    <input
                                      type="text"
                                      list="bulkPopupDoerOptions"
                                      placeholder="Select doer for all..."
                                      value={bulkPopupDoer}
                                      onChange={(e) => handleBulkPopupAssignment(e.target.value)}
                                      className="w-full text-xs border border-purple-200 rounded-md shadow-sm py-1.5 px-3 focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white"
                                    />
                                    <datalist id="bulkPopupDoerOptions">
                                      {popupAvailableDoers.map((name, index) => (
                                        <option key={index} value={name} />
                                      ))}
                                    </datalist>
                                  </div>
                                </div>
                              </div>
                              <div className="border border-gray-300 rounded-md overflow-hidden shadow-sm">
                                <div className="max-h-64 overflow-y-auto custom-scrollbar">
                                  <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-gray-50 sticky top-0 z-10">
                                      <tr>
                                        <th className="px-3 py-2.5 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Task ID</th>
                                        <th className="px-3 py-2.5 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Description</th>
                                        <th className="px-3 py-2.5 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Date</th>
                                        <th className="px-3 py-2.5 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Assign To <span className="text-red-500">*</span></th>
                                      </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                      {userTasks.map((task) => (
                                        <tr key={task.task_id} className="hover:bg-gray-50 transition-colors">
                                          <td className="px-3 py-2.5 text-xs font-medium text-gray-600">{task.task_id}</td>
                                          <td className="px-3 py-2.5 text-xs text-gray-900" title={task.task_description}>
                                            <div className="max-w-xs truncate">{task.task_description}</div>
                                          </td>
                                          <td className="px-3 py-2.5 text-xs text-gray-900">
                                            {task.task_start_date ? new Date(task.task_start_date).toLocaleDateString() : '-'}
                                          </td>
                                          <td className="px-3 py-2.5">
                                            <div className="relative">
                                              <input
                                                type="text"
                                                list={`doerOptions-${task.task_id}`}
                                                placeholder="Search user..."
                                                value={taskAssignments[task.task_id] || ''}
                                                onChange={(e) => handleTaskAssignment(task.task_id, e.target.value)}
                                                className="w-full text-xs border border-gray-300 rounded-md shadow-sm py-1.5 px-3 focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-purple-500"
                                              />
                                              <datalist id={`doerOptions-${task.task_id}`}>
                                                {popupAvailableDoers.map((name, index) => (
                                                  <option key={index} value={name} />
                                                ))}
                                              </datalist>
                                            </div>
                                          </td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Shift Doer Name field removed - now using individual task assignments */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Remarks
                        </label>
                        <textarea
                          value={popupRemarks}
                          onChange={(e) => setPopupRemarks(e.target.value)}
                          placeholder="Enter remarks (optional)"
                          rows="3"
                          className="w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-purple-500 focus:border-purple-500 sm:text-sm"
                        />
                      </div>
                      <div className="bg-purple-50 border border-purple-200 rounded-md p-3">
                        <p className="text-xs text-purple-800">
                          <strong>Note:</strong> All listed tasks will be transferred to the selected doers in the delegation system for the chosen date range. Unassigned tasks will not be transferred.
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="mt-5 sm:mt-6 flex gap-3 justify-end">
                    <button
                      type="button"
                      onClick={() => {
                        setShowLeavePopup(false);
                        setCurrentLeaveUser(null);
                        setSelectedUsers([]);
                      }}
                      className="inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 sm:text-sm"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleLeaveTransferSubmit}
                      className="inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-purple-600 text-base font-medium text-white hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 sm:text-sm"
                    >
                      Transfer Tasks
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}


      {toast.show && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast({ ...toast, show: false })}
        />
      )}
      </div>
    </AdminLayout>
  );
};

export default Setting;










// <div className="space-y-8">
//   {/* Header and Tabs */}
//   <div className="my-5">
//     {/* Header */}
//     <div className="flex justify-between items-center mb-6">
//       <h1 className="text-xl md:text-2xl font-bold text-purple-600">User Management System</h1>
//     </div>

//     {/* Tabs and Add Button Container */}
//     <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
//       {/* Tabs */}
//       <div className="flex border border-purple-200 rounded-md overflow-hidden self-start w-full sm:w-auto">
//         <button
//           className={`flex flex-1 justify-center items-center px-3 py-2 md:px-4 md:py-3 text-sm font-medium ${activeTab === 'users' ? 'bg-purple-600 text-white' : 'bg-white text-purple-600 hover:bg-purple-50'}`}
//           onClick={() => {
//             handleTabChange('users');
//             dispatch(userDetails());
//           }}
//         >
//           <User size={16} className="mr-1 md:mr-2" />
//           <span className="hidden xs:inline">Users</span>
//         </button>
//         <button
//           className={`flex flex-1 justify-center items-center px-3 py-2 md:px-4 md:py-3 text-sm font-medium ${activeTab === 'departments' ? 'bg-purple-600 text-white' : 'bg-white text-purple-600 hover:bg-purple-50'}`}
//           onClick={() => {
//             handleTabChange('departments');
//             dispatch(departmentOnlyDetails());
//             dispatch(givenByDetails());
//           }}
//         >
//           <Building size={16} className="mr-1 md:mr-2" />
//           <span className="hidden xs:inline">Departments</span>
//         </button>
//         <button
//           className={`flex flex-1 justify-center items-center px-3 py-2 md:px-4 md:py-3 text-sm font-medium ${activeTab === 'leave' ? 'bg-purple-600 text-white' : 'bg-white text-purple-600 hover:bg-purple-50'}`}
//           onClick={() => {
//             handleTabChange('leave');
//             dispatch(userDetails());
//           }}
//         >
//           <Calendar size={16} className="mr-1 md:mr-2" />
//           <span className="hidden xs:inline">Leave</span>
//         </button>
//       </div>

//       {/* Add button - hide for leave tab */}
//       {activeTab !== 'leave' && (
//         <button
//           onClick={handleAddButtonClick}
//           className="rounded-md gradient-bg py-2 px-3 md:px-4 text-white hover:from-blue-600 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 w-full sm:w-auto"
//         >
//           <div className="flex items-center justify-center">
//             <Plus size={16} className="mr-1 md:mr-2" />
//             <span className="text-sm">
//               {activeTab === 'users' ? 'Add User' : 'Add Department'}
//             </span>
//           </div>
//         </button>
//       )}
//     </div>
//   </div>
