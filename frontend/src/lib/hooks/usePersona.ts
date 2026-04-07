"use client";
import { useState, useEffect, useCallback } from 'react';

interface Persona {
  id: string;
  name: string;
  description: string;
  systemPrompt: string;
}

interface UsePersonaReturn {
  persona: Persona | null;
  setPersona: (persona: Persona | null) => void;
  availablePersonas: Persona[];
  loadPersonas: () => Promise<void>;
}

export function usePersona(): UsePersonaReturn {
  const [persona, setPersona] = useState<Persona | null>(null);
  const [availablePersonas, setAvailablePersonas] = useState<Persona[]>([]);
  const [loading, setLoading] = useState(true);

  // Load available personas (in a real app, this would come from an API)
  const loadPersonas = useCallback(async () => {
    setLoading(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 500));
      const mockPersonas: Persona[] = [
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
      setAvailablePersonas(mockPersonas);
    } catch (error) {
      console.error('Failed to load personas:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Set persona and store in localStorage for persistence
  const setPersonaAndStore = useCallback((persona: Persona | null) => {
    setPersona(persona);
    if (persona) {
      localStorage.setItem('selectedPersona', JSON.stringify(persona));
    } else {
      localStorage.removeItem('selectedPersona');
    }
  }, []);

  // Load initial state from localStorage
  useEffect(() => {
    const loadInitialState = async () => {
      await loadPersonas();
      const storedPersona = localStorage.getItem('selectedPersona');
      if (storedPersona) {
        try {
          const parsed = JSON.parse(storedPersona);
          setPersona(parsed);
        } catch (error) {
          console.error('Failed to parse stored persona:', error);
          setPersona(null);
        }
      }
    };
    loadInitialState();
  }, [loadPersonas]);

  return {
    persona,
    setPersona: setPersonaAndStore,
    availablePersonas,
    loadPersonas,
  };
}