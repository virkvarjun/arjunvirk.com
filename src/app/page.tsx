"use client";

import Link from "next/link";
import { Calendar, Mail, MapPin } from "lucide-react";
import { landing, profile, workSection } from "@/lib/data";

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

function OrcidIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 256 256" aria-hidden="true">
      <path
        fill="#A6CE39"
        d="M256 128c0 70.7-57.3 128-128 128S0 198.7 0 128 57.3 0 128 0s128 57.3 128 128z"
      />
      <g fill="#FFF">
        <path d="M86.3 186.2H70.9V79.1h15.4v107.1z" />
        <path d="M108.9 79.1h41.6c39.6 0 57 28.3 57 53.6 0 27.5-21.5 53.6-56.8 53.6h-41.8V79.1zm15.4 93.3h24.5c34.9 0 42.9-26.5 42.9-39.7 0-21.5-13.7-39.7-43.7-39.7h-23.7v79.4z" />
        <path d="M88.7 56.8c0 5.5-4.5 10.1-10.1 10.1-5.6 0-10.1-4.6-10.1-10.1 0-5.6 4.5-10.1 10.1-10.1 5.6 0 10.1 4.6 10.1 10.1z" />
      </g>
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

          <nav className="mt-6 sm:mt-7 flex items-center gap-3.5 text-[var(--muted)]">
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
            <a
              href="https://cal.com/arjun-virk/15min"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Book a 15-minute call"
              className="hover:text-[var(--foreground)] transition-colors"
            >
              <Calendar size={20} />
            </a>
            <a
              href={profile.socials.orcid}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="ORCID iD"
              className="transition-opacity hover:opacity-80"
            >
              <OrcidIcon size={20} />
            </a>
            <span className="flex items-center gap-1 text-sm">
              <MapPin size={15} strokeWidth={2} />
              SF
            </span>
          </nav>
        </div>

        <div className="shrink-0 self-center md:self-auto">
          <div className="relative h-52 w-48 sm:h-64 sm:w-64 overflow-hidden rounded-2xl bg-[var(--card)] ring-1 ring-[var(--border)]">
            <img
              src="/arjun_photo.png"
              alt={profile.name}
              className="absolute inset-0 h-full w-full object-cover"
            />
          </div>
        </div>
      </div>

      <section className="mt-10 sm:mt-12 md:mt-16">
        <h2 className="font-[family-name:var(--font-display)] text-xl sm:text-2xl font-normal tracking-tight">
          {workSection.heading}
        </h2>
        <p className="mt-1.5 text-sm text-[var(--muted)]">
          <Link
            href="/writing"
            className="underline underline-offset-2 hover:text-[var(--foreground)] transition-colors"
          >
            Short Essays
          </Link>
          {", "}
          <Link
            href="/literature-reviews"
            className="underline underline-offset-2 hover:text-[var(--foreground)] transition-colors"
          >
            Literature Reviews
          </Link>
          {"."}
        </p>

        <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-x-6 gap-y-10">
          {workSection.projects.map((project) => {
            const hasLink = Boolean(project.href) && project.href !== "#";
            const isExternal = hasLink && !project.href.startsWith("/");
            const imageClasses =
              "block aspect-[16/10] overflow-hidden rounded-lg bg-[var(--card)] ring-1 ring-[var(--border)]";
            const thumbnail = project.image ? (
              <img
                src={project.image}
                alt={project.title}
                className={`h-full w-full ${
                  project.imageContain ? "object-contain p-5" : "object-cover"
                }`}
                style={
                  project.imagePosition && !project.imageContain
                    ? { objectPosition: project.imagePosition }
                    : undefined
                }
              />
            ) : null;
            return (
              <article key={project.title} className="flex flex-col">
                {hasLink ? (
                  <a
                    href={project.href}
                    target={isExternal ? "_blank" : undefined}
                    rel={isExternal ? "noopener noreferrer" : undefined}
                    className={`${imageClasses} transition-opacity hover:opacity-80`}
                    aria-label={project.title}
                  >
                    {thumbnail}
                  </a>
                ) : (
                  <div className={imageClasses}>{thumbnail}</div>
                )}
                <h3 className="mt-3 text-sm leading-snug">
                  {hasLink ? (
                    <a
                      href={project.href}
                      target={isExternal ? "_blank" : undefined}
                      rel={isExternal ? "noopener noreferrer" : undefined}
                      className="font-semibold underline-offset-2 hover:underline"
                    >
                      {project.title}
                    </a>
                  ) : (
                    <span className="font-semibold">{project.title}</span>
                  )}
                </h3>
                <p className="mt-1 text-xs text-[var(--muted)]">
                  {project.date}, {project.category}
                </p>
                <p className="mt-2 text-sm leading-relaxed text-[var(--foreground)]">
                  {project.description}
                </p>
              </article>
            );
          })}
        </div>
      </section>
    </main>
  );
}
