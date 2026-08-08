import type { Metadata } from "next";
import Link from "next/link";
import { ArticlePage, ArticleSection } from "@/components/marketing/article-page";
import { Button } from "@/components/ui/button";
import { TUTOR_FEATURES } from "@/lib/tutor-features";
import { pageMetadata } from "@/lib/site";

/**
 * `/for-tutors` — where the landing page's navy band lands (T3.8).
 *
 * The band is six lines; this is the page that answers the questions those six
 * lines raise. It is written for somebody deciding whether to run their students
 * through this rather than through a worksheet, so it says what the admin side
 * does, how an account is obtained, and — at equal length — what it does not do.
 *
 * **The "what this does not do" section is not modesty, it is the point.** A
 * tutor who signs up expecting a billing system or a parent portal has been
 * mis-sold, and finding out in week two costs more than not signing up. Every
 * absence listed is checked: there is no billing code anywhere in `src/`, no
 * per-student licence model, no LMS integration, and no essay to grade — the
 * Digital SAT has no essay.
 *
 * `TUTOR_FEATURES` is shared with the band, so the two cannot drift.
 */

export const metadata: Metadata = pageMetadata({
  title: "For tutors",
  description:
    "The admin side of this platform: a question bank you write, tests you assemble from it, student groups, assignment, per-attempt review, CSV export and bulk JSON import.",
  path: "/for-tutors",
  og: { title: "Run your students on your own question bank", eyebrow: "For tutors" },
});

export default function ForTutorsPage() {
  return (
    <ArticlePage
      eyebrow="For tutors"
      title="Run your students on your own question bank"
      lede={
        <>
          Everything a student sits here is something somebody assembled first. A tutor
          account gives you the side of the platform that does the assembling: the bank, the
          test builder, the groups, and every attempt in full detail.
        </>
      }
    >
      <ArticleSection title="What you get">
        <p>
          Seven things, and each of them is a screen that exists rather than a plan:
        </p>
      </ArticleSection>

      <ol className="mt-6 space-y-4">
        {TUTOR_FEATURES.map((feature, index) => (
          <li
            key={feature.id}
            className="rounded-2xl border border-border/60 bg-card p-6 shadow-card"
          >
            <div className="flex items-baseline gap-3">
              <span className="text-caption tabular font-bold text-primary">
                {index + 1}
              </span>
              {/* `h3`: these sit under the "What you get" `h2` above. */}
              <h3 className="text-h3 text-ink">{feature.title}</h3>
            </div>
            <p className="mt-2 max-w-[62ch] text-body text-muted-foreground">
              {feature.description}
            </p>
          </li>
        ))}
      </ol>

      <ArticleSection id="workflow" title="How it fits a week of teaching">
        <p>
          The shortest useful loop is three steps. Assemble a test out of the bank — a full
          length one, or a single module on the one domain a student keeps losing marks in.
          Assign it to the group. Then, once they have sat it, open the attempts and read
          what actually happened: which questions were missed, which options were eliminated
          before the wrong one was chosen, how long each question took, and whether the last
          five were rushed.
        </p>
        <p>
          That last part is the reason the per-question timing is recorded at all. A student
          who gets twelve questions wrong because they spent nine minutes on question three
          has a pacing problem, not a content problem, and the two are fixed by completely
          different lessons.
        </p>
        <p>
          Scores are never stored — only the raw counts per module — so every scaled number
          you see on a student&rsquo;s history was recomputed from those counts when you
          opened the page. Old attempts and new ones are always converted by the same rule,
          which is what makes a progress line worth reading.{" "}
          <Link
            href="/scoring"
            className="font-medium text-primary underline-offset-4 hover:underline"
          >
            The scoring policy
          </Link>{" "}
          is published in full, tables included.
        </p>
      </ArticleSection>

      <ArticleSection id="not" title="What it does not do">
        <p>
          Worth knowing before you invest a weekend in building a bank:
        </p>
        <ul className="space-y-2">
          <Bullet>
            <strong className="text-foreground">No billing, and no per-student
            licences.</strong> There is no payment code in the platform at all, in either
            direction — it does not charge you and it cannot charge your students for you.
          </Bullet>
          <Bullet>
            <strong className="text-foreground">No parent accounts and no parent
            reporting.</strong> A student and a tutor are the only two roles.
          </Bullet>
          <Bullet>
            <strong className="text-foreground">No integration with a school LMS.</strong>{" "}
            The way data leaves is the CSV export.
          </Bullet>
          <Bullet>
            <strong className="text-foreground">Nothing is written for you.</strong> The
            question bank is questions somebody typed, tagged and explained. Importing a JSON
            file is faster than the form, but it is still your content going in.
          </Bullet>
          <Bullet>
            <strong className="text-foreground">Students sign themselves up.</strong> There is
            no roster invite flow; you add an existing account to a group.
          </Bullet>
        </ul>
      </ArticleSection>

      <ArticleSection id="access" title="Getting an account">
        <p>
          Tutor accounts are set up by hand rather than through the sign-up form, because the
          admin side can edit the question bank every student on the platform sees. Get in
          touch and say roughly how many students you teach and whether you want to bring
          your own questions; that is the whole of what is needed to set one up.
        </p>
        <p>
          If you would rather look before you ask, the student side is open — sit a full
          timed test and read the score report it produces. That is what your students will
          see, and it needs no account either.
        </p>
      </ArticleSection>

      <div className="mt-8 flex flex-wrap gap-3">
        <Button asChild size="lg">
          <Link href="/contact">Ask about a tutor account</Link>
        </Button>
        <Button asChild size="lg" variant="secondary">
          <Link href="/practice">See the student side</Link>
        </Button>
      </div>
    </ArticlePage>
  );
}

function Bullet({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex gap-3">
      <span className="mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" aria-hidden />
      <span>{children}</span>
    </li>
  );
}
