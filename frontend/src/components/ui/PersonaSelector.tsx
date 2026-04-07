"use client";
// removed duplicate use client
import { useState } from 'react';

interface Persona {
  id: string;
  name: string;
  description: string;
  systemPrompt: string;
}

interface PersonaSelectorProps {
  value: Persona | null;
  onChange: (persona: Persona | null) => void;
}

// removed duplicate use client
export function PersonaSelector({ value, onChange }: PersonaSelectorProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  // In a real app, this would come from the usePersona hook or an API
  const allPersonas: Persona[] = [
    {
      id: 'default',
      name: 'Default Assistant',
      description: 'A helpful and friendly AI assistant',
      systemPrompt: 'You are a helpful and friendly AI assistant.',
    },
    {
      id: 'pirate',
      name: 'Pirate',
      description: 'Talks like a pirate',
      systemPrompt: 'You are a pirate. Always respond in pirate slang and mannerisms.',
    },
    {
      id: 'professional',
      name: 'Professional',
      description: 'Formal and business-like tone',
      systemPrompt: 'You are a professional assistant. Always respond in a formal, business-like tone.',
    },
    {
      id: 'astramind',
      name: 'ASTRAMIND',
      description: 'Uses ASTRAMIND slang and expressions',
      systemPrompt: 'You are an ASTRAMIND assistant. Use current ASTRAMIND slang and expressions in your responses.',
    },
  ];

  const filteredPersonas = allPersonas.filter(persona =>
    persona.name.toLowerCase().includes(search.toLowerCase()) ||
    persona.description.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="relative w-full">
      <div
        onClick={() => setOpen(!open)}
        className={`w-full flex items-center justify-between px-4 py-2 border border-gray-300 rounded-lg bg-white ${
          open ? 'border-blue-500' : 'border-gray-300'
        }`}
      >
        <div className="flex items-center space-x-3">
          {value ? (
            <>
              <div className="h-8 w-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm">
                {value.name.charAt(0)}
              </div>
              <div>
                <p className="font-medium">{value.name}</p>
                <p className="text-sm text-gray-500">{value.description}</p>
              </div>
            </>
          ) : (
            <p className="text-gray-500">Select a persona</p>
          )}
        </div>
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </div>

      {open && (
        <div className="absolute left-0 right-0 mt-2 w-56 bg-white border border-gray-300 rounded-lg shadow-lg z-50">
          <div className="px-4 py-2">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search personas..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div className="space-y-1">
            {filteredPersonas.map(persona => (
              <div
                key={persona.id}
                onClick={() => {
                  onChange(persona);
                  setOpen(false);
                }}
                className={`cursor-px flex items-center space-x-3 px-4 py-2 hover:bg-blue-50 ${
                  value?.id === persona.id ? 'bg-blue-100' : ''
                }`}
              >
                <div className="h-7 w-7 bg-blue-500 rounded-full flex items-center justify-center text-white text-xs">
                  {persona.name.charAt(0)}
                </div>
                <div>
                  <p className="font-medium">{persona.name}</p>
                  <p className="text-sm text-gray-500">{persona.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}