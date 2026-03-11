"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect } from "react";

export default function IdeaPageClient() {
    const params = useParams();
    const router = useRouter();

    useEffect(() => {
        let pId = params?.id as string;
        if (pId) pId = decodeURIComponent(pId);
        const reserved = ['view', 'placeholder', 'fallback', 'index', 'loading', 'undefined', 'null'];

        if (!pId || reserved.includes(pId)) {
            if (typeof window !== 'undefined') {
                const pathParts = window.location.pathname.split('/');
                const lastPart = pathParts[pathParts.length - 1];
                if (lastPart && !reserved.includes(lastPart)) {
                    pId = decodeURIComponent(lastPart);
                }
            }
        }

        if (pId && !reserved.includes(pId)) {
            router.replace(`/idea/team?id=${pId}`);
        } else {
            router.replace("/");
        }
    }, [params, router]);

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center font-sans">
            <div className="h-10 w-10 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin mb-4"></div>
            <div className="animate-pulse text-slate-500 font-bold uppercase tracking-widest text-xs">Standardizing Layout Strategy...</div>
        </div>
    );
}
