// name, element, role, individual trait, appearance, tactics, Hindrance, and optional signature move
export const tiers = [
  {name:"Low",advances:0,wounds:[1,0],wildcards:[false,false],color:"#687050"},
  {name:"Mid",advances:4,wounds:[2,0],wildcards:[false,false],color:"#457777"},
  {name:"High",advances:8,wounds:[2,1],wildcards:[false,false],color:"#82613f"},
  {name:"Pro",advances:9,wounds:[3,2],wildcards:[true,false],color:"#964b43"},
  {name:"Super Pro",advances:10,wounds:[3,3],wildcards:[true,true],color:"#735385"}
];

// Keep the Actor UUIDs from 1.2.0 so existing links still find the same roster slot.
export const teamActorIds = [
  ["0e15dc60f54f0f86","b489d7406aaf4dc1","3c1252f79ea20d37"],
  ["e30d76ebb72147ca","a0c8f446dbf4331b","351be7f5b8a491c8"],
  ["88528fcd970f4dd4","787d6780ab0ab6c0","59c2016b374f6279"],
  ["e0c222f2c6d37813","82cacc33a95f37dc","415957507a45c9bd"],
  ["a0ef7b73d09fcf7e","ddd4431432d0b83c","573e1100d4e8e077"],
  ["eda9768902a3cfab","2be0ea7988acf987","fd013cfa8556bfd4"],
  ["8fc0f8c0f052fd03","b741a6d1ceaf01fd","3329a471fd4af62a"],
  ["c1f07306adcbed20","365aaa1f6cde4a90","dda7b2d94639af4d"],
  ["7b7146842ec63a17","4e973225de40c437","d2eadd56051fdd97"],
  ["3a1c73bee25c32c8","1f4f3954a6327d71","198c4c43f61c8385"],
  ["4747dd489427702d","55a005c2d39640ba","74f9bb772e8c6235"],
  ["0c2c3e809c207791","284fe51dc1d0921b","4bed2f8e3debd314"],
  ["45eebc754292dbd8","341c562858f4a1fb","a67a1770255b7da6"],
  ["3a764a7a8a243002","c7222661243817e2","2ebd56805976f70d"],
  ["aa9dc030b8c119a6","07b9704cf99f74f3","7c0abd8a884f2f8b"],
  ["6841c8cb148a3dfc","da597b13770e6a1a","fbe95453edb97f56"],
  ["0833308f119729e9","3b90c0f6adcf8b04","40d592277cd53ac9"],
  ["548d54f1a05278b9","88884bd80f83601d","244fdf44848cc146"],
  ["a0252fda292fedd8","e336c7543c4213c9","26b4b307c251df6b"],
  ["7a31b538e634524a","d27e20d1b0ae63da","0b50b2346b1ac8fa"]
];

export const teams = [
  ["Canal Eels",[
    ["Nanuq","water","runner","Boating","Short, with a chipped front tooth and green wraps over both wrists. She talks quietly and checks on her teammates between rounds.",["Slow the outside lane with Impede, then back up.","Use Undertow Feint if someone follows."],"loyal","Leaves a scoring position to cover a shaken teammate.","Undertow Feint","slip"],
    ["Tao Ren","earth","anchor","Workshop","Broad shoulders, close-cut hair, and a tin knee guard fixed with a kettle hinge. He argues when asked to give ground.",["Hold the center while Nanuq backs up.","Disarm the first opponent who follows her."],"stubborn","Insists on retaking a lane he already lost."],
    ["Kezan","fire","shooter","Sleight of Hand","A singed eyebrow, straight black hair, and cuffs he keeps spotless. He jokes when nervous and gives away more than he means to.",["Throw from the opposite lane to draw attention.","Aim at the first opponent to turn toward Nanuq."],"big-mouth","Tells the radio announcer which feint he plans to use."]
  ]],
  ["Cinder Moths",[
    ["Aseno Hase","fire","shooter","Performance","Tall, with a narrow face and loose white sleeves stained with soot. He grins after a miss and likes to try the harder shot.",["Use Performance to Test a pursuer.","Use Porchlight Feint after a Test leaves them Distracted."],"overconfident","Shoots for a raise when a safe shot would win the exchange.","Porchlight Feint","feint-shot"],
    ["Yuka of the North","water","controller","Healing","A long black braid and padded blue gloves with the fingertips worn through. She checks on injured opponents before arguing about points.",["Cast Impede beside Bao to funnel pursuers into his lane.","Back off if someone gets hurt."],"cautious","Will cede a point to check an injured opponent."],
    ["Bao","earth","runner","Stealth","Thin, with close-set eyes and work boots cut low at the heel. He looks away when people ask how he spends his evenings.",["Stay wide until Yuka pushes someone your way.","Use Assault when they turn to face her."],"secret","His family thinks he works gate security."]
  ]],
  ["Tin Badgermoles",[
    ["Ren Qiao","earth","anchor","Intimidation","Stocky, with thick forearms and a tin belt buckle worn smooth. He speaks plainly and has more patience with rookies than officials.",["Hold the center and let the other team come to you.","Use Badgermole Brace when you need to stay put."],"obligation","Refuses away bouts that clash with his youth class.","Badgermole Brace","brace"],
    ["Ikkat","water","shooter","Notice","A round face and a bead bracelet over his right glove. He watches people closely and asks what they mean when they joke.",["Wait for an opponent to cross the center line.","Use Water Hurl while Ren holds them there."],"suspicious","Reads an honest pause as a trick."],
    ["Yori","fire","runner","Athletics","Long-legged, with red bootlaces and a dancer's warmup coat. She gets competitive when the crowd cheers for someone else.",["Wait until Ren has drawn attention.","Sprint up the open side for a quick throw."],"jealous","Takes a risky second pass when a teammate gets the crowd."]
  ]],
  ["Harbor Kites",[
    ["Aputik","water","controller","Boating","A wide face, hair tied with a sailor's knot, and scuffed blue pads. She gives short instructions and waits for an answer.",["Send teammates across in pairs.","Use Three Whistles to Support a teammate."],"quirk","Will only signal and move on a completed exhale.","Three Whistles","support"],
    ["Yun-Seo Min","earth","anchor","Eloquence","A yellow scarf under a plain collar and the posture of someone used to standing still. He listens carefully and won't press an injured opponent.",["Use Armour in Earth on the first teammate across.","Hold your lane if the whistle is missed."],"pacifist","Will give up a point if the only target is an injured athlete."],
    ["Kazumi","fire","shooter","Performance","Small, with a blunt fringe and a tiny bell sewn inside one cuff. She is polite before a bout and takes heckling personally.",["Throw from behind the teammate who crosses first.","Wait for the next signal if the pair gets split."],"thin-skinned","Loses her rhythm when the crowd laughs at a miss."]
  ]],
  ["Kiln Hounds",[
    ["Sazana Mori","fire","runner","Athletics","Orange ankle wraps cover an old skin graft. She leans in when she talks and moves before others have finished their sentence.",["Start in the outside lane.","Use Kiln Rush for a close Assault in Offensive Stance."],"impulsive","Breaks formation if an opponent backs up too early.","Kiln Rush","close"],
    ["Jianhua Xu","earth","anchor","Workshop","Heavyset, with straight green cuffs and two fingers taped together. He downplays injuries and doesn't like being taken off the floor.",["Stay in the middle until the defense shifts.","Put a Barrier across the lane Sazana leaves."],"driven","Keeps playing through a minor injury and hides it from the corner."],
    ["Hamu","water","controller","Boating","A blue mouthguard and a rope scar across one palm. He remembers slights and rarely talks about a loss.",["Cut off anyone retreating from Sazana.","Use Elemental Maneuver to make the first pursuer Vulnerable."],"vengeful","Deliberately attacks the ex-coach's favorite pupil first."]
  ]],
  ["Brass Beetles",[
    ["Baijin","earth","anchor","Healing","Square jaw, brass buckles, and shoulder pads one size too large. He checks everyone else's straps before tightening his own.",["Invite a rush, then take cover in Defensive Stance.","Use Beetle Shell while under ranged pressure."],"heroic","Steps out of position when anyone looks hurt.","Beetle Shell","cover"],
    ["Azan Kaji","fire","shooter","Eloquence","Shined boots, a neatly trimmed fringe, and a grin that shows when he's anxious. He is deferential around former coaches.",["Stay out wide while Baijin draws the rush.","Stay still for a Marksman Hurl when an opponent turns toward him."],"vow","Never embarrasses a former mentor in public."],
    ["Amka of Whale Harbor","water","runner","Stealth","A shaved temple and white soles that show every scrape. She keeps her gear mended and doesn't complain about long hours.",["Circle behind anyone pressing Baijin.","Use Healing on Baijin if he takes a wound."],"poverty","Takes an extra dock shift if the purse is delayed."]
  ]],
  ["Lotus Otters",[
    ["Tullik","water","controller","Healing","Broad hands and sleeves rolled to the same height. He speaks slowly and sometimes asks for a call to be repeated.",["Slow the pace and call one play at a time.","Use Lotus Reset before rolling to recover."],"hesitant","Waits for a second signal when two openings appear.","Lotus Reset","recovery"],
    ["Akemi Tada","fire","shooter","Notice","Old jersey numbers show through a fresh coat of paint. She watches the announcer's booth and keeps her plans to herself.",["Throw when Tullik calls the play.","Stop pressing when he calls for a reset."],"enemy","The radio spotter feeds her rivals details between matches."],
    ["Wen Qing","earth","runner","Stealth","Slim, with cropped hair and an enamel pin tucked inside his glove. He sticks to routines even when the rest of the team is in a hurry.",["Stay outside the center lane.","Lay Impede behind the opponent Akemi draws out."],"habit","Must check the pin before every fresh start."]
  ]],
  ["Stonegull Flyers",[
    ["Dai Lin","earth","shooter","Notice","A faded cap and chalk ground into both thumbs. He gives the reserves the same attention as the starters.",["Keep opponents at long range.","Stand still in Balanced Stance and use Gull's Dive."],"loyal","Turns down better offers and protects the reserves.","Gull's Dive","long-shot"],
    ["Ivalu","water","runner","Athletics","A high ponytail tied with small shells and a long stride. She grins when someone takes the bait and is slow to call it off.",["Back away to draw a pursuer.","Turn back when Dai has a clear shot."],"overconfident","Keeps baiting after the trap has served its purpose."],
    ["Shinra","fire","anchor","Intimidation","Square glasses, a stiff collar, and a spare pair taped inside his bag. He is calm when ahead and dislikes needless risks.",["Hold the middle while Dai keeps his distance.","Answer a missed melee attack with Counterattack."],"bad-eyes","His spare pair fits badly and long range suffers if both are lost."]
  ]],
  ["Jade Ferrymen",[
    ["Kuan Peng","earth","anchor","Intimidation","A boxer's nose and a ferry token sewn inside his padded vest. He is courteous with rivals and stops when someone can't defend themselves.",["Hold the lane people use to get away.","Use Ferry Post when you need to stand your ground."],"code","Will never finish a downed or clearly helpless rival.","Ferry Post","brace"],
    ["Sialuk","water","controller","Boating","Light on his feet, with pale rope scars across one palm. He asks how unfamiliar moves work, even in the middle of a bout.",["Use Impede to close the lane beside Kuan.","Change angles if they spread out."],"curious","Experiments with the oddest tactic an opponent brings."],
    ["Enzo Mori","fire","shooter","Eloquence","Red goggles with the maker's mark painted out. He speaks softly but takes a promise about his lane seriously.",["Throw from the opposite side of Sialuk.","Hold your lane until Kuan closes the gap."],"stubborn","Insists on winning the lane he promised to take."]
  ]],
  ["Saffron Mantises",[
    ["Azuna Hayase","fire","runner","Sleight of Hand","Gold cuffs, closely cropped hair, and a crooked salute. She jokes with teammates and stiffens around academy judges.",["Wait for an opponent to miss in melee.","On your action, use Mantis Counter for one Assault."],"shamed","An academy judge can still make her lose her composure.","Mantis Counter","counter"],
    ["Ke Duan","earth","anchor","Workshop","Short nails, a blue sash with hidden pockets, and a habit of looking under the pads. He takes things apart to see how they work.",["Use Entangle to hold one foe in the center.","Keep a clear lane for whoever comes back first."],"curious","Tests a gadget between rounds even when told to wait."],
    ["Saaniq","water","runner","Athletics","A lacquered hair clip and thin pads that leave his shoulders free. He talks easily until someone brings up his old coach.",["Keep the far lane in range of Water Hurl.","Cut back when an opponent turns to follow."],"thin-skinned","Chases opponents who mention the scandal."]
  ]],
  ["Moonpool Rays",[
    ["Nuvak of the North","water","controller","Healing","A narrow face and a moon patch covering a tear inside one sleeve. He speaks softly and checks where everyone is before he commits.",["Use Move to pull an opponent across the lane.","In Balanced Stance, use Moonpool Sweep with Entangle."],"cautious","Will abandon a clever setup if a teammate is isolated.","Moonpool Sweep","cast"],
    ["Xiulan","earth","shooter","Notice","Pale throwing glove, dark chin strap, and watchful eyes. She inspects her equipment herself and doesn't trust free replacements.",["Watch the center and wait for someone to stop there.","Throw when Nuvak pushes them across."],"suspicious","Distrusts gifts and checks even fresh practice discs."],
    ["Zerika Ito","fire","runner","Stealth","Bleached hair sticks out beneath her plain headgear. She taps her boots when waiting for a call and rushes when the crowd starts counting.",["Cross lanes with Nuvak on the signal.","Cast Elemental Barrage across the open lane."],"impulsive","Sprints when the audience starts counting aloud."]
  ]],
  ["Basalt Jackals",[
    ["Oren Tsai","earth","shooter","Notice","A low gray visor, thick collar, and quarry dust in the seams of his shoes. He treats newcomers fairly and takes his work shifts seriously.",["Use Elemental Maneuver to make one rival Vulnerable.","Use Jackal's Mark on a Vulnerable target."],"obligation","Still covers quarry shifts whenever someone calls in sick.","Jackal's Mark","mark"],
    ["Miri Nakano","fire","runner","Athletics","A short jacket with mismatched sleeves and a fast, upright stride. She likes praise and checks who gets credit for a point.",["Start on a different target from Oren.","Switch to his target once he calls it."],"jealous","Disregards a teammate's call after they earn a close point."],
    ["Narik","water","anchor","Intimidation","Blue braces and a thick neck. He speaks slowly until someone repeats a foul, then lets them hear about it.",["Hold the center while the others pick a target.","Cover their retreat if the rush fails."],"hothead","Threatens repeat offenders even when the referee is watching."]
  ]],
  ["Lantern Wolves",[
    ["Zairen Inoue","fire","shooter","Eloquence","A red silk band over scuffed school pads. He speaks formally to reporters and refuses to go back on a promise.",["Open in Balanced Stance with Lantern Volley.","Keep throwing while the others cover your retreat."],"loyal","Keeps a promise on camera even when it costs the team.","Lantern Volley","opening"],
    ["Ikana","water","controller","Healing","A silver braid and white wraps marked with round numbers. She takes pride in clean setups and repeats them if someone calls them luck.",["Stay a step behind Zairen.","Push back anyone who tries to cut off his retreat."],"proud","Will repeat a failed play if someone calls it a lucky trick."],
    ["Han Ji-Won","earth","anchor","Intimidation","A scar splits one eyebrow above a heavy brow. He asks why before agreeing to an official's request.",["Stay behind both teammates.","Hold the lane they need to retreat through."],"suspicious","Assumes a warning from any official has a price attached."]
  ]],
  ["Pearl Breakers",[
    ["Arnaq","water","controller","Boating","A pearl button replaces her old captain's badge. She is blunt with officials and quick to notice when a teammate is hurting.",["Give ground and let someone follow.","Use Breakwater Turn with Entangle on a displaced, Distracted pursuer."],"enemy","The league secretary wants grounds to disqualify her again.","Breakwater Turn","takedown"],
    ["Shu Lian","earth","anchor","Workshop","A broad waist, rolled sleeves, and a grease-stained towel folded into thirds. He accepts criticism once someone shows him the problem.",["Close the gap Arnaq leaves.","Hold it while she turns on the pursuer."],"stubborn","Won't believe a teammate unless they can show him the flaw."],
    ["Meiko","fire","runner","Athletics","A blunt fringe and orange soles that flash when she runs. She dislikes waiting and talks over long explanations.",["Wait for Arnaq to draw someone in.","Use Fire Hurl from the side once the pursuer commits."],"impatient","Cuts the setup short before the opponent's back foot moves."]
  ]],
  ["Iron Terrapins",[
    ["Goro Zheng","earth","anchor","Healing","A silver-streaked beard and faded green pads. He speaks patiently and won't waste breath chasing a taunt.",["Hold the center and let the others spread out.","Use Terrapin Brace before taking a hit."],"slow","Won't chase an opponent around the perimeter.","Terrapin Brace","brace"],
    ["Kiraza Naho","fire","shooter","Notice","A porcelain elbow guard covers an old fracture. She keeps conversations with sponsors short and prefers to handle her own gear.",["Stay a step forward of Sialiq.","Throw once the push against Goro stalls."],"vow","Turns down time outs offered by the sponsor's doctor."],
    ["Sialiq","water","controller","Boating","Neatly mended blue sleeves and thick-soled soft boots. He can sound stubborn about safety and will step in if a rival is hurt.",["Stay a step behind Kiraza.","Use Elemental Maneuver to leave Kiraza’s target Vulnerable."],"pacifist","Will redirect force and give up damage when someone is in danger."]
  ]],
  ["Crimson Herons",[
    ["Rin Arai","fire","runner","Performance","Crimson wraps and a straight-backed dancer's stance. She is competitive and would rather meet a rival head-on than take an easy point.",["Change lanes early with Heron Step.","Give Ituq a clear line to throw through."],"arrogant","Insists on meeting champions at full strength when a safer route exists.","Heron Step","footwork"],
    ["Ituq","water","shooter","Boating","A long braid held by a shell clasp and weathered hands. He pauses to check the wind even when others say it makes no difference.",["Set up where Rin can cross in front of you.","Throw when the far lane opens."],"quirk","Takes off a glove to feel the wind before his first shot."],
    ["Kai-An Zhen","earth","anchor","Eloquence","A chipped stone pendant and worn green boots. They let quieter teammates finish speaking before giving their own view.",["Hold the far lane open for Rin.","Fall back to Ituq if the lane is blocked."],"obligation","Promises the reserves a say, even when the captain disagrees."]
  ]],
  ["Obsidian Cranes",[
    ["Jian Zhen","earth","anchor","Eloquence","A black-cuffed jersey with a repaired seam and years of wear at both knees. He gives short calls and stops to check on hurt opponents.",["Hold the center until the team is set.","In Balanced Stance, open the final round with Crane's Landing."],"code","Will concede a result before exploiting an opponent's injury.","Crane's Landing","champion"],
    ["Tazuko","fire","shooter","Notice","Amber goggles, white ankle wraps, and a sprinter's stance. She likes making her own calls and accepts a fair loss.",["Watch the lane beside Jian.","Throw at anyone drawn into his lane."],"proud","Won't abandon a fair challenge just because she can pass it off."],
    ["Vakka of the South","water","controller","Healing","A short white braid and a dark blue jersey with pale cuffs. They remember old friends and check on them even across team lines.",["Cover Jian while he holds the center.","Use Launch to get a teammate clear."],"loyal","Can be drawn away from a clean shot to help an old friend."]
  ]],
  ["Solar Komodos",[
    ["Raezan Kaji","fire","runner","Intimidation","A small sunburst is sewn into her jersey number. She talks fast and agrees to more public events than she can fit in.",["Press the outside lane first.","In Offensive Stance, use Sunline Press with Assault."],"driven","Keeps agreeing to publicity bouts she cannot safely fit in.","Sunline Press","close"],
    ["Ukuq","water","controller","Athletics","Copper beads sit close against cropped hair. They check wet ground carefully before committing to a move.",["Watch for an opponent trying to stop Raezan.","Use water to open a second route."],"cautious","Checks footing twice if the ring is wet."],
    ["Deng Hao","earth","anchor","Workshop","A plain uniform with an old red sash and worn leather boots. He keeps to himself when sponsors come around.",["Hold the space Raezan leaves.","Throw at anyone trying to pass through it."],"enemy","A manufacturer's fixer has threatened to expose his old debts."]
  ]],
  ["Whitecap Leviathans",[
    ["Issaluk","water","controller","Healing","A white neck wrap, weathered cheeks, and a measured voice. They make time for reserves and don't raise their voice to hurry them.",["Give ground until the other team commits.","Use Whitecap Recovery if the first volley leaves you Shaken."],"obligation","Insists on giving two old reserves warmup time.","Whitecap Recovery","recovery"],
    ["Venzu Ishida","fire","shooter","Notice","A red scarf, one clouded eye, and a shoulder brace that clicks. He is particular about which rail he starts beside.",["Set up beside the rail on your blind side.","Use Analyse Foe on the rival covering your lane."],"one-eye","Wants the same rail every bout so his blind side is covered."],
    ["Yoona Park","earth","runner","Stealth","Tall and soft-footed, with close-cut hair and one knee pad tied with cord. She trusts rehearsed plans when the crowd gets loud.",["Back up in your assigned lane.","Turn and move when Issaluk calls the counter."],"hesitant","Favors a rehearsed line over an unexpected but stronger opening."]
  ]],
  ["Celadon Dragons",[
    ["Ming Lan","earth","controller","Eloquence","A green visor cracked down the middle and gloves patched at both thumbs. She explains plays patiently and refuses to call ones they haven't practiced.",["Rotate who leads at the start of each round.","Use Dragon Turn when opponents guess the route."],"stubborn","Rejects any play she cannot teach to the entire roster.","Dragon Turn","switch"],
    ["Rei Kazan","fire","runner","Athletics","Gold laces and a short cape they take off before the bout. They talk loudly and often forget the other corner can hear them.",["Move up when it's your turn to lead.","Switch lanes as soon as Ming calls it."],"big-mouth","Talks loudly enough for a nearby corner to hear the call."],
    ["Luak","water","shooter","Boating","A neat bun and a plain turquoise jersey. He is even-tempered and still makes time for village meetings.",["Throw from the lane the lead leaves open.","Use Impede if a rival closes that lane."],"obligation","Leaves early when the village assembly meets."]
  ]]
];
