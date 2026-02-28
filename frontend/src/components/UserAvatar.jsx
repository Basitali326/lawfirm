import clsx from "clsx";

function initialsFromName(name = "") {
  const clean = (name || "").trim();
  if (!clean) return "U";
  return clean
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join("");
}

function colorClass(name = "") {
  const palette = ["bg-emerald-500", "bg-sky-500", "bg-amber-500", "bg-indigo-500", "bg-rose-500", "bg-teal-500"];
  const key = (name || "U").charCodeAt(0) || 0;
  return palette[key % palette.length];
}

export default function UserAvatar({ name, imageUrl, size = "md", className = "" }) {
  const sizes = {
    sm: "h-8 w-8 text-xs",
    md: "h-10 w-10 text-sm",
    lg: "h-12 w-12 text-base",
  };
  const sizeClass = sizes[size] || sizes.md;
  const initials = initialsFromName(name);

  if (imageUrl) {
    return (
      <img
        src={imageUrl}
        alt={name || "User"}
        className={clsx("rounded-full object-cover", sizeClass, className)}
      />
    );
  }

  return (
    <div
      className={clsx(
        "rounded-full text-white flex items-center justify-center font-semibold shrink-0",
        colorClass(name),
        sizeClass,
        className
      )}
    >
      {initials}
    </div>
  );
}

