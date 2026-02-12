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
import Clients from './pages/crm/Clients';
import CreateCompany from './pages/crm/CreateCompany';
import CreateIndividual from './pages/crm/CreateIndividual';
import ClientDetail from './pages/crm/ClientDetail';
import Contracts from './pages/contracts/Contracts';
import ContractDetail from './pages/contracts/ContractDetail';
import ContractManagement from './pages/contracts/ContractManagement';
import Invoices from './pages/invoices/Invoices';
import InvoiceDetail from './pages/invoices/InvoiceDetail';
import CreateInvoice from './pages/invoices/CreateInvoice';
import Grants from './pages/grants/Grants';
import CreateGrant from './pages/grants/CreateGrant';
import GrantDetail from './pages/grants/GrantDetail';

function PrivateRoute({ children, allowedRoles }: { children: React.ReactNode; allowedRoles?: string[] }) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-neutral-900 dark:border-white"></div>
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
        
        {/* Employee contracts */}
        <Route
          path="my-contracts"
          element={
            <PrivateRoute allowedRoles={['employee']}>
              <Contracts />
            </PrivateRoute>
          }
        />
        <Route
          path="my-contracts/:id"
          element={
            <PrivateRoute allowedRoles={['employee']}>
              <ContractDetail />
            </PrivateRoute>
          }
        />

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

        {/* CRM Routes - Admin/HR/Accountant */}
        <Route
          path="crm/clients"
          element={
            <PrivateRoute allowedRoles={['admin', 'hr', 'accountant']}>
              <Clients />
            </PrivateRoute>
          }
        />
        <Route
          path="crm/clients/new/company"
          element={
            <PrivateRoute allowedRoles={['admin', 'hr']}>
              <CreateCompany />
            </PrivateRoute>
          }
        />
        <Route
          path="crm/clients/new/individual"
          element={
            <PrivateRoute allowedRoles={['admin', 'hr']}>
              <CreateIndividual />
            </PrivateRoute>
          }
        />
        <Route
          path="crm/clients/:type/:id"
          element={
            <PrivateRoute allowedRoles={['admin', 'hr', 'accountant']}>
              <ClientDetail />
            </PrivateRoute>
          }
        />
        
        {/* Contract Management - Admin/HR */}
        <Route
          path="contracts/management"
          element={
            <PrivateRoute allowedRoles={['admin', 'hr']}>
              <ContractManagement />
            </PrivateRoute>
          }
        />
        
        {/* Client routes */}
        <Route
          path="contracts"
          element={
            <PrivateRoute allowedRoles={['client']}>
              <Contracts />
            </PrivateRoute>
          }
        />
        <Route
          path="contracts/:id"
          element={
            <PrivateRoute allowedRoles={['client', 'admin', 'hr']}>
              <ContractDetail />
            </PrivateRoute>
          }
        />
        {/* Invoices - Client, Admin, HR, Accountant */}
        <Route
          path="invoices"
          element={
            <PrivateRoute allowedRoles={['client', 'admin', 'hr', 'accountant']}>
              <Invoices />
            </PrivateRoute>
          }
        />
        <Route
          path="invoices/new"
          element={
            <PrivateRoute allowedRoles={['admin', 'hr']}>
              <CreateInvoice />
            </PrivateRoute>
          }
        />
        <Route
          path="invoices/:id"
          element={
            <PrivateRoute allowedRoles={['client', 'admin', 'hr', 'accountant']}>
              <InvoiceDetail />
            </PrivateRoute>
          }
        />

        {/* Grants - Admin / HR */}
        <Route
          path="grants"
          element={
            <PrivateRoute allowedRoles={['admin', 'hr']}>
              <Grants />
            </PrivateRoute>
          }
        />
        <Route
          path="grants/new"
          element={
            <PrivateRoute allowedRoles={['admin', 'hr']}>
              <CreateGrant />
            </PrivateRoute>
          }
        />
        <Route
          path="grants/:id"
          element={
            <PrivateRoute allowedRoles={['admin', 'hr']}>
              <GrantDetail />
            </PrivateRoute>
          }
        />
      </Route>

      {/* Catch all */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
