import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from "react-router-dom"
import { useState } from "react"
import { Toaster } from "react-hot-toast"
import { useSelector } from "react-redux"
import LoginPage from "./pages/LoginPage"
import AdminDashboard from "./pages/admin/Dashboard"
import AdminAssignTask from "./pages/admin/AssignTask"
import UserAssignTask from "./pages/user/AssignTaskUser"
import DataPage from "./pages/admin/DataPage"
import AdminDataPage from "./pages/admin/admin-data-page"
import AccountDataPage from "./pages/delegation"
import QuickTask from "./pages/QuickTask"
import AdminDelegationTask from "./pages/delegation-data"
import "./index.css"
import Demo from "./pages/user/Demo"
import Setting from "./pages/Setting"
import WorkingDate from "./pages/WorkingDate"
import MisReport from "./pages/MisReport"
import HistoryPage from "./pages/admin/HistoryPage"
import TrainingVideoPage from "./pages/admin/TrainingVideoPage"
import CalendarPage from "./pages/admin/CalendarPage"
import HolidayManagementPage from "./pages/admin/HolidayManagementPage"
import EquipmentHistory from "./pages/admin/EquipmentHistory"
import RealtimeLogoutListener from "./components/RealtimeLogoutListener"   // ✅ Added listener
import { hasPageAccess, getDefaultDashboardRoute } from "./utils/permissionUtils"

import AdminLayout from "./components/layout/AdminLayout.jsx"
import useAuthStore from "./store/authStore";
import { useEffect } from "react";

// Documentation Module Imports
import DocDashboard from "./pages/doc-sub/Dashboard";
import DocResourceManager from "./pages/doc-sub/ResourceManager";
import DocSettings from "./pages/doc-sub/Settings";

import AllDocuments from "./pages/doc-sub/document/AllDocuments";
import DocumentRenewal from "./pages/doc-sub/document/Renewal";
import SharedDocuments from "./pages/doc-sub/document/Shared";

import AllSubscriptions from "./pages/doc-sub/subscription/AllSubscriptions";
import SubscriptionApproval from "./pages/doc-sub/subscription/Approval";
import SubscriptionPayment from "./pages/doc-sub/subscription/Payment";
import SubscriptionRenewal from "./pages/doc-sub/subscription/Renewal";

import AllLoans from "./pages/doc-sub/loan/AllLoans";
import LoanForeclosure from "./pages/doc-sub/loan/Foreclosure";
import LoanNOC from "./pages/doc-sub/loan/NOC";

import MasterPage from "./pages/doc-sub/master/MasterPage";

// Asset Module Imports
import AssetDashboard from "./pages/asset/Dashboard";
import AssetAllProducts from "./pages/asset/AllProducts";
import AssetProductView from "./pages/asset/ProductView";


// import PaymentRequestForm from "./pages/doc-sub/payment/RequestForm";
// import PaymentApproval from "./pages/doc-sub/payment/PaymentApproval";
// import MakePayment from "./pages/doc-sub/payment/MakePayment";
// import TallyEntry from "./pages/doc-sub/payment/TallyEntry";

import AccountTallyData from "./pages/doc-sub/account/TallyData";
import AccountAudit from "./pages/doc-sub/account/Audit";
import AccountRectify from "./pages/doc-sub/account/Rectify";
import AccountBillFiled from "./pages/doc-sub/account/BillFiled";
import RepairDashboard from "./pages/repair/repairDashboard";
import RequestForm from "./pages/repair/requestForm";
import PendingRequest from "./pages/repair/pendingRequest";
import RequestApproval from "./pages/repair/requestApproval";

// Auth wrapper component to protect routes
const ProtectedRoute = ({ children, page }) => {
  const username = localStorage.getItem("user-name")
  const location = useLocation()

  // If no user is logged in, redirect to login and save current location
  if (!username) {
    return <Navigate to="/login" replace state={{ from: location }} />
  }

  // Permission check
  if (page && !hasPageAccess(page)) {
    const defaultRoute = getDefaultDashboardRoute();
    
    // If the default route is the same as current route, we have a loop.
    // Break the loop by redirecting to login.
    if (defaultRoute === location.pathname) {
       console.error("Redirection loop detected. Redirecting to login.");
       return <Navigate to="/login" replace />;
    }

    // Special handling for the main dashboard entry point
    if (page === "dashboard" && defaultRoute === "/dashboard/admin") {
       return <Navigate to="/login" replace />;
    }

    return <Navigate to={defaultRoute} replace />;
  }

  return children
}

// Layout wrapper for Doc Module components
const DocLayout = ({ children }) => {
  const { fetchMe, currentUser } = useAuthStore();
  
  useEffect(() => {
    // Sync with localStorage first (done automatically in authStore now)
    // Then fetch full permissions from doc-sub backend
    if (localStorage.getItem('user-name')) {
      fetchMe();
    }
  }, [fetchMe]);

  return <AdminLayout>{children}</AdminLayout>;
};

const AssignTaskRouter = () => {
  const reduxUserData = useSelector((state) => state.login.userData);
  const role = (reduxUserData && !Array.isArray(reduxUserData))
    ? reduxUserData.role
    : localStorage.getItem('role');

  return (role === 'admin' || role === 'super_admin' || role === 'div_admin') 
    ? <AdminAssignTask /> 
    : <UserAssignTask />;
}

function App() {
  return (
    <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      {/* ✅ Add Toaster for global notifications */}
      <Toaster position="top-center" reverseOrder={false} />
      
      {/* ✅ Realtime listener inside Router so useNavigate works */}
      <RealtimeLogoutListener />

      <Routes>
        {/* Root redirect */}
        <Route path="/" element={<Navigate to="/login" replace />} />

        {/* Login route */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/demo" element={<Demo />} />

        {/* Dashboard redirect */}
        <Route path="/dashboard" element={<Navigate to="/dashboard/admin" replace />} />

        {/* Admin & User Dashboard route */}
        <Route
          path="/dashboard/admin"
          element={
            <ProtectedRoute page="dashboard">
              <AdminDashboard />
            </ProtectedRoute>
          }
        />

        {/* Documentation Module Routes */}
        <Route
          path="/document"
          element={
            <ProtectedRoute page="documentation">
              <DocLayout><AllDocuments /></DocLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/document/all"
          element={
            <ProtectedRoute page="documentation">
              <DocLayout><AllDocuments /></DocLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/document/renewal"
          element={
            <ProtectedRoute page="document_renewal">
              <DocLayout><DocumentRenewal /></DocLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/document/shared"
          element={
            <ProtectedRoute page="document_shared">
              <DocLayout><SharedDocuments /></DocLayout>
            </ProtectedRoute>
          }
        />

        {/* Subscription Routes */}
        <Route
          path="/subscription"
          element={
            <ProtectedRoute page="subscription">
              <DocLayout><AllSubscriptions /></DocLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/subscription/all"
          element={
            <ProtectedRoute page="subscription">
              <DocLayout><AllSubscriptions /></DocLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/subscription/approval"
          element={
            <ProtectedRoute page="subscription_approval">
              <DocLayout><SubscriptionApproval /></DocLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/subscription/payment"
          element={
            <ProtectedRoute page="subscription_payment">
              <DocLayout><SubscriptionPayment /></DocLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/subscription/renewal"
          element={
            <ProtectedRoute page="subscription_renewal">
              <DocLayout><SubscriptionRenewal /></DocLayout>
            </ProtectedRoute>
          }
        />

        {/* Loan Routes */}
        <Route
          path="/loan/all"
          element={
            <ProtectedRoute page="loan">
              <DocLayout><AllLoans /></DocLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/loan/foreclosure"
          element={
            <ProtectedRoute page="loan_foreclosure">
              <DocLayout><LoanForeclosure /></DocLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/loan/noc"
          element={
            <ProtectedRoute page="loan_noc">
              <DocLayout><LoanNOC /></DocLayout>
            </ProtectedRoute>
          }
        />

        {/* Other Doc Module Routes */}
        <Route
          path="/doc-sub/dashboard"
          element={
            <ProtectedRoute page="documentation">
              <DocLayout><DocDashboard /></DocLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/doc-sub/resource-manager"
          element={
            <ProtectedRoute page="resource_manager">
              <DocLayout><DocResourceManager /></DocLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/master"
          element={
            <ProtectedRoute page="master">
              <DocLayout><MasterPage /></DocLayout>
            </ProtectedRoute>
          }
        />

        {/* Payment Routes */}
        {/* <Route
          path="/payment/request-form"
          element={
            <ProtectedRoute page="payment_request">
              <DocLayout><PaymentRequestForm /></DocLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/payment/approval"
          element={
            <ProtectedRoute page="payment_approval">
              <DocLayout><PaymentApproval /></DocLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/payment/make-payment"
          element={
            <ProtectedRoute page="payment_make">
              <DocLayout><MakePayment /></DocLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/payment/tally-entry"
          element={
            <ProtectedRoute page="payment_tally">
              <DocLayout><TallyEntry /></DocLayout>
            </ProtectedRoute>
          }
        /> */}

        {/* Account Routes */}
        <Route
          path="/account/tally-data"
          element={
            <ProtectedRoute page="account">
              <DocLayout><AccountTallyData /></DocLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/account/audit"
          element={
            <ProtectedRoute page="account">
              <DocLayout><AccountAudit /></DocLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/account/rectify"
          element={
            <ProtectedRoute page="account">
              <DocLayout><AccountRectify /></DocLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/account/bill-filed"
          element={
            <ProtectedRoute page="account">
              <DocLayout><AccountBillFiled /></DocLayout>
            </ProtectedRoute>
          }
        />

        {/* Repair Module Routes */}
        <Route
          path="/repair/dashboard"
          element={
            <ProtectedRoute page="repair_dashboard">
              <RepairDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/repair/request-form"
          element={
            <ProtectedRoute page="repair_request_form">
              <RequestForm />
            </ProtectedRoute>
          }
        />
        <Route
          path="/repair/pending-request"
          element={
            <ProtectedRoute page="repair_pending_request">
              <PendingRequest />
            </ProtectedRoute>
          }
        />
        <Route
          path="/repair/request-approval"
          element={
            <ProtectedRoute page="repair_request_approval">
              <RequestApproval />
            </ProtectedRoute>
          }
        />

        {/* Asset Management Routes */}
        <Route
          path="/asset/dashboard"
          element={
            <ProtectedRoute page="asset_dashboard">
              <AdminLayout><AssetDashboard /></AdminLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/asset/products"
          element={
            <ProtectedRoute page="all_products">
              <AdminLayout><AssetAllProducts /></AdminLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/asset/product/:productId"
          element={
            <ProtectedRoute page="all_products">
              <AdminLayout><AssetProductView /></AdminLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/dashboard/quick-task"
          element={
            <ProtectedRoute page="quick_task">
              <QuickTask />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard/working-date"
          element={
            <ProtectedRoute page="working_date">
              <WorkingDate />
            </ProtectedRoute>
          }
        />

        {/* Assign Task route - reactive role check via Redux */}
        <Route
          path="/dashboard/assign-task"
          element={
            <ProtectedRoute page="assign_task">
              <AssignTaskRouter />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard/delegation-task"
          element={
            <ProtectedRoute page="delegation_task">
              <AdminDelegationTask />
            </ProtectedRoute>
          }
        />

        {/* Delegation route for user */}
        <Route
          path="/dashboard/delegation"
          element={
            <ProtectedRoute page="delegation">
              <AccountDataPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/dashboard/setting"
          element={
            <ProtectedRoute page="settings">
              <Setting />
            </ProtectedRoute>
          }
        />

        <Route
          path="/dashboard/mis-report"
          element={
            <ProtectedRoute page="mis_report">
              <MisReport />
            </ProtectedRoute>
          }
        />

        {/* Training Video page route */}
        <Route
          path="/dashboard/training-video"
          element={
            <ProtectedRoute page="training_video">
              <TrainingVideoPage />
            </ProtectedRoute>
          }
        />

        {/* History page route */}
        <Route
          path="/dashboard/history"
          element={
            <ProtectedRoute page="admin_approval">
              <HistoryPage />
            </ProtectedRoute>
          }
        />

        {/* Calendar page route */}
        <Route
          path="/dashboard/calendar"
          element={
            <ProtectedRoute page="calendar">
              <CalendarPage />
            </ProtectedRoute>
          }
        />

        {/* Holiday Management page route */}
        <Route
          path="/dashboard/holidays"
          element={
            <ProtectedRoute page="holiday_management">
              <HolidayManagementPage />
            </ProtectedRoute>
          }
        />

        {/* Equipment History Register page route */}
        <Route
          path="/dashboard/equipment-history"
          element={
            <ProtectedRoute>
              <AdminLayout><EquipmentHistory /></AdminLayout>
            </ProtectedRoute>
          }
        />

        {/* Data routes */}
        <Route
          path="/dashboard/data/:category"
          element={
            <ProtectedRoute page="pending_task">
              <DataPage />
            </ProtectedRoute>
          }
        />

        {/* Specific route for Admin Data Page */}
        <Route
          path="/dashboard/data/admin"
          element={
            <ProtectedRoute page="admin_data">
              <AdminDataPage />
            </ProtectedRoute>
          }
        />

        {/* Backward compatibility redirects */}
        <Route path="/admin/*" element={<Navigate to="/dashboard/admin" replace />} />
        <Route path="/admin/dashboard" element={<Navigate to="/dashboard/admin" replace />} />
        <Route path="/admin/quick" element={<Navigate to="/dashboard/quick-task" replace />} />
        <Route path="/admin/assign-task" element={<Navigate to="/dashboard/assign-task" replace />} />
        <Route path="/admin/delegation-task" element={<Navigate to="/dashboard/delegation-task" replace />} />
        <Route path="/admin/mis-report" element={<Navigate to="/dashboard/mis-report" replace />} />
        <Route path="/admin/data/:category" element={<Navigate to="/dashboard/data/:category" replace />} />
        <Route path="/user/*" element={<Navigate to="/dashboard/admin" replace />} />
        

        {/* Standalone Product Passport Page (Accessible via QR) */}
        <Route path="/product/:productId" element={<AssetProductView />} />
        
        {/* Default route */}
        <Route path="*" element={<Navigate to="/dashboard/admin" replace />} />
      </Routes>
    </Router>
  )
}

export default App
