import React from "react";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { AttemptState } from "@/lib/attempt-engine";

const routerPush = vi.hoisted(() => vi.fn());
const toast = vi.hoisted(() => vi.fn());
const timeUpBeep = vi.hoisted(() => vi.fn());

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: routerPush, refresh: vi.fn() }),
}));
vi.mock("@/components/toast", () => ({ useToast: () => toast }));
vi.mock("@/lib/audio-beep", () => ({ playTimeUpBeep: timeUpBeep }));
vi.mock("@/components/rich-content", () => ({
  RichContent: ({ content }: { content: string }) => <span>{content}</span>,
}));
vi.mock("@/components/annotated-passage", () => ({
  AnnotatedPassage: ({ passage }: { passage: string }) => <span>{passage}</span>,
}));
vi.mock("@/app/test/attempt/[attemptId]/connectivity-overlays", () => ({
  ConnectivityBanner: () => null,
  DuplicateTabOverlay: () => null,
  ResumingSplash: () => null,
  useNetworkStatus: () => ({ isOffline: false, justReconnected: false }),
  useTabConflictGuard: () => false,
}));

import { TestInterface } from "@/app/test/attempt/[attemptId]/test-interface";

const NOW = new Date("2026-08-06T10:00:00.000Z").getTime();

function state(overrides: Partial<AttemptState> = {}): AttemptState {
  return {
    attempt: {
      id: "attempt-1",
      testId: "test-1",
      userId: null,
      status: "IN_PROGRESS",
      startedAt: new Date(NOW),
      completedAt: null,
      currentSectionId: "section-1",
      currentModuleId: "module-1",
      currentQuestionIndex: 0,
      moduleStartedAt: new Date(NOW),
      moduleDeadlineAt: new Date(NOW + 3_600_000),
      breakStartedAt: null,
      focusEvents: null,
    },
    test: {
      id: "test-1",
      title: "SAT Smoke Test",
      description: null,
      mode: "LINEAR",
      isPublic: true,
      adaptiveThreshold: 0.6,
      scoringTable: null,
      createdById: null,
      createdAt: new Date(NOW),
      updatedAt: new Date(NOW),
    },
    section: {
      id: "section-1",
      testId: "test-1",
      type: "READING_WRITING",
      order: 1,
      module1TimeLimit: 65,
      module2TimeLimit: 65,
    },
    module: {
      id: "module-1",
      sectionId: "section-1",
      moduleNumber: 1,
      difficulty: "MIXED",
    },
    questions: [
      {
        id: "question-1",
        order: 1,
        type: "MULTIPLE_CHOICE",
        passage: null,
        stem: "Smoke-test question",
        imageUrl: null,
        imagePosition: "INLINE",
        imageMaxWidth: null,
        choices: [
          { label: "A", text: "One" },
          { label: "B", text: "Two" },
          { label: "C", text: "Three" },
          { label: "D", text: "Four" },
        ],
      },
    ],
    answers: [],
    timeLimitSeconds: 65,
    moduleStartedAt: new Date(NOW).toISOString(),
    breakStartedAt: null,
    isOnBreak: false,
    serverNow: NOW,
    moduleNumber: 1,
    totalModulesInSection: 2,
    sectionIndex: 0,
    totalSections: 2,
    ...overrides,
  };
}

function jsonResponse(body: unknown, ok = true) {
  return Promise.resolve({ ok, json: async () => body } as Response);
}

describe("TestInterface lifecycle smoke tests", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
    routerPush.mockReset();
    toast.mockReset();
    timeUpBeep.mockReset();
    vi.stubGlobal("fetch", vi.fn(() => jsonResponse({ ok: true })));
    vi.stubGlobal("alert", vi.fn());
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("renders the server-anchored timer and ticks it down", async () => {
    render(<TestInterface initialState={state()} studentName="Student" />);
    expect(screen.getByText("1:05")).toBeInTheDocument();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(5_000);
    });

    expect(screen.getByText(":60")).toBeInTheDocument();
    expect(toast).toHaveBeenCalledWith(expect.stringContaining("Less than 1 minute"), "error");
  });

  it("auto-submits after time expires and routes completed attempts to results", async () => {
    const fetchMock = vi.fn((input: RequestInfo | URL) => {
      const url = String(input);
      if (url.endsWith("/submit-module")) {
        return jsonResponse({ ok: true, status: "completed" });
      }
      return jsonResponse({ ok: true });
    });
    vi.stubGlobal("fetch", fetchMock);
    render(
      <TestInterface
        initialState={state({ timeLimitSeconds: 1 })}
        studentName="Student"
      />,
    );

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1_000);
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(2_100);
    });

    expect(timeUpBeep).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/attempts/attempt-1/submit-module",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ moduleId: "module-1" }),
      },
    );
    expect(routerPush).toHaveBeenCalledWith("/results/attempt-1");
  });

  it("waits for a pending answer save before submitting the module", async () => {
    vi.useRealTimers();
    let finishSave!: (value: Response) => void;
    const saveResponse = new Promise<Response>((resolve) => {
      finishSave = resolve;
    });
    const calls: string[] = [];
    const fetchMock = vi.fn((input: RequestInfo | URL) => {
      const url = String(input);
      if (url.endsWith("/answer")) {
        calls.push("save-started");
        return saveResponse;
      }
      if (url.endsWith("/submit-module")) {
        calls.push("submit-started");
        return jsonResponse({ ok: true, status: "completed" });
      }
      return jsonResponse({ ok: true });
    });
    vi.stubGlobal("fetch", fetchMock);
    render(<TestInterface initialState={state()} studentName="Student" />);

    fireEvent.click(screen.getByRole("button", { name: "A" }));
    fireEvent.click(screen.getByRole("button", { name: "Go to Review" }));
    fireEvent.click(screen.getByRole("button", { name: "Submit module" }));
    const submitButtons = screen.getAllByRole("button", { name: "Submit module" });
    fireEvent.click(submitButtons[submitButtons.length - 1]);

    await act(async () => Promise.resolve());
    expect(calls).toEqual(["save-started"]);

    await act(async () => {
      finishSave({ ok: true } as Response);
      await saveResponse;
    });
    await waitFor(() => expect(calls).toEqual(["save-started", "submit-started"]));
  });

  it("resumes from break and renders the next module", async () => {
    vi.useRealTimers();
    const nextState = state({
      section: { ...state().section, id: "section-2", order: 2, type: "MATH" },
      module: { ...state().module, id: "module-2", sectionId: "section-2" },
      moduleStartedAt: new Date(NOW).toISOString(),
      breakStartedAt: null,
      isOnBreak: false,
      sectionIndex: 1,
    });
    const fetchMock = vi.fn((input: RequestInfo | URL) => {
      const url = String(input);
      if (url.endsWith("/start-module")) return jsonResponse({ ok: true });
      if (url === "/api/attempts/attempt-1") {
        return jsonResponse({ ok: true, state: nextState });
      }
      return jsonResponse({ ok: true });
    });
    vi.stubGlobal("fetch", fetchMock);
    render(
      <TestInterface
        initialState={state({
          moduleStartedAt: null,
          breakStartedAt: new Date(NOW).toISOString(),
          isOnBreak: true,
        })}
        studentName="Student"
      />,
    );

    expect(screen.getByRole("heading", { name: "Practice Test Break" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Resume Testing" }));

    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });
    await waitFor(() => {
      expect(screen.getByText("Section 2, Module 1: Math")).toBeInTheDocument();
    });
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/attempts/attempt-1/start-module",
      { method: "POST" },
    );
  });
});
