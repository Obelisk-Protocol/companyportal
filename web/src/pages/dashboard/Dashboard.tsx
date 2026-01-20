import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { api } from '../../lib/api';
import { formatRupiah, getIndonesianMonth } from '../../lib/utils';
import Card from '../../components/ui/Card';
import { Users, Wallet, Receipt, TrendingUp, Calendar, FileText, Check, FileSignature, ReceiptText } from 'lucide-react';
import { motion } from 'framer-motion';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

export default function Dashboard() {
  const { user } = useAuth();
  const { theme } = useTheme();
  const isAdmin = user?.role === 'admin' || user?.role === 'hr';

  // Fetch dashboard stats for admin/hr
  const { data: stats } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: async () => {
      const [employees, pendingExpenses, allExpenses, payrollSummary] = await Promise.all([
        api.get<any[]>('/employees'),
        api.get<any[]>('/expenses/pending'),
        api.get<any[]>('/expenses'),
        api.get<any>(`/reports/payroll-summary?year=${new Date().getFullYear()}`),
      ]);

      const currentMonth = new Date().getMonth() + 1;
      const currentMonthData = payrollSummary.monthlyData?.find(
        (m: any) => m.month === currentMonth
      );

      // Calculate expense statistics
      const approvedExpenses = allExpenses.filter((e: any) => e.expense.status === 'approved');
      const currentMonthApproved = approvedExpenses.filter((e: any) => {
        const expenseDate = new Date(e.expense.expenseDate);
        return expenseDate.getMonth() + 1 === currentMonth && expenseDate.getFullYear() === new Date().getFullYear();
      });
      const totalApprovedAmount = currentMonthApproved.reduce((sum: number, e: any) => 
        sum + parseFloat(e.expense.amount), 0
      );

      return {
        totalEmployees: employees.length,
        activeEmployees: employees.filter((e) => e.status === 'active').length,
        pendingExpenses: pendingExpenses.length,
        approvedExpenses: approvedExpenses.length,
        currentMonthApprovedCount: currentMonthApproved.length,
        currentMonthApprovedAmount: totalApprovedAmount,
        currentMonthPayroll: currentMonthData,
        monthlyData: payrollSummary.monthlyData || [],
      };
    },
    enabled: isAdmin,
  });

  // Fetch employee's own data
  const { data: myPayslips } = useQuery({
    queryKey: ['my-payslips'],
    queryFn: () => api.get<any[]>(`/employees/${user?.employeeId}/payslips`),
    enabled: !!user?.employeeId,
  });

  const { data: myExpenses } = useQuery({
    queryKey: ['my-expenses'],
    queryFn: () => api.get<any[]>('/expenses'),
    enabled: !!user?.employeeId,
  });

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
  };

  // Admin/HR Dashboard
  if (isAdmin) {
    const chartData = stats?.monthlyData?.map((m: any) => ({
      name: getIndonesianMonth(m.month).substring(0, 3),
      gross: m.totalGross / 1000000,
      net: m.totalNet / 1000000,
    })) || [];

    return (
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="space-y-6"
      >
        <div>
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">Dashboard</h1>
          <p className="text-neutral-500">Company overview</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <motion.div variants={itemVariants}>
            <Card className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-neutral-500">Total Employees</p>
                  <p className="text-3xl font-bold text-neutral-900 dark:text-white mt-1">
                    {stats?.totalEmployees || 0}
                  </p>
                  <p className="text-sm text-neutral-400 mt-1">
                    {stats?.activeEmployees || 0} active
                  </p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center">
                  <Users className="w-6 h-6 text-neutral-900 dark:text-white" />
                </div>
              </div>
            </Card>
          </motion.div>

          <motion.div variants={itemVariants}>
            <Card className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-neutral-500">This Month's Payroll</p>
                  <p className="text-3xl font-bold text-neutral-900 dark:text-white mt-1">
                    {stats?.currentMonthPayroll
                      ? formatRupiah(stats.currentMonthPayroll.totalNet)
                      : '-'}
                  </p>
                  <p className="text-sm text-neutral-500 mt-1">
                    {stats?.currentMonthPayroll?.status || 'Not created'}
                  </p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center">
                  <Wallet className="w-6 h-6 text-neutral-900 dark:text-white" />
                </div>
              </div>
            </Card>
          </motion.div>

          <motion.div variants={itemVariants}>
            <Card className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-neutral-500">Pending Expenses</p>
                  <p className="text-3xl font-bold text-neutral-900 dark:text-white mt-1">
                    {stats?.pendingExpenses || 0}
                  </p>
                  <p className="text-sm text-neutral-400 mt-1">Awaiting review</p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center">
                  <Receipt className="w-6 h-6 text-neutral-900 dark:text-white" />
                </div>
              </div>
            </Card>
          </motion.div>

          <motion.div variants={itemVariants}>
            <Card className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-neutral-500">Approved This Month</p>
                  <p className="text-3xl font-bold text-neutral-900 dark:text-white mt-1">
                    {formatRupiah(stats?.currentMonthApprovedAmount || 0)}
                  </p>
                  <p className="text-sm text-neutral-400 mt-1">
                    {stats?.currentMonthApprovedCount || 0} expenses
                  </p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center">
                  <Check className="w-6 h-6 text-neutral-900 dark:text-white" />
                </div>
              </div>
            </Card>
          </motion.div>

          <motion.div variants={itemVariants}>
            <Card className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-neutral-500">Period</p>
                  <p className="text-3xl font-bold text-neutral-900 dark:text-white mt-1">
                    {getIndonesianMonth(new Date().getMonth() + 1).substring(0, 3)}
                  </p>
                  <p className="text-sm text-neutral-500 mt-1">{new Date().getFullYear()}</p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center">
                  <Calendar className="w-6 h-6 text-neutral-900 dark:text-white" />
                </div>
              </div>
            </Card>
          </motion.div>
        </div>

        {/* Chart */}
        <motion.div variants={itemVariants}>
          <Card className="p-6">
            <h3 className="text-lg font-semibold text-neutral-900 dark:text-white mb-4">
              Payroll Trend {new Date().getFullYear()}
            </h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="grossGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={theme === 'dark' ? '#ffffff' : '#0a0a0a'} stopOpacity={0.3} />
                      <stop offset="95%" stopColor={theme === 'dark' ? '#ffffff' : '#0a0a0a'} stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="netGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#737373" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#737373" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="name" stroke={theme === 'dark' ? '#525252' : '#a3a3a3'} fontSize={12} />
                  <YAxis stroke={theme === 'dark' ? '#525252' : '#a3a3a3'} fontSize={12} tickFormatter={(v) => `${v}M`} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: theme === 'dark' ? '#0a0a0a' : '#ffffff',
                      border: theme === 'dark' ? '1px solid #262626' : '1px solid #e5e5e5',
                      borderRadius: '8px',
                      color: theme === 'dark' ? '#ffffff' : '#0a0a0a',
                    }}
                    formatter={(value: number) => [`Rp ${value.toFixed(0)} million`, '']}
                  />
                  <Area
                    type="monotone"
                    dataKey="gross"
                    stroke={theme === 'dark' ? '#ffffff' : '#0a0a0a'}
                    fill="url(#grossGradient)"
                    name="Gross"
                  />
                  <Area
                    type="monotone"
                    dataKey="net"
                    stroke="#737373"
                    fill="url(#netGradient)"
                    name="Net"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </motion.div>
      </motion.div>
    );
  }

  // Client Dashboard
  if (user?.role === 'client') {
    const { data: contracts } = useQuery({
      queryKey: ['contracts'],
      queryFn: () => api.get<any[]>('/contracts'),
      enabled: user.role === 'client',
    });

    const { data: invoices } = useQuery({
      queryKey: ['invoices'],
      queryFn: () => api.get<any[]>('/invoices'),
      enabled: user.role === 'client',
    });

    const pendingContracts = contracts?.filter((c: any) => c.status === 'sent') || [];
    const signedContracts = contracts?.filter((c: any) => c.status === 'signed' || c.status === 'active') || [];
    const pendingInvoices = invoices?.filter((i: any) => i.paymentStatus === 'pending') || [];
    const totalPendingAmount = pendingInvoices.reduce((sum: number, i: any) => sum + parseFloat(i.total), 0);

    return (
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="space-y-6"
      >
        <div>
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">Dashboard</h1>
          <p className="text-neutral-500">Welcome back, {user?.employee?.fullName}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <motion.div variants={itemVariants}>
            <Card className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-neutral-900 dark:text-white">Pending Contracts</h3>
                <FileSignature className="w-5 h-5 text-neutral-500" />
              </div>
              <p className="text-3xl font-bold text-neutral-900 dark:text-white">{pendingContracts.length}</p>
              <p className="text-sm text-neutral-500 mt-1">Awaiting signature</p>
            </Card>
          </motion.div>

          <motion.div variants={itemVariants}>
            <Card className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-neutral-900 dark:text-white">Active Contracts</h3>
                <FileText className="w-5 h-5 text-neutral-500" />
              </div>
              <p className="text-3xl font-bold text-neutral-900 dark:text-white">{signedContracts.length}</p>
              <p className="text-sm text-neutral-500 mt-1">Signed & active</p>
            </Card>
          </motion.div>

          <motion.div variants={itemVariants}>
            <Card className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-neutral-900 dark:text-white">Pending Invoices</h3>
                <ReceiptText className="w-5 h-5 text-neutral-500" />
              </div>
              <p className="text-3xl font-bold text-neutral-900 dark:text-white">{pendingInvoices.length}</p>
              <p className="text-sm text-neutral-500 mt-1">Awaiting payment</p>
            </Card>
          </motion.div>

          <motion.div variants={itemVariants}>
            <Card className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-neutral-900 dark:text-white">Total Due</h3>
                <Wallet className="w-5 h-5 text-neutral-500" />
              </div>
              <p className="text-2xl font-bold text-neutral-900 dark:text-white">
                {formatRupiah(totalPendingAmount)}
              </p>
              <p className="text-sm text-neutral-500 mt-1">Outstanding amount</p>
            </Card>
          </motion.div>
        </div>
      </motion.div>
    );
  }

  // Employee Dashboard
  const { data: employeeContracts } = useQuery({
    queryKey: ['contracts', 'employee'],
    queryFn: () => api.get<any[]>('/contracts?category=employee'),
    enabled: user?.role === 'employee',
  });

  const latestPayslip = myPayslips?.[0]?.payslip;
  const pendingExpenses = myExpenses?.filter((e: any) => e.expense.status === 'pending') || [];
  const pendingContracts = employeeContracts?.filter((c: any) => c.status === 'sent') || [];
  const signedContracts = employeeContracts?.filter((c: any) => c.status === 'signed' || c.status === 'active') || [];

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6"
    >
      <div>
        <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">Dashboard</h1>
        <p className="text-neutral-500">Welcome back, {user?.employee?.fullName}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <motion.div variants={itemVariants}>
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-neutral-900 dark:text-white">Latest Payslip</h3>
              <FileText className="w-5 h-5 text-neutral-500" />
            </div>
            {latestPayslip ? (
              <div>
                <p className="text-2xl font-bold text-neutral-900 dark:text-white">
                  {formatRupiah(parseFloat(latestPayslip.netSalary))}
                </p>
                <p className="text-sm text-neutral-500 mt-1">Take home pay</p>
              </div>
            ) : (
              <p className="text-neutral-500">No data available</p>
            )}
          </Card>
        </motion.div>

        <motion.div variants={itemVariants}>
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-neutral-900 dark:text-white">Pending Contracts</h3>
              <FileSignature className="w-5 h-5 text-neutral-500" />
            </div>
            <p className="text-2xl font-bold text-neutral-900 dark:text-white">{pendingContracts.length}</p>
            <p className="text-sm text-neutral-500 mt-1">Awaiting signature</p>
          </Card>
        </motion.div>

        <motion.div variants={itemVariants}>
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-neutral-900 dark:text-white">Pending Expenses</h3>
              <Receipt className="w-5 h-5 text-neutral-500" />
            </div>
            <p className="text-2xl font-bold text-neutral-900 dark:text-white">{pendingExpenses.length}</p>
            <p className="text-sm text-neutral-500 mt-1">Awaiting approval</p>
          </Card>
        </motion.div>

        <motion.div variants={itemVariants}>
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-neutral-900 dark:text-white">Status</h3>
              <TrendingUp className="w-5 h-5 text-neutral-500" />
            </div>
            <span className="badge badge-success">Active</span>
            <p className="text-sm text-neutral-500 mt-2">
              Employee #: {user?.employee?.employeeNumber}
            </p>
            {signedContracts.length > 0 && (
              <p className="text-xs text-neutral-500 mt-1">
                {signedContracts.length} active contract{signedContracts.length !== 1 ? 's' : ''}
              </p>
            )}
          </Card>
        </motion.div>
      </div>
    </motion.div>
  );
}
