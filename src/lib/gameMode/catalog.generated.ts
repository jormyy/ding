// AUTO-GENERATED FROM modes/*.yaml — DO NOT EDIT. Run `npm run modes:gen`.

import type { DingGameModeDefinition } from "./types";

export const GAME_MODE_DEFINITIONS: readonly DingGameModeDefinition[] = [
  {
    "id": "ding",
    "name": "Classic Ding",
    "shortName": "Classic",
    "summary": "The original cooperative hold'em ranking game.",
    "detail": "Two private cards, five shared board cards, strongest poker hand wins.",
    "family": "hand",
    "tags": [],
    "tier": "standard",
    "deal": {
      "holeCards": 2,
      "communityCards": 5
    },
    "score": "high"
  },
  {
    "id": "anti-memory",
    "name": "Anti-Memory",
    "shortName": "Anti-Memory",
    "summary": "Seen cards fade while unseen cards surface.",
    "detail": "The board starts fully visible, then progressively hides through river before reveal restores truth.",
    "family": "tempo",
    "tags": [
      "phase-tempo",
      "info-public"
    ],
    "tier": "insanity",
    "deal": {
      "holeCards": 2,
      "communityCards": 5,
      "visibleCommunityCards": {
        "preflop": 5,
        "flop": 2,
        "turn": 1,
        "river": 0,
        "reveal": 5
      }
    },
    "infoFeatures": [
      "anti-memory"
    ],
    "score": "high"
  },
  {
    "id": "avalanche",
    "name": "Avalanche",
    "shortName": "Avalanche",
    "summary": "The board buries the table in seven community cards by river.",
    "detail": "The flop shows three cards, the turn jumps to five, and the river piles on two more so reveal lands on a seven-card community board.",
    "family": "tempo",
    "tags": [
      "big-hands",
      "phase-tempo",
      "info-public"
    ],
    "tier": "wild",
    "deal": {
      "holeCards": 2,
      "communityCards": 7,
      "visibleCommunityCards": {
        "flop": 3,
        "turn": 5,
        "river": 7,
        "reveal": 7
      }
    },
    "infoFeatures": [
      "avalanche"
    ],
    "score": "high"
  },
  {
    "id": "behemoth",
    "name": "Behemoth",
    "shortName": "Behemoth",
    "summary": "Nine community cards are dealt; best five-card poker hand wins.",
    "detail": "The river dumps the rest of a huge board, creating a crowded final comparison across eleven available cards.",
    "family": "hand",
    "tags": [
      "big-hands",
      "info-public"
    ],
    "tier": "twist",
    "deal": {
      "holeCards": 2,
      "communityCards": 9,
      "visibleCommunityCards": {
        "lobby": 0,
        "preflop": 0,
        "flop": 3,
        "turn": 4,
        "river": 9,
        "reveal": 9
      }
    },
    "score": "high"
  },
  {
    "id": "big-sky",
    "name": "Big Sky",
    "shortName": "Big Sky",
    "summary": "A seven-card board gives every hand more ways to connect.",
    "detail": "The board grows to four on the flop, five on the turn, and seven on the river.",
    "family": "tempo",
    "tags": [
      "big-hands",
      "phase-tempo",
      "info-public"
    ],
    "tier": "standard",
    "deal": {
      "holeCards": 2,
      "communityCards": 7,
      "visibleCommunityCards": {
        "lobby": 0,
        "preflop": 0,
        "flop": 4,
        "turn": 5,
        "river": 7,
        "reveal": 7
      }
    },
    "score": "high"
  },
  {
    "id": "big-sky-select",
    "name": "Big Sky Select",
    "shortName": "Sky+",
    "summary": "Peek 3 cards and sculpt your start for the seven-card Big Sky board.",
    "detail": "A select-stage Big Sky: each hand sees three private candidates and sculpts a two-card start before the board grows to four on flop, five on turn, and seven on river.",
    "family": "selection",
    "tags": [
      "peek-keep",
      "phase-tempo",
      "big-hands"
    ],
    "tier": "chaos",
    "deal": {
      "holeCards": 2,
      "dealChoice": {
        "dealtCards": 3,
        "keepCards": 2,
        "selectionPhase": true
      },
      "communityCards": 7,
      "visibleCommunityCards": {
        "lobby": 0,
        "preflop": 0,
        "flop": 4,
        "turn": 5,
        "river": 7,
        "reveal": 7
      }
    },
    "score": "high"
  },
  {
    "id": "blackout",
    "name": "Blackout",
    "shortName": "Blackout",
    "summary": "No community cards are shown until the river.",
    "detail": "The first three streets are pure private-hand debate, then the board lands all at once.",
    "family": "tempo",
    "tags": [
      "phase-tempo",
      "info-public"
    ],
    "tier": "twist",
    "deal": {
      "holeCards": 2,
      "communityCards": 5,
      "visibleCommunityCards": {
        "lobby": 0,
        "preflop": 0,
        "flop": 0,
        "turn": 0,
        "river": 5,
        "reveal": 5
      }
    },
    "score": "high"
  },
  {
    "id": "brightest-out",
    "name": "Brightest Out",
    "shortName": "Brightest",
    "summary": "The highest hole card in every hand is public from the start.",
    "detail": "Each hand exposes its brightest private card, giving the table a high-card anchor while the lower card stays hidden until reveal.",
    "family": "info",
    "tags": [
      "info-public"
    ],
    "tier": "twist",
    "deal": {
      "holeCards": 2,
      "publicCards": 1,
      "publicCardSelection": "highest",
      "communityCards": 5
    },
    "score": "high"
  },
  {
    "id": "card-decoy",
    "name": "Card Decoy",
    "shortName": "Decoy",
    "summary": "Six community cards are dealt; one is a decoy that does not score, but the chip does not say which.",
    "detail": "The felt grows to a six-card row across flop/turn/river and a chip warns that one community card does not score, but the decoy is not marked on the felt — players cannot identify it without inference.",
    "family": "tempo",
    "tags": [
      "big-hands",
      "phase-tempo",
      "info-public"
    ],
    "tier": "chaos",
    "deal": {
      "holeCards": 2,
      "communityCards": 6,
      "visibleCommunityCards": {
        "flop": 4,
        "turn": 5,
        "river": 6,
        "reveal": 6
      },
      "scoreCommunityCards": 5
    },
    "infoFeatures": [
      "card-decoy"
    ],
    "score": "high"
  },
  {
    "id": "card-memorial",
    "name": "Card Memorial",
    "shortName": "Memorial",
    "summary": "A memorial sixth board card appears at reveal as a tribute to discards.",
    "detail": "The board grows from three to six community cards across streets, and the extra card joins the felt at reveal as memorial information only.",
    "family": "tempo",
    "tags": [
      "big-hands",
      "phase-tempo",
      "info-public"
    ],
    "tier": "insanity",
    "deal": {
      "holeCards": 2,
      "communityCards": 6,
      "visibleCommunityCards": {
        "flop": 3,
        "turn": 4,
        "river": 5,
        "reveal": 6
      },
      "scoreCommunityCards": 5
    },
    "infoFeatures": [
      "card-memorial"
    ],
    "score": "high"
  },
  {
    "id": "card-multiverse",
    "name": "Card Multiverse",
    "shortName": "Multiverse",
    "summary": "Four parallel five-card boards play out as alternate universes.",
    "detail": "Twenty community cards form four separate five-card boards; each hand scores against its strongest universe at reveal.",
    "family": "environment",
    "tags": [
      "multi-board",
      "phase-tempo",
      "big-hands"
    ],
    "tier": "insanity",
    "deal": {
      "holeCards": 2,
      "communityCards": 20,
      "boardLayout": {
        "kind": "grid",
        "slots": [
          {
            "row": 0,
            "col": 0,
            "group": "universe-a"
          },
          {
            "row": 0,
            "col": 1,
            "group": "universe-a"
          },
          {
            "row": 0,
            "col": 2,
            "group": "universe-a"
          },
          {
            "row": 0,
            "col": 3,
            "group": "universe-a"
          },
          {
            "row": 0,
            "col": 4,
            "group": "universe-a"
          },
          {
            "row": 1,
            "col": 0,
            "group": "universe-b"
          },
          {
            "row": 1,
            "col": 1,
            "group": "universe-b"
          },
          {
            "row": 1,
            "col": 2,
            "group": "universe-b"
          },
          {
            "row": 1,
            "col": 3,
            "group": "universe-b"
          },
          {
            "row": 1,
            "col": 4,
            "group": "universe-b"
          },
          {
            "row": 2,
            "col": 0,
            "group": "universe-c"
          },
          {
            "row": 2,
            "col": 1,
            "group": "universe-c"
          },
          {
            "row": 2,
            "col": 2,
            "group": "universe-c"
          },
          {
            "row": 2,
            "col": 3,
            "group": "universe-c"
          },
          {
            "row": 2,
            "col": 4,
            "group": "universe-c"
          },
          {
            "row": 3,
            "col": 0,
            "group": "universe-d"
          },
          {
            "row": 3,
            "col": 1,
            "group": "universe-d"
          },
          {
            "row": 3,
            "col": 2,
            "group": "universe-d"
          },
          {
            "row": 3,
            "col": 3,
            "group": "universe-d"
          },
          {
            "row": 3,
            "col": 4,
            "group": "universe-d"
          }
        ]
      },
      "boards": {
        "count": 4,
        "cardsPerBoard": 5,
        "scoring": "best"
      },
      "visibleCommunityIndexes": {
        "lobby": [],
        "preflop": [],
        "flop": [
          0,
          1,
          2,
          5,
          6,
          7,
          10,
          11,
          12,
          15,
          16,
          17
        ],
        "turn": [
          0,
          1,
          2,
          3,
          5,
          6,
          7,
          8,
          10,
          11,
          12,
          13,
          15,
          16,
          17,
          18
        ],
        "river": [
          0,
          1,
          2,
          3,
          4,
          5,
          6,
          7,
          8,
          9,
          10,
          11,
          12,
          13,
          14,
          15,
          16,
          17,
          18,
          19
        ],
        "reveal": [
          0,
          1,
          2,
          3,
          4,
          5,
          6,
          7,
          8,
          9,
          10,
          11,
          12,
          13,
          14,
          15,
          16,
          17,
          18,
          19
        ]
      }
    },
    "infoFeatures": [
      "card-multiverse"
    ],
    "score": "high"
  },
  {
    "id": "card-resurrection",
    "name": "Card Resurrection",
    "shortName": "Resurrect",
    "summary": "Discarded cards reappear as community cards.",
    "detail": "Each hand is dealt three, keeps two automatically, and the discarded cards join the board at reveal.",
    "family": "tempo",
    "tags": [
      "big-hands",
      "late-detonation",
      "info-public"
    ],
    "tier": "insanity",
    "deal": {
      "holeCards": 3,
      "keepCards": 2,
      "communityCards": 5,
      "visibleCommunityCards": {
        "reveal": 22
      },
      "discardedCardsToCommunity": true
    },
    "infoFeatures": [
      "card-resurrection"
    ],
    "score": "high"
  },
  {
    "id": "cascade",
    "name": "Cascade",
    "shortName": "Cascade",
    "summary": "The oldest visible board cards fade face-down as streets advance.",
    "detail": "One more early community card becomes unknown at each board street, while reveal restores the true board.",
    "family": "info",
    "tags": [
      "info-public"
    ],
    "tier": "twist",
    "deal": {
      "holeCards": 2,
      "communityCards": 5,
      "visibleCommunityCardDetails": {
        "flop": {
          "0": "hidden"
        },
        "turn": {
          "0": "hidden",
          "1": "hidden"
        },
        "river": {
          "0": "hidden",
          "1": "hidden",
          "2": "hidden"
        }
      }
    },
    "score": "high"
  },
  {
    "id": "color-showing",
    "name": "Color Showing",
    "shortName": "Colors",
    "summary": "Every hole-card color is public, but ranks and suits stay hidden.",
    "detail": "The table sees red/black texture from the deal while exact ranks and suits remain private until reveal.",
    "family": "info",
    "tags": [
      "info-public"
    ],
    "tier": "standard",
    "deal": {
      "holeCards": 2,
      "visibleHoleCards": {
        "preflop": 2,
        "flop": 2,
        "turn": 2,
        "river": 2,
        "reveal": 2
      },
      "visibleHoleCardDetail": "color",
      "communityCards": 5
    },
    "score": "high"
  },
  {
    "id": "communal-glance",
    "name": "Communal Glance",
    "shortName": "Glance",
    "summary": "The table sees one random hole-card slot.",
    "detail": "One shared hole-card anchor per hand is public for the hand, preserving symmetric information.",
    "family": "info",
    "tags": [
      "info-public"
    ],
    "tier": "chaos",
    "deal": {
      "holeCards": 2,
      "visibleHoleCards": {
        "preflop": 1,
        "flop": 1,
        "turn": 1,
        "river": 1,
        "reveal": 2
      },
      "communityCards": 5
    },
    "infoFeatures": [
      "communal-glance"
    ],
    "score": "high"
  },
  {
    "id": "crawl",
    "name": "Crawl",
    "shortName": "Crawl",
    "summary": "The board crawls out slowly before completing at river.",
    "detail": "One card is visible preflop, then the board inches forward before the final two cards arrive at river.",
    "family": "tempo",
    "tags": [
      "phase-tempo",
      "info-public"
    ],
    "tier": "twist",
    "deal": {
      "holeCards": 2,
      "communityCards": 5,
      "visibleCommunityCards": {
        "lobby": 0,
        "preflop": 1,
        "flop": 2,
        "turn": 3,
        "river": 5,
        "reveal": 5
      }
    },
    "score": "high"
  },
  {
    "id": "cross",
    "name": "Cross",
    "shortName": "Cross",
    "summary": "Five community cards form a cross; every hand scores on its better line.",
    "detail": "The center card belongs to both the row and the column, so hands can connect along either axis.",
    "family": "info",
    "tags": [
      "info-public"
    ],
    "tier": "chaos",
    "deal": {
      "holeCards": 2,
      "communityCards": 5,
      "boardLayout": {
        "kind": "grid",
        "slots": [
          {
            "row": 1,
            "col": 0
          },
          {
            "row": 0,
            "col": 1
          },
          {
            "row": 1,
            "col": 1,
            "group": "center"
          },
          {
            "row": 2,
            "col": 1
          },
          {
            "row": 1,
            "col": 2
          }
        ]
      },
      "boards": {
        "cardIndexes": [
          [
            0,
            2,
            4
          ],
          [
            1,
            2,
            3
          ]
        ],
        "scoring": "best"
      },
      "visibleCommunityCards": {
        "lobby": 0,
        "preflop": 0,
        "flop": 3,
        "turn": 4,
        "river": 5,
        "reveal": 5
      }
    },
    "score": "high"
  },
  {
    "id": "dark-flop",
    "name": "Dark Flop",
    "shortName": "Dark F",
    "summary": "The flop stays face-down until turn.",
    "detail": "No community cards are visible at flop; the board catches up at turn.",
    "family": "tempo",
    "tags": [
      "phase-tempo",
      "info-public"
    ],
    "tier": "twist",
    "deal": {
      "holeCards": 2,
      "communityCards": 5,
      "visibleCommunityCards": {
        "lobby": 0,
        "preflop": 0,
        "flop": 0,
        "turn": 4,
        "river": 5,
        "reveal": 5
      }
    },
    "score": "high"
  },
  {
    "id": "dark-river",
    "name": "Dark River",
    "shortName": "Dark R",
    "summary": "The river card shows only its suit until reveal.",
    "detail": "The first four board cards are normal, but the final river card keeps its rank hidden until reveal.",
    "family": "info",
    "tags": [
      "info-public"
    ],
    "tier": "twist",
    "deal": {
      "holeCards": 2,
      "communityCards": 5,
      "visibleCommunityCardDetails": {
        "river": {
          "4": "suit"
        }
      }
    },
    "score": "high"
  },
  {
    "id": "darkest-out",
    "name": "Darkest Out",
    "shortName": "Darkest",
    "summary": "The lowest hole card in every hand is public from the start.",
    "detail": "Each hand exposes its darkest private card, giving the table a low-card anchor while the higher card stays hidden until reveal.",
    "family": "info",
    "tags": [
      "info-public"
    ],
    "tier": "twist",
    "deal": {
      "holeCards": 2,
      "publicCards": 1,
      "publicCardSelection": "lowest",
      "communityCards": 5
    },
    "score": "high"
  },
  {
    "id": "double-river",
    "name": "Double River",
    "shortName": "2 River",
    "summary": "The river reveals two final community cards.",
    "detail": "Six-card boards create dramatic final re-sorts without changing the core loop.",
    "family": "hand",
    "tags": [
      "big-hands",
      "info-public"
    ],
    "tier": "standard",
    "deal": {
      "holeCards": 2,
      "communityCards": 6,
      "visibleCommunityCards": {
        "lobby": 0,
        "dealChoice": 0,
        "preflop": 0,
        "flop": 3,
        "turn": 4,
        "river": 6,
        "reveal": 6
      }
    },
    "score": "high"
  },
  {
    "id": "eclipse-color",
    "name": "Eclipse Color",
    "shortName": "Eclipse C",
    "summary": "Community cards show only red or black until reveal.",
    "detail": "The board exposes color pressure while hiding exact ranks and suits until the final reveal.",
    "family": "info",
    "tags": [
      "info-public"
    ],
    "tier": "twist",
    "deal": {
      "holeCards": 2,
      "communityCards": 5,
      "visibleCommunityCardDetail": {
        "preflop": "color",
        "flop": "color",
        "turn": "color",
        "river": "color"
      }
    },
    "score": "high"
  },
  {
    "id": "eclipse-rank",
    "name": "Eclipse Rank",
    "shortName": "Eclipse R",
    "summary": "Community cards show ranks only until reveal.",
    "detail": "The board's rank structure is visible, but suits stay hidden until the final reveal.",
    "family": "info",
    "tags": [
      "info-public"
    ],
    "tier": "twist",
    "deal": {
      "holeCards": 2,
      "communityCards": 5,
      "visibleCommunityCardDetail": {
        "preflop": "rank",
        "flop": "rank",
        "turn": "rank",
        "river": "rank"
      }
    },
    "score": "high"
  },
  {
    "id": "eclipse-suit",
    "name": "Eclipse Suit",
    "shortName": "Eclipse S",
    "summary": "Community cards show suits only until reveal.",
    "detail": "The board's suit texture is visible, but ranks stay hidden until the final reveal.",
    "family": "info",
    "tags": [
      "info-public"
    ],
    "tier": "twist",
    "deal": {
      "holeCards": 2,
      "communityCards": 5,
      "visibleCommunityCardDetail": {
        "preflop": "suit",
        "flop": "suit",
        "turn": "suit",
        "river": "suit"
      }
    },
    "score": "high"
  },
  {
    "id": "flash-flop",
    "name": "Flash Flop",
    "shortName": "Flash",
    "summary": "The flop is visible before anyone ranks a hand.",
    "detail": "Players start with real board context, so early rankings are less random.",
    "family": "tempo",
    "tags": [
      "phase-tempo",
      "info-public"
    ],
    "tier": "twist",
    "deal": {
      "holeCards": 2,
      "communityCards": 5,
      "visibleCommunityCards": {
        "lobby": 0,
        "dealChoice": 0,
        "preflop": 3,
        "flop": 3,
        "turn": 4,
        "river": 5,
        "reveal": 5
      }
    },
    "score": "high"
  },
  {
    "id": "flash-river",
    "name": "Flash River",
    "shortName": "Flash R",
    "summary": "The full board is visible before anyone ranks a hand.",
    "detail": "All five community cards are public at preflop, turning the whole hand into immediate table-reading.",
    "family": "tempo",
    "tags": [
      "phase-tempo",
      "info-public"
    ],
    "tier": "twist",
    "deal": {
      "holeCards": 2,
      "communityCards": 5,
      "visibleCommunityCards": {
        "lobby": 0,
        "dealChoice": 0,
        "preflop": 5,
        "flop": 5,
        "turn": 5,
        "river": 5,
        "reveal": 5
      }
    },
    "score": "high"
  },
  {
    "id": "flopless",
    "name": "Flopless",
    "shortName": "Flopless",
    "summary": "No flop; turn deals 4 board cards at once.",
    "detail": "The flop street passes empty; turn slams down four community cards in a single beat, compressing decisions into the back half.",
    "family": "tempo",
    "tags": [
      "phase-tempo",
      "info-public"
    ],
    "tier": "twist",
    "deal": {
      "holeCards": 2,
      "communityCards": 5,
      "visibleCommunityCards": {
        "preflop": 0,
        "flop": 0,
        "turn": 4,
        "river": 5,
        "reveal": 5
      }
    },
    "infoFeatures": [
      "flopless"
    ],
    "score": "high"
  },
  {
    "id": "fog-bank",
    "name": "Fog Bank",
    "shortName": "Fog",
    "summary": "Community cards show only their color until reveal.",
    "detail": "From flop through river the board exposes color pressure only; reveal restores ranks and suits for scoring.",
    "family": "info",
    "tags": [
      "info-public"
    ],
    "tier": "twist",
    "deal": {
      "holeCards": 2,
      "communityCards": 5,
      "visibleCommunityCardDetail": {
        "flop": "color",
        "turn": "color",
        "river": "color"
      }
    },
    "infoFeatures": [
      "fog-bank"
    ],
    "score": "high"
  },
  {
    "id": "group-mind",
    "name": "Group Mind",
    "shortName": "Group",
    "summary": "Everyone sees one shared hole card from every hand.",
    "detail": "One public hole-card anchor per hand rotates as shared table knowledge across phases.",
    "family": "info",
    "tags": [
      "info-public"
    ],
    "tier": "chaos",
    "deal": {
      "holeCards": 2,
      "visibleHoleCards": {
        "preflop": 1,
        "flop": 1,
        "turn": 1,
        "river": 1,
        "reveal": 2
      },
      "visibleHoleCardIndexes": {
        "preflop": [
          0
        ],
        "flop": [
          1
        ],
        "turn": [
          0
        ],
        "river": [
          1
        ],
        "reveal": [
          0,
          1
        ]
      },
      "communityCards": 5
    },
    "infoFeatures": [
      "group-mind"
    ],
    "score": "high"
  },
  {
    "id": "half-lit-expose",
    "name": "Half-Lit Expose",
    "shortName": "Half X",
    "summary": "Pick which of your two hole cards rotates public each phase.",
    "detail": "A select-stage Half-Lit Holes: each hand picks one of two dealt cards to make public from the deal; the alternating-visibility rotation still shows one hole per street, but the owner controls which card anchored the table.",
    "family": "selection",
    "tags": [
      "expose-choice",
      "info-public"
    ],
    "tier": "twist",
    "deal": {
      "holeCards": 2,
      "publicCards": 1,
      "publicCardSelection": "playerChoice",
      "visibleHoleCards": {
        "preflop": 1,
        "flop": 1,
        "turn": 1,
        "river": 1,
        "reveal": 2
      },
      "visibleHoleCardIndexes": {
        "preflop": [
          0
        ],
        "flop": [
          1
        ],
        "turn": [
          0
        ],
        "river": [
          1
        ],
        "reveal": [
          0,
          1
        ]
      },
      "communityCards": 5
    },
    "infoFeatures": [
      "half-lit-holes"
    ],
    "score": "high"
  },
  {
    "id": "half-lit-holes",
    "name": "Half-Lit Holes",
    "shortName": "Half-Lit",
    "summary": "Each hand alternates which hole card is visible.",
    "detail": "One hole card is public at every street, alternating between first and second before both are revealed.",
    "family": "info",
    "tags": [
      "info-public"
    ],
    "tier": "chaos",
    "deal": {
      "holeCards": 2,
      "visibleHoleCards": {
        "preflop": 1,
        "flop": 1,
        "turn": 1,
        "river": 1,
        "reveal": 2
      },
      "visibleHoleCardIndexes": {
        "preflop": [
          0
        ],
        "flop": [
          1
        ],
        "turn": [
          0
        ],
        "river": [
          1
        ],
        "reveal": [
          0,
          1
        ]
      },
      "communityCards": 5
    },
    "infoFeatures": [
      "half-lit-holes"
    ],
    "score": "high"
  },
  {
    "id": "heat-map-expose",
    "name": "Heat Map Expose",
    "shortName": "Heat X",
    "summary": "Expose your committed hole card — signal heat or hide your intent.",
    "detail": "A select-stage Heat Map: each hand picks one of two dealt cards to make public to the table while the deck's high-vs-low heat refreshes every street through reveal.",
    "family": "selection",
    "tags": [
      "expose-choice",
      "info-public"
    ],
    "tier": "twist",
    "deal": {
      "holeCards": 2,
      "publicCards": 1,
      "publicCardSelection": "playerChoice",
      "communityCards": 5
    },
    "infoFeatures": [
      "heat-map"
    ],
    "score": "high"
  },
  {
    "id": "hidden-turn",
    "name": "Hidden Turn",
    "shortName": "Hidden T",
    "summary": "The turn card stays hidden until river.",
    "detail": "The flop is visible, but the fourth board card is withheld until the river reveal catches up.",
    "family": "tempo",
    "tags": [
      "phase-tempo",
      "info-public"
    ],
    "tier": "twist",
    "deal": {
      "holeCards": 2,
      "communityCards": 5,
      "visibleCommunityCards": {
        "lobby": 0,
        "preflop": 0,
        "flop": 3,
        "turn": 3,
        "river": 5,
        "reveal": 5
      }
    },
    "score": "high"
  },
  {
    "id": "instant-river",
    "name": "Instant River",
    "shortName": "Instant",
    "summary": "All 5 community cards visible from preflop.",
    "detail": "The board lands instantly at preflop; the only secrecy left is hole cards, and every street is just a re-ranking pass.",
    "family": "tempo",
    "tags": [
      "phase-tempo",
      "info-public"
    ],
    "tier": "twist",
    "deal": {
      "holeCards": 2,
      "communityCards": 5,
      "visibleCommunityCards": {
        "preflop": 5,
        "flop": 5,
        "turn": 5,
        "river": 5,
        "reveal": 5
      }
    },
    "infoFeatures": [
      "instant-river"
    ],
    "score": "high"
  },
  {
    "id": "l-board",
    "name": "L-Board",
    "shortName": "L-Board",
    "summary": "Nine community cards form an L with five-card arms; every hand scores on its best five-card path.",
    "detail": "Both arms of the L run five cards long and share a corner, creating overlapping five-card paths that include the pure arm, the pure stem, and the bend between them.",
    "family": "tempo",
    "tags": [
      "big-hands",
      "phase-tempo",
      "info-public"
    ],
    "tier": "chaos",
    "deal": {
      "holeCards": 2,
      "communityCards": 9,
      "boardLayout": {
        "kind": "L",
        "arm": 5,
        "stem": 5
      },
      "boards": {
        "cardIndexes": [
          [
            0,
            1,
            2,
            3,
            4
          ],
          [
            2,
            1,
            0,
            5,
            6
          ],
          [
            0,
            5,
            6,
            7,
            8
          ]
        ],
        "scoring": "best"
      },
      "visibleCommunityIndexes": {
        "lobby": [],
        "preflop": [],
        "flop": [
          0,
          1,
          2,
          5,
          6
        ],
        "turn": [
          0,
          1,
          2,
          3,
          5,
          6,
          7
        ],
        "river": [
          0,
          1,
          2,
          3,
          4,
          5,
          6,
          7,
          8
        ],
        "reveal": [
          0,
          1,
          2,
          3,
          4,
          5,
          6,
          7,
          8
        ]
      }
    },
    "score": "high"
  },
  {
    "id": "late-flop",
    "name": "Late Flop",
    "shortName": "Late Flop",
    "summary": "Flop appears at turn; turn at river; river at reveal.",
    "detail": "Every revelation is shifted one street later, so the table makes its early calls on no information at all.",
    "family": "tempo",
    "tags": [
      "phase-tempo",
      "info-public"
    ],
    "tier": "twist",
    "deal": {
      "holeCards": 2,
      "communityCards": 5,
      "visibleCommunityCards": {
        "preflop": 0,
        "flop": 0,
        "turn": 3,
        "river": 4,
        "reveal": 5
      }
    },
    "infoFeatures": [
      "late-flop"
    ],
    "score": "high"
  },
  {
    "id": "late-hand-reveal",
    "name": "Late Hand Reveal",
    "shortName": "Late Hand",
    "summary": "At the river, every hand turns face up before the final ranking.",
    "detail": "Hole cards stay private through preflop, flop, and turn, then flip publicly when the river arrives so the final read is fully open.",
    "family": "info",
    "tags": [
      "info-public"
    ],
    "tier": "chaos",
    "deal": {
      "holeCards": 2,
      "visibleHoleCards": {
        "river": 2,
        "reveal": 2
      },
      "communityCards": 5
    },
    "infoFeatures": [
      "late-hand-reveal"
    ],
    "score": "high"
  },
  {
    "id": "late-light",
    "name": "Late Light",
    "shortName": "Late",
    "summary": "Hole cards become public at the river.",
    "detail": "Hands stay private through turn, then every hole card is exposed at river before the final ranking.",
    "family": "info",
    "tags": [
      "info-public"
    ],
    "tier": "standard",
    "deal": {
      "holeCards": 2,
      "visibleHoleCards": {
        "river": 2,
        "reveal": 2
      },
      "communityCards": 5
    },
    "score": "high"
  },
  {
    "id": "late-light-inherit",
    "name": "Late Light Inherit",
    "shortName": "Late I",
    "summary": "Keep one hole card and inherit your neighbor's discard — hole cards expose at river.",
    "detail": "A select-stage Late Light: each hand keeps one dealt card while the right neighbor's discard fills the second slot, then both hole cards flip public when the river arrives.",
    "family": "selection",
    "tags": [
      "inheritance",
      "relational",
      "info-public"
    ],
    "tier": "wild",
    "deal": {
      "holeCards": 2,
      "dealChoice": {
        "dealtCards": 2,
        "keepCards": 1,
        "selectionPhase": true,
        "inheritance": true
      },
      "visibleHoleCards": {
        "river": 2,
        "reveal": 2
      },
      "communityCards": 5
    },
    "score": "high"
  },
  {
    "id": "marked-deck-expose",
    "name": "Marked Deck Expose",
    "shortName": "Mark X",
    "summary": "Choose which hole card you publicly expose in a marked deck.",
    "detail": "A select-stage Marked Deck: each hand picks one of two dealt cards to make public, with the marked card visible to the whole table as it moves through hands and board.",
    "family": "selection",
    "tags": [
      "expose-choice",
      "identity-token",
      "info-public"
    ],
    "tier": "wild",
    "deal": {
      "holeCards": 2,
      "publicCards": 1,
      "publicCardSelection": "playerChoice",
      "communityCards": 5,
      "deck": "marked"
    },
    "infoFeatures": [
      "meta-legend"
    ],
    "score": "high"
  },
  {
    "id": "memory-hole",
    "name": "Memory Hole",
    "shortName": "Mem Hole",
    "summary": "At turn, one community card is forgotten.",
    "detail": "One visible community card is replaced at turn and then masked through river.",
    "family": "environment",
    "tags": [
      "info-public",
      "weather"
    ],
    "tier": "insanity",
    "deal": {
      "holeCards": 2,
      "communityCards": 5,
      "visibleCommunityCardDetails": {
        "turn": {
          "0": "hidden"
        },
        "river": {
          "0": "hidden"
        }
      }
    },
    "phaseEffects": {
      "turn": [
        "randomReplaceVisibleCommunity"
      ]
    },
    "infoFeatures": [
      "memory-hole"
    ],
    "score": "high"
  },
  {
    "id": "mini-board",
    "name": "Mini Board",
    "shortName": "Mini",
    "summary": "Four community cards are dealt.",
    "detail": "The board gets a normal flop and one turn card, then stays fixed through river.",
    "family": "hand",
    "tags": [
      "big-hands",
      "info-public"
    ],
    "tier": "standard",
    "deal": {
      "holeCards": 2,
      "communityCards": 4,
      "visibleCommunityCards": {
        "lobby": 0,
        "preflop": 0,
        "flop": 3,
        "turn": 4,
        "river": 4,
        "reveal": 4
      }
    },
    "score": "high"
  },
  {
    "id": "mirror-board",
    "name": "Mirror Board",
    "shortName": "Mirror",
    "summary": "At the river, the board doubles into a primary row and a mirrored row.",
    "detail": "Ten community slots fan out on river street, but scoring still uses the five primary cards — the mirror row is read-only theatrics.",
    "family": "environment",
    "tags": [
      "multi-board",
      "weather",
      "phase-tempo"
    ],
    "tier": "wild",
    "deal": {
      "holeCards": 2,
      "communityCards": 5,
      "boardLayout": {
        "kind": "dual",
        "primary": 5,
        "secondary": 5,
        "secondaryRole": "mirror"
      },
      "visibleCommunityCards": {
        "lobby": 0,
        "dealChoice": 0,
        "preflop": 0,
        "flop": 3,
        "turn": 4,
        "river": 10,
        "reveal": 10
      },
      "scoreCommunityCards": 5
    },
    "phaseEffects": {
      "river": [
        "mirrorCommunity"
      ]
    },
    "score": "high"
  },
  {
    "id": "mirror-world",
    "name": "Mirror World",
    "shortName": "M World",
    "summary": "Two realities are visible before reveal picks a ranking.",
    "detail": "Two five-card boards are shown, with hands scored against their better reality.",
    "family": "environment",
    "tags": [
      "multi-board",
      "phase-tempo",
      "big-hands"
    ],
    "tier": "insanity",
    "deal": {
      "holeCards": 2,
      "communityCards": 10,
      "boardLayout": {
        "kind": "dual",
        "primary": 5,
        "secondary": 5,
        "secondaryRole": "mirror"
      },
      "boards": {
        "count": 2,
        "cardsPerBoard": 5,
        "scoring": "best"
      },
      "visibleCommunityIndexes": {
        "lobby": [],
        "preflop": [],
        "flop": [
          0,
          1,
          2,
          5,
          6,
          7
        ],
        "turn": [
          0,
          1,
          2,
          3,
          5,
          6,
          7,
          8
        ],
        "river": [
          0,
          1,
          2,
          3,
          4,
          5,
          6,
          7,
          8,
          9
        ],
        "reveal": [
          0,
          1,
          2,
          3,
          4,
          5,
          6,
          7,
          8,
          9
        ]
      }
    },
    "infoFeatures": [
      "mirror-world"
    ],
    "score": "high"
  },
  {
    "id": "multiverse-trade",
    "name": "Multiverse Trade",
    "shortName": "MV T",
    "summary": "Trade one card left before four parallel universes play out.",
    "detail": "A select-stage Card Multiverse: each hand passes one of two dealt cards to the left neighbor, then twenty community cards form four parallel five-card boards for showdown.",
    "family": "selection",
    "tags": [
      "trade-up",
      "multi-board",
      "phase-tempo"
    ],
    "tier": "chaos",
    "deal": {
      "holeCards": 2,
      "dealChoice": {
        "dealtCards": 2,
        "keepCards": 1,
        "selectionPhase": true,
        "tradeUp": true
      },
      "communityCards": 20,
      "boardLayout": {
        "kind": "grid",
        "slots": [
          {
            "row": 0,
            "col": 0,
            "group": "universe-a"
          },
          {
            "row": 0,
            "col": 1,
            "group": "universe-a"
          },
          {
            "row": 0,
            "col": 2,
            "group": "universe-a"
          },
          {
            "row": 0,
            "col": 3,
            "group": "universe-a"
          },
          {
            "row": 0,
            "col": 4,
            "group": "universe-a"
          },
          {
            "row": 1,
            "col": 0,
            "group": "universe-b"
          },
          {
            "row": 1,
            "col": 1,
            "group": "universe-b"
          },
          {
            "row": 1,
            "col": 2,
            "group": "universe-b"
          },
          {
            "row": 1,
            "col": 3,
            "group": "universe-b"
          },
          {
            "row": 1,
            "col": 4,
            "group": "universe-b"
          },
          {
            "row": 2,
            "col": 0,
            "group": "universe-c"
          },
          {
            "row": 2,
            "col": 1,
            "group": "universe-c"
          },
          {
            "row": 2,
            "col": 2,
            "group": "universe-c"
          },
          {
            "row": 2,
            "col": 3,
            "group": "universe-c"
          },
          {
            "row": 2,
            "col": 4,
            "group": "universe-c"
          },
          {
            "row": 3,
            "col": 0,
            "group": "universe-d"
          },
          {
            "row": 3,
            "col": 1,
            "group": "universe-d"
          },
          {
            "row": 3,
            "col": 2,
            "group": "universe-d"
          },
          {
            "row": 3,
            "col": 3,
            "group": "universe-d"
          },
          {
            "row": 3,
            "col": 4,
            "group": "universe-d"
          }
        ]
      },
      "boards": {
        "count": 4,
        "cardsPerBoard": 5,
        "scoring": "best"
      },
      "visibleCommunityIndexes": {
        "lobby": [],
        "preflop": [],
        "flop": [
          0,
          1,
          2,
          5,
          6,
          7,
          10,
          11,
          12,
          15,
          16,
          17
        ],
        "turn": [
          0,
          1,
          2,
          3,
          5,
          6,
          7,
          8,
          10,
          11,
          12,
          13,
          15,
          16,
          17,
          18
        ],
        "river": [
          0,
          1,
          2,
          3,
          4,
          5,
          6,
          7,
          8,
          9,
          10,
          11,
          12,
          13,
          14,
          15,
          16,
          17,
          18,
          19
        ],
        "reveal": [
          0,
          1,
          2,
          3,
          4,
          5,
          6,
          7,
          8,
          9,
          10,
          11,
          12,
          13,
          14,
          15,
          16,
          17,
          18,
          19
        ]
      }
    },
    "infoFeatures": [
      "card-multiverse"
    ],
    "score": "high"
  },
  {
    "id": "one-up",
    "name": "One Up",
    "shortName": "One Up",
    "summary": "One card from every hand is public from the start.",
    "detail": "The exposed card gives the table shared anchors without revealing the full hand.",
    "family": "info",
    "tags": [
      "info-public"
    ],
    "tier": "standard",
    "deal": {
      "holeCards": 2,
      "publicCards": 1,
      "communityCards": 5
    },
    "score": "high"
  },
  {
    "id": "one-up-select",
    "name": "One-Up Select",
    "shortName": "Pick Tell",
    "summary": "Each hand picks which hole card to expose to the table.",
    "detail": "After the deal, every hand chooses one of its two hole cards to make public; the other stays hidden.",
    "family": "selection",
    "tags": [
      "expose-choice",
      "info-public"
    ],
    "tier": "twist",
    "deal": {
      "holeCards": 2,
      "publicCards": 1,
      "publicCardSelection": "playerChoice",
      "communityCards": 5
    },
    "score": "high"
  },
  {
    "id": "open-book",
    "name": "Open Book",
    "shortName": "Open",
    "summary": "Everyone's hole cards are public.",
    "detail": "A low-bluff, high-coordination mode where disagreements are about interpretation.",
    "family": "info",
    "tags": [
      "info-public"
    ],
    "tier": "standard",
    "deal": {
      "holeCards": 2,
      "publicCards": 2,
      "communityCards": 5
    },
    "score": "high"
  },
  {
    "id": "open-book-mulligan",
    "name": "Open Book Mulligan",
    "shortName": "Book M",
    "summary": "Hole cards are public — keep the dealt pair or spend a one-time full redraw.",
    "detail": "A select-stage Open Book: each hand sees both hole cards as public to the table, then can lock the dealt pair or burn a one-time mulligan for a fresh pair before preflop.",
    "family": "selection",
    "tags": [
      "mulligan",
      "info-public"
    ],
    "tier": "twist",
    "deal": {
      "holeCards": 2,
      "dealChoice": {
        "dealtCards": 2,
        "keepCards": 2,
        "selectionPhase": true,
        "mulligan": true
      },
      "publicCards": 2,
      "communityCards": 5
    },
    "score": "high"
  },
  {
    "id": "pair-summit",
    "name": "Pair Summit",
    "shortName": "Pair Summit",
    "summary": "Pairs scoring on a 7-card board — collisions everywhere.",
    "detail": "The board grows to seven cards and pair-only scoring rewards every coincidence; expect trips, two pair, and accidental boats stacking up.",
    "family": "identity",
    "tags": [
      "mission",
      "phase-tempo",
      "big-hands"
    ],
    "tier": "twist",
    "deal": {
      "holeCards": 2,
      "communityCards": 7,
      "visibleCommunityCards": {
        "preflop": 0,
        "flop": 3,
        "turn": 5,
        "river": 7,
        "reveal": 7
      }
    },
    "infoFeatures": [
      "pair-summit"
    ],
    "score": "pairs"
  },
  {
    "id": "periscope",
    "name": "Periscope",
    "shortName": "Scope",
    "summary": "At the river, each player privately sees one of a neighbor's hole cards.",
    "detail": "Only on the river street does each player receive a private peek at a single hole card belonging to another hand; the chip is invisible to everyone else.",
    "family": "info",
    "tags": [
      "info-public"
    ],
    "tier": "chaos",
    "deal": {
      "holeCards": 2,
      "visibleHoleCards": {
        "river": 1,
        "reveal": 2
      },
      "communityCards": 5
    },
    "infoFeatures": [
      "periscope"
    ],
    "score": "high"
  },
  {
    "id": "phoenix-board",
    "name": "Phoenix Board",
    "shortName": "Phoenix",
    "summary": "Every discarded third hole card rises back into a reveal-only vault row.",
    "detail": "Each hand keeps two of three dealt cards through the streets; reveal opens a vault lane that shows every discard the table threw away.",
    "family": "environment",
    "tags": [
      "multi-board",
      "late-detonation",
      "big-hands"
    ],
    "tier": "twist",
    "deal": {
      "holeCards": 3,
      "keepCards": 2,
      "communityCards": 5,
      "boardLayout": {
        "kind": "dual",
        "primary": 5,
        "secondary": 17,
        "secondaryRole": "vault"
      },
      "visibleCommunityCards": {
        "lobby": 0,
        "preflop": 0,
        "flop": 3,
        "turn": 4,
        "river": 5,
        "reveal": 22
      },
      "discardedCardsToCommunity": true
    },
    "score": "high"
  },
  {
    "id": "photographic-memory",
    "name": "Photographic Memory",
    "shortName": "Photo Mem",
    "summary": "The flop disappears after you see it.",
    "detail": "Flop is visible, then the board goes dark at turn and only partial river information returns.",
    "family": "tempo",
    "tags": [
      "phase-tempo",
      "info-public"
    ],
    "tier": "insanity",
    "deal": {
      "holeCards": 2,
      "communityCards": 5,
      "visibleCommunityCards": {
        "flop": 3,
        "turn": 0,
        "river": 2,
        "reveal": 5
      }
    },
    "infoFeatures": [
      "photographic-memory"
    ],
    "score": "high"
  },
  {
    "id": "photographic-negative",
    "name": "Photographic Negative",
    "shortName": "Negative",
    "summary": "Card colors invert visually after turn.",
    "detail": "The board is color-only from turn through river, forcing players to reason through the negative display.",
    "family": "info",
    "tags": [
      "info-public"
    ],
    "tier": "twist",
    "deal": {
      "holeCards": 2,
      "communityCards": 5,
      "visibleCommunityCardDetail": {
        "turn": "color",
        "river": "color"
      }
    },
    "infoFeatures": [
      "photographic-negative"
    ],
    "score": "high"
  },
  {
    "id": "quantum-flop",
    "name": "Quantum Flop",
    "shortName": "Q Flop",
    "summary": "Three parallel boards run flop, turn, and river at once.",
    "detail": "Fifteen community cards form three full boards; each hand scores against its best quantum board.",
    "family": "environment",
    "tags": [
      "multi-board",
      "phase-tempo",
      "big-hands"
    ],
    "tier": "insanity",
    "deal": {
      "holeCards": 2,
      "communityCards": 15,
      "boardLayout": {
        "kind": "grid",
        "slots": [
          {
            "row": 0,
            "col": 0,
            "group": "board-a"
          },
          {
            "row": 0,
            "col": 1,
            "group": "board-a"
          },
          {
            "row": 0,
            "col": 2,
            "group": "board-a"
          },
          {
            "row": 0,
            "col": 3,
            "group": "board-a"
          },
          {
            "row": 0,
            "col": 4,
            "group": "board-a"
          },
          {
            "row": 1,
            "col": 0,
            "group": "board-b"
          },
          {
            "row": 1,
            "col": 1,
            "group": "board-b"
          },
          {
            "row": 1,
            "col": 2,
            "group": "board-b"
          },
          {
            "row": 1,
            "col": 3,
            "group": "board-b"
          },
          {
            "row": 1,
            "col": 4,
            "group": "board-b"
          },
          {
            "row": 2,
            "col": 0,
            "group": "board-c"
          },
          {
            "row": 2,
            "col": 1,
            "group": "board-c"
          },
          {
            "row": 2,
            "col": 2,
            "group": "board-c"
          },
          {
            "row": 2,
            "col": 3,
            "group": "board-c"
          },
          {
            "row": 2,
            "col": 4,
            "group": "board-c"
          }
        ]
      },
      "boards": {
        "count": 3,
        "cardsPerBoard": 5,
        "scoring": "best"
      },
      "visibleCommunityIndexes": {
        "lobby": [],
        "preflop": [],
        "flop": [
          0,
          1,
          2,
          5,
          6,
          7,
          10,
          11,
          12
        ],
        "turn": [
          0,
          1,
          2,
          3,
          5,
          6,
          7,
          8,
          10,
          11,
          12,
          13
        ],
        "river": [
          0,
          1,
          2,
          3,
          4,
          5,
          6,
          7,
          8,
          9,
          10,
          11,
          12,
          13,
          14
        ],
        "reveal": [
          0,
          1,
          2,
          3,
          4,
          5,
          6,
          7,
          8,
          9,
          10,
          11,
          12,
          13,
          14
        ]
      }
    },
    "infoFeatures": [
      "quantum-flop"
    ],
    "score": "high"
  },
  {
    "id": "rank-showing",
    "name": "Rank Showing",
    "shortName": "Ranks",
    "summary": "Every hole-card rank is public, but suits stay hidden.",
    "detail": "The table sees paired and high-card structure from the deal while exact suits remain private until reveal.",
    "family": "info",
    "tags": [
      "info-public"
    ],
    "tier": "standard",
    "deal": {
      "holeCards": 2,
      "visibleHoleCards": {
        "preflop": 2,
        "flop": 2,
        "turn": 2,
        "river": 2,
        "reveal": 2
      },
      "visibleHoleCardDetail": "rank",
      "communityCards": 5
    },
    "score": "high"
  },
  {
    "id": "recursive-board",
    "name": "Recursive Board",
    "shortName": "Recursive",
    "summary": "At turn, the board duplicates itself.",
    "detail": "The board recursively mirrors into ten displayed cards at turn.",
    "family": "environment",
    "tags": [
      "multi-board",
      "weather",
      "phase-tempo"
    ],
    "tier": "insanity",
    "deal": {
      "holeCards": 2,
      "communityCards": 5,
      "boardLayout": {
        "kind": "dual",
        "primary": 5,
        "secondary": 5,
        "secondaryRole": "mirror"
      },
      "visibleCommunityCards": {
        "flop": 3,
        "turn": 10,
        "river": 10,
        "reveal": 10
      },
      "scoreCommunityCards": 5
    },
    "phaseEffects": {
      "turn": [
        "mirrorCommunity"
      ]
    },
    "infoFeatures": [
      "recursive-board"
    ],
    "score": "high"
  },
  {
    "id": "reverse-stream",
    "name": "Reverse Stream",
    "shortName": "Reverse",
    "summary": "River dealt first (preflop), turn second, flop last.",
    "detail": "Reveal order inverts — the river card is the very first community card on the felt, and the flop trio is the last to arrive.",
    "family": "tempo",
    "tags": [
      "phase-tempo",
      "info-public"
    ],
    "tier": "chaos",
    "deal": {
      "holeCards": 2,
      "communityCards": 5,
      "visibleCommunityIndexes": {
        "preflop": [],
        "flop": [
          4
        ],
        "turn": [
          3,
          4
        ],
        "river": [
          0,
          1,
          2,
          3,
          4
        ],
        "reveal": [
          0,
          1,
          2,
          3,
          4
        ]
      }
    },
    "infoFeatures": [
      "reverse-stream"
    ],
    "score": "high"
  },
  {
    "id": "runners",
    "name": "Runners",
    "shortName": "Runners",
    "summary": "Every hand shares the first board card before the flop.",
    "detail": "Each seat is handed a public card matching the first community slot, so everyone runs alongside the same shared card all hand.",
    "family": "environment",
    "tags": [
      "constrained-deal",
      "info-public"
    ],
    "tier": "twist",
    "deal": {
      "holeCards": 2,
      "publicCards": 1,
      "communityCards": 5,
      "constraint": "sharedFirstCard"
    },
    "infoFeatures": [
      "runners"
    ],
    "score": "high"
  },
  {
    "id": "schrodinger-expose",
    "name": "Schrödinger Expose",
    "shortName": "Sch X",
    "summary": "Pick which superposed hole card you publicly resolve to the table.",
    "detail": "A select-stage Schrödinger's Hole: each hand's two cards carry multiple possible identities until reveal, but at the deal the owner picks one card to publicly collapse and expose; the other stays in superposition.",
    "family": "selection",
    "tags": [
      "expose-choice",
      "identity-token",
      "info-public"
    ],
    "tier": "wild",
    "deal": {
      "holeCards": 2,
      "publicCards": 1,
      "publicCardSelection": "playerChoice",
      "communityCards": 5,
      "possibleIdentities": "holes"
    },
    "identityResolution": "bestPossible",
    "infoFeatures": [
      "schrodingers-hole"
    ],
    "score": "high"
  },
  {
    "id": "slow-burn",
    "name": "Slow Burn",
    "shortName": "Slow",
    "summary": "The board arrives one card, then three, then five.",
    "detail": "A narrow flop makes early confidence brittle and keeps trades alive longer.",
    "family": "tempo",
    "tags": [
      "phase-tempo",
      "info-public"
    ],
    "tier": "standard",
    "deal": {
      "holeCards": 2,
      "communityCards": 5,
      "visibleCommunityCards": {
        "lobby": 0,
        "preflop": 0,
        "flop": 1,
        "turn": 3,
        "river": 5,
        "reveal": 5
      }
    },
    "score": "high"
  },
  {
    "id": "slow-burn-inherit",
    "name": "Slow Burn Inherit",
    "shortName": "Slow I",
    "summary": "Inheritance chain into a one-card flop and a three-card turn.",
    "detail": "A select-stage Slow Burn: each hand keeps one dealt card while the right neighbor's discard fills the second slot, then the board arrives one card on flop, three on turn, and five on river.",
    "family": "selection",
    "tags": [
      "inheritance",
      "phase-tempo",
      "relational"
    ],
    "tier": "chaos",
    "deal": {
      "holeCards": 2,
      "dealChoice": {
        "dealtCards": 2,
        "keepCards": 1,
        "selectionPhase": true,
        "inheritance": true
      },
      "communityCards": 5,
      "visibleCommunityCards": {
        "lobby": 0,
        "preflop": 0,
        "flop": 1,
        "turn": 3,
        "river": 5,
        "reveal": 5
      }
    },
    "score": "high"
  },
  {
    "id": "smoke-hole",
    "name": "Smoke Hole",
    "shortName": "Smoke",
    "summary": "Hole cards are suit-only until turn.",
    "detail": "Every hand exposes only suit hints through flop, then full visible hole cards from turn onward.",
    "family": "info",
    "tags": [
      "info-public"
    ],
    "tier": "chaos",
    "deal": {
      "holeCards": 2,
      "visibleHoleCards": {
        "preflop": 2,
        "flop": 2,
        "turn": 2,
        "river": 2,
        "reveal": 2
      },
      "visibleHoleCardDetail": {
        "preflop": "suit",
        "flop": "suit",
        "turn": "full",
        "river": "full",
        "reveal": "full"
      },
      "communityCards": 5
    },
    "infoFeatures": [
      "smoke-hole"
    ],
    "score": "high"
  },
  {
    "id": "split-board",
    "name": "Split Board",
    "shortName": "Split",
    "summary": "Six community cards form two three-card halves; every hand scores on its better half.",
    "detail": "The whole split board lands together, but each hand only combines with one side at showdown.",
    "family": "environment",
    "tags": [
      "multi-board",
      "phase-tempo",
      "big-hands"
    ],
    "tier": "chaos",
    "deal": {
      "holeCards": 2,
      "communityCards": 6,
      "boardLayout": {
        "kind": "dual",
        "primary": 3,
        "secondary": 3,
        "secondaryRole": "vault"
      },
      "boards": {
        "count": 2,
        "cardsPerBoard": 3,
        "scoring": "best"
      },
      "visibleCommunityCards": {
        "lobby": 0,
        "preflop": 0,
        "flop": 6,
        "turn": 6,
        "river": 6,
        "reveal": 6
      }
    },
    "score": "high"
  },
  {
    "id": "spotlight-rotation",
    "name": "Spotlight Rotation",
    "shortName": "Spotlight",
    "summary": "A rotating hand is fully face-up to the table each street.",
    "detail": "Every street, a different hand takes the spotlight and exposes both its hole cards while the other hands stay private until reveal.",
    "family": "info",
    "tags": [
      "info-public"
    ],
    "tier": "chaos",
    "deal": {
      "holeCards": 2,
      "visibleHoleCards": {
        "preflop": 2,
        "flop": 2,
        "turn": 2,
        "river": 2,
        "reveal": 2
      },
      "communityCards": 5
    },
    "infoFeatures": [
      "spotlight"
    ],
    "score": "high"
  },
  {
    "id": "staircase",
    "name": "Staircase",
    "shortName": "Staircase",
    "summary": "Diagonal 5-slot grid; reveals step-by-step.",
    "detail": "Cards land along a diagonal staircase; the visible community grows one step at a time, narrating ascent through the streets.",
    "family": "tempo",
    "tags": [
      "phase-tempo",
      "info-public"
    ],
    "tier": "twist",
    "deal": {
      "holeCards": 2,
      "communityCards": 5,
      "boardLayout": {
        "kind": "grid",
        "slots": [
          {
            "row": 0,
            "col": 0
          },
          {
            "row": 1,
            "col": 1
          },
          {
            "row": 2,
            "col": 2
          },
          {
            "row": 3,
            "col": 3
          },
          {
            "row": 4,
            "col": 4
          }
        ]
      },
      "visibleCommunityCards": {
        "preflop": 0,
        "flop": 2,
        "turn": 3,
        "river": 5,
        "reveal": 5
      }
    },
    "infoFeatures": [
      "staircase"
    ],
    "score": "high"
  },
  {
    "id": "suit-showing",
    "name": "Suit Showing",
    "shortName": "Suits",
    "summary": "Every hole-card suit is public, but ranks stay hidden.",
    "detail": "The table sees suit texture from the deal while actual ranks remain private until reveal.",
    "family": "info",
    "tags": [
      "info-public"
    ],
    "tier": "standard",
    "deal": {
      "holeCards": 2,
      "visibleHoleCards": {
        "preflop": 2,
        "flop": 2,
        "turn": 2,
        "river": 2,
        "reveal": 2
      },
      "visibleHoleCardDetail": "suit",
      "communityCards": 5
    },
    "score": "high"
  },
  {
    "id": "suit-showing-inherit",
    "name": "Suit Showing Inherit",
    "shortName": "Suit I",
    "summary": "Inherit a card whose suit you saw at the deal — ranks stay hidden until reveal.",
    "detail": "A select-stage Suit Showing: each hand keeps one dealt card while the right neighbor's discard fills the second slot; both cards' suits are public throughout, but ranks stay hidden until reveal.",
    "family": "selection",
    "tags": [
      "inheritance",
      "relational",
      "info-public"
    ],
    "tier": "wild",
    "deal": {
      "holeCards": 2,
      "dealChoice": {
        "dealtCards": 2,
        "keepCards": 1,
        "selectionPhase": true,
        "inheritance": true
      },
      "visibleHoleCards": {
        "preflop": 2,
        "flop": 2,
        "turn": 2,
        "river": 2,
        "reveal": 2
      },
      "visibleHoleCardDetail": "suit",
      "communityCards": 5
    },
    "score": "high"
  },
  {
    "id": "synesthesia",
    "name": "Synesthesia",
    "shortName": "Synesthesia",
    "summary": "Each street shows the community cards through a different sensory filter.",
    "detail": "Flop shows ranks only, turn shows suits only, and river shows colors only; the full board lands at reveal for scoring.",
    "family": "info",
    "tags": [
      "info-public"
    ],
    "tier": "chaos",
    "deal": {
      "holeCards": 2,
      "communityCards": 5,
      "visibleCommunityCardDetail": {
        "flop": "rank",
        "turn": "suit",
        "river": "color"
      }
    },
    "infoFeatures": [
      "synesthesia"
    ],
    "score": "high"
  },
  {
    "id": "tag-team",
    "name": "Tag Team",
    "shortName": "Tag",
    "summary": "Each player privately sees a neighbor's full two-card hand.",
    "detail": "Every player is tagged with another hand's complete hole cards as a private hint that persists from preflop through reveal.",
    "family": "info",
    "tags": [
      "info-public"
    ],
    "tier": "chaos",
    "deal": {
      "holeCards": 2,
      "visibleHoleCards": {
        "preflop": 2,
        "flop": 2,
        "turn": 2,
        "river": 2,
        "reveal": 2
      },
      "communityCards": 5
    },
    "infoFeatures": [
      "tag-team"
    ],
    "score": "high"
  },
  {
    "id": "tiny-board",
    "name": "Tiny Board",
    "shortName": "Tiny",
    "summary": "Only three community cards are dealt.",
    "detail": "The flop is the whole board, so private cards matter longer and there is no late board rescue.",
    "family": "hand",
    "tags": [
      "big-hands",
      "info-public"
    ],
    "tier": "standard",
    "deal": {
      "holeCards": 2,
      "communityCards": 3,
      "visibleCommunityCards": {
        "lobby": 0,
        "preflop": 0,
        "flop": 3,
        "turn": 3,
        "river": 3,
        "reveal": 3
      }
    },
    "score": "high"
  },
  {
    "id": "tower",
    "name": "Tower",
    "shortName": "Tower",
    "summary": "A five-card stack shows only its top three cards until river.",
    "detail": "The table reads a stable three-card board through turn, then the hidden bottom of the stack appears at river.",
    "family": "tempo",
    "tags": [
      "phase-tempo",
      "info-public"
    ],
    "tier": "chaos",
    "deal": {
      "holeCards": 2,
      "communityCards": 5,
      "visibleCommunityCards": {
        "lobby": 0,
        "preflop": 0,
        "flop": 3,
        "turn": 3,
        "river": 5,
        "reveal": 5
      }
    },
    "score": "high"
  },
  {
    "id": "turnpike",
    "name": "Turnpike",
    "shortName": "Turnpike",
    "summary": "Four community cards hit on the flop, then the game pauses before the river.",
    "detail": "Most of the board appears early, making the final card a sharper negotiation point.",
    "family": "tempo",
    "tags": [
      "phase-tempo",
      "info-public"
    ],
    "tier": "standard",
    "deal": {
      "holeCards": 2,
      "communityCards": 5,
      "visibleCommunityCards": {
        "lobby": 0,
        "preflop": 0,
        "flop": 4,
        "turn": 4,
        "river": 5,
        "reveal": 5
      }
    },
    "score": "high"
  },
  {
    "id": "twin-universes",
    "name": "Twin Universes",
    "shortName": "Twin U",
    "summary": "Two board universes play out side-by-side.",
    "detail": "Ten community cards form two five-card boards; each hand scores against its better universe.",
    "family": "environment",
    "tags": [
      "multi-board",
      "phase-tempo",
      "big-hands"
    ],
    "tier": "insanity",
    "deal": {
      "holeCards": 2,
      "communityCards": 10,
      "boardLayout": {
        "kind": "dual",
        "primary": 5,
        "secondary": 5,
        "secondaryRole": "vault"
      },
      "boards": {
        "count": 2,
        "cardsPerBoard": 5,
        "scoring": "best"
      },
      "visibleCommunityIndexes": {
        "lobby": [],
        "preflop": [],
        "flop": [
          0,
          1,
          2,
          5,
          6,
          7
        ],
        "turn": [
          0,
          1,
          2,
          3,
          5,
          6,
          7,
          8
        ],
        "river": [
          0,
          1,
          2,
          3,
          4,
          5,
          6,
          7,
          8,
          9
        ],
        "reveal": [
          0,
          1,
          2,
          3,
          4,
          5,
          6,
          7,
          8,
          9
        ]
      }
    },
    "infoFeatures": [
      "twin-universes"
    ],
    "score": "high"
  },
  {
    "id": "two-boards",
    "name": "Two Boards",
    "shortName": "2 Boards",
    "summary": "Two parallel boards are dealt; every hand scores against its better board.",
    "detail": "Each street reveals cards on both boards, and showdown evaluates every hand on both boards before keeping its strongest result.",
    "family": "environment",
    "tags": [
      "multi-board",
      "phase-tempo",
      "big-hands"
    ],
    "tier": "chaos",
    "deal": {
      "holeCards": 2,
      "communityCards": 10,
      "boardLayout": {
        "kind": "dual",
        "primary": 5,
        "secondary": 5,
        "secondaryRole": "vault"
      },
      "boards": {
        "count": 2,
        "cardsPerBoard": 5,
        "scoring": "best"
      },
      "visibleCommunityIndexes": {
        "lobby": [],
        "preflop": [],
        "flop": [
          0,
          1,
          2,
          5,
          6,
          7
        ],
        "turn": [
          0,
          1,
          2,
          3,
          5,
          6,
          7,
          8
        ],
        "river": [
          0,
          1,
          2,
          3,
          4,
          5,
          6,
          7,
          8,
          9
        ],
        "reveal": [
          0,
          1,
          2,
          3,
          4,
          5,
          6,
          7,
          8,
          9
        ]
      }
    },
    "score": "high"
  },
  {
    "id": "two-boards-mulligan",
    "name": "Two Boards Mulligan",
    "shortName": "2B M",
    "summary": "Mulligan against two parallel boards — redraw if your pair fits neither.",
    "detail": "A select-stage Two Boards: each hand can lock its dealt pair or spend a one-time mulligan after seeing how poorly it lines up against both parallel five-card boards.",
    "family": "selection",
    "tags": [
      "mulligan",
      "multi-board",
      "phase-tempo"
    ],
    "tier": "chaos",
    "deal": {
      "holeCards": 2,
      "dealChoice": {
        "dealtCards": 2,
        "keepCards": 2,
        "selectionPhase": true,
        "mulligan": true
      },
      "communityCards": 10,
      "boardLayout": {
        "kind": "dual",
        "primary": 5,
        "secondary": 5,
        "secondaryRole": "vault"
      },
      "boards": {
        "count": 2,
        "cardsPerBoard": 5,
        "scoring": "best"
      },
      "visibleCommunityIndexes": {
        "lobby": [],
        "preflop": [],
        "flop": [
          0,
          1,
          2,
          5,
          6,
          7
        ],
        "turn": [
          0,
          1,
          2,
          3,
          5,
          6,
          7,
          8
        ],
        "river": [
          0,
          1,
          2,
          3,
          4,
          5,
          6,
          7,
          8,
          9
        ],
        "reveal": [
          0,
          1,
          2,
          3,
          4,
          5,
          6,
          7,
          8,
          9
        ]
      }
    },
    "score": "high"
  },
  {
    "id": "two-step-river",
    "name": "Two-Step River",
    "shortName": "2-Step",
    "summary": "The river has two final cards; one waits until reveal.",
    "detail": "A sixth board card is dealt, but only one of the two final river cards is visible before reveal.",
    "family": "tempo",
    "tags": [
      "big-hands",
      "phase-tempo",
      "info-public"
    ],
    "tier": "twist",
    "deal": {
      "holeCards": 2,
      "communityCards": 6,
      "visibleCommunityCards": {
        "lobby": 0,
        "preflop": 0,
        "flop": 3,
        "turn": 4,
        "river": 5,
        "reveal": 6
      }
    },
    "score": "high"
  },
  {
    "id": "vault-card",
    "name": "Vault Card",
    "shortName": "Vault",
    "summary": "A sixth community card waits in a vault lane until reveal opens it.",
    "detail": "The main board fills normally through river while a separate vault slot stays empty; reveal exposes its hidden card alongside the five primary board cards.",
    "family": "environment",
    "tags": [
      "multi-board",
      "phase-tempo",
      "big-hands"
    ],
    "tier": "twist",
    "deal": {
      "holeCards": 2,
      "communityCards": 6,
      "boardLayout": {
        "kind": "dual",
        "primary": 5,
        "secondary": 1,
        "secondaryRole": "vault"
      },
      "visibleCommunityCards": {
        "lobby": 0,
        "preflop": 0,
        "flop": 3,
        "turn": 4,
        "river": 5,
        "reveal": 6
      }
    },
    "score": "high"
  },
  {
    "id": "wheel",
    "name": "Wheel",
    "shortName": "Wheel",
    "summary": "6-slot ring with a hidden hub that joins every score at reveal.",
    "detail": "Six cards form a ring around a hidden hub; the hub lights up at reveal and joins every scoring read on the table.",
    "family": "tempo",
    "tags": [
      "big-hands",
      "phase-tempo",
      "info-public"
    ],
    "tier": "chaos",
    "deal": {
      "holeCards": 2,
      "communityCards": 7,
      "boardLayout": {
        "kind": "grid",
        "slots": [
          {
            "row": 0,
            "col": 1
          },
          {
            "row": 0,
            "col": 2
          },
          {
            "row": 1,
            "col": 0
          },
          {
            "row": 1,
            "col": 1,
            "group": "hub"
          },
          {
            "row": 1,
            "col": 3
          },
          {
            "row": 2,
            "col": 1
          },
          {
            "row": 2,
            "col": 2
          }
        ]
      },
      "visibleCommunityIndexes": {
        "preflop": [],
        "flop": [
          0,
          1,
          2
        ],
        "turn": [
          0,
          1,
          2,
          4
        ],
        "river": [
          0,
          1,
          2,
          4,
          5,
          6
        ],
        "reveal": [
          0,
          1,
          2,
          3,
          4,
          5,
          6
        ]
      }
    },
    "infoFeatures": [
      "wheel"
    ],
    "score": "high"
  },
  {
    "id": "whisper-chain",
    "name": "Whisper Chain",
    "shortName": "Whisper",
    "summary": "Each player gets a private hint about one neighbor's hand.",
    "detail": "Every player sees one secret tip naming a neighbor and a fact about that neighbor's hole cards; the hint stays private to its recipient.",
    "family": "info",
    "tags": [
      "info-public"
    ],
    "tier": "chaos",
    "deal": {
      "holeCards": 2,
      "visibleHoleCards": {
        "preflop": 1,
        "flop": 1,
        "turn": 1,
        "river": 1,
        "reveal": 2
      },
      "communityCards": 5
    },
    "infoFeatures": [
      "whisper-chain"
    ],
    "score": "high"
  },
  {
    "id": "anti-wild",
    "name": "Anti-Wild",
    "shortName": "Anti",
    "summary": "One announced rank is banned from scoring.",
    "detail": "Sevens are ignored by the showdown evaluator, shrinking hands and boards before hand comparison.",
    "family": "environment",
    "tags": [
      "deck-swap"
    ],
    "tier": "twist",
    "deal": {
      "holeCards": 2,
      "communityCards": 5
    },
    "excludedRanks": [
      "7"
    ],
    "score": "high"
  },
  {
    "id": "bottom-half",
    "name": "Bottom Half",
    "shortName": "Bottom",
    "summary": "Only ranks two through nine are in the deck.",
    "detail": "The deck removes broadway texture and makes low-rank board reading much sharper.",
    "family": "environment",
    "tags": [
      "deck-swap"
    ],
    "tier": "standard",
    "deal": {
      "holeCards": 2,
      "communityCards": 5,
      "deck": "bottomHalf"
    },
    "score": "high"
  },
  {
    "id": "doppelganger-deck",
    "name": "Doppelganger Deck",
    "shortName": "Doppel",
    "summary": "Every card has a hidden twin somewhere else.",
    "detail": "The deck is doubled so duplicate identities can appear across hands and board.",
    "family": "environment",
    "tags": [
      "deck-swap"
    ],
    "tier": "twist",
    "deal": {
      "holeCards": 2,
      "communityCards": 5,
      "deck": "double"
    },
    "infoFeatures": [
      "doppelganger-deck"
    ],
    "score": "high"
  },
  {
    "id": "double-deck",
    "name": "Double Deck",
    "shortName": "Double",
    "summary": "Two full decks are merged before the deal.",
    "detail": "Duplicate identities can appear, increasing rank collisions and strange shared-outs.",
    "family": "environment",
    "tags": [
      "deck-swap"
    ],
    "tier": "standard",
    "deal": {
      "holeCards": 2,
      "communityCards": 5,
      "deck": "double"
    },
    "score": "high"
  },
  {
    "id": "half-deck",
    "name": "Half Deck",
    "shortName": "Half",
    "summary": "A random twenty-six-card deck is used for the whole hand.",
    "detail": "Half the deck is removed before dealing, creating a tight and unpredictable card pool.",
    "family": "environment",
    "tags": [
      "deck-swap"
    ],
    "tier": "standard",
    "deal": {
      "holeCards": 2,
      "communityCards": 5,
      "deck": "half"
    },
    "score": "high"
  },
  {
    "id": "ice-age",
    "name": "Ice Age",
    "shortName": "Ice",
    "summary": "Even ranks are frozen out of scoring.",
    "detail": "Even-ranked cards are skipped by the reveal evaluator.",
    "family": "environment",
    "tags": [
      "deck-swap"
    ],
    "tier": "wild",
    "deal": {
      "holeCards": 2,
      "communityCards": 5
    },
    "excludedRanks": [
      "2",
      "4",
      "6",
      "8",
      "T",
      "Q"
    ],
    "infoFeatures": [
      "ice-age"
    ],
    "score": "high"
  },
  {
    "id": "pinochle",
    "name": "Pinochle",
    "shortName": "Pinochle",
    "summary": "Ranks nine through ace appear twice in each suit.",
    "detail": "A duplicated high-card deck creates compact, collision-heavy boards and hands.",
    "family": "environment",
    "tags": [
      "deck-swap"
    ],
    "tier": "standard",
    "deal": {
      "holeCards": 2,
      "communityCards": 5,
      "deck": "pinochle"
    },
    "score": "high"
  },
  {
    "id": "short-deck",
    "name": "Short Deck",
    "shortName": "Short",
    "summary": "Cards two through five are removed before the deal.",
    "detail": "Compressed ranks make strong hands common and hand reading more volatile.",
    "family": "environment",
    "tags": [
      "deck-swap"
    ],
    "tier": "standard",
    "deal": {
      "holeCards": 2,
      "communityCards": 5,
      "deck": "short"
    },
    "score": "high"
  },
  {
    "id": "stripped",
    "name": "Stripped",
    "shortName": "Stripped",
    "summary": "Only ranks 8 through ace are in the deck.",
    "detail": "The deck compresses to twenty-eight high cards, making premium holdings and collisions common.",
    "family": "environment",
    "tags": [
      "deck-swap"
    ],
    "tier": "standard",
    "deal": {
      "holeCards": 2,
      "communityCards": 5,
      "deck": "stripped"
    },
    "score": "high"
  },
  {
    "id": "suit-heavy",
    "name": "Suit-Heavy",
    "shortName": "Heavy",
    "summary": "Hearts are doubled in the deck, making heart flushes far more common.",
    "detail": "The heart suit appears twice as often, biasing every street toward red flush draws while ranks stay normal.",
    "family": "environment",
    "tags": [
      "deck-swap"
    ],
    "tier": "twist",
    "deal": {
      "holeCards": 2,
      "communityCards": 5,
      "deck": "suitHeavy"
    },
    "score": "high"
  },
  {
    "id": "suit-light",
    "name": "Suit-Light",
    "shortName": "Light",
    "summary": "Hearts are trimmed to six cards in the deck, making heart flushes scarce.",
    "detail": "Most hearts are removed before the deal so red flush draws rarely materialize while the other suits stay intact.",
    "family": "environment",
    "tags": [
      "deck-swap"
    ],
    "tier": "twist",
    "deal": {
      "holeCards": 2,
      "communityCards": 5,
      "deck": "suitLight"
    },
    "score": "high"
  },
  {
    "id": "triple-deck",
    "name": "Triple Deck",
    "shortName": "Triple",
    "summary": "Three full decks are merged before the deal.",
    "detail": "The enlarged deck makes exact duplicate cards possible while preserving cooperative ranking.",
    "family": "environment",
    "tags": [
      "deck-swap"
    ],
    "tier": "twist",
    "deal": {
      "holeCards": 2,
      "communityCards": 5,
      "deck": "triple"
    },
    "score": "high"
  },
  {
    "id": "blessed-card",
    "name": "Blessed Card",
    "shortName": "Blessed",
    "summary": "One blessed card is shuffled in; whichever hand holds it finishes first.",
    "detail": "The blessed marker overrides poker strength at reveal, lifting the blessed hand above every unblessed hand regardless of made-hand quality.",
    "family": "identity",
    "tags": [
      "identity-token"
    ],
    "tier": "wild",
    "deal": {
      "holeCards": 2,
      "communityCards": 5,
      "deck": "blessed"
    },
    "forceRankByMeta": {
      "first": "blessed"
    },
    "infoFeatures": [
      "meta-legend"
    ],
    "score": "high"
  },
  {
    "id": "blessed-card-absolute",
    "name": "Blessed Card Absolute",
    "shortName": "Bless Abs",
    "summary": "One absolute-blessed card is shuffled in; whichever hand holds it finishes first.",
    "detail": "The blessing overrides poker strength at reveal, lifting its hand above every other hand regardless of made-hand quality.",
    "family": "identity",
    "tags": [
      "identity-token"
    ],
    "tier": "wild",
    "deal": {
      "holeCards": 2,
      "communityCards": 5,
      "deck": "blessed"
    },
    "forceRankByMeta": {
      "first": "blessed"
    },
    "infoFeatures": [
      "blessed-card-absolute",
      "meta-legend"
    ],
    "score": "high"
  },
  {
    "id": "chosen-one",
    "name": "Chosen One",
    "shortName": "Chosen",
    "summary": "First joker dealt becomes the round's wild — all wilds copy its suit.",
    "detail": "At flop the first joker fixes the round's wild suit; every other wild card collapses to that suit at reveal.",
    "family": "identity",
    "tags": [
      "identity-token"
    ],
    "tier": "wild",
    "deal": {
      "holeCards": 2,
      "communityCards": 5,
      "deck": "jokers"
    },
    "phaseEffects": {
      "flop": [
        "chosenJokerImprint"
      ]
    },
    "infoFeatures": [
      "chosen-one",
      "meta-legend"
    ],
    "score": "high"
  },
  {
    "id": "clergy",
    "name": "Clergy",
    "shortName": "Clergy",
    "summary": "Forced first hole per hand is blessed; second hole is normal.",
    "detail": "Every seat's first hole card is guaranteed blessed; the second arrives standard. Each hand carries an absolute scoring anchor.",
    "family": "identity",
    "tags": [
      "identity-token"
    ],
    "tier": "wild",
    "deal": {
      "holeCards": 2,
      "communityCards": 5,
      "deck": "blessed"
    },
    "forceRankByMeta": {
      "first": "blessed"
    },
    "infoFeatures": [
      "clergy",
      "meta-legend"
    ],
    "score": "high"
  },
  {
    "id": "counter-cuff",
    "name": "Counter-Cuff",
    "shortName": "Counter",
    "summary": "Counterfeit card flips its scoring at reveal — high becomes low.",
    "detail": "One hole card per hand is counterfeit; at reveal its rank inverts on the inverted-rank ladder, swapping high for low and vice versa.",
    "family": "identity",
    "tags": [
      "identity-token",
      "late-detonation"
    ],
    "tier": "chaos",
    "deal": {
      "holeCards": 2,
      "communityCards": 5,
      "counterfeitHoleCards": 1
    },
    "phaseEffects": {
      "reveal": [
        "counterfeitInversion"
      ]
    },
    "infoFeatures": [
      "counter-cuff"
    ],
    "score": "high"
  },
  {
    "id": "counterfeit",
    "name": "Counterfeit",
    "shortName": "Counter",
    "summary": "One face-down hole card per hand is value zero.",
    "detail": "The first kept hole card in every hand is marked counterfeit and ignored by showdown scoring.",
    "family": "identity",
    "tags": [
      "identity-token"
    ],
    "tier": "twist",
    "deal": {
      "holeCards": 2,
      "communityCards": 5,
      "counterfeitHoleCards": 1
    },
    "excludedMetas": [
      "counterfeit"
    ],
    "score": "high"
  },
  {
    "id": "cursed-card",
    "name": "Cursed Card",
    "shortName": "Cursed",
    "summary": "One cursed card is shuffled in; whichever hand holds it finishes last.",
    "detail": "The cursed marker overrides poker strength at reveal, dropping the cursed hand below every uncursed hand regardless of made-hand quality.",
    "family": "identity",
    "tags": [
      "identity-token"
    ],
    "tier": "wild",
    "deal": {
      "holeCards": 2,
      "communityCards": 5,
      "deck": "cursed"
    },
    "forceRankByMeta": {
      "last": "cursed"
    },
    "infoFeatures": [
      "meta-legend"
    ],
    "score": "high"
  },
  {
    "id": "decoys",
    "name": "Decoys",
    "shortName": "Decoys",
    "summary": "Every hand has one counterfeit hole the player believes is real.",
    "detail": "One hole per hand is silently a decoy — looks normal in display, contributes nothing to the score at reveal.",
    "family": "identity",
    "tags": [
      "identity-token"
    ],
    "tier": "wild",
    "deal": {
      "holeCards": 2,
      "communityCards": 5,
      "counterfeitHoleCards": 1
    },
    "infoFeatures": [
      "decoys"
    ],
    "score": "high"
  },
  {
    "id": "drunken-display",
    "name": "Drunken Display",
    "shortName": "Drunken",
    "summary": "Cards wobble between possible ranks until reveal sobers them up.",
    "detail": "Hands and board carry alternate rank identities through preflop, flop, turn, and river; reveal collapses every card to whichever rank scores best.",
    "family": "identity",
    "tags": [
      "identity-token"
    ],
    "tier": "insanity",
    "deal": {
      "holeCards": 2,
      "communityCards": 5,
      "possibleIdentities": "holesAndBoard"
    },
    "identityResolution": "bestPossible",
    "infoFeatures": [
      "drunken-display"
    ],
    "score": "high"
  },
  {
    "id": "effigy",
    "name": "Effigy",
    "shortName": "Effigy",
    "summary": "Marked card and its rank-twin are bound — both score wild at reveal.",
    "detail": "A marked card and any other card sharing its rank are bound; at reveal the bound pair both play as wild.",
    "family": "identity",
    "tags": [
      "identity-token",
      "late-detonation",
      "wild"
    ],
    "tier": "chaos",
    "deal": {
      "holeCards": 2,
      "communityCards": 5,
      "deck": "marked"
    },
    "phaseEffects": {
      "reveal": [
        "markedTwinWild"
      ]
    },
    "infoFeatures": [
      "effigy",
      "meta-legend"
    ],
    "syntheticPair": "spread",
    "score": "high"
  },
  {
    "id": "glitch-card",
    "name": "Glitch Card",
    "shortName": "Glitch",
    "summary": "One glitched card hides its identity, then resolves wild at reveal.",
    "detail": "The glitched card's true rank and suit stay unknown until reveal, where it plays as a wild card for whichever hand holds it.",
    "family": "identity",
    "tags": [
      "identity-token"
    ],
    "tier": "wild",
    "deal": {
      "holeCards": 2,
      "communityCards": 5,
      "deck": "glitch"
    },
    "wildCards": {
      "metas": [
        "glitched"
      ]
    },
    "infoFeatures": [
      "meta-legend"
    ],
    "score": "high"
  },
  {
    "id": "hex-card",
    "name": "Hex Card",
    "shortName": "Hex",
    "summary": "One hex card is shuffled in; whichever hand holds it finishes last.",
    "detail": "The hex marker overrides poker strength at reveal, dropping the hexed hand below every non-hexed hand regardless of made-hand quality.",
    "family": "identity",
    "tags": [
      "identity-token"
    ],
    "tier": "wild",
    "deal": {
      "holeCards": 2,
      "communityCards": 5,
      "deck": "cursed"
    },
    "forceRankByMeta": {
      "last": "cursed"
    },
    "infoFeatures": [
      "hex-card",
      "meta-legend"
    ],
    "score": "high"
  },
  {
    "id": "holographic-card",
    "name": "Holographic Card",
    "shortName": "Holo",
    "summary": "Every community card carries multiple possible identities until reveal.",
    "detail": "Each board card displays as uncertain through flop, turn, and river; reveal collapses every slot to whichever identity makes the strongest hand.",
    "family": "identity",
    "tags": [
      "identity-token"
    ],
    "tier": "insanity",
    "deal": {
      "holeCards": 2,
      "communityCards": 5,
      "possibleIdentities": "board"
    },
    "identityResolution": "bestPossible",
    "infoFeatures": [
      "holographic-card"
    ],
    "score": "high"
  },
  {
    "id": "jokers-in",
    "name": "Jokers In",
    "shortName": "Jokers",
    "summary": "Two jokers are added to the deck as wild cards.",
    "detail": "Each joker can become the best possible card identity for the hand holding it at showdown.",
    "family": "identity",
    "tags": [
      "identity-token"
    ],
    "tier": "standard",
    "deal": {
      "holeCards": 2,
      "communityCards": 5,
      "deck": "jokers"
    },
    "wildCards": {
      "metas": [
        "joker"
      ]
    },
    "infoFeatures": [
      "meta-legend"
    ],
    "score": "high"
  },
  {
    "id": "judgment-day",
    "name": "Judgment Day",
    "shortName": "Judgment",
    "summary": "Blessed cards override at reveal; if none exist, cursed do.",
    "detail": "At reveal the table searches for blessed metas to dictate the winner; absent any, cursed cards take over the hierarchy.",
    "family": "identity",
    "tags": [
      "identity-token",
      "late-detonation",
      "relational"
    ],
    "tier": "wild",
    "deal": {
      "holeCards": 2,
      "communityCards": 5,
      "deck": "blessed"
    },
    "phaseEffects": {
      "reveal": [
        "hierarchyByMeta"
      ]
    },
    "infoFeatures": [
      "judgment-day",
      "meta-legend"
    ],
    "score": "high"
  },
  {
    "id": "keystone",
    "name": "Keystone",
    "shortName": "Keystone",
    "summary": "One marked board card is the only scoring rank-class.",
    "detail": "At flop, one community card is marked as the keystone; only its rank-class scores at reveal — every other rank is decoration.",
    "family": "tempo",
    "tags": [
      "identity-token",
      "phase-tempo"
    ],
    "tier": "wild",
    "deal": {
      "holeCards": 2,
      "communityCards": 5,
      "deck": "marked"
    },
    "phaseEffects": {
      "flop": [
        "markFirstBoard"
      ]
    },
    "infoFeatures": [
      "keystone",
      "meta-legend"
    ],
    "score": "high"
  },
  {
    "id": "marked-deck",
    "name": "Marked Deck",
    "shortName": "Marked",
    "summary": "One card carries a public marker the whole table can see.",
    "detail": "The marked card is visible as it moves through hands and board; the marker is cosmetic and does not affect reveal scoring.",
    "family": "identity",
    "tags": [
      "identity-token"
    ],
    "tier": "wild",
    "deal": {
      "holeCards": 2,
      "communityCards": 5,
      "deck": "marked"
    },
    "infoFeatures": [
      "meta-legend"
    ],
    "score": "high"
  },
  {
    "id": "mirror-hand",
    "name": "Mirror Hand",
    "shortName": "M Hand",
    "summary": "Every hand has a shadow inversion.",
    "detail": "Hole cards carry alternate identities so each hand can resolve through its mirrored possibility.",
    "family": "identity",
    "tags": [
      "identity-token"
    ],
    "tier": "insanity",
    "deal": {
      "holeCards": 2,
      "communityCards": 5,
      "possibleIdentities": "holes"
    },
    "identityResolution": "bestPossible",
    "infoFeatures": [
      "mirror-hand"
    ],
    "score": "high"
  },
  {
    "id": "mirror-meta",
    "name": "Mirror Meta",
    "shortName": "Mirror M",
    "summary": "A glitched card copies its board neighbor's identity at turn.",
    "detail": "The glitch on the board mimics the card sitting next to it when turn lands; effectively the board duplicates one of its own.",
    "family": "identity",
    "tags": [
      "identity-token"
    ],
    "tier": "chaos",
    "deal": {
      "holeCards": 2,
      "communityCards": 5,
      "deck": "glitch"
    },
    "phaseEffects": {
      "turn": [
        "glitchCopyNeighbor"
      ]
    },
    "infoFeatures": [
      "mirror-meta",
      "meta-legend"
    ],
    "score": "high"
  },
  {
    "id": "omen",
    "name": "Omen",
    "shortName": "Omen",
    "summary": "A cursed hole card demotes the hand by one tier.",
    "detail": "A cursed card in your hand drops your hand class one step at reveal — the omen weighs you down regardless of strength.",
    "family": "identity",
    "tags": [
      "identity-token",
      "late-detonation"
    ],
    "tier": "wild",
    "deal": {
      "holeCards": 2,
      "communityCards": 5,
      "deck": "cursed"
    },
    "phaseEffects": {
      "reveal": [
        "cursedTierDemote"
      ]
    },
    "infoFeatures": [
      "omen",
      "meta-legend"
    ],
    "score": "high"
  },
  {
    "id": "pandemonium",
    "name": "Pandemonium",
    "shortName": "Pandemonium",
    "summary": "A different chaos effect fires every street, with cards in superposition all the way through.",
    "detail": "Flop bumps every rank up, turn rotates hole-card ranks across the table, and river inverts ranks; reveal collapses every superposed card to whichever identity scores best.",
    "family": "identity",
    "tags": [
      "identity-token",
      "positional",
      "weather"
    ],
    "tier": "insanity",
    "deal": {
      "holeCards": 2,
      "communityCards": 5,
      "possibleIdentities": "holesAndBoard"
    },
    "phaseEffects": {
      "flop": [
        "incrementAllRanks"
      ],
      "turn": [
        "rotateHoleRanksAcrossHands"
      ],
      "river": [
        "invertAllRanks"
      ]
    },
    "identityResolution": "bestPossible",
    "infoFeatures": [
      "pandemonium"
    ],
    "score": "high"
  },
  {
    "id": "pickpocket",
    "name": "Pickpocket",
    "shortName": "Pickpocket",
    "summary": "A trickster card swaps with the right neighbor's leftmost hole at river.",
    "detail": "At river the trickster jumps seats — its holder gives it up to the next seat and inherits that seat's leftmost hole in exchange.",
    "family": "identity",
    "tags": [
      "identity-token",
      "late-detonation",
      "positional"
    ],
    "tier": "chaos",
    "deal": {
      "holeCards": 2,
      "communityCards": 5,
      "deck": "trickster"
    },
    "phaseEffects": {
      "river": [
        "tricksterSwapRight"
      ]
    },
    "infoFeatures": [
      "pickpocket",
      "meta-legend"
    ],
    "score": "high"
  },
  {
    "id": "probability-cloud",
    "name": "Probability Cloud",
    "shortName": "Cloud",
    "summary": "Community cards carry unresolved alternate ranks.",
    "detail": "Board cards have alternate identities before reveal; scoring resolves to the strongest possible version.",
    "family": "identity",
    "tags": [
      "identity-token"
    ],
    "tier": "insanity",
    "deal": {
      "holeCards": 2,
      "communityCards": 5,
      "possibleIdentities": "board"
    },
    "identityResolution": "bestPossible",
    "infoFeatures": [
      "probability-cloud"
    ],
    "score": "high"
  },
  {
    "id": "prophets",
    "name": "Prophets",
    "shortName": "Prophets",
    "summary": "Forced last hole per hand is a tarot card.",
    "detail": "Every seat's final hole card arrives as a tarot, biasing each hand's late-deal read toward whatever the tarot deck implies.",
    "family": "identity",
    "tags": [
      "identity-token"
    ],
    "tier": "wild",
    "deal": {
      "holeCards": 2,
      "communityCards": 5,
      "forceTarotHoleCards": 1
    },
    "forceRankByMeta": {
      "last": "tarot"
    },
    "infoFeatures": [
      "prophets",
      "meta-legend"
    ],
    "score": "high"
  },
  {
    "id": "reality-tear",
    "name": "Reality Tear",
    "shortName": "Tear",
    "summary": "One reality-torn card has multiple possible identities.",
    "detail": "Cards can carry alternate identities and reveal scoring resolves the strongest possible version.",
    "family": "identity",
    "tags": [
      "identity-token"
    ],
    "tier": "insanity",
    "deal": {
      "holeCards": 2,
      "communityCards": 5,
      "possibleIdentities": "holesAndBoard"
    },
    "identityResolution": "bestPossible",
    "infoFeatures": [
      "reality-tear"
    ],
    "score": "high"
  },
  {
    "id": "relic",
    "name": "Relic",
    "shortName": "Relic",
    "summary": "A blessed hole card auto-elevates the hand by one tier.",
    "detail": "Holding a blessed card upgrades the hand's class one step at reveal — the relic carries weight beyond its raw rank.",
    "family": "identity",
    "tags": [
      "identity-token",
      "late-detonation"
    ],
    "tier": "wild",
    "deal": {
      "holeCards": 2,
      "communityCards": 5,
      "deck": "blessed"
    },
    "phaseEffects": {
      "reveal": [
        "blessedTierBump"
      ]
    },
    "infoFeatures": [
      "relic",
      "meta-legend"
    ],
    "score": "high"
  },
  {
    "id": "schrodingers-board",
    "name": "Schrodinger's Board",
    "shortName": "S Board",
    "summary": "The board exists in two possible versions.",
    "detail": "Every community card carries a second possible identity; reveal scoring picks the strongest coherent version per hand.",
    "family": "identity",
    "tags": [
      "identity-token"
    ],
    "tier": "insanity",
    "deal": {
      "holeCards": 2,
      "communityCards": 5,
      "possibleIdentities": "board"
    },
    "identityResolution": "bestPossible",
    "infoFeatures": [
      "schrodingers-board"
    ],
    "score": "high"
  },
  {
    "id": "schrodingers-hole",
    "name": "Schrodinger's Hole",
    "shortName": "Schrodinger",
    "summary": "Hole cards stay in superposition until reveal collapses them.",
    "detail": "Every hand's private cards carry multiple possible identities through preflop, flop, turn, and river; reveal resolves each card to the strongest version for scoring.",
    "family": "identity",
    "tags": [
      "identity-token"
    ],
    "tier": "insanity",
    "deal": {
      "holeCards": 2,
      "communityCards": 5,
      "possibleIdentities": "holes"
    },
    "identityResolution": "bestPossible",
    "infoFeatures": [
      "schrodingers-hole"
    ],
    "score": "high"
  },
  {
    "id": "tarot",
    "name": "Tarot",
    "shortName": "Tarot",
    "summary": "Two arcana cards are shuffled into the deck and play as wild cards.",
    "detail": "Whichever hand or board picks up an arcana card can read it as the strongest identity available at reveal.",
    "family": "identity",
    "tags": [
      "identity-token"
    ],
    "tier": "standard",
    "deal": {
      "holeCards": 2,
      "communityCards": 5,
      "deck": "tarot"
    },
    "wildCards": {
      "metas": [
        "tarot"
      ]
    },
    "infoFeatures": [
      "meta-legend"
    ],
    "score": "high"
  },
  {
    "id": "tarot-tower",
    "name": "Tarot Tower",
    "shortName": "Tarot Twr",
    "summary": "A tarot card on the board shifts every rank +1 each phase.",
    "detail": "Each street, the tarot tower advances every rank in play by one — a slow climb that detonates by reveal into wholly different reads.",
    "family": "identity",
    "tags": [
      "identity-token",
      "late-detonation"
    ],
    "tier": "insanity",
    "deal": {
      "holeCards": 2,
      "communityCards": 5,
      "deck": "tarot"
    },
    "phaseEffects": {
      "flop": [
        "tarotRankShift"
      ],
      "turn": [
        "tarotRankShift"
      ],
      "river": [
        "tarotRankShift"
      ]
    },
    "infoFeatures": [
      "tarot-tower",
      "meta-legend"
    ],
    "score": "high"
  },
  {
    "id": "trickster-card",
    "name": "Trickster Card",
    "shortName": "Trick",
    "summary": "One trickster card is shuffled in; whichever hand holds it finishes last.",
    "detail": "The trickster marker overrides poker strength at reveal, dropping its hand below every non-trickster hand regardless of made-hand quality.",
    "family": "identity",
    "tags": [
      "identity-token"
    ],
    "tier": "wild",
    "deal": {
      "holeCards": 2,
      "communityCards": 5,
      "deck": "trickster"
    },
    "forceRankByMeta": {
      "last": "trickster"
    },
    "infoFeatures": [
      "meta-legend"
    ],
    "score": "high"
  },
  {
    "id": "two-faced",
    "name": "Two-Faced",
    "shortName": "Two-Faced",
    "summary": "A two-suited card scores under whichever suit benefits the hand.",
    "detail": "At reveal, two-suited cards collapse to whichever suit improves their hand's read — flushes everywhere become possible.",
    "family": "identity",
    "tags": [
      "identity-token"
    ],
    "tier": "wild",
    "deal": {
      "holeCards": 2,
      "communityCards": 5,
      "deck": "twoSuited"
    },
    "identityResolution": "bestPossible",
    "infoFeatures": [
      "two-faced",
      "meta-legend"
    ],
    "score": "high"
  },
  {
    "id": "two-suited-card",
    "name": "Two-Suited Card",
    "shortName": "2-Suit",
    "summary": "One card carries two suits at once for flush purposes.",
    "detail": "The marked card counts as whichever of its two suits makes the better flush at reveal, while its rank stays fixed.",
    "family": "identity",
    "tags": [
      "identity-token"
    ],
    "tier": "wild",
    "deal": {
      "holeCards": 2,
      "communityCards": 5,
      "deck": "twoSuited"
    },
    "wildCards": {
      "metas": [
        "twoSuited"
      ]
    },
    "infoFeatures": [
      "meta-legend"
    ],
    "score": "high"
  },
  {
    "id": "card-constellation",
    "name": "Card Constellation",
    "shortName": "Constellation",
    "summary": "Sevens form a constellation across the table and play as wild cards.",
    "detail": "Every seven, in hands or on the board, can substitute for whichever rank or suit completes the strongest reveal hand.",
    "family": "hand",
    "tags": [
      "wild"
    ],
    "tier": "insanity",
    "deal": {
      "holeCards": 2,
      "communityCards": 5
    },
    "wildCards": {
      "ranks": [
        "7"
      ]
    },
    "infoFeatures": [
      "card-constellation"
    ],
    "score": "high"
  },
  {
    "id": "card-halo",
    "name": "Card Halo",
    "shortName": "Halo",
    "summary": "Neighboring ranks gain a pair aura.",
    "detail": "Adjacent ranks can create a synthetic pair during showdown.",
    "family": "hand",
    "tags": [
      "wild"
    ],
    "tier": "insanity",
    "deal": {
      "holeCards": 2,
      "communityCards": 5
    },
    "infoFeatures": [
      "card-halo"
    ],
    "syntheticPair": "adjacent",
    "score": "high"
  },
  {
    "id": "card-lunar",
    "name": "Card Lunar",
    "shortName": "Lunar",
    "summary": "Hearts wax full and play as wild cards at showdown.",
    "detail": "Every heart in a hand or on the board can stand in for whichever rank or suit completes the strongest reveal hand.",
    "family": "hand",
    "tags": [
      "wild"
    ],
    "tier": "insanity",
    "deal": {
      "holeCards": 2,
      "communityCards": 5
    },
    "wildCards": {
      "suits": [
        "H"
      ]
    },
    "infoFeatures": [
      "card-lunar"
    ],
    "score": "high"
  },
  {
    "id": "card-marriage",
    "name": "Card Marriage",
    "shortName": "Marriage",
    "summary": "Cards are bonded into pairs that move and score together.",
    "detail": "A public marker announces which cards are wedded; bonded cards travel as a unit and contribute to the same made-hand reads at reveal.",
    "family": "hand",
    "tags": [
      "wild"
    ],
    "tier": "twist",
    "deal": {
      "holeCards": 2,
      "communityCards": 5
    },
    "infoFeatures": [
      "card-marriage"
    ],
    "syntheticPair": "adjacent",
    "score": "high"
  },
  {
    "id": "card-pendulum",
    "name": "Card Pendulum",
    "shortName": "Pendulum",
    "summary": "Every seven plays as a wild card at showdown.",
    "detail": "The pendulum locks sevens as the wild rank for the hand, letting every seven substitute for whichever rank or suit improves the made hand at reveal.",
    "family": "hand",
    "tags": [
      "wild"
    ],
    "tier": "wild",
    "deal": {
      "holeCards": 2,
      "communityCards": 5
    },
    "wildCards": {
      "ranks": [
        "7"
      ]
    },
    "infoFeatures": [
      "card-pendulum"
    ],
    "score": "high"
  },
  {
    "id": "flood",
    "name": "Flood",
    "shortName": "Flood",
    "summary": "Every two, three, four, and five plays as a wild card at showdown.",
    "detail": "The four lowest ranks all substitute into stronger identities at reveal, turning otherwise dead low cards into the building blocks of big made hands.",
    "family": "hand",
    "tags": [
      "wild"
    ],
    "tier": "wild",
    "deal": {
      "holeCards": 2,
      "communityCards": 5
    },
    "wildCards": {
      "ranks": [
        "2",
        "3",
        "4",
        "5"
      ]
    },
    "infoFeatures": [
      "flood"
    ],
    "score": "high"
  },
  {
    "id": "flood-select",
    "name": "Flood Select",
    "shortName": "Flood+",
    "summary": "Peek 3 cards and sculpt your start, knowing low cards will play wild.",
    "detail": "A select-stage Flood: each hand sees three private candidates and sculpts a two-card start, knowing every two, three, four, and five substitutes into stronger identities at reveal.",
    "family": "selection",
    "tags": [
      "peek-keep",
      "wild"
    ],
    "tier": "twist",
    "deal": {
      "holeCards": 2,
      "dealChoice": {
        "dealtCards": 3,
        "keepCards": 2,
        "selectionPhase": true
      },
      "communityCards": 5
    },
    "wildCards": {
      "ranks": [
        "2",
        "3",
        "4",
        "5"
      ]
    },
    "infoFeatures": [
      "flood"
    ],
    "score": "high"
  },
  {
    "id": "twin-suits",
    "name": "Twin Suits",
    "shortName": "Twins",
    "summary": "Hearts/diamonds and clubs/spades merge for flushes.",
    "detail": "Red suits evaluate as one suit and black suits evaluate as one suit for showdown.",
    "family": "hand",
    "tags": [
      "wild"
    ],
    "tier": "twist",
    "deal": {
      "holeCards": 2,
      "communityCards": 5
    },
    "suitTransform": "color",
    "score": "high"
  },
  {
    "id": "wild-aces",
    "name": "Wild Aces",
    "shortName": "Wild A",
    "summary": "Aces are wild for showdown.",
    "detail": "Every ace can substitute into the strongest available identity at reveal.",
    "family": "hand",
    "tags": [
      "wild"
    ],
    "tier": "standard",
    "deal": {
      "holeCards": 2,
      "communityCards": 5
    },
    "wildCards": {
      "ranks": [
        "A"
      ]
    },
    "score": "high"
  },
  {
    "id": "wild-connector",
    "name": "Wild Connector",
    "shortName": "Connect",
    "summary": "Adjacent ranks can behave like a pair.",
    "detail": "A connected rank pair creates a synthetic pair during showdown evaluation.",
    "family": "hand",
    "tags": [
      "wild"
    ],
    "tier": "twist",
    "deal": {
      "holeCards": 2,
      "communityCards": 5
    },
    "syntheticPair": "adjacent",
    "score": "high"
  },
  {
    "id": "wild-edge",
    "name": "Wild Edge",
    "shortName": "Edge",
    "summary": "Twos and aces are wild.",
    "detail": "Both deck edges can substitute into the strongest available reveal identity.",
    "family": "hand",
    "tags": [
      "wild"
    ],
    "tier": "twist",
    "deal": {
      "holeCards": 2,
      "communityCards": 5
    },
    "wildCards": {
      "ranks": [
        "2",
        "A"
      ]
    },
    "score": "high"
  },
  {
    "id": "wild-faces",
    "name": "Wild Faces",
    "shortName": "Faces",
    "summary": "Jacks, queens, and kings are wild.",
    "detail": "Face cards can substitute into stronger identities at reveal, creating volatile high-card and made-hand swings.",
    "family": "hand",
    "tags": [
      "wild"
    ],
    "tier": "twist",
    "deal": {
      "holeCards": 2,
      "communityCards": 5
    },
    "wildCards": {
      "ranks": [
        "J",
        "Q",
        "K"
      ]
    },
    "score": "high"
  },
  {
    "id": "wild-faces-mulligan",
    "name": "Wild Faces Mulligan",
    "shortName": "Faces M",
    "summary": "Mulligan in a wild-faces world — redraw if face density doesn't match your plan.",
    "detail": "A select-stage Wild Faces: each hand can lock its dealt pair or burn a one-time mulligan, knowing jacks, queens, and kings all substitute into stronger identities at reveal.",
    "family": "selection",
    "tags": [
      "mulligan",
      "wild"
    ],
    "tier": "twist",
    "deal": {
      "holeCards": 2,
      "dealChoice": {
        "dealtCards": 2,
        "keepCards": 2,
        "selectionPhase": true,
        "mulligan": true
      },
      "communityCards": 5
    },
    "wildCards": {
      "ranks": [
        "J",
        "Q",
        "K"
      ]
    },
    "score": "high"
  },
  {
    "id": "wild-rank",
    "name": "Wild Rank",
    "shortName": "Wild R",
    "summary": "Every seven plays as a wild card at showdown.",
    "detail": "Any seven in a hand or on the board can stand in for whichever rank or suit makes the strongest reveal hand.",
    "family": "hand",
    "tags": [
      "wild"
    ],
    "tier": "standard",
    "deal": {
      "holeCards": 2,
      "communityCards": 5
    },
    "wildCards": {
      "ranks": [
        "7"
      ]
    },
    "score": "high"
  },
  {
    "id": "wild-rank-roulette",
    "name": "Wild Rank Roulette",
    "shortName": "Roulette",
    "summary": "A new rank becomes wild each street; whichever is wild at reveal counts for showdown.",
    "detail": "Fives, sixes, sevens, and eights take turns as the wild rank across flop, turn, river, and reveal; only the reveal-phase rank substitutes for scoring.",
    "family": "hand",
    "tags": [
      "wild"
    ],
    "tier": "wild",
    "deal": {
      "holeCards": 2,
      "communityCards": 5
    },
    "wildCardsByPhase": {
      "flop": {
        "ranks": [
          "5"
        ]
      },
      "turn": {
        "ranks": [
          "6"
        ]
      },
      "river": {
        "ranks": [
          "7"
        ]
      },
      "reveal": {
        "ranks": [
          "8"
        ]
      }
    },
    "infoFeatures": [
      "wild-rank-roulette"
    ],
    "score": "high"
  },
  {
    "id": "wild-roulette-select",
    "name": "Wild Roulette Select",
    "shortName": "Roul+",
    "summary": "Peek 3 cards before the rotating wild rank locks in for showdown.",
    "detail": "A select-stage Wild Rank Roulette: each hand sees three private candidates and sculpts a two-card start knowing fives, sixes, sevens, and eights rotate as the wild rank through the streets.",
    "family": "selection",
    "tags": [
      "peek-keep",
      "wild"
    ],
    "tier": "twist",
    "deal": {
      "holeCards": 2,
      "dealChoice": {
        "dealtCards": 3,
        "keepCards": 2,
        "selectionPhase": true
      },
      "communityCards": 5
    },
    "wildCardsByPhase": {
      "flop": {
        "ranks": [
          "5"
        ]
      },
      "turn": {
        "ranks": [
          "6"
        ]
      },
      "river": {
        "ranks": [
          "7"
        ]
      },
      "reveal": {
        "ranks": [
          "8"
        ]
      }
    },
    "infoFeatures": [
      "wild-rank-roulette"
    ],
    "score": "high"
  },
  {
    "id": "wild-spread",
    "name": "Wild Spread",
    "shortName": "Spread",
    "summary": "Far-apart ranks can behave like a pair.",
    "detail": "A wide rank spread creates a synthetic pair during showdown evaluation.",
    "family": "hand",
    "tags": [
      "wild"
    ],
    "tier": "twist",
    "deal": {
      "holeCards": 2,
      "communityCards": 5
    },
    "syntheticPair": "spread",
    "score": "high"
  },
  {
    "id": "wild-suit",
    "name": "Wild Suit",
    "shortName": "Wild S",
    "summary": "Every heart plays as a wild card at showdown.",
    "detail": "Any heart in a hand or on the board can stand in for whichever rank or suit makes the strongest reveal hand.",
    "family": "hand",
    "tags": [
      "wild"
    ],
    "tier": "standard",
    "deal": {
      "holeCards": 2,
      "communityCards": 5
    },
    "wildCards": {
      "suits": [
        "H"
      ]
    },
    "score": "high"
  },
  {
    "id": "chromatic",
    "name": "Chromatic",
    "shortName": "Chromatic",
    "summary": "Every hand's holes are one red plus one black.",
    "detail": "Every seat starts with exactly one red and one black hole, killing color-heavy reads on hole cards alone.",
    "family": "environment",
    "tags": [
      "constrained-deal"
    ],
    "tier": "twist",
    "deal": {
      "holeCards": 2,
      "communityCards": 5,
      "constraint": "bichrome"
    },
    "infoFeatures": [
      "chromatic"
    ],
    "score": "high"
  },
  {
    "id": "connected-hole",
    "name": "Connected Hole",
    "shortName": "Connected",
    "summary": "Hole cards in every hand are guaranteed adjacent ranks.",
    "detail": "Every hand starts with neighboring ranks, creating visible straight paths while keeping classic high-hand scoring.",
    "family": "environment",
    "tags": [
      "constrained-deal"
    ],
    "tier": "twist",
    "deal": {
      "holeCards": 2,
      "communityCards": 5,
      "constraint": "connectedRanks"
    },
    "score": "high"
  },
  {
    "id": "echo",
    "name": "Echo",
    "shortName": "Echo",
    "summary": "Both hole cards in every hand share a rank.",
    "detail": "Every hand starts as a pocket pair, creating dense rank collisions and sharper kicker races through the board.",
    "family": "environment",
    "tags": [
      "constrained-deal"
    ],
    "tier": "twist",
    "deal": {
      "holeCards": 2,
      "communityCards": 5,
      "constraint": "pocketPair"
    },
    "score": "high"
  },
  {
    "id": "gap-club",
    "name": "Gap Club",
    "shortName": "Gap Club",
    "summary": "Every hand's holes are exactly 5 ranks apart.",
    "detail": "A fixed-gap deal — every seat opens with two holes precisely five ranks apart, framing every read around mid-range straights.",
    "family": "environment",
    "tags": [
      "constrained-deal"
    ],
    "tier": "twist",
    "deal": {
      "holeCards": 2,
      "communityCards": 5,
      "constraint": "fixedGap5"
    },
    "infoFeatures": [
      "gap-club"
    ],
    "score": "high"
  },
  {
    "id": "gapped-hole",
    "name": "Gapped Hole",
    "shortName": "Gapped",
    "summary": "Hole cards in every hand are guaranteed two ranks apart.",
    "detail": "Every hand starts with a one-rank gap between its cards, creating less direct straight texture than Connected Hole.",
    "family": "environment",
    "tags": [
      "constrained-deal"
    ],
    "tier": "twist",
    "deal": {
      "holeCards": 2,
      "communityCards": 5,
      "constraint": "gappedRanks"
    },
    "score": "high"
  },
  {
    "id": "mirror-match",
    "name": "Mirror Match",
    "shortName": "Mirror",
    "summary": "Every hand shares the same first hole card.",
    "detail": "A single mirrored anchor card appears in every hand, so the second hole card and board texture decide the spread.",
    "family": "environment",
    "tags": [
      "constrained-deal"
    ],
    "tier": "twist",
    "deal": {
      "holeCards": 2,
      "communityCards": 5,
      "constraint": "sharedFirstCard"
    },
    "score": "high"
  },
  {
    "id": "monochrome",
    "name": "Monochrome",
    "shortName": "Monochrome",
    "summary": "Every hand's holes are the same color.",
    "detail": "Each seat is dealt two cards of matching color — every hand is either all-red or all-black before the board lands.",
    "family": "environment",
    "tags": [
      "constrained-deal"
    ],
    "tier": "twist",
    "deal": {
      "holeCards": 2,
      "communityCards": 5,
      "constraint": "monochrome"
    },
    "infoFeatures": [
      "monochrome"
    ],
    "score": "high"
  },
  {
    "id": "peasant-deal",
    "name": "Peasant Deal",
    "shortName": "Peasant",
    "summary": "Every hand starts with two pip cards (2–9).",
    "detail": "Hole-card distribution forces both cards into the low pip range, suppressing pair-of-aces openers and rewarding board-built hands.",
    "family": "environment",
    "tags": [
      "constrained-deal"
    ],
    "tier": "twist",
    "deal": {
      "holeCards": 2,
      "communityCards": 5,
      "constraint": "lowRanks"
    },
    "infoFeatures": [
      "peasant-deal"
    ],
    "score": "high"
  },
  {
    "id": "polar-hole",
    "name": "Polar Hole",
    "shortName": "Polar",
    "summary": "Every hand starts with one high card and one low card.",
    "detail": "Each two-card hand is split between the 8-A high band and the 2-7 low band, creating visible kicker asymmetry.",
    "family": "environment",
    "tags": [
      "constrained-deal"
    ],
    "tier": "twist",
    "deal": {
      "holeCards": 2,
      "communityCards": 5,
      "constraint": "polarRanks"
    },
    "score": "high"
  },
  {
    "id": "rainbow-hole",
    "name": "Rainbow Hole",
    "shortName": "Rainbow",
    "summary": "Hole cards in every hand are guaranteed different suits.",
    "detail": "Every hand starts with two suits represented, reducing suited-hole certainty while keeping classic high-hand scoring.",
    "family": "environment",
    "tags": [
      "constrained-deal"
    ],
    "tier": "twist",
    "deal": {
      "holeCards": 2,
      "communityCards": 5,
      "constraint": "differentSuits"
    },
    "score": "high"
  },
  {
    "id": "royal-deal",
    "name": "Royal Deal",
    "shortName": "Royal",
    "summary": "Every hand starts with at least one face card.",
    "detail": "Hole-card distribution is constrained so every seat enters preflop holding at least one face card; the early read is a paint-heavy table.",
    "family": "environment",
    "tags": [
      "constrained-deal"
    ],
    "tier": "twist",
    "deal": {
      "holeCards": 2,
      "communityCards": 5,
      "constraint": "atLeastOneFace"
    },
    "infoFeatures": [
      "royal-deal"
    ],
    "score": "high"
  },
  {
    "id": "royal-spark",
    "name": "Royal Spark",
    "shortName": "Royal",
    "summary": "Both hole cards in every hand come from the high ranks.",
    "detail": "Every hand starts with two cards from 8 through Ace, making preflop strength dense and board kickers sharper.",
    "family": "environment",
    "tags": [
      "constrained-deal"
    ],
    "tier": "twist",
    "deal": {
      "holeCards": 2,
      "communityCards": 5,
      "constraint": "highRanks"
    },
    "score": "high"
  },
  {
    "id": "same-rank",
    "name": "Same Rank",
    "shortName": "Same Rank",
    "summary": "Every hand is a forced pocket pair, but pairs don't score.",
    "detail": "Each hand is dealt a pocket pair, then the pair tier is excluded from scoring — the table fights for trips, two pair, or flushes built around the pair.",
    "family": "identity",
    "tags": [
      "constrained-deal",
      "late-detonation",
      "mission"
    ],
    "tier": "twist",
    "deal": {
      "holeCards": 2,
      "communityCards": 5,
      "constraint": "pocketPair"
    },
    "phaseEffects": {
      "reveal": [
        "excludePairTier"
      ]
    },
    "infoFeatures": [
      "same-rank"
    ],
    "score": "high"
  },
  {
    "id": "suited-hole",
    "name": "Suited Hole",
    "shortName": "Suited",
    "summary": "Hole cards in every hand are guaranteed the same suit.",
    "detail": "Every hand starts suited, making flush paths more visible without changing classic high-hand scoring.",
    "family": "environment",
    "tags": [
      "constrained-deal"
    ],
    "tier": "twist",
    "deal": {
      "holeCards": 2,
      "communityCards": 5,
      "constraint": "sameSuit"
    },
    "score": "high"
  },
  {
    "id": "twin-spark",
    "name": "Twin Spark",
    "shortName": "Twin",
    "summary": "Both hole cards in every hand come from the low ranks.",
    "detail": "Every hand starts with two cards from 2 through 7, compressing early strength and making board improvement matter more.",
    "family": "environment",
    "tags": [
      "constrained-deal"
    ],
    "tier": "twist",
    "deal": {
      "holeCards": 2,
      "communityCards": 5,
      "constraint": "lowRanks"
    },
    "score": "high"
  },
  {
    "id": "auction-row",
    "name": "Auction Row",
    "shortName": "Auction",
    "summary": "Five face-up cards auctioned by ready-order; pick one then draft another.",
    "detail": "At deal, five public candidates wait in an auction row; players claim one each in ready-up order, then a second pass fills the second hole.",
    "family": "selection",
    "tags": [],
    "tier": "twist",
    "deal": {
      "holeCards": 2,
      "dealChoice": {
        "dealtCards": 5,
        "keepCards": 2,
        "selectionPhase": true,
        "auction": true
      },
      "communityCards": 5
    },
    "infoFeatures": [
      "auction-row"
    ],
    "score": "high"
  },
  {
    "id": "back-room",
    "name": "Back Room",
    "shortName": "Back Rm",
    "summary": "Peek 5 keep 2; the 3 discards become public face-up cards.",
    "detail": "Each player sees five candidates and keeps two; the three discards from each hand are pushed face-up into a public side board readable by every player.",
    "family": "selection",
    "tags": [
      "late-detonation",
      "peek-keep"
    ],
    "tier": "twist",
    "deal": {
      "holeCards": 2,
      "dealChoice": {
        "dealtCards": 5,
        "keepCards": 2,
        "selectionPhase": true
      },
      "communityCards": 5,
      "discardedCardsToCommunity": true
    },
    "infoFeatures": [
      "back-room"
    ],
    "score": "high"
  },
  {
    "id": "card-inheritance",
    "name": "Card Inheritance",
    "shortName": "Inherit",
    "summary": "Keep one hole card; the other is inherited from your right neighbor's discard.",
    "detail": "Every owner picks one of two dealt cards to keep. The other is discarded left, so each final hand pairs one kept card with the right neighbor's discard while a public inheritance hint tracks the rule.",
    "family": "selection",
    "tags": [
      "inheritance",
      "relational"
    ],
    "tier": "twist",
    "deal": {
      "holeCards": 2,
      "dealChoice": {
        "dealtCards": 2,
        "keepCards": 1,
        "selectionPhase": true,
        "inheritance": true
      },
      "communityCards": 5
    },
    "infoFeatures": [
      "card-inheritance"
    ],
    "score": "high"
  },
  {
    "id": "crowd-pick",
    "name": "Crowd Pick",
    "shortName": "Crowd",
    "summary": "Other players pick which 2 of your 4 holes you keep.",
    "detail": "Each seat is dealt four candidates face-up; the rest of the table votes on which two stay, removing personal agency from hand construction.",
    "family": "selection",
    "tags": [
      "relational"
    ],
    "tier": "twist",
    "deal": {
      "holeCards": 2,
      "dealChoice": {
        "dealtCards": 4,
        "keepCards": 2,
        "selectionPhase": true,
        "tablePicks": true
      },
      "communityCards": 5
    },
    "infoFeatures": [
      "crowd-pick"
    ],
    "score": "high"
  },
  {
    "id": "double-down",
    "name": "Double Down",
    "shortName": "Dbl Down",
    "summary": "Opt for 3 holes instead of 2 — accept a +1 tier penalty.",
    "detail": "At deal each player can take a third hole card; their final ranking is bumped down one tier as the cost of the extra information.",
    "family": "selection",
    "tags": [
      "late-detonation"
    ],
    "tier": "twist",
    "deal": {
      "holeCards": 2,
      "dealChoice": {
        "dealtCards": 3,
        "keepCards": 2,
        "selectionPhase": true,
        "optInHole3WithPenalty": true
      },
      "communityCards": 5
    },
    "phaseEffects": {
      "reveal": [
        "optedTierPenalty"
      ]
    },
    "infoFeatures": [
      "double-down"
    ],
    "score": "high"
  },
  {
    "id": "earthquake-select",
    "name": "Earthquake Select",
    "shortName": "Quake+",
    "summary": "Peek 3 cards and sculpt your start before the turn-shuffle scrambles the board.",
    "detail": "A select-stage Earthquake: each hand sees three private candidates and sculpts a two-card start, knowing the community cards will shake into a new order when the turn arrives.",
    "family": "selection",
    "tags": [
      "peek-keep",
      "weather"
    ],
    "tier": "twist",
    "deal": {
      "holeCards": 2,
      "dealChoice": {
        "dealtCards": 3,
        "keepCards": 2,
        "selectionPhase": true
      },
      "communityCards": 5
    },
    "phaseEffects": {
      "turn": [
        "shuffleCommunity"
      ]
    },
    "infoFeatures": [
      "earthquake"
    ],
    "score": "high"
  },
  {
    "id": "inheritance",
    "name": "Inheritance",
    "shortName": "Inherit",
    "summary": "Keep one hole card; your second card comes from the right neighbor's discard.",
    "detail": "Every owner chooses one card to keep. The other card is discarded left, so each final hand combines one kept card with the right neighbor's discarded card.",
    "family": "selection",
    "tags": [
      "inheritance",
      "relational"
    ],
    "tier": "twist",
    "deal": {
      "holeCards": 2,
      "dealChoice": {
        "dealtCards": 2,
        "keepCards": 1,
        "selectionPhase": true,
        "inheritance": true
      },
      "communityCards": 5
    },
    "score": "high"
  },
  {
    "id": "lowball-select",
    "name": "Lowball Select",
    "shortName": "Low+",
    "summary": "Peek three deal cards and keep any two; worst poker hand wins.",
    "detail": "A select-stage Lowball: each hand sculpts a two-card start from three candidates, then ranks for the weakest hand.",
    "family": "selection",
    "tags": [
      "mission",
      "peek-keep"
    ],
    "tier": "twist",
    "deal": {
      "holeCards": 2,
      "dealChoice": {
        "dealtCards": 3,
        "keepCards": 2,
        "selectionPhase": true
      },
      "communityCards": 5
    },
    "score": "lowball"
  },
  {
    "id": "mirror-universe-mulligan",
    "name": "Mirror Universe Mulligan",
    "shortName": "MU M",
    "summary": "Mulligan against the river-rank flip — redraw if you mispredict the inversion.",
    "detail": "A select-stage Mirror Universe: each hand can lock its dealt pair or burn a one-time mulligan, then river inverts every rank so aces become twos and kings become threes before reveal.",
    "family": "selection",
    "tags": [
      "late-detonation",
      "mulligan",
      "weather"
    ],
    "tier": "wild",
    "deal": {
      "holeCards": 2,
      "dealChoice": {
        "dealtCards": 2,
        "keepCards": 2,
        "selectionPhase": true,
        "mulligan": true
      },
      "communityCards": 5
    },
    "phaseEffects": {
      "river": [
        "invertAllRanks"
      ]
    },
    "infoFeatures": [
      "mirror-universe"
    ],
    "score": "high"
  },
  {
    "id": "mulligan",
    "name": "Mulligan",
    "shortName": "Mulligan",
    "summary": "Every hand may refuse its first two cards once and redraw before ranking starts.",
    "detail": "A deal-choice phase lets each hand either lock its original two-card start or spend a one-time full redraw.",
    "family": "selection",
    "tags": [
      "mulligan"
    ],
    "tier": "twist",
    "deal": {
      "holeCards": 2,
      "dealChoice": {
        "dealtCards": 2,
        "keepCards": 2,
        "selectionPhase": true,
        "mulligan": true
      },
      "communityCards": 5
    },
    "score": "high"
  },
  {
    "id": "omaha-luxe-select",
    "name": "Omaha Select",
    "shortName": "Omaha+",
    "summary": "Peek five deal cards and keep any four before ranking starts.",
    "detail": "A select-stage Omaha Luxe: each hand sees five private candidates and sculpts a four-card start.",
    "family": "selection",
    "tags": [
      "peek-keep"
    ],
    "tier": "twist",
    "deal": {
      "holeCards": 2,
      "dealChoice": {
        "dealtCards": 5,
        "keepCards": 4,
        "selectionPhase": true
      },
      "communityCards": 5
    },
    "score": "high"
  },
  {
    "id": "oracle-peek",
    "name": "Oracle Peek",
    "shortName": "Oracle",
    "summary": "Peek 1 community card before locking your hand.",
    "detail": "At deal, each player sees one upcoming community slot in private, then locks their two hole cards with that information in mind.",
    "family": "selection",
    "tags": [],
    "tier": "twist",
    "deal": {
      "holeCards": 2,
      "dealChoice": {
        "dealtCards": 2,
        "keepCards": 2,
        "selectionPhase": true,
        "peekBoard": 1
      },
      "communityCards": 5
    },
    "infoFeatures": [
      "oracle-peek"
    ],
    "score": "high"
  },
  {
    "id": "pent-select",
    "name": "Pent Select",
    "shortName": "Pent+",
    "summary": "Peek six deal cards and keep any five before ranking starts.",
    "detail": "A select-stage Pent: each hand sees six private candidates and sculpts a five-card start.",
    "family": "selection",
    "tags": [
      "peek-keep"
    ],
    "tier": "twist",
    "deal": {
      "holeCards": 2,
      "dealChoice": {
        "dealtCards": 6,
        "keepCards": 5,
        "selectionPhase": true
      },
      "communityCards": 5
    },
    "score": "high"
  },
  {
    "id": "pick-2-of-5",
    "name": "Pick 2 of 5",
    "shortName": "Pick 2",
    "summary": "Every hand is dealt five cards; the owner keeps any two before ranking starts.",
    "detail": "A deeper deal-choice phase gives each player five private candidates and asks them to sculpt a two-card start.",
    "family": "selection",
    "tags": [
      "peek-keep"
    ],
    "tier": "twist",
    "deal": {
      "holeCards": 2,
      "dealChoice": {
        "dealtCards": 5,
        "keepCards": 2,
        "selectionPhase": true
      },
      "communityCards": 5
    },
    "score": "high"
  },
  {
    "id": "pick-3-of-7",
    "name": "Pick 3 of 7",
    "shortName": "Pick 3",
    "summary": "Every hand is dealt seven cards; the owner keeps any three before ranking starts.",
    "detail": "A heavy deal-choice phase gives each player seven private candidates and asks them to sculpt a three-card start.",
    "family": "selection",
    "tags": [
      "peek-keep"
    ],
    "tier": "twist",
    "deal": {
      "holeCards": 2,
      "dealChoice": {
        "dealtCards": 7,
        "keepCards": 3,
        "selectionPhase": true
      },
      "communityCards": 5
    },
    "score": "high"
  },
  {
    "id": "players-choice",
    "name": "Player's Choice",
    "shortName": "Choice",
    "summary": "Every hand is dealt three cards; the owner keeps any two before ranking starts.",
    "detail": "A deal-choice phase lets each player sculpt their starting hands, then the game continues as classic Ding.",
    "family": "selection",
    "tags": [
      "peek-keep"
    ],
    "tier": "twist",
    "deal": {
      "holeCards": 2,
      "dealChoice": {
        "dealtCards": 3,
        "keepCards": 2,
        "selectionPhase": true
      },
      "communityCards": 5
    },
    "score": "high"
  },
  {
    "id": "recruit",
    "name": "Recruit",
    "shortName": "Recruit",
    "summary": "Steal one card from the next player's discard pile at deal.",
    "detail": "After deal-choice, each player can grab a card their right-neighbor just discarded, inverting the inheritance flow.",
    "family": "selection",
    "tags": [
      "relational"
    ],
    "tier": "twist",
    "deal": {
      "holeCards": 2,
      "dealChoice": {
        "dealtCards": 3,
        "keepCards": 2,
        "selectionPhase": true,
        "recruit": true
      },
      "communityCards": 5
    },
    "infoFeatures": [
      "recruit"
    ],
    "score": "high"
  },
  {
    "id": "sacrifice",
    "name": "Sacrifice",
    "shortName": "Sacrifice",
    "summary": "Discard 1 hole at deal to peek the flop one phase early.",
    "detail": "Players may give up one of their two starting cards to peek a flop card during preflop, trading raw strength for early information.",
    "family": "selection",
    "tags": [],
    "tier": "twist",
    "deal": {
      "holeCards": 2,
      "dealChoice": {
        "dealtCards": 2,
        "keepCards": 1,
        "selectionPhase": true,
        "sacrificeForPeek": true
      },
      "communityCards": 5
    },
    "infoFeatures": [
      "sacrifice"
    ],
    "score": "high"
  },
  {
    "id": "secret-trade",
    "name": "Secret Trade",
    "shortName": "Sec Trade",
    "summary": "Each player drops one hole into a face-down pool and draws one back blind.",
    "detail": "At deal, every player commits one hole into the center face-down; the pool is shuffled and each player redraws one card without knowing whose it was.",
    "family": "selection",
    "tags": [],
    "tier": "twist",
    "deal": {
      "holeCards": 2,
      "dealChoice": {
        "dealtCards": 2,
        "keepCards": 2,
        "selectionPhase": true,
        "blindPool": true
      },
      "communityCards": 5
    },
    "infoFeatures": [
      "secret-trade"
    ],
    "score": "high"
  },
  {
    "id": "single-spark-select",
    "name": "Spark Select",
    "shortName": "Spark+",
    "summary": "Peek three deal cards and keep just one before ranking starts.",
    "detail": "A select-stage Single Spark: each hand sees three private candidates and picks the single card to carry into preflop.",
    "family": "selection",
    "tags": [
      "peek-keep"
    ],
    "tier": "twist",
    "deal": {
      "holeCards": 2,
      "dealChoice": {
        "dealtCards": 3,
        "keepCards": 1,
        "selectionPhase": true
      },
      "communityCards": 5
    },
    "score": "high"
  },
  {
    "id": "solar-flare-trade",
    "name": "Solar Flare Trade",
    "shortName": "Flare T",
    "summary": "Pass one card left before the turn reassigns every suit on the table.",
    "detail": "A select-stage Solar Flare: each hand passes one of two dealt cards to the left neighbor, then the turn reshuffles suits across hands and board on a fixed cycle.",
    "family": "selection",
    "tags": [
      "relational",
      "trade-up",
      "weather"
    ],
    "tier": "wild",
    "deal": {
      "holeCards": 2,
      "dealChoice": {
        "dealtCards": 2,
        "keepCards": 1,
        "selectionPhase": true,
        "tradeUp": true
      },
      "communityCards": 5
    },
    "phaseEffects": {
      "turn": [
        "reassignAllSuits"
      ]
    },
    "infoFeatures": [
      "solar-flare"
    ],
    "score": "high"
  },
  {
    "id": "solitaire-select",
    "name": "Solitaire Select",
    "shortName": "Sol+",
    "summary": "Peek eight deal cards and keep any seven before ranking starts.",
    "detail": "A select-stage Solitaire Suite: each hand sees eight private candidates and sculpts a seven-card start.",
    "family": "selection",
    "tags": [
      "peek-keep"
    ],
    "tier": "twist",
    "deal": {
      "holeCards": 2,
      "dealChoice": {
        "dealtCards": 8,
        "keepCards": 7,
        "selectionPhase": true
      },
      "communityCards": 5
    },
    "score": "high"
  },
  {
    "id": "solomon-cut",
    "name": "Solomon Cut",
    "shortName": "Solomon",
    "summary": "Split 4 cards into two pairs; another player picks which pair you keep.",
    "detail": "Each player splits four dealt cards into two pairs of two; the seat to their left chooses which pair becomes the kept hand.",
    "family": "selection",
    "tags": [
      "relational"
    ],
    "tier": "twist",
    "deal": {
      "holeCards": 2,
      "dealChoice": {
        "dealtCards": 4,
        "keepCards": 2,
        "selectionPhase": true,
        "solomon": true
      },
      "communityCards": 5
    },
    "infoFeatures": [
      "solomon-cut"
    ],
    "score": "high"
  },
  {
    "id": "tornado-trade",
    "name": "Tornado Trade",
    "shortName": "Tornado T",
    "summary": "Pass one card left before the turn-rotation hits the table.",
    "detail": "A select-stage Tornado: each hand chooses one of two dealt cards to pass left before preflop, then the turn rotates everyone's hand clockwise as usual.",
    "family": "selection",
    "tags": [
      "positional",
      "relational",
      "trade-up"
    ],
    "tier": "wild",
    "deal": {
      "holeCards": 2,
      "dealChoice": {
        "dealtCards": 2,
        "keepCards": 1,
        "selectionPhase": true,
        "tradeUp": true
      },
      "communityCards": 5
    },
    "phaseEffects": {
      "turn": [
        "rotateHoleCardsClockwise"
      ]
    },
    "infoFeatures": [
      "tornado"
    ],
    "score": "high"
  },
  {
    "id": "trade-up",
    "name": "Trade-Up",
    "shortName": "Trade-Up",
    "summary": "At the deal, each hand passes one selected card to the left neighbor.",
    "detail": "Every owner chooses one hole card to trade away. Cards move simultaneously around the table before preflop ranking starts.",
    "family": "selection",
    "tags": [
      "relational",
      "trade-up"
    ],
    "tier": "twist",
    "deal": {
      "holeCards": 2,
      "dealChoice": {
        "dealtCards": 2,
        "keepCards": 1,
        "selectionPhase": true,
        "tradeUp": true
      },
      "communityCards": 5
    },
    "score": "high"
  },
  {
    "id": "triad-select",
    "name": "Triad Select",
    "shortName": "Triad+",
    "summary": "Peek four deal cards and keep any three before ranking starts.",
    "detail": "A select-stage Triad: each hand sees four private candidates and sculpts a three-card start.",
    "family": "selection",
    "tags": [
      "peek-keep"
    ],
    "tier": "twist",
    "deal": {
      "holeCards": 2,
      "dealChoice": {
        "dealtCards": 4,
        "keepCards": 3,
        "selectionPhase": true
      },
      "communityCards": 5
    },
    "score": "high"
  },
  {
    "id": "book-spread",
    "name": "Book Spread",
    "shortName": "Book",
    "summary": "Two 3-card pages and a spine — pick a page or play the spine.",
    "detail": "Seven board cards form two facing pages bracketing a single spine card; you score with either page or use the spine across both.",
    "family": "environment",
    "tags": [
      "big-hands",
      "multi-board"
    ],
    "tier": "twist",
    "deal": {
      "holeCards": 2,
      "communityCards": 7,
      "boardLayout": {
        "kind": "grid",
        "slots": [
          {
            "row": 0,
            "col": 0,
            "group": "left"
          },
          {
            "row": 0,
            "col": 1,
            "group": "left"
          },
          {
            "row": 0,
            "col": 2,
            "group": "left"
          },
          {
            "row": 0,
            "col": 3,
            "group": "spine"
          },
          {
            "row": 0,
            "col": 4,
            "group": "right"
          },
          {
            "row": 0,
            "col": 5,
            "group": "right"
          },
          {
            "row": 0,
            "col": 6,
            "group": "right"
          }
        ]
      },
      "boards": {
        "count": 3,
        "cardsPerBoard": 5,
        "cardIndexes": [
          [
            0,
            1,
            2,
            3,
            4
          ],
          [
            2,
            3,
            4,
            5,
            6
          ],
          [
            0,
            1,
            3,
            5,
            6
          ]
        ],
        "scoring": "best"
      }
    },
    "infoFeatures": [
      "book-spread"
    ],
    "score": "high"
  },
  {
    "id": "bookends",
    "name": "Bookends",
    "shortName": "Bookends",
    "summary": "7-slot linear; only the two end cards anchor the read.",
    "detail": "The board is wide and the middle is decoration; both endcaps must contribute to the score, framing every hand around the extremes.",
    "family": "hand",
    "tags": [
      "big-hands"
    ],
    "tier": "wild",
    "deal": {
      "holeCards": 2,
      "communityCards": 7,
      "boards": {
        "count": 1,
        "cardsPerBoard": 5,
        "cardIndexes": [
          [
            0,
            1,
            5,
            6,
            3
          ]
        ],
        "scoring": "best"
      }
    },
    "infoFeatures": [
      "bookends"
    ],
    "score": "high"
  },
  {
    "id": "bridge",
    "name": "Bridge",
    "shortName": "Bridge",
    "summary": "Two boards share a single bridging card that votes a side at reveal.",
    "detail": "Nine community cards form two boards joined by one shared bridge; at reveal the bridge picks the side it'll score for and gives that board the win.",
    "family": "environment",
    "tags": [
      "big-hands",
      "late-detonation",
      "multi-board"
    ],
    "tier": "chaos",
    "deal": {
      "holeCards": 2,
      "communityCards": 9,
      "boardLayout": {
        "kind": "dual",
        "primary": 5,
        "secondary": 5,
        "secondaryRole": "mirror"
      },
      "boards": {
        "count": 2,
        "cardsPerBoard": 5,
        "cardIndexes": [
          [
            0,
            1,
            2,
            3,
            4
          ],
          [
            4,
            5,
            6,
            7,
            8
          ]
        ],
        "scoring": "best"
      }
    },
    "phaseEffects": {
      "reveal": [
        "bridgeCardChoice"
      ]
    },
    "infoFeatures": [
      "bridge"
    ],
    "score": "high"
  },
  {
    "id": "chessboard",
    "name": "Chessboard",
    "shortName": "Chess",
    "summary": "8-slot grid; only diagonals score.",
    "detail": "The community arrives in a 4x2 grid; the two diagonals are the only scoring runs, forcing a sliced read of the board.",
    "family": "environment",
    "tags": [
      "big-hands",
      "multi-board"
    ],
    "tier": "chaos",
    "deal": {
      "holeCards": 2,
      "communityCards": 8,
      "boardLayout": {
        "kind": "grid",
        "slots": [
          {
            "row": 0,
            "col": 0,
            "group": "diagA"
          },
          {
            "row": 0,
            "col": 1,
            "group": "diagB"
          },
          {
            "row": 0,
            "col": 2,
            "group": "diagA"
          },
          {
            "row": 0,
            "col": 3,
            "group": "diagB"
          },
          {
            "row": 1,
            "col": 0,
            "group": "diagB"
          },
          {
            "row": 1,
            "col": 1,
            "group": "diagA"
          },
          {
            "row": 1,
            "col": 2,
            "group": "diagB"
          },
          {
            "row": 1,
            "col": 3,
            "group": "diagA"
          }
        ]
      },
      "boards": {
        "count": 2,
        "cardsPerBoard": 4,
        "cardIndexes": [
          [
            0,
            2,
            5,
            7
          ],
          [
            1,
            3,
            4,
            6
          ]
        ],
        "scoring": "best"
      }
    },
    "infoFeatures": [
      "chessboard"
    ],
    "score": "high"
  },
  {
    "id": "compass",
    "name": "Compass",
    "shortName": "Compass",
    "summary": "Four quadrants; best quadrant scores.",
    "detail": "Eight cards arrange into N/E/S/W quadrants of two; each quadrant gives a tiny scoring micro-board and the strongest takes the round.",
    "family": "environment",
    "tags": [
      "big-hands",
      "multi-board"
    ],
    "tier": "wild",
    "deal": {
      "holeCards": 2,
      "communityCards": 8,
      "boardLayout": {
        "kind": "grid",
        "slots": [
          {
            "row": 0,
            "col": 1,
            "group": "N"
          },
          {
            "row": 0,
            "col": 2,
            "group": "N"
          },
          {
            "row": 1,
            "col": 0,
            "group": "W"
          },
          {
            "row": 1,
            "col": 3,
            "group": "E"
          },
          {
            "row": 2,
            "col": 0,
            "group": "W"
          },
          {
            "row": 2,
            "col": 3,
            "group": "E"
          },
          {
            "row": 3,
            "col": 1,
            "group": "S"
          },
          {
            "row": 3,
            "col": 2,
            "group": "S"
          }
        ]
      },
      "boards": {
        "count": 4,
        "cardsPerBoard": 2,
        "cardIndexes": [
          [
            0,
            1
          ],
          [
            3,
            5
          ],
          [
            6,
            7
          ],
          [
            2,
            4
          ]
        ],
        "scoring": "best"
      }
    },
    "infoFeatures": [
      "compass"
    ],
    "score": "high"
  },
  {
    "id": "island-chain",
    "name": "Island Chain",
    "shortName": "Islands",
    "summary": "Three 3-card islands; score across two adjacent islands.",
    "detail": "Nine community cards split into three islands; each scoring read must draw from two adjacent islands, never all three.",
    "family": "environment",
    "tags": [
      "big-hands",
      "multi-board"
    ],
    "tier": "chaos",
    "deal": {
      "holeCards": 2,
      "communityCards": 9,
      "boardLayout": {
        "kind": "grid",
        "slots": [
          {
            "row": 0,
            "col": 0
          },
          {
            "row": 0,
            "col": 1
          },
          {
            "row": 0,
            "col": 2
          },
          {
            "row": 1,
            "col": 0
          },
          {
            "row": 1,
            "col": 1
          },
          {
            "row": 1,
            "col": 2
          },
          {
            "row": 2,
            "col": 0
          },
          {
            "row": 2,
            "col": 1
          },
          {
            "row": 2,
            "col": 2
          }
        ]
      },
      "boards": {
        "count": 2,
        "cardsPerBoard": 6,
        "cardIndexes": [
          [
            0,
            1,
            2,
            3,
            4,
            5
          ],
          [
            3,
            4,
            5,
            6,
            7,
            8
          ]
        ],
        "scoring": "best"
      }
    },
    "infoFeatures": [
      "island-chain"
    ],
    "score": "high"
  },
  {
    "id": "omaha-luxe",
    "name": "Omaha Luxe",
    "shortName": "Omaha",
    "summary": "Four private cards per hand, best five-card poker hand wins.",
    "detail": "More private information creates bigger late-street reversals and tougher negotiation.",
    "family": "hand",
    "tags": [
      "big-hands"
    ],
    "tier": "standard",
    "deal": {
      "holeCards": 4,
      "communityCards": 5
    },
    "score": "high"
  },
  {
    "id": "pent",
    "name": "Pent",
    "shortName": "Pent",
    "summary": "Five private cards per hand make every hand information-dense.",
    "detail": "Each hand starts with five hole cards, then still uses the shared board to find its best five-card poker hand.",
    "family": "hand",
    "tags": [
      "big-hands"
    ],
    "tier": "standard",
    "deal": {
      "holeCards": 5,
      "communityCards": 5
    },
    "score": "high"
  },
  {
    "id": "pyramid",
    "name": "Pyramid",
    "shortName": "Pyramid",
    "summary": "9-slot triangle; one card per row required.",
    "detail": "A pyramid of 9 cards stacks 1/2/3/3 across rows; each scoring read must take a card from each row, forcing a vertical pull.",
    "family": "identity",
    "tags": [
      "big-hands",
      "late-detonation",
      "relational"
    ],
    "tier": "chaos",
    "deal": {
      "holeCards": 2,
      "communityCards": 9,
      "boardLayout": {
        "kind": "grid",
        "slots": [
          {
            "row": 0,
            "col": 1
          },
          {
            "row": 1,
            "col": 0
          },
          {
            "row": 1,
            "col": 1
          },
          {
            "row": 2,
            "col": 0
          },
          {
            "row": 2,
            "col": 1
          },
          {
            "row": 2,
            "col": 2
          },
          {
            "row": 3,
            "col": 0
          },
          {
            "row": 3,
            "col": 1
          },
          {
            "row": 3,
            "col": 2
          }
        ]
      }
    },
    "phaseEffects": {
      "river": [
        "enforceOneCardPerBoardRow"
      ]
    },
    "infoFeatures": [
      "pyramid"
    ],
    "score": "high"
  },
  {
    "id": "single-spark",
    "name": "Single Spark",
    "shortName": "Spark",
    "summary": "Each hand gets one private card instead of two.",
    "detail": "Tiny private edges make public-board reading and player confidence matter more.",
    "family": "hand",
    "tags": [
      "big-hands"
    ],
    "tier": "standard",
    "deal": {
      "holeCards": 1,
      "communityCards": 5
    },
    "score": "high"
  },
  {
    "id": "solitaire-suite",
    "name": "Solitaire Suite",
    "shortName": "Solitaire",
    "summary": "Seven private cards per hand; the board is mostly a side dish.",
    "detail": "Every hand gets seven hole cards and scores the best five-card poker hand available with the board.",
    "family": "hand",
    "tags": [
      "big-hands"
    ],
    "tier": "standard",
    "deal": {
      "holeCards": 7,
      "communityCards": 5
    },
    "score": "high"
  },
  {
    "id": "triad",
    "name": "Triad",
    "shortName": "Triad",
    "summary": "Three private cards per hand, best five-card poker hand wins.",
    "detail": "A lighter multi-card mode with enough extra texture to make rankings less obvious.",
    "family": "hand",
    "tags": [
      "big-hands"
    ],
    "tier": "standard",
    "deal": {
      "holeCards": 3,
      "communityCards": 5
    },
    "score": "high"
  },
  {
    "id": "commit-flop",
    "name": "Commit Flop",
    "shortName": "Commit",
    "summary": "Top half of the ranking locks at flop; bottom half re-ranks freely.",
    "detail": "Whatever you commit at flop for the top of the ranking is final; only the lower half can be reshuffled across the remaining streets.",
    "family": "tempo",
    "tags": [
      "phase-tempo"
    ],
    "tier": "chaos",
    "deal": {
      "holeCards": 2,
      "communityCards": 5
    },
    "phaseEffects": {
      "flop": [
        "lockTopHalfAtFlop"
      ]
    },
    "infoFeatures": [
      "commit-flop"
    ],
    "score": "high"
  },
  {
    "id": "double-flop",
    "name": "Double Flop",
    "shortName": "Dbl Flop",
    "summary": "Two flops in sequence; rerolls at turn before river resolves.",
    "detail": "Flop deals three; turn discards them and rerolls three new flop cards, asking the table to re-rank twice on freshly-revealed boards.",
    "family": "tempo",
    "tags": [
      "phase-tempo"
    ],
    "tier": "wild",
    "deal": {
      "holeCards": 2,
      "communityCards": 5
    },
    "phaseEffects": {
      "turn": [
        "rerollFlopAtTurn"
      ]
    },
    "infoFeatures": [
      "double-flop"
    ],
    "score": "high"
  },
  {
    "id": "flop-loop",
    "name": "Flop Loop",
    "shortName": "Flop Loop",
    "summary": "After turn, the visible board reverts to flop briefly before river.",
    "detail": "Turn arrives, then the board temporarily drops back to its flop visibility for one re-rank, then river restores everything.",
    "family": "tempo",
    "tags": [
      "phase-tempo"
    ],
    "tier": "chaos",
    "deal": {
      "holeCards": 2,
      "communityCards": 5
    },
    "phaseEffects": {
      "turn": [
        "revertToFlopBriefly"
      ]
    },
    "infoFeatures": [
      "flop-loop"
    ],
    "score": "high"
  },
  {
    "id": "pause-flop",
    "name": "Pause Flop",
    "shortName": "Pause",
    "summary": "The flop phase happens twice — re-rank, no new cards between.",
    "detail": "The flop street duplicates; the table re-ranks once, then re-ranks again on the same flop before turn arrives.",
    "family": "tempo",
    "tags": [
      "phase-tempo"
    ],
    "tier": "wild",
    "deal": {
      "holeCards": 2,
      "communityCards": 5
    },
    "phaseEffects": {
      "flop": [
        "duplicateFlopPhase"
      ]
    },
    "infoFeatures": [
      "pause-flop"
    ],
    "score": "high"
  },
  {
    "id": "reverse-universe",
    "name": "Reverse Universe",
    "shortName": "Reverse U",
    "summary": "At river, table order and board order reverse.",
    "detail": "The board and player order reverse when river begins while hand identities remain rankable.",
    "family": "tempo",
    "tags": [
      "late-detonation",
      "phase-tempo"
    ],
    "tier": "insanity",
    "deal": {
      "holeCards": 2,
      "communityCards": 5
    },
    "phaseEffects": {
      "river": [
        "reverseTableAndBoard"
      ]
    },
    "infoFeatures": [
      "reverse-universe"
    ],
    "score": "high"
  },
  {
    "id": "slow-flop",
    "name": "Slow Flop",
    "shortName": "Slow Flop",
    "summary": "Flop reveals one card per ready cycle (3 cycles).",
    "detail": "The flop's three cards arrive one at a time across separate ready-up cycles, stretching the early read into a slow drip.",
    "family": "tempo",
    "tags": [
      "phase-tempo"
    ],
    "tier": "wild",
    "deal": {
      "holeCards": 2,
      "communityCards": 5
    },
    "phaseEffects": {
      "flop": [
        "flopOneAtATime"
      ]
    },
    "infoFeatures": [
      "slow-flop"
    ],
    "score": "high"
  },
  {
    "id": "time-echo",
    "name": "Time Echo",
    "shortName": "Echo",
    "summary": "At river, the board returns to the flop.",
    "detail": "The river phase truncates the board back to its first three community cards.",
    "family": "tempo",
    "tags": [
      "late-detonation",
      "phase-tempo"
    ],
    "tier": "insanity",
    "deal": {
      "holeCards": 2,
      "communityCards": 5
    },
    "phaseEffects": {
      "river": [
        "revertBoardToFlop"
      ]
    },
    "infoFeatures": [
      "time-echo"
    ],
    "score": "high"
  },
  {
    "id": "time-loop",
    "name": "Time Loop",
    "shortName": "Time Loop",
    "summary": "After reveal, rewind to turn and re-rank with reveal info known.",
    "detail": "Reveal happens, then the table is sent back to turn for one final ranking pass with everything they just learned; the average of both rankings scores.",
    "family": "tempo",
    "tags": [
      "late-detonation",
      "phase-tempo"
    ],
    "tier": "insanity",
    "deal": {
      "holeCards": 2,
      "communityCards": 5
    },
    "phaseEffects": {
      "reveal": [
        "rewindToTurnAfterReveal"
      ]
    },
    "infoFeatures": [
      "time-loop"
    ],
    "score": "high"
  },
  {
    "id": "card-diaspora",
    "name": "Card Diaspora",
    "shortName": "Diaspora",
    "summary": "At turn, every hand gives one card away.",
    "detail": "The first hole card in each hand rotates to the next hand when turn begins.",
    "family": "identity",
    "tags": [
      "positional"
    ],
    "tier": "insanity",
    "deal": {
      "holeCards": 2,
      "communityCards": 5
    },
    "phaseEffects": {
      "turn": [
        "rotateFirstHoleCardsClockwise"
      ]
    },
    "infoFeatures": [
      "card-diaspora"
    ],
    "score": "high"
  },
  {
    "id": "card-madness",
    "name": "Card Madness",
    "shortName": "Madness",
    "summary": "At turn, every card swaps places.",
    "detail": "All hole and community cards rotate one position through a single shared stream.",
    "family": "identity",
    "tags": [
      "positional"
    ],
    "tier": "insanity",
    "deal": {
      "holeCards": 2,
      "communityCards": 5
    },
    "phaseEffects": {
      "turn": [
        "rotateAllCardPositions"
      ]
    },
    "infoFeatures": [
      "card-madness"
    ],
    "score": "high"
  },
  {
    "id": "card-rebellion",
    "name": "Card Rebellion",
    "shortName": "Rebellion",
    "summary": "At the turn, every hand rotates one seat clockwise around the table.",
    "detail": "When turn begins, each player passes their two-card hand to the next seat and inherits the previous seat's hand for the rest of the showdown.",
    "family": "identity",
    "tags": [
      "positional"
    ],
    "tier": "insanity",
    "deal": {
      "holeCards": 2,
      "communityCards": 5
    },
    "phaseEffects": {
      "turn": [
        "rotateHoleCardsClockwise"
      ]
    },
    "infoFeatures": [
      "card-rebellion"
    ],
    "score": "high"
  },
  {
    "id": "card-vortex",
    "name": "Card Vortex",
    "shortName": "Vortex",
    "summary": "At turn, ranks rotate around the table.",
    "detail": "Hole-card ranks rotate across table order while suits stay in their slots.",
    "family": "identity",
    "tags": [
      "positional"
    ],
    "tier": "insanity",
    "deal": {
      "holeCards": 2,
      "communityCards": 5
    },
    "phaseEffects": {
      "turn": [
        "rotateHoleRanksAcrossHands"
      ]
    },
    "infoFeatures": [
      "card-vortex"
    ],
    "score": "high"
  },
  {
    "id": "encore",
    "name": "Encore",
    "shortName": "Encore",
    "summary": "After reveal, hands shuffle to neighbors for a bonus ranking pass.",
    "detail": "Reveal gives the table one extra shot — every hand passes one seat over and a second ranking decides the round.",
    "family": "identity",
    "tags": [
      "late-detonation",
      "positional"
    ],
    "tier": "insanity",
    "deal": {
      "holeCards": 2,
      "communityCards": 5
    },
    "phaseEffects": {
      "reveal": [
        "shuffleHandAssignment"
      ]
    },
    "infoFeatures": [
      "encore"
    ],
    "score": "high"
  },
  {
    "id": "relay-baton",
    "name": "Relay Baton",
    "shortName": "Relay",
    "summary": "At reveal each hand passes its best card clockwise.",
    "detail": "Reveal triggers a clockwise relay — every hand sends its best card to the next seat and scores using whatever arrives in its place.",
    "family": "identity",
    "tags": [
      "late-detonation",
      "positional"
    ],
    "tier": "insanity",
    "deal": {
      "holeCards": 2,
      "communityCards": 5
    },
    "phaseEffects": {
      "reveal": [
        "bestCardClockwise"
      ]
    },
    "infoFeatures": [
      "relay-baton"
    ],
    "score": "high"
  },
  {
    "id": "tomorrow",
    "name": "Tomorrow",
    "shortName": "Tomorrow",
    "summary": "Reveal swaps each hand's first card with the next hand's last card.",
    "detail": "At reveal a clockwise cross-swap fires — the cards you ranked with don't end up scoring against you the way you expected.",
    "family": "identity",
    "tags": [
      "late-detonation",
      "positional"
    ],
    "tier": "insanity",
    "deal": {
      "holeCards": 2,
      "communityCards": 5
    },
    "phaseEffects": {
      "reveal": [
        "crossHandCardSwap"
      ]
    },
    "infoFeatures": [
      "tomorrow"
    ],
    "score": "high"
  },
  {
    "id": "tornado",
    "name": "Tornado",
    "shortName": "Tornado",
    "summary": "At the turn, every hand's hole cards rotate clockwise around the table.",
    "detail": "When turn begins, each player loses their two cards to the next seat and inherits the previous seat's hand for the rest of the showdown.",
    "family": "identity",
    "tags": [
      "positional"
    ],
    "tier": "wild",
    "deal": {
      "holeCards": 2,
      "communityCards": 5
    },
    "phaseEffects": {
      "turn": [
        "rotateHoleCardsClockwise"
      ]
    },
    "infoFeatures": [
      "tornado"
    ],
    "score": "high"
  },
  {
    "id": "wormhole",
    "name": "Wormhole",
    "shortName": "Wormhole",
    "summary": "At the river, the first two hands swap one hole card.",
    "detail": "When river begins, the first hole card of seat one trades places with the first hole card of seat two, leaving the rest of the table untouched.",
    "family": "identity",
    "tags": [
      "late-detonation",
      "positional"
    ],
    "tier": "wild",
    "deal": {
      "holeCards": 2,
      "communityCards": 5
    },
    "phaseEffects": {
      "river": [
        "swapFirstCardsFirstTwoHands"
      ]
    },
    "infoFeatures": [
      "wormhole"
    ],
    "score": "high"
  },
  {
    "id": "cell-division",
    "name": "Cell Division",
    "shortName": "Division",
    "summary": "At reveal, every hand splits in two.",
    "detail": "Each two-card hand divides into two one-card hands at reveal, and the ranking expands to include the split hands.",
    "family": "identity",
    "tags": [
      "late-detonation",
      "relational"
    ],
    "tier": "insanity",
    "deal": {
      "holeCards": 2,
      "communityCards": 5
    },
    "phaseEffects": {
      "reveal": [
        "splitHandsAtReveal"
      ]
    },
    "infoFeatures": [
      "cell-division"
    ],
    "score": "high"
  },
  {
    "id": "civil-war",
    "name": "Civil War",
    "shortName": "Civil War",
    "summary": "Reds vs blacks; first hole picks a team.",
    "detail": "At preflop each hand joins a color team based on its first hole card; teams compete in aggregate at reveal.",
    "family": "identity",
    "tags": [
      "relational"
    ],
    "tier": "wild",
    "deal": {
      "holeCards": 2,
      "communityCards": 5
    },
    "phaseEffects": {
      "preflop": [
        "colorTeamAssign"
      ]
    },
    "infoFeatures": [
      "civil-war"
    ],
    "score": "high"
  },
  {
    "id": "crab-bucket",
    "name": "Crab Bucket",
    "shortName": "Crab Bucket",
    "summary": "Top hand drops a tier for every neighbor within a tier of it.",
    "detail": "At reveal the highest hand pays a crowdedness penalty — every hand near it in tier pulls it down one rank-tier.",
    "family": "identity",
    "tags": [
      "late-detonation",
      "relational"
    ],
    "tier": "chaos",
    "deal": {
      "holeCards": 2,
      "communityCards": 5
    },
    "phaseEffects": {
      "reveal": [
        "crowdedRankPenalty"
      ]
    },
    "infoFeatures": [
      "crab-bucket"
    ],
    "score": "high"
  },
  {
    "id": "hostage",
    "name": "Hostage",
    "shortName": "Hostage",
    "summary": "One designated hand's rank dictates the table's wild rank.",
    "detail": "At river the hostage hand's first hole card becomes the wild rank for everyone else, so winning depends on negotiating around that seat.",
    "family": "identity",
    "tags": [
      "late-detonation",
      "relational"
    ],
    "tier": "chaos",
    "deal": {
      "holeCards": 2,
      "communityCards": 5
    },
    "phaseEffects": {
      "river": [
        "hostageRankBecomesWild"
      ]
    },
    "infoFeatures": [
      "hostage"
    ],
    "score": "high"
  },
  {
    "id": "last-rites",
    "name": "Last Rites",
    "shortName": "Last Rites",
    "summary": "Reveal absorbs the last hand's cards into the community board.",
    "detail": "At reveal the trailing seat's cards are added to the board, expanding what every other hand uses to score and gutting the last seat outright.",
    "family": "identity",
    "tags": [
      "late-detonation",
      "relational"
    ],
    "tier": "insanity",
    "deal": {
      "holeCards": 2,
      "communityCards": 5
    },
    "phaseEffects": {
      "reveal": [
        "absorbLastHandToBoard"
      ]
    },
    "infoFeatures": [
      "last-rites"
    ],
    "score": "high"
  },
  {
    "id": "match-game",
    "name": "Match Game",
    "shortName": "Match Game",
    "summary": "Two hands sharing a rank swap strength — weaker inherits stronger.",
    "detail": "At reveal any pair of hands sharing a rank exchange strengths so the weaker becomes the stronger; the stronger drops to the weaker's class.",
    "family": "identity",
    "tags": [
      "late-detonation",
      "relational"
    ],
    "tier": "chaos",
    "deal": {
      "holeCards": 2,
      "communityCards": 5
    },
    "phaseEffects": {
      "reveal": [
        "matchRankInherit"
      ]
    },
    "infoFeatures": [
      "match-game"
    ],
    "score": "high"
  },
  {
    "id": "mirror-match-jr",
    "name": "Mirror Match Jr.",
    "shortName": "Mirror Jr",
    "summary": "Two adjacent hands always tie; rank everyone else around them.",
    "detail": "A pair of adjacent seats are forced into a tie, so the table's job is to slot the remaining hands above or below the locked pair.",
    "family": "identity",
    "tags": [
      "relational"
    ],
    "tier": "twist",
    "deal": {
      "holeCards": 2,
      "communityCards": 5
    },
    "phaseEffects": {
      "preflop": [
        "forceAdjacentTie"
      ]
    },
    "infoFeatures": [
      "mirror-match-jr"
    ],
    "score": "high"
  },
  {
    "id": "mission-pocket",
    "name": "Mission Pocket",
    "shortName": "M Pocket",
    "summary": "Win only if rank-1 hand's strength is entirely pocket-sourced.",
    "detail": "The leading hand's scoring read must come purely from its hole cards — no top-five contribution from the board.",
    "family": "identity",
    "tags": [
      "late-detonation",
      "mission",
      "relational"
    ],
    "tier": "chaos",
    "deal": {
      "holeCards": 2,
      "communityCards": 5
    },
    "phaseEffects": {
      "reveal": [
        "requirePocketSourceTop"
      ]
    },
    "infoFeatures": [
      "mission-pocket"
    ],
    "score": "high"
  },
  {
    "id": "neighbor-bonus",
    "name": "Neighbor Bonus",
    "shortName": "Neighbor",
    "summary": "Hands jump a tier when their first hole shares rank with a neighbor's.",
    "detail": "Adjacent seats with matching first hole-card ranks both bump up one tier at reveal — sit next to someone strong and you climb with them.",
    "family": "identity",
    "tags": [
      "late-detonation",
      "relational"
    ],
    "tier": "wild",
    "deal": {
      "holeCards": 2,
      "communityCards": 5
    },
    "phaseEffects": {
      "reveal": [
        "adjacentRankBonus"
      ]
    },
    "infoFeatures": [
      "neighbor-bonus"
    ],
    "score": "high"
  },
  {
    "id": "pact",
    "name": "Pact",
    "shortName": "Pact",
    "summary": "First and last hand merge their best 5 cards at reveal.",
    "detail": "At reveal the table's bookends pool resources — first and last seat combine their strongest five cards into a single joint hand.",
    "family": "identity",
    "tags": [
      "late-detonation",
      "relational"
    ],
    "tier": "chaos",
    "deal": {
      "holeCards": 2,
      "communityCards": 5
    },
    "phaseEffects": {
      "reveal": [
        "pactMergeFirstLast"
      ]
    },
    "infoFeatures": [
      "pact"
    ],
    "score": "high"
  },
  {
    "id": "rock-paper",
    "name": "Rock Paper",
    "shortName": "Rock Paper",
    "summary": "Pairs beat trips beat quads beat pairs (cyclic dominance).",
    "detail": "At reveal the pair-trip-quad hierarchy becomes a cycle, and standing tall depends on whether the table also went tall.",
    "family": "identity",
    "tags": [
      "late-detonation",
      "relational"
    ],
    "tier": "insanity",
    "deal": {
      "holeCards": 2,
      "communityCards": 5
    },
    "phaseEffects": {
      "reveal": [
        "cyclicHandHierarchy"
      ]
    },
    "infoFeatures": [
      "rock-paper"
    ],
    "score": "high"
  },
  {
    "id": "solo-act",
    "name": "Solo Act",
    "shortName": "Solo Act",
    "summary": "A hand only scores if no other hand shares its rank class.",
    "detail": "Two hands holding pairs cancel each other; trips alongside other trips cancel; only unique hand classes survive to score.",
    "family": "identity",
    "tags": [
      "late-detonation",
      "relational"
    ],
    "tier": "wild",
    "deal": {
      "holeCards": 2,
      "communityCards": 5
    },
    "phaseEffects": {
      "reveal": [
        "uniqueHandClassRequired"
      ]
    },
    "infoFeatures": [
      "solo-act"
    ],
    "score": "high"
  },
  {
    "id": "black-ice",
    "name": "Black Ice",
    "shortName": "Black",
    "summary": "Black cards are the primary scoring resource.",
    "detail": "More clubs and spades rank higher; poker strength breaks close black counts.",
    "family": "identity",
    "tags": [
      "mission"
    ],
    "tier": "twist",
    "deal": {
      "holeCards": 2,
      "communityCards": 5
    },
    "score": "black"
  },
  {
    "id": "flush-hunt",
    "name": "Flush Hunt",
    "shortName": "Flush",
    "summary": "Hands rank by the largest same-suit cluster first.",
    "detail": "Poker strength breaks ties, but suit density is the primary objective.",
    "family": "identity",
    "tags": [
      "mission"
    ],
    "tier": "twist",
    "deal": {
      "holeCards": 2,
      "communityCards": 5
    },
    "score": "flush"
  },
  {
    "id": "low-noon",
    "name": "Low Noon",
    "shortName": "Low Noon",
    "summary": "Lowball, but ranks 6 and above are scoring-invisible.",
    "detail": "At river the high cards are stripped from play and only ranks 2–5 remain, condensing the lowball race into a four-rank brawl.",
    "family": "identity",
    "tags": [
      "late-detonation",
      "mission",
      "weather"
    ],
    "tier": "wild",
    "deal": {
      "holeCards": 2,
      "communityCards": 5
    },
    "phaseEffects": {
      "river": [
        "zeroHighRanks"
      ]
    },
    "infoFeatures": [
      "low-noon"
    ],
    "score": "lowball"
  },
  {
    "id": "lowball",
    "name": "Lowball Ding",
    "shortName": "Lowball",
    "summary": "The worst poker hand wins the top slot.",
    "detail": "Ranking instincts invert: weak high-card hands become the hands to protect.",
    "family": "identity",
    "tags": [
      "mission"
    ],
    "tier": "standard",
    "deal": {
      "holeCards": 2,
      "communityCards": 5
    },
    "score": "lowball"
  },
  {
    "id": "mission-flush",
    "name": "Mission Flush",
    "shortName": "M Flush",
    "summary": "Win only if the rank-1 hand is a flush.",
    "detail": "Standard ranking applies, but the round only counts if the strongest hand is a flush — otherwise the table voids regardless of order.",
    "family": "identity",
    "tags": [
      "late-detonation",
      "mission"
    ],
    "tier": "twist",
    "deal": {
      "holeCards": 2,
      "communityCards": 5
    },
    "phaseEffects": {
      "reveal": [
        "requireTopHandIsFlush"
      ]
    },
    "infoFeatures": [
      "mission-flush"
    ],
    "score": "high"
  },
  {
    "id": "mission-loud",
    "name": "Mission Loud",
    "shortName": "M Loud",
    "summary": "Win only if every hand contains a face card.",
    "detail": "A face-card distribution problem — every hand needs at least one J/Q/K from holes or board to qualify the round.",
    "family": "identity",
    "tags": [
      "late-detonation",
      "mission"
    ],
    "tier": "wild",
    "deal": {
      "holeCards": 2,
      "communityCards": 5
    },
    "phaseEffects": {
      "reveal": [
        "requireAllHandsHaveFace"
      ]
    },
    "infoFeatures": [
      "mission-loud"
    ],
    "score": "high"
  },
  {
    "id": "mission-low-spread",
    "name": "Mission Tight",
    "shortName": "M Tight",
    "summary": "Win only if best and worst hands are within 2 rank-tiers.",
    "detail": "A tightness mission — the table's best hand can sit at most two tiers above the weakest, otherwise the round voids.",
    "family": "identity",
    "tags": [
      "late-detonation",
      "mission"
    ],
    "tier": "chaos",
    "deal": {
      "holeCards": 2,
      "communityCards": 5
    },
    "phaseEffects": {
      "reveal": [
        "requireTightSpread"
      ]
    },
    "infoFeatures": [
      "mission-low-spread"
    ],
    "score": "high"
  },
  {
    "id": "mission-pair",
    "name": "Mission Pair",
    "shortName": "M Pair",
    "summary": "Win only if every hand contains at least one pair.",
    "detail": "A table-wide qualifier — even one pair-less hand voids the round, so the table coordinates around delivering a pair to every seat.",
    "family": "identity",
    "tags": [
      "late-detonation",
      "mission"
    ],
    "tier": "twist",
    "deal": {
      "holeCards": 2,
      "communityCards": 5
    },
    "phaseEffects": {
      "reveal": [
        "requireAllHandsPaired"
      ]
    },
    "infoFeatures": [
      "mission-pair"
    ],
    "score": "high"
  },
  {
    "id": "mission-quiet",
    "name": "Mission Quiet",
    "shortName": "M Quiet",
    "summary": "Win only if the rank-1 hand has no face cards.",
    "detail": "The strongest hand must be made entirely of pip cards; faces in the leader hand void the round.",
    "family": "identity",
    "tags": [
      "late-detonation",
      "mission"
    ],
    "tier": "twist",
    "deal": {
      "holeCards": 2,
      "communityCards": 5
    },
    "phaseEffects": {
      "reveal": [
        "requireTopHandNoFaceCards"
      ]
    },
    "infoFeatures": [
      "mission-quiet"
    ],
    "score": "high"
  },
  {
    "id": "mission-rainbow",
    "name": "Mission Rainbow",
    "shortName": "M Rainbow",
    "summary": "Win only if every suit appears in the rank-1 hand's read.",
    "detail": "The leading hand's five-card read must include all four suits — flush draws don't count, painted hands do.",
    "family": "identity",
    "tags": [
      "late-detonation",
      "mission"
    ],
    "tier": "wild",
    "deal": {
      "holeCards": 2,
      "communityCards": 5
    },
    "phaseEffects": {
      "reveal": [
        "requireTopHandRainbow"
      ]
    },
    "infoFeatures": [
      "mission-rainbow"
    ],
    "score": "high"
  },
  {
    "id": "mission-red-river",
    "name": "Mission Red River",
    "shortName": "M Red Riv",
    "summary": "Win only if all river-revealed community cards are red.",
    "detail": "Every community card revealed at river must be red — a single black card down the river kills the round.",
    "family": "identity",
    "tags": [
      "late-detonation",
      "mission"
    ],
    "tier": "wild",
    "deal": {
      "holeCards": 2,
      "communityCards": 5
    },
    "phaseEffects": {
      "reveal": [
        "requireRedRiver"
      ]
    },
    "infoFeatures": [
      "mission-red-river"
    ],
    "score": "high"
  },
  {
    "id": "mission-twins",
    "name": "Mission Twins",
    "shortName": "M Twins",
    "summary": "Win only if two adjacent hands tie at reveal.",
    "detail": "At least one adjacent pair of hands must end up tied — the table coordinates to deliver a tie somewhere among the seats.",
    "family": "identity",
    "tags": [
      "late-detonation",
      "mission"
    ],
    "tier": "wild",
    "deal": {
      "holeCards": 2,
      "communityCards": 5
    },
    "phaseEffects": {
      "reveal": [
        "requireAdjacentTie"
      ]
    },
    "infoFeatures": [
      "mission-twins"
    ],
    "score": "high"
  },
  {
    "id": "mission-wide",
    "name": "Mission Wide",
    "shortName": "M Wide",
    "summary": "Win only if the spread is at least 4 rank-tiers.",
    "detail": "An inverse of Mission Tight — best and worst must sit at least four tiers apart, so the table needs both a champion and a doormat.",
    "family": "identity",
    "tags": [
      "late-detonation",
      "mission"
    ],
    "tier": "chaos",
    "deal": {
      "holeCards": 2,
      "communityCards": 5
    },
    "phaseEffects": {
      "reveal": [
        "requireWideSpread"
      ]
    },
    "infoFeatures": [
      "mission-wide"
    ],
    "score": "high"
  },
  {
    "id": "pair-party",
    "name": "Pair Party",
    "shortName": "Pairs",
    "summary": "Pairs, trips, and quads are the main scoring target.",
    "detail": "The best multiplicity profile wins, with normal poker strength as the tiebreaker.",
    "family": "identity",
    "tags": [
      "mission"
    ],
    "tier": "twist",
    "deal": {
      "holeCards": 2,
      "communityCards": 5
    },
    "score": "pairs"
  },
  {
    "id": "red-shift",
    "name": "Red Shift",
    "shortName": "Red",
    "summary": "Red cards are the primary scoring resource.",
    "detail": "More hearts and diamonds rank higher; poker strength breaks close red counts.",
    "family": "identity",
    "tags": [
      "mission"
    ],
    "tier": "twist",
    "deal": {
      "holeCards": 2,
      "communityCards": 5
    },
    "score": "red"
  },
  {
    "id": "straight-hunt",
    "name": "Straight Hunt",
    "shortName": "Straight",
    "summary": "Hands rank by their longest rank run first.",
    "detail": "Poker strength breaks ties, but connected cards define the table order.",
    "family": "identity",
    "tags": [
      "mission"
    ],
    "tier": "twist",
    "deal": {
      "holeCards": 2,
      "communityCards": 5
    },
    "score": "straight"
  },
  {
    "id": "straight-only-friday",
    "name": "Straight Only",
    "shortName": "Straight Only",
    "summary": "Straight scoring; board pairs are stripped at river.",
    "detail": "Any rank duplicated on the board is removed at river, leaving a thinner board where straight runs are the only viable read.",
    "family": "identity",
    "tags": [
      "late-detonation",
      "mission",
      "weather"
    ],
    "tier": "twist",
    "deal": {
      "holeCards": 2,
      "communityCards": 5
    },
    "phaseEffects": {
      "river": [
        "breakBoardPairs"
      ]
    },
    "infoFeatures": [
      "straight-only"
    ],
    "score": "straight"
  },
  {
    "id": "suit-court",
    "name": "Suit Court",
    "shortName": "Suit Court",
    "summary": "Flush scoring, but only the board's majority color counts.",
    "detail": "At river, every card whose color does not match the board's majority is stripped from play, leaving flush draws to fight over a single chromatic court.",
    "family": "identity",
    "tags": [
      "late-detonation",
      "mission",
      "weather"
    ],
    "tier": "wild",
    "deal": {
      "holeCards": 2,
      "communityCards": 5
    },
    "phaseEffects": {
      "river": [
        "lockMajorityColor"
      ]
    },
    "infoFeatures": [
      "suit-court"
    ],
    "score": "flush"
  },
  {
    "id": "worst-of-all",
    "name": "Worst Of All",
    "shortName": "Worst Of All",
    "summary": "Pure lowball, but only after a pair-qualification check.",
    "detail": "The lowest hand wins, but the round only resolves if at least one paired hand exists at reveal — otherwise the round voids.",
    "family": "identity",
    "tags": [
      "late-detonation",
      "mission"
    ],
    "tier": "insanity",
    "deal": {
      "holeCards": 2,
      "communityCards": 5
    },
    "phaseEffects": {
      "reveal": [
        "requirePairToQualify"
      ]
    },
    "infoFeatures": [
      "worst-of-all"
    ],
    "score": "lowball"
  },
  {
    "id": "black-tide",
    "name": "Black Tide",
    "shortName": "Black Tide",
    "summary": "Plays as high; switches to black-card scoring at reveal.",
    "detail": "A mirror of Red Tide. Players rank assuming high-card scoring, then the rule pivots at reveal to count only black cards.",
    "family": "tempo",
    "tags": [
      "late-detonation",
      "score-pivot"
    ],
    "tier": "chaos",
    "deal": {
      "holeCards": 2,
      "communityCards": 5
    },
    "phaseEffects": {
      "reveal": [
        "adoptBlackScoring"
      ]
    },
    "infoFeatures": [
      "black-tide"
    ],
    "score": "high"
  },
  {
    "id": "final-coin",
    "name": "Final Coin",
    "shortName": "Final Coin",
    "summary": "Coin flip at reveal decides high vs lowball.",
    "detail": "Players rank with high in mind through the river; reveal flips a public coin to choose between high and lowball as the live scoring rule.",
    "family": "tempo",
    "tags": [
      "late-detonation",
      "score-pivot"
    ],
    "tier": "chaos",
    "deal": {
      "holeCards": 2,
      "communityCards": 5
    },
    "phaseEffects": {
      "reveal": [
        "coinflipScoreRule"
      ]
    },
    "infoFeatures": [
      "final-coin"
    ],
    "score": "high"
  },
  {
    "id": "inversion-tide",
    "name": "Inversion Tide",
    "shortName": "Inv Tide",
    "summary": "All ranks invert at river — Aces become weakest.",
    "detail": "Players rank toward the river expecting high to win, but the rank order flips when the river lands and the reveal scores against the inverted order.",
    "family": "tempo",
    "tags": [
      "late-detonation",
      "score-pivot"
    ],
    "tier": "chaos",
    "deal": {
      "holeCards": 2,
      "communityCards": 5
    },
    "phaseEffects": {
      "river": [
        "invertScoringNow"
      ]
    },
    "infoFeatures": [
      "inversion-tide"
    ],
    "rankTransform": "inverted",
    "score": "high"
  },
  {
    "id": "inverted-deck",
    "name": "Inverted Deck",
    "shortName": "Invert",
    "summary": "Aces are low and twos rank above kings.",
    "detail": "Showdown maps rank strength through an inverted order before comparing poker hands.",
    "family": "hand",
    "tags": [
      "score-pivot"
    ],
    "tier": "twist",
    "deal": {
      "holeCards": 2,
      "communityCards": 5
    },
    "rankTransform": "inverted",
    "score": "high"
  },
  {
    "id": "pulled-rug",
    "name": "Pulled Rug",
    "shortName": "Pulled Rug",
    "summary": "A named rank inverts at reveal — announced at river.",
    "detail": "River names the rank; reveal flips that rank's strength so anyone leaning on it for ranking suddenly sees their hand collapse.",
    "family": "tempo",
    "tags": [
      "late-detonation",
      "score-pivot"
    ],
    "tier": "insanity",
    "deal": {
      "holeCards": 2,
      "communityCards": 5
    },
    "phaseEffects": {
      "river": [
        "armRankInvert"
      ],
      "reveal": [
        "executeRankInvert"
      ]
    },
    "infoFeatures": [
      "pulled-rug"
    ],
    "score": "high"
  },
  {
    "id": "red-tide",
    "name": "Red Tide",
    "shortName": "Red Tide",
    "summary": "Plays as high; switches to red-card scoring at reveal.",
    "detail": "Players rank as if scoring high cards all hand, but the rule pivots at reveal — only red cards count toward the final winner.",
    "family": "tempo",
    "tags": [
      "late-detonation",
      "score-pivot"
    ],
    "tier": "chaos",
    "deal": {
      "holeCards": 2,
      "communityCards": 5
    },
    "phaseEffects": {
      "reveal": [
        "adoptRedScoring"
      ]
    },
    "infoFeatures": [
      "red-tide"
    ],
    "score": "high"
  },
  {
    "id": "aurora",
    "name": "Aurora",
    "shortName": "Aurora",
    "summary": "At river, suits swap within color pairs.",
    "detail": "When river begins, suits reassign across hands and board on a fixed cycle, scrambling flush draws while ranks stay intact.",
    "family": "environment",
    "tags": [
      "late-detonation",
      "weather"
    ],
    "tier": "wild",
    "deal": {
      "holeCards": 2,
      "communityCards": 5
    },
    "phaseEffects": {
      "river": [
        "reassignAllSuits"
      ]
    },
    "infoFeatures": [
      "aurora"
    ],
    "score": "high"
  },
  {
    "id": "black-hole",
    "name": "Black Hole",
    "shortName": "Black Hole",
    "summary": "At the river, the most recent community card disappears into the void.",
    "detail": "When river begins, the last card placed on the board vanishes and is not replaced, so the table ends the hand on a four-card community board.",
    "family": "environment",
    "tags": [
      "late-detonation",
      "weather"
    ],
    "tier": "wild",
    "deal": {
      "holeCards": 2,
      "communityCards": 5
    },
    "phaseEffects": {
      "river": [
        "removeLastCommunity"
      ]
    },
    "infoFeatures": [
      "black-hole"
    ],
    "score": "high"
  },
  {
    "id": "card-cipher",
    "name": "Card Cipher",
    "shortName": "Cipher",
    "summary": "At river, values are encoded through the river card.",
    "detail": "Every rank shifts by the river card's rank index when river begins.",
    "family": "environment",
    "tags": [
      "late-detonation",
      "weather"
    ],
    "tier": "insanity",
    "deal": {
      "holeCards": 2,
      "communityCards": 5
    },
    "phaseEffects": {
      "river": [
        "cipherRanksWithRiver"
      ]
    },
    "infoFeatures": [
      "card-cipher"
    ],
    "score": "high"
  },
  {
    "id": "card-convergence",
    "name": "Card Convergence",
    "shortName": "Converge",
    "summary": "At river, one rank converges into aces.",
    "detail": "When river begins, every seven in hands and on the board converges into an ace before reveal scoring.",
    "family": "environment",
    "tags": [
      "late-detonation",
      "weather"
    ],
    "tier": "insanity",
    "deal": {
      "holeCards": 2,
      "communityCards": 5
    },
    "phaseEffects": {
      "river": [
        "convergeSevensToAces"
      ]
    },
    "infoFeatures": [
      "card-convergence"
    ],
    "score": "high"
  },
  {
    "id": "card-drift",
    "name": "Card Drift",
    "shortName": "Drift",
    "summary": "Every street, private cards drift upward.",
    "detail": "Hole-card ranks shift +1 at flop, turn, and river.",
    "family": "environment",
    "tags": [
      "late-detonation",
      "weather"
    ],
    "tier": "insanity",
    "deal": {
      "holeCards": 2,
      "communityCards": 5
    },
    "phaseEffects": {
      "flop": [
        "incrementAllHoleRanks"
      ],
      "turn": [
        "incrementAllHoleRanks"
      ],
      "river": [
        "incrementAllHoleRanks"
      ]
    },
    "infoFeatures": [
      "card-drift"
    ],
    "score": "high"
  },
  {
    "id": "card-eclipse-total",
    "name": "Card Eclipse Total",
    "shortName": "Eclipse T",
    "summary": "At river, the highest rank in play vanishes.",
    "detail": "Every card of the current highest rank is removed from hands and board at river.",
    "family": "environment",
    "tags": [
      "late-detonation",
      "weather"
    ],
    "tier": "insanity",
    "deal": {
      "holeCards": 2,
      "communityCards": 5
    },
    "phaseEffects": {
      "river": [
        "removeHighestRankInPlay"
      ]
    },
    "infoFeatures": [
      "card-eclipse-total"
    ],
    "score": "high"
  },
  {
    "id": "card-festival",
    "name": "Card Festival",
    "shortName": "Festival",
    "summary": "At the river, one community card boosts all the way up to an ace.",
    "detail": "When river begins, the first board card becomes an ace, often shifting straight, set, and high-card reads going into reveal.",
    "family": "environment",
    "tags": [
      "late-detonation",
      "weather"
    ],
    "tier": "wild",
    "deal": {
      "holeCards": 2,
      "communityCards": 5
    },
    "phaseEffects": {
      "river": [
        "festivalBoostFirstCommunity"
      ]
    },
    "infoFeatures": [
      "card-festival"
    ],
    "score": "high"
  },
  {
    "id": "card-pinball",
    "name": "Card Pinball",
    "shortName": "Pinball",
    "summary": "A community card bounces into a hole slot.",
    "detail": "The first community card swaps with the first hole card at flop, turn, and river.",
    "family": "environment",
    "tags": [
      "late-detonation",
      "weather"
    ],
    "tier": "insanity",
    "deal": {
      "holeCards": 2,
      "communityCards": 5
    },
    "phaseEffects": {
      "flop": [
        "swapFirstHoleWithFirstCommunity"
      ],
      "turn": [
        "swapFirstHoleWithFirstCommunity"
      ],
      "river": [
        "swapFirstHoleWithFirstCommunity"
      ]
    },
    "infoFeatures": [
      "card-pinball"
    ],
    "score": "high"
  },
  {
    "id": "card-plague-spread",
    "name": "Card Plague Spread",
    "shortName": "Spread",
    "summary": "A plague rank infects more cards each phase.",
    "detail": "One additional card converts to seven at flop, turn, and river.",
    "family": "environment",
    "tags": [
      "late-detonation",
      "weather"
    ],
    "tier": "insanity",
    "deal": {
      "holeCards": 2,
      "communityCards": 5
    },
    "phaseEffects": {
      "flop": [
        "spreadPlagueToFirstCard"
      ],
      "turn": [
        "spreadPlagueToFirstCard"
      ],
      "river": [
        "spreadPlagueToFirstCard"
      ]
    },
    "infoFeatures": [
      "card-plague-spread"
    ],
    "score": "high"
  },
  {
    "id": "card-schism",
    "name": "Card Schism",
    "shortName": "Schism",
    "summary": "At the turn, the remaining deck splits and only the high half stays in play.",
    "detail": "When turn begins, every later draw — for board replacements or other effects — comes only from the deck's high ranks.",
    "family": "environment",
    "tags": [
      "weather"
    ],
    "tier": "insanity",
    "deal": {
      "holeCards": 2,
      "communityCards": 5
    },
    "phaseEffects": {
      "turn": [
        "schismDeckHighOnly"
      ]
    },
    "infoFeatures": [
      "card-schism"
    ],
    "score": "high"
  },
  {
    "id": "card-singularity",
    "name": "Card Singularity",
    "shortName": "Singularity",
    "summary": "At turn, each hand's cards collapse together.",
    "detail": "The first two hole cards in each hand merge into one averaged-rank card when turn begins.",
    "family": "environment",
    "tags": [
      "weather"
    ],
    "tier": "insanity",
    "deal": {
      "holeCards": 2,
      "communityCards": 5
    },
    "phaseEffects": {
      "turn": [
        "singularityAverageFirstTwoHoles"
      ]
    },
    "infoFeatures": [
      "card-singularity"
    ],
    "score": "high"
  },
  {
    "id": "card-soup",
    "name": "Card Soup",
    "shortName": "Soup",
    "summary": "At turn, holes and burn pile mix together.",
    "detail": "When turn begins, every hand's hole cards mix with the burn pile and are dealt back out across the table.",
    "family": "environment",
    "tags": [
      "weather"
    ],
    "tier": "insanity",
    "deal": {
      "holeCards": 2,
      "communityCards": 5
    },
    "phaseEffects": {
      "turn": [
        "mixHolesWithBurn"
      ]
    },
    "infoFeatures": [
      "card-soup"
    ],
    "score": "high"
  },
  {
    "id": "card-static",
    "name": "Card Static",
    "shortName": "C Static",
    "summary": "Cards flicker into new ranks as the hand progresses.",
    "detail": "The first hole card and first board card shift upward each street.",
    "family": "environment",
    "tags": [
      "late-detonation",
      "weather"
    ],
    "tier": "insanity",
    "deal": {
      "holeCards": 2,
      "communityCards": 5
    },
    "phaseEffects": {
      "flop": [
        "staticFlickerFirstCards"
      ],
      "turn": [
        "staticFlickerFirstCards"
      ],
      "river": [
        "staticFlickerFirstCards"
      ]
    },
    "infoFeatures": [
      "card-static"
    ],
    "score": "high"
  },
  {
    "id": "card-tide",
    "name": "Card Tide",
    "shortName": "Tide",
    "summary": "Every street, all ranks drift upward.",
    "detail": "All ranks shift +1 at flop, turn, and river.",
    "family": "environment",
    "tags": [
      "late-detonation",
      "weather"
    ],
    "tier": "insanity",
    "deal": {
      "holeCards": 2,
      "communityCards": 5
    },
    "phaseEffects": {
      "flop": [
        "incrementAllRanks"
      ],
      "turn": [
        "incrementAllRanks"
      ],
      "river": [
        "incrementAllRanks"
      ]
    },
    "infoFeatures": [
      "card-tide"
    ],
    "score": "high"
  },
  {
    "id": "cold-snap",
    "name": "Cold Snap",
    "shortName": "Cold",
    "summary": "At turn, all face cards become twos.",
    "detail": "Jacks, queens, and kings in hands and board convert to twos when turn begins.",
    "family": "environment",
    "tags": [
      "weather"
    ],
    "tier": "wild",
    "deal": {
      "holeCards": 2,
      "communityCards": 5
    },
    "phaseEffects": {
      "turn": [
        "faceCardsToTwos"
      ]
    },
    "infoFeatures": [
      "cold-snap"
    ],
    "score": "high"
  },
  {
    "id": "color-lock",
    "name": "Color Lock",
    "shortName": "Color Lock",
    "summary": "At reveal only majority-color cards score.",
    "detail": "When the board is fully revealed, the minority color is stripped and only the majority's cards count toward final ranking.",
    "family": "environment",
    "tags": [
      "late-detonation",
      "weather"
    ],
    "tier": "wild",
    "deal": {
      "holeCards": 2,
      "communityCards": 5
    },
    "phaseEffects": {
      "reveal": [
        "lockMajorityColor"
      ]
    },
    "infoFeatures": [
      "color-lock"
    ],
    "score": "high"
  },
  {
    "id": "doomsday-card",
    "name": "Doomsday Card",
    "shortName": "Doomsday",
    "summary": "At the river, the doomsday card flips every rank in play upside down.",
    "detail": "When river begins, all ranks across hands and board invert so aces become twos, kings become threes, and so on before reveal.",
    "family": "environment",
    "tags": [
      "late-detonation",
      "weather"
    ],
    "tier": "wild",
    "deal": {
      "holeCards": 2,
      "communityCards": 5
    },
    "phaseEffects": {
      "river": [
        "invertAllRanks"
      ]
    },
    "infoFeatures": [
      "doomsday-card"
    ],
    "score": "high"
  },
  {
    "id": "drought",
    "name": "Drought",
    "shortName": "Drought",
    "summary": "At the turn, every face card on the board is wiped away.",
    "detail": "When the turn begins, jacks, queens, and kings disappear from the community cards and are replaced by fresh deck draws.",
    "family": "environment",
    "tags": [
      "weather"
    ],
    "tier": "wild",
    "deal": {
      "holeCards": 2,
      "communityCards": 5
    },
    "phaseEffects": {
      "turn": [
        "removeFaceCards"
      ]
    },
    "infoFeatures": [
      "drought"
    ],
    "score": "high"
  },
  {
    "id": "earthquake",
    "name": "Earthquake",
    "shortName": "Quake",
    "summary": "At the turn, the community cards shake into a new order.",
    "detail": "The board scrambles in place when the turn begins, keeping the same five cards but resetting any positional reads the table had built.",
    "family": "environment",
    "tags": [
      "weather"
    ],
    "tier": "wild",
    "deal": {
      "holeCards": 2,
      "communityCards": 5
    },
    "phaseEffects": {
      "turn": [
        "shuffleCommunity"
      ]
    },
    "infoFeatures": [
      "earthquake"
    ],
    "score": "high"
  },
  {
    "id": "glitch-wars",
    "name": "Glitch Wars",
    "shortName": "Glitch Wars",
    "summary": "At turn, board cards fight over suit identity.",
    "detail": "The first community card absorbs the second community card's suit when turn begins.",
    "family": "environment",
    "tags": [
      "weather"
    ],
    "tier": "insanity",
    "deal": {
      "holeCards": 2,
      "communityCards": 5
    },
    "phaseEffects": {
      "turn": [
        "firstCommunityAbsorbsSecondSuit"
      ]
    },
    "infoFeatures": [
      "glitch-wars"
    ],
    "score": "high"
  },
  {
    "id": "gravity-well",
    "name": "Gravity Well",
    "shortName": "Gravity",
    "summary": "At the river, every hand's highest hole card climbs one rank.",
    "detail": "When river begins, each hand's top card is pulled up a single rank, sharpening high-card and made-hand pressure across the final showdown.",
    "family": "environment",
    "tags": [
      "late-detonation",
      "weather"
    ],
    "tier": "wild",
    "deal": {
      "holeCards": 2,
      "communityCards": 5
    },
    "phaseEffects": {
      "river": [
        "upgradeHighestHole"
      ]
    },
    "infoFeatures": [
      "gravity-well"
    ],
    "score": "high"
  },
  {
    "id": "heat-wave",
    "name": "Heat Wave",
    "shortName": "Heat W",
    "summary": "At turn, all face cards become aces.",
    "detail": "Jacks, queens, and kings in hands and board convert to aces when turn begins.",
    "family": "environment",
    "tags": [
      "weather"
    ],
    "tier": "wild",
    "deal": {
      "holeCards": 2,
      "communityCards": 5
    },
    "phaseEffects": {
      "turn": [
        "faceCardsToAces"
      ]
    },
    "infoFeatures": [
      "heat-wave"
    ],
    "score": "high"
  },
  {
    "id": "hurricane",
    "name": "Hurricane",
    "shortName": "Hurricane",
    "summary": "At river, every player loses one hole card.",
    "detail": "Each hand loses its final hole card when river begins.",
    "family": "environment",
    "tags": [
      "late-detonation",
      "weather"
    ],
    "tier": "wild",
    "deal": {
      "holeCards": 2,
      "communityCards": 5
    },
    "phaseEffects": {
      "river": [
        "removeOneHolePerHand"
      ]
    },
    "infoFeatures": [
      "hurricane"
    ],
    "score": "high"
  },
  {
    "id": "identity-crisis",
    "name": "Identity Crisis",
    "shortName": "Crisis",
    "summary": "At turn, a hole card and board card swap identities.",
    "detail": "The first hand's first hole card swaps with the first community card when turn begins.",
    "family": "environment",
    "tags": [
      "weather"
    ],
    "tier": "insanity",
    "deal": {
      "holeCards": 2,
      "communityCards": 5
    },
    "phaseEffects": {
      "turn": [
        "swapFirstHoleWithFirstCommunity"
      ]
    },
    "infoFeatures": [
      "identity-crisis"
    ],
    "score": "high"
  },
  {
    "id": "last-word",
    "name": "Last Word",
    "shortName": "Last Word",
    "summary": "River overwrites every same-suit board card.",
    "detail": "At reveal, the river card's identity rewrites every board card sharing its suit, collapsing flush draws into a single rank.",
    "family": "environment",
    "tags": [
      "late-detonation",
      "weather"
    ],
    "tier": "wild",
    "deal": {
      "holeCards": 2,
      "communityCards": 5
    },
    "phaseEffects": {
      "reveal": [
        "riverOverwritesSuit"
      ]
    },
    "infoFeatures": [
      "last-word"
    ],
    "score": "high"
  },
  {
    "id": "lightning",
    "name": "Lightning",
    "shortName": "Lightning",
    "summary": "At the river, every hand's first hole card jumps up one rank.",
    "detail": "When the river arrives, the first kept card in every hand climbs a single rank, sharpening late made-hand pressure without touching the board.",
    "family": "environment",
    "tags": [
      "late-detonation",
      "weather"
    ],
    "tier": "wild",
    "deal": {
      "holeCards": 2,
      "communityCards": 5
    },
    "phaseEffects": {
      "river": [
        "incrementFirstHolePerHand"
      ]
    },
    "infoFeatures": [
      "lightning"
    ],
    "score": "high"
  },
  {
    "id": "meteor",
    "name": "Meteor",
    "shortName": "Meteor",
    "summary": "At the turn, one visible community card is struck out and replaced.",
    "detail": "When the turn begins, a single board card is swapped for a fresh draw from the deck, breaking one read while leaving the rest of the felt intact.",
    "family": "environment",
    "tags": [
      "weather"
    ],
    "tier": "wild",
    "deal": {
      "holeCards": 2,
      "communityCards": 5
    },
    "phaseEffects": {
      "turn": [
        "randomReplaceVisibleCommunity"
      ]
    },
    "infoFeatures": [
      "meteor"
    ],
    "score": "high"
  },
  {
    "id": "mirror-universe",
    "name": "Mirror Universe",
    "shortName": "Mirror U",
    "summary": "At the river, every rank flips across the deck's spine.",
    "detail": "When river begins, every rank inverts so aces become twos, kings become threes, and so on across hands and board before reveal.",
    "family": "environment",
    "tags": [
      "late-detonation",
      "weather"
    ],
    "tier": "wild",
    "deal": {
      "holeCards": 2,
      "communityCards": 5
    },
    "phaseEffects": {
      "river": [
        "invertAllRanks"
      ]
    },
    "infoFeatures": [
      "mirror-universe"
    ],
    "score": "high"
  },
  {
    "id": "mute-reveal",
    "name": "Mute Reveal",
    "shortName": "Mute",
    "summary": "Suits strip from the board at reveal — ranks-only scoring.",
    "detail": "At reveal the board's suits are erased; flushes evaporate and only rank-based hands resolve.",
    "family": "environment",
    "tags": [
      "late-detonation",
      "weather"
    ],
    "tier": "wild",
    "deal": {
      "holeCards": 2,
      "communityCards": 5
    },
    "phaseEffects": {
      "reveal": [
        "stripBoardSuits"
      ]
    },
    "infoFeatures": [
      "mute-reveal"
    ],
    "score": "high"
  },
  {
    "id": "plague",
    "name": "Plague",
    "shortName": "Plague",
    "summary": "At the turn, every seven on the board is wiped away.",
    "detail": "When the turn begins, sevens disappear from the community cards and are replaced by fresh draws so the rank is rarely available at reveal.",
    "family": "environment",
    "tags": [
      "weather"
    ],
    "tier": "wild",
    "deal": {
      "holeCards": 2,
      "communityCards": 5
    },
    "phaseEffects": {
      "turn": [
        "removeSevens"
      ]
    },
    "infoFeatures": [
      "plague"
    ],
    "score": "high"
  },
  {
    "id": "quantum-shuffle",
    "name": "Quantum Shuffle",
    "shortName": "Quantum",
    "summary": "At turn, all hole cards are redistributed.",
    "detail": "Hole cards are gathered, rotated, and redealt across the table when turn begins.",
    "family": "environment",
    "tags": [
      "weather"
    ],
    "tier": "insanity",
    "deal": {
      "holeCards": 2,
      "communityCards": 5
    },
    "phaseEffects": {
      "turn": [
        "shuffleAllHoleCards"
      ]
    },
    "infoFeatures": [
      "quantum-shuffle"
    ],
    "score": "high"
  },
  {
    "id": "rainstorm",
    "name": "Rainstorm",
    "shortName": "Rain",
    "summary": "Every phase, one community card is replaced.",
    "detail": "A fresh deck card replaces one visible community card at flop, turn, and river.",
    "family": "environment",
    "tags": [
      "late-detonation",
      "weather"
    ],
    "tier": "wild",
    "deal": {
      "holeCards": 2,
      "communityCards": 5
    },
    "phaseEffects": {
      "flop": [
        "randomReplaceVisibleCommunity"
      ],
      "turn": [
        "randomReplaceVisibleCommunity"
      ],
      "river": [
        "randomReplaceVisibleCommunity"
      ]
    },
    "infoFeatures": [
      "rainstorm"
    ],
    "score": "high"
  },
  {
    "id": "random-replace",
    "name": "Random Replace",
    "shortName": "Replace",
    "summary": "At turn, one visible board card is swapped for a fresh card.",
    "detail": "The board mutates as the turn begins, forcing the table to re-evaluate earlier placements.",
    "family": "environment",
    "tags": [
      "weather"
    ],
    "tier": "wild",
    "deal": {
      "holeCards": 2,
      "communityCards": 5
    },
    "phaseEffects": {
      "turn": [
        "randomReplaceVisibleCommunity"
      ]
    },
    "score": "high"
  },
  {
    "id": "reversal",
    "name": "Reversal",
    "shortName": "Reverse",
    "summary": "At river, the board reverses in place.",
    "detail": "The same five community cards remain in play, but their displayed order flips when the river phase begins.",
    "family": "environment",
    "tags": [
      "late-detonation",
      "weather"
    ],
    "tier": "wild",
    "deal": {
      "holeCards": 2,
      "communityCards": 5
    },
    "phaseEffects": {
      "river": [
        "reverseCommunity"
      ]
    },
    "score": "high"
  },
  {
    "id": "shapeshifter",
    "name": "Shapeshifter",
    "shortName": "Shifter",
    "summary": "One community card changes identity each street.",
    "detail": "The first community card upgrades one rank at flop, turn, and river.",
    "family": "environment",
    "tags": [
      "late-detonation",
      "weather"
    ],
    "tier": "insanity",
    "deal": {
      "holeCards": 2,
      "communityCards": 5
    },
    "phaseEffects": {
      "flop": [
        "incrementFirstCommunityRank"
      ],
      "turn": [
        "incrementFirstCommunityRank"
      ],
      "river": [
        "incrementFirstCommunityRank"
      ]
    },
    "infoFeatures": [
      "shapeshifter"
    ],
    "score": "high"
  },
  {
    "id": "solar-flare",
    "name": "Solar Flare",
    "shortName": "Flare",
    "summary": "At the turn, every card on the table swaps to a new suit.",
    "detail": "When the turn begins, suits reassign across hands and board on a fixed cycle, scrambling flush draws while ranks stay intact.",
    "family": "environment",
    "tags": [
      "weather"
    ],
    "tier": "wild",
    "deal": {
      "holeCards": 2,
      "communityCards": 5
    },
    "phaseEffects": {
      "turn": [
        "reassignAllSuits"
      ]
    },
    "infoFeatures": [
      "solar-flare"
    ],
    "score": "high"
  },
  {
    "id": "static",
    "name": "Static",
    "shortName": "Static",
    "summary": "Each street, the community-card suits scramble while ranks stay fixed.",
    "detail": "The board ranks lock in once dealt, but every new street reshuffles which suit each board card carries, breaking flush reads as the hand progresses.",
    "family": "environment",
    "tags": [
      "late-detonation",
      "weather"
    ],
    "tier": "wild",
    "deal": {
      "holeCards": 2,
      "communityCards": 5
    },
    "phaseEffects": {
      "flop": [
        "scrambleCommunitySuits"
      ],
      "turn": [
        "scrambleCommunitySuits"
      ],
      "river": [
        "scrambleCommunitySuits"
      ]
    },
    "infoFeatures": [
      "static"
    ],
    "score": "high"
  },
  {
    "id": "storm-surge",
    "name": "Storm Surge",
    "shortName": "Surge",
    "summary": "Each street, the oldest community card is swept off the board.",
    "detail": "Flop drops the first board card, turn drops the next, and river drops another, so the board keeps shifting forward instead of accumulating.",
    "family": "environment",
    "tags": [
      "late-detonation",
      "weather"
    ],
    "tier": "wild",
    "deal": {
      "holeCards": 2,
      "communityCards": 5
    },
    "phaseEffects": {
      "flop": [
        "stormSurge"
      ],
      "turn": [
        "stormSurge"
      ],
      "river": [
        "stormSurge"
      ]
    },
    "infoFeatures": [
      "storm-surge"
    ],
    "score": "high"
  },
  {
    "id": "sudden-glare",
    "name": "Sudden Glare",
    "shortName": "Glare",
    "summary": "One revealed board card retro-marks as wild at reveal.",
    "detail": "At reveal a single previously-shown board card flips to wild, retroactively scrambling the reads players already locked in.",
    "family": "environment",
    "tags": [
      "late-detonation",
      "weather"
    ],
    "tier": "chaos",
    "deal": {
      "holeCards": 2,
      "communityCards": 5
    },
    "phaseEffects": {
      "reveal": [
        "markOneBoardWild"
      ]
    },
    "infoFeatures": [
      "sudden-glare"
    ],
    "score": "high"
  },
  {
    "id": "volcano",
    "name": "Volcano",
    "shortName": "Volcano",
    "summary": "At river, one face-up card from each hand is destroyed.",
    "detail": "The first hole card in each hand is destroyed when river begins.",
    "family": "environment",
    "tags": [
      "late-detonation",
      "weather"
    ],
    "tier": "wild",
    "deal": {
      "holeCards": 2,
      "communityCards": 5
    },
    "phaseEffects": {
      "river": [
        "removeFirstHolePerHand"
      ]
    },
    "infoFeatures": [
      "volcano"
    ],
    "score": "high"
  },
  {
    "id": "wildfire",
    "name": "Wildfire",
    "shortName": "Wildfire",
    "summary": "When the river hits, the two ranks adjacent to it are wiped from the table.",
    "detail": "On river street, both neighbor ranks of the river card burn out of every hand and the board, so each made hand has to rebuild around the gap.",
    "family": "environment",
    "tags": [
      "late-detonation",
      "weather"
    ],
    "tier": "wild",
    "deal": {
      "holeCards": 2,
      "communityCards": 5
    },
    "phaseEffects": {
      "river": [
        "removeAdjacentToRiver"
      ]
    },
    "infoFeatures": [
      "wildfire"
    ],
    "score": "high"
  },
  {
    "id": "plus-sign",
    "name": "Plus Sign",
    "shortName": "Plus",
    "summary": "5-slot cross — center card forced into every read.",
    "detail": "The board is a cross; the center sits in every scoring path so its identity dominates flush and straight reads alike.",
    "family": "environment",
    "tags": [
      "multi-board"
    ],
    "tier": "twist",
    "deal": {
      "holeCards": 2,
      "communityCards": 5,
      "boardLayout": {
        "kind": "grid",
        "slots": [
          {
            "row": 0,
            "col": 1
          },
          {
            "row": 1,
            "col": 0
          },
          {
            "row": 1,
            "col": 1,
            "group": "core"
          },
          {
            "row": 1,
            "col": 2
          },
          {
            "row": 2,
            "col": 1
          }
        ]
      },
      "boards": {
        "count": 2,
        "cardsPerBoard": 3,
        "cardIndexes": [
          [
            0,
            2,
            4
          ],
          [
            1,
            2,
            3
          ]
        ],
        "scoring": "best"
      }
    },
    "infoFeatures": [
      "plus-sign"
    ],
    "score": "high"
  },
  {
    "id": "audit-trail",
    "name": "Audit Trail",
    "shortName": "Audit",
    "summary": "Every ranking change is logged with a public attribution chip.",
    "detail": "Each rank movement on the table is publicly logged with the player who made it, encouraging explicit reasoning and post-hoc reads.",
    "family": "info",
    "tags": [
      "info-overlay"
    ],
    "tier": "twist",
    "deal": {
      "holeCards": 2,
      "communityCards": 5
    },
    "infoFeatures": [
      "audit-trail"
    ],
    "score": "high"
  },
  {
    "id": "bipolar-judge",
    "name": "Bipolar Judge",
    "shortName": "Bipolar",
    "summary": "Two scoring rules run in parallel; the live one rotates each phase.",
    "detail": "An info chip names which scoring rule is in force this street; players must rank with the active rule while preparing for the swap to bite at reveal.",
    "family": "info",
    "tags": [
      "info-overlay"
    ],
    "tier": "wild",
    "deal": {
      "holeCards": 2,
      "communityCards": 5
    },
    "infoFeatures": [
      "bipolar-judge"
    ],
    "score": "high"
  },
  {
    "id": "burn-reveal",
    "name": "Burn Reveal",
    "shortName": "Burn",
    "summary": "The three burned cards are exposed to the whole table.",
    "detail": "A public chip names the cards burned before the flop, turn, and river so the table knows what is not coming back; scoring is unchanged.",
    "family": "info",
    "tags": [
      "info-overlay"
    ],
    "tier": "chaos",
    "deal": {
      "holeCards": 2,
      "communityCards": 5
    },
    "infoFeatures": [
      "burn-reveal"
    ],
    "score": "high"
  },
  {
    "id": "card-conscience",
    "name": "Card Conscience",
    "shortName": "Conscience",
    "summary": "The deck announces a rank that has gone unused.",
    "detail": "A public chip names the first rank that no one is holding and no community card shows, refreshing as the streets unfold.",
    "family": "info",
    "tags": [
      "info-overlay"
    ],
    "tier": "chaos",
    "deal": {
      "holeCards": 2,
      "communityCards": 5
    },
    "infoFeatures": [
      "card-conscience"
    ],
    "score": "high"
  },
  {
    "id": "card-counters",
    "name": "Card Counters",
    "shortName": "Counters",
    "summary": "A public chip counts the cards still left in the deck.",
    "detail": "The chip updates each street so the table can track how many cards remain undealt; scoring still uses the standard five-card board.",
    "family": "info",
    "tags": [
      "info-overlay"
    ],
    "tier": "chaos",
    "deal": {
      "holeCards": 2,
      "communityCards": 5
    },
    "infoFeatures": [
      "deck-count"
    ],
    "score": "high"
  },
  {
    "id": "card-karma",
    "name": "Card Karma",
    "shortName": "Karma",
    "summary": "A card from the previous hand echoes into this one as a karmic memory.",
    "detail": "Between hands, a public karma notice carries forward one card from the prior reveal so the new hand starts with shared memory of what came before.",
    "family": "info",
    "tags": [
      "info-overlay"
    ],
    "tier": "chaos",
    "deal": {
      "holeCards": 2,
      "communityCards": 5
    },
    "infoFeatures": [
      "card-karma"
    ],
    "score": "high"
  },
  {
    "id": "card-theatre",
    "name": "Card Theatre",
    "shortName": "Theatre",
    "summary": "Each street, a rotating hand is described in words instead of shown as cards.",
    "detail": "A public clue narrates one hand's contents every phase, giving the table a flavorful read while the actual cards stay hidden until reveal.",
    "family": "info",
    "tags": [
      "info-overlay"
    ],
    "tier": "chaos",
    "deal": {
      "holeCards": 2,
      "communityCards": 5
    },
    "infoFeatures": [
      "card-theatre"
    ],
    "score": "high"
  },
  {
    "id": "card-whisper",
    "name": "Card Whisper",
    "shortName": "Whisper",
    "summary": "At the river, a public whisper names one community card's true identity.",
    "detail": "The chip stays silent through preflop, flop, and turn, then reveals one board slot's rank and suit on river street as a late-stage anchor.",
    "family": "info",
    "tags": [
      "info-overlay"
    ],
    "tier": "chaos",
    "deal": {
      "holeCards": 2,
      "communityCards": 5
    },
    "infoFeatures": [
      "card-whisper"
    ],
    "score": "high"
  },
  {
    "id": "card-whisper-network",
    "name": "Card Whisper Network",
    "shortName": "Network",
    "summary": "A public chip names one community card's true identity from the start.",
    "detail": "From preflop onward, a network whisper exposes one community-card slot's rank and suit, giving every seat the same guaranteed anchor.",
    "family": "info",
    "tags": [
      "info-overlay"
    ],
    "tier": "chaos",
    "deal": {
      "holeCards": 2,
      "communityCards": 5
    },
    "infoFeatures": [
      "card-whisper-network"
    ],
    "score": "high"
  },
  {
    "id": "clock",
    "name": "Clock",
    "shortName": "Clock",
    "summary": "Each phase shows a countdown of one named rank's remaining cards.",
    "detail": "The chip names a rank and tracks how many of it remain in the deal deck across each street, biasing reads toward when the rank lands.",
    "family": "info",
    "tags": [
      "info-overlay"
    ],
    "tier": "wild",
    "deal": {
      "holeCards": 2,
      "communityCards": 5
    },
    "infoFeatures": [
      "clock"
    ],
    "score": "high"
  },
  {
    "id": "confession",
    "name": "Confession",
    "shortName": "Confess",
    "summary": "One hand per phase must publicly confess one true fact about its cards.",
    "detail": "Each street the server picks a hand to disclose one true fact about its holes — partial information, freely chosen scope.",
    "family": "info",
    "tags": [
      "info-overlay"
    ],
    "tier": "wild",
    "deal": {
      "holeCards": 2,
      "communityCards": 5
    },
    "infoFeatures": [
      "confession"
    ],
    "score": "high"
  },
  {
    "id": "decoy",
    "name": "Decoy",
    "shortName": "Decoy",
    "summary": "A public chip warns that one community card is a decoy without saying which.",
    "detail": "Players know exactly one board card is non-scoring but never see which slot; reads must rely on inference and table talk.",
    "family": "info",
    "tags": [
      "info-overlay"
    ],
    "tier": "chaos",
    "deal": {
      "holeCards": 2,
      "communityCards": 5
    },
    "infoFeatures": [
      "decoy"
    ],
    "score": "high"
  },
  {
    "id": "dossier",
    "name": "Dossier",
    "shortName": "Dossier",
    "summary": "Each hand gets a one-line personality blurb hinting at its strength.",
    "detail": "The info chip writes a short character sketch for each hand — sometimes flattering, sometimes flat — letting the table guess strength from voice.",
    "family": "info",
    "tags": [
      "info-overlay"
    ],
    "tier": "twist",
    "deal": {
      "holeCards": 2,
      "communityCards": 5
    },
    "infoFeatures": [
      "dossier"
    ],
    "score": "high"
  },
  {
    "id": "flop-draft",
    "name": "Flop Draft",
    "shortName": "Flop Draft",
    "summary": "Flop arrives as 6 cards; each player drafts 1 into private hand; 3 stay public.",
    "detail": "Six flop cards land face-up; players take one each into their private hand and the remaining three become the actual community flop.",
    "family": "info",
    "tags": [
      "info-overlay"
    ],
    "tier": "chaos",
    "deal": {
      "holeCards": 2,
      "communityCards": 5
    },
    "phaseEffects": {
      "flop": [
        "draftFromFlop"
      ]
    },
    "infoFeatures": [
      "flop-draft"
    ],
    "score": "high"
  },
  {
    "id": "heat-map",
    "name": "Heat Map",
    "shortName": "Heat",
    "summary": "The table is told whether the deck skews high or low.",
    "detail": "A public chip compares how many high cards and low cards remain in the deck, refreshing every street.",
    "family": "info",
    "tags": [
      "info-overlay"
    ],
    "tier": "chaos",
    "deal": {
      "holeCards": 2,
      "communityCards": 5
    },
    "infoFeatures": [
      "heat-map"
    ],
    "score": "high"
  },
  {
    "id": "hint-card",
    "name": "Hint Card",
    "shortName": "Hint",
    "summary": "At the turn, a public chip names one off-board card from the deck.",
    "detail": "The hint appears only on the turn and previews a single card sitting in the deck, then vanishes for river and reveal scoring.",
    "family": "info",
    "tags": [
      "info-overlay"
    ],
    "tier": "chaos",
    "deal": {
      "holeCards": 2,
      "communityCards": 5
    },
    "infoFeatures": [
      "hint-card"
    ],
    "score": "high"
  },
  {
    "id": "lying-mirror",
    "name": "Lying Mirror",
    "shortName": "Mirror",
    "summary": "At the flop, a public chip shows a fake three-card flop next to the real one.",
    "detail": "Only the flop street displays the decoy three cards; turn, river, and reveal score against the genuine board with no chip in sight.",
    "family": "info",
    "tags": [
      "info-overlay"
    ],
    "tier": "chaos",
    "deal": {
      "holeCards": 2,
      "communityCards": 5
    },
    "infoFeatures": [
      "lying-mirror"
    ],
    "score": "high"
  },
  {
    "id": "mirror-hole",
    "name": "Mirror Hole",
    "shortName": "Mirror H",
    "summary": "Each player privately sees one hole card from a neighbor's hand.",
    "detail": "Every player receives a secret reflection of a single card belonging to another hand; the mirror stays private through reveal.",
    "family": "info",
    "tags": [
      "info-overlay"
    ],
    "tier": "chaos",
    "deal": {
      "holeCards": 2,
      "communityCards": 5
    },
    "infoFeatures": [
      "mirror-hole"
    ],
    "score": "high"
  },
  {
    "id": "oracle-says",
    "name": "Oracle Says",
    "shortName": "Oracle",
    "summary": "Once per round the table can ask one yes/no question of the oracle.",
    "detail": "A deterministic oracle answers a single yes/no query the table coordinates on; the answer is durable across the rest of the round.",
    "family": "info",
    "tags": [
      "info-overlay"
    ],
    "tier": "wild",
    "deal": {
      "holeCards": 2,
      "communityCards": 5
    },
    "infoFeatures": [
      "oracle-says"
    ],
    "score": "high"
  },
  {
    "id": "past-trace",
    "name": "Past Trace",
    "shortName": "Trace",
    "summary": "A public chip echoes a fact about the previous hand into this one.",
    "detail": "Between hands, a trace carries forward a single piece of public information from the prior reveal so the table starts each new hand with some memory.",
    "family": "info",
    "tags": [
      "info-overlay"
    ],
    "tier": "chaos",
    "deal": {
      "holeCards": 2,
      "communityCards": 5
    },
    "infoFeatures": [
      "past-trace"
    ],
    "score": "high"
  },
  {
    "id": "phantom-card",
    "name": "Phantom Card",
    "shortName": "Phantom",
    "summary": "A public chip names a rank that at least one hand is missing.",
    "detail": "The phantom announces a single rank that is absent from at least one hand at the table, leaving the table to infer which hand it points at.",
    "family": "info",
    "tags": [
      "info-overlay"
    ],
    "tier": "chaos",
    "deal": {
      "holeCards": 2,
      "communityCards": 5
    },
    "infoFeatures": [
      "phantom-card"
    ],
    "score": "high"
  },
  {
    "id": "prophecy",
    "name": "Prophecy",
    "shortName": "Prophecy",
    "summary": "At preflop, the winning hand class is announced — and it holds.",
    "detail": "The table is told the hand class that will win this round before any community card lands; the seeded outcome holds across the streets.",
    "family": "info",
    "tags": [
      "info-overlay"
    ],
    "tier": "chaos",
    "deal": {
      "holeCards": 2,
      "communityCards": 5
    },
    "infoFeatures": [
      "prophecy"
    ],
    "score": "high"
  },
  {
    "id": "rank-census",
    "name": "Rank Census",
    "shortName": "Rank C",
    "summary": "A public chip breaks down how many cards of each rank remain in the deck.",
    "detail": "The rank counts refresh every street so the table can see which ranks are depleted; scoring still uses the standard five-card board.",
    "family": "info",
    "tags": [
      "info-overlay"
    ],
    "tier": "chaos",
    "deal": {
      "holeCards": 2,
      "communityCards": 5
    },
    "infoFeatures": [
      "rank-census"
    ],
    "score": "high"
  },
  {
    "id": "rank-whisper",
    "name": "Rank Whisper",
    "shortName": "R-Whisper",
    "summary": "A public chip names one hand and a rank that hand does not hold.",
    "detail": "The whisper narrows reads on a single hand by telling the table one rank it is missing, without ever exposing which cards it actually has.",
    "family": "info",
    "tags": [
      "info-overlay"
    ],
    "tier": "chaos",
    "deal": {
      "holeCards": 2,
      "communityCards": 5
    },
    "infoFeatures": [
      "rank-whisper"
    ],
    "score": "high"
  },
  {
    "id": "red-herring",
    "name": "Red Herring",
    "shortName": "Red Herr",
    "summary": "At flop the table is told a confidently-wrong fact about the board.",
    "detail": "A loud and certain statement about the flop arrives in the info chip — and it's a lie. Players must catch the deception or rank by it.",
    "family": "info",
    "tags": [
      "info-overlay"
    ],
    "tier": "chaos",
    "deal": {
      "holeCards": 2,
      "communityCards": 5
    },
    "infoFeatures": [
      "red-herring"
    ],
    "score": "high"
  },
  {
    "id": "rumor-mill",
    "name": "Rumor Mill",
    "shortName": "Rumor",
    "summary": "Each phase tells the table a rumor — sometimes true, sometimes false.",
    "detail": "Every street the info chip whispers a fact about a hand; some are true, some are not, and the table can't tell which is which.",
    "family": "info",
    "tags": [
      "info-overlay"
    ],
    "tier": "wild",
    "deal": {
      "holeCards": 2,
      "communityCards": 5
    },
    "infoFeatures": [
      "rumor-mill"
    ],
    "score": "high"
  },
  {
    "id": "sample-draw",
    "name": "Sample Draw",
    "shortName": "Sample",
    "summary": "At the river, three cards from the leftover deck are exposed as a public sample.",
    "detail": "The sample appears only on river street and previews three cards that never reach the board; scoring uses the normal five-card board.",
    "family": "info",
    "tags": [
      "info-overlay"
    ],
    "tier": "chaos",
    "deal": {
      "holeCards": 2,
      "communityCards": 5
    },
    "infoFeatures": [
      "sample-draw"
    ],
    "score": "high"
  },
  {
    "id": "seismograph",
    "name": "Seismograph",
    "shortName": "Seismo",
    "summary": "Info chip rates how much rank-1 might shift on the next phase.",
    "detail": "Each street the chip estimates the volatility of the leader hand; high readings mean ranking the top is dangerous to commit to.",
    "family": "info",
    "tags": [
      "info-overlay"
    ],
    "tier": "wild",
    "deal": {
      "holeCards": 2,
      "communityCards": 5
    },
    "infoFeatures": [
      "seismograph"
    ],
    "score": "high"
  },
  {
    "id": "suit-census",
    "name": "Suit Census",
    "shortName": "Suit C",
    "summary": "A public chip breaks down how many cards of each suit remain in the deck.",
    "detail": "The suit counts refresh every street so the table can read suit pressure; scoring still uses the standard five-card board.",
    "family": "info",
    "tags": [
      "info-overlay"
    ],
    "tier": "chaos",
    "deal": {
      "holeCards": 2,
      "communityCards": 5
    },
    "infoFeatures": [
      "suit-census"
    ],
    "score": "high"
  },
  {
    "id": "suit-heat",
    "name": "Suit Heat",
    "shortName": "Suit Heat",
    "summary": "The table is told which suit is over-represented.",
    "detail": "A public chip names whichever suit has the most remaining cards in the deck, refreshing every street.",
    "family": "info",
    "tags": [
      "info-overlay"
    ],
    "tier": "chaos",
    "deal": {
      "holeCards": 2,
      "communityCards": 5
    },
    "infoFeatures": [
      "suit-heat"
    ],
    "score": "high"
  },
  {
    "id": "suit-whisper",
    "name": "Suit Whisper",
    "shortName": "S-Whisper",
    "summary": "A public chip names one hand and a suit that hand does not hold.",
    "detail": "The whisper narrows reads on a single hand by telling the table one suit it is missing, without ever exposing which cards it actually has.",
    "family": "info",
    "tags": [
      "info-overlay"
    ],
    "tier": "chaos",
    "deal": {
      "holeCards": 2,
      "communityCards": 5
    },
    "infoFeatures": [
      "suit-whisper"
    ],
    "score": "high"
  },
  {
    "id": "telepathic-river",
    "name": "Telepathic River",
    "shortName": "Telepathy",
    "summary": "At the river, the table picks up a vague hint about a neighboring hand.",
    "detail": "On river street, a public broadcast carries a fuzzy clue about a nearby hand's cards while the underlying scoring stays unchanged.",
    "family": "info",
    "tags": [
      "info-overlay"
    ],
    "tier": "chaos",
    "deal": {
      "holeCards": 2,
      "communityCards": 5
    },
    "infoFeatures": [
      "telepathic-river"
    ],
    "score": "high"
  },
  {
    "id": "tell",
    "name": "Tell",
    "shortName": "Tell",
    "summary": "A public chip reveals one community card's true identity from the start.",
    "detail": "From preflop onward, the chip names one community-card slot and its rank and suit, giving the table a guaranteed anchor.",
    "family": "info",
    "tags": [
      "info-overlay"
    ],
    "tier": "chaos",
    "deal": {
      "holeCards": 2,
      "communityCards": 5
    },
    "infoFeatures": [
      "tell"
    ],
    "score": "high"
  },
  {
    "id": "weather-report",
    "name": "Weather Report",
    "shortName": "Weather",
    "summary": "A forecast at preflop predicts which phase will deal the highest card.",
    "detail": "At preflop the chip predicts which street will land the round's highest card, biasing how the table values future visibility.",
    "family": "info",
    "tags": [
      "info-overlay"
    ],
    "tier": "twist",
    "deal": {
      "holeCards": 2,
      "communityCards": 5
    },
    "infoFeatures": [
      "weather-report"
    ],
    "score": "high"
  },
  {
    "id": "reality-skip",
    "name": "Reality Skip",
    "shortName": "Skip",
    "summary": "At the turn, the table glimpses a future street and snaps back unchanged.",
    "detail": "A public skip notice fires at turn, previewing a possible future without altering the actual hands or board; everything resumes as if nothing happened.",
    "family": "info",
    "tags": [
      "info-overlay"
    ],
    "tier": "insanity",
    "deal": {
      "holeCards": 2,
      "communityCards": 5
    },
    "infoFeatures": [
      "reality-skip"
    ],
    "score": "high"
  },
  {
    "id": "second-place-cup",
    "name": "Second Place Cup",
    "shortName": "2nd Place",
    "summary": "The rank-2 hand wins; rank-1 is out.",
    "detail": "Hands rank normally for high, but the runner-up actually takes the round and the strongest hand drops out of contention entirely.",
    "family": "hand",
    "tags": [
      "score-pivot"
    ],
    "tier": "insanity",
    "deal": {
      "holeCards": 2,
      "communityCards": 5
    },
    "infoFeatures": [
      "second-place-cup"
    ],
    "score": "high"
  },
];
