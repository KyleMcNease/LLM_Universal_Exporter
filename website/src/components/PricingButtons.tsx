'use client';

interface PricingButtonBaseProps {
  children: React.ReactNode;
  onClick: () => void;
}

function PricingButtonBase({ children, onClick }: PricingButtonBaseProps) {
  return (
    <button onClick={onClick} className="landing-price-btn">
      {children}
    </button>
  );
}

export function FreePricingButton() {
  return (
    <PricingButtonBase
      onClick={() => window.open('/app', '_blank')}
    >
      Get Started Free
    </PricingButtonBase>
  );
}

export function ProPricingButton() {
  return (
    <PricingButtonBase
      onClick={() => {
        // Simulate Stripe checkout
        alert('Redirecting to secure checkout...\n\nThis would integrate with Stripe for $4.99/month Pro subscription.');
        // In production: window.location.href = 'https://checkout.stripe.com/...'
      }}
    >
      Upgrade Now
    </PricingButtonBase>
  );
}

export function EnterprisePricingButton() {
  return (
    <PricingButtonBase
      onClick={() => {
        window.location.href = 'mailto:enterprise@universalaiexporter.com?subject=Enterprise%20Inquiry&body=Hello%2C%0A%0AI%27m%20interested%20in%20learning%20more%20about%20your%20Enterprise%20plan.%20Please%20contact%20me%20to%20discuss%20pricing%20and%20features.%0A%0AThank%20you%21';
      }}
    >
      Contact Us
    </PricingButtonBase>
  );
}
