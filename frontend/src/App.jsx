
import { Routes, Route } from "react-router-dom";

import Sidebar from "./components/Sidebar";
import Header from "./components/Header";
import Dashboard from "./pages/Dashboard";
import ExcelImport from "./pages/ExcelImport";
import Transactions from "./pages/Transactions";

import "./App.css";
import PartsMaster from "./pages/PartsMaster";
import Outward from "./pages/Outward";

function App() {
  return (
    <div className="app-layout">
      <Sidebar />

      <main className="main-content">
        <Header />

        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/import" element={<ExcelImport />} />
          <Route path="/parts" element={<PartsMaster />} />
          <Route path="/stock-out" element={<Outward />} />
          <Route path="/transactions" element={<Transactions />} />

          <Route
            path="*"
            element={<div className="dashboard-content">
              <h2>Coming Soon</h2>
              <p>This module is under development.</p>
            </div>}
          />
        </Routes>
      </main>
    </div>
  );
}

export default App;
