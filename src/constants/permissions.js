export const SYSTEM_PERMISSIONS = [
  "checklist",
  "maintenance",
  "documentation",
  "subscription",
  "loan",
  "master",
  "settings",
  "assets",
  "repair"
];

export const PAGE_PERMISSIONS = [
  "dashboard",
  "assign_task",
  "delegation",
  "quick_task",
  "settings",
  "holiday_management",
  "admin_data",
  "pending_task",
  "calendar",
  "admin_approval",
  "documentation",
  "subscription",
  "loan",
  "master",
  "resource_manager",
  "asset_dashboard",
  "all_products",
  "repair_dashboard",
  "repair_request_form",
  "repair_pending_request",
  "repair_request_approval",
  "repair_setting",
  "working_date",
  "loan_foreclosure",
  "loan_noc"
];

// Used by the manual View/Modify permission UI (super_admin only)
export const PAGE_PERMISSION_GROUPS = [
  { key: "dashboard",         label: "Dashboard" },
  { key: "assign_task",       label: "Assign Task" },
  { key: "delegation",        label: "Delegation" },
  { key: "quick_task",        label: "Quick Task" },
  { key: "settings",          label: "Settings" },
  { key: "pending_task",      label: "Pending Task" },
  { key: "calendar",          label: "Calendar" },
  { key: "holiday_management",label: "Holiday Management" },
  { key: "admin_data",        label: "Admin Data" },
  { key: "admin_approval",    label: "Admin Approval" },
  { key: "documentation",     label: "Documentation" },
  { key: "subscription",      label: "Subscription" },
  { key: "loan",              label: "Loan" },
  { key: "master",            label: "Master" },
  { key: "resource_manager",  label: "Resource Manager" },
  { key: "asset_dashboard",   label: "Asset Dashboard" },
  { key: "all_products",      label: "All Products" },
  { key: "repair_dashboard",   label: "Repair Dashboard" },
  { key: "repair_request_form", label: "Repair Request Form" },
  { key: "repair_pending_request", label: "Repair Pending Request" },
  { key: "repair_request_approval", label: "Repair Request Approval" },
  { key: "working_date", label: "Working Date" },
  { key: "loan_foreclosure", label: "Loan Foreclosure" },
  { key: "loan_noc", label: "Loan NOC" },
];

// Maps UI modules (checklist, maintenance, etc.) to system_access features
export const MODULE_FEATURE_MAP = {
  "checklist": "checklist",
  "maintenance": "maintenance",
  "delegation": "checklist"
};

// Maps specific pages to system features for permission UI filtering
export const PAGE_SYSTEM_MAP = {
  "dashboard": ["checklist", "maintenance"],
  "assign_task": ["checklist", "maintenance"],
  "delegation": ["checklist"],
  "quick_task": ["checklist"],
  "settings": ["settings"],
  "pending_task": ["checklist", "maintenance"],
  "calendar": ["checklist", "maintenance"],
  "holiday_management": ["checklist", "maintenance"],
  "admin_data": ["checklist", "maintenance"],
  "admin_approval": ["checklist", "maintenance"],
  "documentation": ["documentation"],
  "subscription": ["subscription"],
  "loan": ["loan"],
  "master": ["master"],
  "resource_manager": ["documentation"],
  "asset_dashboard": ["assets"],
  "all_products": ["assets"],
  "repair_dashboard": ["repair"],
  "repair_request_form": ["repair"],
  "repair_pending_request": ["repair"],
  "repair_request_approval": ["repair"],
  "repair_setting": ["repair"],
  "working_date": ["checklist"]
};

export const DOC_SYSTEMS = [
  "subscription",
  "document",
  "loan"
];

// Documentation & Subscription Page Permissions (as stored in subscription_access_system)
export const DOC_PAGES = [
  "Dashboard",
  "Subscription/Payment",
  "Subscription/All",
  "Subscription/Approval",
  "Subscription/Renewal",
  "Document/All",
  "Document/Shared",
  "Document/Renewal",
  "Loan/NOC",
  "Loan/Foreclosure",
  "Loan/All",
  "Master",
  "Settings",
  "Resource Manager"
];

// Map sidebar page keys to DOC_PAGES identifiers
export const DOC_PAGE_MAP = {
  "documentation": "Dashboard", // Main dashboard maps to Dashboard in JSON
  "resource_manager": "Resource Manager",
  "subscription": "Subscription/All", // General subscription maps to All
  "loan": "Loan/All",
  "master": "Master",
  "settings": "Settings",
  "document_renewal": "Document/Renewal",
  "subscription_renewal": "Subscription/Renewal",
  "document_shared": "Document/Shared",
  "subscription_approval": "Subscription/Approval",
  "subscription_payment": "Subscription/Payment",
  "loan_foreclosure": "Loan/Foreclosure",
  "loan_noc": "Loan/NOC"
};
