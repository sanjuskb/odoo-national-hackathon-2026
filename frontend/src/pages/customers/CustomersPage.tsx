import React, { useState, useEffect, useCallback } from 'react';
import {
  Users,
  Search,
  Copy,
  Check,
  UserPlus,
  Mail,
  Building,
  RefreshCw,
} from 'lucide-react';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  Button,
  Input,
  Badge,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  Skeleton,
  EmptyState,
  ErrorState,
  Breadcrumbs,
} from '@/components/ui';
import { useToast } from '@/components/ui/Toast';
import { apiClient } from '@/api/client';
import { formatDate } from '@/lib/utils';

interface CustomerProfile {
  id: string;
  email: string;
  full_name: string | null;
  role: string;
  company_name: string | null;
  phone: string | null;
  account_status: string | null;
  created_at: string;
}

export const CustomersPage: React.FC = () => {
  const { success, error: toastError } = useToast();
  const [customers, setCustomers] = useState<CustomerProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // New Customer Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    password: '',
  });

  const fetchCustomers = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const res = await apiClient.get<{ customers: CustomerProfile[] }>('/admin/customers');
      if (res.success && res.data?.customers) {
        setCustomers(res.data.customers);
      } else {
        setErrorMessage(res.message || 'Failed to load customer profiles');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Network error fetching customers');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  const handleCopyId = (id: string) => {
    navigator.clipboard.writeText(id);
    setCopiedId(id);
    success('Customer ID copied to clipboard');
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleRegisterCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.email || !formData.password || !formData.full_name) {
      toastError('All fields are required');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await apiClient.post('/auth/register', {
        email: formData.email,
        password: formData.password,
        full_name: formData.full_name,
      });

      if (res.success) {
        success('Customer registered successfully');
        setIsModalOpen(false);
        setFormData({ full_name: '', email: '', password: '' });
        fetchCustomers();
      } else {
        toastError(res.message || 'Failed to register customer');
      }
    } catch (err: any) {
      toastError(err.message || 'Registration failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredCustomers = customers.filter((c) => {
    const q = searchQuery.toLowerCase();
    return (
      c.email.toLowerCase().includes(q) ||
      (c.full_name && c.full_name.toLowerCase().includes(q)) ||
      c.id.toLowerCase().includes(q)
    );
  });

  const totalCustomers = customers.filter((c) => c.role === 'customer').length;
  const totalStaff = customers.filter((c) => c.role !== 'customer').length;

  return (
    <div className="space-y-6">
      <Breadcrumbs
        items={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Customer Directory' },
        ]}
      />

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Customer Directory
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Manage verified business accounts, copy customer UUIDs for subscriptions, and provision access.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchCustomers}
            disabled={isLoading}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => setIsModalOpen(true)}
          >
            <UserPlus className="w-4 h-4 mr-2" />
            New Customer
          </Button>
        </div>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Total Customers
                </p>
                <p className="text-2xl font-bold text-slate-900 mt-1">{totalCustomers}</p>
              </div>
              <div className="p-3 bg-blue-50 text-blue-600 rounded-lg">
                <Users className="w-5 h-5" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Staff & Admins
                </p>
                <p className="text-2xl font-bold text-indigo-600 mt-1">{totalStaff}</p>
              </div>
              <div className="p-3 bg-indigo-50 text-indigo-600 rounded-lg">
                <Building className="w-5 h-5" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Active Directory
                </p>
                <p className="text-2xl font-bold text-emerald-600 mt-1">{customers.length}</p>
              </div>
              <div className="p-3 bg-emerald-50 text-emerald-600 rounded-lg">
                <Mail className="w-5 h-5" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Table Card */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <CardTitle>Verified Accounts</CardTitle>
              <CardDescription>
                Profiles authenticated via Supabase Identity with Row-Level Security tenant isolation
              </CardDescription>
            </div>
            <div className="w-full sm:w-72">
              <Input
                placeholder="Search by name, email, or ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                leftIcon={<Search className="w-4 h-4 text-slate-400" />}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : errorMessage ? (
            <ErrorState
              title="Unable to load customer directory"
              message={errorMessage}
              onRetry={fetchCustomers}
            />
          ) : filteredCustomers.length === 0 ? (
            <EmptyState
              icon={<Users className="w-10 h-10 text-slate-300" />}
              title="No customer accounts found"
              description={
                searchQuery
                  ? 'No profiles match your search criteria.'
                  : 'Get started by creating your first customer account.'
              }
              actionLabel="Register Customer"
              onAction={() => setIsModalOpen(true)}
            />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Customer / Contact</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Customer UUID</TableHead>
                    <TableHead>Account Status</TableHead>
                    <TableHead>Created Date</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCustomers.map((customer) => (
                    <TableRow key={customer.id}>
                      <TableCell>
                        <div className="font-medium text-slate-900">
                          {customer.full_name || 'Unnamed Account'}
                        </div>
                        <div className="text-xs text-slate-500">{customer.email}</div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            customer.role === 'admin'
                              ? 'danger'
                              : customer.role === 'staff'
                              ? 'info'
                              : 'success'
                          }
                        >
                          {customer.role}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2 font-mono text-xs text-slate-600 bg-slate-100 px-2 py-1 rounded w-fit">
                          <span>{customer.id.substring(0, 8)}...{customer.id.substring(customer.id.length - 4)}</span>
                          <button
                            type="button"
                            onClick={() => handleCopyId(customer.id)}
                            className="text-slate-400 hover:text-slate-700"
                            title="Copy full UUID"
                          >
                            {copiedId === customer.id ? (
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={customer.account_status === 'inactive' ? 'neutral' : 'success'}>
                          {customer.account_status || 'active'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-slate-500">
                        {formatDate(customer.created_at)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleCopyId(customer.id)}
                        >
                          <Copy className="w-3.5 h-3.5 mr-1" />
                          Copy ID
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* New Customer Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-lg font-semibold text-slate-900">Register New Customer</h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleRegisterCustomer} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Full Name / Organization
                </label>
                <Input
                  required
                  placeholder="e.g. Acme Corporation"
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Email Address
                </label>
                <Input
                  required
                  type="email"
                  placeholder="billing@acme.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Initial Password
                </label>
                <Input
                  required
                  type="password"
                  placeholder="Minimum 8 characters"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsModalOpen(false)}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button type="submit" variant="primary" disabled={isSubmitting}>
                  {isSubmitting ? 'Registering...' : 'Register Customer'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
