import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage } from "@/components/legal-page";
import { pageMetadata } from "@/lib/site";

/**
 * `/privacy` — T3.8 replaces the placeholder.
 *
 * **The source is `docs/analytics-events.md`**, which was written in T2.3 to be
 * exactly this page's source, plus the two third parties the app actually calls
 * (Cloudinary for question images, Resend for the password-reset email) and the
 * one cookie the app mints itself.
 *
 * Four things here were confirmed rather than assumed, because inventing any of
 * them would have been writing policy rather than describing code:
 *
 * - **Retention.** Nothing prunes `AnalyticsEvent` or `AnalyticsSession` today.
 *   The page says so. It does not name a window, because a window stated here
 *   with no job behind it is a promise the code breaks the day it is written;
 *   when a window is set, the number in the sweeper and the number here are the
 *   same one.
 * - **Deletion.** There is no self-serve delete and no export in `src/`. The
 *   page describes the request route that exists instead of promising a
 *   timescale nothing enforces.
 * - **Who runs this.** No entity is named anywhere in the repo, so the page
 *   says "the operator of this site" rather than inventing one.
 * - **Where requests go.** `/contact`, which T3.8 also rewrote — a privacy
 *   policy pointing at a placeholder answers nobody.
 *
 * Everything in here is a statement about code that exists. Where a reader might
 * expect a commitment and there is none, the page says there is none.
 */

export const metadata: Metadata = pageMetadata({
  title: "Privacy",
  description:
    "What this platform stores about an account and an attempt, the one cookie it sets, the two services it sends data to, and what it deliberately does not collect.",
  path: "/privacy",
});

export default function PrivacyPage() {
  return (
    <LegalPage title="Privacy">
      <p className="text-foreground">
        This platform is a practice tool, not an advertising business. There is no
        third-party analytics script anywhere in it — no pixel, no tag manager, no session
        recorder — and nothing here is sold, rented or shared with advertisers. What follows
        is a description of what the code actually stores.
      </p>

      <Heading>What is stored about your account</Heading>
      <p>
        If you create one: your email address, your name if you enter one, and a hashed
        password. The password itself is never stored and cannot be recovered from the hash —
        a reset replaces it. You can take a practice test without an account at all, in which
        case none of this exists.
      </p>

      <Heading>What is stored about an attempt</Heading>
      <p>
        The questions you were served, the answers you gave, which options you eliminated,
        any highlights and notes you made in a passage, how long each question took, and the
        per-module counts your score is computed from. The score itself is not stored: it is
        recalculated from those counts every time a report is opened.
      </p>
      <p>
        The test interface also records when the test tab loses and regains focus and when
        full screen is entered or exited. That is there so an attempt can be understood after
        the fact — a tutor looking at why a module ran out of time — and it records the fact
        of the event and its timestamp, nothing about what else was on your screen.
      </p>
      <p>
        An attempt started without an account is bound to your browser by a signed cookie
        rather than to a person. Creating an account afterwards does not import it.
      </p>

      <Heading>What is counted as product usage</Heading>
      <p>
        A small set of events is recorded so the people running the platform can answer
        questions like &ldquo;do people who start a test finish it&rdquo;. An event is a name
        and a handful of scalar labels: which test, which module, whether the attempt was
        anonymous, whether a name was given at sign-up. It is stored in this platform&rsquo;s
        own database and goes nowhere else.
      </p>
      <p>
        Those labels are checked at the point of writing. Anything that looks like an email
        address is dropped, free text is not accepted, and values are capped in length. An
        event never contains your answers, your notes, your highlights or any account field
        beyond an internal id.
      </p>
      <p>
        Alongside the events, one row per browser records the device type derived from your
        user agent (mobile, tablet or desktop), the raw user agent string, and the width of
        your browser window when you started a test. That row is created by the first event
        you generate, so reading a page and leaving records nothing at all.
      </p>
      <p className="text-foreground">
        <strong>No IP address is recorded anywhere</strong>, in the events or beside them.
      </p>

      <Heading>Cookies</Heading>
      <p>All first-party. None of them for advertising, and none shared with anyone:</p>
      <ul className="ml-5 list-disc space-y-2">
        <li>
          Sign-in cookies, once you have an account and are logged in, so the site knows who
          you are between pages and can tell a real form submission from a forged one.
        </li>
        <li>
          An analytics session cookie holding one random identifier. It lasts 180 days,
          cannot be read by scripts on the page, and exists so that a sign-up can be
          connected to the attempt that came before it.
        </li>
        <li>
          A signed cookie for an attempt started without an account, so the attempt is still
          yours when you come back to the tab.
        </li>
      </ul>
      <p>
        Your light or dark theme preference is kept in your browser&rsquo;s local storage
        rather than in a cookie, so it is never sent to the server.
      </p>

      <Heading>Services this sends data to</Heading>
      <p>
        Two, both used for one specific job:
      </p>
      <ul className="ml-5 list-disc space-y-2">
        <li>
          <strong className="text-foreground">Resend</strong> delivers the password-reset
          email. It receives the address the email is going to and the contents of that
          email, which is a reset link. It is not used for marketing email, because there is
          no marketing email.
        </li>
        <li>
          <strong className="text-foreground">Cloudinary</strong> hosts images that appear
          inside questions — a diagram or a graph. Those are uploaded by whoever writes the
          question, never by a student, and no student data is sent there. When you load a
          question containing one, your browser fetches the image from Cloudinary and they
          therefore see that request.
        </li>
      </ul>
      <p>
        Nothing else leaves the server. The application and its database are the only places
        your answers and scores exist.
      </p>

      <Heading>How long it is kept</Heading>
      <p>
        Your account, your attempts and your answers are kept for as long as the account
        exists, because they are what your score history is.
      </p>
      <p>
        The usage events and the browser rows described above are{" "}
        <strong className="text-foreground">not deleted automatically</strong>. No retention
        window is set and no job prunes them today. This page will state a window when one is
        set, and the same number will be the one the deletion job uses — a period stated here
        and enforced nowhere would be worse than saying plainly that nothing expires yet.
      </p>

      <Heading>Getting your data removed</Heading>
      <p>
        There is no delete-my-account button and no self-serve export in the product today.
        A deletion request is handled by hand:{" "}
        <Link
          href="/contact"
          className="font-medium text-primary underline-offset-4 hover:underline"
        >
          ask on the contact page
        </Link>{" "}
        from the address the account uses. No turnaround time is promised here, because
        nothing in the software enforces one.
      </p>
      <p>
        If a tutor set up your account or added you to a group, they can see your attempts
        and scores. Removing your data removes it from what they see too.
      </p>

      <Heading>Who this is</Heading>
      <p>
        This site is operated privately and is not affiliated with, endorsed by or connected
        to the College Board. Questions about anything on this page go to{" "}
        <Link
          href="/contact"
          className="font-medium text-primary underline-offset-4 hover:underline"
        >
          the contact page
        </Link>
        .
      </p>
    </LegalPage>
  );
}

/**
 * `h2` inside `LegalPage`'s prose column. The shell renders the `h1`, so these
 * are the page's only other level and the outline stays flat and correct.
 */
function Heading({ children }: { children: React.ReactNode }) {
  return <h2 className="pt-6 text-h3 text-ink">{children}</h2>;
}
