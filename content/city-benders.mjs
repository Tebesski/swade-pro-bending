// Named encounters use the same stat builder as reusable city NPCs.
export const solo = [
  {name:"Qannik of Whale Harbor",element:"water",role:"medic",advances:8,wildcard:true,edges:["experienced-healer","fluid-stance","reliable","combat-reflexes"],
    hindrance:["vow","Treats whoever reaches the door, including triad enforcers."],title:"Night-shift clinic founder",skills:{Fighting:6,Shooting:6,Healing:12},signature:["Borrow My Breath","recovery"],
    powers:["healing","accelerated-recovery","relief","water-bubble"],appearance:"A blue wool coat over a scrubbed apron. Her hands are chapped from washing. She listens without interrupting and gets firm when someone won't sit still for treatment.",
    biography:"She started a free basement clinic after the harbor company refused care to laid-off dock crews. Her landlord has been paying for supplies without billing her. The next delivery contains a ledger the police want.",
    tactics:["Ask the walking wounded to help others indoors.","Use Healing on the worst wound first.","After the golden hour, use Accelerated Recovery."],hook:"She can identify a poisoned water supply from the first patient but needs someone to trace it without closing her ward."},
  {name:"Jae-Sun Ryu",element:"earth",role:"anchor",advances:9,wildcard:true,edges:["metalbending","mountain-stance","block","iron-jaw","deadly-assault"],
    hindrance:["shamed","An inquiry blamed him for a tunnel collapse after he refused to backdate a report."],title:"Disgraced tunnel inspector",signature:["Read the Bearing Wall","brace"],
    powers:["earth-armour","earth-shelter","advanced-earth-manipulation","seismic-sense","barrier"],appearance:"A plumb bob hangs from his coat seam, and his left eye never quite opens. He answers direct questions and checks walls before trusting a room.",
    biography:"He can navigate half-drained utility tunnels by sound. A young surveyor sometimes leaves him bread and copies of plans, but the two have never exchanged names.",
    tactics:["Brace the exit with stone.","Make opponents cross uneven ground.","Use Assault only where there's room."],hook:"The newest city plans depict a second tunnel that he swears was never there."},
  {name:"Nozami",element:"fire",role:"shooter",advances:7,wildcard:true,edges:["heatbending","leg-work","marksman","calculating"],
    hindrance:["enemy","A syndicate foreman offers double pay to any worker who identifies her."],title:"Powerhouse strike organizer",signature:["Factory Whistle","mark"],
    powers:["burst","blind","analyse-foe","jet"],appearance:"Yellow scarf, burn-speckled goggles, and deep creases around her eyes. She is blunt with foremen and checks that new workers are keeping up.",
    biography:"She ran the safety whistle for nine years and knows who works through hand cramps. Someone is using her old punch card on shifts she never worked.",
    tactics:["Stay behind the loading dock while the workers clear out.","Use Factory Whistle when a worker’s Test leaves a foe Vulnerable.","Wait for the workers to clear the floor."],hook:"She offers the crew a stack of forged timecards in exchange for helping a strikebreaker go home safely."},
  {name:"Akiak",element:"water",role:"runner",advances:4,wildcard:true,edges:["fluid-stance","fleet-footed","free-runner","alertness"],
    hindrance:["curious","Opens any package that leaks, hums, or seems heavier than it should."],title:"Ferry courier",skills:{Boating:10,Shooting:6},signature:["Over the Rail","footwork"],
    powers:["launch","quicken","water-armour"],appearance:"An oilskin satchel and two insulated boots that don't match. He asks questions fast and has trouble leaving a strange parcel alone.",
    biography:"He works the late ferry, when signals are done by lantern. Drivers know he has a trick for getting across before the crew sets the gangway.",
    tactics:["Pick a way out before you move.","Use Launch to cross a gap.","Keep moving if someone gives chase."],hook:"Two people have paid him to deliver the same letter to different addresses."},
  {name:"Yin-Hua Wen",element:"earth",role:"controller",advances:8,wildcard:true,edges:["sandbending","glassbending","bending-mastery","careful-bending","leg-work"],
    hindrance:["secret","The archive accuses her best friend of acts covered in her forged copies."],title:"Courtroom mapmaker",skills:{Academics:10,Shooting:6},signature:["Trace Evidence","cast"],
    powers:["blind","impede","earth-entangle","earth-move","advanced-earth-manipulation"],appearance:"A hand lens clips to one side of her glasses. Her fingers are stained with ink. She is patient with questions and checks details twice.",
    biography:"A surveyor taught her to feel the grit mixed into paper. She can tell originals from copies by how the pigments move when she breathes over a stamp.",
    tactics:["Use Impede to block one path.","Leave another route open.","Use Entangle if a witness is in danger."],hook:"She offers to identify the builder of a hidden vault from a smear of dried mortar."},
  {name:"Azemi Takara",element:"fire",role:"runner",advances:6,wildcard:true,edges:["leg-work","free-runner","acrobat","combat-acrobat"],
    hindrance:["obligation","Sends half of every paid job to a troupe that still thinks she broke its rigging."],title:"Stunt double on the run",skills:{Performance:10},signature:["Second Take","slip"],
    powers:["launch","quicken","burst","elemental-maneuver"],appearance:"Elbow pads bulk out her coat, and a charcoal line runs down one cheek. She makes dry jokes when nervous and stops a stunt if a crew member is at risk.",
    biography:"She doubled a famous actor for three years. A discarded reel shows an official in the audience on the night of a sealed investigation.",
    tactics:["Move to a different height to draw attention.","Use Launch to get clear.","Yield if the crew is in danger."],hook:"The reel is trapped in the scenery warehouse where her former troupe sleeps."},
  {name:"Minik",element:"water",role:"controller",advances:9,wildcard:true,edges:["fluid-stance","plantbending","icebending","redirect-energy","careful-bending"],
    hindrance:["pacifist","Will restrain a person or break equipment and avoids taking a life."],title:"Spirit-wetland keeper",signature:["The Garden Holds","takedown"],
    powers:["water-entangle","water-move","water-bubble","awareness","banish"],appearance:"Green thread runs through a thick fisher's collar. They smell of damp leaves and speak slowly, even to someone shouting.",
    biography:"They built a little garden where disturbed spirits can enter the city unnoticed. A developer bought the land above the garden without ever visiting.",
    tactics:["Put water or vines between civilians and danger.","Use Entangle to hold pursuers.","Withdraw before anyone is badly hurt."],hook:"Each time a certain tram passes, a different plant in the garden petals into glass."},
  {name:"Woon Hae-Jin",element:"earth",role:"shooter",advances:5,wildcard:true,edges:["sandbending","marksman","streetwise","danger-sense"],
    hindrance:["wanted","The city has an old warrant with a fresh fingerprint attached."],title:"Scrapyard rep",skills:{Workshop:8,Eloquence:8},signature:["Sort the Scrap","long-shot"],
    powers:["blind","burst","blast","barrier"],appearance:"A worn work apron with a red tailor's patch inside. She knows the regulars by name and keeps her voice level in an argument.",
    biography:"She used to arbitrate salvage claims at the rail yard and can still call in a favor from an inspector or a fence. The two are cousins.",
    tactics:["Throw from a narrow gate.","Block a lane with crates if you need time.","Leave space for the other side to back off."],hook:"One dismantled mecha tank has two serial plates and a pay book sealed in its seat."},
  {name:"Zanro",element:"fire",role:"controller",advances:8,wildcard:true,edges:["heatbending","careful-bending","channeling-mastery","iron-jaw","combat-reflexes"],
    hindrance:["phobia","Freezes momentarily around the sound of a sealed boiler building pressure."],title:"Disaster kitchen cook",skills:{Workshop:8,Shooting:6},signature:["Kill the Draft","cover"],
    powers:["fan-the-flames","blind","impede","deadly-elements","burst"],appearance:"A kitchen cloth holds back his hair, and smooth old burns cover his knuckles. He feeds people first and gets jumpy at the sound of a kettle under pressure.",
    biography:"He cooks on burners run from his own breath. The night he was injured, a foreman held a safety valve shut to keep a showing on schedule.",
    tactics:["Move the queue behind cover.","Use low flames to mark unsafe routes.","Hand off if a boiler starts to whistle."],hook:"A voucher for five hundred meals bears the logo of the company he has sworn to expose."},
  {name:"Kassiq of Seal Bay",element:"water",role:"shooter",advances:7,wildcard:true,edges:["fluid-stance","icebending","ice-claws","marksman","nerves-of-steel"],
    hindrance:["one-eye","Uses a sight line on her good side and hates being steered by the elbow."],title:"Former league challenger",skills:{Eloquence:8},signature:["Cold Read","opening"],
    powers:["jet","blast","water-armour","analyse-foe"],appearance:"One frosted lens, pressed trousers, and cheap trainers worn flat at the heels. She takes coaching seriously and dislikes being guided by the arm.",
    biography:"She lost a title challenge on an injury stoppage and now coaches kids who've never seen her fight. Her old opponent has been sending unsigned tournament passes.",
    tactics:["Keep the rail on your blind side.","Throw from one clear lane.","Switch only when the next lane is clear."],hook:"She wants the PCs to corner her at a small bout that is secretly a sponsor audition."},
  {name:"Lin-Qiao Sun",element:"earth",role:"runner",advances:4,wildcard:true,edges:["leg-work","free-runner","extraction","alertness"],
    hindrance:["stubborn","Will cross her old district for a delivery even when there's a safer way round."],title:"Street surveyor",skills:{Notice:10,Workshop:8},signature:["The Long Way Round","switch"],
    powers:["launch","quicken","impede","basic-elemental-manipulation"],appearance:"Grease-pencil marks run down one boot, and her jacket is rubbed white at the elbows. She is friendly about directions and stubborn about her own route.",
    biography:"Her map of walkable rooftops is more up to date than the city's printed maps. The old tram workers recognize three strike routes in it.",
    tactics:["Circle wide enough to draw someone away from the exit.","Use Impede on anyone who follows.","Keep a clear route out before closing in."],hook:"A missing intersection reappears on her map every time it rains."},
  {name:"Ayazu Senda",element:"fire",role:"anchor",advances:10,wildcard:true,edges:["leg-work","heatbending","deadly-assault","block","counterattack","strong-willed"],
    hindrance:["code","Refuses to teach someone a move until they understand how to stop it."],title:"Unlicensed defense coach",signature:["Hold the Gate","counter"],
    powers:["fan-the-flames","deadly-elements","barrier","relief","elemental-maneuver"],appearance:"A weathered coach's jacket with the district patch picked out. She corrects mistakes in a low voice and makes students practice how to stop a move.",
    biography:"She fought for an exhibition purse that vanished in a bank collapse. Now she teaches in a disused tram shed and takes vegetables instead of tuition.",
    tactics:["Let the opponent attack first.","Counter with Assault if they miss in melee.","Get pupils clear before chasing anyone."],hook:"A talented pupil has signed a contract that lists the gym as collateral."}
];

// City entries are reusable casting, faction, and encounter roles.
const city = (name,element,role,advances,title,appearance,tactics,details={})=>
  ({name,element,role,advances,title,appearance,tactics,...details});

export const districts = [
  ["R.C.P.D.",[
    city("Police Officer","earth","anchor",4,"Beat patrol","A stiff leather coat, scuffed boots, and a coil of city cable. They speak formally on duty and repeat an instruction before raising their voice.",["Separate the two sides.","Use Entangle with the metal cable if someone bolts."],
      {edges:["metalbending","mountain-stance","alertness"],powers:["earth-entangle","earth-armour","barrier"],hindrance:["obligation","Files a statement before the shift ends, even if it means missing a lead."],guard:"Patrol coat",armor:1,skills:{Bending:10}}),
    city("Police Sergeant","earth","anchor",8,"Watch commander","Rolled sleeves show uniform bracers worn at both wrists. They give short orders and stay close to new officers.",["Set a line while officers clear bystanders.","Entangle anyone who breaks through."],
      {wounds:1,edges:["metalbending","block","command","hold-the-line","combat-reflexes"],powers:["earth-entangle","earth-move","earth-armour","impede"],hindrance:["loyal","Steps in when a junior officer freezes."],guard:"Duty vest",armor:2,skills:{Bending:10}}),
    city("Detective","fire","controller",5,"Plainclothes investigator","A lacquered pencil sticks out of a coat pocket. The badge stays inside the coat. They let silences run and follow new clues quickly.",["Use Analyse Foe on the suspect, then Test with Eloquence.","Move them away from witnesses before fighting."],
      {edges:["investigator","streetwise","alertness","careful-bending"],powers:["analyse-foe","awareness","blind","boost-lower-trait"],hindrance:["curious","Follows a fresh clue while the scene is still unsecured."],skills:{Academics:8,Research:8,Eloquence:8}}),
    city("Chief of Police — Seiran Toma","earth","anchor",9,"Police chief","Graying temples, a straight-backed stance, and a field whistle on a frayed cord. She asks officers for specifics and gives them time to answer.",["Assign a lane to each unit.","Use Entangle to restrain a suspect with metal."],
      {wildcard:true,edges:["metalbending","block","improved-block","command","tactician","inspire"],powers:["earth-entangle","earth-move","earth-armour","seismic-sense"],hindrance:["code","Will not use a witness's child to get testimony."],signature:["Clear the Street","support"],guard:"Chief's field vest",armor:2,skills:{Bending:10,Battle:8},
        biography:"Toma came up through the port watch and still eats at its canteen every third morning. The officer who trained her runs the very unit under investigation.",
        hook:"She asks the group to escort a witness the department officially believes never existed."})
  ]],
  ["Triple Threat Triad",[
    city("Triad Corner Lookout","earth","runner",0,"Triple Threat lookout","A bakery apron with flour at the hem and a small whistle tucked into a pocket. He looks to the regular caller when he's unsure.",["Blow the whistle before leaving the corner.","Use Impede to slow pursuit."],
      {edges:["alertness","fleet-footed"],powers:["impede","launch","blind"],hindrance:["hesitant","Waits for a second signal when the regular caller is absent."]}),
    city("Triad Debt Collector","fire","shooter",4,"Triple Threat collector","A smoke-stained pocket notebook and a dark coat shiny at the elbows. They smile when counting money and get impatient with excuses.",["Use fire to intimidate.","Get behind cover before attacking.","Leave once the debt is paid."],
      {wounds:1,edges:["streetwise","heatbending","leg-work"],powers:["blind","burst","deadly-elements"],hindrance:["greedy","Will take a second payment if offered."],skills:{Intimidation:8}}),
    city("Triple Threat Crew Boss — Tokhan","water","controller",8,"Triple Threat crew boss","Pearl collar stays over a plain shirt and boots with cracked toes. He is courteous until someone threatens his crew.",["Split pursuers at a street corner.","Entangle one, then give the others a way out.","Go back for a cut-off crew member."],
      {wildcard:true,edges:["fluid-stance","icebending","command","combat-reflexes","streetwise"],powers:["water-entangle","water-move","jet","impede"],hindrance:["loyal","Will go back for a crew member who was left behind."],signature:["Take the Side Door","switch"],armor:1})
  ]],
  ["Red Monsoon Triad",[
    city("Red Monsoon Wharf Runner","water","runner",0,"Red Monsoon scout","Soft-soled boots and a blue rag around his neck. He talks fast and often passes along rumors before checking them.",["Cross through shallow water when you can.","Report what you saw, then withdraw."],
      {edges:["fluid-stance","fleet-footed"],powers:["launch","impede","elemental-maneuver"],hindrance:["big-mouth","His rumors get ahead of his reports."],skills:{Boating:8}}),
    city("Red Monsoon Ice Hand","water","anchor",4,"Red Monsoon escort","Gloves cut open across the knuckles and a thick wool collar. They block doorways without saying much and expect people to take the hint.",["Hold the doorway in Defensive Stance.","Use Elemental Maneuver to disarm the first pursuer."],
      {wounds:1,edges:["fluid-stance","icebending","ice-claws","counterattack"],powers:["water-armour","water-entangle","elemental-maneuver"],hindrance:["ruthless","Keeps a hostage in the cold to get the group's attention."]}),
    city("Red Monsoon Lieutenant — Kaali of the North","water","controller",8,"Red Monsoon lieutenant","A sea-gray coat and two rings made from old coins. She speaks quietly in public and keeps her private business separate from the crew.",["Hold the crew back until the pressure eases.","Use ice to block an exit."],
      {wildcard:true,edges:["fluid-stance","icebending","careful-bending","level-headed","strong-willed"],powers:["water-entangle","water-armour","water-move","elemental-vortex"],hindrance:["secret","Quietly pays damages to the families her crew hurt."],signature:["Freeze the Crossing","takedown"],armor:1})
  ]],
  ["Circus & Movers",[
    city("Silk-Line Acrobat","fire","runner",0,"Circus aerialist","Chalked palms, half-shaved hair, and a red silk sash worn high on the waist. They like applause and sometimes try a move before rehearsing it.",["Get above the threat and move away.","Use fire only if someone threatens the rig."],
      {edges:["acrobat","free-runner","fleet-footed"],powers:["launch","elemental-maneuver","blind"],hindrance:["overconfident","Will attempt a new stunt during a live show."],skills:{Athletics:8,Performance:8}}),
    city("Living Statue Performer","earth","anchor",0,"Street and circus performer","A coat painted to look like cracked bronze and stiff makeup along the jaw. They hold a pose through awkward silences and rarely break character.",["Take cover behind the plinth.","Cast Impede once the last spectator passes."],
      {edges:["mountain-stance","alertness"],powers:["earth-armour","deadly-elements","impede"],hindrance:["quirk","Will stay in character until someone says the agreed word."],skills:{Performance:8}}),
    city("Water Ribbon Ringmaster","water","controller",4,"Touring circus ringmaster","Blue cuffs, a folding stage baton, and boots polished at the toes. She projects her voice clearly and checks on the troupe before counting receipts.",["Call out the nearest exits.","Cast Shelter across the exit before moving the audience."],
      {wildcard:true,edges:["fluid-stance","bolster","reliable","acrobat"],powers:["water-shelter","water-armour","quicken","blind"],hindrance:["obligation","Will always pay the animals' keep before her own lodging."],signature:["Eyes on the Ring","support"],skills:{Performance:10,Athletics:8}}),
    city("Mover Effects Rigger","earth","controller",4,"Studio rigger","Calf wraps, a grease-pencil slate, and dust streaks on both shoulders. They speak in measurements and stop work when a rig shifts.",["Brace the set with Barrier.","Call out distances while people get clear."],
      {edges:["improvisational-fighter","leg-work","careful-bending"],powers:["barrier","earth-shelter","earth-move","impede"],hindrance:["cautious","Stops the shoot whenever the rig moves off its pencil mark."],skills:{Workshop:10,Performance:6}})
  ]],
  ["United Republic Army",[
    ["1st Battalion · Fire Infantry",[
      city("1st Battalion Fire Rifleman","fire","shooter",0,"Line infantry","An orange collar tab and a blue field pack worn pale at the straps. They follow the rally plan closely and keep count of their partner's shots.",["Throw from cover.","Withdraw with a partner to the rally point."],
        {edges:["soldier","leg-work","alertness"],powers:["burst","deadly-elements","blind"],hindrance:["obligation","Returns to the assigned rally point even when the fight moves."],armor:1}),
      city("1st Battalion Fire Sergeant","fire","shooter",5,"Infantry section leader","An old set of ear guards and a loose tan scarf. They know the section by name and do a head count before every move.",["Alternate Hurl with the section.","Use Jet once the last ally clears the lane.","Bring the last pair out before you withdraw."],
        {wounds:1,edges:["soldier","command","marksman","leg-work"],powers:["jet","blast","deadly-elements"],hindrance:["loyal","Refuses to withdraw without the last pair."],armor:2})]],
    ["2nd Battalion · Earth Engineers",[
      city("2nd Battalion Sapper","earth","controller",4,"Field engineer","Site drawings folded into a belt and mud packed around the boot seams. They want a second look at a crossing before letting anyone use it.",["Raise cover for the squad.","Keep an exit open.","Check the crossing before sending anyone over."],
        {edges:["soldier","mountain-stance","careful-bending"],powers:["barrier","earth-shelter","earth-move","advanced-earth-manipulation"],hindrance:["cautious","Insists on a second inspection before troops cross."],armor:1,skills:{Workshop:8}}),
      city("2nd Battalion Earth Captain","earth","anchor",8,"Engineer officer","Survey glasses on a cord and a hand counter polished from use. They ask who is still inside before agreeing to pull a wall down.",["Call out a safe route before raising cover.","Hold the gap while the sappers work."],
        {wildcard:true,edges:["soldier","command","tactician","block","mountain-stance"],powers:["barrier","earth-armour","seismic-sense","earth-move"],hindrance:["code","Won't demolish an occupied home."],signature:["Keep That Lane Open","brace"],armor:2,skills:{Battle:8}})]],
    ["3rd Battalion · Water Infantry",[
      city("3rd Battalion River Scout","water","runner",4,"Water infantry scout","A damp bandanna, stained cuffs, and a short rope coiled flat. They are quiet while scouting and curious about unmarked crossings.",["Let the other side cross first.","Find a safe route back and report."],
        {edges:["soldier","fluid-stance","free-runner","extraction"],powers:["quicken","launch","water-move"],hindrance:["curious","Inspects an unmarked crossing despite orders."],armor:1,skills:{Boating:8,Stealth:8}}),
      city("3rd Battalion Field Medic","water","medic",4,"Water infantry medic","A small medic patch and an old canteen with a dent across the cap. They speak gently to patients and won't leave one behind.",["Stay behind cover.","Use Relief or Healing once the patient is safe.","Screen the evacuation with water."],
        {wounds:1,edges:["soldier","fluid-stance","experienced-healer","bolster"],powers:["healing","accelerated-recovery","relief","water-shelter"],hindrance:["heroic","Won't leave a patient because the position is under pressure."],armor:1})]],
    ["4th Battalion · Fire Mechanized",[
      city("4th Battalion Mecha Tank Pilot","fire","mechanic",5,"Mecha tank crew","A flight cap hangs from a goggle strap. Their sleeve cuffs smell of machine oil. They are eager to try new controls and quick to volunteer for a test run.",["Use Vehicles in the tank.","On foot, hold a lane with fire while the crew recovers it."],
        {wounds:1,edges:["ace","soldier","leg-work","improvisational-fighter"],powers:["burst","blind","quicken"],hindrance:["driven","Uses the experimental mode when the old one would work."],armor:1,skills:{Vehicles:10,Workshop:8},mecha:"Fire support"}),
      city("4th Battalion Mecha Mechanic","fire","mechanic",4,"Mechanized recovery crew","Striped gloves and a spanner tucked into a boot. They don't like calling a machine a loss until they've checked it themselves.",["Work near cover.","Use heat to free a stuck part.","Fall back if the position comes under fire."],
        {edges:["ace","heatbending","alertness"],powers:["relief","advanced-elemental-manipulation","blind"],hindrance:["stubborn","Insists every abandoned machine can be retrieved."],skills:{Vehicles:8,Workshop:10},armor:1})]],
    ["5th Battalion · Earth Mechanized",[
      city("5th Battalion Mecha Tank Pilot","earth","mechanic",5,"Earth mechanized crew","A gray helmet marked with grease-pencil sight lines and a scuffed knee brace. They double-check calls from the recovery crew before moving.",["Use Vehicles in the tank.","On foot, raise cover for the recovery crew."],
        {wounds:1,edges:["ace","soldier","mountain-stance","combat-reflexes"],powers:["earth-armour","barrier","earth-move"],hindrance:["hesitant","Waits to confirm the recovery team's call."],skills:{Vehicles:10,Workshop:8},armor:1,mecha:"Line breaker"}),
      city("5th Battalion Recovery Sergeant","earth","anchor",8,"Mechanized recovery lead","Old unit numbers are crossed out on a leather shoulder patch. They check seats for trapped crew and distrust secondhand reports about a wreck.",["Open a path for the recovery rig.","Hold the path with earth until everyone is clear."],
        {wounds:2,edges:["soldier","command","hold-the-line","mountain-stance","block"],powers:["earth-armour","earth-move","earth-shelter","barrier"],hindrance:["loyal","Never calls a vehicle empty without seeing the seat."],armor:2,skills:{Vehicles:8,Workshop:8}})]]
  ]],
  ["United Republic Navy",[
    city("Deckhand","water","runner",0,"United Forces Navy","A knot board hangs beside a waterproof roll of tape. They are quick with a joke and notice when someone misses a watch call.",["Cover a teammate's move with water.","Move to the next safe spot on deck."],
      {edges:["fluid-stance","fleet-footed"],powers:["launch","water-armour","relief"],hindrance:["loyal","Returns for the deckhand who missed the signal."],skills:{Boating:8}}),
    city("Firebending Gunnery Mate","fire","shooter",5,"Shipboard gunnery","A heat cuff marked with a gun station number and soot along the collar. They correct range calls sharply and go quiet when sighting a shot.",["Support the gun crew with a range call.","On foot, stay still for a Marksman Hurl."],
      {wounds:1,edges:["soldier","marksman","leg-work","heatbending"],powers:["burst","jet","deadly-elements"],hindrance:["stubborn","Insists on their own range call."],skills:{Boating:6},armor:1}),
    city("Naval Rescue Diver","water","medic",5,"Fleet search and rescue","A float line tied with colored knots and padding worn thin at one shoulder. They speak plainly and will dive for a rival if they can reach them.",["Use a Safe Water Bubble to bring a trapped sailor up.","Bring survivors to shelter before treating them."],
      {wounds:1,edges:["fluid-stance","experienced-healer","reliable"],powers:["water-bubble","healing","accelerated-recovery","water-move"],hindrance:["vow","Never abandons a reachable person in the water."],skills:{Boating:10,Athletics:8}}),
    city("Commander — Zaiyo Naho","fire","controller",9,"Patrol vessel commander","A white jacket, steel glasses, and a pencil sharpened at both ends. They give calm orders and hear out reports from the lowest rank first.",["Keep a route open for the crew.","Use Battle to Support the crew at its station.","Use Blind if someone boards the ship."],
      {wildcard:true,edges:["command","tactician","inspire","heatbending","combat-reflexes"],powers:["fan-the-flames","blind","awareness","blast"],hindrance:["code","Promises safe passage even to a crew the Admiralty dislikes."],signature:["All Hands, Stand Fast","recovery"],armor:1,skills:{Boating:8,Battle:8}})
  ]],
  ["Civic Services & Trades",[
    city("Waterbending Clinic Medic","water","medic",4,"Public-health service","A water sling across one shoulder and a small patient book with a cracked spine. They ask before touching a wound and avoid fights in the clinic.",["Support from a safe position.","Use Healing for wounds or Relief for fatigue."],
      {edges:["fluid-stance","experienced-healer","reliable"],powers:["healing","accelerated-recovery","relief"],hindrance:["pacifist","Leaves a fight rather than strike a patient."],skills:{Healing:10}}),
    city("Fire Brigade Responder","water","runner",4,"Fire and rescue","An orange hood with a guide rope tied flat to the back. They count people as they come out and go back when someone calls for help.",["Move water across the fire while the building empties.","Put a barrier between the smoke and the exit."],
      {wounds:1,edges:["fluid-stance","brave","free-runner"],powers:["water-shelter","water-move","barrier","quicken"],hindrance:["heroic","Heads back in for an unanswered shout."]}),
    city("Lightning Plant Operator","fire","controller",4,"Utility shift worker","An insulated apron patched over a burn and gloves worn white at the knuckles. They take shutoffs seriously and won't leave a trainee alone at the controls.",["Clear people away from the equipment.","Use Elemental Protection before handling hot equipment."],
      {edges:["lightningbending","heatbending","alertness"],powers:["blind","deadly-elements","advanced-elemental-manipulation"],hindrance:["obligation","Will not abandon the emergency shutoff."],skills:{Bending:12,Workshop:8}}),
    city("Tram Track Bender","earth","mechanic",0,"Transit maintenance","Grease-dark sleeves, chalk in one pocket, and a red hand flag. They argue calmly with anyone who wants a damaged line reopened.",["Use earth to put cover around the work site.","Keep civilians on the far side of the tracks."],
      {edges:["alertness","danger-sense"],powers:["earth-armour","impede","shield"],hindrance:["stubborn","Argues against reopening an unsafe line."],skills:{Vehicles:6,Workshop:8}}),
    city("Arena Equipment Marshal","earth","anchor",4,"Pro-bending arena staff","A bronze clipboard and a sack of chipped practice discs. They check a friend's gear as strictly as a rival's.",["Keep the crowd back.","Wait for floor staff to clear the lane before closing in."],
      {wounds:1,edges:["mountain-stance","alertness","block"],powers:["earth-armour","earth-shelter","deadly-elements"],hindrance:["code","Has barred a captain who was also a relative."],armor:1}),
    city("Harbor Salvage Diver","water","controller",4,"Civilian dock cooperative","A weighted sash with four salvage tags and a dented float. They listen for taps on the hull and are hard to call back from a find.",["Move debris with water.","Use ice to block the hazard.","Get the crew above it."],
      {wounds:1,edges:["fluid-stance","icebending","danger-sense"],powers:["water-bubble","water-move","water-entangle"],hindrance:["curious","Goes back to investigate unexplained taps on the hull."],skills:{Boating:8,Workshop:8}})
  ]]
];
