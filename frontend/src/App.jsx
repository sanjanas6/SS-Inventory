
import { Routes, Route, Navigate } from "react-router-dom";

import Sidebar from "./components/Sidebar";
import Header from "./components/Header";

import Dashboard from "./pages/Dashboard";
import ExcelImport from "./pages/ExcelImport";
import Transactions from "./pages/Transactions";
import PartsMaster from "./pages/PartsMaster";
import Outward from "./pages/Outward";
import Login from "./pages/Login";

import { AuthProvider, useAuth } from "./context/AuthContext";

import "./App.css";

function ProtectedRoute({ children, allowedRoles }) {
    const { user } = useAuth();

    if (!user) {
        return <Navigate to="/login" replace />;
    }

    if (allowedRoles && !allowedRoles.includes(user.role)) {
        return <Navigate to="/stock-out" replace />;
    }

    return children;
}

function AppContent() {
    const { user } = useAuth();

    return (
        <Routes>
            <Route
                path="/login"
                element={
                    user
                        ? <Navigate to="/" replace />
                        : <Login />
                }
            />

            <Route
                path="/*"
                element={
                    <ProtectedRoute>
                        <div className="app-layout">
                            <Sidebar />

                            <main className="main-content">
                                <Header />

                                <Routes>
                                    <Route
                                        path="/"
                                        element={
                                            <ProtectedRoute allowedRoles={["ADMIN"]}>
                                                <Dashboard />
                                            </ProtectedRoute>
                                        }
                                    />

                                    <Route
                                        path="/import"
                                        element={
                                            <ProtectedRoute allowedRoles={["ADMIN"]}>
                                                <ExcelImport />
                                            </ProtectedRoute>
                                        }
                                    />

                                    <Route
                                        path="/parts"
                                        element={
                                            <ProtectedRoute allowedRoles={["ADMIN"]}>
                                                <PartsMaster />
                                            </ProtectedRoute>
                                        }
                                    />

                                    <Route
                                        path="/stock-out"
                                        element={
                                            <ProtectedRoute allowedRoles={["ADMIN", "STORE_MANAGER"]}>
                                                <Outward />
                                            </ProtectedRoute>
                                        }
                                    />

                                    <Route
                                        path="/transactions"
                                        element={
                                            <ProtectedRoute allowedRoles={["ADMIN", "STORE_MANAGER"]}>
                                                <Transactions />
                                            </ProtectedRoute>
                                        }
                                    />

                                    <Route
                                        path="*"
                                        element={
                                            <div className="dashboard-content">
                                                <h2>Page Not Found</h2>
                                            </div>
                                        }
                                    />
                                </Routes>
                            </main>
                        </div>
                    </ProtectedRoute>
                }
            />
        </Routes>
    );
}

function App() {
    return (
        <AuthProvider>
            <AppContent />
        </AuthProvider>
    );
}

export default App;
