export default function Button({
  icon: Icon,
  variant = "neutral",
  iconOnly = false,
  expanded = false,
  className = "",
  children,
  ...props
}) {
  const classes = [
    "btn",
    variant && `btn-${variant}`,
    iconOnly && "btn-icon",
    expanded && "is-expanded",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <button type="button" className={classes} {...props}>
      {Icon && <Icon />}
      {children}
    </button>
  );
}
