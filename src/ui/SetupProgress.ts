export function setupProgress(current: 1 | 2 | 3 | 4): string {
  return `<ol class="setup-progress" aria-label="Run setup">${['AVATAR', 'LOCATION', 'ISSUE', 'PURSUER'].map((label, index) => `<li class="${index + 1 === current ? 'current' : index + 1 < current ? 'complete' : ''}"${index + 1 === current ? ' aria-current="step"' : ''}><span>${index + 1 < current ? '✓' : index + 1}</span>${label}</li>`).join('')}</ol>`;
}
