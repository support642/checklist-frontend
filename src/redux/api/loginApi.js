import { authAxios, createAuthAxios } from "../../utils/authAxios";


// import supabase from "../../SupabaseClient";

// export const LoginCredentialsApi = async (formData) => {
//   const { data, error } = await supabase
//     .from('users')
//     .select('*')
//     .eq('user_name', formData.username)
//     .eq('password', formData.password)
//      .eq('status', 'active')
//     .single(); // get a single user

//   if (error || !data) {
//     return { error: 'Invalid username or password' };
//   }

//   return { data };
// };


// import axios from "axios";

// export const LoginCredentialsApi = async (formData) => {
//   try {
//     const res = await authAxios.post("http://localhost:5050/api/login", formData);

//     return { data: res.data };  // same format
//   } catch (err) {
//     return { error: err.response?.data?.error || "Login failed" };
//   }
// };


import axios from "axios";

// Dynamic Base URL
const BASE_URL = `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5050/api'}/login`;

export const LoginCredentialsApi = async (formData) => {
  try {
    const res = await authAxios.post(BASE_URL, formData);

    return { data: res.data }; // same return format
  } catch (err) {
    return { error: err.response?.data?.error || "Login failed" };
  }
};
