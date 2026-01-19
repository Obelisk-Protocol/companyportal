import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import Layout from './components/layout/Layout';
import Login from './pages/auth/Login';
import AcceptInvitation from './pages/auth/AcceptInvitation';
import Dashboard from './pages/dashboard/Dashboard';
import Employees from './pages/employees/Employees';
import EmployeeDetail from './pages/employees/EmployeeDetail';
import PayrollRuns from './pages/payroll/PayrollRuns';
import PayrollDetail from './pages/payroll/PayrollDetail';
import Expenses from './pages/expenses/Expenses';
import MyExpenses from './pages/expenses/MyExpenses';
import Reports from './pages/reports/Reports';
import GeneratedReports from './pages/reports/GeneratedReports';
import Settings from './pages/settings/Settings';
import Invitations from './pages/invitations/Invitations';
import MyPayslips from './pages/payslips/MyPayslips';
import Users from './pages/users/Users';
import Profile from './pages/profile/Profile';

function PrivateRoute({ children, allowedRoles }: { children: React.ReactNode; allowedRoles?: string[] }) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-white"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

export default function App() {
  return (
    <Routes>
      {/* Public routes */}
      <Route path="/login" element={<Login />} />
      <Route path="/accept-invitation/:token" element={<AcceptInvitation />} />

      {/* Protected routes */}
      <Route
        path="/"
        element={
          <PrivateRoute>
            <Layout />
          </PrivateRoute>
        }
      >
        <Route index element={<Dashboard />} />
        
        {/* Employee routes - Admin/HR only */}
        <Route
          path="employees"
          element={
            <PrivateRoute allowedRoles={['admin', 'hr']}>
              <Employees />
            </PrivateRoute>
          }
        />
        <Route
          path="employees/:id"
          element={
            <PrivateRoute allowedRoles={['admin', 'hr']}>
              <EmployeeDetail />
            </PrivateRoute>
          }
        />

        {/* Payroll routes - Admin/HR only */}
        <Route
          path="payroll"
          element={
            <PrivateRoute allowedRoles={['admin', 'hr']}>
              <PayrollRuns />
            </PrivateRoute>
          }
        />
        <Route
          path="payroll/:id"
          element={
            <PrivateRoute allowedRoles={['admin', 'hr']}>
              <PayrollDetail />
            </PrivateRoute>
          }
        />

        {/* Expense routes */}
        <Route
          path="expenses"
          element={
            <PrivateRoute allowedRoles={['admin', 'hr']}>
              <Expenses />
            </PrivateRoute>
          }
        />
        <Route path="my-expenses" element={<MyExpenses />} />

        {/* Payslip route for employees */}
        <Route path="my-payslips" element={<MyPayslips />} />

        {/* Reports - Admin/HR/Accountant */}
        <Route
          path="reports"
          element={
            <PrivateRoute allowedRoles={['admin', 'hr', 'accountant']}>
              <Reports />
            </PrivateRoute>
          }
        />
        <Route
          path="reports/generated"
          element={
            <PrivateRoute allowedRoles={['admin', 'hr', 'accountant']}>
              <GeneratedReports />
            </PrivateRoute>
          }
        />

        {/* Invitations - Admin/HR only */}
        <Route
          path="invitations"
          element={
            <PrivateRoute allowedRoles={['admin', 'hr']}>
              <Invitations />
            </PrivateRoute>
          }
        />

        {/* Profile - All users */}
        <Route path="profile" element={<Profile />} />

        {/* Users - Admin only */}
        <Route
          path="users"
          element={
            <PrivateRoute allowedRoles={['admin']}>
              <Users />
            </PrivateRoute>
          }
        />

        {/* Settings - Admin only */}
        <Route
          path="settings"
          element={
            <PrivateRoute allowedRoles={['admin']}>
              <Settings />
            </PrivateRoute>
          }
        />
      </Route>

      {/* Catch all */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
