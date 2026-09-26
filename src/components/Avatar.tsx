// Discord avatar, or the first letter of the name on a tinted disc.
export default function Avatar({ src, name, size = 28 }: { src: string | null; name: string; size?: number }) {
  if (src) return <img className="avatar" src={src} alt="" width={size} height={size} />;
  const hue = [...name].reduce((h, c) => (h * 31 + c.charCodeAt(0)) % 360, 7);
  return (
    <span className="avatar initials" style={{ width: size, height: size, background: `hsl(${hue} 45% 32%)`, fontSize: size * 0.42 }} aria-hidden>
      {name.slice(0, 1).toUpperCase()}
    </span>
  );
}
