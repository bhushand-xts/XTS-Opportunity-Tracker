import '@testing-library/jest-dom/vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, expect, it } from 'vitest';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { OpportunityRouteAlias } from './OpportunityRouteAlias';

afterEach(cleanup);
function Destination() { const location = useLocation(); return <output>{location.pathname}{location.search}{location.hash}</output>; }
it('redirects real plural menu deep links without losing query or hash', async () => {
  render(<MemoryRouter initialEntries={['/opportunities/401/details?tab=scope#saved']}><Routes><Route path="/opportunities/*" element={<OpportunityRouteAlias />} /><Route path="/opportunity/*" element={<Destination />} /></Routes></MemoryRouter>);
  expect(await screen.findByText('/opportunity/401/details?tab=scope#saved')).toBeInTheDocument();
});
