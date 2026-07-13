interface CardProps {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
}

export function Card({ children, className = "", hover = false }: CardProps) {
  return (
    <div
      className={`rounded-2xl border border-border bg-surface p-6 ${
        hover ? "transition-all duration-200 hover:border-accent/30 hover:bg-surface-elevated" : ""
      } ${className}`}
    >
      {children}
    </div>
  );
}
