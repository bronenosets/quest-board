export function Empty({ icon, title, hint }: { icon: string; title: string; hint?: string }) {
  return (
    <div className="text-center py-16 px-5 text-text-soft">
      <div className="text-5xl mb-3">{icon}</div>
      <div className="font-extrabold text-lg mb-1 text-text">{title}</div>
      {hint && <div className="text-sm">{hint}</div>}
    </div>
  );
}
