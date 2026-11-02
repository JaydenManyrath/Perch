"use client";

import { useEffect, useState } from "react";
import { BackButton } from "@/components/ui/BackButton";
import { Button } from "@/components/ui/Button";
import { clearPilotLog, pilotEnabled, readPilotLog, setPilotEnabled, type PilotEvent } from "@/lib/pilot/navlog";

/**
 * CS 7314 usage pilot. A volunteer turns logging on here, uses Perch normally, then
 * downloads the log and sends it to the team. Only screen names and timestamps are
 * recorded, in this browser, and only while the pilot is on.
 */
export default function PilotPage() {
  const [on, setOn] = useState(false);
  const [events, setEvents] = useState<PilotEvent[]>([]);

  useEffect(() => {
    setOn(pilotEnabled());
    setEvents(readPilotLog());
  }, []);

  function toggle() {
    setPilotEnabled(!on);
    setOn(!on);
  }

  function download() {
    const blob = new Blob([JSON.stringify({ exportedAt: new Date().toISOString(), events }, null, 2)], {
      type: "application/json",
    });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `perch-pilot-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  function clear() {
    clearPilotLog();
    setEvents([]);
  }

  const sessions = new Set(events.map((e) => e.sid)).size;

  return (
    <main className="mx-auto max-w-xl px-5 py-10 flex flex-col gap-4">
      <BackButton fallbackHref="/feed" />
      <h1 className="text-h2 text-ink-strong">Usage pilot</h1>
      <p className="text-body text-ink-soft">
        Thanks for helping test Perch. While the pilot is on, this browser records which
        screen you are on and when (for example &quot;feed&quot; or &quot;map&quot;). Nothing you type,
        no messages and no account details are recorded, and nothing leaves this browser
        until you download the file and send it to us. You can turn it off or clear it at
        any time.
      </p>
      <p className="text-body text-ink-strong font-semibold">
        Pilot is {on ? "ON" : "OFF"} - {events.length} screens recorded in {sessions} session
        {sessions === 1 ? "" : "s"}.
      </p>
      <div className="flex flex-wrap gap-2">
        <Button onClick={toggle}>{on ? "Turn pilot off" : "Turn pilot on"}</Button>
        <Button variant="secondary" onClick={download} disabled={events.length === 0}>
          Download log
        </Button>
        <Button variant="ghost" onClick={clear} disabled={events.length === 0}>
          Clear log
        </Button>
      </div>
    </main>
  );
}
