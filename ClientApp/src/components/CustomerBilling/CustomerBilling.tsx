import React, { Fragment, useEffect, useMemo, useState } from "react";
import { useSelector } from "react-redux";
import fetcher from "../Fetcher";
import Modal from "react-bootstrap/Modal";
import Button from "react-bootstrap/Button";
import { createRequestOptions } from "../../store/actions/adminsettings.actions";
import { HttpMethod } from "../../store/models/httpmethod";
import { IAdminSettingsState } from "../../store/models/adminsettingsstate.interface";
import { IStateType } from "../../store/models/root.interface";

type TimeframeOption = "Current month" | "Last month" | "Last 3 months";

type BillingPeriod = {
    label: string;
    start: Date;
    end: Date;
};

type BillingSummary = {
    meteredUsageUsd: number;
    includedDiscountUsd: number;
    nextPaymentDueUsd: number | null;
    nextPaymentDueDate: Date | null;
    dailyUsage: Array<{
        date: Date;
        meteredUsd: number;
        includedDiscountUsd: number;
    }>;
};

type UsageAnalyticsItem = {
    tenantName: string;
    url: string;
    count: number;
};

function legendDotStyle(color: string): React.CSSProperties {
    return {
        width: "10px",
        height: "10px",
        borderRadius: "50%",
        backgroundColor: color,
        display: "inline-block",
    };
}

function getAdminUiBasePath(): string {
    return window.location.pathname.startsWith("/adminui") ? "/adminui" : "";
}

function startOfMonth(date: Date) {
    return new Date(date.getFullYear(), date.getMonth(), 1);
}

function endOfMonth(date: Date) {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0);
}

function addMonths(date: Date, months: number) {
    return new Date(date.getFullYear(), date.getMonth() + months, date.getDate());
}

function formatUsd(amount: number) {
    return amount.toLocaleString(undefined, { style: "currency", currency: "USD" });
}

function formatDate(date: Date) {
    return date.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

function computeBillingPeriod(timeframe: TimeframeOption): BillingPeriod {
    const now = new Date();

    if (timeframe === "Last 3 months") {
        const start = startOfMonth(addMonths(now, -2));
        const end = endOfMonth(now);
        return { label: `${formatDate(start)} – ${formatDate(end)}`, start, end };
    }

    if (timeframe === "Last month") {
        const target = addMonths(now, -1);
        const start = startOfMonth(target);
        const end = endOfMonth(target);
        return { label: `${formatDate(start)} – ${formatDate(end)}`, start, end };
    }

    const start = startOfMonth(now);
    const end = endOfMonth(now);
    return { label: `${formatDate(start)} – ${formatDate(end)}`, start, end };
}

const CustomerBilling: React.FC = () => {
    const activeProduct = "";
    const [timeframe, setTimeframe] = useState<TimeframeOption>("Current month");
    const [timeframeOpen, setTimeframeOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [summary, setSummary] = useState<BillingSummary | null>(null);
    const [isDailyUsageModalOpen, setIsDailyUsageModalOpen] = useState(false);
    const [selectedDailyUsage, setSelectedDailyUsage] = useState<{
        date: Date;
        meteredUsd: number;
        includedDiscountUsd: number;
    } | null>(null);
    const [usageAnalytics, setUsageAnalytics] = useState<UsageAnalyticsItem[]>([]);
    const [isUsageAnalyticsLoading, setIsUsageAnalyticsLoading] = useState(false);
    const [usageAnalyticsError, setUsageAnalyticsError] = useState<string | null>(null);

    const timeframeOptions: TimeframeOption[] = ["Current month", "Last month", "Last 3 months"];

    const period = useMemo(() => computeBillingPeriod(timeframe), [timeframe]);

    useEffect(() => {
        let cancelled = false;

        async function load() {
            setIsLoading(true);
            setError(null);

            try {
                // Use path-based detection (admin UI is hosted under /adminui even on localhost)
                const base = getAdminUiBasePath();
                const url = `${base}/customerBilling/summary`;
                const body = JSON.stringify({ product: activeProduct, timeframe });
                const resp = await fetcher(url, createRequestOptions(HttpMethod.Post, body));
                if (!resp.ok) {
                    throw new Error(`API error ${resp.status}`);
                }

                const contentType = resp.headers.get("content-type") || "";
                if (!contentType.toLowerCase().includes("application/json")) {
                    const text = await resp.text();
                    const snippet = text?.slice(0, 180)?.replace(/\s+/g, " ") ?? "";
                    throw new Error(`Unexpected response (not JSON). ${snippet}`);
                }

                const json = await resp.json();

                if (cancelled) return;
                setSummary({
                    meteredUsageUsd: Number(json.meteredUsageUsd ?? 0),
                    includedDiscountUsd: Number(json.includedDiscountUsd ?? 0),
                    nextPaymentDueUsd: json.nextPaymentDueUsd == null ? null : Number(json.nextPaymentDueUsd),
                    nextPaymentDueDate: json.nextPaymentDueDate == null ? null : new Date(json.nextPaymentDueDate),
                    dailyUsage: Array.isArray(json.dailyUsage)
                        ? json.dailyUsage.map((d: any) => ({
                              date: new Date(d.date),
                              meteredUsd: Number(d.meteredUsd ?? 0),
                              includedDiscountUsd: Number(d.includedDiscountUsd ?? 0),
                          }))
                        : [],
                });
            } catch (e: any) {
                if (cancelled) return;
                setError(e?.message || "Failed to load billing data");
                setSummary(null);
            } finally {
                if (!cancelled) setIsLoading(false);
            }
        }

        load();
        return () => {
            cancelled = true;
        };
    }, [activeProduct, timeframe]);

    const netUsageUsd = useMemo(() => {
        if (!summary) return 0;
        return Math.max(0, summary.meteredUsageUsd - summary.includedDiscountUsd);
    }, [summary]);

    const chartSeries = useMemo(() => {
        const pts = summary?.dailyUsage ?? [];
        if (pts.length === 0) return [];
        return pts.map((p) => ({
            x: p.date,
            y: Math.max(0, p.meteredUsd - p.includedDiscountUsd),
        }));
    }, [summary]);

    const chartMax = useMemo(() => {
        if (chartSeries.length === 0) return 1;
        return Math.max(1, ...chartSeries.map((p) => p.y));
    }, [chartSeries]);

    const chartPath = useMemo(() => {
        const w = 640;
        const h = 140;
        const pad = 8;
        const pts = chartSeries;
        if (pts.length < 2) return { line: "", area: "" };

        const xStep = (w - pad * 2) / (pts.length - 1);
        const toY = (v: number) => h - pad - (v / chartMax) * (h - pad * 2);

        let d = "";
        pts.forEach((p, idx) => {
            const x = pad + idx * xStep;
            const y = toY(p.y);
            d += idx === 0 ? `M ${x} ${y}` : ` L ${x} ${y}`;
        });

        const area = `${d} L ${pad + (pts.length - 1) * xStep} ${h - pad} L ${pad} ${h - pad} Z`;
        return { line: d, area };
    }, [chartSeries, chartMax]);

    function openDailyUsageModal(dailyUsage: { date: Date; meteredUsd: number; includedDiscountUsd: number }) {
        setSelectedDailyUsage(dailyUsage);
        setIsDailyUsageModalOpen(true);
    }

    function closeDailyUsageModal() {
        setIsDailyUsageModalOpen(false);
        setSelectedDailyUsage(null);
        setUsageAnalytics([]);
        setUsageAnalyticsError(null);
    }

    useEffect(() => {
        let cancelled = false;

        async function loadUsageAnalytics() {
            if (!isDailyUsageModalOpen || !selectedDailyUsage) {
                return;
            }

            setIsUsageAnalyticsLoading(true);
            setUsageAnalyticsError(null);

            try {
                const base = getAdminUiBasePath();
                const selectedDate = new Date(selectedDailyUsage.date);
                const startDate = new Date(Date.UTC(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate(), 0, 0, 0));
                const endDate = new Date(Date.UTC(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate(), 23, 59, 59));
                const query = `start=${encodeURIComponent(startDate.toISOString())}&end=${encodeURIComponent(endDate.toISOString())}`;
                const url = `${base}/api/analytics/usage?${query}`;

                const response = await fetcher(url, createRequestOptions(HttpMethod.Get));
                if (!response.ok) {
                    throw new Error(`API error ${response.status}`);
                }

                const contentType = response.headers.get("content-type") || "";
                if (!contentType.toLowerCase().includes("application/json")) {
                    throw new Error("Unexpected response format from usage analytics API.");
                }

                const data = await response.json();
                const rows = Array.isArray(data)
                    ? data.map((item: any) => ({
                          tenantName: String(item.tenant_name ?? item.tenantName ?? ""),
                          url: String(item.url ?? ""),
                          count: Number(item.count ?? 0),
                      }))
                    : [];

                if (!cancelled) {
                    setUsageAnalytics(rows);
                }
            } catch (e: any) {
                if (!cancelled) {
                    setUsageAnalyticsError(e?.message || "Failed to load usage analytics.");
                    setUsageAnalytics([]);
                }
            } finally {
                if (!cancelled) {
                    setIsUsageAnalyticsLoading(false);
                }
            }
        }

        loadUsageAnalytics();

        return () => {
            cancelled = true;
        };
    }, [isDailyUsageModalOpen, selectedDailyUsage]);

    return (
        <Fragment>
            <h1 className="h3 mb-2 text-gray-800">Customer Billing</h1>
            <p className="mb-4">Review your billing period, usage totals, and active subscriptions.</p>

            <div className="customer-billing-content">
                {/* ===== Filters ===== */}
                <div className="d-flex flex-wrap justify-content-between align-items-center mb-3" style={{ gap: "12px" }}>
                    <div />
                    <div style={{ position: "relative" }}>
                        <button
                            type="button"
                            style={styles.dropdownButton}
                            onClick={() => setTimeframeOpen((v) => !v)}
                            aria-haspopup="menu"
                            aria-expanded={timeframeOpen}
                        >
                            {timeframe}
                        </button>
                        {timeframeOpen && (
                            <div style={styles.dropdownMenu} role="menu" aria-label="Billing timeframe">
                                {timeframeOptions.map((opt) => (
                                    <button
                                        key={opt}
                                        type="button"
                                        style={{
                                            ...styles.dropdownItem,
                                            fontWeight: opt === timeframe ? 700 : 500,
                                        }}
                                        onClick={() => {
                                            setTimeframe(opt);
                                            setTimeframeOpen(false);
                                        }}
                                    >
                                        {opt}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* ===== Status ===== */}
                {isLoading && (
                    <div className="alert alert-info" role="status">
                        Loading billing data…
                    </div>
                )}
                {error && (
                    <div className="alert alert-danger" role="alert">
                        {error}
                    </div>
                )}

                <div className="row mb-4">
                    {/* Current metered usage */}
                    <div className="col-xl-4 col-md-6 mb-4">
                        <div className="card shadow border-left-primary h-100 py-2">
                            <div className="card-body">
                                <div className="row no-gutters align-items-center">
                                    <div className="col mr-2">
                                        <div className="text-xs font-weight-bold text-dark text-uppercase mb-1">
                                            Metered usage
                                        </div>
                                        <div className="h5 mb-0 font-weight-bold text-gray-800">
                                            {formatUsd(summary?.meteredUsageUsd ?? 0)}
                                        </div>
                                        <p className="mt-2 mb-0 text-gray-600" style={{ fontSize: "0.78rem" }}>
                                            Usage charges for {period.label}.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Current included usage */}
                    <div className="col-xl-4 col-md-6 mb-4">
                        <div className="card shadow border-left-success h-100 py-2">
                            <div className="card-body">
                                <div className="row no-gutters align-items-center">
                                    <div className="col mr-2">
                                        <div className="d-flex justify-content-between align-items-start text-xs font-weight-bold text-dark text-uppercase mb-1">
                                            Included usage discounts
                                            <button type="button" style={styles.linkButton} disabled>
                                                Details
                                            </button>
                                        </div>
                                        <div className="h5 mb-0 font-weight-bold text-gray-800">
                                            {formatUsd(summary?.includedDiscountUsd ?? 0)}
                                        </div>
                                        <p className="mt-2 mb-0 text-gray-600" style={{ fontSize: "0.78rem" }}>
                                            Discounts applied for {period.label}.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Next payment due */}
                    <div className="col-xl-4 col-md-6 mb-4">
                        <div className="card shadow border-left-info h-100 py-2">
                            <div className="card-body">
                                <div className="row no-gutters align-items-center">
                                    <div className="col mr-2">
                                        <div className="d-flex justify-content-between align-items-start text-xs font-weight-bold text-dark text-uppercase mb-1">
                                            Next payment due
                                            <button type="button" style={styles.linkButton} disabled>
                                                Payment history
                                            </button>
                                        </div>
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
                    </div>
                </div>

                {/* ===== Usage dashboard ===== */}
                <div className="d-flex justify-content-between align-items-center mb-2">
                    <h2 style={styles.sectionTitle}>Usage dashboard</h2>
                    <div style={styles.smallMeta}>
                        Net usage: <strong>{formatUsd(netUsageUsd)}</strong>
                    </div>
                </div>

                <div className="card mb-4" style={styles.card}>
                    <div className="card-body">
                        <div className="d-flex justify-content-between align-items-start flex-wrap" style={{ gap: "10px" }}>
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
                                <div className="text-muted" style={{ fontSize: "0.85rem" }}>
                                    No usage data yet for this period.
                                </div>
                            ) : (
                                <svg viewBox="0 0 640 140" width="100%" height="160" role="img" aria-label="Net usage chart">
                                    <path d={chartPath.area} fill="rgba(0,105,217,0.12)" />
                                    <path d={chartPath.line} fill="none" stroke="#0069d9" strokeWidth="2" />
                                </svg>
                            )}
                        </div>
                    </div>
                </div>

                {/* ===== Daily breakdown (compact) ===== */}
                <div className="d-flex justify-content-between align-items-center mb-2">
                    <h2 style={styles.sectionTitle}>Daily breakdown</h2>
                    <div />
                </div>

                <div className="card mb-5" style={styles.card}>
                    <div className="card-body" style={{ padding: "0" }}>
                        <div style={{ maxHeight: 280, overflow: "auto", position: "relative" }}>
                            <table className="table table-sm mb-0" style={{ tableLayout: "fixed", width: "100%" }}>
                                <colgroup>
                                    <col style={{ width: "34%" }} />
                                    <col style={{ width: "22%" }} />
                                    <col style={{ width: "28%" }} />
                                    <col style={{ width: "16%" }} />
                                </colgroup>
                                <thead style={{ position: "sticky", top: 0, backgroundColor: "#ffffff", zIndex: 1 }}>
                                    <tr>
                                        <th style={{ borderTop: "none", padding: "8px 12px", whiteSpace: "nowrap" }}>Date</th>
                                        <th style={{ borderTop: "none", padding: "8px 12px", whiteSpace: "nowrap" }} className="text-right">
                                            Metered
                                        </th>
                                        <th style={{ borderTop: "none", padding: "8px 12px", whiteSpace: "nowrap" }} className="text-right">
                                            Included discount
                                        </th>
                                        <th style={{ borderTop: "none", padding: "8px 12px", whiteSpace: "nowrap" }} className="text-right">
                                            Net
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {(summary?.dailyUsage ?? [])
                                        .slice()
                                        .reverse()
                                        .map((d) => {
                                            const net = Math.max(0, d.meteredUsd - d.includedDiscountUsd);
                                            return (
                                                <tr
                                                    key={d.date.toISOString()}
                                                    onClick={() => openDailyUsageModal(d)}
                                                    onKeyDown={(e) => {
                                                        if (e.key === "Enter" || e.key === " ") {
                                                            e.preventDefault();
                                                            openDailyUsageModal(d);
                                                        }
                                                    }}
                                                    role="button"
                                                    tabIndex={0}
                                                    style={{ cursor: "pointer" }}
                                                >
                                                    <td style={{ padding: "6px 12px" }}>{formatDate(d.date)}</td>
                                                    <td className="text-right" style={{ padding: "6px 12px" }}>{formatUsd(d.meteredUsd)}</td>
                                                    <td className="text-right" style={{ padding: "6px 12px" }}>{formatUsd(d.includedDiscountUsd)}</td>
                                                    <td className="text-right" style={{ padding: "6px 12px" }}>{formatUsd(net)}</td>
                                                </tr>
                                            );
                                        })}
                                    {(summary?.dailyUsage ?? []).length === 0 && !isLoading && !error && (
                                        <tr>
                                            <td colSpan={4} className="text-muted" style={{ padding: "6px 12px" }}>
                                                No data.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

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
                            {!isUsageAnalyticsLoading && usageAnalyticsError && (
                                <div className="alert alert-danger mb-0">{usageAnalyticsError}</div>
                            )}
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
                                            {usageAnalytics.map((item, index) => (
                                                <tr key={`${item.tenantName}-${item.url}-${index}`}>
                                                    <td>{item.tenantName || "-"}</td>
                                                    <td style={{ wordBreak: "break-all" }}>{item.url || "-"}</td>
                                                    <td className="text-right">{item.count.toLocaleString()}</td>
                                                </tr>
                                            ))}
                                            {usageAnalytics.length === 0 && (
                                                <tr>
                                                    <td colSpan={3} className="text-muted">
                                                        No usage analytics records for this date.
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    </Modal.Body>
                    <Modal.Footer>
                        <Button className="btn-modal-synonym" variant="primary" onClick={closeDailyUsageModal}>
                            Close
                        </Button>
                    </Modal.Footer>
                </Modal>


            </div>
        </Fragment>
    );
};

// ─── Inline style constants ───────────────────────────────────────────────────

const styles: { [key: string]: React.CSSProperties } = {
    sectionTitle: {
        fontSize: "1.2rem",
        fontWeight: 700,
        color: "#212529",
        marginBottom: "1rem",
    },
    card: {
        border: "1px solid #e3e6f0",
        borderRadius: "6px",
        backgroundColor: "#ffffff",
        boxShadow: "none",
    },
    cardLabel: {
        fontSize: "0.82rem",
        color: "#6c757d",
        marginBottom: "0.25rem",
        fontWeight: 500,
    },
    cardAmount: {
        fontSize: "1.4rem",
        fontWeight: 700,
        color: "#212529",
        marginBottom: "0.25rem",
    },
    cardSubtext: {
        fontSize: "0.78rem",
        color: "#6c757d",
        marginBottom: 0,
    },
    perMonth: {
        fontSize: "0.9rem",
        fontWeight: 400,
        color: "#6c757d",
    },
    link: {
        fontSize: "0.75rem",
        color: "#0069d9",
        textDecoration: "none",
        whiteSpace: "nowrap",
        fontWeight: 400,
    },
    linkButton: {
        fontSize: "0.75rem",
        color: "#0069d9",
        background: "none",
        border: "none",
        padding: 0,
        whiteSpace: "nowrap",
        fontWeight: 500,
        cursor: "not-allowed",
        opacity: 0.65,
    },
    smallMeta: {
        fontSize: "0.82rem",
        color: "#6c757d",
    },
    legendRow: {
        display: "inline-flex",
        alignItems: "center",
        gap: "8px",
        fontSize: "0.82rem",
        color: "#6c757d",
        whiteSpace: "nowrap",
    },
    legendText: {
        fontSize: "0.82rem",
        color: "#6c757d",
        fontWeight: 600,
    },
    dropdownButton: {
        padding: "6px 14px",
        fontSize: "0.82rem",
        backgroundColor: "#ffffff",
        border: "1px solid #d1d5da",
        borderRadius: "6px",
        cursor: "pointer",
        color: "#212529",
    },
    dropdownMenu: {
        position: "absolute",
        right: 0,
        top: "calc(100% + 4px)",
        backgroundColor: "#ffffff",
        border: "1px solid #d1d5da",
        borderRadius: "6px",
        boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
        zIndex: 100,
        minWidth: "180px",
        display: "flex",
        flexDirection: "column",
    },
    dropdownItem: {
        padding: "8px 16px",
        fontSize: "0.82rem",
        background: "none",
        border: "none",
        textAlign: "left",
        cursor: "pointer",
        color: "#212529",
    },
    tabBar: {
        display: "flex",
        gap: "0",
        borderBottom: "1px solid #e3e6f0",
        overflowX: "auto",
    },
    tab: {
        padding: "8px 14px",
        background: "none",
        border: "none",
        borderBottom: "2px solid transparent",
        cursor: "pointer",
        fontSize: "0.82rem",
        whiteSpace: "nowrap",
    },
    progressTrack: {
        height: "6px",
        backgroundColor: "#e3e6f0",
        borderRadius: "3px",
        marginTop: "4px",
    },
    progressBar: {
        height: "100%",
        backgroundColor: "#0069d9",
        borderRadius: "3px",
    },
};

export default CustomerBilling;
