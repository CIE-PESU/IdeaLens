"use client";

import Image from "next/image";

export default function LogosHeader() {
    return (
        <div className="w-full px-6 pt-4 pb-4">
            <div className="grid grid-cols-3 items-center w-full">

                {/* PES - Left */}
                <div className="flex justify-start">
                    <Image
                        src="/pes_v2.png"
                        alt="PES"
                        width={800}
                        height={900}
                        className="h-24 md:h-32 lg:h-40 w-auto object-contain"
                        priority
                    />
                </div>

                {/* IdeaLens - Center */}
                <div className="flex justify-center">
                    <Image
                        src="/idealens.png"
                        alt="IdeaLens"
                        width={700}
                        height={260}
                        className="h-28 md:h-36 lg:h-44 w-auto object-contain drop-shadow-md"
                        priority
                    />
                </div>

                {/* CIE - Right */}
                <div className="flex justify-end">
                    <Image
                        src="/cie.png"
                        alt="CIE"
                        width={800}
                        height={300}
                        className="h-24 md:h-32 lg:h-40 w-auto object-contain"
                        priority
                    />
                </div>

            </div>
        </div>
    );
}