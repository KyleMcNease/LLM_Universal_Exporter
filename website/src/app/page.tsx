import Link from 'next/link';
import { Suspense } from 'react';
import BookmarkletsSection from '@/components/BookmarkletsSection';
import PrivacySelector from '@/components/PrivacySelector';
import Footer from '@/components/Footer';
import { FreePricingButton, ProPricingButton, EnterprisePricingButton } from '@/components/PricingButtons';
import NavigationLink from '@/components/NavigationLink';
import SmoothScrollLink from '@/components/SmoothScrollLink';

export default function HomePage() {
  const featureCards = [
    {
      title: 'Universal Platform Support',
      body: 'Works with Claude, ChatGPT, Gemini, Perplexity, and more.',
      highlight: true
    },
    {
      title: 'Thinking Block Preservation',
      body: 'Captures hidden AI reasoning processes automatically.',
      highlight: true
    },
    {
      title: 'Multiple Export Formats',
      body: 'PDF, Markdown, JSON, CSV, and HTML preservation.'
    },
    {
      title: 'Privacy-First Architecture',
      body: 'All processing happens locally. Zero data transmission.'
    },
    {
      title: 'Research-Grade Analytics',
      body: 'Advanced conversation analysis and pattern recognition.'
    },
    {
      title: 'Mobile Integration',
      body: 'Process shared conversation links from mobile apps.',
      comingSoon: true
    }
  ];

  return (
    <div className="landing-shell min-h-screen">
      <header className="landing-header">
        <div className="landing-logo">Universal AI Exporter</div>
        <nav className="landing-nav">
          <NavigationLink href="#features">
            Features
          </NavigationLink>
          <NavigationLink href="#pricing">
            Pricing
          </NavigationLink>
          <Link href="/app" className="landing-btn landing-btn-primary">
            Install Free
          </Link>
        </nav>
      </header>

      <section className="landing-section landing-hero">
        <div className="landing-center">
          <h1 className="landing-title">
            Export your AI conversations
            <span className="landing-highlight"> with advanced analytics.</span>
          </h1>

          <p className="landing-subtitle">
            Privacy-first architecture with thinking block preservation across all major AI platforms.
          </p>

          <div className="landing-actions">
            <Link href="/app" className="landing-btn landing-btn-primary">
              Install Free Extension
            </Link>
            <SmoothScrollLink href="#features" className="landing-btn landing-btn-secondary">
              Explore Features
            </SmoothScrollLink>
          </div>
        </div>
      </section>

      <section id="privacy" className="landing-section">
        <div className="landing-center landing-block-header">
          <h2 className="landing-h2">
            Privacy-First Architecture
          </h2>
          <p className="landing-body">
            Choose your privacy level. All processing happens locally.
          </p>
        </div>

        <Suspense fallback={<div className="landing-fallback landing-fallback-short" />}>
          <PrivacySelector />
        </Suspense>
      </section>

      <section id="bookmarklets" className="landing-section">
        <div className="landing-center landing-block-header">
          <h2 className="landing-h2">
            Enhanced Bookmarklets
          </h2>
          <p className="landing-body">
            One-click export for all major AI platforms.
          </p>
        </div>

        <Suspense fallback={<div className="landing-fallback landing-fallback-tall" />}>
          <BookmarkletsSection />
        </Suspense>
      </section>

      <section id="features" className="landing-section">
        <div className="landing-center landing-block-header">
          <h2 className="landing-h2">
            Advanced capabilities that set us apart
          </h2>
        </div>

        <div className="landing-features-grid">
          {featureCards.map((card) => (
            <div
              key={card.title}
              className={[
                'landing-feature-card',
                card.highlight ? 'is-highlight' : '',
                card.comingSoon ? 'is-coming-soon' : ''
              ].filter(Boolean).join(' ')}
            >
              {card.comingSoon && <div className="landing-pill">Coming Soon</div>}
              <h3>{card.title}</h3>
              <p>{card.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="pricing" className="landing-section">
        <div className="landing-center landing-block-header">
          <h2 className="landing-h2">
            Simple, transparent pricing
          </h2>
        </div>

        <div className="landing-pricing-grid">
          <div className="landing-pricing-card">
            <h3>Free</h3>
            <div className="price">$0</div>
            <div className="period">forever</div>
            <FreePricingButton />
          </div>

          <div className="landing-pricing-card featured">
            <div className="landing-pill">Most Popular</div>
            <h3>Pro</h3>
            <div className="price">$4.99</div>
            <div className="period">per month</div>
            <ProPricingButton />
          </div>

          <div className="landing-pricing-card">
            <h3>Enterprise</h3>
            <div className="price">Custom</div>
            <div className="period">tailored solutions</div>
            <EnterprisePricingButton />
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}

export const metadata = {
  title: 'Universal AI Exporter - Zero-Knowledge Privacy Architecture',
  description: 'Export conversations from Claude, ChatGPT, Perplexity and 8+ AI platforms. Revolutionary zero-knowledge edge processing with enhanced bookmarklets and PWA support.',
};
