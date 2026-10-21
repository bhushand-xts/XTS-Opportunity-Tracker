import { useMemo } from 'react';
import { Country, State, City } from 'country-state-city';
import type { ClientDraft } from '@xts/api-contracts';
import { Choice, Field } from './ui';

type Location = Pick<ClientDraft, 'country' | 'stateProvince' | 'city'>;
const countries = Country.getAllCountries();

function choices(names: string[], saved: string) {
  return [...new Set([...names, ...(saved ? [saved] : [])])].map(name => ({ id: name, label: name }));
}

export function LocationFields({ value, onChange }: { value: Location; onChange: (patch: Partial<Location>) => void }) {
  const country = countries.find(item => item.name === value.country);
  const states = useMemo(() => country ? State.getStatesOfCountry(country.isoCode) : [], [country]);
  const state = states.find(item => item.name === value.stateProvince);
  const cities = useMemo(() => {
    if (!country) return [];
    if (state) return City.getCitiesOfState(country.isoCode, state.isoCode) ?? [];
    return states.length === 0 ? City.getCitiesOfCountry(country.isoCode) ?? [] : [];
  }, [country, state, states]);

  function changeCountry(next: string) {
    if (next !== value.country) onChange({ country: next, stateProvince: '', city: '' });
  }
  function changeState(next: string) {
    if (next !== value.stateProvince) onChange({ stateProvince: next, city: '' });
  }

  return <>
    <Choice searchable required label="Country" value={value.country} options={choices(countries.map(item => item.name), value.country)} onChange={changeCountry} />
    {!value.country || states.length > 0
      ? <Choice searchable required label="State / province" value={value.stateProvince} options={choices(states.map(item => item.name), value.stateProvince)} disabled={!value.country} onChange={changeState} />
      : <Field required label="State / province" value={value.stateProvince} onChange={changeState} />}
    {!value.country || !value.stateProvince || cities.length > 0
      ? <Choice searchable required label="City" value={value.city} options={choices(cities.map(item => item.name), value.city)} disabled={!value.country || !value.stateProvince} onChange={city => onChange({ city })} />
      : <Field required label="City" value={value.city} onChange={city => onChange({ city })} />}
  </>;
}
