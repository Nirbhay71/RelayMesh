import React, { createContext, useContext, useState, useEffect } from "react";
import axios from "axios";

const API_BASE = `http://${window.location.hostname}:${import.meta.env.VITE_API_PORT || 7100}`;

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    // Check if user is authenticated on page load / refresh
    const checkAuthStatus = async () => {
        try {
            const response = await axios.get(`${API_BASE}/auth/me`, { withCredentials: true });
            setUser(response.data.data.user);
        } catch (error) {
            setUser(null);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        checkAuthStatus();
    }, []);

    const login = async (email, password) => {
        const response = await axios.post(`${API_BASE}/auth/login`, { email, password }, { withCredentials: true });
        setUser(response.data.data.user);
        return response.data;
    };

    const register = async (username, email, password) => {
        const response = await axios.post(`${API_BASE}/auth/register`, { username, email, password }, { withCredentials: true });
        return response.data;
    };

    const logout = async () => {
        try {
            await axios.post(`${API_BASE}/auth/logout`, {}, { withCredentials: true });
        } catch (error) {
            // Even if logout API fails, clear local state
            console.error("Logout error:", error);
        }
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{ user, loading, login, register, logout }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
