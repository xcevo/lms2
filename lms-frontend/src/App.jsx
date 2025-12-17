import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import Login from "./Login";
import AdminDashboard from "./adminfolder/admindashboards";
import ProtectedRoute from "./components/ProtectedRoutes";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import CandidateDashboard from "./candidatefolder/candidatedashboard";

const App = () => {
  return (
    <>

    {/* 👇 Add this once, globally */}
      <style>{`
        html, body, #root {
          height: 100%;
          overflow-y: auto;            /* scrolling enabled */
          -ms-overflow-style: none;     /* IE/Edge */
          scrollbar-width: none;        /* Firefox */
        }
        html::-webkit-scrollbar,
        body::-webkit-scrollbar,
        #root::-webkit-scrollbar {
          display: none;                /* Chrome/Safari/Edge */
        }
      `}</style>
      <Routes>
        <Route path="/login" element={<Login />} />

        <Route
          path="/admin-dashboard"
          element={
            <ProtectedRoute allowedRole="admin">
              <AdminDashboard />
            </ProtectedRoute>
          }
        />

        <Route
          path="/candidate-dashboard"
          element={
            <ProtectedRoute allowedRole="candidate">
              <CandidateDashboard />
            </ProtectedRoute>
          }
        />

        <Route
          path="/"
          element={
            localStorage.getItem("role") === "admin" ? (
              <Navigate to="/admin-dashboard" replace />
            ) : localStorage.getItem("role") === "candidate" ? (
              <Navigate to="/candidate-dashboard" replace />
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
      </Routes>

      <ToastContainer position="top-left" autoClose={3000} />
    </>
  );
};

export default App;
