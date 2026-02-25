'use client';

import { useState } from 'react';
import { PLATFORM_CONFIGS } from '@/lib/bookmarklet-generator';

export default function BookmarkletsSection() {
  const [selectedPlatform, setSelectedPlatform] = useState('universal');

  return (
    <div className="landing-bookmarklets-grid">
      {Object.entries(PLATFORM_CONFIGS).map(([key, config]) => (
        <div
          key={key}
          className={`landing-bookmarklet-card ${selectedPlatform === key ? 'is-selected' : ''}`}
          onClick={() => setSelectedPlatform(key)}
        >
          <h3>{config.name}</h3>

          <p>{config.description}</p>

          <div className="landing-bookmarklet-badges">
            {config.supportsThinking && (
              <span className="landing-bookmarklet-chip">
                Thinking
              </span>
            )}
            <span className="landing-bookmarklet-chip is-accent">
              {config.extractionStrategy}
            </span>
          </div>

          <button className={`landing-bookmarklet-select ${selectedPlatform === key ? 'is-selected' : ''}`}>
            {selectedPlatform === key ? 'Selected' : 'Select'}
          </button>
        </div>
      ))}
    </div>
  );
}
