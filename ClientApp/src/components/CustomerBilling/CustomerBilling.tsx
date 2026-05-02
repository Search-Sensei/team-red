import React, { Fragment, useEffect, useMemo, useState } from "react";
import fetcher from "../Fetcher";
import Modal from "react-bootstrap/Modal";
import Button from "react-bootstrap/Button";
import { createRequestOptions } from "../../store/actions/adminsettings.actions";
import { HttpMethod } from "../../store/models/httpmethod";

// ─── Types ────────────────────────────────────────────────────────────────────

type TimeframeOption = "Current month" | "Last month" | "Last 3 months";

type BillingPeriod = { label: string; start: Date; end: Date };

type BillingSummary = {
    meteredUsageUsd: number;
    includedDiscountUsd: number;
    nextPaymentDueUsd: number | null;
    nextPaymentDueDate: Date | null;
    dailyUsage: Array<{ date: Date; meteredUsd: number; includedDiscountUsd: number }>;
};

type UsageAnalyticsItem = { tenantName: string; url: string; count: number };

type SubscriptionInfo = {
    id: string;
    status: string;
    planName: string;
    planId: string | null;
    currentPeriodEnd: string | null;
    cancelAtPeriodEnd: boolean;
    startDate: string | null;
};

type Invoice = {
    id: string;
    amountDue: number;
    amountPaid: number;
    currency: string;
    status: string;
    date: string;
    invoicePdfUrl: string | null;
};

type Plan = { id: string; label: string };

const AVAILABLE_PLANS: Plan[] = [
    { id: "essentials_monthly", label: "Essentials – Monthly" },
    { id: "essentials_annual",  label: "Essentials – Annual"  },
    { id: "ai_search_monthly",  label: "AI Search – Monthly"  },
    { id: "ai_search_annual",   label: "AI Search – Annual"   },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function legendDotStyle(color: string): React.CSSProperties {
    return { width: 10, height: 10, borderRadius: "50%", backgroundColor: color, display: "inline-block" };
}

function getAdminUiBasePath() {
    return window.location.pathname.startsWith("/adminui") ? "/adminui" : "";
}

function startOfMonth(d: Date) { return new Date(d.getFullYear(), d.getMonth(), 1); }
function endOfMonth(d: Date)   { return new Date(d.getFullYear(), d.getMonth() + 1, 0); }
function addMonths(d: Date, n: number) { return new Date(d.getFullYear(), d.getMonth() + n, d.getDate()); }

function formatUsd(amount: number) {
    return amount.toLocaleString(undefined, { style: "currency", currency: "USD" });
}

function formatDate(d: Date) {
    return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

function computeBillingPeriod(timeframe: TimeframeOption): BillingPeriod {
    const now = new Date();
    if (timeframe === "Last 3 months") {
        const start = startOfMonth(addMonths(now, -2));
        const end   = endOfMonth(now);
        return { label: `${formatDate(start)} – ${formatDate(end)}`, start, end };
    }
    if (timeframe === "Last month") {
        const t = addMonths(now, -1);
        return { label: `${formatDate(startOfMonth(t))} – ${formatDate(endOfMonth(t))}`, start: startOfMonth(t), end: endOfMonth(t) };
    }
    return { label: `${formatDate(startOfMonth(now))} – ${formatDate(endOfMonth(now))}`, start: startOfMonth(now), end: endOfMonth(now) };
}

function statusBadgeStyle(status: string): React.CSSProperties {
    const colors: Record<string, { bg: string; color: string }> = {
        Active:    { bg: "#d4edda", color: "#155724" },
        Cancelled: { bg: "#f8d7da", color: "#721c24" },
        "Past Due":{ bg: "#fff3cd", color: "#856404" },
        Trialing:  { bg: "#cce5ff", color: "#004085" },
        Unpaid:    { bg: "#fff3cd", color: "#856404" },
    };
    const c = colors[status] ?? { bg: "#e2e3e5", color: "#383d41" };
    return { padding: "2px 10px", borderRadius: 12, fontSize: "0.75rem", fontWeight: 600, backgroundColor: c.bg, color: c.color };
}

function invoiceStatusStyle(status: string): React.CSSProperties {
    if (status === "paid")   return { ...statusBadgeStyle("Active"),    padding: "2px 8px" };
    if (status === "open")   return { ...statusBadgeStyle("Past Due"),  padding: "2px 8px" };
    return { ...statusBadgeStyle("Cancelled"), padding: "2px 8px" };
}

// ─── Component ────────────────────────────────────────────────────────────────

const CustomerBilling: React.FC = () => {
    const activeProduct = "";
    const [timeframe, setTimeframe] = useState<TimeframeOption>("Current month");
    const [timeframeOpen, setTimeframeOpen] = useState(false);
    const timeframeOptions: TimeframeOption[] = ["Current month", "Last month", "Last 3 months"];

    // Metered usage
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError]         = useState<string | null>(null);
    const [summary, setSummary]     = useState<BillingSummary | null>(null);

    // Subscriptions
    const [subs, setSubs]           = useState<SubscriptionInfo[]>([]);
    const [subsLoading, setSubsLoading] = useState(false);
    const [subsError, setSubsError] = useState<string | null>(null);

    // Change plan modal
    const [changePlanOpen, setChangePlanOpen]   = useState(false);
    const [selectedPlan, setSelectedPlan]       = useState<string>("");
    const [changingPlan, setChangingPlan]       = useState(false);
    const [changePlanError, setChangePlanError] = useState<string | null>(null);

    // Invoices
    const [invoices, setInvoices]           = useState<Invoice[]>([]);
    const [invoicesLoading, setInvoicesLoading] = useState(false);
    const [invoicesError, setInvoicesError] = useState<string | null>(null);

    // Daily usage modal
    const [isDailyUsageModalOpen, setIsDailyUsageModalOpen] = useState(false);
    const [selectedDailyUsage, setSelectedDailyUsage] = useState<{ date: Date; meteredUsd: number; includedDiscountUsd: number } | null>(null);
    const [usageAnalytics, setUsageAnalytics]         = useState<UsageAnalyticsItem[]>([]);
    const [isUsageAnalyticsLoading, setIsUsageAnalyticsLoading] = useState(false);
    const [usageAnalyticsError, setUsageAnalyticsError]         = useState<string | null>(null);

    const period = useMemo(() => computeBillingPeriod(timeframe), [timeframe]);

    // Load metered usage summary
    useEffect(() => {
        let cancelled = false;
        async function load() {
            setIsLoading(true);
            setError(null);
            try {
                const base = getAdminUiBasePath();
                const resp = await fetcher(`${base}/customerBilling/summary`, createRequestOptions(HttpMethod.Post, JSON.stringify({ product: activeProduct, timeframe })));
                if (!resp.ok) throw new Error(`API error ${resp.status}`);
                const ct = resp.headers.get("content-type") ?? "";
                if (!ct.toLowerCase().includes("application/json")) {
                    const text = await resp.text();
                    throw new Error(`Unexpected response (not JSON). ${text?.slice(0, 180)?.replace(/\s+/g, " ") ?? ""}`);
                }
                const json = await resp.json();
                if (cancelled) return;
                setSummary({
                    meteredUsageUsd:    Number(json.meteredUsageUsd ?? 0),
                    includedDiscountUsd: Number(json.includedDiscountUsd ?? 0),
                    nextPaymentDueUsd:  json.nextPaymentDueUsd == null ? null : Number(json.nextPaymentDueUsd),
                    nextPaymentDueDate: json.nextPaymentDueDate == null ? null : new Date(json.nextPaymentDueDate),
                    dailyUsage: Array.isArray(json.dailyUsage)
                        ? json.dailyUsage.map((d: any) => ({ date: new Date(d.date), meteredUsd: Number(d.meteredUsd ?? 0), includedDiscountUsd: Number(d.includedDiscountUsd ?? 0) }))
                        : [],
                });
            } catch (e: any) {
                if (!cancelled) { setError(e?.message || "Failed to load billing data"); setSummary(null); }
            } finally {
                if (!cancelled) setIsLoading(false);
            }
        }
        load();
        return () => { cancelled = true; };
    }, [activeProduct, timeframe]);

    // Load subscriptions
    useEffect(() => {
        let cancelled = false;
        setSubsLoading(true);
        fetch("/portal/api/subscription/list", { credentials: "include" })
            .then(async (res) => {
                if (!res.ok) throw new Error(`Error ${res.status}`);
                return res.json() as Promise<SubscriptionInfo[]>;
            })
            .then((data) => { if (!cancelled) setSubs(data); })
            .catch((e) => { if (!cancelled) setSubsError(e?.message || "Failed to load subscriptions"); })
            .finally(() => { if (!cancelled) setSubsLoading(false); });
        return () => { cancelled = true; };
    }, []);

    // Load invoices
    useEffect(() => {
        let cancelled = false;
        setInvoicesLoading(true);
        fetch("/portal/api/subscription/invoices", { credentials: "include" })
            .then(async (res) => {
                if (!res.ok) throw new Error(`Error ${res.status}`);
                return res.json() as Promise<Invoice[]>;
            })
            .then((data) => { if (!cancelled) setInvoices(data); })
            .catch((e) => { if (!cancelled) setInvoicesError(e?.message || "Failed to load invoices"); })
            .finally(() => { if (!cancelled) setInvoicesLoading(false); });
        return () => { cancelled = true; };
    }, []);

    // Daily usage modal analytics
    useEffect(() => {
        let cancelled = false;
        async function loadUsageAnalytics() {
            if (!isDailyUsageModalOpen || !selectedDailyUsage) return;
            setIsUsageAnalyticsLoading(true);
            setUsageAnalyticsError(null);
            try {
                const base = getAdminUiBasePath();
                const d    = new Date(selectedDailyUsage.date);
                const start = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0));
                const end   = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59));
                const q     = `start=${encodeURIComponent(start.toISOString())}&end=${encodeURIComponent(end.toISOString())}`;
                const resp  = await fetcher(`${base}/api/analytics/usage?${q}`, createRequestOptions(HttpMethod.Get));
                if (!resp.ok) throw new Error(`API error ${resp.status}`);
                const ct = resp.headers.get("content-type") ?? "";
                if (!ct.toLowerCase().includes("application/json")) throw new Error("Unexpected response format.");
                const data = await resp.json();
                if (!cancelled) setUsageAnalytics(Array.isArray(data) ? data.map((item: any) => ({ tenantName: String(item.tenant_name ?? item.tenantName ?? ""), url: String(item.url ?? ""), count: Number(item.count ?? 0) })) : []);
            } catch (e: any) {
                if (!cancelled) { setUsageAnalyticsError(e?.message || "Failed to load usage analytics."); setUsageAnalytics([]); }
            } finally {
                if (!cancelled) setIsUsageAnalyticsLoading(false);
            }
        }
        loadUsageAnalytics();
        return () => { cancelled = true; };
    }, [isDailyUsageModalOpen, selectedDailyUsage]);

    function openDailyUsageModal(d: { date: Date; meteredUsd: number; includedDiscountUsd: number }) {
        setSelectedDailyUsage(d);
        setIsDailyUsageModalOpen(true);
    }
    function closeDailyUsageModal() {
        setIsDailyUsageModalOpen(false);
        setSelectedDailyUsage(null);
        setUsageAnalytics([]);
        setUsageAnalyticsError(null);
    }

    async function handleChangePlan() {
        if (!selectedPlan) return;
        setChangingPlan(true);
        setChangePlanError(null);
        try {
            const res = await fetch("/portal/api/subscription/change", {
                method: "POST",
                credentials: "include",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ planId: selectedPlan }),
            });
            if (!res.ok) {
                const body = await res.json().catch(() => ({}));
                throw new Error(body?.error || `Error ${res.status}`);
            }
            // Reload subscriptions after change
            const updated = await fetch("/portal/api/subscription/list", { credentials: "include" }).then(r => r.json());
            setSubs(updated);
            setChangePlanOpen(false);
            setSelectedPlan("");
        } catch (e: any) {
            setChangePlanError(e?.message || "Failed to change plan.");
        } finally {
            setChangingPlan(false);
        }
    }

    const netUsageUsd = useMemo(() => Math.max(0, (summary?.meteredUsageUsd ?? 0) - (summary?.includedDiscountUsd ?? 0)), [summary]);

    const chartSeries = useMemo(() => {
        const pts = summary?.dailyUsage ?? [];
        return pts.length === 0 ? [] : pts.map(p => ({ x: p.date, y: Math.max(0, p.meteredUsd - p.includedDiscountUsd) }));
    }, [summary]);

    const chartMax = useMemo(() => Math.max(1, ...chartSeries.map(p => p.y)), [chartSeries]);

    const chartPath = useMemo(() => {
        const w = 640, h = 140, pad = 8;
        const pts = chartSeries;
        if (pts.length < 2) return { line: "", area: "" };
        const xStep = (w - pad * 2) / (pts.length - 1);
        const toY   = (v: number) => h - pad - (v / chartMax) * (h - pad * 2);
        let d = "";
        pts.forEach((p, i) => { const x = pad + i * xStep; const y = toY(p.y); d += i === 0 ? `M ${x} ${y}` : ` L ${x} ${y}`; });
        return { line: d, area: `${d} L ${pad + (pts.length - 1) * xStep} ${h - pad} L ${pad} ${h - pad} Z` };
    }, [chartSeries, chartMax]);

    const activeSub   = subs.find(s => s.status === "Active" || s.status === "Trialing");
    const historicSubs = subs.filter(s => s !== activeSub);

    return (
        <Fragment>
            <h1 className="h3 mb-2 text-gray-800">Customer Billing</h1>
            <p className="mb-4">Review your subscription, usage, and payment history.</p>

            <div className="customer-billing-content">

                {/* ===== Subscription ===== */}
                <div className="d-flex justify-content-between align-items-center mb-2">
                    <h2 style={styles.sectionTitle}>Current Subscription</h2>
                    {activeSub && (
                        <button type="button" style={styles.changePlanBtn} onClick={() => { setChangePlanOpen(true); setChangePlanError(null); setSelectedPlan(""); }}>
                            Change Plan
                        </button>
                    )}
                </div>

                <div className="card mb-4" style={styles.card}>
                    <div className="card-body">
                        {subsLoading && <p className="text-muted mb-0">Loading…</p>}
                        {!subsLoading && subsError && <p className="text-danger mb-0">{subsError}</p>}
                        {!subsLoading && !subsError && !activeSub && <p className="text-muted mb-0">No active subscription.</p>}
                        {!subsLoading && !subsError && activeSub && (
                            <div className="d-flex flex-wrap" style={{ gap: "2rem" }}>
                                <div>
                                    <div style={styles.cardLabel}>Plan</div>
                                    <div style={{ fontSize: "1.1rem", fontWeight: 700, color: "#212529" }}>{activeSub.planName}</div>
                                </div>
                                <div>
                                    <div style={styles.cardLabel}>Status</div>
                                    <span style={statusBadgeStyle(activeSub.status)}>{activeSub.status}</span>
                                    {activeSub.cancelAtPeriodEnd && (
                                        <span className="badge badge-warning ml-2" style={{ fontSize: "0.72rem" }}>Cancels at period end</span>
                                    )}
                                </div>
                                {activeSub.currentPeriodEnd && (
                                    <div>
                                        <div style={styles.cardLabel}>{activeSub.cancelAtPeriodEnd ? "Ends" : "Renews"}</div>
                                        <div style={{ fontSize: "0.9rem", color: "#212529" }}>
                                            {new Date(activeSub.currentPeriodEnd).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })}
                                        </div>
                                    </div>
                                )}
                                {activeSub.startDate && (
                                    <div>
                                        <div style={styles.cardLabel}>Started</div>
                                        <div style={{ fontSize: "0.9rem", color: "#212529" }}>
                                            {new Date(activeSub.startDate).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* ===== Previous Subscriptions ===== */}
                {historicSubs.length > 0 && (
                    <>
                        <div className="mb-2">
                            <h2 style={styles.sectionTitle}>Previous Subscriptions</h2>
                        </div>
                        <div className="card mb-4" style={styles.card}>
                            <div className="card-body" style={{ padding: 0 }}>
                                <table className="table table-sm mb-0" style={{ tableLayout: "fixed", width: "100%" }}>
                                    <colgroup>
                                        <col style={{ width: "30%" }} />
                                        <col style={{ width: "20%" }} />
                                        <col style={{ width: "25%" }} />
                                        <col style={{ width: "25%" }} />
                                    </colgroup>
                                    <thead style={{ position: "sticky", top: 0, backgroundColor: "#fff", zIndex: 1 }}>
                                        <tr>
                                            <th style={styles.th}>Plan</th>
                                            <th style={styles.th}>Status</th>
                                            <th style={styles.th}>Started</th>
                                            <th style={styles.th}>Ended / Renews</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {historicSubs.map(sub => (
                                            <tr key={sub.id}>
                                                <td style={styles.td}>{sub.planName}</td>
                                                <td style={styles.td}><span style={statusBadgeStyle(sub.status)}>{sub.status}</span></td>
                                                <td style={styles.td}>{sub.startDate ? new Date(sub.startDate).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" }) : "—"}</td>
                                                <td style={styles.td}>{sub.currentPeriodEnd ? new Date(sub.currentPeriodEnd).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" }) : "—"}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </>
                )}

                {/* ===== Filters ===== */}
                <div className="d-flex flex-wrap justify-content-between align-items-center mb-3" style={{ gap: 12 }}>
                    <div />
                    <div style={{ position: "relative" }}>
                        <button type="button" style={styles.dropdownButton} onClick={() => setTimeframeOpen(v => !v)} aria-haspopup="menu" aria-expanded={timeframeOpen}>
                            {timeframe}
                        </button>
                        {timeframeOpen && (
                            <div style={styles.dropdownMenu} role="menu">
                                {timeframeOptions.map(opt => (
                                    <button key={opt} type="button" style={{ ...styles.dropdownItem, fontWeight: opt === timeframe ? 700 : 500 }} onClick={() => { setTimeframe(opt); setTimeframeOpen(false); }}>
                                        {opt}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* ===== Usage status ===== */}
                {isLoading && <div className="alert alert-info" role="status">Loading billing data…</div>}
                {error     && <div className="alert alert-danger" role="alert">{error}</div>}

                <div className="row mb-4">
                    <div className="col-xl-4 col-md-6 mb-4">
                        <div className="card shadow border-left-primary h-100 py-2">
                            <div className="card-body">
                                <div className="text-xs font-weight-bold text-dark text-uppercase mb-1">Metered usage</div>
                                <div className="h5 mb-0 font-weight-bold text-gray-800">{formatUsd(summary?.meteredUsageUsd ?? 0)}</div>
                                <p className="mt-2 mb-0 text-gray-600" style={{ fontSize: "0.78rem" }}>Usage charges for {period.label}.</p>
                            </div>
                        </div>
                    </div>
                    <div className="col-xl-4 col-md-6 mb-4">
                        <div className="card shadow border-left-success h-100 py-2">
                            <div className="card-body">
                                <div className="text-xs font-weight-bold text-dark text-uppercase mb-1">Included usage discounts</div>
                                <div className="h5 mb-0 font-weight-bold text-gray-800">{formatUsd(summary?.includedDiscountUsd ?? 0)}</div>
                                <p className="mt-2 mb-0 text-gray-600" style={{ fontSize: "0.78rem" }}>Discounts applied for {period.label}.</p>
                            </div>
                        </div>
                    </div>
                    <div className="col-xl-4 col-md-6 mb-4">
                        <div className="card shadow border-left-info h-100 py-2">
                            <div className="card-body">
                                <div className="text-xs font-weight-bold text-dark text-uppercase mb-1">Next payment due</div>
                                <div className="h5 mb-0 font-weight-bold text-gray-800">
                                    {summary?.nextPaymentDueUsd == null ? "No upcoming payment" : formatUsd(summary.nextPaymentDueUsd)}
                                </div>
                                <p className="mt-2 mb-0 text-gray-600" style={{ fontSize: "0.78rem" }}>
                                    {summary?.nextPaymentDueDate == null ? "No invoice is scheduled yet." : `Due on ${formatDate(summary.nextPaymentDueDate)}.`}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* ===== Usage chart ===== */}
                <div className="d-flex justify-content-between align-items-center mb-2">
                    <h2 style={styles.sectionTitle}>Usage Dashboard</h2>
                    <div style={styles.smallMeta}>Net usage: <strong>{formatUsd(netUsageUsd)}</strong></div>
                </div>
                <div className="card mb-4" style={styles.card}>
                    <div className="card-body">
                        <div className="d-flex justify-content-between align-items-start flex-wrap" style={{ gap: 10 }}>
                            <div>
                                <div style={styles.cardLabel}>Net usage over time</div>
                                <div style={styles.smallMeta}>{period.label}</div>
                            </div>
                            <div style={styles.legendRow}>
                                <span style={legendDotStyle("#0069d9")} />
                                <span style={styles.legendText}>Net ($)</span>
                            </div>
                        </div>
                        <div style={{ marginTop: 10 }}>
                            {chartSeries.length < 2 ? (
                                <div className="text-muted" style={{ fontSize: "0.85rem" }}>No usage data yet for this period.</div>
                            ) : (
                                <svg viewBox="0 0 640 140" width="100%" height="160" role="img" aria-label="Net usage chart">
                                    <path d={chartPath.area} fill="rgba(0,105,217,0.12)" />
                                    <path d={chartPath.line} fill="none" stroke="#0069d9" strokeWidth="2" />
                                </svg>
                            )}
                        </div>
                    </div>
                </div>

                {/* ===== Daily breakdown ===== */}
                <div className="d-flex justify-content-between align-items-center mb-2">
                    <h2 style={styles.sectionTitle}>Daily Breakdown</h2>
                </div>
                <div className="card mb-5" style={styles.card}>
                    <div className="card-body" style={{ padding: 0 }}>
                        <div style={{ maxHeight: 280, overflow: "auto" }}>
                            <table className="table table-sm mb-0" style={{ tableLayout: "fixed", width: "100%" }}>
                                <colgroup>
                                    <col style={{ width: "34%" }} /><col style={{ width: "22%" }} />
                                    <col style={{ width: "28%" }} /><col style={{ width: "16%" }} />
                                </colgroup>
                                <thead style={{ position: "sticky", top: 0, backgroundColor: "#fff", zIndex: 1 }}>
                                    <tr>
                                        <th style={styles.th}>Date</th>
                                        <th style={{ ...styles.th, textAlign: "right" }}>Metered</th>
                                        <th style={{ ...styles.th, textAlign: "right" }}>Included discount</th>
                                        <th style={{ ...styles.th, textAlign: "right" }}>Net</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {(summary?.dailyUsage ?? []).slice().reverse().map(d => {
                                        const net = Math.max(0, d.meteredUsd - d.includedDiscountUsd);
                                        return (
                                            <tr key={d.date.toISOString()} onClick={() => openDailyUsageModal(d)} onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openDailyUsageModal(d); } }} role="button" tabIndex={0} style={{ cursor: "pointer" }}>
                                                <td style={styles.td}>{formatDate(d.date)}</td>
                                                <td style={{ ...styles.td, textAlign: "right" }}>{formatUsd(d.meteredUsd)}</td>
                                                <td style={{ ...styles.td, textAlign: "right" }}>{formatUsd(d.includedDiscountUsd)}</td>
                                                <td style={{ ...styles.td, textAlign: "right" }}>{formatUsd(net)}</td>
                                            </tr>
                                        );
                                    })}
                                    {(summary?.dailyUsage ?? []).length === 0 && !isLoading && !error && (
                                        <tr><td colSpan={4} className="text-muted" style={styles.td}>No data.</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                {/* ===== Payment History ===== */}
                <div className="d-flex justify-content-between align-items-center mb-2">
                    <h2 style={styles.sectionTitle}>Payment History</h2>
                </div>
                <div className="card mb-5" style={styles.card}>
                    <div className="card-body" style={{ padding: 0 }}>
                        {invoicesLoading && <div className="alert alert-info m-3" role="status">Loading payments…</div>}
                        {!invoicesLoading && invoicesError && <div className="alert alert-danger m-3">{invoicesError}</div>}
                        {!invoicesLoading && !invoicesError && (
                            <table className="table table-sm mb-0" style={{ tableLayout: "fixed", width: "100%" }}>
                                <colgroup>
                                    <col style={{ width: "28%" }} /><col style={{ width: "22%" }} />
                                    <col style={{ width: "22%" }} /><col style={{ width: "16%" }} />
                                    <col style={{ width: "12%" }} />
                                </colgroup>
                                <thead style={{ position: "sticky", top: 0, backgroundColor: "#fff", zIndex: 1 }}>
                                    <tr>
                                        <th style={styles.th}>Date</th>
                                        <th style={{ ...styles.th, textAlign: "right" }}>Amount Due</th>
                                        <th style={{ ...styles.th, textAlign: "right" }}>Amount Paid</th>
                                        <th style={styles.th}>Status</th>
                                        <th style={styles.th}>Invoice</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {invoices.map(inv => (
                                        <tr key={inv.id}>
                                            <td style={styles.td}>{new Date(inv.date).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })}</td>
                                            <td style={{ ...styles.td, textAlign: "right" }}>{(inv.amountDue / 100).toLocaleString(undefined, { style: "currency", currency: inv.currency.toUpperCase() })}</td>
                                            <td style={{ ...styles.td, textAlign: "right" }}>{(inv.amountPaid / 100).toLocaleString(undefined, { style: "currency", currency: inv.currency.toUpperCase() })}</td>
                                            <td style={styles.td}><span style={invoiceStatusStyle(inv.status)}>{inv.status.charAt(0).toUpperCase() + inv.status.slice(1)}</span></td>
                                            <td style={styles.td}>
                                                {inv.invoicePdfUrl
                                                    ? <a href={inv.invoicePdfUrl} target="_blank" rel="noopener noreferrer" style={styles.link}>PDF</a>
                                                    : <span className="text-muted" style={{ fontSize: "0.82rem" }}>—</span>}
                                            </td>
                                        </tr>
                                    ))}
                                    {invoices.length === 0 && (
                                        <tr><td colSpan={5} className="text-muted" style={{ padding: 12 }}>No payments found.</td></tr>
                                    )}
                                </tbody>
                            </table>
                        )}
                    </div>
                </div>

                {/* ===== Change Plan Modal ===== */}
                <Modal show={changePlanOpen} onHide={() => { setChangePlanOpen(false); setChangePlanError(null); }} centered>
                    <Modal.Header closeButton>
                        <Modal.Title>Change Subscription Plan</Modal.Title>
                    </Modal.Header>
                    <Modal.Body>
                        {activeSub && (
                            <p className="text-muted mb-3" style={{ fontSize: "0.88rem" }}>
                                Current plan: <strong>{activeSub.planName}</strong>
                            </p>
                        )}
                        <div className="mb-3">
                            {AVAILABLE_PLANS.map(plan => (
                                <div
                                    key={plan.id}
                                    onClick={() => setSelectedPlan(plan.id)}
                                    style={{
                                        padding: "10px 14px",
                                        marginBottom: 8,
                                        border: `2px solid ${selectedPlan === plan.id ? "#0069d9" : "#e3e6f0"}`,
                                        borderRadius: 6,
                                        cursor: "pointer",
                                        backgroundColor: selectedPlan === plan.id ? "#e8f0fe" : "#fff",
                                        fontWeight: selectedPlan === plan.id ? 600 : 400,
                                        fontSize: "0.9rem",
                                        color: "#212529",
                                    }}
                                >
                                    {plan.label}
                                </div>
                            ))}
                        </div>
                        {changePlanError && <div className="alert alert-danger" style={{ fontSize: "0.85rem" }}>{changePlanError}</div>}
                    </Modal.Body>
                    <Modal.Footer>
                        <Button variant="secondary" onClick={() => { setChangePlanOpen(false); setChangePlanError(null); }} disabled={changingPlan}>
                            Cancel
                        </Button>
                        <Button variant="primary" onClick={handleChangePlan} disabled={!selectedPlan || changingPlan}>
                            {changingPlan ? "Updating…" : "Confirm Change"}
                        </Button>
                    </Modal.Footer>
                </Modal>

                {/* ===== Daily Usage Modal ===== */}
                <Modal show={isDailyUsageModalOpen} onHide={closeDailyUsageModal}>
                    <Modal.Header closeButton>
                        <Modal.Title>Daily API Usage Analytics</Modal.Title>
                    </Modal.Header>
                    <Modal.Body>
                        {selectedDailyUsage && (
                            <div className="p-2">
                                <div className="mb-2"><strong>Date:</strong> {formatDate(selectedDailyUsage.date)}</div>
                                <div className="mb-2"><strong>Metered usage:</strong> {formatUsd(selectedDailyUsage.meteredUsd)}</div>
                                <div className="mb-2"><strong>Included discount:</strong> {formatUsd(selectedDailyUsage.includedDiscountUsd)}</div>
                                <div><strong>Net usage:</strong> {formatUsd(Math.max(0, selectedDailyUsage.meteredUsd - selectedDailyUsage.includedDiscountUsd))}</div>
                            </div>
                        )}
                        <div className="mt-3">
                            <h6 className="mb-2">Usage API details</h6>
                            {isUsageAnalyticsLoading && <div className="alert alert-info mb-0">Loading usage analytics...</div>}
                            {!isUsageAnalyticsLoading && usageAnalyticsError && <div className="alert alert-danger mb-0">{usageAnalyticsError}</div>}
                            {!isUsageAnalyticsLoading && !usageAnalyticsError && (
                                <div style={{ maxHeight: 260, overflow: "auto" }}>
                                    <table className="table table-sm mb-0">
                                        <thead>
                                            <tr>
                                                <th style={{ whiteSpace: "nowrap" }}>Tenant</th>
                                                <th style={{ whiteSpace: "nowrap" }}>URL</th>
                                                <th className="text-right" style={{ whiteSpace: "nowrap" }}>Count</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {usageAnalytics.map((item, i) => (
                                                <tr key={`${item.tenantName}-${item.url}-${i}`}>
                                                    <td>{item.tenantName || "-"}</td>
                                                    <td style={{ wordBreak: "break-all" }}>{item.url || "-"}</td>
                                                    <td className="text-right">{item.count.toLocaleString()}</td>
                                                </tr>
                                            ))}
                                            {usageAnalytics.length === 0 && (
                                                <tr><td colSpan={3} className="text-muted">No usage analytics records for this date.</td></tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    </Modal.Body>
                    <Modal.Footer>
                        <Button className="btn-modal-synonym" variant="primary" onClick={closeDailyUsageModal}>Close</Button>
                    </Modal.Footer>
                </Modal>

            </div>
        </Fragment>
    );
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles: Record<string, React.CSSProperties> = {
    sectionTitle:  { fontSize: "1.2rem", fontWeight: 700, color: "#212529", marginBottom: "1rem" },
    card:          { border: "1px solid #e3e6f0", borderRadius: 6, backgroundColor: "#fff", boxShadow: "none" },
    cardLabel:     { fontSize: "0.78rem", color: "#6c757d", marginBottom: "0.2rem", fontWeight: 500, textTransform: "uppercase" as const },
    th:            { borderTop: "none", padding: "8px 12px", whiteSpace: "nowrap" as const, fontSize: "0.82rem" },
    td:            { padding: "6px 12px", fontSize: "0.88rem" },
    link:          { fontSize: "0.75rem", color: "#0069d9", textDecoration: "none", whiteSpace: "nowrap" as const, fontWeight: 400 },
    smallMeta:     { fontSize: "0.82rem", color: "#6c757d" },
    legendRow:     { display: "inline-flex" as const, alignItems: "center", gap: 8, fontSize: "0.82rem", color: "#6c757d", whiteSpace: "nowrap" as const },
    legendText:    { fontSize: "0.82rem", color: "#6c757d", fontWeight: 600 },
    dropdownButton:{ padding: "6px 14px", fontSize: "0.82rem", backgroundColor: "#fff", border: "1px solid #d1d5da", borderRadius: 6, cursor: "pointer", color: "#212529" },
    dropdownMenu:  { position: "absolute" as const, right: 0, top: "calc(100% + 4px)", backgroundColor: "#fff", border: "1px solid #d1d5da", borderRadius: 6, boxShadow: "0 4px 12px rgba(0,0,0,0.1)", zIndex: 100, minWidth: 180, display: "flex" as const, flexDirection: "column" as const },
    dropdownItem:  { padding: "8px 16px", fontSize: "0.82rem", background: "none", border: "none", textAlign: "left" as const, cursor: "pointer", color: "#212529" },
    changePlanBtn: { padding: "6px 16px", fontSize: "0.82rem", backgroundColor: "#0069d9", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer", fontWeight: 600 },
    linkButton:    { fontSize: "0.75rem", color: "#0069d9", background: "none", border: "none", padding: 0, whiteSpace: "nowrap" as const, fontWeight: 500, cursor: "not-allowed", opacity: 0.65 },
};

export default CustomerBilling;
