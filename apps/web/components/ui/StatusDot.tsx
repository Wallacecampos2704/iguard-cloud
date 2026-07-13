type StatusType = "online" | "attention" | "offline" | "neutral";

interface StatusDotProps {
  status: StatusType;
  pulse?: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const statusColors: Record<StatusType, string> = {
  online: "bg-success",
  attention: "bg-warning",
  offline: "bg-danger",
  neutral: "bg-muted",
};

const sizeStyles = {
  sm: "h-2 w-2",
  md: "h-2.5 w-2.5",
  lg: "h-3 w-3",
};

export function StatusDot({
  status,
  pulse = false,
  size = "md",
  className = "",
}: StatusDotProps) {
  return (
    <span className={`relative inline-flex ${className}`}>
      {pulse && (
        <span
          className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-40 ${statusColors[status]}`}
        />
      )}
      <span
        className={`relative inline-flex rounded-full ${sizeStyles[size]} ${statusColors[status]}`}
      />
    </span>
  );
}
