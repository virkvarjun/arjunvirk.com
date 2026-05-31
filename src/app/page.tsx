"use client";

import { Mail } from "lucide-react";
import { landing, profile } from "@/lib/data";

function GithubIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0 1 12 6.844a9.59 9.59 0 0 1 2.504.337c1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.02 10.02 0 0 0 22 12.017C22 6.484 17.522 2 12 2z" />
    </svg>
  );
}

function LinkedinIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
    </svg>
  );
}

function XIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M18.901 1.153h3.68l-8.04 9.19L24 22.846h-7.406l-5.8-7.584-6.638 7.584H.474l8.6-9.83L0 1.154h7.594l5.243 6.932ZM17.61 20.644h2.039L6.486 3.24H4.298Z" />
    </svg>
  );
}

export default function Home() {
  return (
    <main className="w-full max-w-5xl mx-auto px-5 sm:px-8 md:px-10 py-12 sm:py-16 md:py-24">
      <div className="flex flex-col-reverse gap-8 sm:gap-10 md:flex-row md:items-start md:justify-between md:gap-12">
        <div className="w-full md:max-w-xl">
          <h1 className="font-[family-name:var(--font-display)] text-2xl sm:text-3xl md:text-4xl font-normal tracking-tight">
            {profile.name}
          </h1>

          <ul className="mt-5 sm:mt-6 max-w-md space-y-1.5 text-sm sm:text-base leading-snug text-[var(--foreground)] list-disc pl-5 marker:text-[var(--muted)]">
            {landing.bullets.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>

          <nav className="mt-7 sm:mt-9 flex items-center gap-5 text-[var(--muted)]">
            <a
              href={profile.socials.twitter}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="X (@virkvarjun)"
              className="hover:text-[var(--foreground)] transition-colors"
            >
              <XIcon size={18} />
            </a>
            <a
              href={profile.socials.github}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="GitHub (@virkvarjun)"
              className="hover:text-[var(--foreground)] transition-colors"
            >
              <GithubIcon size={20} />
            </a>
            <a
              href={profile.socials.linkedin}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="LinkedIn (@virkvarjun)"
              className="hover:text-[var(--foreground)] transition-colors"
            >
              <LinkedinIcon size={20} />
            </a>
            <a
              href={`mailto:${profile.socials.email}`}
              aria-label={`Mail (${profile.socials.email})`}
              className="hover:text-[var(--foreground)] transition-colors"
            >
              <Mail size={20} />
            </a>
          </nav>
        </div>

        <div className="shrink-0 self-center md:self-auto">
          <div className="relative h-52 w-40 sm:h-64 sm:w-52 overflow-hidden rounded-2xl bg-[var(--card)] ring-1 ring-[var(--border)]">
            <img
              src="/arjun_photo.png"
              alt={profile.name}
              className="absolute inset-0 h-full w-full object-cover"
            />
          </div>
        </div>
      </div>
    </main>
  );
}
