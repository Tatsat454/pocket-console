"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button, Card, Shell, TopNav } from "@/components/ui";

export default function HostPage() {
  const [info, setInfo] = useState<{
    addresses: string[];
    port: number;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/host-info")
      .then((r) => r.json())
      .then((data) => {
        if (data.ok) setInfo({ addresses: data.addresses, port: data.port });
        else setError("Host info unavailable");
      })
      .catch(() =>
        setError(
          "Could not reach host info. Start the app with `npm run host` so LAN addresses are advertised.",
        ),
      );
  }, []);

  return (
    <Shell>
      <TopNav />
      <h1 className="font-display mb-2 text-3xl">Local-network host</h1>
      <p className="mb-6 max-w-2xl text-[var(--muted)]">
        Play without the public internet. One device hosts; everyone else joins over Wi‑Fi or a phone hotspot.
      </p>

      <Card className="mb-4 space-y-3">
        <p className="font-display text-xl">Setup checklist</p>
        <ol className="list-decimal space-y-2 pl-5">
          <li>Connect everyone to the same Wi‑Fi network or hotspot.</li>
          <li>
            On the host computer, run{" "}
            <code className="rounded bg-black/10 px-1.5 py-0.5 dark:bg-white/10">
              npm run host
            </code>
            .
          </li>
          <li>Share the host address shown below (or in the terminal banner).</li>
          <li>Friends open that address in their mobile browsers.</li>
          <li>Create a room and share the short room code.</li>
        </ol>
      </Card>

      <Card className="mb-4">
        <p className="font-display text-xl">This device</p>
        {error && <p className="mt-2 text-red-600">{error}</p>}
        {info && (
          <ul className="mt-3 space-y-2">
            {info.addresses.length === 0 && (
              <li>
                <code>http://localhost:{info.port}</code>
              </li>
            )}
            {info.addresses.map((ip) => (
              <li key={ip}>
                <code className="rounded-xl bg-black/5 px-3 py-2 text-lg dark:bg-white/10">
                  http://{ip}:{info.port}
                </code>
              </li>
            ))}
          </ul>
        )}
        {!info && !error && <p className="mt-2 text-[var(--muted)]">Detecting…</p>}
      </Card>

      <div className="flex flex-wrap gap-3">
        <Link href="/">
          <Button>Create a room from home</Button>
        </Link>
        <Link href="/nearby">
          <Button variant="secondary">See nearby players</Button>
        </Link>
      </div>
    </Shell>
  );
}
