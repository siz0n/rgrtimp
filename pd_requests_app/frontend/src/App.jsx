import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext.jsx";
import Nav from "./components/Nav.jsx";
import ProtectedRoute from "./components/ProtectedRoute.jsx";
import ApiNotifier from "./components/ApiNotifier.jsx";

import Home from "./pages/Home.jsx";
import Login from "./pages/Login.jsx";
import Register from "./pages/Register.jsx";
import VerifyEmail from "./pages/VerifyEmail.jsx";
import Requests from "./pages/Requests.jsx";
import CreateRequest from "./pages/CreateRequest.jsx";
import RequestDetail from "./pages/RequestDetail.jsx";
import Users from "./pages/Users.jsx";
import Audit from "./pages/Audit.jsx";

import "./style.css";

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <ApiNotifier />
        <div className="app-shell">
          <Nav />

          <div className="content">
            <main>
              <Routes>
                <Route path="/" element={<Navigate to="/dashboard" replace />} />
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                <Route path="/verify-email" element={<VerifyEmail />} />

                <Route
                  path="/dashboard"
                  element={<ProtectedRoute><Home /></ProtectedRoute>}
                />
                <Route
                  path="/requests"
                  element={<ProtectedRoute><Requests /></ProtectedRoute>}
                />
                <Route
                  path="/requests/create"
                  element={
                    <ProtectedRoute roles={["USER", "ADMIN"]}>
                      <CreateRequest />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/requests/:id"
                  element={<ProtectedRoute><RequestDetail /></ProtectedRoute>}
                />
                <Route
                  path="/users"
                  element={
                    <ProtectedRoute roles={["ADMIN"]}>
                      <Users />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/audit"
                  element={
                    <ProtectedRoute roles={["ADMIN"]}>
                      <Audit />
                    </ProtectedRoute>
                  }
                />
                <Route path="*" element={<Navigate to="/dashboard" replace />} />
              </Routes>
            </main>
          </div>
        </div>
      </BrowserRouter>
    </AuthProvider>
  );
}
