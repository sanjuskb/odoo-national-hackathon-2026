import React, { useState, useEffect } from 'react';
import { api } from '@/api/client';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  Badge,
  BadgeVariant,
  Button,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  Modal,
  Input,
  Select,
  Breadcrumbs,
  EmptyState,
} from '@/components/ui';
import { useToast } from '@/components/ui/Toast';
import {
  Receipt,
  Sparkles,
  Volume2,
  RefreshCw,
  CheckCircle,
  CreditCard,
} from 'lucide-react';

interface Invoice {
  id: string;
  invoice_number?: string;
  subscription_id: string;
  customer_id: string;
  billing_period_start: string;
  billing_period_end_exclusive: string;
  currency: string;
  status: 'draft' | 'confirmed' | 'paid' | 'cancelled';
  subtotal: string;
  tax_total: string;
  discount_total: string;
  total: string;
  due_date: string;
  financials?: {
    paid_amount: string;
    balance_due: string;
    is_overdue: boolean;
  };
}

export const InvoicesPage: React.FC = () => {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  // AI Explanation Modal State
  const [explainModalOpen, setExplainModalOpen] = useState(false);
  const [activeExplanation, setActiveExplanation] = useState<any>(null);
  const [explaining, setExplaining] = useState(false);

  // Murf Voice Modal State
  const [voiceModalOpen, setVoiceModalOpen] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [voiceDuration, setVoiceDuration] = useState<number>(0);
  const [synthesizing, setSynthesizing] = useState(false);

  // Payment Modal State
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('bank_transfer');
  const [paymentNote, setPaymentNote] = useState('');
  const [recordingPayment, setRecordingPayment] = useState(false);

  const fetchInvoices = async () => {
    setLoading(true);
    try {
      const res = await api.get<{ items: Invoice[] }>('/invoices');
      if (res.success && res.data) {
        setInvoices(res.data.items || []);
      }
    } catch {
      toast({ title: 'Error', message: 'Failed to load invoices', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoices();
  }, []);

  const handleConfirmInvoice = async (id: string) => {
    try {
      const res = await api.post<any>(`/invoices/${id}/confirm`);
      if (res.success) {
        toast({ title: 'Confirmed', message: 'Invoice confirmed successfully', type: 'success' });
        fetchInvoices();
      } else {
        toast({ title: 'Failed', message: res.message || 'Could not confirm invoice', type: 'error' });
      }
    } catch {
      toast({ title: 'Error', message: 'Network error confirming invoice', type: 'error' });
    }
  };

  const handleExplainInvoice = async (id: string) => {
    setExplaining(true);
    setExplainModalOpen(true);
    setActiveExplanation(null);
    try {
      const res = await api.post<any>(`/invoices/${id}/explain`);
      if (res.success && res.data) {
        setActiveExplanation(res.data);
      } else {
        toast({ title: 'Explanation Failed', message: res.message || 'Failed to explain invoice', type: 'error' });
      }
    } catch {
      toast({ title: 'Error', message: 'Network error generating explanation', type: 'error' });
    } finally {
      setExplaining(false);
    }
  };

  const handleVoiceSynthesis = async (id: string) => {
    setSynthesizing(true);
    setVoiceModalOpen(true);
    setAudioUrl(null);
    try {
      const res = await api.post<any>(`/invoices/${id}/speak`);
      if (res.success && res.data?.speech) {
        setAudioUrl(res.data.speech.audio_url);
        setVoiceDuration(res.data.speech.duration_seconds || 0);
        toast({ title: 'Speech Ready', message: 'Synthesized via live Murf API', type: 'success' });
      } else {
        toast({ title: 'Voice Failed', message: res.message || 'Failed to synthesize speech', type: 'error' });
      }
    } catch {
      toast({ title: 'Error', message: 'Network error during speech synthesis', type: 'error' });
    } finally {
      setSynthesizing(false);
    }
  };

  const handleOpenPayment = (inv: Invoice) => {
    setSelectedInvoice(inv);
    const balance = inv.financials?.balance_due || inv.total;
    setPaymentAmount(balance);
    setPaymentModalOpen(true);
  };

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInvoice) return;
    setRecordingPayment(true);
    try {
      const res = await api.post<any>(`/invoices/${selectedInvoice.id}/payments`, {
        amount: paymentAmount,
        method: paymentMethod,
        note: paymentNote,
        payment_date: new Date().toISOString().slice(0, 10),
      });
      if (res.success) {
        toast({ title: 'Payment Recorded', message: `Settled ${selectedInvoice.currency} ${paymentAmount}`, type: 'success' });
        setPaymentModalOpen(false);
        fetchInvoices();
      } else {
        toast({ title: 'Payment Failed', message: res.message || 'Could not record payment', type: 'error' });
      }
    } catch {
      toast({ title: 'Error', message: 'Network error recording payment', type: 'error' });
    } finally {
      setRecordingPayment(false);
    }
  };

  const getStatusBadgeVariant = (status: string): BadgeVariant => {
    switch (status) {
      case 'paid': return 'success';
      case 'confirmed': return 'default';
      case 'draft': return 'neutral';
      case 'cancelled': return 'danger';
      default: return 'neutral';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Breadcrumbs items={[{ label: 'Invoices' }]} />
          <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            Invoices & Automated Billing Ledger
            <Badge variant="success">Deterministic Engine</Badge>
          </h2>
          <p className="text-xs text-slate-500">
            Automated billing invoices with exact tax breakdown, AI voice narration, and partial payment reconciliation.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={fetchInvoices} leftIcon={<RefreshCw className="w-3.5 h-3.5" />}>
            Refresh
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div>
            <CardTitle>Invoices Ledger</CardTitle>
            <CardDescription>Immutable financial records generated on billing cycle maturity</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="py-12 text-center text-xs text-slate-400">Loading invoices...</div>
          ) : invoices.length === 0 ? (
            <div className="p-6">
              <EmptyState
                icon={<Receipt className="w-8 h-8" />}
                title="No Invoices Issued Yet"
                description="Invoices are created automatically when subscriptions mature or when running billing batches."
              />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice #</TableHead>
                  <TableHead>Billing Period</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead>Subtotal</TableHead>
                  <TableHead>Tax</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Balance Due</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoices.map((inv) => {
                  const num = inv.invoice_number || `INV-${inv.id.slice(0, 8).toUpperCase()}`;
                  const balance = inv.financials?.balance_due || inv.total;
                  return (
                    <TableRow key={inv.id}>
                      <TableCell className="font-semibold text-slate-900">{num}</TableCell>
                      <TableCell className="text-xs text-slate-600">
                        {inv.billing_period_start} → {inv.billing_period_end_exclusive}
                      </TableCell>
                      <TableCell className="text-xs text-slate-600">{inv.due_date}</TableCell>
                      <TableCell className="text-xs text-slate-700">₹{inv.subtotal}</TableCell>
                      <TableCell className="text-xs text-slate-700">₹{inv.tax_total}</TableCell>
                      <TableCell className="font-bold text-slate-900">₹{inv.total}</TableCell>
                      <TableCell className="font-semibold text-amber-700">₹{balance}</TableCell>
                      <TableCell>
                        <Badge variant={getStatusBadgeVariant(inv.status)}>{inv.status.toUpperCase()}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Explain with AI */}
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleExplainInvoice(inv.id)}
                            leftIcon={<Sparkles className="w-3 h-3 text-purple-600" />}
                          >
                            Explain
                          </Button>

                          {/* Listen Murf Voice */}
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleVoiceSynthesis(inv.id)}
                            leftIcon={<Volume2 className="w-3 h-3 text-blue-600" />}
                          >
                            Listen
                          </Button>

                          {/* Confirm */}
                          {inv.status === 'draft' && (
                            <Button
                              size="sm"
                              variant="primary"
                              onClick={() => handleConfirmInvoice(inv.id)}
                              leftIcon={<CheckCircle className="w-3 h-3" />}
                            >
                              Confirm
                            </Button>
                          )}

                          {/* Pay */}
                          {inv.status === 'confirmed' && parseFloat(balance) > 0 && (
                            <Button
                              size="sm"
                              variant="primary"
                              onClick={() => handleOpenPayment(inv)}
                              leftIcon={<CreditCard className="w-3 h-3" />}
                            >
                              Pay
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* AI Invoice Explanation Modal */}
      <Modal isOpen={explainModalOpen} onClose={() => setExplainModalOpen(false)} title="AI Invoice Intelligence Explanation">
        {explaining ? (
          <div className="py-12 text-center text-xs text-slate-500">Generating grounded plain-language explanation...</div>
        ) : activeExplanation ? (
          <div className="space-y-4">
            <div className="p-3 bg-purple-50 rounded-xl border border-purple-200">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-purple-900 mb-1">
                <Sparkles className="w-4 h-4 text-purple-600" /> Grounded Financial Summary
              </div>
              <p className="text-xs leading-relaxed text-purple-950 font-medium">
                {activeExplanation.explanation_narrative}
              </p>
            </div>

            <div>
              <h4 className="text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">Itemized Line Breakdown</h4>
              <div className="space-y-1.5">
                {activeExplanation.lines?.map((l: any, i: number) => (
                  <div key={i} className="flex items-center justify-between p-2 rounded-lg bg-slate-50 text-xs">
                    <div>
                      <span className="font-semibold text-slate-800">{l.description}</span>
                      <span className="text-slate-400 ml-2">({l.quantity}x @ ₹{l.unitPrice})</span>
                    </div>
                    <div className="font-bold text-slate-900">₹{l.lineTotal}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-100 text-xs">
              <div className="p-2 bg-slate-50 rounded-lg">
                <span className="text-slate-400 block text-[10px]">Subtotal</span>
                <span className="font-semibold">₹{activeExplanation.subtotal}</span>
              </div>
              <div className="p-2 bg-slate-50 rounded-lg">
                <span className="text-slate-400 block text-[10px]">Taxes</span>
                <span className="font-semibold">₹{activeExplanation.tax_total}</span>
              </div>
              <div className="p-2 bg-slate-50 rounded-lg">
                <span className="text-slate-400 block text-[10px]">Total</span>
                <span className="font-bold text-slate-900">₹{activeExplanation.total}</span>
              </div>
            </div>

            <p className="text-[10px] text-slate-400 italic">
              {activeExplanation.disclaimer}
            </p>
          </div>
        ) : null}
      </Modal>

      {/* Murf Voice Synthesis Modal */}
      <Modal isOpen={voiceModalOpen} onClose={() => setVoiceModalOpen(false)} title="Live Murf TTS Speech Narration">
        {synthesizing ? (
          <div className="py-12 text-center text-xs text-slate-500">
            Calling Murf API (Voice: en-US-marcus)...
          </div>
        ) : audioUrl ? (
          <div className="space-y-4">
            <div className="p-4 bg-blue-50 rounded-xl border border-blue-200 text-center">
              <Volume2 className="w-8 h-8 text-blue-600 mx-auto mb-2" />
              <h4 className="text-sm font-bold text-blue-900">Audio Explanation Ready</h4>
              <p className="text-xs text-blue-700 mt-1">
                Synthesized duration: {voiceDuration.toFixed(1)} seconds
              </p>
            </div>

            <audio controls autoPlay className="w-full mt-4">
              <source src={audioUrl} type="audio/mpeg" />
              Your browser does not support audio playback.
            </audio>

            <div className="flex justify-between items-center text-[11px] text-slate-400 pt-2 border-t border-slate-100">
              <span>Provider: Murf Studio Gen2 API</span>
              <a href={audioUrl} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">
                Open MP3 File
              </a>
            </div>
          </div>
        ) : null}
      </Modal>

      {/* Record Payment Modal */}
      <Modal isOpen={paymentModalOpen} onClose={() => setPaymentModalOpen(false)} title="Record Invoice Payment">
        <form onSubmit={handleRecordPayment} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Payment Amount (₹)</label>
            <Input
              type="text"
              value={paymentAmount}
              onChange={(e) => setPaymentAmount(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Payment Method</label>
            <Select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
              options={[
                { value: 'bank_transfer', label: 'Bank Transfer / NEFT / IMPS' },
                { value: 'credit_card', label: 'Credit / Debit Card' },
                { value: 'upi', label: 'UPI / NetBanking' },
                { value: 'cash', label: 'Cash / Manual Settlement' },
              ]}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Audit Notes / Reference</label>
            <Input
              type="text"
              placeholder="e.g. UTR-982348274 or Cheque #10293"
              value={paymentNote}
              onChange={(e) => setPaymentNote(e.target.value)}
            />
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
            <Button variant="outline" type="button" onClick={() => setPaymentModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" isLoading={recordingPayment}>
              Record Payment
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
