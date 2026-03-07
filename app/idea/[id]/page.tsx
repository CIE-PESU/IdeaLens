import IdeaPageClient from "./IdeaPageClient";

export function generateStaticParams() {
    return [{ id: "fallback" }];
}

export default function Page() {
    return <IdeaPageClient />;
}
