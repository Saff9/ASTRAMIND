import { PersonaSelector } from '../../components/ui/PersonaSelector';
import { usePersona } from '../../lib/hooks/usePersona';

export default function SettingsPage() {
  const { persona, setPersona } = usePersona();

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <h1 className="text-2xl font-bold mb-6">Settings</h1>
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold mb-4">AI Persona</h2>
        <PersonaSelector 
          value={persona} 
          onChange={setPersona} 
        />
      </div>
    </div>
  );
}