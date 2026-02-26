export interface SOPArticle {
  id: string;
  title: string;
  category: string;
  subcategory: string;
  content: string;
  flashcard: { front: string; back: string };
  tags: string[];
}

export interface SOPCategory {
  id: string;
  label: string;
  icon: string;
  description: string;
  subcategories: string[];
}

export const sopCategories: SOPCategory[] = [
  {
    id: "driver-protocols",
    label: "Driver Protocols",
    icon: "Truck",
    description: "Rules of the road, vehicle safety, and delivery procedures for drivers",
    subcategories: ["Rules of the Road", "Vehicle Inspection", "Delivery & Pickup", "Loading & Unloading"],
  },
  {
    id: "lifting-safety",
    label: "Lifting & Physical Safety",
    icon: "Dumbbell",
    description: "Proper lifting techniques, ergonomics, and physical safety procedures",
    subcategories: ["Proper Lifting Techniques", "Team Lifting", "Equipment Handling", "Injury Prevention"],
  },
  {
    id: "hr-policies",
    label: "HR Policies",
    icon: "Scale",
    description: "Workplace conduct, harassment prevention, discrimination policies, and confidentiality",
    subcategories: ["Anti-Harassment", "Anti-Discrimination", "Confidentiality & Privacy", "Substance Abuse Policy"],
  },
  {
    id: "professionalism",
    label: "Professionalism Standards",
    icon: "Award",
    description: "Uniform policy, customer interactions, time management, and workplace ethics",
    subcategories: ["Uniform & Appearance", "Customer Interactions", "Time & Attendance", "Workplace Ethics"],
  },
  {
    id: "setup-takedown",
    label: "Setup & Takedown SOPs",
    icon: "Wrench",
    description: "Standard operating procedures for equipment setup and takedown",
    subcategories: ["Bounce House Setup", "Water Slide Setup", "Tent Setup", "Foam Machine Setup", "Dunk Tank Setup", "General Takedown"],
  },
  {
    id: "difficult-conversations",
    label: "Difficult Conversations",
    icon: "MessageCircle",
    description: "Talking points and scripts for tough customer and employee conversations",
    subcategories: ["Customer Complaints", "Employee Performance", "Safety Violations", "Conflict Resolution"],
  },
];

export const sopArticles: SOPArticle[] = [
  // ── Driver Protocols ──
  {
    id: "dp-001",
    title: "Rules of the Road — Company Vehicle Policy",
    category: "driver-protocols",
    subcategory: "Rules of the Road",
    content: `## Company Vehicle Policy

### Speed & Traffic Laws
- Obey ALL posted speed limits — no exceptions
- Follow all traffic signals, signs, and road markings
- Maintain safe following distance (minimum 4 seconds for trucks/trailers)
- Reduce speed in construction zones, school zones, and residential areas

### Phone & Distraction Policy
- **ZERO TOLERANCE** for phone use while driving — no calls, texts, or GPS adjustments while the vehicle is in motion
- Pull over safely to make or receive calls
- Use hands-free devices ONLY when the vehicle is parked
- No eating, smoking, or vaping while driving

### Smoking & Vaping Policy
- No smoking or vaping inside company vehicles at any time
- No smoking or vaping at customer locations
- Designated smoking areas only during breaks, away from equipment and customers

### Seatbelts
- All occupants must wear seatbelts at ALL times
- Driver is responsible for ensuring all passengers are buckled

### Incident Reporting
- Report ALL accidents, near-misses, and traffic citations immediately to management
- Do not admit fault at the scene
- Document with photos and obtain witness information
- Complete an Incident Report within 24 hours`,
    flashcard: {
      front: "What is the company policy on phone use while driving?",
      back: "ZERO TOLERANCE — no calls, texts, or GPS adjustments while the vehicle is in motion. Pull over safely for any phone use.",
    },
    tags: ["driving", "phone", "smoking", "seatbelt", "safety"],
  },
  {
    id: "dp-002",
    title: "Pre-Trip Vehicle Inspection Checklist",
    category: "driver-protocols",
    subcategory: "Vehicle Inspection",
    content: `## Pre-Trip Vehicle Inspection

### Before Every Trip
Drivers must complete a full vehicle inspection BEFORE departing. No exceptions.

### Exterior Check
- ✅ Tires: Check pressure, tread depth, and condition (including spare)
- ✅ Lights: Headlights, brake lights, turn signals, hazard lights all functional
- ✅ Mirrors: Clean, properly adjusted
- ✅ Trailer hitch: Secured, safety chains connected, lights working
- ✅ Load: Equipment properly secured and balanced
- ✅ Fluid check: No visible leaks under vehicle

### Interior Check
- ✅ Fuel: Minimum half tank before departure
- ✅ Gauges: All dashboard indicators normal
- ✅ Registration & insurance: Current documents in vehicle
- ✅ First aid kit: Present and stocked
- ✅ Fire extinguisher: Present and charged
- ✅ Emergency triangle/flares: Present

### Documentation
- Log mileage at departure and return
- Note any vehicle issues on the Vehicle Condition Report
- Report maintenance needs immediately — do NOT drive an unsafe vehicle`,
    flashcard: {
      front: "What must a driver complete before EVERY trip?",
      back: "A full pre-trip vehicle inspection covering exterior (tires, lights, mirrors, hitch, load, fluids), interior (fuel, gauges, documents, safety equipment), and log the mileage.",
    },
    tags: ["inspection", "vehicle", "pre-trip", "checklist"],
  },
  {
    id: "dp-003",
    title: "Delivery & Pickup Procedures",
    category: "driver-protocols",
    subcategory: "Delivery & Pickup",
    content: `## Delivery & Pickup Standard Procedure

### Arrival at Customer Location
1. Park in a safe, accessible location — do NOT block driveways, fire lanes, or sidewalks
2. Introduce yourself professionally: "Hi, I'm [Name] from [Company]. I'm here to set up your [equipment]."
3. Confirm the setup location with the customer
4. Walk the site to identify hazards BEFORE unloading

### Unloading
- Always use proper lifting techniques (see Lifting SOPs)
- Use dollies, hand trucks, or carts whenever possible
- Never drag equipment across pavement or sharp surfaces
- Two-person minimum for items over 50 lbs

### Setup Completion
- Complete the setup checklist for the specific equipment type
- Walk the customer through basic safety rules and emergency procedures
- Have the customer sign the rental agreement / liability waiver
- Provide your contact number for issues during the event

### Pickup
- Arrive at the scheduled pickup time (or call ahead if delayed)
- Ensure all riders/users have exited before beginning teardown
- Follow the takedown SOP for the equipment type
- Inspect equipment for damage and document any issues
- Leave the site clean — pick up any trash or debris`,
    flashcard: {
      front: "What's the first thing a driver should do after parking at a customer location?",
      back: "Introduce yourself professionally, confirm the setup location with the customer, and walk the site to identify hazards BEFORE unloading any equipment.",
    },
    tags: ["delivery", "pickup", "customer", "procedure"],
  },
  {
    id: "dp-004",
    title: "Loading & Securing Equipment on Trailers",
    category: "driver-protocols",
    subcategory: "Loading & Unloading",
    content: `## Loading & Securing Equipment

### Weight Distribution
- Place heaviest items over the trailer axle(s)
- Distribute weight evenly side-to-side
- Never exceed the trailer's rated capacity (check the VIN plate)

### Securing Loads
- Use ratchet straps rated for the load weight — no bungee cords
- Minimum 4 tie-down points for large inflatables
- Cross-strap pattern for maximum stability
- Check straps every 50 miles on long hauls

### Blowers & Accessories
- Secure blowers separately — do not stack loose items on inflatables
- Keep stakes, sandbags, and tools in a separate secured container
- Extension cords coiled and stored, not loose in the trailer

### Tarp & Cover
- Cover loads with a tarp in rain or highway speeds
- Secure tarp edges to prevent flapping
- Ensure no loose material can blow off during transit`,
    flashcard: {
      front: "Where should the heaviest items be placed on a trailer?",
      back: "Over the trailer axle(s), with weight distributed evenly side-to-side. Never exceed the trailer's rated capacity.",
    },
    tags: ["loading", "trailer", "securing", "weight"],
  },

  // ── Lifting & Physical Safety ──
  {
    id: "ls-001",
    title: "Proper Lifting Techniques",
    category: "lifting-safety",
    subcategory: "Proper Lifting Techniques",
    content: `## Proper Lifting Techniques

### The Safe Lift Method
1. **Plan the lift** — Assess the weight. If it's over 50 lbs, get help or use equipment.
2. **Position your feet** — Shoulder-width apart, one foot slightly forward
3. **Bend at the knees** — NOT at the waist. Keep your back straight.
4. **Get a firm grip** — Use both hands, grip tightly before lifting
5. **Lift with your legs** — Push up through your legs, keep the load close to your body
6. **Keep your core tight** — Engage your abdominal muscles throughout the lift
7. **Move your feet** — Do NOT twist your torso. Pivot with your feet to change direction.
8. **Set down carefully** — Reverse the process: bend knees, keep back straight

### Common Mistakes to Avoid
- 🛑 Bending at the waist with straight legs
- 🛑 Twisting while carrying a load
- 🛑 Jerking or rushing the lift
- 🛑 Carrying loads that block your view
- 🛑 Lifting above shoulder height without assistance

### When to Use Mechanical Aids
- Loads over 50 lbs: Use a dolly, hand truck, or cart
- Awkward shapes: Use straps or team lift
- Overhead placement: Use a step ladder, never stretch`,
    flashcard: {
      front: "What are the key steps in a safe lift?",
      back: "Plan → Position feet shoulder-width → Bend knees (not waist) → Firm grip → Lift with legs → Core tight → Move feet (don't twist) → Set down carefully.",
    },
    tags: ["lifting", "ergonomics", "safety", "technique"],
  },
  {
    id: "ls-002",
    title: "Team Lifting Protocols",
    category: "lifting-safety",
    subcategory: "Team Lifting",
    content: `## Team Lifting Protocols

### When to Team Lift
- Any item over 50 lbs
- Any item that's awkward to grip or balance alone
- Large inflatables, mechanical rides, generators, heavy tables

### Communication
- **Designate a lead lifter** who gives all commands
- Use clear verbal cues:
  - "Ready? Lift on three. One… two… THREE."
  - "Moving left / right / forward / back."
  - "Set it down on three. One… two… THREE."
- ALL team members must acknowledge commands before action

### Positioning
- Face each other for two-person lifts
- Tallest person takes the heavier end
- Match grip positions for balance
- Move in sync — slow, controlled steps

### Carrying
- Keep the load level — don't let one end dip
- Take the shortest, clearest path
- Communicate about obstacles: "Step up ahead" / "Curb in 5 feet"
- If anyone says "Stop" — everyone stops immediately`,
    flashcard: {
      front: "When should you use a team lift?",
      back: "Any item over 50 lbs, awkward to grip, or difficult to balance alone. Designate a lead lifter and use clear verbal commands.",
    },
    tags: ["team lift", "communication", "safety"],
  },
  {
    id: "ls-003",
    title: "Equipment Handling & Care",
    category: "lifting-safety",
    subcategory: "Equipment Handling",
    content: `## Equipment Handling & Care

### Inflatables
- Roll, don't fold — folding causes crease damage
- Keep vinyl away from sharp objects, heat sources, and chemicals
- Clean with mild soap and water only — no harsh chemicals
- Dry completely before storage to prevent mold/mildew

### Blowers
- Carry by the handles, never by the cord
- Store upright in a dry location
- Check intake screens for debris before each use
- Never operate a blower with a damaged cord

### Stakes & Sandbags
- Carry stakes in a bucket or bag — never loose in hand
- Stack sandbags on a dolly for transport
- Inspect stakes for bending/damage before each use

### Tables, Chairs & Tents
- Use carts to transport folding tables and chairs
- Never drag tent poles across pavement
- Inspect tent fabric for tears and pole connections for wear`,
    flashcard: {
      front: "How should inflatables be stored?",
      back: "Roll (don't fold), clean with mild soap and water, dry completely before storage to prevent mold/mildew. Keep away from sharp objects and heat.",
    },
    tags: ["equipment", "handling", "maintenance", "storage"],
  },
  {
    id: "ls-004",
    title: "Injury Prevention & Stretching",
    category: "lifting-safety",
    subcategory: "Injury Prevention",
    content: `## Injury Prevention

### Daily Stretching (Before Shifts)
Spend 5 minutes stretching before physical work:
- Neck rolls: 10 seconds each direction
- Shoulder shrugs: 10 reps
- Trunk twists: 10 reps
- Hamstring stretch: Hold 15 seconds each leg
- Quad stretch: Hold 15 seconds each leg
- Ankle circles: 10 each direction

### Hydration & Heat Safety
- Drink water every 20-30 minutes during outdoor work
- Recognize heat exhaustion: heavy sweating, weakness, nausea, dizziness
- Take shade breaks every hour in temperatures above 85°F
- NEVER ignore heat-related symptoms — report immediately

### Fatigue Management
- Take scheduled breaks — do not power through exhaustion
- Rotate between physical and lighter tasks throughout the day
- Get adequate sleep (7-8 hours) before early morning shifts
- Report any pain or discomfort before it becomes an injury`,
    flashcard: {
      front: "How often should you hydrate during outdoor work?",
      back: "Every 20-30 minutes. Take shade breaks every hour above 85°F. Never ignore heat-related symptoms.",
    },
    tags: ["stretching", "hydration", "heat", "prevention"],
  },

  // ── HR Policies ──
  {
    id: "hr-001",
    title: "Anti-Harassment Policy",
    category: "hr-policies",
    subcategory: "Anti-Harassment",
    content: `## Anti-Harassment Policy

### Zero Tolerance
This company maintains a **ZERO TOLERANCE** policy for harassment of any kind — sexual, verbal, physical, or visual.

### What Constitutes Harassment
- Unwelcome sexual advances, requests for sexual favors
- Offensive jokes, slurs, or name-calling
- Physical intimidation, threats, or assault
- Displaying offensive images, symbols, or materials
- Unwanted touching or invasion of personal space
- Cyberbullying or harassment via text, social media, or email

### Reporting Procedure
1. Report harassment immediately to your direct supervisor or company owner
2. If the harasser IS your supervisor, report to the company owner directly
3. All reports will be investigated promptly and confidentially
4. Retaliation against anyone who reports harassment is strictly prohibited

### Consequences
- First offense: Formal written warning and mandatory training
- Second offense: Suspension without pay
- Severe or repeated offenses: Immediate termination
- Criminal conduct will be reported to law enforcement`,
    flashcard: {
      front: "What is the company's harassment policy?",
      back: "ZERO TOLERANCE for all forms of harassment. Report immediately to supervisor or owner. Retaliation is prohibited. Consequences range from written warning to immediate termination.",
    },
    tags: ["harassment", "sexual harassment", "workplace", "policy"],
  },
  {
    id: "hr-002",
    title: "Anti-Discrimination & Equal Treatment Policy",
    category: "hr-policies",
    subcategory: "Anti-Discrimination",
    content: `## Anti-Discrimination Policy

### Core Principle
Every associate, customer, and vendor will be treated with **dignity and respect** regardless of:
- Race, color, ethnicity, or national origin
- Gender, gender identity, or sexual orientation
- Religion or personal beliefs
- Age or disability
- Veteran status
- Any other protected characteristic

### Expected Behavior
- Treat ALL colleagues as equal team members
- Use respectful language at all times
- Accommodate differences in culture, language, and ability
- Report discriminatory behavior immediately

### At Customer Locations
- Treat all customers with equal professionalism regardless of neighborhood, home size, or event type
- Never make assumptions about customers based on appearance
- Provide the same level of service and courtesy to every client

### Consequences
Discrimination in any form is grounds for disciplinary action up to and including immediate termination.`,
    flashcard: {
      front: "What is the core principle of the anti-discrimination policy?",
      back: "Every associate, customer, and vendor is treated with dignity and respect regardless of race, gender, religion, age, disability, or any protected characteristic.",
    },
    tags: ["discrimination", "respect", "equal treatment", "policy"],
  },
  {
    id: "hr-003",
    title: "Confidentiality & Privacy Policy",
    category: "hr-policies",
    subcategory: "Confidentiality & Privacy",
    content: `## Confidentiality & Privacy Policy

### What's Confidential
- Customer personal information (names, addresses, phone numbers, emails)
- Customer event details and locations
- Company financial information and pricing strategies
- Employee personal information and payroll data
- Business plans, vendor agreements, and trade secrets

### Rules
- **NEVER** share customer information with anyone outside the company
- **NEVER** post customer addresses, event photos, or details on personal social media without written permission
- **NEVER** discuss company finances, employee pay, or internal issues with customers
- Keep customer contracts and signed waivers secure and accessible only to authorized personnel
- Return all company documents and materials upon termination

### Social Media
- Do not post photos of customer homes, families, or events without explicit written consent
- Do not post negative comments about customers, coworkers, or the company
- Company social media accounts are managed by authorized personnel only

### Breach Consequences
Unauthorized disclosure of confidential information is grounds for immediate termination and may result in legal action.`,
    flashcard: {
      front: "Can you post photos of a customer's event on your personal social media?",
      back: "NO — never post customer addresses, event photos, or details on personal social media without explicit WRITTEN permission from the customer.",
    },
    tags: ["confidentiality", "privacy", "social media", "customer data"],
  },
  {
    id: "hr-004",
    title: "Substance Abuse & Impairment Policy",
    category: "hr-policies",
    subcategory: "Substance Abuse Policy",
    content: `## Substance Abuse & Impairment Policy

### Zero Tolerance
Associates may **NOT** report to work or operate company vehicles/equipment while under the influence of:
- Alcohol
- Illegal drugs
- Prescription medications that impair judgment or motor function
- Marijuana (regardless of state legality)

### Expectations
- Do not consume alcohol or drugs before or during work hours
- If a prescription medication may impair your ability to work safely, notify your supervisor BEFORE your shift
- Do not store alcohol, drugs, or drug paraphernalia in company vehicles or on company property

### Testing
- Pre-employment drug screening may be required
- Reasonable suspicion testing may be conducted if a supervisor observes signs of impairment
- Post-accident testing may be required for any workplace incident

### Signs of Impairment
Supervisors will watch for: slurred speech, unsteady gait, bloodshot eyes, odor of alcohol/marijuana, erratic behavior, drowsiness, or inability to perform duties safely.

### Consequences
- First offense: Immediate removal from duty, mandatory substance abuse evaluation
- Second offense: Immediate termination
- Operating a company vehicle while impaired: Immediate termination and potential criminal referral`,
    flashcard: {
      front: "Can you work if you've consumed marijuana, even if it's legal in your state?",
      back: "NO — the substance abuse policy prohibits working under the influence of marijuana regardless of state legality. Zero tolerance applies.",
    },
    tags: ["substance abuse", "drugs", "alcohol", "impairment", "testing"],
  },

  // ── Professionalism ──
  {
    id: "pr-001",
    title: "Uniform & Appearance Standards",
    category: "professionalism",
    subcategory: "Uniform & Appearance",
    content: `## Uniform & Appearance Standards

### Required Uniform
- Company-issued shirt (polo or t-shirt) — clean and in good condition
- Khaki or black work pants/shorts (no jeans with holes, no athletic shorts)
- Closed-toe shoes with non-slip soles (steel-toe recommended for drivers)
- Company ID badge visible at all times during events

### Grooming
- Clean, neat appearance at all times
- Hair secured and out of face during setup/teardown
- No excessive cologne/perfume (customers may be sensitive)
- Tattoos: No offensive or inappropriate tattoos visible to customers

### What NOT to Wear
- 🛑 Personal graphic tees or hoodies
- 🛑 Sandals, flip-flops, or open-toe shoes
- 🛑 Sunglasses indoors during customer interactions
- 🛑 Hats with non-company branding (company hats are OK)
- 🛑 Earbuds/headphones during setup or customer-facing time

### Uniform Care
- You are responsible for keeping your uniform clean and presentable
- Report damaged or worn uniforms for replacement
- Uniforms must be returned upon termination`,
    flashcard: {
      front: "What footwear is required on the job?",
      back: "Closed-toe shoes with non-slip soles. Steel-toe recommended for drivers. No sandals, flip-flops, or open-toe shoes.",
    },
    tags: ["uniform", "appearance", "grooming", "dress code"],
  },
  {
    id: "pr-002",
    title: "Customer Interaction Standards",
    category: "professionalism",
    subcategory: "Customer Interactions",
    content: `## Customer Interaction Standards

### First Impressions
- Greet every customer with a smile and introduction
- Use the customer's name when possible
- Maintain positive, upbeat energy — you represent the company

### Communication
- Speak clearly and professionally — no slang, profanity, or inappropriate language
- Listen actively to customer requests and concerns
- If you don't know the answer, say: "Great question — let me check with my team and get back to you."
- Never argue with a customer — escalate to management if needed

### On-Site Behavior
- Stay focused on the job — no personal phone calls, social media, or side conversations
- Keep the work area clean and organized throughout the event
- Offer assistance proactively: "Is there anything else I can help with?"
- Thank the customer before leaving: "Thank you for choosing [Company]! Enjoy your event!"

### Handling Complaints
1. Listen without interrupting
2. Acknowledge the concern: "I understand your frustration."
3. Offer a solution if within your authority
4. If not, escalate immediately: "Let me get my manager on the phone to help resolve this."
5. Follow up to ensure the issue was resolved`,
    flashcard: {
      front: "What should you say if a customer asks a question you can't answer?",
      back: "\"Great question — let me check with my team and get back to you.\" Never guess or make something up.",
    },
    tags: ["customer service", "communication", "professionalism"],
  },
  {
    id: "pr-003",
    title: "Time & Attendance Policy",
    category: "professionalism",
    subcategory: "Time & Attendance",
    content: `## Time & Attendance Policy

### Punctuality
- Arrive at least 10 minutes before your scheduled shift
- "On time" means ready to work at shift start — not just arriving
- Repeated lateness (3+ occurrences in 30 days) is grounds for disciplinary action

### Calling Out
- Notify your supervisor at least 2 hours before your shift (4 hours for early morning shifts)
- Text messages alone are NOT acceptable — you must call or speak directly
- Provide as much notice as possible for planned absences
- "No call / no show" is grounds for immediate termination

### Time Theft
The following are considered time theft and will result in disciplinary action:
- 🛑 Clocking in but not actually working
- 🛑 Taking extended breaks without approval
- 🛑 Having someone else clock in for you
- 🛑 Personal errands during paid work time
- 🛑 Excessive personal phone use during work hours

### Overtime
- Overtime must be pre-approved by management
- Do not work past your scheduled shift without authorization
- All hours must be accurately reported`,
    flashcard: {
      front: "What is considered 'on time' for a shift?",
      back: "Arrive at least 10 minutes before your scheduled shift. 'On time' means ready to work at shift start, not just arriving.",
    },
    tags: ["attendance", "punctuality", "time theft", "calling out"],
  },
  {
    id: "pr-004",
    title: "Workplace Ethics & Theft Policy",
    category: "professionalism",
    subcategory: "Workplace Ethics",
    content: `## Workplace Ethics & Theft Policy

### Company Property
- All equipment, vehicles, uniforms, and supplies are company property
- Use company property for business purposes only
- Report lost, stolen, or damaged property immediately
- Return all company property upon separation

### Theft
Theft of any kind is grounds for **IMMEDIATE TERMINATION** and criminal prosecution:
- 🛑 Stealing company equipment, tools, or supplies
- 🛑 Stealing from customers (property, cash, personal items)
- 🛑 Stealing from coworkers
- 🛑 Unauthorized use of company funds or credit cards
- 🛑 Falsifying timesheets or expense reports

### Honesty & Integrity
- Be truthful in all communications with management, coworkers, and customers
- Report errors or mistakes immediately — covering up problems makes them worse
- If you witness theft, fraud, or safety violations, report them immediately
- Whistleblower protections apply — retaliation for good-faith reports is prohibited

### Conflicts of Interest
- Do not operate a competing business while employed
- Do not solicit company customers for personal gain
- Disclose any personal relationships with vendors or competitors`,
    flashcard: {
      front: "What happens if an employee is caught stealing?",
      back: "IMMEDIATE TERMINATION and potential criminal prosecution. This applies to stealing from the company, customers, or coworkers.",
    },
    tags: ["theft", "ethics", "integrity", "company property"],
  },

  // ── Setup & Takedown SOPs ──
  {
    id: "st-001",
    title: "Bounce House Setup SOP",
    category: "setup-takedown",
    subcategory: "Bounce House Setup",
    content: `## Bounce House Setup — Standard Operating Procedure

### Site Assessment (5 minutes)
1. Walk the entire setup area looking for hazards:
   - Overhead power lines, tree branches, or structures
   - Sprinkler heads, rocks, roots, or debris
   - Slopes greater than 5 degrees
   - Proximity to pools, fences, or structures (minimum 6 ft clearance recommended)
2. Confirm setup location with customer
3. Check wind conditions with anemometer

### Ground Preparation (3 minutes)
1. Clear the area of debris, rocks, and sharp objects
2. Lay ground tarp (extends 2 ft beyond unit edges)
3. Position tarp so seams face down

### Unit Placement (5 minutes)
1. Unroll unit on tarp — do NOT drag across surfaces
2. Position with blower tube facing the power source
3. Ensure entrance faces a clear, open area away from hazards

### Anchoring (5 minutes)
- **Grass/Dirt:** Steel stakes at EVERY anchor point, 45° angle away from unit. Follow manufacturer specs for depth.
- **Hard Surface:** Sandbags at EVERY anchor point. Weight per manufacturer specs for this unit.
- **Indoor:** Sandbags only
- ⚠️ ALL anchor points must be secured BEFORE inflation

### Inflation & Inspection (5 minutes)
1. Connect blower to unit — secure with straps/zippers
2. Plug into GFCI-protected outlet
3. Inflate fully and perform walk-around inspection:
   - All seams intact, no visible tears
   - Netting secure, entrance/exit clear
   - Anchor points holding, unit level
   - No debris inside the unit

### Customer Briefing (3 minutes)
- Review rider rules and age/size restrictions
- Show emergency off switch location
- Confirm event end time and pickup schedule`,
    flashcard: {
      front: "What must be secured BEFORE inflating a bounce house?",
      back: "ALL anchor points must be secured before inflation — stakes on grass (45° angle) or sandbags on hard surfaces. No exceptions.",
    },
    tags: ["bounce house", "setup", "anchoring", "inflation"],
  },
  {
    id: "st-002",
    title: "Water Slide Setup SOP",
    category: "setup-takedown",
    subcategory: "Water Slide Setup",
    content: `## Water Slide Setup — Standard Operating Procedure

### Additional Requirements Beyond Standard Inflatable Setup
Water slides have ALL the same requirements as standard inflatables PLUS:

### Water Supply
- Locate water source within hose reach of the slide
- Use a hose rated for drinking water
- Test water flow before setup — insufficient flow creates safety hazards
- Ensure drainage away from the unit and pedestrian areas

### Surface Preparation
- Place splash pool or landing pad at the base
- Ensure slip-resistant mats at entry and exit points
- Grade the area for water runoff — water should not pool near electrical connections

### Electrical Safety — Critical
- Blower AND water connections must be on OPPOSITE sides of the unit
- All electrical connections minimum 10 feet from any water
- GFCI protection is MANDATORY — test before every use
- Cord covers for ALL electrical runs in wet areas

### Slide-Specific Safety
- Test the slide yourself before allowing riders
- Ensure adequate water coverage on all sliding surfaces
- Position an attendant at the top AND bottom of the slide
- No head-first sliding — feet first only
- Monitor water level in splash pool throughout event`,
    flashcard: {
      front: "Where should electrical connections be relative to water on a water slide setup?",
      back: "Minimum 10 feet from any water. Blower and water connections on OPPOSITE sides. GFCI protection mandatory.",
    },
    tags: ["water slide", "setup", "electrical", "water safety"],
  },
  {
    id: "st-003",
    title: "Tent Setup SOP",
    category: "setup-takedown",
    subcategory: "Tent Setup",
    content: `## Tent Setup — Standard Operating Procedure

### Site Assessment
1. Check for overhead obstructions (trees, power lines, building overhangs)
2. Ensure adequate clearance for the tent footprint PLUS guy lines
3. Check ground conditions for staking or weight requirements
4. Confirm wind conditions — most tents should not be set up in winds above 25 mph

### Layout
1. Mark the tent footprint with stakes or chalk
2. Lay out the tent fabric, ensuring proper orientation (entrance location)
3. Position all poles, stakes, and accessories

### Assembly
1. Follow the manufacturer's assembly sequence — do NOT skip steps
2. Raise the center pole(s) first, then corner poles
3. Secure all corner stakes/weights BEFORE tensioning
4. Tension the fabric evenly — no loose spots that can catch wind

### Anchoring
- **Grass:** Spiral stakes (min 30" length recommended) at every stake point
- **Hard Surface:** Water barrels, concrete weights, or rated sandbags
- **Guy lines:** Properly tensioned and marked with high-visibility tape or flags

### Safety Check
- Walk the perimeter: all stakes driven, all guy lines taut
- Check fabric: no tears, grommets intact, seams solid
- Verify clearance from cooking/heating sources (min 10 ft from grills, heaters)
- Ensure fire extinguisher on site`,
    flashcard: {
      front: "What is the maximum wind speed for most tent setups?",
      back: "Most tents should NOT be set up in winds above 25 mph. Always check manufacturer guidelines for your specific tent.",
    },
    tags: ["tent", "setup", "anchoring", "guy lines"],
  },
  {
    id: "st-004",
    title: "General Takedown SOP",
    category: "setup-takedown",
    subcategory: "General Takedown",
    content: `## General Takedown — Standard Operating Procedure

### Pre-Takedown
1. Confirm all riders/users have exited the equipment
2. Do a visual sweep inside and around the unit for personal belongings
3. Announce to the customer that takedown is beginning

### Deflation (Inflatables)
1. Turn off and unplug the blower
2. Disconnect blower from the unit
3. Open ALL deflation zippers/flaps
4. Allow initial air to escape naturally (2-3 minutes)

### Disassembly
1. Remove all stakes — use a stake puller, not pliers on the stake head
2. Collect all sandbags and stack for transport
3. Fill any stake holes in grass with dirt (customer courtesy)
4. Remove ground tarp

### Cleaning
1. Wipe down vinyl surfaces with mild soap and water
2. Remove any debris, dirt, or stains
3. For water slides: drain all water, wipe down sliding surfaces
4. Allow to air dry if time permits, or towel dry

### Folding & Rolling
1. Squeeze remaining air from the unit (walk it out)
2. Fold sides toward the center
3. Roll tightly from the END OPPOSITE the blower tube toward the tube
4. Secure with straps — do NOT use tape on vinyl

### Post-Takedown
1. Complete the Post-Event Inspection checklist
2. Note any damage or repairs needed
3. Load equipment properly (see Loading SOP)
4. Clean the site — leave it better than you found it`,
    flashcard: {
      front: "How should you roll an inflatable for storage?",
      back: "Fold sides toward center, then roll tightly from the end OPPOSITE the blower tube toward the tube. Secure with straps (never tape on vinyl).",
    },
    tags: ["takedown", "deflation", "cleaning", "folding"],
  },

  // ── Difficult Conversations ──
  {
    id: "dc-001",
    title: "Handling Customer Complaints",
    category: "difficult-conversations",
    subcategory: "Customer Complaints",
    content: `## Handling Customer Complaints — Talking Points

### The HEAR Method
- **H**ear them out — Let the customer finish without interrupting
- **E**mpathize — "I understand how frustrating that must be."
- **A**ct — Offer a solution or escalate immediately
- **R**esolve — Follow up to confirm satisfaction

### Common Scenarios & Scripts

**"The bounce house arrived late"**
> "I sincerely apologize for the delay. I know timing is critical for your event. Let me [offer a discount / extend the rental time / credit your account] to make this right."

**"The equipment looks dirty/damaged"**
> "I'm sorry this doesn't meet our standards. Let me [clean it immediately / swap it with another unit / offer a partial refund]. Your satisfaction is our priority."

**"My child got hurt"**
> "I'm very sorry to hear that. Let's make sure [child's name] is okay first. Can you tell me exactly what happened? I need to document this for our safety records." (Complete an Incident Report immediately.)

**"I want a refund"**
> "I understand. Let me review what happened and connect you with our manager to discuss the best resolution. We want to make this right."

### What NEVER to Say
- 🛑 "That's not my problem"
- 🛑 "There's nothing I can do"
- 🛑 "You should have read the contract"
- 🛑 "That's never happened before" (dismissive)`,
    flashcard: {
      front: "What is the HEAR method for handling complaints?",
      back: "Hear them out → Empathize → Act (offer solution or escalate) → Resolve (follow up to confirm satisfaction).",
    },
    tags: ["complaints", "customer service", "scripts", "resolution"],
  },
  {
    id: "dc-002",
    title: "Addressing Employee Performance Issues",
    category: "difficult-conversations",
    subcategory: "Employee Performance",
    content: `## Addressing Employee Performance — Talking Points

### Preparation
- Document specific examples (dates, incidents, witnesses)
- Have the employee's file and any prior warnings ready
- Choose a private setting — never in front of coworkers or customers
- Plan what you want to say and the outcome you're seeking

### The Conversation Framework

**Opening:**
> "[Name], I'd like to talk with you about something I've noticed. This isn't to make you feel bad — it's because I value you on our team and want to help you succeed."

**Specific Feedback:**
> "On [date], I noticed [specific behavior]. For example, [describe exactly what happened]. This is a concern because [impact on team/customers/safety]."

**Listen:**
> "Can you help me understand what's going on? Is there something affecting your work that I should know about?"

**Action Plan:**
> "Here's what I need to see moving forward: [specific expectations]. I'm going to check in with you in [timeframe] to see how things are going. What support do you need from me?"

**Document:**
- Put the conversation in writing
- Have the employee acknowledge the discussion (signature)
- Set a follow-up date and stick to it

### Progressive Discipline
1. Verbal warning (documented)
2. Written warning
3. Final written warning / suspension
4. Termination`,
    flashcard: {
      front: "What's the framework for addressing performance issues?",
      back: "Open with care → Give specific feedback with examples → Listen to their perspective → Create an action plan with timeline → Document everything.",
    },
    tags: ["performance", "discipline", "management", "feedback"],
  },
  {
    id: "dc-003",
    title: "Addressing Safety Violations",
    category: "difficult-conversations",
    subcategory: "Safety Violations",
    content: `## Addressing Safety Violations — Talking Points

### Immediate Response
Safety violations require IMMEDIATE intervention — do not wait for a "convenient time."

**In the moment:**
> "Hey [Name], I need you to stop what you're doing right now. [Describe the unsafe action]. Here's why that's dangerous: [explain the risk]. Let me show you the correct way."

### After the Incident

**Private conversation:**
> "[Name], I want to follow up on what happened earlier. Safety is non-negotiable in our business — people's lives depend on it. When you [specific action], you put [yourself / your coworker / the customer] at risk of [specific injury/consequence]."

**Get buy-in:**
> "I need to know that you understand why this matters. Can you tell me what the correct procedure is for [the task]?"

**Document:**
- Complete a Safety Violation Report
- Note the specific violation, correction made, and employee's response
- First offense: Written warning + immediate retraining
- Repeated safety violations: Grounds for termination

### Critical Safety Violations (Immediate Termination)
- Operating a vehicle while impaired
- Deliberately bypassing safety procedures
- Endangering children or event attendees
- Refusing to follow safety directions from a supervisor`,
    flashcard: {
      front: "When should you address a safety violation?",
      back: "IMMEDIATELY — do not wait. Stop the unsafe action, explain the risk, demonstrate the correct procedure. Document afterward.",
    },
    tags: ["safety violations", "discipline", "intervention", "documentation"],
  },
  {
    id: "dc-004",
    title: "Conflict Resolution Between Team Members",
    category: "difficult-conversations",
    subcategory: "Conflict Resolution",
    content: `## Conflict Resolution — Talking Points

### Step 1: Separate & Listen
- Speak to each person individually first
- Ask: "Tell me what happened from your perspective"
- Listen without judging or taking sides
- Take notes on each person's account

### Step 2: Joint Meeting
> "I've spoken with both of you individually. Now I'd like us to talk together so we can find a solution. The ground rules are: one person talks at a time, no interrupting, and we focus on solutions, not blame."

### Step 3: Identify the Issue
> "[Person A], can you explain your concern in one sentence? [Person B], can you do the same?"
> "It sounds like the core issue is [restate the problem]. Is that accurate?"

### Step 4: Find a Solution
> "What would a fair resolution look like to each of you?"
> "Here's what I'm going to ask both of you to do going forward: [specific actions]."

### Step 5: Follow Up
- Check in with both parties within a week
- Document the resolution
- If the conflict continues, escalate to formal disciplinary action

### When to Escalate
- Physical threats or violence → Immediate separation, potential termination
- Harassment or discrimination → Follow HR policy procedures
- Unresolvable personal conflicts → Consider schedule/team reassignment`,
    flashcard: {
      front: "What are the steps for resolving a conflict between team members?",
      back: "Separate & listen individually → Joint meeting with ground rules → Identify the core issue → Find a mutually fair solution → Follow up within a week.",
    },
    tags: ["conflict", "mediation", "team", "resolution"],
  },

  // ── Foam Machine Safety ──
  {
    id: "st-005",
    title: "Foam Machine Safety & Operations",
    category: "setup-takedown",
    subcategory: "Foam Machine Setup",
    content: `## Foam Machine Safety & Operations

### Pre-Event Setup
1. Position the foam machine on a flat, stable surface in an outdoor area with adequate drainage
2. Ensure the foam zone is at least 20 feet from any electrical panels, outlets, or sensitive equipment
3. Mark the foam zone boundaries clearly with cones, caution tape, or barriers
4. Connect to a dedicated power circuit — foam machines draw significant amperage
5. Fill the reservoir with manufacturer-approved foam solution ONLY — never substitute dish soap or other chemicals

### Safety Perimeter
- Establish a non-slip zone around the foam area with mats or towels at entry/exit points
- Keep spectators and non-participants at least 10 feet from the foam zone
- Designate a clear emergency exit path that is NOT through the foam

### Participant Rules
- All participants must remove shoes, jewelry, watches, and sharp accessories
- No running within the foam zone — walking only
- Keep foam away from eyes and mouth — if contact occurs, rinse immediately with clean water
- Children under 6 must have a parent/guardian in the foam zone with them
- Maximum occupancy limits must be posted and enforced

### Operator Responsibilities
- ⚠️ Monitor foam depth — do not let it exceed waist height on the shortest participant
- ⚠️ Maintain line of sight to ALL participants at all times — reduced visibility is the #1 risk
- ⚠️ Check foam solution levels every 30 minutes
- ⚠️ Stop operations immediately if wind disperses foam into roads, neighboring properties, or electrical areas

### Cleanup & Environmental
- Foam solution is biodegradable but should not enter storm drains
- Direct runoff to grass or landscaped areas when possible
- Hose down equipment after each use to prevent residue buildup
- Allow surfaces to dry completely before allowing vehicle or foot traffic

### Emergency Procedures
- 🛑 If a participant cannot be located in the foam: STOP the machine and clear all participants immediately
- 🛑 If foam contacts electrical equipment: Cut power at the breaker, do NOT touch wet equipment
- 🛑 If allergic reaction occurs: Move participant to clean area, rinse skin, seek medical attention`,
    flashcard: {
      front: "What is the #1 safety risk with foam machines?",
      back: "Reduced visibility. Operators must maintain line of sight to ALL participants at all times. If a participant cannot be located, stop the machine and clear everyone immediately.",
    },
    tags: ["foam", "foam machine", "party", "safety", "visibility"],
  },
  {
    id: "st-006",
    title: "Foam Solution Handling & Storage",
    category: "setup-takedown",
    subcategory: "Foam Machine Setup",
    content: `## Foam Solution Handling & Storage

### Approved Solutions
- Use ONLY manufacturer-recommended foam concentrate
- Never substitute with dish soap, bubble bath, or other household products
- Verify the solution is hypoallergenic, non-toxic, and biodegradable before purchase

### Mixing Instructions
- Follow the manufacturer's dilution ratio exactly — more concentrate does NOT mean better foam
- Use clean, potable water for mixing
- Mix in a clean container — contaminants can cause skin irritation

### Storage
- Store concentrate in a cool, dry location away from direct sunlight
- Keep containers sealed and labeled at all times
- Store away from food, drinks, and first aid supplies
- Check expiration dates — expired solution can cause skin reactions

### Safety Data Sheet (SDS)
- Keep the SDS for your foam solution accessible at all events
- Know the first aid procedures listed on the SDS
- If a participant reports skin irritation, document and reference the SDS

### Disposal
- Diluted foam water can be disposed of on grass or landscaped areas
- Do NOT pour concentrated solution down drains
- Follow local environmental regulations for disposal of unused concentrate`,
    flashcard: {
      front: "Can you substitute dish soap for foam machine solution?",
      back: "NEVER. Use only manufacturer-recommended foam concentrate that is hypoallergenic, non-toxic, and biodegradable. Substitutes can cause skin and eye irritation.",
    },
    tags: ["foam solution", "chemical safety", "storage", "SDS"],
  },

  // ── Dunk Tank Operations ──
  {
    id: "st-007",
    title: "Dunk Tank Setup & Safety",
    category: "setup-takedown",
    subcategory: "Dunk Tank Setup",
    content: `## Dunk Tank Setup & Safety

### Site Requirements
- Flat, level surface capable of supporting 2,000+ lbs when filled
- Within 50 feet of a garden hose water source
- Minimum 10-foot clearance on all sides
- Away from electrical lines, panels, and outlets
- Drainage plan in place for post-event water removal

### Fill Procedure
1. Position the tank on the approved surface — do NOT move once filling begins
2. Inspect the tank for cracks, rust, or structural damage before filling
3. Connect hose and begin filling — monitor water level continuously
4. Fill to the manufacturer-recommended depth (typically marked on the interior)
5. Test the release mechanism multiple times BEFORE any participants enter
6. Verify the seat locks properly in the raised position

### Participant Safety
- **Swimmers only** — the person on the seat must be comfortable in chest-deep water
- Maximum weight limit for the seat: check manufacturer specs (typically 250 lbs)
- No one under 18 on the seat without parental consent
- Participants must remove glasses, jewelry, and phones before sitting
- Safety spotter must be positioned next to the tank at ALL times

### Throwing Zone
- Throwing line: minimum 10 feet from the target
- Use ONLY operator-provided soft throwing balls — no baseballs, rocks, or hard objects
- One thrower at a time
- Children under 10 should throw from a closer line (5-7 feet)

### Supervision Requirements
- ⚠️ Dedicated safety spotter at the tank at ALL times — this person does nothing else
- ⚠️ Spotter must be able to reach the participant within 2 seconds
- ⚠️ Never leave the tank unattended when filled with water
- ⚠️ If lightning is detected within 10 miles: evacuate the tank immediately

### Post-Event Procedures
- Ensure ALL participants are out of the water
- Drain the tank using a siphon or pump — do NOT tip the tank
- Direct drainage away from structures, electrical equipment, and walkways
- Clean and sanitize the tank interior before storage
- Inspect for damage and document any issues`,
    flashcard: {
      front: "What is the most critical safety role at a dunk tank event?",
      back: "A dedicated safety spotter who is positioned next to the tank at ALL times, can reach the participant within 2 seconds, and does nothing else during the event.",
    },
    tags: ["dunk tank", "water safety", "spotter", "drowning prevention"],
  },
  {
    id: "st-008",
    title: "Dunk Tank Water Quality & Hygiene",
    category: "setup-takedown",
    subcategory: "Dunk Tank Setup",
    content: `## Dunk Tank Water Quality & Hygiene

### Water Source
- Use clean, potable water from a municipal source or tested well
- Never fill from ponds, pools with unknown chemical levels, or untreated sources

### During the Event
- Monitor water clarity — if it becomes cloudy, consider draining and refilling
- Check water temperature periodically — extremely cold water can cause shock
- Remove any debris (grass, dirt, thrown items) from the water promptly
- If blood or bodily fluids enter the water: stop operations, drain, clean, and refill

### Sanitation
- Add a small amount of chlorine or approved sanitizer per manufacturer guidelines
- Do not over-chlorinate — this can cause skin and eye irritation
- Test sanitizer levels if the event lasts more than 4 hours

### Health Considerations
- Do not allow participants with open wounds, rashes, or known infections to enter the water
- Have clean towels available at the exit point
- Post hygiene reminders near the tank

### Post-Event Cleaning
- Drain all water — never leave standing water overnight (mosquito breeding)
- Scrub the interior with a mild bleach solution (1 tbsp per gallon)
- Rinse thoroughly with clean water
- Allow to air dry completely before storing`,
    flashcard: {
      front: "When should you stop dunk tank operations and drain the water?",
      back: "If blood or bodily fluids enter the water, if the water becomes excessively cloudy, or if lightning is detected within 10 miles.",
    },
    tags: ["dunk tank", "water quality", "hygiene", "sanitation"],
  },

  // ── Tent Anchoring ──
  {
    id: "st-009",
    title: "Tent Anchoring Procedures",
    category: "setup-takedown",
    subcategory: "Tent Setup",
    content: `## Tent Anchoring Procedures

### Surface Assessment
Before selecting an anchoring method, assess the surface type:
- **Grass/Dirt**: Stakes are the primary method
- **Concrete/Asphalt**: Weights (water barrels, concrete blocks, sandbags) required
- **Gravel/Decomposed Granite**: Auger stakes or weights depending on depth
- **Wooden Deck**: Weights only — NEVER stake through a deck

### Stake Anchoring (Grass/Dirt)
1. Drive stakes at a 45-degree angle, leaning AWAY from the tent
2. Use a minimum 24-inch stake for pop-up tents, 36-inch for frame tents
3. Drive stakes until only 2-3 inches remain above ground
4. Attach ratchet straps or ropes to stakes — NOT bungee cords
5. Each leg must have its own anchor point — no sharing between legs

### Weight Anchoring (Hard Surfaces)
- Minimum weight per leg:
  - 10x10 pop-up: 40 lbs per leg (160 lbs total)
  - 20x20 frame tent: 100 lbs per leg (minimum)
  - 20x40 frame tent: 150 lbs per leg (minimum)
- Use water barrels, concrete blocks, or commercial tent weights
- Secure weights to the tent frame with ratchet straps
- NEVER use loose sandbags alone — they can shift

### Wind Considerations
- ⚠️ Do NOT set up tents if sustained winds exceed 25 mph
- ⚠️ If gusts exceed 35 mph during an event: evacuate the tent immediately
- Remove sidewalls in high wind conditions to reduce sail effect
- Monitor weather forecasts throughout the event
- Have a wind contingency plan discussed with the customer before setup

### Inspection After Setup
- Walk around the tent and verify every anchor point is secure
- Check that fabric is taut but not overstressed at any point
- Ensure all guy lines are visible and marked to prevent tripping
- Verify tent is level — adjust leg heights if needed

### Common Mistakes
- 🛑 Using only 1-2 anchors on a 4-leg tent
- 🛑 Using bungee cords instead of ratchet straps
- 🛑 Failing to remove sidewalls in wind
- 🛑 Setting up under power lines or tree branches
- 🛑 Not checking stakes after the first hour (soil loosening)`,
    flashcard: {
      front: "At what wind speed should you NOT set up a tent?",
      back: "Do not set up if sustained winds exceed 25 mph. If gusts exceed 35 mph during an event, evacuate the tent immediately. Remove sidewalls in high wind to reduce sail effect.",
    },
    tags: ["tent", "anchoring", "stakes", "wind", "weights"],
  },
  {
    id: "st-010",
    title: "Tent Emergency Weather Protocol",
    category: "setup-takedown",
    subcategory: "Tent Setup",
    content: `## Tent Emergency Weather Protocol

### Wind Escalation Plan

**Level 1: Moderate Wind (15-25 mph)**
- Remove all sidewalls to reduce wind load
- Check all anchor points — re-tighten straps
- Secure any loose items under or near the tent
- Alert the customer and monitor conditions

**Level 2: High Wind (25-35 mph)**
- Evacuate all people from under the tent
- If safe to do so, collapse the tent canopy
- Do NOT attempt to take down the full tent frame in high wind — it becomes a sail
- Move to a safe distance and monitor

**Level 3: Severe Wind / Storm (35+ mph)**
- Full evacuation — move everyone indoors or to vehicles
- Do NOT approach the tent — structural failure risk
- Call emergency services if the tent becomes airborne or causes damage
- Document damage with photos for insurance

### Lightning Protocol
- If thunder is heard or lightning is seen: evacuate the tent IMMEDIATELY
- Tents provide ZERO protection from lightning
- Move to an enclosed building or hard-topped vehicle
- Wait 30 minutes after the last lightning strike before resuming

### Rain & Water Pooling
- Tent canopies are NOT designed to hold water weight — pooling can cause collapse
- If water begins pooling, push it off from underneath with a broom handle
- Adjust peak height to ensure proper water runoff
- Never allow guests under a tent with visible water pooling

### Post-Storm Inspection
- Inspect all structural connections before allowing re-entry
- Check for bent poles, torn fabric, or shifted anchors
- If ANY structural damage is found, do NOT allow re-entry — take the tent down
- Document all damage and notify the office immediately`,
    flashcard: {
      front: "Do tents protect from lightning?",
      back: "NO. Tents provide ZERO protection from lightning. Evacuate immediately if thunder is heard or lightning is seen. Wait 30 minutes after the last strike before resuming.",
    },
    tags: ["tent", "weather", "lightning", "emergency", "wind"],
  },

  // ── Water Slide Safety ──
  {
    id: "st-011",
    title: "Water Slide Safety Protocols",
    category: "setup-takedown",
    subcategory: "Water Slide Setup",
    content: `## Water Slide Safety Protocols

### Pre-Setup Site Assessment
- Flat, level surface with a slight downhill slope in the slide direction
- Within 50 feet of a garden hose water source with adequate pressure
- Clear of rocks, roots, fence posts, and other ground hazards
- Drainage path identified — water runoff must not enter neighboring properties or structures
- Minimum 15-foot clearance from the slide exit in the landing direction

### Setup Procedure
1. Lay out the unit on the approved surface — inspect for tears, holes, or damage
2. Connect the blower(s) and fully inflate before connecting water
3. Anchor ALL tie-down points per manufacturer specs — water slides experience more force than dry inflatables
4. Connect the garden hose to the water inlet(s)
5. Turn on water and verify even distribution across the slide surface
6. Test the slide yourself or with a crew member before opening to participants
7. Place non-slip mats at the entry stairs and exit/splash area

### Participant Rules
- One slider at a time — wait until the previous slider has exited the splash zone
- Feet-first, sitting position ONLY — no diving, headfirst, standing, or flipping
- Remove shoes, glasses, jewelry, belt buckles, and any sharp accessories
- Appropriate swim attire required — no buttons, zippers, or rivets
- Height and weight restrictions per manufacturer specs must be enforced
- Children under 5 require adult supervision at the bottom of the slide

### Operator Monitoring
- ⚠️ Station one attendant at the TOP of the slide (controls who goes when)
- ⚠️ Station one attendant at the BOTTOM (clears riders from splash zone)
- ⚠️ Monitor water flow every 15 minutes — dry slides cause friction burns
- ⚠️ Check anchor points every 30 minutes — water adds shifting forces

### Water Management
- Maintain consistent water flow throughout the event
- If water supply is interrupted: CLOSE the slide immediately until flow resumes
- Monitor the splash/landing area for excessive pooling — pump or redirect as needed
- Ensure runoff does not create mud pits or slip hazards in surrounding areas

### Heat & Sun Safety
- Water slides are high-exertion activities — enforce hydration breaks
- Vinyl surfaces can reach 140°F+ in direct sunlight — always run water before use
- Monitor for sunburn, especially on younger participants
- Recommend sunscreen application before sliding`,
    flashcard: {
      front: "How many attendants are required for a water slide?",
      back: "Minimum TWO: one at the TOP (controls who goes and when) and one at the BOTTOM (clears riders from the splash zone). If water flow stops, close the slide immediately.",
    },
    tags: ["water slide", "safety", "attendants", "sunburn", "friction"],
  },
  {
    id: "st-012",
    title: "Water Slide Maintenance & Inspection",
    category: "setup-takedown",
    subcategory: "Water Slide Setup",
    content: `## Water Slide Maintenance & Inspection

### Pre-Event Inspection
- Check entire slide surface for tears, holes, or worn seams
- Inspect all water inlets and connections for leaks
- Verify that the slide surface is smooth — no exposed stitching or rough patches that could cause abrasion
- Test the splash pool for proper drainage
- Confirm blower output is sufficient for the unit size

### During Event Checks (Every Hour)
- Walk the perimeter and inspect all anchor points
- Check water flow at the top, middle, and bottom of the slide
- Inspect the entry stairs for stability and grip
- Monitor splash zone depth — should not exceed manufacturer recommendations
- Check for debris on the slide surface (leaves, dirt, insects)

### Post-Event Procedures
1. Turn off water supply and disconnect hoses
2. Allow remaining water to drain from the unit
3. Deflate slowly and inspect the entire surface for new damage
4. Clean with mild soap and water — remove grass, dirt, and algae
5. Rinse thoroughly and allow to dry COMPLETELY before rolling
6. Never store a wet water slide — mold and mildew will develop within 24-48 hours

### Repair & Documentation
- Small tears (under 2 inches): Patch with a vinyl repair kit before next use
- Large tears or seam separations: Remove from service until professionally repaired
- Document ALL damage in the Equipment Condition Log
- Track repair history — units with repeated issues should be evaluated for retirement

### Storage
- Roll (never fold) once completely dry
- Store in a cool, dry location off the ground
- Keep away from rodents, sharp objects, and direct sunlight
- Label each unit with its last inspection date`,
    flashcard: {
      front: "Can you store a water slide while it's still wet?",
      back: "NEVER. Mold and mildew will develop within 24-48 hours. Always allow the slide to dry COMPLETELY before rolling and storing in a cool, dry location.",
    },
    tags: ["water slide", "maintenance", "inspection", "mold", "storage"],
  },
];
