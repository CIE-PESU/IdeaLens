"use client";

import Image from "next/image";

export default function LogosHeader() {
    return (
        <div className="w-full px-6 -mt-8 pb-2 bg-slate-50">
            <div className="flex items-center justify-between w-full max-w-7xl mx-auto">

                {/* PES - Left */}
                <div className="flex items-center justify-start flex-shrink-0">
                    <Image
                        src="/pes_v2.png"
                        alt="PES"
                        width={300}
                        height={300}
                        className="h-12 w-auto object-contain"
                        priority
                    />
                </div>

                {/* IdeaLens - Center */}
                <div className="flex items-center justify-center flex-1">
                    <Image
                        src="/idealens.png"
                        alt="IdeaLens"
                        width={250}
                        height={100}
                        className="h-43 w-auto object-contain drop-shadow-md"
                        priority
                    />
                </div>

                {/* CIE - Right */}
                <div className="flex items-center justify-end flex-shrink-0">
                    <Image
                        src="/cie.png"
                        alt="CIE"
                        width={300}
                        height={120}
                        className="h-12 w-auto object-contain"
                        priority
                    />
                </div>

            </div>
        </div>
    );
}