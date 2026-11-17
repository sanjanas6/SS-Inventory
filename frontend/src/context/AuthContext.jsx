
import { createContext, useContext, useState } from "react";
import axios from "axios";

const AuthContext = createContext(null);

const API = "https://ss-inventory.onrender.com/api/auth";

export function AuthProvider({ children }) {
    const [user, setUser] = useState(() => {
        const savedUser = sessionStorage.getItem("user");
        const token = sessionStorage.getItem("token");

        if (savedUser && token) {
            axios.defaults.headers.common.Authorization = `Bearer ${token}`;

            try {
                return JSON.parse(savedUser);
            } catch {
                sessionStorage.clear();
            }
        }

        return null;
    });

    const login = async (username, password) => {
        const response = await axios.post(`${API}/login`, {
            username,
            password
        });

        const { token, user } = response.data;

        sessionStorage.setItem("token", token);
        sessionStorage.setItem("user", JSON.stringify(user));

        axios.defaults.headers.common.Authorization = `Bearer ${token}`;

        setUser(user);

        return user;
    };

    const logout = () => {
        sessionStorage.removeItem("token");
        sessionStorage.removeItem("user");

        delete axios.defaults.headers.common.Authorization;

        setUser(null);
    };

    return (
        <AuthContext.Provider value={{ user, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    return useContext(AuthContext);
}
