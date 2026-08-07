import * as React from "react";
import { Clock, Flame, Target, TrendingUp } from "lucide-react";
import { StatCard } from "@/components/ui/stat-card";
import { GallerySection, Row } from "../gallery-section";

const ACCENTS = ["primary", "blue", "violet", "emerald", "amber"] as const;

export function StatCardSpecimens() {
  return (
    <div>
      <Row label="Accent colours" note="hover to see the lift and the shimmer sweep">
        <div className="grid w-full gap-3 sm:grid-cols-2">
          {ACCENTS.map((accent) => (
            <StatCard
              key={accent}
              label={accent}
              value={1340}
              icon={Target}
              hint="Best score"
              accentColor={accent}
            />
          ))}
        </div>
      </Row>

      <Row label="Without an icon">
        <div className="grid w-full gap-3 sm:grid-cols-2">
          <StatCard label="Tests taken" value={12} />
          <StatCard label="Questions answered" value={874} hint="Across 12 attempts" />
        </div>
      </Row>

      <Row label="String values" note="value takes a string when the figure has a unit">
        <div className="grid w-full gap-3 sm:grid-cols-2">
          <StatCard label="Average pace" value="1:12" icon={Clock} hint="Per question" accentColor="amber" />
          <StatCard label="Accuracy" value="78%" icon={TrendingUp} hint="Last 30 days" accentColor="emerald" />
        </div>
      </Row>

      <Row label="Long label" note="min-w-0 truncates nothing — the label wraps">
        <div className="grid w-full gap-3 sm:grid-cols-2">
          <StatCard
            label="Advanced algebra and functions"
            value={64}
            icon={Flame}
            hint="Questions in this skill"
            accentColor="violet"
          />
          <StatCard label="Streak" value={0} icon={Flame} hint="Take a test to start one" />
        </div>
      </Row>
    </div>
  );
}

export function StatCardSection() {
  return (
    <GallerySection
      id="stat-card"
      title="StatCard"
      description="Dashboard tile: label, one large figure, an optional hint and a tinted icon swatch. The value renders in mono via .tabular, so a column of tiles keeps its digits aligned. accentColor is decoration only — it carries no status meaning, so do not use emerald here to mean 'correct'."
      viewports
    >
      <StatCardSpecimens />
    </GallerySection>
  );
}
