import { ContractTemplate } from "./contractTemplates";

/**
 * Merge multiple contract templates into a single combined contract.
 * - Terms are deduplicated and grouped by equipment type
 * - Indemnity clauses are combined into a single comprehensive paragraph
 * - Safety notes are merged and deduplicated
 */
export function mergeContractTemplates(templates: ContractTemplate[]) {
  if (templates.length === 0) return null;
  if (templates.length === 1) return templates[0];

  const labels = templates.map(t => t.label);
  const label = labels.join(" + ");

  // Group terms by equipment type
  const allTerms: string[] = [];
  templates.forEach(t => {
    allTerms.push(`[${t.label}]`);
    t.terms.forEach(term => {
      // Skip "all terms from standard agreement apply" type references
      if (!term.toLowerCase().includes("all terms from the standard")) {
        allTerms.push(term);
      }
    });
  });

  // Build combined indemnity
  const equipmentList = labels.join(", ");
  const specificRisks = new Set<string>();
  templates.forEach(t => {
    // Extract risk phrases from each indemnity
    const riskMatch = t.indemnity.match(/including but not limited to (.+?)(?:\.|This indemnification)/);
    if (riskMatch) {
      riskMatch[1].split(/,\s*/).forEach(r => specificRisks.add(r.trim().replace(/^and\s+/, "")));
    }
  });

  const combinedIndemnity = `Client agrees to indemnify, defend, and hold harmless the Operator, its owners, employees, agents, and affiliates from and against any and all claims, damages, losses, liabilities, costs, and expenses (including reasonable attorney's fees) arising out of or related to the use of the following rented equipment: ${equipmentList}. This includes but is not limited to ${Array.from(specificRisks).join(", ")}. Client acknowledges the inherent risks associated with each type of rented equipment and accepts full responsibility for supervising all participants and ensuring compliance with all safety guidelines, manufacturer instructions, and operator directives. This indemnification obligation shall survive the termination of this Agreement.`;

  // Merge and deduplicate safety notes
  const safetySet = new Map<string, string>();
  templates.forEach(t => {
    t.safetyNotes.forEach(note => {
      const key = note.toLowerCase().replace(/[^a-z]/g, "").slice(0, 40);
      if (!safetySet.has(key)) safetySet.set(key, note);
    });
  });

  return {
    id: templates.map(t => t.id).join("-"),
    label,
    description: `Combined rental agreement covering: ${equipmentList}`,
    terms: allTerms,
    indemnity: combinedIndemnity,
    safetyNotes: Array.from(safetySet.values()),
  } as ContractTemplate;
}
