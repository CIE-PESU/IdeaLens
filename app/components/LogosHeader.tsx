"use client";

import Image from "next/image";

export default function LogosHeader() {
    return (
        <div className="w-full px-6 pt-8 pb-4">
            <div className="grid grid-cols-3 items-center w-full">
                {/* PES logo → extreme left */}
                <div className="justify-self-start">
                    <Image
                        src="/pes_v2.png"
                        alt="PES"
                        width={400}
                        height={400}
                        className="h-28 md:h-32 lg:h-36 w-auto object-contain"
                        priority
                    />
                </div>

                {/* IdeaLens logo → exact center */}
                <div className="justify-self-center">
                    <Image
                        src="/idealens.png"
                        alt="IdeaLens"
                        width={400}
                        height={400}
                        className="h-32 md:h-36 lg:h-40 w-auto object-contain"
                        priority
                    />
                </div>

                {/* CIE logo → extreme right */}
                <div className="justify-self-end">
                    <Image
                        src="/cie.png"
                        alt="CIE"
                        width={400}
                        height={400}
                        className="h-28 md:h-32 lg:h-36 w-auto object-contain"
                        priority
                    />
                </div>
            </div>
        </div>
    );
}
