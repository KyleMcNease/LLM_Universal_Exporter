'use client';

interface NavigationLinkProps {
  href: string;
  children: React.ReactNode;
  className?: string;
}

export default function NavigationLink({ href, children, className }: NavigationLinkProps) {
  const handleClick = (e: React.MouseEvent) => {
    if (href.startsWith('#')) {
      e.preventDefault();
      const targetId = href.replace('#', '');
      const element = document.getElementById(targetId);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
      }
    }
  };

  return (
    <a 
      href={href}
      onClick={handleClick}
      className={className || 'landing-nav-link'}
    >
      {children}
    </a>
  );
}
