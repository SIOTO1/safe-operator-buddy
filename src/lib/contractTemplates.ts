export interface ContractTemplate {
  id: string;
  label: string;
  description: string;
  terms: string[];
  indemnity: string;
  safetyNotes: string[];
}

export const contractTemplates: ContractTemplate[] = [
  {
    id: "bounce-house",
    label: "Bounce House / Inflatable",
    description: "Standard inflatable rental agreement for bounce houses, combos, and similar inflatables.",
    terms: [
      "Client agrees that the inflatable unit(s) will be used in accordance with all manufacturer guidelines and safety instructions provided at delivery.",
      "Client is responsible for providing a suitable setup area that is flat, free of debris, and meets the surface requirements specified by the operator.",
      "Client must designate a responsible adult (18+ years) to supervise the unit at all times while inflated. The unit must never be left unattended with riders present.",
      "Client agrees to enforce posted occupancy limits and age/size groupings at all times.",
      "Client shall not move, reposition, or modify any anchoring, staking, or electrical connections once the unit has been set up by the operator.",
      "In the event of wind speeds exceeding safe operating limits (as determined by the operator), the operator reserves the right to deflate and secure the unit without refund.",
      "Client is responsible for ensuring no food, drinks, silly string, sharp objects, shoes, or eyeglasses are brought onto the inflatable.",
      "Client acknowledges that inflatable amusement devices carry inherent risks including but not limited to falls, collisions, and entanglement.",
    ],
    indemnity: "Client agrees to indemnify, defend, and hold harmless the Operator, its owners, employees, agents, and affiliates from and against any and all claims, damages, losses, liabilities, costs, and expenses (including reasonable attorney's fees) arising out of or related to: (a) the use of the rented equipment by the Client, their guests, invitees, or any third party; (b) any injury, death, or property damage occurring in connection with the use of the equipment; (c) any breach of this Agreement by the Client; (d) the Client's failure to comply with safety guidelines, manufacturer instructions, or operator directives. This indemnification obligation shall survive the termination of this Agreement.",
    safetyNotes: [
      "All anchoring is performed per manufacturer specifications for your specific unit(s).",
      "Operator will conduct a site inspection before setup to verify suitability.",
      "Wind monitoring will be conducted throughout the event using an anemometer.",
    ],
  },
  {
    id: "water-slide",
    label: "Water Slide / Water Inflatable",
    description: "Rental agreement for water slides, slip-n-slides, and water-based inflatables.",
    terms: [
      "All terms from the standard inflatable agreement apply, plus the following water-specific provisions.",
      "Client is responsible for providing an adequate water supply (garden hose with standard connection) within 50 feet of the setup area.",
      "Client is responsible for proper drainage to prevent pooling or flooding of the setup area and surrounding property.",
      "No diving, flipping, or standing on the slide surface is permitted.",
      "Client acknowledges the increased slip hazard associated with water inflatables and assumes responsibility for wet surface management in surrounding areas.",
      "Client must ensure all riders wear appropriate swim attire — no buttons, zippers, belt buckles, or sharp accessories.",
      "Client is responsible for monitoring water conditions and immediately reporting any equipment malfunction.",
    ],
    indemnity: "Client agrees to indemnify, defend, and hold harmless the Operator, its owners, employees, agents, and affiliates from and against any and all claims, damages, losses, liabilities, costs, and expenses (including reasonable attorney's fees) arising out of or related to the use of rented water equipment, including but not limited to injuries from slipping, drowning risks, water-related illnesses, or property damage from water runoff. Client acknowledges the heightened risk inherent in water-based amusement equipment and accepts full responsibility for supervising all participants. This indemnification obligation shall survive the termination of this Agreement.",
    safetyNotes: [
      "Water quality and flow must be monitored throughout the event.",
      "Operator recommends placing towels and non-slip mats at entry/exit points.",
      "Unit must be deflated immediately if water supply is interrupted.",
    ],
  },
  {
    id: "mechanical-ride",
    label: "Mechanical Ride",
    description: "Rental agreement for mechanical bulls, rock climbing walls, and other mechanical amusement devices.",
    terms: [
      "Client acknowledges that mechanical amusement devices present unique risks including but not limited to falls from height, impact injuries, and equipment malfunction.",
      "All mechanical rides will be operated exclusively by trained operator staff. Client and guests may not operate the equipment under any circumstances.",
      "Participants must meet all height, weight, and age requirements posted at the ride. Operator staff have final authority on rider eligibility.",
      "Client must ensure all participants sign individual liability waivers before riding.",
      "Client must provide a level, stable surface suitable for the specific mechanical device as specified by the operator.",
      "Client is responsible for maintaining a clear safety perimeter around the equipment as marked by the operator.",
      "Operator reserves the right to shut down the ride at any time due to safety concerns, weather conditions, or equipment issues without refund.",
      "Any damage to the mechanical equipment caused by misuse, vandalism, or negligence by the Client or their guests will be charged to the Client at full replacement or repair cost.",
    ],
    indemnity: "Client agrees to indemnify, defend, and hold harmless the Operator, its owners, employees, agents, and affiliates from and against any and all claims, damages, losses, liabilities, costs, and expenses (including reasonable attorney's fees) arising out of or related to: (a) the use of rented mechanical equipment; (b) any injury, death, or property damage resulting from rider participation, equipment proximity, or mechanical failure; (c) Client's failure to ensure all participants have signed required waivers; (d) any violation of safety rules by the Client or their guests. Client acknowledges the inherently dangerous nature of mechanical amusement rides and accepts full responsibility. This indemnification obligation shall survive the termination of this Agreement.",
    safetyNotes: [
      "Mechanical rides require current inspection certificates where required by local/state law.",
      "Operator staff must be present and operating the ride at all times.",
      "Emergency stop procedures will be reviewed with the Client before the event begins.",
    ],
  },
  {
    id: "foam-machine",
    label: "Foam Machine / Foam Party",
    description: "Rental agreement for foam machines and foam party equipment.",
    terms: [
      "Client is responsible for providing a suitable outdoor area for foam operation with adequate drainage.",
      "Client acknowledges that foam solution may cause surfaces to become extremely slippery and accepts responsibility for slip-related incidents.",
      "Client must ensure all participants remove shoes, jewelry, and sharp accessories before entering the foam area.",
      "Foam solution is non-toxic and hypoallergenic; however, Client is responsible for informing guests with known sensitivities.",
      "Client must keep foam solution away from eyes. If contact occurs, rinse thoroughly with clean water.",
      "Client is responsible for cleanup of foam residue on surrounding surfaces after the event.",
      "Equipment must be operated in accordance with operator instructions — do not overfill, redirect nozzles, or modify foam output.",
    ],
    indemnity: "Client agrees to indemnify, defend, and hold harmless the Operator, its owners, employees, agents, and affiliates from and against any and all claims, damages, losses, liabilities, costs, and expenses (including reasonable attorney's fees) arising out of or related to the use of foam equipment, including but not limited to slip-and-fall injuries, skin or eye irritation, allergic reactions, property damage from foam residue, or damage to landscaping. This indemnification obligation shall survive the termination of this Agreement.",
    safetyNotes: [
      "Foam area should be clearly marked with boundaries.",
      "Ensure adequate adult supervision — visibility is reduced in heavy foam.",
      "Do not operate foam machine near pools, electrical equipment, or roadways.",
    ],
  },
  {
    id: "dunk-tank",
    label: "Dunk Tank",
    description: "Rental agreement for dunk tank equipment.",
    terms: [
      "Client is responsible for providing a flat, level surface capable of supporting the weight of the filled dunk tank.",
      "Client must provide a water source (garden hose) and arrange for proper drainage after the event.",
      "Only one person at a time may occupy the dunk tank seat. No climbing on the tank cage or frame.",
      "The person on the seat must be able to swim or be comfortable in water up to chest height.",
      "No glass, sharp objects, or hard balls may be used — only operator-provided throwing balls.",
      "Client must ensure children under 18 have parental consent and adult supervision when using the dunk tank.",
      "Client is responsible for monitoring water quality and temperature throughout the event.",
    ],
    indemnity: "Client agrees to indemnify, defend, and hold harmless the Operator, its owners, employees, agents, and affiliates from and against any and all claims, damages, losses, liabilities, costs, and expenses (including reasonable attorney's fees) arising out of or related to the use of the dunk tank, including but not limited to drowning or submersion injuries, impact injuries from falling into water, injuries from thrown objects, slip-and-fall injuries around the tank, and property damage from water spillage. This indemnification obligation shall survive the termination of this Agreement.",
    safetyNotes: [
      "Tank water level must be maintained at the manufacturer-recommended depth.",
      "A safety spotter should be present near the tank at all times.",
      "Do not operate in lightning or severe weather conditions.",
    ],
  },
  {
    id: "tables-chairs",
    label: "Tables & Chairs",
    description: "Rental agreement for tables, chairs, tents, and general event equipment.",
    terms: [
      "Client is responsible for inspecting all rented items upon delivery and reporting any damage or defects before use.",
      "Client agrees to use tables and chairs on stable, level surfaces only. Do not place on slopes, uneven ground, or wet surfaces.",
      "Do not exceed the weight capacity of tables or chairs. Do not stand on chairs or tables.",
      "Client is responsible for the safekeeping of rented items during the rental period. Lost, stolen, or damaged items will be charged at replacement cost.",
      "Tent setups (if applicable) must not be modified, moved, or taken down by the Client. Contact the operator for any adjustments.",
      "Client is responsible for ensuring items are stacked, folded, or arranged for pickup as instructed by the operator.",
    ],
    indemnity: "Client agrees to indemnify, defend, and hold harmless the Operator, its owners, employees, agents, and affiliates from and against any and all claims, damages, losses, liabilities, costs, and expenses (including reasonable attorney's fees) arising out of or related to the use of rented tables, chairs, tents, or general event equipment, including but not limited to injuries from equipment collapse, tip-over, or misuse. This indemnification obligation shall survive the termination of this Agreement.",
    safetyNotes: [
      "Inspect all items before use — report defects immediately.",
      "Keep walkways around tables and chairs clear to prevent tripping.",
      "Secure tent canopies if wind picks up — do not leave tents unattended in wind.",
    ],
  },
];
