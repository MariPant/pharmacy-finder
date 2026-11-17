import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { LanguageProvider } from '../i18n/LanguageProvider';
import type { Language } from '../i18n/translations';
import { makePharmacy } from '../test/fixtures';
import type { Pharmacy } from '../types/pharmacy';
import { PharmacyCard } from './PharmacyCard';

function renderCard(pharmacy: Pharmacy, language: Language = 'en') {
  const onShowOnMap = vi.fn();
  render(
    <LanguageProvider language={language}>
      <PharmacyCard pharmacy={pharmacy} isSelected={false} onShowOnMap={onShowOnMap} />
    </LanguageProvider>,
  );
  return { onShowOnMap };
}

describe('PharmacyCard', () => {
  it('shows name, address, distance and coordinates', () => {
    renderCard(makePharmacy({ distanceMeters: 1_234 }));
    expect(screen.getByRole('heading', { name: 'Test Pharmacy' })).toBeInTheDocument();
    expect(screen.getByText('Testikatu 1, 15100 Lahti')).toBeInTheDocument();
    expect(screen.getByText('1.2 km')).toBeInTheDocument();
    expect(screen.getByText('60.98000, 25.66000')).toBeInTheDocument();
  });

  it('falls back to translated placeholders when OSM has no name or address', () => {
    renderCard(makePharmacy({ name: null, address: null }), 'fi');
    expect(screen.getByRole('heading', { name: 'Nimetön apteekki' })).toBeInTheDocument();
    expect(screen.getByText('Osoite ei saatavilla')).toBeInTheDocument();
  });

  it('links to Apple Maps and Google Maps directions', () => {
    renderCard(makePharmacy());
    expect(screen.getByRole('link', { name: /Apple Maps/ })).toHaveAttribute(
      'href',
      'https://maps.apple.com/?daddr=60.98%2C25.66',
    );
    expect(screen.getByRole('link', { name: /Google Maps/ })).toHaveAttribute(
      'href',
      'https://www.google.com/maps/dir/?api=1&destination=60.98%2C25.66',
    );
  });

  it('asks to show the pharmacy on the map', () => {
    const { onShowOnMap } = renderCard(makePharmacy({ id: 'node/42' }));
    fireEvent.click(screen.getByRole('button', { name: 'Show on map' }));
    expect(onShowOnMap).toHaveBeenCalledWith('node/42');
  });
});
