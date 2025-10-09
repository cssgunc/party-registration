import axios from "axios";

const apiClient = axios.create({
  withCredentials: true,
  baseURL: `${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000"}/api`,
  headers: {
    "Content-Type": "application/json",
  },
});

export default apiClient;
