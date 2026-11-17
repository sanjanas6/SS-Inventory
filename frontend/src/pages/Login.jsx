
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { LockKeyhole, User, LogIn } from "lucide-react";
import { useAuth } from "../context/AuthContext";

function Login() {
    const { login } = useAuth();
    const navigate = useNavigate();

    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();

        try {
            setLoading(true);
            setError("");

            await login(username, password);

            navigate("/", { replace: true });

        } catch (err) {
            setError(
                err.response?.data?.message ||
                "Unable to login. Please try again."
            );
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="login-page">
            <div className="login-card">
                <div className="login-brand">
                    <div className="brand-icon">S</div>
                    <h2>SS MOTORS</h2>
                    <p>Inventory Management System</p>
                </div>

                <h3>Welcome Back</h3>
                <p className="login-subtitle">
                    Login to access your account
                </p>

                {error && (
                    <div className="error-message">{error}</div>
                )}

                <form onSubmit={handleSubmit}>
                    <div className="form-field">
                        <label>Username</label>
                        <div className="login-input">
                            <User size={18} />
                            <input
                                type="text"
                                value={username}
                                onChange={e => setUsername(e.target.value)}
                                placeholder="Enter username"
                                autoComplete="username"
                                required
                            />
                        </div>
                    </div>

                    <div className="form-field">
                        <label>Password</label>
                        <div className="login-input">
                            <LockKeyhole size={18} />
                            <input
                                type="password"
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                placeholder="Enter password"
                                autoComplete="current-password"
                                required
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        className="add-part-btn login-button"
                        disabled={loading}
                    >
                        <LogIn size={17} />
                        {loading ? "Logging in..." : "Login"}
                    </button>
                </form>
            </div>
        </div>
    );
}

export default Login;
