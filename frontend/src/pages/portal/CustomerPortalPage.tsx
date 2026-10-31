import React from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, Badge, EmptyState } from '@/components/ui';

export const CustomerPortalPage: React.FC = () => {
  return (
    <div className="space-y-6">
      {/* Customer Header Banner */}
      <div className="rounded-2xl bg-gradient-to-r from-[#0b1329] to-[#1e293b] p-6 text-white shadow-md">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Badge variant="neutral">Customer Portal Preview</Badge>
            </div>
            <h2 className="text-xl font-bold tracking-tight text-white">Self-Service Customer Portal</h2>
            <p className="text-xs text-slate-300 mt-0.5">
              Securely view subscriptions, download invoices, and manage payment methods once authenticated.
            </p>
          </div>
        </div>
      </div>

      {/* Empty State Container */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <div>
              <CardTitle>My Active Subscription</CardTitle>
              <CardDescription>Filtered strictly to authenticated customer ID</CardDescription>
            </div>
            <Badge variant="neutral">No Active Plan</Badge>
          </CardHeader>
          <CardContent className="py-8">
            <EmptyState
              title="No Subscription Found"
              description="When your account is assigned an active plan by Brightloop staff, subscription details and renewal schedules will appear here."
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div>
              <CardTitle>Payment Methods</CardTitle>
              <CardDescription>Saved payment details on file</CardDescription>
            </div>
            <Badge variant="neutral">None on file</Badge>
          </CardHeader>
          <CardContent className="py-8">
            <EmptyState
              title="No Payment Method Recorded"
              description="Payment method registration will become available once the backend payment recording API is approved."
            />
          </CardContent>
        </Card>
      </div>

      {/* Invoices List - Empty State */}
      <Card>
        <CardHeader>
          <div>
            <CardTitle>Invoices & Payment Receipts</CardTitle>
            <CardDescription>Only invoices matching your authenticated account will be retrieved.</CardDescription>
          </div>
        </CardHeader>
        <div className="py-8">
          <EmptyState
            title="No Invoices Issued"
            description="All invoices generated for your subscriptions will be downloadable here with full tax breakdowns."
          />
        </div>
      </Card>
    </div>
  );
};
