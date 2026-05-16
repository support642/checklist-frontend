// // import supabase from "../../SupabaseClient";
import { authFetch } from "../../utils/authFetch";



// export const fetchUserDetailsApi = async () => {
//   try {
//     const response = await authFetch("http://localhost:5050/api/settings/users");
//     const data = await response.json();
//     return data;
//   } catch (error) {
//     console.log("Error fetching users", error);
//     return [];
//   }
// };



// // export const fetchUserDetailsApi = async () => {
// //   try {
// //     const { data, error } = await supabase
// //       .from("users")
// //       .select('*, user_access, leave_date, leave_end_date, remark') // Add leave_end_date
// //       .not("user_name", "is", null)
// //       .neq("user_name", "");

// //     if (error) {
// //       console.log("Error when fetching data", error);
// //       return [];
// //     }

// //     console.log("Fetched successfully", data);
// //     return data;
// //   } catch (error) {
// //     console.log("Error from Supabase", error);
// //     return [];
// //   }
// // };

// export const fetchDepartmentDataApi = async () => {
//   try {
//     const res = await authFetch("http://localhost:5050/api/settings/departments");
//     return await res.json();
//   } catch (error) {
//     console.log("Error fetching departments", error);
//     return [];
//   }
// };




// export const createUserApi = async (newUser) => {
//   try {
//     const res = await authFetch("http://localhost:5050/api/settings/users", {
//       method: "POST",
//       headers: { "Content-Type": "application/json" },
//       body: JSON.stringify(newUser)
//     });

//     const data = await res.json();
//     return data;
//   } catch (error) {
//     console.log("Error creating user", error);
//   }
// };


// export const updateUserDataApi = async ({ id, updatedUser }) => {
//   try {
//     const res = await authFetch(`http://localhost:5050/api/settings/users/${id}`, {
//       method: "PUT",
//       headers: { "Content-Type": "application/json" },
//       body: JSON.stringify(updatedUser)
//     });

//     return await res.json();
//   } catch (error) {
//     console.log("Error updating user", error);
//   }
// };



// export const createDepartmentApi = async (newDept) => {
//   try {
//     const res = await authFetch("http://localhost:5050/api/settings/departments", {
//       method: "POST",
//       headers: { "Content-Type": "application/json" },
//       body: JSON.stringify(newDept)
//     });

//     return await res.json();
//   } catch (error) {
//     console.log("Error adding department", error);
//   }
// };


// export const updateDepartmentDataApi = async ({ id, updatedDept }) => {
//   try {
//     const res = await authFetch(`http://localhost:5050/api/settings/departments/${id}`, {
//       method: "PUT",
//       headers: { "Content-Type": "application/json" },
//       body: JSON.stringify(updatedDept)
//     });

//     return await res.json();
//   } catch (error) {
//     console.log("Error updating department", error);
//   }
// };



// export const deleteUserByIdApi = async (id) => {
//   try {
//     await authFetch(`http://localhost:5050/api/settings/users/${id}`, {
//       method: "DELETE",
//     });
//   } catch (error) {
//     console.log("Error deleting user", error);
//   }
// };




// // In your settingApi.js file, add these functions:






// Dynamic Base URL for settings APIs
const BASE_URL = `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5050/api'}/settings`;

// =======================================================
// 1️⃣ FETCH USERS
// =======================================================
export const fetchUserDetailsApi = async (page = 1, limit = 50, search = '', requesterContext = {}) => {
  try {
    let url = `${BASE_URL}/users?page=${page}&limit=${limit}`;
    if (search) {
      url += `&search=${encodeURIComponent(search)}`;
    }
    
    // Add role-based filtering context
    const { requesterRole, requesterUnit, requesterDivision, requesterDepartment } = requesterContext;
    if (requesterRole) url += `&requesterRole=${encodeURIComponent(requesterRole)}`;
    if (requesterUnit) url += `&requesterUnit=${encodeURIComponent(requesterUnit)}`;
    if (requesterDivision) url += `&requesterDivision=${encodeURIComponent(requesterDivision)}`;
    if (requesterDepartment) url += `&requesterDepartment=${encodeURIComponent(requesterDepartment)}`;

    const response = await authFetch(url);
    return await response.json();
  } catch (error) {
    console.log("Error fetching users", error);
    return { users: [], totalCount: 0 };
  }
};

// =======================================================
// 2️⃣ FETCH DEPARTMENTS
// =======================================================
export const fetchDepartmentDataApi = async () => {
  try {
    const response = await authFetch(`${BASE_URL}/departments`);
    return await response.json();
  } catch (error) {
    console.log("Error fetching departments", error);
    return [];
  }
};


// =======================================================
// 3️⃣ CREATE USER
// =======================================================
export const createUserApi = async (newUser) => {
  try {
    const response = await authFetch(`${BASE_URL}/users`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newUser),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("❌ createUserApi server error:", data);
      throw new Error(data.message || data.detail || data.error || `Server error ${response.status}`);
    }

    return data;
  } catch (error) {
    console.error("Error creating user:", error.message);
    throw error;
  }
};

// =======================================================
// 4️⃣ UPDATE USER
// =======================================================
export const updateUserDataApi = async ({ id, updatedUser }) => {
  try {
    const response = await authFetch(`${BASE_URL}/users/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updatedUser),
    });

    const data = await response.json();
    if (!response.ok) {
      console.error("❌ updateUserDataApi server error:", data);
      throw new Error(data.message || data.detail || data.error || `Server error ${response.status}`);
    }
    return data;
  } catch (error) {
    console.error("Error updating user:", error.message);
    throw error;
  }
};

// =======================================================
// 5️⃣ DELETE USER
// =======================================================
export const deleteUserByIdApi = async (id) => {
  try {
    const response = await authFetch(`${BASE_URL}/users/${id}`, {
      method: "DELETE",
    });
    if (!response.ok) {
      console.error("❌ deleteUserByIdApi server error:", response.status);
    }
    return id;
  } catch (error) {
    console.log("Error deleting user", error);
    return null;
  }
};

// =======================================================
// 6️⃣ CREATE DEPARTMENT
// =======================================================
export const createDepartmentApi = async (newDept) => {
  try {
    const response = await authFetch(`${BASE_URL}/departments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newDept),
    });

    return await response.json();
  } catch (error) {
    console.log("Error adding department", error);
    return null;
  }
};

// =======================================================
// 7️⃣ UPDATE DEPARTMENT
// =======================================================
export const updateDepartmentDataApi = async ({ id, updatedDept }) => {
  try {
    const response = await authFetch(`${BASE_URL}/departments/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updatedDept),
    });

    return await response.json();
  } catch (error) {
    console.log("Error updating department", error);
    return null;
  }
};
// Fetch only unique departments (without given_by)
export const fetchDepartmentsOnlyApi = async () => {
  try {
    const response = await authFetch(`${BASE_URL}/departments-only`);
    return await response.json();
  } catch (error) {
    console.log("Error fetching departments only", error);
    return [];
  }
};

// Fetch only given_by data
export const fetchGivenByDataApi = async () => {
  try {
    const response = await authFetch(`${BASE_URL}/given-by`);
    return await response.json();
  } catch (error) {
    console.log("Error fetching given_by data", error);
    return [];
  }
};
// =======================================================
// 8️⃣ EXTEND TASK
// =======================================================
export const extendTaskApi = async (taskId, newStartDate) => {
  try {
    const response = await authFetch(`${import.meta.env.VITE_API_BASE_URL}/leave/extend-task`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ taskId, newStartDate }),
    });

    return await response.json();
  } catch (error) {
    console.log("Error extending task", error);
    return null;
  }
};

// =======================================================
// 9️⃣ FETCH MACHINES
// =======================================================
export const fetchMachinesApi = async () => {
  try {
    const response = await authFetch(`${BASE_URL}/machines`);
    return await response.json();
  } catch (error) {
    console.log("Error fetching machines", error);
    return [];
  }
};

// =======================================================
// 🔟 CREATE MACHINE
// =======================================================
export const createMachineApi = async (newMachine) => {
  try {
    const response = await authFetch(`${BASE_URL}/machines`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newMachine),
    });

    return await response.json();
  } catch (error) {
    console.log("Error creating machine", error);
    return null;
  }
};

// =======================================================
// 1️⃣1️⃣ UPDATE MACHINE
// =======================================================
export const updateMachineApi = async ({ id, updatedMachine }) => {
  try {
    const response = await authFetch(`${BASE_URL}/machines/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updatedMachine),
    });

    return await response.json();
  } catch (error) {
    console.log("Error updating machine", error);
    return null;
  }
};

// =======================================================
// 1️⃣2️⃣ DELETE MACHINE
// =======================================================
export const deleteMachineApi = async (id) => {
  try {
    await authFetch(`${BASE_URL}/machines/${id}`, {
      method: "DELETE",
    });
    return id;
  } catch (error) {
    console.log("Error deleting machine", error);
    return null;
  }
};
