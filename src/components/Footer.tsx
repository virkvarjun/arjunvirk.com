export default function Footer() {
  return (
    <footer className="py-10 mt-16 border-t border-[var(--border)]">
      <p className="text-xs text-[var(--muted)]">
        built with next.js in waterloo, {new Date().getFullYear()}
      </p>
    </footer>
  );
}
