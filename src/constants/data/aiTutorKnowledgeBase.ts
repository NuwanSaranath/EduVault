export interface AiTutorEntry {
  keywords: string[];
  explanation: string;
  sinhalaExplanation: string;
  examples: string[];
  relatedQuestionIds: string[];
}

export const aiTutorKnowledgeBase: AiTutorEntry[] = [
  {
    keywords: ["newton", "newton's law", 'force', 'motion'],
    explanation:
      "Newton's Laws of Motion describe how objects move. The First Law says an object stays at rest or moves at constant velocity unless a force acts on it. The Second Law says force equals mass times acceleration (F = ma). The Third Law says every action has an equal and opposite reaction.",
    sinhalaExplanation:
      'නිව්ටන්ගේ ගමන් නියම තුනකින් වස්තූන් ගමන් කරන ආකාරය විස්තර කරයි. පළමු නියමය: බලයක් ක්‍රියා නොකරන තාක් වස්තුවක් විරාමයේ හෝ ස්ථාවර ප්‍රවේගයෙන් පවතී. දෙවන නියමය: F = ma. තෙවන නියමය: සෑම ක්‍රියාවකටම සමාන හා විරුද්ධ ප්‍රතික්‍රියාවක් ඇත.',
    examples: [
      'A ball rolling on a frictionless floor keeps moving forever — First Law.',
      'Pushing a shopping trolley harder makes it accelerate faster — Second Law.',
      'A rocket expels gas downward and is pushed upward — Third Law.',
    ],
    relatedQuestionIds: ['q-physics-2'],
  },
  {
    keywords: ['kinematics', 'suvat', 'velocity', 'acceleration'],
    explanation:
      'Kinematics equations (suvat) relate initial velocity (u), final velocity (v), acceleration (a), displacement (s) and time (t) for uniformly accelerated motion.',
    sinhalaExplanation:
      'ගමන් සමීකරණ (suvat) ආරම්භක ප්‍රවේගය, අවසාන ප්‍රවේගය, ත්වරණය, විස්ථාපනය සහ කාලය අතර සම්බන්ධතාවය දක්වයි.',
    examples: ['v = u + at', 's = ut + ½at²', 'v² = u² + 2as'],
    relatedQuestionIds: ['q-physics-1'],
  },
  {
    keywords: ['photosynthesis', 'chlorophyll', 'leaf'],
    explanation:
      'Photosynthesis is the process by which plants convert light energy into chemical energy, producing glucose and oxygen from carbon dioxide and water using chlorophyll in the leaves.',
    sinhalaExplanation:
      'ප්‍රභාසංස්ලේෂණය යනු ශාක ක්ලෝරෆිල් උපයෝගී කරගෙන ආලෝක ශක්තිය රසායනික ශක්තිය බවට පරිවර්තනය කරන ක්‍රියාවලියයි.',
    examples: ['6CO₂ + 6H₂O + light → C₆H₁₂O₆ + 6O₂'],
    relatedQuestionIds: ['q-biology-4'],
  },
  {
    keywords: ['ionic bond', 'covalent', 'chemical bond'],
    explanation:
      'Chemical bonds hold atoms together. Ionic bonds form via electron transfer between metals and non-metals; covalent bonds form via electron sharing, typically between non-metals.',
    sinhalaExplanation:
      'රසායනික බන්ධන පරමාණු එකට තබා ගනී. අයනික බන්ධන ලෝහ සහ අලෝහ අතර ඉලෙක්ට්‍රෝන හුවමාරුවෙන් සිදුවේ.',
    examples: ['NaCl forms via ionic bonding', 'H₂O forms via covalent bonding'],
    relatedQuestionIds: ['q-chemistry-2'],
  },
  {
    keywords: ['demand', 'supply', 'market'],
    explanation:
      'The law of demand states that as price rises, quantity demanded falls, all else equal. The law of supply states that as price rises, quantity supplied rises.',
    sinhalaExplanation:
      'ඉල්ලුම් නියමය: මිල ඉහළ යාමේදී ඉල්ලුම් කරන ප්‍රමාණය අඩු වේ. සැපයුම් නියමය: මිල ඉහළ යාමේදී සැපයුම් ප්‍රමාණය වැඩි වේ.',
    examples: ['Equilibrium price occurs where the demand and supply curves intersect'],
    relatedQuestionIds: ['q-economics-1'],
  },
];

export function findAiTutorEntry(query: string): AiTutorEntry | undefined {
  const normalized = query.toLowerCase();
  return aiTutorKnowledgeBase.find((entry) =>
    entry.keywords.some((keyword) => normalized.includes(keyword.toLowerCase())),
  );
}
