import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { useNavigation } from '../../contexts/NavigationContext';
import { api } from '../../lib/api';
import { formatRupiah, getIndonesianMonth } from '../../lib/utils';
import Card from '../../components/ui/Card';
import { Users, Wallet, Receipt, TrendingUp, Calendar, FileText, Check, FileSignature, ReceiptText, Building2, DollarSign } from 'lucide-react';
import { motion } from 'framer-motion';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

export default function Dashboard() {
  const { user } = useAuth();
  const { theme } = useTheme();
  const { viewMode } = useNavigation();
  const isAdmin = user?.role === 'admin';
  const isHr = user?.role === 'hr';
  const isAdminOrHr = isAdmin || isHr;

  // Fetch HR dashboard stats
  const { data: hrStats } = useQuery({
    queryKey: ['dashboard-stats-hr'],
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
    enabled: (isAdminOrHr && (isHr || !isAdmin || viewMode === 'hr')),
  });

  // Fetch CRM dashboard stats
  const { data: crmStats } = useQuery({
    queryKey: ['dashboard-stats-crm'],
    queryFn: async () => {
      const [clientCompanies, clientIndividuals, contracts, invoices] = await Promise.all([
        api.get<any[]>('/crm/companies').catch(() => []),
        api.get<any[]>('/crm/individuals').catch(() => []),
        api.get<any[]>('/contracts').catch(() => []),
        api.get<any[]>('/invoices').catch(() => []),
      ]);

      const allClients = [...(clientCompanies || []), ...(clientIndividuals || [])];
      const pendingContracts = contracts?.filter((c: any) => c.status === 'sent' || c.status === 'pending') || [];
      const activeContracts = contracts?.filter((c: any) => c.status === 'signed' || c.status === 'active') || [];
      const pendingInvoices = invoices?.filter((i: any) => i.paymentStatus === 'pending') || [];
      const paidInvoices = invoices?.filter((i: any) => i.paymentStatus === 'paid') || [];
      const totalPendingAmount = pendingInvoices.reduce((sum: number, i: any) => sum + parseFloat(i.total || 0), 0);
      const totalPaidAmount = paidInvoices.reduce((sum: number, i: any) => sum + parseFloat(i.total || 0), 0);

      const currentMonth = new Date().getMonth() + 1;
      const currentYear = new Date().getFullYear();
      const currentMonthInvoices = invoices?.filter((i: any) => {
        const invoiceDate = new Date(i.invoiceDate || i.createdAt);
        return invoiceDate.getMonth() + 1 === currentMonth && invoiceDate.getFullYear() === currentYear;
      }) || [];
      const currentMonthRevenue = currentMonthInvoices
        .filter((i: any) => i.paymentStatus === 'paid')
        .reduce((sum: number, i: any) => sum + parseFloat(i.total || 0), 0);

      return {
        totalClients: allClients.length,
        pendingContracts: pendingContracts.length,
        activeContracts: activeContracts.length,
        pendingInvoices: pendingInvoices.length,
        totalPendingAmount,
        totalPaidAmount,
        currentMonthRevenue,
        totalInvoices: invoices?.length || 0,
      };
    },
    enabled: (isAdmin && viewMode === 'crm') || user?.role === 'accountant' || user?.role === 'client',
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

  // Admin Dashboard - HR or CRM view
  if (isAdmin) {
    // HR View
    if (viewMode === 'hr') {
      const chartData = hrStats?.monthlyData?.map((m: any) => ({
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
            <h1 className="text-2xl font-bold text-[var(--text-primary)]">HR Dashboard</h1>
            <p className="text-[var(--text-secondary)]">Human Resources overview</p>
          </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <motion.div variants={itemVariants}>
            <Card className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-[var(--text-secondary)]">Total Employees</p>
                  <p className="text-3xl font-bold text-[var(--text-primary)] mt-1">
                    {hrStats?.totalEmployees || 0}
                  </p>
                  <p className="text-sm text-[var(--text-muted)] mt-1">
                    {hrStats?.activeEmployees || 0} active
                  </p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-black/10 dark:bg-white/10 flex items-center justify-center">
                  <Users className="w-6 h-6 text-[var(--text-primary)]" />
                </div>
              </div>
            </Card>
          </motion.div>

          <motion.div variants={itemVariants}>
            <Card className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-[var(--text-secondary)]">This Month's Payroll</p>
                  <p className="text-3xl font-bold text-[var(--text-primary)] mt-1">
                    {hrStats?.currentMonthPayroll
                      ? formatRupiah(hrStats.currentMonthPayroll.totalNet)
                      : '-'}
                  </p>
                  <p className="text-sm text-[var(--text-secondary)] mt-1">
                    {hrStats?.currentMonthPayroll?.status || 'Not created'}
                  </p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-black/10 dark:bg-white/10 flex items-center justify-center">
                  <Wallet className="w-6 h-6 text-[var(--text-primary)]" />
                </div>
              </div>
            </Card>
          </motion.div>

          <motion.div variants={itemVariants}>
            <Card className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-[var(--text-secondary)]">Pending Expenses</p>
                  <p className="text-3xl font-bold text-[var(--text-primary)] mt-1">
                    {hrStats?.pendingExpenses || 0}
                  </p>
                  <p className="text-sm text-[var(--text-muted)] mt-1">Awaiting review</p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-black/10 dark:bg-white/10 flex items-center justify-center">
                  <Receipt className="w-6 h-6 text-[var(--text-primary)]" />
                </div>
              </div>
            </Card>
          </motion.div>

          <motion.div variants={itemVariants}>
            <Card className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-[var(--text-secondary)]">Approved This Month</p>
                  <p className="text-3xl font-bold text-[var(--text-primary)] mt-1">
                    {formatRupiah(hrStats?.currentMonthApprovedAmount || 0)}
                  </p>
                  <p className="text-sm text-[var(--text-muted)] mt-1">
                    {hrStats?.currentMonthApprovedCount || 0} expenses
                  </p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-black/10 dark:bg-white/10 flex items-center justify-center">
                  <Check className="w-6 h-6 text-[var(--text-primary)]" />
                </div>
              </div>
            </Card>
          </motion.div>

          <motion.div variants={itemVariants}>
            <Card className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-[var(--text-secondary)]">Period</p>
                  <p className="text-3xl font-bold text-[var(--text-primary)] mt-1">
                    {getIndonesianMonth(new Date().getMonth() + 1).substring(0, 3)}
                  </p>
                  <p className="text-sm text-[var(--text-secondary)] mt-1">{new Date().getFullYear()}</p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-black/10 dark:bg-white/10 flex items-center justify-center">
                  <Calendar className="w-6 h-6 text-[var(--text-primary)]" />
                </div>
              </div>
            </Card>
          </motion.div>
        </div>

        {/* Chart */}
        <motion.div variants={itemVariants}>
          <Card className="p-6">
            <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-4">
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

    // CRM View for Admin
    return (
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="space-y-6"
      >
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">CRM Dashboard</h1>
          <p className="text-[var(--text-secondary)]">Customer Relationship Management overview</p>
        </div>

        {/* CRM Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <motion.div variants={itemVariants}>
            <Card className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-[var(--text-secondary)]">Total Clients</p>
                  <p className="text-3xl font-bold text-[var(--text-primary)] mt-1">
                    {crmStats?.totalClients || 0}
                  </p>
                  <p className="text-sm text-[var(--text-muted)] mt-1">Active clients</p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-black/10 dark:bg-white/10 flex items-center justify-center">
                  <Building2 className="w-6 h-6 text-[var(--text-primary)]" />
                </div>
              </div>
            </Card>
          </motion.div>

          <motion.div variants={itemVariants}>
            <Card className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-[var(--text-secondary)]">Active Contracts</p>
                  <p className="text-3xl font-bold text-[var(--text-primary)] mt-1">
                    {crmStats?.activeContracts || 0}
                  </p>
                  <p className="text-sm text-[var(--text-muted)] mt-1">
                    {crmStats?.pendingContracts || 0} pending
                  </p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-black/10 dark:bg-white/10 flex items-center justify-center">
                  <FileSignature className="w-6 h-6 text-[var(--text-primary)]" />
                </div>
              </div>
            </Card>
          </motion.div>

          <motion.div variants={itemVariants}>
            <Card className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-[var(--text-secondary)]">Pending Invoices</p>
                  <p className="text-3xl font-bold text-[var(--text-primary)] mt-1">
                    {crmStats?.pendingInvoices || 0}
                  </p>
                  <p className="text-sm text-[var(--text-muted)] mt-1">Awaiting payment</p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-black/10 dark:bg-white/10 flex items-center justify-center">
                  <ReceiptText className="w-6 h-6 text-[var(--text-primary)]" />
                </div>
              </div>
            </Card>
          </motion.div>

          <motion.div variants={itemVariants}>
            <Card className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-[var(--text-secondary)]">Total Due</p>
                  <p className="text-3xl font-bold text-[var(--text-primary)] mt-1">
                    {formatRupiah(crmStats?.totalPendingAmount || 0)}
                  </p>
                  <p className="text-sm text-[var(--text-muted)] mt-1">Outstanding</p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-black/10 dark:bg-white/10 flex items-center justify-center">
                  <DollarSign className="w-6 h-6 text-[var(--text-primary)]" />
                </div>
              </div>
            </Card>
          </motion.div>
        </div>

        {/* Revenue Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <motion.div variants={itemVariants}>
            <Card className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-[var(--text-primary)]">This Month Revenue</h3>
                <TrendingUp className="w-5 h-5 text-[var(--text-secondary)]" />
              </div>
              <p className="text-2xl font-bold text-[var(--text-primary)]">
                {formatRupiah(crmStats?.currentMonthRevenue || 0)}
              </p>
              <p className="text-sm text-[var(--text-secondary)] mt-1">Paid invoices</p>
            </Card>
          </motion.div>

          <motion.div variants={itemVariants}>
            <Card className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-[var(--text-primary)]">Total Revenue</h3>
                <Wallet className="w-5 h-5 text-[var(--text-secondary)]" />
              </div>
              <p className="text-2xl font-bold text-[var(--text-primary)]">
                {formatRupiah(crmStats?.totalPaidAmount || 0)}
              </p>
              <p className="text-sm text-[var(--text-secondary)] mt-1">All time paid</p>
            </Card>
          </motion.div>

          <motion.div variants={itemVariants}>
            <Card className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-[var(--text-primary)]">Total Invoices</h3>
                <FileText className="w-5 h-5 text-[var(--text-secondary)]" />
              </div>
              <p className="text-2xl font-bold text-[var(--text-primary)]">
                {crmStats?.totalInvoices || 0}
              </p>
              <p className="text-sm text-[var(--text-secondary)] mt-1">All invoices</p>
            </Card>
          </motion.div>
        </div>
      </motion.div>
    );
  }

  // HR Dashboard (non-admin HR users)
  if (isHr) {
    const chartData = hrStats?.monthlyData?.map((m: any) => ({
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
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">HR Dashboard</h1>
          <p className="text-[var(--text-secondary)]">Human Resources overview</p>
        </div>

        {/* HR Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <motion.div variants={itemVariants}>
            <Card className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-[var(--text-secondary)]">Total Employees</p>
                  <p className="text-3xl font-bold text-[var(--text-primary)] mt-1">
                    {hrStats?.totalEmployees || 0}
                  </p>
                  <p className="text-sm text-[var(--text-muted)] mt-1">
                    {hrStats?.activeEmployees || 0} active
                  </p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-black/10 dark:bg-white/10 flex items-center justify-center">
                  <Users className="w-6 h-6 text-[var(--text-primary)]" />
                </div>
              </div>
            </Card>
          </motion.div>

          <motion.div variants={itemVariants}>
            <Card className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-[var(--text-secondary)]">This Month's Payroll</p>
                  <p className="text-3xl font-bold text-[var(--text-primary)] mt-1">
                    {hrStats?.currentMonthPayroll
                      ? formatRupiah(hrStats.currentMonthPayroll.totalNet)
                      : '-'}
                  </p>
                  <p className="text-sm text-[var(--text-secondary)] mt-1">
                    {hrStats?.currentMonthPayroll?.status || 'Not created'}
                  </p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-black/10 dark:bg-white/10 flex items-center justify-center">
                  <Wallet className="w-6 h-6 text-[var(--text-primary)]" />
                </div>
              </div>
            </Card>
          </motion.div>

          <motion.div variants={itemVariants}>
            <Card className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-[var(--text-secondary)]">Pending Expenses</p>
                  <p className="text-3xl font-bold text-[var(--text-primary)] mt-1">
                    {hrStats?.pendingExpenses || 0}
                  </p>
                  <p className="text-sm text-[var(--text-muted)] mt-1">Awaiting review</p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-black/10 dark:bg-white/10 flex items-center justify-center">
                  <Receipt className="w-6 h-6 text-[var(--text-primary)]" />
                </div>
              </div>
            </Card>
          </motion.div>

          <motion.div variants={itemVariants}>
            <Card className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-[var(--text-secondary)]">Approved This Month</p>
                  <p className="text-3xl font-bold text-[var(--text-primary)] mt-1">
                    {formatRupiah(hrStats?.currentMonthApprovedAmount || 0)}
                  </p>
                  <p className="text-sm text-[var(--text-muted)] mt-1">
                    {hrStats?.currentMonthApprovedCount || 0} expenses
                  </p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-black/10 dark:bg-white/10 flex items-center justify-center">
                  <Check className="w-6 h-6 text-[var(--text-primary)]" />
                </div>
              </div>
            </Card>
          </motion.div>

          <motion.div variants={itemVariants}>
            <Card className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-[var(--text-secondary)]">Period</p>
                  <p className="text-3xl font-bold text-[var(--text-primary)] mt-1">
                    {getIndonesianMonth(new Date().getMonth() + 1).substring(0, 3)}
                  </p>
                  <p className="text-sm text-[var(--text-secondary)] mt-1">{new Date().getFullYear()}</p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-black/10 dark:bg-white/10 flex items-center justify-center">
                  <Calendar className="w-6 h-6 text-[var(--text-primary)]" />
                </div>
              </div>
            </Card>
          </motion.div>
        </div>

        {/* Chart */}
        <motion.div variants={itemVariants}>
          <Card className="p-6">
            <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-4">
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
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">Dashboard</h1>
          <p className="text-[var(--text-secondary)]">Welcome back, {user?.employee?.fullName}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <motion.div variants={itemVariants}>
            <Card className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-[var(--text-primary)]">Pending Contracts</h3>
                <FileSignature className="w-5 h-5 text-[var(--text-secondary)]" />
              </div>
              <p className="text-3xl font-bold text-[var(--text-primary)]">{pendingContracts.length}</p>
              <p className="text-sm text-[var(--text-secondary)] mt-1">Awaiting signature</p>
            </Card>
          </motion.div>

          <motion.div variants={itemVariants}>
            <Card className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-[var(--text-primary)]">Active Contracts</h3>
                <FileText className="w-5 h-5 text-[var(--text-secondary)]" />
              </div>
              <p className="text-3xl font-bold text-[var(--text-primary)]">{signedContracts.length}</p>
              <p className="text-sm text-[var(--text-secondary)] mt-1">Signed & active</p>
            </Card>
          </motion.div>

          <motion.div variants={itemVariants}>
            <Card className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-[var(--text-primary)]">Pending Invoices</h3>
                <ReceiptText className="w-5 h-5 text-[var(--text-secondary)]" />
              </div>
              <p className="text-3xl font-bold text-[var(--text-primary)]">{pendingInvoices.length}</p>
              <p className="text-sm text-[var(--text-secondary)] mt-1">Awaiting payment</p>
            </Card>
          </motion.div>

          <motion.div variants={itemVariants}>
            <Card className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-[var(--text-primary)]">Total Due</h3>
                <Wallet className="w-5 h-5 text-[var(--text-secondary)]" />
              </div>
              <p className="text-2xl font-bold text-[var(--text-primary)]">
                {formatRupiah(totalPendingAmount)}
              </p>
              <p className="text-sm text-[var(--text-secondary)] mt-1">Outstanding amount</p>
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
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">Dashboard</h1>
        <p className="text-[var(--text-secondary)]">Welcome back, {user?.employee?.fullName}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <motion.div variants={itemVariants}>
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-[var(--text-primary)]">Latest Payslip</h3>
              <FileText className="w-5 h-5 text-[var(--text-secondary)]" />
            </div>
            {latestPayslip ? (
              <div>
                <p className="text-2xl font-bold text-[var(--text-primary)]">
                  {formatRupiah(parseFloat(latestPayslip.netSalary))}
                </p>
                <p className="text-sm text-[var(--text-secondary)] mt-1">Take home pay</p>
              </div>
            ) : (
              <p className="text-[var(--text-secondary)]">No data available</p>
            )}
          </Card>
        </motion.div>

        <motion.div variants={itemVariants}>
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-[var(--text-primary)]">Pending Contracts</h3>
              <FileSignature className="w-5 h-5 text-[var(--text-secondary)]" />
            </div>
            <p className="text-2xl font-bold text-[var(--text-primary)]">{pendingContracts.length}</p>
            <p className="text-sm text-[var(--text-secondary)] mt-1">Awaiting signature</p>
          </Card>
        </motion.div>

        <motion.div variants={itemVariants}>
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-[var(--text-primary)]">Pending Expenses</h3>
              <Receipt className="w-5 h-5 text-[var(--text-secondary)]" />
            </div>
            <p className="text-2xl font-bold text-[var(--text-primary)]">{pendingExpenses.length}</p>
            <p className="text-sm text-[var(--text-secondary)] mt-1">Awaiting approval</p>
          </Card>
        </motion.div>

        <motion.div variants={itemVariants}>
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-[var(--text-primary)]">Status</h3>
              <TrendingUp className="w-5 h-5 text-[var(--text-secondary)]" />
            </div>
            <span className="badge badge-success">Active</span>
            <p className="text-sm text-[var(--text-secondary)] mt-2">
              Employee #: {user?.employee?.employeeNumber}
            </p>
            {signedContracts.length > 0 && (
              <p className="text-xs text-[var(--text-secondary)] mt-1">
                {signedContracts.length} active contract{signedContracts.length !== 1 ? 's' : ''}
              </p>
            )}
          </Card>
        </motion.div>
      </div>
    </motion.div>
  );
}
