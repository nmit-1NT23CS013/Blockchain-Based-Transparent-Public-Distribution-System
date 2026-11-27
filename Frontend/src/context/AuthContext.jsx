import React, { createContext, useState, useEffect, useContext } from "react";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [token, setToken] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  // Check localStorage for existing session on mount
  useEffect(() => {
    const storedToken = localStorage.getItem("pds_token");
    const storedUser = localStorage.getItem("pds_user");

    if (storedToken && storedUser) {
      try {
        setToken(storedToken);
        setCurrentUser(JSON.parse(storedUser));
        setIsAuthenticated(true);
      } catch (err) {
        console.error("Error parsing stored auth session", err);
        // Clear corrupt data
        localStorage.removeItem("pds_token");
        localStorage.removeItem("pds_user");
      }
    }
    setLoading(false);
  }, []);

  // Handle successful login
  const login = (jwtToken, user) => {
    localStorage.setItem("pds_token", jwtToken);
    localStorage.setItem("pds_user", JSON.stringify(user));
    setToken(jwtToken);
    setCurrentUser(user);
    setIsAuthenticated(true);
  };

  // Handle logout
  const logout = () => {
    localStorage.removeItem("pds_token");
    localStorage.removeItem("pds_user");
    setToken(null);
    setCurrentUser(null);
    setIsAuthenticated(false);
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        token,
        isAuthenticated,
        loading,
        login,
        logout
      }}
    >
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
