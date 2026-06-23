import React, { createContext, useContext, useState, useEffect } from "react";
import axios from "axios";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    const checkAuthStatus = async () => {
        try {
            // Placeholder: Backend might need a /auth/me or similar endpoint
            // For now, we assume user is logged in if we can get a response
            // const response = await axios.get("http://localhost:7100/auth/me");
            // setUser(response.data.user);
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
        const response = await axios.post("http://localhost:7100/auth/login", { email, password }, { withCredentials: true });
        setUser(response.data.data.user);
        return response.data;
    };

    const register = async (username, email, password) => {
        const response = await axios.post("http://localhost:7100/auth/register", { username, email, password }, { withCredentials: true });
        return response.data;
    };

    const logout = async () => {
        // Implement backend logout if available
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{ user, loading, login, register, logout }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
