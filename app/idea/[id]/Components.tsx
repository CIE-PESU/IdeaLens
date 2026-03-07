"use client";

import {
    Sparkles,
    Rocket,
    ShieldCheck,
    Target,
    Zap,
    Settings,
    TrendingUp,
    AlertTriangle,
    Lightbulb,
    Mic2,
    Heart,
    Cpu,
    Coins,
    ChevronDown,
    Activity,
    CheckCircle2,
    XCircle,
    Info,
    Timer,
    Play,
    Pause,
    RotateCcw
} from "lucide-react";
import { ReactNode, useState, useEffect } from "react";
import Image from "next/image";

/**
 * Premium Logo Bar with glassmorphism and improved spacing
 */
export function LogoBar() {
    return (
        <div className="w-full max-w-7xl mx-auto px-6 pt-10 pb-6 mb-8 animate-premium">
            <div className="grid grid-cols-3 items-center">
                {/* PES Logo - Left Aligned */}
                <div className="justify-self-start">
                    <Image src="/pes_v2.png" alt="PES" width={400} height={400} className="h-40 w-auto object-contain" priority />
                </div>

                {/* Idea Lens Logo - Center Aligned */}
                <div className="justify-self-center">
                    <Image src="/idealens.png" alt="IdeaLens" width={400} height={400} className="h-48 w-auto object-contain" priority />
                </div>

                {/* CIE Logo - Right Aligned */}
                <div className="justify-self-end">
                    <Image src="/cie.png" alt="CIE" width={400} height={400} className="h-40 w-auto object-contain" priority />
                </div>
            </div>
        </div>
    );
}

/**
 * Modern Section Header and Content
 */
export function Section({ title, text, subHeader, icon }: { title: string; text: string | null | undefined; subHeader?: string | null; icon?: ReactNode }) {
    return (
        <div className="group space-y-3 py-6 last:pb-0 transition-all duration-300">
            <div className="flex items-center gap-2">
                {icon && <span className="text-brand-accent">{icon}</span>}
                <h3 className="text-[18px] font-black text-black uppercase tracking-[0.3em]">{title}</h3>
            </div>
            {subHeader && <div className="text-2xl font-black text-[#0F1E2E] leading-tight tracking-tight uppercase italic">{subHeader}</div>}
            <div className="text-[#0F1E2E]/80 leading-relaxed text-lg font-medium max-w-4xl">
                {text || <span className="text-slate-400 italic font-normal">No technical details provided</span>}
            </div>
        </div>
    );
}

/**
 * Premium Insight Chips
 */
export function ChipRow({ title, items, variant = "blue", icon }: { title: string; items: string | string[] | null | undefined; variant?: "blue" | "indigo" | "teal"; icon?: ReactNode }) {
    const variants: any = {
        blue: "bg-blue-50 text-blue-900 border-blue-100/50 hover:bg-blue-100",
        indigo: "bg-indigo-50 text-indigo-900 border-indigo-100/50 hover:bg-indigo-100",
        teal: "bg-teal-50 text-teal-900 border-teal-100/50 hover:bg-teal-100",
    };
    const itemList = typeof items === 'string' ? items.split(',').map(x => x.trim()).filter(Boolean) : (items || []);

    return (
        <div className="space-y-4 py-6 transition-all duration-300">
            <div className="flex items-center gap-2">
                {icon && <span className="text-brand-accent">{icon}</span>}
                <h3 className="text-[18px] font-black text-black uppercase tracking-[0.3em]">{title}</h3>
            </div>
            <div className="flex flex-wrap gap-2.5">
                {itemList.length === 0 ? (
                    <span className="text-slate-400 italic">—</span>
                ) : (
                    itemList.map((x, i) => (
                        <span key={i} className={`px-5 py-2 rounded-xl text-sm font-bold border transition-all duration-200 cursor-default ${variants[variant]}`}>
                            {x}
                        </span>
                    ))
                )}
            </div>
        </div>
    );
}

/**
 * Enhanced Bullet List
 */
export function BulletRow({ title, items, icon }: { title: string; items: string | string[] | null | undefined; icon?: ReactNode }) {
    const itemList = typeof items === 'string' ? items.split(',').map(x => x.trim()).filter(Boolean) : (items || []);
    return (
        <div className="space-y-4 py-6 transition-all duration-300">
            <div className="flex items-center gap-2">
                {icon && <span className="text-brand-accent">{icon}</span>}
                <h3 className="text-[18px] font-black text-black uppercase tracking-[0.3em]">{title}</h3>
            </div>
            <ul className="space-y-3">
                {itemList.length === 0 ? <li className="text-slate-400 italic">—</li> : itemList.map((x, i) => (
                    <li key={i} className="flex items-start gap-4 text-[#0F1E2E] font-bold group/item">
                        <span className="mt-2 h-1.5 w-1.5 rounded-full bg-brand-accent shadow-[0_0_8px_rgba(6,182,212,0.5)] group-hover/item:scale-150 transition-transform flex-shrink-0"></span>
                        <span>{x}</span>
                    </li>
                ))}
            </ul>
        </div>
    );
}

/**
 * Premium Interactive Slider for Jury Scoring
 */
export function ScoringSlider({
    title,
    icon,
    value,
    onChange,
    disabled = false,
    aiScore = null,
    showAI = false,
    weight = null
}: {
    title: string;
    icon: ReactNode;
    value: string;
    onChange: (v: string) => void;
    disabled?: boolean;
    aiScore?: number | null;
    showAI?: boolean;
    weight?: number | null;
}) {
    const numVal = value === "" ? 0 : Number(value);

    // Dynamic gradient color based on score
    const getTrackBg = () => {
        const percent = numVal * 10;
        return `linear-gradient(to right, #06b6d4 ${percent}%, #EEF3F8 ${percent}%)`;
    };

    const getScoreColor = () => {
        if (numVal >= 8) return "text-emerald-600";
        if (numVal >= 6) return "text-brand-blue";
        if (numVal >= 4) return "text-amber-600";
        return "text-rose-600";
    };

    return (
        <div className="bg-[#F4F7FA] border border-[#0F1E2E]/5 p-8 rounded-[2rem] shadow-sm transition-all duration-300 hover:shadow-lg hover:border-[#0F1E2E]/10 group">
            <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-2xl bg-white flex items-center justify-center shadow-sm border border-[#0F1E2E]/5">
                        <span className="text-brand-blue">{icon}</span>
                    </div>
                    <div>
                        <h4 className="text-xs font-black text-[#0F1E2E] uppercase tracking-widest">{title}</h4>
                        {weight && <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Impact: {weight * 100}%</span>}
                    </div>
                </div>
                <div className={`text-4xl font-black ${getScoreColor()} tabular-nums tracking-tighter`}>
                    {value || "0"}
                </div>
            </div>

            <div className="relative h-6 flex items-center mb-8">
                <input
                    type="range"
                    min="0"
                    max="10"
                    step="0.5"
                    value={value || "0"}
                    onChange={(e) => onChange(e.target.value)}
                    disabled={disabled}
                    className="w-full h-2.5 bg-[#EEF3F8] rounded-full appearance-none cursor-pointer accent-brand-accent transition-all hover:h-3"
                    style={{ background: getTrackBg() }}
                />
            </div>

            <div className="flex justify-between items-center pt-6 border-t border-dashed border-[#0F1E2E]/10">
                <div className="flex items-center gap-4">
                    {showAI && (
                        <div className="flex flex-col">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter mb-0.5">AI Benchmark</span>
                            <div className="flex items-center gap-2">
                                <span className="text-sm font-black text-[#0F1E2E] tracking-tight">{aiScore ?? "—"}</span>
                                {aiScore !== null && value !== "" && (
                                    <span className={`text-[10px] font-black px-1.5 py-0.5 rounded ${Math.abs(numVal - aiScore) > 2 ? 'bg-amber-50 text-amber-600' : 'bg-emerald-50 text-emerald-600'}`}>
                                        {numVal > aiScore ? "↑" : "↓"} {Math.abs(numVal - aiScore).toFixed(1)}
                                    </span>
                                )}
                            </div>
                        </div>
                    )}
                </div>
                <div className="text-[10px] font-black text-slate-300 uppercase tracking-widest flex items-center gap-1">
                    <Activity size={10} />
                    Precision Tier
                </div>
            </div>
        </div>
    );
}

export function ScoreCard({
    title,
    emoji,
    value,
    onChange,
    submitted,
    ai,
    aiRevealed,
    disabled,
    isManualOnly = false
}: {
    title: string,
    emoji: ReactNode,
    value: string,
    onChange: (v: string) => void,
    submitted: boolean,
    ai: number | null,
    aiRevealed: boolean,
    disabled: boolean,
    isManualOnly?: boolean
}) {
    return (
        <ScoringSlider
            title={title}
            icon={emoji}
            value={value}
            onChange={onChange}
            disabled={disabled || submitted}
            aiScore={ai}
            showAI={aiRevealed && !isManualOnly}
        />
    );
}

/**
 * Compact SVG Radar Chart for Innovation Profiling
 */
function RadarChart({ aiData, juryData, size = 160 }: { aiData: number[], juryData: number[], size?: number }) {
    const center = size / 2;
    const radius = (size / 2) * 0.8;
    const axes = ["Market", "Execution", "Viability", "Risk"];
    const points = axes.length;

    const getPoint = (index: number, value: number) => {
        const angle = (Math.PI * 2 * index) / points - Math.PI / 2;
        const x = center + (radius * Math.max(0.5, value)) / 10 * Math.cos(angle);
        const y = center + (radius * Math.max(0.5, value)) / 10 * Math.sin(angle);
        return `${x},${y}`;
    };

    const aiPath = aiData.map((v, i) => getPoint(i, v)).join(" ");
    const juryPath = juryData.map((v, i) => getPoint(i, v)).join(" ");

    return (
        <svg width={size} height={size} className="overflow-visible">
            {/* Background Polygons */}
            {[5, 10].map((step) => (
                <circle
                    key={step}
                    cx={center}
                    cy={center}
                    r={(radius * step) / 10}
                    className="fill-none stroke-slate-200/50 stroke-1"
                />
            ))}
            {/* Radar Chart Lines */}
            {axes.map((axis, i) => {
                const p = getPoint(i, 10);
                return (
                    <line
                        key={i}
                        x1={center}
                        y1={center}
                        x2={p.split(",")[0]}
                        y2={p.split(",")[1]}
                        className="stroke-slate-200/50 stroke-1"
                    />
                );
            })}
            {/* Jury Profile (Highlighted) */}
            <polygon
                points={juryPath}
                className="fill-brand-accent/30 stroke-brand-accent stroke-2 transition-all duration-500"
                style={{ filter: 'drop-shadow(0 0 12px rgba(6,182,212,0.4))' }}
            />
            {/* Outer Labels */}
            {axes.map((axis, i) => {
                const angle = (Math.PI * 2 * i) / points - Math.PI / 2;
                const tx = center + (radius + 30) * Math.cos(angle);
                const ty = center + (radius + 30) * Math.sin(angle);
                return (
                    <text
                        key={axis}
                        x={tx}
                        y={ty}
                        textAnchor="middle"
                        dominantBaseline="middle"
                        className="text-[11px] font-black fill-slate-900 uppercase tracking-widest"
                    >
                        {axis}
                    </text>
                );
            })}
        </svg>
    );
}
/**
 * Minimalist Vision Core Header
 */
export function AISnapshot({
    scores,
    insights,
    teamName,
    problemTitle
}: {
    scores: any,
    insights: string | null | undefined,
    teamName?: string,
    problemTitle?: string | null
}) {
    return (
        <div className="bg-premium-gradient rounded-[2.5rem] p-10 text-white shadow-2xl relative overflow-hidden mb-12 animate-premium border border-white/10">
            <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-brand-accent/20 to-transparent pointer-events-none"></div>
            <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-indigo-500/20 blur-[100px] rounded-full"></div>

            <div className="relative z-10">
                <div className="flex flex-col md:flex-row items-center justify-between gap-10">
                    <div className="flex-1 space-y-4">
                        <div className="flex items-center gap-3">
                            <Cpu size={14} className="text-brand-accent animate-pulse" />
                            <span className="text-xs font-bold tracking-[0.3em] uppercase text-brand-accent">Protocol Snapshot {teamName ? `| ${teamName}` : ''}</span>
                        </div>
                        <h2 className="text-5xl font-black tracking-tight leading-none italic">
                            {problemTitle || "The Vision Core"}
                        </h2>
                        <p className="text-slate-300 text-sm leading-relaxed max-w-xl italic">
                            {insights || "Synthesizing market signals and technical feasibility thresholds..."}
                        </p>
                    </div>

                    <div className="w-px h-24 bg-white/10 hidden md:block"></div>

                    <div className="flex flex-col items-center justify-center min-w-[140px]">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Protocol Score</span>
                        <div className="text-7xl font-black text-brand-teal tracking-tighter leading-none italic">
                            {scores.avg || "—"}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

/**
 * Innovation Metrics Strategic Spine
 */
function getStrategicInsight(data: number[]) {
    const axes = ["Market", "Execution", "Viability", "Risk"];
    const maxIdx = data.indexOf(Math.max(...data));
    const minIdx = data.indexOf(Math.min(...data));

    const insights: Record<string, string> = {
        "Market": "High market appetite confirms scalability potential, though structural foundations need focus.",
        "Execution": "Strong technical readiness is evident; the priority is now securing product-market fit.",
        "Viability": "Solid operational math detected, ensuring long-term sustainability is a core strength.",
        "Risk": "Proactive risk mitigation and governance are the primary drivers for this initiative."
    };

    return {
        driver: axes[maxIdx],
        risk: axes[minIdx],
        message: insights[axes[maxIdx]] || "Strategy shows balanced potential across all core intelligence nodes."
    };
}

export function InnovationMetrics({
    aiData,
    juryData,
    alignment,
    innovationIndex,
    classification,
    totalDeviation
}: {
    aiData: number[],
    juryData: number[],
    alignment: number,
    innovationIndex: number,
    classification: string,
    totalDeviation: number
}) {
    const { driver, risk, message } = getStrategicInsight(juryData);

    return (
        <div className="space-y-12 animate-advanced-reveal">
            <div>
                <div className="flex items-center gap-2 mb-8 uppercase tracking-[0.3em]">
                    <Activity size={14} className="text-brand-accent" />
                    <h3 className="text-[12px] font-black text-black">Strategic Analysis</h3>
                </div>

                <div className="space-y-12">
                    {/* Guiding Insight */}
                    <div className="group">
                        <div className="flex items-center gap-3 mb-4">
                            <Sparkles size={16} className="text-brand-accent animate-pulse" />
                            <span className="text-[10px] font-black text-brand-accent uppercase tracking-widest">Guiding Insight</span>
                        </div>
                        <p className="text-lg font-bold text-slate-800 leading-tight italic border-l-4 border-brand-accent pl-6 py-2">
                            "{message}"
                        </p>
                    </div>

                    {/* Compact Radar */}
                    <div className="py-12 mb-6">
                        <RadarChart aiData={aiData} juryData={juryData} />
                    </div>
                </div>

                {/* Badges */}
                <div className="grid grid-cols-2 gap-4">
                    <div className="p-5 bg-emerald-50 border border-emerald-100/50 rounded-2xl">
                        <span className="text-[9px] font-black text-emerald-600 uppercase tracking-widest block mb-2 font-mono">Primary Driver</span>
                        <span className="text-sm font-black text-emerald-900 uppercase italic tracking-tighter">{driver} Focus</span>
                    </div>
                    <div className="p-5 bg-rose-50 border border-rose-100/50 rounded-2xl">
                        <span className="text-[9px] font-black text-rose-600 uppercase tracking-widest block mb-2 font-mono">Risk Frontier</span>
                        <span className="text-sm font-black text-rose-900 uppercase italic tracking-tighter">{risk} Node</span>
                    </div>
                </div>

                {/* Alignment */}
                <div className="space-y-4 pt-10 border-t border-slate-100">
                    <div className="flex items-center justify-between">
                        <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Strategic Alignment</label>
                        <span className="text-3xl font-black text-[#0F1E2E] tracking-tighter">{alignment}%</span>
                    </div>
                    <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-[#0F1E2E] transition-all duration-1000 ease-out"
                            style={{ width: `${alignment}%` }}
                        ></div>
                    </div>
                </div>

                {/* Index */}
                <div className="pt-10 border-t border-slate-100 flex flex-col items-center text-center">
                    <div className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3 font-mono">Innovation Index</div>
                    <div className="text-8xl font-black text-[#0F1E2E] tracking-tighter leading-none mb-6 italic">{innovationIndex}</div>
                    <div className="px-6 py-2.5 bg-[#0F1E2E] text-white rounded-xl text-[10px] font-black uppercase tracking-[0.3em] italic shadow-xl shadow-brand-blue/20">
                        {classification}
                    </div>
                </div>
            </div>
        </div>
    );
}

function ScoreMetric({ label, value, color, highlight = false }: { label: string, value: any, color: string, highlight?: boolean }) {
    return (
        <div className="flex flex-col items-center">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">{label}</span>
            <div className={`text-4xl font-black ${color} ${highlight ? 'scale-125' : ''} tabular-nums`}>
                {value ?? "—"}
            </div>
        </div>
    );
}

export function CollapsibleSection({ title, children, icon, defaultOpen = true }: { title: string, children: ReactNode, icon?: ReactNode, defaultOpen?: boolean }) {
    const [isOpen, setIsOpen] = useState(defaultOpen);

    return (
        <div className={`border-b border-slate-100 overflow-hidden transition-all duration-500 last:border-0`}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex items-center justify-between py-10 transition-colors group text-left"
            >
                <div className="flex items-center gap-6">
                    <div className={`h-14 w-14 rounded-2xl flex items-center justify-center transition-all duration-500 ${isOpen ? 'bg-slate-900 text-white shadow-xl' : 'bg-slate-50 text-slate-400 border border-slate-100 shadow-sm'}`}>
                        {icon ? <span className="text-2xl">{icon}</span> : <div className="h-1.5 w-1.5 rounded-full bg-current"></div>}
                    </div>
                    <h3 className="text-3xl font-black text-[#0F1E2E] group-hover:text-brand-accent transition-colors tracking-tighter uppercase italic">{title}</h3>
                </div>
                <div className={`transition-transform duration-500 transform ${isOpen ? 'rotate-180 text-brand-accent' : 'text-slate-300'}`}>
                    <ChevronDown size={32} strokeWidth={3} />
                </div>
            </button>
            <div className={`px-4 transition-all duration-500 ease-in-out ${isOpen ? 'opacity-100 max-h-[3000px] pb-10' : 'opacity-0 max-h-0 pointer-events-none'}`}>
                <div className="divide-y divide-slate-50">
                    {children}
                </div>
            </div>
        </div>
    );
}

/**
 * Innovation Signature Modal - Post-Submission Summary
 */
export function InnovationSignature({
    isOpen,
    onClose,
    data
}: {
    isOpen: boolean,
    onClose: () => void,
    data: {
        index: number,
        classification: string,
        alignment: number,
        time: number,
        strengths: string[],
        risks: string[]
    }
}) {
    if (!isOpen) return null;

    const formatTime = (s: number) => {
        const mins = Math.floor(s / 60);
        const secs = s % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 animate-advanced-reveal">
            <div className="absolute inset-0 bg-[#0F1E2E]/80 backdrop-blur-xl" onClick={onClose}></div>

            <div className="relative w-full max-w-2xl bg-white rounded-[3rem] shadow-2xl overflow-hidden animate-premium border border-slate-200">
                <div className="bg-premium-gradient p-12 text-white text-center relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-full h-full bg-[radial-gradient(circle_at_top_right,rgba(6,182,212,0.15),transparent)] pointer-events-none"></div>
                    <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-indigo-500/10 blur-[100px] rounded-full"></div>

                    <div className="relative z-10 space-y-4">
                        <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-white/10 border border-white/20 rounded-full text-[10px] font-black uppercase tracking-[0.3em] mb-4">
                            <Sparkles size={12} className="text-brand-accent" />
                            Innovation Signature Generated
                        </div>
                        <h2 className="text-6xl font-black tracking-tighter italic uppercase leading-none">
                            {data.index}
                        </h2>
                        <div className="text-xl font-bold tracking-tight text-brand-accent uppercase italic">
                            {data.classification}
                        </div>
                    </div>
                </div>

                <div className="p-12 space-y-10">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
                        <MetricBox label="Alignment" value={`${data.alignment}%`} />
                        <MetricBox label="Eval Time" value={formatTime(data.time)} />
                        <MetricBox label="Strength" value={data.strengths[0] || "TBD"} />
                        <MetricBox label="Risk" value={data.risks[0] || "TBD"} />
                    </div>

                    <div className="flex flex-col md:flex-row gap-4 pt-6 border-t border-slate-100">
                        <button
                            onClick={() => window.print()}
                            className="flex-1 py-4 bg-brand-accent text-white rounded-2xl font-black uppercase italic tracking-widest hover:bg-slate-900 transition-all flex items-center justify-center gap-2 group shadow-xl shadow-brand-accent/20"
                        >
                            <TrendingUp size={18} className="group-hover:translate-y-[-2px] transition-transform" />
                            Download Snapshot
                        </button>
                        <button
                            onClick={onClose}
                            className="flex-1 py-4 bg-slate-100 text-slate-900 rounded-2xl font-black uppercase italic tracking-widest hover:bg-slate-200 transition-all"
                        >
                            Close Protocol
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

function MetricBox({ label, value }: { label: string, value: string }) {
    return (
        <div className="space-y-1">
            <div className="text-[8px] font-black text-slate-400 uppercase tracking-widest">{label}</div>
            <div className="text-sm font-black text-slate-900 truncate">{value}</div>
        </div>
    );
}
