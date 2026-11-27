import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import ProtectedRoute from "./components/ProtectedRoute";

// Core Public Pages
import Login from "./pages/Login";
import TransparencyDashboard from "./pages/TransparencyDashboard";
import LandingPage from "./pages/LandingPage";

// Admin Dashboard Components
import AdminLayout from "./pages/admin/AdminLayout";
import AdminDashboard from "./pages/admin/AdminDashboard";
import RegisterDealer from "./pages/admin/RegisterDealer";
import RegisterBeneficiary from "./pages/admin/RegisterBeneficiary";
import AllocateEntitlement from "./pages/admin/AllocateEntitlement";
import ViewTransactions from "./pages/admin/ViewTransactions";
import TransferGrain from "./pages/admin/TransferGrain";

// Dealer Dashboard Components
import DealerLayout from "./pages/dealer/DealerLayout";
import DealerDashboard from "./pages/dealer/DealerDashboard";
import ViewStock from "./pages/dealer/ViewStock";
import DistributeRation from "./pages/dealer/DistributeRation";
import ViewDistributions from "./pages/dealer/ViewDistributions";

// Beneficiary Dashboard Components
import BeneficiaryLayout from "./pages/beneficiary/BeneficiaryLayout";
import BeneficiaryDashboard from "./pages/beneficiary/BeneficiaryDashboard";
import MyReceipts from "./pages/beneficiary/MyReceipts";

function App() {
  return (
    <Routes>
      {/* Public Pages */}
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<Login />} />
      <Route path="/transparency" element={<TransparencyDashboard />} />

      {/* Admin Protected Routes */}
      <Route
        path="/admin"
        element={
          <ProtectedRoute allowedRoles={["Admin"]}>
            <AdminLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<AdminDashboard />} />
        <Route path="register-dealer" element={<RegisterDealer />} />
        <Route path="register-beneficiary" element={<RegisterBeneficiary />} />
        <Route path="allocate" element={<AllocateEntitlement />} />
        <Route path="transfer-grain" element={<TransferGrain />} />
        <Route path="transactions" element={<ViewTransactions />} />
      </Route>

      {/* Dealer Protected Routes */}
      <Route
        path="/dealer"
        element={
          <ProtectedRoute allowedRoles={["Dealer"]}>
            <DealerLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<DealerDashboard />} />
        <Route path="stock" element={<ViewStock />} />
        <Route path="distribute" element={<DistributeRation />} />
        <Route path="distributions" element={<ViewDistributions />} />
      </Route>

      {/* Beneficiary Protected Routes */}
      <Route
        path="/beneficiary"
        element={
          <ProtectedRoute allowedRoles={["Beneficiary"]}>
            <BeneficiaryLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<BeneficiaryDashboard />} />
        <Route path="receipts" element={<MyReceipts />} />
      </Route>

      {/* Catch-all redirect */}
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}

export default App;
