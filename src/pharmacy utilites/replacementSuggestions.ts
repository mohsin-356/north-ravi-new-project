
export interface Medicine {
  id: number;
  name: string;
  genericName: string;
  manufacturer: string;
  price: number;
  quantity: number;
  category: string;
}

export const findReplacements = (
  searchedMedicine: string,
  allMedicines: Medicine[],
  limit: number = 3
): Medicine[] => {
  const searchLower = searchedMedicine.toLowerCase();
  
  // First, try to find medicines with similar generic names
  const genericMatches = allMedicines.filter(medicine => 
    medicine.genericName.toLowerCase().includes(searchLower) ||
    searchLower.includes(medicine.genericName.toLowerCase())
  );

  if (genericMatches.length > 0) {
    return genericMatches.slice(0, limit);
  }

  // If no generic matches, try category or partial name matches
  const partialMatches = allMedicines.filter(medicine =>
    medicine.name.toLowerCase().includes(searchLower) ||
    medicine.category.toLowerCase().includes(searchLower)
  );

  return partialMatches.slice(0, limit);
};

export const formatReplacementMessage = (
  searchedTerm: string,
  replacements: Medicine[],
  isUrdu: boolean = false
): string => {
  const t = {
    notFound: `"${searchedTerm}" not found in inventory.`,
    suggestions: "Here are some alternatives:",
    noAlternatives: "No alternatives found."
  };

  if (replacements.length === 0) {
    return `${t.notFound} ${t.noAlternatives}`;
  }

  return `${t.notFound} ${t.suggestions}`;
};
