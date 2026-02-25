'use client';

import { useState } from 'react';
import { PrivacyLevel, PRIVACY_LEVELS } from '@/lib/privacy-levels';

export default function PrivacySelector() {
  const [selectedLevel, setSelectedLevel] = useState<PrivacyLevel>(PrivacyLevel.LEVEL_1_PURE_CLIENT);

  return (
    <div className="landing-privacy-grid">
      {Object.values(PRIVACY_LEVELS).map((level) => (
        <div
          key={level.level}
          className={`landing-privacy-card ${selectedLevel === level.level ? 'is-selected' : ''}`}
          onClick={() => setSelectedLevel(level.level)}
        >
          <div className="landing-privacy-head">
            <h3>{level.name}</h3>
            <span className="landing-level-chip">
              Level {level.level}
            </span>
          </div>

          <p>{level.description}</p>

          <div className={`landing-performance-chip ${level.recommended ? 'is-recommended' : ''}`}>
            {level.performanceGain}
          </div>

          {level.recommended && (
            <div className="landing-recommended-text">Recommended</div>
          )}
        </div>
      ))}
    </div>
  );
}
