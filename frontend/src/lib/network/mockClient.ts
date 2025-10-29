import axios from "axios";

/**
 * Returns a mock API client with preset Authorization header based on user role.
 * Interfaces with the the mock authentication system in the backend for testing purposes.
 */
const getMockClient = (role: "student" | "admin" | "police" | "unauthenticated") => {
  const mockClient = axios.create({
    withCredentials: true,
    baseURL: `${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000"}/api`,
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${role}`,
    },
  });

  return mockClient;
}

export default getMockClient;
