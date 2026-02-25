'use client';

interface SmoothScrollLinkProps {
  href: string;
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

export default function SmoothScrollLink({ href, children, className, style }: SmoothScrollLinkProps) {
  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    const targetId = href.replace('#', '');
    const element = document.getElementById(targetId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <a 
      href={href}
      onClick={handleClick}
      className={className}
      style={style}
    >
      {children}
    </a>
  );
}
