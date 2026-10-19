// Rig guide. Rigs with `image` use the illustrations in /public; the rest use
// a generated line diagram built from `diagram`.

export const RIGS = [
  {
    id: 'carolina',
    name: 'CAROLINA RIG',
    target: 'RED DRUM / HEAVY SURF',
    image: '/rigs/carolina.webp',
    parts: [
      { label: 'MAIN LINE', spec: '10-20 LB' },
      { label: 'BULLET WEIGHT', spec: '1/4-1 OZ' },
      { label: 'BEAD', spec: 'OPTIONAL' },
      { label: 'SWIVEL', spec: 'SIZE 7-10' },
      { label: 'LEADER + HOOK', spec: '2-4 FT / 8-15 LB + CIRCLE HOOK' },
    ],
    howItWorks:
      'THE WEIGHT (2) SLIDES ON THE MAIN LINE AND RESTS ON THE BOTTOM. THE SWIVEL (4) STOPS IT AND LETS THE LEADER (5) DRIFT THE BAIT NATURALLY. A FISH CAN PICK UP THE BAIT WITHOUT FEELING THE WEIGHT.',
    tips: ['USE A CIRCLE HOOK FOR RED DRUM. DO NOT SET IT, JUST REEL TIGHT.', 'SHORTEN THE LEADER TO 6 IN FOR SHEEPSHEAD ON PILINGS.'],
  },
  {
    id: 'double-drop',
    name: 'DOUBLE DROP RIG',
    target: 'WHITING / SPOT / POMPANO / DRUM',
    image: '/rigs/dbldrp.webp',
    parts: [
      { label: 'MAIN LINE', spec: '10-20 LB' },
      { label: 'SWIVEL', spec: 'SIZE 7-10' },
      { label: 'DROPPER (TOP)', spec: '6-12 IN / 8-12 LB + HOOK' },
      { label: 'DROPPER (BOTTOM)', spec: '12-24 IN / 8-12 LB + HOOK' },
    ],
    howItWorks:
      'TWO BAITS, ONE RIG. THE TOP DROPPER (3) RIDES ABOVE THE BOTTOM WHILE THE BOTTOM DROPPER (4) SITS WHERE FISH FEED. TIE A PYRAMID OR BANK SINKER TO THE END TO HOLD IN THE SURF.',
    tips: ['SMALL #4-#6 HOOKS FOR WHITING AND SPOT.', 'ADD A FLOAT BEAD ABOVE EACH HOOK FOR POMPANO.'],
  },
  {
    id: 'jig',
    name: 'JIG & SOFT PLASTIC',
    target: 'FLOUNDER / TROUT / BACKWATERS',
    image: '/rigs/sftplstc.webp',
    parts: [
      { label: 'MAIN LINE', spec: '10-20 LB' },
      { label: 'JIG HEAD', spec: '1/8-3/8 OZ' },
      { label: 'SOFT PLASTIC', spec: 'MATCH THE HATCH' },
    ],
    howItWorks:
      'THE JIG HEAD (2) ADDS WEIGHT AND ACTION. THE SOFT PLASTIC (3) GIVES REALISTIC MOVEMENT. HOP IT SLOWLY ALONG THE BOTTOM AND LET IT FALL ON A SEMI-SLACK LINE.',
    tips: ['FLOUNDER: PAUSE 2-3 SEC AFTER THE THUMP BEFORE SETTING THE HOOK.', 'GULP! 3" MULLET OR SHRIMP IN NATURAL COLORS.'],
  },
  {
    id: 'spoon',
    name: 'SPOON / GOTCHA PLUG',
    target: 'SPANISH / BLUEFISH / PIER',
    diagram: 'spoon',
    parts: [
      { label: 'MAIN LINE', spec: '15-20 LB' },
      { label: 'BALL-BEARING SWIVEL', spec: 'SIZE 3-5 / STOPS LINE TWIST' },
      { label: 'LEADER', spec: '2-3 FT / 30 LB FLUORO' },
      { label: 'SPOON OR GOTCHA', spec: '1/2-1 OZ / SILVER OR WHITE' },
    ],
    howItWorks:
      'CAST FAR, LET IT SINK A COUNT, THEN RIP IT BACK FAST. SPEED TRIGGERS SPANISH AND BLUES. THE SWIVEL (2) KEEPS A SPINNING SPOON FROM TWISTING YOUR LINE.',
    tips: ['NO SNAPS OR SHINY HARDWARE: BLUES WILL HIT THEM AND CUT THE LINE.', 'DAWN ON A CLEAR, CALM, INCOMING TIDE IS PRIME.'],
  },
  {
    id: 'popping-cork',
    name: 'POPPING CORK',
    target: 'SPECKLED TROUT / RED DRUM',
    diagram: 'cork',
    parts: [
      { label: 'MAIN LINE', spec: '10-15 LB' },
      { label: 'POPPING CORK', spec: 'CONCAVE TOP' },
      { label: 'LEADER', spec: '18-36 IN / 20 LB FLUORO' },
      { label: 'HOOK + BAIT', spec: '1/0 KAHLE / LIVE SHRIMP OR PLASTIC' },
    ],
    howItWorks:
      'A SHARP TWITCH MAKES THE CORK (2) POP AND CLICK, WHICH SOUNDS LIKE FEEDING FISH. THE BAIT (4) HANGS BELOW AT THE DEPTH THE LEADER (3) SETS. WORKS OVER OYSTER BEDS AND GRASS EDGES.',
    tips: ['SET LEADER LENGTH SO THE BAIT HANGS JUST OFF THE BOTTOM.', 'POP, PAUSE 5-10 SEC, REPEAT.'],
  },
]

export const rigById = (id) => RIGS.find((r) => r.id === id)
