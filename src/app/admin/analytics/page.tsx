import type { Metadata } from "next";
import Link from "next/link";
import { Activity, BarChart3, Smartphone } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Table, TBody, TD, TH, THead, TR, TableEmpty } from "@/components/ui/table";
import {
  ANALYTICS_EVENTS,
  FUNNEL_STEPS,
  type AnalyticsEventName,
} from "@/lib/analytics-events";
import {
  FUNNEL_WINDOWS,
  TEST_TAKING_CHAIN,
  computeFunnel,
  parseWindow,
  windowStart,
} from "@/lib/funnel";
import { cn } from "@/lib/utils";
import { pageMetadata } from "@/lib/site";

export const metadata: Metadata = pageMetadata({ title: "Analytics — Admin", path: "/admin/analytics", noindex: true });

/**
 * The T2.3 funnel. Deliberately one page of counts: the full analytics surface
 * is T10.1, and this exists so the pipeline is verifiable the day it lands
 * rather than three phases later.
 *
 * Server component, no client JavaScript — the window switch is four links.
 */
export default async function AnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const days = parseWindow(typeof sp.days === "string" ? sp.days : undefined);
  const since = windowStart(days);

  const [grouped, deviceRows, sessionCount] = await Promise.all([
    // One grouped count over the window — the `(name, createdAt)` index covers it.
    prisma.analyticsEvent.groupBy({
      by: ["name"],
      where: { createdAt: { gte: since } },
      _count: { _all: true },
    }),
    // "Does mobile matter": device of the sessions that actually started a test.
    prisma.analyticsSession.groupBy({
      by: ["deviceType"],
      where: {
        events: { some: { name: "attempt_started", createdAt: { gte: since } } },
      },
      _count: { _all: true },
    }),
    prisma.analyticsSession.count({ where: { createdAt: { gte: since } } }),
  ]);

  const counts: Partial<Record<AnalyticsEventName, number>> = {};
  let totalEvents = 0;
  let unknownEvents = 0;
  for (const row of grouped) {
    totalEvents += row._count._all;
    if ((ANALYTICS_EVENTS as readonly string[]).includes(row.name)) {
      counts[row.name as AnalyticsEventName] = row._count._all;
    } else {
      // A name written by a newer or older deploy. Counted, not hidden.
      unknownEvents += row._count._all;
    }
  }

  const chain = computeFunnel(TEST_TAKING_CHAIN, counts);
  const deviceTotal = deviceRows.reduce((sum, row) => sum + row._count._all, 0);
  const devices = [...deviceRows].sort((a, b) => b._count._all - a._count._all);

  return (
    <div className="container mx-auto max-w-6xl px-4 py-10">
      <PageHeader
        title="Analytics"
        description="First-party event counts. No third-party analytics and no personal data in event properties."
        actions={
          <Link
            href="/admin/analytics/items"
            className="text-caption font-semibold text-primary underline-offset-4 hover:underline"
          >
            Item analysis →
          </Link>
        }
      />

      <nav aria-label="Time window" className="mb-8 flex flex-wrap items-center gap-2">
        {FUNNEL_WINDOWS.map((option) => (
          <Link
            key={option}
            href={`/admin/analytics?days=${option}`}
            aria-current={option === days ? "page" : undefined}
            className={cn(
              "rounded-full border px-3 py-1.5 text-caption font-semibold transition-colors",
              option === days
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border text-muted-foreground hover:bg-muted",
            )}
          >
            <span className="tabular">{option}</span> days
          </Link>
        ))}
      </nav>

      <div className="mb-10 grid gap-4 sm:grid-cols-3">
        <StatCard
          label="Events recorded"
          value={totalEvents}
          icon={Activity}
          accentColor="blue"
        />
        <StatCard
          label="Sessions"
          value={sessionCount}
          icon={BarChart3}
          accentColor="violet"
        />
        <StatCard
          label="Test-taking sessions"
          value={deviceTotal}
          icon={Smartphone}
          accentColor="emerald"
        />
      </div>

      <section className="mb-10">
        <h2 className="text-h3 mb-4 text-foreground">Test-taking funnel</h2>
        <Table>
          <THead>
            <TR>
              <TH>Step</TH>
              <TH numeric>Events</TH>
              <TH numeric>Of started</TH>
              <TH numeric>Of previous</TH>
            </TR>
          </THead>
          <TBody>
            {chain.map((row) => (
              <TR key={row.name}>
                <TD>
                  <span className="font-medium text-foreground">{row.label}</span>
                  <span className="ml-2 text-caption text-muted-foreground">{row.name}</span>
                </TD>
                <TD numeric>
                  {row.count}
                </TD>
                <TD numeric className="text-muted-foreground">
                  {row.shareOfFirst === null ? "—" : `${row.shareOfFirst}%`}
                </TD>
                <TD numeric className="text-muted-foreground">
                  {row.shareOfPrevious === null ? "—" : `${row.shareOfPrevious}%`}
                </TD>
              </TR>
            ))}
          </TBody>
        </Table>
      </section>

      <section className="mb-10">
        <h2 className="text-h3 mb-4 text-foreground">All events</h2>
        <Table>
          <THead>
            <TR>
              <TH>Event</TH>
              <TH numeric>Count</TH>
              <TH>Status</TH>
            </TR>
          </THead>
          <TBody>
            {FUNNEL_STEPS.map((step) => (
              <TR key={step.name}>
                <TD>
                  <span className="font-medium text-foreground">{step.label}</span>
                  <span className="ml-2 text-caption text-muted-foreground">{step.name}</span>
                </TD>
                <TD numeric>
                  {(counts[step.name] ?? 0)}
                </TD>
                <TD>
                  {step.blockedBy ? (
                    // A zero here is "the feature does not exist yet", not "nobody
                    // did it". Saying so is the difference between a gap and a bug.
                    <Badge variant="muted">Awaiting {step.blockedBy}</Badge>
                  ) : (
                    <Badge variant="success">Instrumented</Badge>
                  )}
                </TD>
              </TR>
            ))}
            {unknownEvents > 0 && (
              <TR>
                <TD>
                  <span className="font-medium text-foreground">Unrecognised names</span>
                  <span className="ml-2 text-caption text-muted-foreground">
                    not in the catalogue
                  </span>
                </TD>
                <TD numeric>
                  {unknownEvents}
                </TD>
                <TD>
                  <Badge variant="warning">Check the deploy</Badge>
                </TD>
              </TR>
            )}
          </TBody>
        </Table>
      </section>

      <section>
        <h2 className="text-h3 mb-4 text-foreground">Device of test takers</h2>
        <Table>
          <THead>
            <TR>
              <TH>Device</TH>
              <TH numeric>Sessions</TH>
              <TH>Share</TH>
            </TR>
          </THead>
          <TBody>
            {devices.length === 0 ? (
              <TableEmpty
                colSpan={3}
                title="No test-taking sessions yet"
                description="Device is captured when a student starts an attempt."
              />
            ) : (
              devices.map((row) => {
                const pct = deviceTotal > 0 ? (row._count._all / deviceTotal) * 100 : 0;
                return (
                  <TR key={row.deviceType}>
                    <TD className="font-medium text-foreground">{row.deviceType}</TD>
                    <TD numeric>
                      {row._count._all}
                    </TD>
                    <TD>
                      <div className="flex items-center gap-3">
                        {/* Not a grade — this is a share of a population, so the
                            emerald/amber/red scale would read as a verdict. */}
                        <Progress
                          value={pct}
                          barClassName="bg-primary"
                          className="max-w-[12rem] flex-1"
                        />
                        <span className="tabular text-caption text-muted-foreground">
                          {Math.round(pct)}%
                        </span>
                      </div>
                    </TD>
                  </TR>
                );
              })
            )}
          </TBody>
        </Table>
      </section>
    </div>
  );
}
