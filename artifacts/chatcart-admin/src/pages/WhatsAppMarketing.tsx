import React, { useEffect, useRef, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminFetch } from '@/lib/adminFetch';
import { Layout } from '@/components/Layout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import {
  Wifi, WifiOff, Loader2, QrCode, MessageCircle, Users, Activity,
  Plus, Trash2, Play, Pause, RefreshCw, CheckCircle2, XCircle,
  AlertTriangle, Clock, MessageSquare, TrendingUp, Phone
} from 'lucide-react';

// ── Types ──────────────────────────────────────────────────────────────────────

interface WAState {
  status: 'disconnected' | 'connecting' | 'connected';
  qr: string | null;
  phone: string | null;
  connectedAt: string | null;
  settings: WASettings;
}

interface WASettings {
  id: number;
  dailyLimit: number;
  warmupDailyLimit: number;
  warmupDays: number;
  replyRateThreshold: number;
  isPaused: boolean;
  connectedAt: string | null;
}

interface Sequence {
  id: number;
  name: string;
  description: string | null;
  steps: SequenceStep[];
  leadCount: number;
  createdAt: string;
}

interface SequenceStep {
  id?: number;
  dayOffset: number;
  message: string;
}

interface CampaignLead {
  id: number;
  sequenceId: number;
  sequenceName: string;
  sellerId: number;
  storeName: string;
  phone: string;
  currentDay: number;
  nextSendAt: string | null;
  lastSentAt: string | null;
  repliedAt: string | null;
  status: 'active' | 'paused_no_reply' | 'paused_manual' | 'completed' | 'removed';
  createdAt: string;
}

interface PendingSeller {
  id: number;
  storeName: string;
  phone: string;
  subdomain: string;
  createdAt: string;
}

interface HealthMetrics {
  sentToday: number;
  sentThisWeek: number;
  failedToday: number;
  replyRate: number | null;
  activeLeads: number;
  pausedLeads: number;
  completedLeads: number;
  dailyLimit: number;
  warmupDailyLimit: number;
  warmupDays: number;
  isPaused: boolean;
  replyRateThreshold: number;
  connectedAt: string | null;
}

interface SendLog {
  id: number;
  toPhone: string;
  message: string;
  status: 'sent' | 'failed';
  errorMessage: string | null;
  sentAt: string;
  storeName: string | null;
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function fmtDate(d: string | null) {
  if (!d) return '—';
  return new Date(d).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}

function StatusBadge({ status }: { status: CampaignLead['status'] }) {
  const map = {
    active: { label: 'Active', variant: 'default' as const, color: 'bg-green-100 text-green-800' },
    paused_no_reply: { label: 'Paused (no reply)', variant: 'secondary' as const, color: 'bg-yellow-100 text-yellow-800' },
    paused_manual: { label: 'Paused', variant: 'secondary' as const, color: 'bg-orange-100 text-orange-800' },
    completed: { label: 'Completed', variant: 'outline' as const, color: 'bg-blue-100 text-blue-800' },
    removed: { label: 'Removed', variant: 'destructive' as const, color: 'bg-red-100 text-red-800' },
  };
  const { label, color } = map[status] ?? map.active;
  return <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${color}`}>{label}</span>;
}

// ── Connection Tab ─────────────────────────────────────────────────────────────

function ConnectionTab() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [waState, setWaState] = useState<WAState | null>(null);
  const [settings, setSettings] = useState<WASettings | null>(null);
  const esRef = useRef<EventSource | null>(null);

  const { data: initialStatus } = useQuery<WAState>({
    queryKey: ['wa-status'],
    queryFn: () => adminFetch('/api/admin/wa/status'),
    refetchInterval: false,
  });

  useEffect(() => {
    if (initialStatus) {
      setWaState(initialStatus);
      setSettings(initialStatus.settings);
    }
  }, [initialStatus]);

  useEffect(() => {
    const token = localStorage.getItem('chatcart_admin_token') ?? '';
    const es = new EventSource(`/api/admin/wa/stream?token=${encodeURIComponent(token)}`);
    esRef.current = es;

    es.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);
        if (data.type === 'state') {
          setWaState((prev) => ({ ...(prev ?? {} as any), ...data }));
        } else if (data.type === 'qr') {
          setWaState((prev) => prev ? { ...prev, qr: data.qr } : null);
        }
      } catch {}
    };

    es.onerror = () => {};

    return () => {
      es.close();
    };
  }, []);

  const connectMut = useMutation({
    mutationFn: () => adminFetch('/api/admin/wa/connect', { method: 'POST' }),
    onSuccess: () => toast({ title: 'Connecting…', description: 'Scan the QR code with your WhatsApp' }),
    onError: () => toast({ title: 'Error', description: 'Could not start connection', variant: 'destructive' }),
  });

  const disconnectMut = useMutation({
    mutationFn: () => adminFetch('/api/admin/wa/disconnect', { method: 'POST' }),
    onSuccess: () => {
      toast({ title: 'Disconnected', description: 'WhatsApp session ended and session data cleared' });
      setWaState((prev) => prev ? { ...prev, status: 'disconnected', qr: null, phone: null } : null);
    },
    onError: () => toast({ title: 'Error', description: 'Could not disconnect', variant: 'destructive' }),
  });

  const saveMut = useMutation({
    mutationFn: (data: Partial<WASettings>) => adminFetch('/api/admin/wa/settings', { method: 'PATCH', body: JSON.stringify(data) }),
    onSuccess: (updated: WASettings) => {
      setSettings(updated);
      toast({ title: 'Settings saved' });
    },
    onError: () => toast({ title: 'Error', description: 'Could not save settings', variant: 'destructive' }),
  });

  const status = waState?.status ?? 'disconnected';
  const qr = waState?.qr;

  return (
    <div className="space-y-6">
      {/* Connection status card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {status === 'connected' ? (
              <Wifi className="w-5 h-5 text-green-600" />
            ) : status === 'connecting' ? (
              <Loader2 className="w-5 h-5 animate-spin text-yellow-600" />
            ) : (
              <WifiOff className="w-5 h-5 text-muted-foreground" />
            )}
            Connection Status
          </CardTitle>
          <CardDescription>
            {status === 'connected' && `Connected as ${waState?.phone ?? 'unknown'}`}
            {status === 'connecting' && 'Waiting for QR scan…'}
            {status === 'disconnected' && 'Not connected. Click Connect to generate a QR code.'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {status === 'connected' && (
            <div className="flex items-center gap-3 p-4 bg-green-50 rounded-lg border border-green-200">
              <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0" />
              <div>
                <div className="font-medium text-green-800">WhatsApp Connected</div>
                <div className="text-sm text-green-700">Phone: +{waState?.phone}</div>
                {waState?.connectedAt && (
                  <div className="text-xs text-green-600">Since {fmtDate(waState.connectedAt)}</div>
                )}
              </div>
            </div>
          )}

          {status === 'connecting' && qr && (
            <div className="flex flex-col items-center gap-4 p-6 bg-muted rounded-lg">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <QrCode className="w-4 h-4" />
                Scan this QR code with your WhatsApp (Settings → Linked Devices → Link a Device)
              </div>
              <img
                src={qr}
                alt="WhatsApp QR Code"
                className="w-64 h-64 rounded-lg border-4 border-white shadow-md"
              />
              <p className="text-xs text-muted-foreground">QR refreshes automatically. Do not close this window.</p>
            </div>
          )}

          {status === 'connecting' && !qr && (
            <div className="flex items-center gap-3 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
              <Loader2 className="w-5 h-5 animate-spin text-yellow-600" />
              <span className="text-yellow-800">Initialising connection…</span>
            </div>
          )}

          <div className="flex gap-3">
            {status === 'disconnected' && (
              <Button onClick={() => connectMut.mutate()} disabled={connectMut.isPending}>
                {connectMut.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Wifi className="w-4 h-4 mr-2" />}
                Connect WhatsApp
              </Button>
            )}
            {status !== 'disconnected' && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" disabled={disconnectMut.isPending}>
                    {disconnectMut.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <WifiOff className="w-4 h-4 mr-2" />}
                    Disconnect & Clear Session
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Disconnect WhatsApp?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will log out the linked WhatsApp number and delete the stored session. You will need to scan a new QR code to reconnect.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={() => disconnectMut.mutate()} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                      Disconnect
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Settings */}
      {settings && (
        <Card>
          <CardHeader>
            <CardTitle>Sending Limits & Safety Settings</CardTitle>
            <CardDescription>All limits are enforced server-side. Changes take effect immediately.</CardDescription>
          </CardHeader>
          <CardContent>
            <SettingsForm settings={settings} onSave={(d) => saveMut.mutate(d)} saving={saveMut.isPending} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function SettingsForm({ settings, onSave, saving }: { settings: WASettings; onSave: (d: Partial<WASettings>) => void; saving: boolean }) {
  const [form, setForm] = useState(settings);

  useEffect(() => setForm(settings), [settings]);

  const changed = JSON.stringify(form) !== JSON.stringify(settings);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label>Daily Send Limit (after warm-up)</Label>
          <Input type="number" min={1} max={200} value={form.dailyLimit} onChange={(e) => setForm((f) => ({ ...f, dailyLimit: +e.target.value }))} />
          <p className="text-xs text-muted-foreground">Hard cap on outbound messages per day after warm-up period.</p>
        </div>
        <div className="space-y-2">
          <Label>Warm-up Daily Limit</Label>
          <Input type="number" min={1} max={50} value={form.warmupDailyLimit} onChange={(e) => setForm((f) => ({ ...f, warmupDailyLimit: +e.target.value }))} />
          <p className="text-xs text-muted-foreground">Cap during the first {form.warmupDays} days after connecting. Default 10/day.</p>
        </div>
        <div className="space-y-2">
          <Label>Warm-up Period (days)</Label>
          <Input type="number" min={1} max={90} value={form.warmupDays} onChange={(e) => setForm((f) => ({ ...f, warmupDays: +e.target.value }))} />
          <p className="text-xs text-muted-foreground">How many days a new number is in warm-up mode.</p>
        </div>
        <div className="space-y-2">
          <Label>Reply Rate Warning Threshold (%)</Label>
          <Input type="number" min={0} max={100} value={form.replyRateThreshold} onChange={(e) => setForm((f) => ({ ...f, replyRateThreshold: +e.target.value }))} />
          <p className="text-xs text-muted-foreground">Show a health warning if reply rate drops below this %.</p>
        </div>
      </div>
      {changed && (
        <Button onClick={() => onSave({ dailyLimit: form.dailyLimit, warmupDailyLimit: form.warmupDailyLimit, warmupDays: form.warmupDays, replyRateThreshold: form.replyRateThreshold })} disabled={saving}>
          {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
          Save Settings
        </Button>
      )}
    </div>
  );
}

// ── Sequences Tab ──────────────────────────────────────────────────────────────

function SequencesTab() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [creating, setCreating] = useState(false);

  const { data: sequences = [], isLoading } = useQuery<Sequence[]>({
    queryKey: ['wa-sequences'],
    queryFn: () => adminFetch('/api/admin/wa/sequences'),
  });

  const deleteMut = useMutation({
    mutationFn: (id: number) => adminFetch(`/api/admin/wa/sequences/${id}`, { method: 'DELETE' }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['wa-sequences'] }); toast({ title: 'Sequence deleted' }); },
    onError: () => toast({ title: 'Error', description: 'Could not delete sequence', variant: 'destructive' }),
  });

  if (isLoading) return <div className="flex items-center gap-2 py-8 text-muted-foreground"><Loader2 className="w-4 h-4 animate-spin" /> Loading…</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Drip Sequences</h3>
          <p className="text-sm text-muted-foreground">Create multi-day message sequences. Use {'{{name}}'} and {'{{storeName}}'} as template variables.</p>
        </div>
        <Dialog open={creating} onOpenChange={setCreating}>
          <DialogTrigger asChild>
            <Button><Plus className="w-4 h-4 mr-2" />New Sequence</Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create Sequence</DialogTitle>
            </DialogHeader>
            <CreateSequenceForm
              onSuccess={() => { setCreating(false); qc.invalidateQueries({ queryKey: ['wa-sequences'] }); }}
            />
          </DialogContent>
        </Dialog>
      </div>

      {sequences.length === 0 && (
        <div className="text-center py-12 text-muted-foreground border-2 border-dashed rounded-lg">
          <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p>No sequences yet. Create your first drip sequence.</p>
        </div>
      )}

      <div className="space-y-4">
        {sequences.map((seq) => (
          <Card key={seq.id}>
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-base">{seq.name}</CardTitle>
                  {seq.description && <CardDescription>{seq.description}</CardDescription>}
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{seq.steps.length} day{seq.steps.length !== 1 ? 's' : ''}</Badge>
                  <Badge variant="secondary">{seq.leadCount} lead{seq.leadCount !== 1 ? 's' : ''}</Badge>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive h-8 w-8">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete "{seq.name}"?</AlertDialogTitle>
                        <AlertDialogDescription>This will also remove all leads enrolled in this sequence.</AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => deleteMut.mutate(seq.id)} className="bg-destructive text-destructive-foreground">Delete</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {seq.steps.map((step) => (
                  <div key={step.id ?? step.dayOffset} className="flex gap-3 text-sm">
                    <span className="shrink-0 w-14 text-muted-foreground font-medium pt-0.5">Day {step.dayOffset}</span>
                    <span className="text-foreground/80 whitespace-pre-wrap leading-relaxed">{step.message}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

function CreateSequenceForm({ onSuccess }: { onSuccess: () => void }) {
  const { toast } = useToast();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [steps, setSteps] = useState<SequenceStep[]>([{ dayOffset: 1, message: '' }]);

  const createMut = useMutation({
    mutationFn: (data: { name: string; description?: string; steps: SequenceStep[] }) =>
      adminFetch('/api/admin/wa/sequences', { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: () => { toast({ title: 'Sequence created' }); onSuccess(); },
    onError: (e: Error) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const addStep = () => {
    const nextDay = (steps[steps.length - 1]?.dayOffset ?? 0) + 1;
    setSteps((s) => [...s, { dayOffset: nextDay, message: '' }]);
  };

  const removeStep = (idx: number) => setSteps((s) => s.filter((_, i) => i !== idx));

  const submit = () => {
    if (!name.trim()) { toast({ title: 'Sequence name is required', variant: 'destructive' }); return; }
    if (steps.some((s) => !s.message.trim())) { toast({ title: 'All message steps must have content', variant: 'destructive' }); return; }
    createMut.mutate({ name: name.trim(), description: description.trim() || undefined, steps });
  };

  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <Label>Sequence Name *</Label>
        <Input placeholder="e.g. 7-Day Pending Seller Nudge" value={name} onChange={(e) => setName(e.target.value)} />
      </div>
      <div className="space-y-2">
        <Label>Description (optional)</Label>
        <Input placeholder="Internal note about this sequence" value={description} onChange={(e) => setDescription(e.target.value)} />
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label>Message Steps</Label>
          <span className="text-xs text-muted-foreground">Variables: {'{{name}}'}, {'{{storeName}}'}</span>
        </div>
        {steps.map((step, idx) => (
          <div key={idx} className="border rounded-lg p-4 space-y-3 bg-muted/30">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Label className="text-sm font-semibold text-primary">Day {step.dayOffset}</Label>
              </div>
              {steps.length > 1 && (
                <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => removeStep(idx)}>
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              )}
            </div>
            <Textarea
              rows={4}
              placeholder={`Hi {{name}}, this is day ${step.dayOffset} of your Chatcart journey…`}
              value={step.message}
              onChange={(e) => setSteps((s) => s.map((st, i) => i === idx ? { ...st, message: e.target.value } : st))}
              className="font-mono text-sm"
            />
          </div>
        ))}
        <Button variant="outline" onClick={addStep} className="w-full">
          <Plus className="w-4 h-4 mr-2" />Add Day {(steps[steps.length - 1]?.dayOffset ?? 0) + 1}
        </Button>
      </div>

      <div className="flex gap-3 pt-2">
        <Button onClick={submit} disabled={createMut.isPending} className="flex-1">
          {createMut.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
          Create Sequence
        </Button>
      </div>
    </div>
  );
}

// ── Leads Tab ──────────────────────────────────────────────────────────────────

function LeadsTab() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [enrollOpen, setEnrollOpen] = useState(false);

  const { data: leads = [], isLoading } = useQuery<CampaignLead[]>({
    queryKey: ['wa-leads'],
    queryFn: () => adminFetch('/api/admin/wa/leads'),
    refetchInterval: 30000,
  });

  const updateMut = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) =>
      adminFetch(`/api/admin/wa/leads/${id}`, { method: 'PATCH', body: JSON.stringify({ status }) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['wa-leads'] }),
    onError: () => toast({ title: 'Error', description: 'Could not update lead', variant: 'destructive' }),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Campaign Leads</h3>
          <p className="text-sm text-muted-foreground">Pending sellers enrolled in drip sequences. Reply-gating is enforced automatically.</p>
        </div>
        <Dialog open={enrollOpen} onOpenChange={setEnrollOpen}>
          <DialogTrigger asChild>
            <Button><Users className="w-4 h-4 mr-2" />Enroll Sellers</Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Enroll Pending Sellers in a Sequence</DialogTitle>
            </DialogHeader>
            <EnrollForm onSuccess={() => { setEnrollOpen(false); qc.invalidateQueries({ queryKey: ['wa-leads'] }); }} />
          </DialogContent>
        </Dialog>
      </div>

      {isLoading && <div className="flex items-center gap-2 text-muted-foreground"><Loader2 className="w-4 h-4 animate-spin" />Loading…</div>}

      {!isLoading && leads.length === 0 && (
        <div className="text-center py-12 text-muted-foreground border-2 border-dashed rounded-lg">
          <Users className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p>No leads enrolled yet. Click "Enroll Sellers" to get started.</p>
        </div>
      )}

      {leads.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th className="pb-2 pr-4 font-medium">Seller</th>
                <th className="pb-2 pr-4 font-medium">Sequence</th>
                <th className="pb-2 pr-4 font-medium">Day</th>
                <th className="pb-2 pr-4 font-medium">Status</th>
                <th className="pb-2 pr-4 font-medium">Replied</th>
                <th className="pb-2 pr-4 font-medium">Next Send</th>
                <th className="pb-2 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {leads.map((lead) => (
                <tr key={lead.id} className="hover:bg-muted/30 transition-colors">
                  <td className="py-3 pr-4">
                    <div className="font-medium">{lead.storeName}</div>
                    <div className="text-xs text-muted-foreground">{lead.phone}</div>
                  </td>
                  <td className="py-3 pr-4 text-muted-foreground">{lead.sequenceName}</td>
                  <td className="py-3 pr-4">
                    <span className="font-mono font-semibold">{lead.currentDay === 0 ? '–' : `Day ${lead.currentDay}`}</span>
                  </td>
                  <td className="py-3 pr-4">
                    <StatusBadge status={lead.status} />
                  </td>
                  <td className="py-3 pr-4">
                    {lead.repliedAt ? (
                      <span className="flex items-center gap-1 text-green-700 text-xs">
                        <CheckCircle2 className="w-3.5 h-3.5" />{fmtDate(lead.repliedAt)}
                      </span>
                    ) : (
                      <span className="text-muted-foreground text-xs">No reply</span>
                    )}
                  </td>
                  <td className="py-3 pr-4 text-xs text-muted-foreground">{fmtDate(lead.nextSendAt)}</td>
                  <td className="py-3">
                    <div className="flex gap-1">
                      {lead.status === 'active' && (
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-orange-600" title="Pause manually"
                          onClick={() => updateMut.mutate({ id: lead.id, status: 'paused_manual' })}>
                          <Pause className="w-3.5 h-3.5" />
                        </Button>
                      )}
                      {(lead.status === 'paused_manual' || lead.status === 'paused_no_reply') && (
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-green-600" title="Resume / override reply gate"
                          onClick={() => updateMut.mutate({ id: lead.id, status: 'active' })}>
                          <Play className="w-3.5 h-3.5" />
                        </Button>
                      )}
                      {lead.status !== 'removed' && lead.status !== 'completed' && (
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" title="Remove from sequence"
                          onClick={() => updateMut.mutate({ id: lead.id, status: 'removed' })}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function EnrollForm({ onSuccess }: { onSuccess: () => void }) {
  const { toast } = useToast();
  const [selectedSequenceId, setSelectedSequenceId] = useState<number | null>(null);
  const [selectedSellerIds, setSelectedSellerIds] = useState<Set<number>>(new Set());

  const { data: sequences = [] } = useQuery<Sequence[]>({
    queryKey: ['wa-sequences'],
    queryFn: () => adminFetch('/api/admin/wa/sequences'),
  });

  const { data: pendingSellers = [], isLoading: loadingSellers } = useQuery<PendingSeller[]>({
    queryKey: ['wa-pending-sellers'],
    queryFn: () => adminFetch('/api/admin/wa/pending-sellers'),
  });

  const enrollMut = useMutation({
    mutationFn: (data: { sequenceId: number; sellerIds: number[] }) =>
      adminFetch('/api/admin/wa/leads', { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: (res: any) => {
      toast({ title: 'Enrolled', description: `${res.added} seller(s) added. ${res.skipped} already in sequence.` });
      onSuccess();
    },
    onError: (e: Error) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const toggleSeller = (id: number) => {
    setSelectedSellerIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const submit = () => {
    if (!selectedSequenceId) { toast({ title: 'Select a sequence first', variant: 'destructive' }); return; }
    if (selectedSellerIds.size === 0) { toast({ title: 'Select at least one seller', variant: 'destructive' }); return; }
    enrollMut.mutate({ sequenceId: selectedSequenceId, sellerIds: [...selectedSellerIds] });
  };

  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <Label>Select Sequence</Label>
        {sequences.length === 0 ? (
          <p className="text-sm text-muted-foreground">No sequences created yet. Create one in the Sequences tab first.</p>
        ) : (
          <div className="space-y-2">
            {sequences.map((seq) => (
              <button key={seq.id} onClick={() => setSelectedSequenceId(seq.id)}
                className={`w-full text-left px-4 py-3 rounded-lg border transition-colors ${selectedSequenceId === seq.id ? 'border-primary bg-primary/5' : 'hover:bg-muted'}`}>
                <div className="font-medium">{seq.name}</div>
                <div className="text-xs text-muted-foreground">{seq.steps.length} days · {seq.leadCount} leads enrolled</div>
              </button>
            ))}
          </div>
        )}
      </div>

      {selectedSequenceId && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>Select Pending Sellers</Label>
            {selectedSellerIds.size > 0 && (
              <span className="text-xs text-muted-foreground">{selectedSellerIds.size} selected</span>
            )}
          </div>
          {loadingSellers ? (
            <div className="flex items-center gap-2 text-muted-foreground text-sm"><Loader2 className="w-4 h-4 animate-spin" />Loading sellers…</div>
          ) : pendingSellers.length === 0 ? (
            <p className="text-sm text-muted-foreground">No pending sellers found.</p>
          ) : (
            <div className="max-h-64 overflow-y-auto border rounded-lg divide-y">
              {pendingSellers.map((seller) => (
                <label key={seller.id} className="flex items-center gap-3 px-4 py-3 hover:bg-muted cursor-pointer">
                  <input type="checkbox" checked={selectedSellerIds.has(seller.id)} onChange={() => toggleSeller(seller.id)}
                    className="w-4 h-4 rounded" />
                  <div>
                    <div className="font-medium text-sm">{seller.storeName}</div>
                    <div className="text-xs text-muted-foreground">{seller.phone} · {seller.subdomain}.chatcart.in</div>
                  </div>
                </label>
              ))}
            </div>
          )}
        </div>
      )}

      <Button onClick={submit} disabled={enrollMut.isPending || !selectedSequenceId || selectedSellerIds.size === 0} className="w-full">
        {enrollMut.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Users className="w-4 h-4 mr-2" />}
        Enroll {selectedSellerIds.size > 0 ? `${selectedSellerIds.size} Seller${selectedSellerIds.size > 1 ? 's' : ''}` : 'Sellers'}
      </Button>
    </div>
  );
}

// ── Health Tab ─────────────────────────────────────────────────────────────────

function HealthTab() {
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data: health, isLoading: loadingHealth, refetch } = useQuery<HealthMetrics>({
    queryKey: ['wa-health'],
    queryFn: () => adminFetch('/api/admin/wa/health'),
    refetchInterval: 60000,
  });

  const { data: sendLog = [], isLoading: loadingLog } = useQuery<SendLog[]>({
    queryKey: ['wa-send-log'],
    queryFn: () => adminFetch('/api/admin/wa/send-log'),
    refetchInterval: 60000,
  });

  const pauseMut = useMutation({
    mutationFn: (isPaused: boolean) =>
      adminFetch('/api/admin/wa/settings', { method: 'PATCH', body: JSON.stringify({ isPaused }) }),
    onSuccess: (_, isPaused) => {
      qc.invalidateQueries({ queryKey: ['wa-health'] });
      toast({ title: isPaused ? '⏸ All sending paused' : '▶ Sending resumed', description: isPaused ? 'No messages will be sent until you resume.' : 'Scheduler will resume at next tick.' });
    },
    onError: () => toast({ title: 'Error', variant: 'destructive' }),
  });

  const isWarmup = (() => {
    if (!health?.connectedAt) return false;
    const days = Math.floor((Date.now() - new Date(health.connectedAt).getTime()) / 86400000);
    return days < (health.warmupDays ?? 14);
  })();

  const effectiveLimit = isWarmup ? health?.warmupDailyLimit : health?.dailyLimit;
  const replyRateLow = health?.replyRate !== null && health?.replyRate !== undefined && health.replyRate < (health.replyRateThreshold ?? 10);

  return (
    <div className="space-y-6">
      {/* Global pause */}
      <Card className={health?.isPaused ? 'border-orange-300 bg-orange-50' : ''}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                {health?.isPaused ? <Pause className="w-5 h-5 text-orange-600" /> : <Play className="w-5 h-5 text-green-600" />}
                Global Send Control
              </CardTitle>
              <CardDescription>
                {health?.isPaused ? 'All outbound messages are paused. No messages will be sent.' : 'Scheduler is active. Messages will be sent according to schedule.'}
              </CardDescription>
            </div>
            {health && (
              <Button
                variant={health.isPaused ? 'default' : 'destructive'}
                onClick={() => pauseMut.mutate(!health.isPaused)}
                disabled={pauseMut.isPending}
                className="shrink-0"
              >
                {pauseMut.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : health.isPaused ? <Play className="w-4 h-4 mr-2" /> : <Pause className="w-4 h-4 mr-2" />}
                {health.isPaused ? 'Resume Sending' : 'Pause All Sending'}
              </Button>
            )}
          </div>
        </CardHeader>
      </Card>

      {/* Reply rate warning */}
      {replyRateLow && (
        <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-lg">
          <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
          <div>
            <div className="font-semibold text-red-800">Low Reply Rate Warning</div>
            <div className="text-sm text-red-700">
              Reply rate is {health!.replyRate}% — below your threshold of {health!.replyRateThreshold}%. Consider pausing sending and reviewing your message content.
            </div>
          </div>
        </div>
      )}

      {/* Warmup badge */}
      {isWarmup && (
        <div className="flex items-center gap-3 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <Clock className="w-5 h-5 text-blue-600 shrink-0" />
          <div>
            <div className="font-semibold text-blue-800">Warm-up Mode Active</div>
            <div className="text-sm text-blue-700">
              Daily limit is restricted to {health?.warmupDailyLimit}/day for the first {health?.warmupDays} days after connecting.
            </div>
          </div>
        </div>
      )}

      {/* Metrics */}
      {loadingHealth ? (
        <div className="flex items-center gap-2 text-muted-foreground"><Loader2 className="w-4 h-4 animate-spin" />Loading metrics…</div>
      ) : health && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <MetricCard label="Sent Today" value={`${health.sentToday} / ${effectiveLimit}`} icon={<MessageCircle className="w-5 h-5 text-blue-600" />} />
          <MetricCard label="Sent This Week" value={health.sentThisWeek} icon={<TrendingUp className="w-5 h-5 text-green-600" />} />
          <MetricCard label="Reply Rate" value={health.replyRate !== null ? `${health.replyRate}%` : '—'} icon={<MessageSquare className="w-5 h-5 text-purple-600" />} warn={replyRateLow} />
          <MetricCard label="Failed Today" value={health.failedToday} icon={<XCircle className="w-5 h-5 text-red-600" />} warn={health.failedToday > 0} />
          <MetricCard label="Active Leads" value={health.activeLeads} icon={<Play className="w-5 h-5 text-green-600" />} />
          <MetricCard label="Paused Leads" value={health.pausedLeads} icon={<Pause className="w-5 h-5 text-yellow-600" />} />
          <MetricCard label="Completed" value={health.completedLeads} icon={<CheckCircle2 className="w-5 h-5 text-blue-600" />} />
          <MetricCard label="Daily Limit" value={`${effectiveLimit}${isWarmup ? ' (warmup)' : ''}`} icon={<Activity className="w-5 h-5 text-muted-foreground" />} />
        </div>
      )}

      {/* Send log */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold">Recent Sends</h3>
          <Button variant="ghost" size="sm" onClick={() => refetch()}><RefreshCw className="w-4 h-4 mr-1" />Refresh</Button>
        </div>
        {loadingLog ? (
          <div className="flex items-center gap-2 text-muted-foreground"><Loader2 className="w-4 h-4 animate-spin" />Loading…</div>
        ) : sendLog.length === 0 ? (
          <p className="text-sm text-muted-foreground">No messages sent yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="pb-2 pr-4 font-medium">Sent At</th>
                  <th className="pb-2 pr-4 font-medium">To</th>
                  <th className="pb-2 pr-4 font-medium">Status</th>
                  <th className="pb-2 font-medium">Message</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {sendLog.map((log) => (
                  <tr key={log.id} className="hover:bg-muted/30">
                    <td className="py-2 pr-4 text-xs text-muted-foreground whitespace-nowrap">{fmtDate(log.sentAt)}</td>
                    <td className="py-2 pr-4">
                      <div className="text-xs font-medium">{log.storeName ?? log.toPhone}</div>
                      <div className="text-xs text-muted-foreground">{log.toPhone}</div>
                    </td>
                    <td className="py-2 pr-4">
                      {log.status === 'sent' ? (
                        <span className="flex items-center gap-1 text-green-700 text-xs"><CheckCircle2 className="w-3.5 h-3.5" />Sent</span>
                      ) : (
                        <span className="flex items-center gap-1 text-red-700 text-xs"><XCircle className="w-3.5 h-3.5" />Failed</span>
                      )}
                      {log.errorMessage && <div className="text-xs text-red-600 mt-0.5">{log.errorMessage}</div>}
                    </td>
                    <td className="py-2 text-xs text-muted-foreground max-w-xs truncate">{log.message}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function MetricCard({ label, value, icon, warn = false }: { label: string; value: string | number; icon: React.ReactNode; warn?: boolean }) {
  return (
    <Card className={warn ? 'border-red-200 bg-red-50' : ''}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</span>
          {icon}
        </div>
        <div className={`text-2xl font-bold ${warn ? 'text-red-700' : ''}`}>{value}</div>
      </CardContent>
    </Card>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────────

export default function WhatsAppMarketing() {
  return (
    <Layout>
      <div className="space-y-6 max-w-5xl">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <MessageCircle className="w-6 h-6 text-green-600" />
            WhatsApp Marketing
          </h1>
          <p className="text-muted-foreground mt-1">
            Connect a dedicated WhatsApp number to run reply-gated drip campaigns for pending sellers.
          </p>
        </div>

        <Tabs defaultValue="connection">
          <TabsList className="grid grid-cols-4 w-full max-w-lg">
            <TabsTrigger value="connection" className="gap-1.5"><Wifi className="w-3.5 h-3.5" />Connection</TabsTrigger>
            <TabsTrigger value="sequences" className="gap-1.5"><MessageSquare className="w-3.5 h-3.5" />Sequences</TabsTrigger>
            <TabsTrigger value="leads" className="gap-1.5"><Users className="w-3.5 h-3.5" />Leads</TabsTrigger>
            <TabsTrigger value="health" className="gap-1.5"><Activity className="w-3.5 h-3.5" />Health</TabsTrigger>
          </TabsList>

          <TabsContent value="connection" className="mt-6"><ConnectionTab /></TabsContent>
          <TabsContent value="sequences" className="mt-6"><SequencesTab /></TabsContent>
          <TabsContent value="leads" className="mt-6"><LeadsTab /></TabsContent>
          <TabsContent value="health" className="mt-6"><HealthTab /></TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}
