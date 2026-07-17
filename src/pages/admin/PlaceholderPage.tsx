import React from "react";
import { Link } from "wouter";
import { Sparkles, ArrowLeft, Lock, Construction } from "lucide-react";
import { PageHeader, Card, Button, AdminBreadcrumb } from "@/components/admin/ui";
import { ROUTES } from "@/constants/routes";

interface PlaceholderPageProps {
  title: string;
  phase: string;
  description: string;
  upcomingFeatures: string[];
}

export function PlaceholderPage({
  title,
  phase,
  description,
  upcomingFeatures,
}: PlaceholderPageProps) {
  return (
    <div className="space-y-8 animate-fade-in">
      <AdminBreadcrumb items={[{ label: title }]} />

      <PageHeader
        badge={`Scheduled for ${phase}`}
        title={title}
        description={description}
      >
        <Link href={ROUTES.ADMIN.DASHBOARD}>
          <Button variant="outline" size="sm" className="gap-2 text-xs font-sans">
            <ArrowLeft className="size-3.5" />
            <span>Back to Dashboard</span>
          </Button>
        </Link>
      </PageHeader>

      <Card className="bg-black/30 border-gold/25 p-8 text-center rounded-2xl max-w-3xl mx-auto shadow-xl">
        <div className="size-16 rounded-2xl bg-gold/10 border border-gold/30 flex items-center justify-center text-gold mx-auto mb-6 shadow-inner">
          <Construction className="size-8 animate-pulse" />
        </div>

        <h2 className="font-serif text-2xl text-stone-100 font-normal mb-2">
          {title} Module Under Construction
        </h2>
        <p className="font-sans text-xs text-gold uppercase tracking-[0.2em] mb-6">
          ✦ {phase} Development Milestone ✦
        </p>

        <p className="font-sans text-sm text-stone-400 font-light max-w-xl mx-auto leading-relaxed mb-8">
          This module is part of our upcoming development roadmap and has been intentionally locked during Phase 1 & 1.5. Once verification is completed, this section will be activated.
        </p>

        <div className="bg-stone-900/60 border border-stone-800/80 rounded-xl p-6 text-left max-w-lg mx-auto mb-8">
          <h3 className="font-serif text-sm text-stone-200 mb-3 flex items-center gap-2 font-normal">
            <Sparkles className="size-3.5 text-gold" /> Planned Features for {phase}:
          </h3>
          <ul className="space-y-2.5">
            {upcomingFeatures.map((feature, idx) => (
              <li key={idx} className="flex items-center gap-2.5 text-xs font-sans text-stone-300 font-light">
                <div className="size-1.5 rounded-full bg-gold shrink-0" />
                <span>{feature}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="flex items-center justify-center gap-3">
          <Link href={ROUTES.ADMIN.DASHBOARD}>
            <Button className="bg-gold text-stone-950 hover:bg-gold-hover text-xs font-sans font-semibold px-6">
              Return to Dashboard
            </Button>
          </Link>
        </div>
      </Card>
    </div>
  );
}
